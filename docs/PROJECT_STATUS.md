# Estado del proyecto — HotelScout

Última actualización: 2026-09-23

## Objetivo
Aplicación web (PWA) gratuita para localizar alojamientos cerca de un punto de referencia (estación, aeropuerto, centro, dirección) y derivar a las plataformas originales. Fuente de verdad: `docs/SPEC.md` con los ajustes del usuario recogidos en `docs/decisions.md` (D-006).

## Fase activa
**Fase 3 (motor geográfico y proxy) completada. Siguiente: Fase 4 (proveedores y enlaces) y Fase 5 (interfaz).**

## Arquitectura actual
PWA React + TS + Vite → Cloudflare Pages Functions (proxy con caché a Nominatim y Overpass) → OSM. Ver `docs/implementation-plan.md`.

## Tareas completadas
- Lectura completa de SPEC.md.
- Inspección del entorno (Node 24, npm 11, Git 2.53; sin `gh` ni Wrangler).
- Investigación de proveedores con fuentes y fecha: `docs/provider-research.md`.
- Registro de decisiones: `docs/decisions.md`.
- Plan y riesgos: `docs/implementation-plan.md`.
- `CLAUDE.md`.
- Repositorio Git local y primer commit.
- Fase 2: Vite + React 19 + TS estricto + Tailwind 4 + Vitest + Playwright (config) + oxlint; `.env.example`; estructura de carpetas.
- Fase 3: proxy `functions/_lib/proxy.ts` (+ `functions/api/geocode.ts`, `places.ts`), cliente `src/services/geo/*`, Haversine, normalización, ranking por tipo de lugar; middleware de desarrollo en `vite.config.ts`.

## Tareas pendientes
- D-001…D-004 aprobadas por el usuario el 2026-09-23 ("procedemos").
- Fases 3–8 (ver plan).

## Bloqueos
- **Modo B (precios verificados) no viable gratis**: Booking y Expedia exigen ser partner; Amadeus Self-Service cerró el 2026-07-17.

## Errores conocidos
- Overpass público es intermitente (504) y limita con 429 tras pocas consultas seguidas. Mitigado con reintentos, instancia alternativa y caché; no eliminable.
- Nominatim no encuentra con ruido tipo «estación de tren»; «Estación de Atocha» devuelve paradas de autobús. Se ranquea por tipo de lugar elegido y se pide elegir siempre entre coincidencias.

## Comandos de ejecución
`npm install` · `npm run dev` (desarrollo) · `npm run build` · `npm test` · `npm run lint` · `npm run test:e2e` (requiere instalar navegadores de Playwright: pendiente, es una descarga y se pedirá permiso).

## Resultados de las últimas pruebas
2026-09-23: lint sin errores; `npm test` 29/29 (unitarias + integración con mocks: 400, 401, 403, 429, 500, timeout, respuesta no JSON, caché, Overpass 504 con reintentos); build OK.
Prueba REAL (`npm run test:live`, requiere `npm run dev -- --port 5199`): «Madrid Atocha» se resolvió vía Nominatim (40,407, -3,689) y Overpass devolvió alojamientos reales a ≤ 800 m (pasó en una ejecución). Tras varias consultas seguidas Overpass devolvió 429: la app lo muestra como «límite alcanzado». No se repite para respetar su cuota (~100 consultas/día).

## Puntos no verificados
Ver `docs/provider-research.md` §7.

## Próximo paso recomendado
Fase 3: motor geográfico + proxy en Pages Functions.

## Reglas de intervención
Pedir permiso al usuario antes de: crear cuentas, usar credenciales, `git push`, desplegar o cualquier cosa con posible coste.
