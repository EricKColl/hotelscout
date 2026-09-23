# Estado del proyecto — HotelScout

Última actualización: 2026-09-23

## Objetivo
Aplicación web (PWA) gratuita para localizar alojamientos cerca de un punto de referencia (estación, aeropuerto, centro, dirección) y derivar a las plataformas originales. Fuente de verdad: `docs/SPEC.md` con los ajustes del usuario recogidos en `docs/decisions.md` (D-006).

## Fase activa
**Fase 2 (infraestructura) completada. Siguiente: Fase 3 (motor geográfico y proxy).**

## Arquitectura actual (propuesta, no implementada)
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

## Tareas pendientes
- Aprobación de D-001…D-004 por el usuario.
- Fases 2–8 (ver plan).

## Bloqueos
- **Modo B (precios verificados) no viable gratis**: Booking y Expedia exigen ser partner; Amadeus Self-Service cerró el 2026-07-17.

## Errores conocidos
Ninguno (aún no hay código).

## Comandos de ejecución
`npm install` · `npm run dev` (desarrollo) · `npm run build` · `npm test` · `npm run lint` · `npm run test:e2e` (requiere instalar navegadores de Playwright: pendiente, es una descarga y se pedirá permiso).

## Resultados de las últimas pruebas
Fase 2 (2026-09-23): lint sin errores, `npm test` 1/1, `npm run build` OK (JS 68,7 kB gzip).

## Puntos no verificados
Ver `docs/provider-research.md` §7.

## Próximo paso recomendado
Que el usuario revise el resumen, apruebe (o corrija) D-001…D-004 y autorice la Fase 2.

## Reglas de intervención
Pedir permiso al usuario antes de: crear cuentas, usar credenciales, `git push`, desplegar o cualquier cosa con posible coste.
