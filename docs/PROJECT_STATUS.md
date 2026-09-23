# Estado del proyecto — HotelScout

Última actualización: 2026-09-23

## Objetivo
PWA gratuita en español para localizar alojamientos cerca de un punto de referencia y derivar a las plataformas originales. Fuente de verdad: `docs/SPEC.md` con los ajustes del usuario (`docs/decisions.md`, D-006).

## Fase activa
**Fases 1–8 completadas y proyecto DESPLEGADO en https://hotelscout.pages.dev (2026-09-23). Repositorio: https://github.com/EricKColl/hotelscout. Solo quedan mejoras opcionales.**

## Arquitectura actual
PWA React + TS → Cloudflare Pages Functions (proxy con caché) → Nominatim / Overpass. Ver `docs/architecture.md`.

## Tareas completadas
- Fase 1: investigación y plan (`provider-research.md`, `implementation-plan.md`, `decisions.md`, `CLAUDE.md`).
- Fase 2: Vite + React 19 + TS estricto + Tailwind 4 + Vitest + Playwright + oxlint.
- Fase 3: proxy (`functions/_lib/proxy.ts`), cliente y normalización geográfica, Haversine.
- Fases 4–5: enlaces validados, interfaz completa (formulario, resultados, filtros, orden, mapa, favoritos, historial, estados de error).
- Fase 6: manifest, iconos, service worker con actualización controlada, cabeceras de seguridad (`public/_headers`).
- Fase 7: pruebas y QA (`docs/qa-report.md`).
- Fase 8: `README.md`, `architecture.md`, `deployment.md`, `limitations.md`, `LICENSE` (MIT a nombre del usuario; cambiable).

## Tareas pendientes
1. Opcionales: probar en Firefox/Safari y en móvil real (instalación PWA); Lighthouse; mejorar la latencia de Overpass (búsqueda sin caché ~50 s); valorar Photon/Geoapify si Nominatim se queda corto.
2. Cualquier cambio: commit local → pedir permiso → `git push` (Cloudflare redespliega solo).

## Bloqueos
- **Modo B (precios verificados) no viable gratis**: Booking y Expedia exigen ser partner; Amadeus Self-Service cerró el 2026-07-17.

## Cambios pendientes de publicar
Commit local: enlace de Booking por coordenadas (D-010) y revisión de robustez (D-011). **Falta  (necesita permiso del usuario).**

## Errores conocidos
- Overpass público: 429/504 intermitentes; mitigado con reintentos, instancia alternativa y caché.
- Nominatim no encuentra bien consultas con ruido («estación de tren de X»).
- Firefox/Safari sin probar. Búsquedas nuevas pueden tardar hasta ~50 s si Overpass está saturado (las repetidas salen de caché).

## Comandos de ejecución
`npm install` · `npm run dev` · `npm run build` · `npm test` · `npm run lint` · `npm run test:e2e` (Edge instalado) · `npm run test:live` (real, con moderación; requiere `npm run dev -- --port 5199`).

## Resultados de las últimas pruebas (2026-09-23)
lint sin avisos · `npm test` 78/78 · `npm run test:e2e` 16/16 (incl. axe y PWA sin conexión) · build OK (JS 114 kB gzip + mapa 44 kB gzip diferido) · `npm audit` 0 vulnerabilidades · prueba real: Nominatim y Overpass OK en una ejecución, después 429/504 (esperado). Detalle: `docs/qa-report.md`.

## Puntos no verificados
`docs/provider-research.md` §7 y `docs/qa-report.md` «pendientes».

## Próximo paso recomendado
Que el usuario revise el resumen final, pruebe un enlace de Booking y decida si autoriza GitHub + Cloudflare.

## Reglas de intervención
Pedir permiso antes de: crear cuentas, usar credenciales, `git push`, desplegar o cualquier cosa con posible coste.
