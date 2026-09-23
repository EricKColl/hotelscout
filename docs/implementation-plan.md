# Plan de implementación — HotelScout

Fecha: 2026-09-23 · 

## 1. Entorno detectado

| Elemento | Estado |
|---|---|
| SO | Windows 11 Home |
| Node.js / npm | v24.15.0 / 11.12.1 ✅ |
| Git | 2.53.0 ✅ (el directorio aún no es repositorio) |
| GitHub CLI (`gh`) | No instalado (no es necesario; `git push` requiere tu permiso) |
| Wrangler (Cloudflare) | No instalado (se usaría con `npx`; requiere cuenta) |
| Disco libre / RAM libre | ~161 GB / ~2,3 GB (suficiente) |
| Proyecto | Solo `docs/SPEC.md` |

## 2. Alcance realista

- **Construible gratis:** buscador geográfico de alojamientos reales (OSM), distancias Haversine, mapa, filtros/ordenación sobre datos de OSM, favoritos e historial locales, PWA, enlaces etiquetados, despliegue en Cloudflare gratis.
- **No construible hoy:** precios y disponibilidad verificados (Modo B). Se mantiene un contrato de adaptador para el futuro; en producción se muestra «Consultar precio».
- **Filtros honestos:** solo los que OSM permite de verdad (tipo de alojamiento, estrellas si `stars` existe, web/teléfono disponibles, distancia). **Se omiten** cancelación gratuita, desayuno, presupuesto y valoración, porque OSM no los tiene. Las fechas y ocupación se guardan para construir el enlace de búsqueda a la plataforma.

## 3. Arquitectura

```
Navegador (PWA React)
  ├─ UI, validación (Zod), mapa (Leaflet + teselas OSM), favoritos/historial (IndexedDB/localStorage)
  └─ llama SOLO a /api/* (mismo dominio)
        │
Cloudflare Pages Functions (proxy propio)
  ├─ /api/geocode  → Nominatim  (lista blanca, User-Agent propio, caché, límite por IP)
  └─ /api/places   → Overpass   (consulta plantilla fija, caché, límite por IP)
        │
Nominatim público / Overpass (overpass-api.de con alternativa private.coffee)
```

Módulos (`src/services`): `geo/` (geocodificación, Haversine), `providers/` (interfaz `HotelProvider`; `OsmProvider` real; `BookingProvider`/`RapidProvider` **no implementados**), `search/` (orquestación, estados parcial/error), `links/` (constructores y validador de enlaces).

Decisiones ya tomadas: ver `docs/decisions.md` (D-001 a D-006).

## 4. Flujo de búsqueda (sin autocompletado)

1. Usuario escribe lugar y pulsa «Buscar lugar» → `/api/geocode` (máx. 1 consulta por acción).
2. Si hay varias coincidencias, se le pide elegir (nunca se elige en silencio).
3. Con el punto y el radio → `/api/places` (Overpass, alojamientos `tourism=*` en el radio).
4. Distancia Haversine, ordenación, filtros en cliente.
5. Tarjetas + mapa; por hotel: «Web del alojamiento», «Ver en mapa», «Buscar en Booking.com» (etiquetado, D-004).

## 5. Riesgos

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | Overpass público limita a ~100 consultas/día en uso regular y puede estar saturado | Alta | Alto | Caché en Worker y navegador, una consulta por búsqueda, instancia alternativa, mensajes de «límite alcanzado» |
| R2 | Caché de Cloudflare por centro de datos | Media | Bajo | Aceptado para pocos usuarios; sin promesa de límite global |
| R3 | OSM incompleto/erróneo (hoteles faltantes, coordenadas, cerrados) | Alta | Medio | Aviso visible; distinguir «localizado» de «verificado» |
| R4 | Los enlaces a Booking podrían dejar de conservar fechas o cambiar | Media | Medio | Etiqueta «Buscar»; tú los pruebas; pruebas unitarias del constructor; documentación |
| R5 | Cloudflare pide datos/tarjeta al crear la cuenta | Baja-media (❓) | Alto | Te aviso **antes**; si pide tarjeta, se busca alternativa sin coste |
| R6 | Teselas OSM pueden restringir el uso | Baja | Medio | Uso interactivo normal; alternativa por evaluar |
| R7 | Ausencia de Modo B decepciona expectativas | Alta | Alto | Comunicación clara en app y docs; no simular |
| R8 | Cortes de sesión/contexto | Media | Medio | `CLAUDE.md`, `PROJECT_STATUS.md`, commits por fase |
| R9 | Cuota diaria de Workers (100 000) | Muy baja | Bajo | Falla sin cobro; estáticos no cuentan |

## 6. Plan por fases

| Fase | Contenido | Entregable / verificación | Necesita al usuario |
|---|---|---|---|
| 1 | Análisis y viabilidad | Estos documentos | Aprobación |
| 2 | Infraestructura: Vite+React+TS estricto, Tailwind, ESLint, Vitest, Playwright, `.env.example`, `git init` | `npm run build` y `npm test` pasan | No |
| 3 | Motor geográfico + proxy (Functions), Haversine, normalización, pruebas | Pruebas con lugares conocidos; prueba real limitada a Nominatim/Overpass | **Pruebas de enlaces en tu navegador** (te doy pasos) |
| 4 | Capa de proveedores: `OsmProvider`, interfaz para Modo B sin implementar, validador de enlaces | Pruebas de integración con mocks (401/403/429/500/timeout) | No |
| 5 | Interfaz completa en español | Revisión visual local | No |
| 6 | PWA y rendimiento | Lighthouse local | No |
| 7 | QA: unitarias, integración, e2e, accesibilidad → `docs/qa-report.md` | Informe honesto | No |
| 8 | README, `deployment.md`, `limitations.md`, configuración Cloudflare | Guía para compartir | **Permiso para cuenta Cloudflare, `git push` y despliegue** |

Tras cada fase: actualizar `PROJECT_STATUS.md` y hacer commit local.

## 7. Criterios de aceptación específicos del Modo A

- Ningún precio, valoración o disponibilidad se muestra sin fuente real.
- Sin resultados ≠ error de red ≠ límite alcanzado (estados distintos).
- Cero peticiones directas del navegador a Nominatim/Overpass.
- Ningún secreto en el repositorio; `.env.example` sin valores.
- `npm run build`, `npm test` y e2e pasan y se reportan tal cual.

## 8. Intervención del usuario (prevista)

Ninguna hasta la Fase 3 (probar 2-3 enlaces). En la Fase 8, con tu permiso expreso: crear cuenta de Cloudflare y GitHub, `git push`, desplegar. Todo con pasos concretos.
