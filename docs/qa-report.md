# Informe de QA — HotelScout

Fecha: 2026-09-23 · Entorno: Windows 11, Node 24.15, Microsoft Edge (Chromium) del equipo.

## Resultado resumido

| Tipo | Comando | Resultado |
|---|---|---|
| Lint | `npm run lint` | Sin errores ni avisos |
| Tipos + build de producción | `npm run build` | Correcto (JS principal ≈ 114 kB gzip; mapa en bloque aparte ≈ 44 kB gzip, carga diferida) |
| Unitarias + integración (mocks) | `npm test` | **78 / 78 superadas** (5 archivos) |
| End-to-end (Playwright, Edge) | `npm run test:e2e` | **16 / 16 superadas** |
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

## Revisión de robustez (D-011)

Pruebas reales en Booking con navegador real: Tokio (nombre japonés), Buenos Aires (coordenadas negativas), Nueva York, Beverly Hills (apóstrofo), Dubái (nombre árabe, 2 niños con edades): el hotel sale el primero o entre los primeros y se conservan fechas y huéspedes. Descubiertos y corregidos: fechas > ~16 meses, habitaciones > adultos, respuestas de Overpass con error dentro de un 200, recorte silencioso de resultados, duplicados de OSM, estrellas con formato «4S», almacenamiento local dañado, Safari antiguo, nombres con caracteres de control. Añadidas 30 pruebas (entradas extremas del enlace, Overpass con «remark», almacenamiento corrupto) y 2 e2e.

## Mapa en español (D-012) · 2026-09-24

Entorno: contenedor Linux en la nube, Node 22, Chromium 141 sin interfaz (Playwright). Sin acceso de red a `tiles.openfreemap.org` ni a `tile.openstreetmap.org` (bloqueados por el entorno), por eso las teselas se simularon.

| Comprobación | Resultado |
|---|---|
| `npm run lint` | Sin avisos |
| `npm test` | **85 / 85** (6 archivos; +7: etiquetas en español y nombres de hoteles legibles) |
| `npm run test:e2e` | **21 / 21** (+5: mapa vectorial bajo la CSP de producción, alternativa OSM si OpenFreeMap no responde o da un estilo no válido, hoteles con nombre japonés, clic en marcador → ficha). Repetido 3 veces seguidas: 63 / 63 |
| `npm run build` | Correcto. JS principal ≈ 115 kB gzip (sin cambios); mapa ≈ 45 kB gzip; MapLibre ≈ 276 kB gzip + worker ≈ 144 kB gzip, **solo al mostrar el mapa** |
| `npm audit` | 0 vulnerabilidades |
| Visual con el estilo Liberty real (de GitHub) y teselas simuladas de Tokio | Rotula «Tokio», «Estación de Tokio», «Ginza», «Marunouchi», «Harumi-dori»; atribución OpenFreeMap/OpenMapTiles/OSM visible; botones «Acercar»/«Alejar» |
| Pruebas de que las pruebas detectan fallos | Quitando OpenFreeMap de la CSP, la prueba del mapa vectorial falla; quitando el desplazamiento a la ficha, falla su prueba |

**Verificado en real por el usuario (2026-09-24):** el mapa con las teselas reales de OpenFreeMap en https://hotelscout.pages.dev sale en español y funciona bien.

**No verificado aún:** Firefox/Safari con MapLibre; rendimiento en móviles modestos.

## Problemas pendientes y no verificados

- **Booking a veces muestra su portada** por un control antirrobots intermitente (no depende de nosotros); se avisa en pantalla. Booking no lista todos los hoteles de OSM (p. ej. Olive Inn, Mörfelden-Walldorf: salen los más cercanos).

- **Firefox y Safari no probados** (solo Chromium/Edge). Tampoco dispositivos móviles reales.
- **Accesibilidad:** solo automática (axe); no se ha probado con lector de pantalla. El mapa se excluyó del análisis de axe.
- **Límite de peticiones y caché en producción:** el límite por IP es «mejor esfuerzo» por instancia y la caché de Cloudflare es por centro de datos; no medidos.
- **Instalación PWA en móvil real:** no probada (manifest e iconos sí validados).
- **Lighthouse/rendimiento medido:** no ejecutado; solo tamaños de bundle.
- **Overpass alternativo (`overpass.private.coffee`):** no respondió en una prueba manual con 30 s de límite.
- Modo B: no existe, por tanto sin pruebas de precios reales.

## Datos móviles / eSIM de viaje (D-013) · 2026-09-25

Entorno: contenedor Linux en la nube, Chromium 141 sin interfaz (Playwright con `executablePath`), sin acceso de red a los servicios reales.

| Comprobación | Resultado |
|---|---|
| `npm run lint` | Sin avisos |
| `npm test` | **95 / 95** (+10: tiempo límite con señal externa, corte de conexión reintentable, cuerpo cortado, cancelación ≠ error, política de reintento, espera sin conexión y reanudación, reintento automático, «Reintentar» tras fallo persistente, `waitUntil` + caché en el proxy, error sin caché) |
| `npm run test:e2e` | **23 / 23** (+2: app sin conexión desde la primera visita; «lie‑fi»: la red no responde y la app abre en < 12 s con la copia guardada). Pruebas PWA repetidas 4 veces: 16 / 16 |
| `npm run build` | Correcto. Primera visita ≈ 120 kB gzip; mapa la primera vez ≈ 480 kB gzip (luego en caché) |
| `npm audit` | 0 vulnerabilidades |
| La prueba nueva detecta fallos | La de «primera visita sin conexión» falló con la primera versión del service worker (copias no encontradas por `Vary: Origin`); corregido con `ignoreVary` |

**No verificado:** en un móvil real en Japón; consumo real de datos por búsqueda (Overpass + teselas); moneda que muestra Booking con una IP extranjera; `waitUntil` en producción (solo con pruebas simuladas).
