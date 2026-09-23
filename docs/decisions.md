# Registro de decisiones — HotelScout

Formato: ID · fecha · decisión · motivo · estado.

## D-001 · 2026-09-23 · Solo Modo A (búsqueda geográfica asistida)
No hay ninguna API hotelera con precios y disponibilidad accesible gratis y sin contrato (Booking y Expedia exigen ser partner; Amadeus Self-Service cerró el 17-07-2026). Se construye el Modo A. El Modo B queda como interfaz de adaptadores **sin implementar y sin simulaciones**. Evidencia: `provider-research.md` §2. **Estado: aprobada (2026-09-23).**

## D-002 · 2026-09-23 · Proxy en Cloudflare para Nominatim y Overpass
El navegador no llamará directamente a Nominatim ni a Overpass. Motivos: la política de Nominatim cuenta el tráfico total de la app, exige identificación (`User-Agent`, imposible de fijar desde el navegador) y recomienda proxy con caché; Overpass admite ~100 consultas/día en uso regular. Sin autocompletado (búsqueda al pulsar «Buscar»). Límite: la caché de Cloudflare es por centro de datos; no se promete límite global exacto. Evidencia: `provider-research.md` §6. **Estado: aprobada (2026-09-23).**

## D-003 · 2026-09-23 · Alojamiento en Cloudflare Pages (con Pages Functions)
Plan gratuito verificado: estáticos ilimitados, Functions dentro de 100 000 peticiones/día, el exceso falla sin cobrar. Sujeto a confirmar el alta sin tarjeta contigo. **Estado: pendiente.**

## D-004 · 2026-09-23 · Política de enlaces a plataformas
- **Oficial y documentado:** solo se usarán los que existan y sean accesibles sin partner (hoy: web del hotel según OSM y enlace de mapa).
- **Funciona pero no documentado:** el único caso es la búsqueda de Booking.com (`searchresults.html`). Se usa **solo** etiquetado «Buscar en Booking.com», **nunca** como oferta, sin precio y sin parámetro de afiliado.
- **No fiable / no verificado:** Google Hotels y Expedia/Hotels.com sin afiliación **no se usan**. Los deep links de Expedia documentados son solo para socios White Label.
- Cada enlace se valida (HTTPS, dominio en lista blanca, codificación, sin credenciales) y se abre con `rel="noopener noreferrer"`.
- Se revisa la decisión cuando pruebes los enlaces en tu navegador (Fase 3). **Estado: aprobada (2026-09-23).**

## D-005 · 2026-09-23 · Stack base
Se mantiene el de la especificación (React + TS + Vite + Tailwind + Leaflet + TanStack Query + Zod + Vitest + Playwright). Ajuste: PWA con `vite-plugin-pwa` si se justifica en Fase 6. Sin backend propio más allá de las Pages Functions.

## D-006 · 2026-09-23 · Ajustes del usuario que prevalecen sobre SPEC.md
Punto de control tras Fase 1; verificación en vivo con fecha; proxy evaluado con evidencias; enlaces clasificados en 3 categorías; permiso previo para cuentas, credenciales, `git push`, despliegues o costes; commit local al final de cada fase; todo en español. Contradice SPEC §23 («no te detengas tras el plan»): se sigue lo indicado por el usuario.
