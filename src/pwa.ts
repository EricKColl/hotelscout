/** Registra el service worker (solo en producción) y avisa cuando hay una versión nueva esperando. */
export function registerServiceWorker(onUpdateReady: (apply: () => void) => void): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        const notify = (worker: ServiceWorker) =>
          onUpdateReady(() => {
            navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
            worker.postMessage('SKIP_WAITING')
          })
        if (reg.waiting && navigator.serviceWorker.controller) notify(reg.waiting)
        reg.addEventListener('updatefound', () => {
          const w = reg.installing
          w?.addEventListener('statechange', () => {
            if (w.state === 'installed' && navigator.serviceWorker.controller) notify(w)
          })
        })
      })
      .catch(() => {
        /* sin service worker la app funciona igual, solo sin modo sin conexión */
      })
  })
}
