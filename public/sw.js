/* Service worker de HotelScout.
 * - Guarda solo la aplicación (HTML + archivos con hash de /assets). NUNCA guarda /api ni teselas ni datos hoteleros.
 * - Al instalarse guarda ya la página y sus archivos: la app abre sin conexión desde la primera visita
 *   (útil de viaje: metro, avión, zonas sin cobertura de la eSIM).
 * - Navegación: red primero, pero si la red no responde en NAV_TIMEOUT_MS (cobertura débil que «parece» conectada)
 *   se muestra la app guardada y la versión nueva se guarda en segundo plano para la próxima vez.
 * - Las actualizaciones no se aplican solas: la página ofrece «Actualizar» y envía SKIP_WAITING. */
const VERSION = 'hotelscout-v2'
const NAV_TIMEOUT_MS = 5000

/** Rutas de /assets que usa una página HTML (script, estilos y precargas de módulos). */
function assetsIn(html) {
  const found = new Set()
  for (const m of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)) found.add(m[1])
  return [...found]
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION)
      await cache.addAll(['/manifest.webmanifest', '/icons/icon-192.png'])
      const page = await fetch('/', { cache: 'no-cache' })
      if (!page.ok) throw new Error(`No se pudo guardar la app: HTTP ${page.status}`)
      const html = await page.clone().text()
      await cache.addAll(assetsIn(html))
      await cache.put('/', page)
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

async function navigate(event) {
  const network = fetch(event.request).then(async (res) => {
    if (res.ok) {
      const cache = await caches.open(VERSION)
      await cache.put('/', res.clone())
    }
    return res
  })
  // La descarga sigue aunque se haya mostrado la copia guardada: así la próxima apertura ya tiene la versión nueva.
  event.waitUntil(network.catch(() => undefined))
  const cached = await caches.match('/', { ignoreVary: true })
  if (!cached) return network
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(cached), NAV_TIMEOUT_MS)
    network.then(
      (res) => {
        clearTimeout(timer)
        resolve(res)
      },
      () => {
        clearTimeout(timer)
        resolve(cached)
      },
    )
  })
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return // datos de vigencia limitada: nunca en caché

  if (req.mode === 'navigate') {
    event.respondWith(navigate(event))
    return
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      // ignoreVary: la copia guardada al instalar se pidió sin cabecera Origin y la del módulo la lleva (Vary: Origin);
      // son archivos con huella en el nombre (inmutables), así que es seguro.
      caches.match(req, { ignoreVary: true }).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            // Un archivo que ya no existe puede llegar como la página HTML (200): no se guarda como si fuera el archivo.
            const isHtml = (res.headers.get('Content-Type') ?? '').includes('text/html')
            if (res.ok && !isHtml) {
              const copy = res.clone()
              caches.open(VERSION).then((c) => c.put(req, copy))
            }
            return res
          }),
      ),
    )
  }
})
