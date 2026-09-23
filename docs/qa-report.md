# Informe de QA — HotelScout

Fecha: 2026-09-23 · Entorno: Windows 11, Node 24.15, Microsoft Edge (Chromium) del equipo.

## Resultado resumido

| Tipo | Comando | Resultado |
|---|---|---|
| Lint | `npm run lint` | Sin errores ni avisos |
| Tipos + build de producción | `npm run build` | Correcto (JS principal ≈ 114 kB gzip; mapa en bloque aparte ≈ 44 kB gzip, carga diferida) |
| Unitarias + integración (mocks) | `npm test` | **48 / 48 superadas** (4 archivos) |
| End-to-end (Playwright, Edge) | `npm run test:e2e` | **14 / 14 superadas** |
| Accesibilidad automática (axe) | incluida en e2e | 0 infracciones WCAG 2.x A/AA en inicio y resultados |
| Dependencias | `npm audit` | 0 vulnerabilidades conocidas |
| Prueba real contra OSM | `npm run test:live` | Ver «Integraciones» |

## Qué cubren las pruebas

- **Unitarias:** Haversine (París–Londres, Sol–Atocha), validación de coordenadas, formato de distancias, clasificación de lugares de Nominatim, duplicados, normalización de alojamientos (sin nombre/coordenadas, duplicados, webs peligrosas o con credenciales), constructores y validador de enlaces (HTTPS, lista blanca, codificación, edades de niños, etiquetas «Buscar…» sin «Reservar»/precio), validaciones de fechas y ocupación (pasado, salida ≤ entrada, 31 de febrero, >30 noches, cambio de hora), filtros, ordenación (sin mutar el original), favoritos e historial.
- **Integración (proxy con `fetch` simulado):** parámetros inválidos → 400; 401/403/500 → `upstream_unavailable`; 429 → `rate_limited`; timeout → 504; respuesta no JSON; límite por IP; caché (HIT sin repetir la petición); Overpass: instancia alternativa, tres intentos con 504, plantilla de consulta fija.
- **E2E (con `/api` simulada de forma explícita en el test):** flujo completo (buscar, filtrar, ordenar, mapa, enlace, favorito con recarga, historial, borrado de datos), validaciones, varias coincidencias obligan a elegir, sin lugar, sin alojamientos ≠ error, 429 ≠ sin resultados, 502 con reintento, aviso sin conexión, cero llamadas directas a Nominatim/Overpass desde el navegador, cero peticiones por pulsación (sin autocompletado), móvil 375 px sin desbordamiento, PWA (manifest, iconos, service worker activo, app cargando sin conexión, `/api` nunca en caché).

## Integraciones

| Integración | Estado |
|---|---|
| Nominatim vía proxy | **Verificada en real** el 2026-09-23: «Madrid Atocha» → estación en (40,407; −3,689); «Estación de Atocha Madrid» devolvió paradas de autobús (limitación de OSM, ver `limitations.md`) |
| Overpass vía proxy | **Verificada en real** (una ejecución completa de `test:live` con alojamientos reales a ≤ 800 m). Después devolvió 429 y, de forma intermitente, 504; la app los muestra como «límite alcanzado» / «no disponible», no como «sin resultados» |
| Teselas OSM | Verificado en el navegador integrado (se cargaron teselas); bajo la CSP prevista |
| Booking (enlace de búsqueda) | Primera versión (`ss=nombre, ciudad`) **falló en producción** (destino equivocado o portada). Corregida a búsqueda por coordenadas y verificada en navegador real (D-010); pendiente de que el usuario lo confirme en su equipo. No documentado oficialmente |
| Booking Demand API, Expedia Rapid, Amadeus | **No integradas** (requieren acuerdo comercial o ya no existen) |
| Cloudflare Pages + Functions | **Verificado en real el 2026-09-23** en https://hotelscout.pages.dev: web 200; cabeceras de seguridad y CSP presentes; `manifest.webmanifest` 200; `sw.js` con `no-cache`; `/api/geocode` devuelve Nominatim y la segunda petición idéntica responde `X-HotelScout-Cache: HIT` (la caché funciona en pages.dev); entradas inválidas → 400; `/api/places` devuelve 40 alojamientos reales cerca de Atocha (800 m). En el navegador: búsqueda «Madrid Atocha» → 51 alojamientos localizados con mapa y teselas, service worker registrado, sin errores. Una búsqueda sin caché tardó ~50 s (Overpass saturado); las repetidas son inmediatas |

## Fallos encontrados y corregidos durante el desarrollo

1. El mapa fallaba (`layerPointToLatLng`) y dejaba **toda la página en blanco** → corregido el cálculo de límites y añadido un `ErrorBoundary` que aísla el fallo.
2. Consultas Overpass lentas o con 504 → reintentos, instancia alternativa y tiempo de espera de cliente ampliado.
3. Al reutilizar una búsqueda del historial se perdía la ciudad (enlace de Booking menos preciso) y podían usarse fechas pasadas → guarda la ciudad y propone fechas nuevas si caducaron.
4. Estaciones duplicadas (parada + estación) en la lista de coincidencias → se agrupan.
5. Nombres de categoría de Nominatim (`railway/stop`, `building/train_station`) no reconocidos → añadidos.

## Problemas pendientes y no verificados

- **Firefox y Safari no probados** (solo Chromium/Edge). Tampoco dispositivos móviles reales.
- **Accesibilidad:** solo automática (axe); no se ha probado con lector de pantalla. El mapa se excluyó del análisis de axe.
- **Límite de peticiones y caché en producción:** el límite por IP es «mejor esfuerzo» por instancia y la caché de Cloudflare es por centro de datos; no medidos.
- **Instalación PWA en móvil real:** no probada (manifest e iconos sí validados).
- **Lighthouse/rendimiento medido:** no ejecutado; solo tamaños de bundle.
- **Overpass alternativo (`overpass.private.coffee`):** no respondió en una prueba manual con 30 s de límite.
- Modo B: no existe, por tanto sin pruebas de precios reales.
