# Arquitectura — HotelScout

## Vista general

```
Navegador (PWA React + TS)
  ├─ Formulario → validación (Zod) → /api/geocode → candidatos → el usuario elige
  ├─ Punto elegido + radio → /api/places → alojamientos (Haversine, filtros, orden)
  ├─ Mapa Leaflet: fondo vectorial OpenFreeMap con nombres en español (MapLibre; si falla, teselas OSM) · favoritos/historial (localStorage) · enlaces validados
  └─ Service worker: guarda solo la app; nunca /api
        │  (mismo dominio)
Cloudflare Pages Functions  (functions/api/*.ts → functions/_lib/proxy.ts)
  ├─ /api/geocode → nominatim.openstreetmap.org  (1 req/s, caché 7 días, User-Agent propio)
  └─ /api/places  → overpass-api.de → overpass.private.coffee → overpass-api.de  (caché 24 h)
```

## Decisiones clave (ver `decisions.md`)
- **Modo A únicamente**; el contrato del Modo B (`OfferProvider`) existe pero sin implementación (D-001).
- **Proxy propio** con lista blanca de hosts y plantilla de consulta fija; el navegador nunca llama a Nominatim/Overpass (D-002).
- **Enlaces** clasificados; «Buscar en Booking.com» solo como búsqueda (D-004).

## Módulos
| Ruta | Responsabilidad |
|---|---|
| `functions/_lib/proxy.ts` | Validación de parámetros, límite por IP, caché, cola 1 req/s, reintentos Overpass, mapeo de errores |
| `src/services/geo/client.ts` | Llamadas a `/api/*` y validación de respuestas (Zod); errores `GeoError` diferenciados |
| `src/services/geo/normalize.ts` | Nominatim → `Place`; Overpass → `Lodging` con distancia; duplicados; ranking por tipo |
| `src/services/providers/` | `LodgingSource` (OSM) y `OfferProvider` (Modo B, sin implementar) |
| `src/services/links/` | Constructores y validador de URLs externas |
| `src/components/maps/` | Mapa Leaflet (`ResultsMap`), fondo vectorial con carga diferida y alternativa OSM (`vectorBase`), etiquetas en español (`spanishLabels`) — D-012 |
| `src/schemas/search.ts` | Validaciones del formulario y fechas de calendario |
| `src/features/` | Filtros, ordenación, almacenamiento local |
| `src/components/`, `src/App.tsx` | Interfaz |
| `public/sw.js`, `public/manifest.webmanifest`, `public/_headers` | PWA y cabeceras de seguridad |

## Errores diferenciados
`network` · `rate_limited` · `upstream_unavailable` · `invalid_response` · `invalid_request` · sin resultados (vacío correcto) · búsqueda parcial (`remark` de Overpass).

## Seguridad
CSP estricta (`_headers`), sin secretos en el cliente, entradas y respuestas validadas, enlaces externos con `rel="noopener noreferrer"`, webs de OSM forzadas a HTTPS y sin credenciales, `PROXY_CONTACT` solo en variables del servidor.

## Desarrollo local
`npm run dev`: el plugin de `vite.config.ts` sirve `/api/*` con el mismo código del proxy (caché en memoria).
