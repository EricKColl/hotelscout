import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vitest/config'

/** En desarrollo sirve /api/* con el mismo código que las Pages Functions de producción. */
function devApiProxy(): Plugin {
  const store = new Map<string, Response>()
  const cache = {
    match: async (r: Request) => store.get(r.url)?.clone(),
    put: async (r: Request, res: Response) => void store.set(r.url, res),
  }
  return {
    name: 'hotelscout-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        const mod = (await server.ssrLoadModule('/functions/_lib/proxy.ts')) as typeof import('./functions/_lib/proxy.ts')
        const request = new Request(new URL(req.url, 'http://localhost'), { method: req.method })
        const env = { PROXY_CONTACT: process.env.PROXY_CONTACT }
        const path = req.url.split('?')[0]
        const response =
          path === '/api/geocode' ? await mod.handleGeocode(request, env, { ...mod.defaultDeps(), cache })
          : path === '/api/places' ? await mod.handlePlaces(request, env, { ...mod.defaultDeps(), cache })
          : new Response('No encontrado', { status: 404 })
        res.statusCode = response.status
        response.headers.forEach((v: string, k: string) => res.setHeader(k, v))
        res.end(Buffer.from(await response.arrayBuffer()))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devApiProxy()],
  // MapLibre (mapa vectorial) ocupa ~1 MB sin comprimir, pero va en un trozo aparte que solo se descarga al mostrar el mapa.
  build: { chunkSizeWarningLimit: 1100 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
  },
})
