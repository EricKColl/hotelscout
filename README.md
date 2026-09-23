# HotelScout

Aplicación web (PWA) en español para **localizar alojamientos cerca de un punto de referencia** —una estación, un aeropuerto, el centro o una dirección— y abrir después la plataforma original para ver precios y disponibilidad.

> **Importante:** HotelScout **no compara precios ni comprueba disponibilidad**. Ninguna API hotelera con precios reales es accesible gratis y sin acuerdo comercial (Booking y Expedia exigen ser socio; el portal gratuito de Amadeus cerró en julio de 2026). Detalle y fuentes en [`docs/provider-research.md`](docs/provider-research.md).

## Qué hace
- Busca un lugar (Nominatim/OpenStreetMap) y te pide elegir entre coincidencias.
- Localiza alojamientos con nombre en un radio de 300 m a 5 km (Overpass/OpenStreetMap) con distancia en línea recta.
- Filtra por tipo, estrellas (si constan) y web propia; ordena por distancia, nombre o estrellas.
- Mapa con punto de referencia, radio y alojamientos.
- Enlaces: web del alojamiento, mapa y «Buscar en Booking.com» (una búsqueda con tus fechas, **no una oferta**).
- Favoritos e historial guardados solo en tu navegador. Instalable como app; sin conexión abre la app con aviso.

## Limitaciones
Ver [`docs/limitations.md`](docs/limitations.md). En resumen: datos de OpenStreetMap incompletos a veces, sin precios, sin autocompletado, Overpass público limitado.

## Tecnologías
React 19 · TypeScript estricto · Vite · Tailwind CSS 4 · Leaflet + OpenStreetMap · TanStack Query · Zod · Vitest · Playwright (+ axe) · Cloudflare Pages Functions (proxy).

## Arquitectura
[`docs/architecture.md`](docs/architecture.md). Decisiones: [`docs/decisions.md`](docs/decisions.md).

## Requisitos de desarrollo
Node.js 20 o superior (probado con 24) y npm.

## Instalación y scripts
```bash
npm install
npm run dev            # desarrollo
npm run build          # producción (dist/)
npm run preview        # servir dist/
npm run lint
npm test               # unitarias + integración
npm run test:e2e       # end-to-end (Edge; PW_CHANNEL=chromium tras `npx playwright install chromium`)
npm run test:live      # comprobación REAL contra Nominatim/Overpass (requiere `npm run dev -- --port 5199`; consume cuota pública, úsala con moderación)
npm run icons          # regenera los iconos PWA
```

## Variables de entorno
Ver `.env.example`: solo `PROXY_CONTACT` (contacto incluido en el `User-Agent` del proxy). No hay claves ni secretos.

## Despliegue
[`docs/deployment.md`](docs/deployment.md) (Cloudflare Pages, plan gratuito).

## Proveedores y condiciones de uso
| Servicio | Uso | Condiciones |
|---|---|---|
| Nominatim | Geocodificación vía proxy | [Política](https://operations.osmfoundation.org/policies/nominatim/): 1 req/s, sin autocompletado, caché, identificación |
| Overpass | Alojamientos vía proxy | [Wiki](https://wiki.openstreetmap.org/wiki/Overpass_API): ~100 consultas/día en uso regular |
| Teselas OSM | Mapa | [Política](https://operations.osmfoundation.org/policies/tiles/): uso interactivo, atribución |
| Cloudflare | Alojamiento + proxy | Plan Free, cuotas en `docs/deployment.md` |

Datos © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright), licencia ODbL.

## Privacidad
Sin cuentas, sin analítica ni rastreadores. Favoritos e historial están en `localStorage`, con botón para borrarlos. El proxy no guarda datos personales; Cloudflare y los servicios de OpenStreetMap ven la IP y las consultas como cualquier servicio web.

## Estado de las pruebas
[`docs/qa-report.md`](docs/qa-report.md).

## Licencia
MIT (ver `LICENSE`).

## Problemas conocidos
Overpass público es intermitente (429/504); Firefox/Safari sin probar; el despliegue en Cloudflare aún no se ha realizado.
