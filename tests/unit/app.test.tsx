import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../../src/App'

describe('App', () => {
  it('muestra el nombre, el formulario y el aviso de que no compara precios', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <App />
      </QueryClientProvider>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Alojamientos cerca')
    expect(screen.getByLabelText('Lugar de referencia')).toBeInTheDocument()
    expect(screen.getByText(/No compara precios ni comprueba disponibilidad/)).toBeInTheDocument()
  })
})
