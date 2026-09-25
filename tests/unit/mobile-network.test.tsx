import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../../src/App'
import { searchLodgings, searchPlaces, shouldRetryOnce } from '../../src/services/geo/client'
import { GeoError } from '../../src/types/geo'

/** fetch que nunca responde, pero respeta la cancelación (como una conexión móvil colgada). */
const hangingFetch = () =>
  vi.fn((_url: string, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Abortado', 'AbortError')))
    }),
  )

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  onlineManager.setOnline(true)
})

describe('red móvil inestable (eSIM, cobertura débil)', () => {
  it('aplica el tiempo límite aunque quien llama pase su propia señal (antes podía quedarse cargando para siempre)', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', hangingFetch())
    const outer = new AbortController()
    const result = searchLodgings({ latitude: 35.68, longitude: 139.76 }, 1000, outer.signal).catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(55_000)
    const error = await result
    expect(error).toBeInstanceOf(GeoError)
    expect((error as GeoError).code).toBe('network')
    expect((error as GeoError).message).toMatch(/tardó demasiado/)
    // Un tiempo agotado no se reintenta solo: el usuario ya ha esperado casi un minuto.
    expect((error as GeoError).connectionDropped).toBe(false)
  })

  it('un corte de conexión se marca como reintentable', async () => {
    vi.stubGlobal('fetch', vi.fn(async (): Promise<Response> => { throw new TypeError('Failed to fetch') }))
    const error = await searchPlaces('Tokio').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(GeoError)
    expect((error as GeoError).connectionDropped).toBe(true)
  })

  it('un cuerpo cortado a mitad de descarga es error de conexión, no «datos insuficientes»', async () => {
    const res = new Response('[]', { status: 200 })
    vi.spyOn(res, 'text').mockRejectedValue(new TypeError('network error'))
    vi.stubGlobal('fetch', vi.fn(async () => res))
    const error = await searchPlaces('Tokio').catch((e: unknown) => e)
    expect((error as GeoError).code).toBe('network')
    expect((error as GeoError).connectionDropped).toBe(true)
  })

  it('una cancelación pedida por la app (nueva búsqueda) no se convierte en error de conexión', async () => {
    vi.stubGlobal('fetch', hangingFetch())
    const outer = new AbortController()
    const result = searchPlaces('Tokio', outer.signal).catch((e: unknown) => e)
    outer.abort()
    const error = await result
    expect(error).not.toBeInstanceOf(GeoError)
    expect((error as Error).name).toBe('AbortError')
  })

  it('solo se reintenta una vez y solo ante cortes de conexión', () => {
    const dropped = new GeoError('network', 'x', { connectionDropped: true })
    expect(shouldRetryOnce(0, dropped)).toBe(true)
    expect(shouldRetryOnce(1, dropped)).toBe(false)
    expect(shouldRetryOnce(0, new GeoError('network', 'tiempo agotado'))).toBe(false)
    expect(shouldRetryOnce(0, new GeoError('rate_limited', 'x'))).toBe(false)
    expect(shouldRetryOnce(0, new GeoError('upstream_unavailable', 'x'))).toBe(false)
    expect(shouldRetryOnce(0, new Error('x'))).toBe(false)
  })
})

function renderApp() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <App />
    </QueryClientProvider>,
  )
}

function searchFor(text: string) {
  fireEvent.change(screen.getByLabelText('Lugar de referencia'), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Buscar lugar' }))
}

describe('App con conexión intermitente', () => {
  it('sin conexión, la búsqueda espera y se lanza sola al volver la conexión', async () => {
    const fetchMock = vi.fn(async () => new Response('[]', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    renderApp()
    act(() => onlineManager.setOnline(false))
    searchFor('Estación de Tokio')
    expect(await screen.findByText('Esperando conexión…')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    act(() => onlineManager.setOnline(true))
    expect(await screen.findByText('No se encontró ese lugar')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('un corte puntual se reintenta solo una vez y la búsqueda termina bien', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(new Response('[]', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    renderApp()
    searchFor('Shinjuku')
    expect(await screen.findByText('No se encontró ese lugar', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('si el corte persiste, muestra «Error de conexión» con botón «Reintentar»', async () => {
    const fetchMock = vi.fn(async (): Promise<Response> => { throw new TypeError('Failed to fetch') })
    vi.stubGlobal('fetch', fetchMock)
    renderApp()
    searchFor('Kioto')
    expect(await screen.findByText('Error de conexión', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    fetchMock.mockImplementation(async () => new Response('[]', { status: 200 }))
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByText('No se encontró ese lugar')).toBeInTheDocument())
  })
})
