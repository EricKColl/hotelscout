# Estado del proyecto — HotelScout

Última actualización: 2026-09-23

## Objetivo
Aplicación web (PWA) gratuita para localizar alojamientos cerca de un punto de referencia (estación, aeropuerto, centro, dirección) y derivar a las plataformas originales. Fuente de verdad: `docs/SPEC.md` con los ajustes del usuario recogidos en `docs/decisions.md` (D-006).

## Fase activa
**Fase 1 completada. Detenido a la espera de aprobación del usuario para la Fase 2.**

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

## Tareas pendientes
- Aprobación de D-001…D-004 por el usuario.
- Fases 2–8 (ver plan).

## Bloqueos
- **Modo B (precios verificados) no viable gratis**: Booking y Expedia exigen ser partner; Amadeus Self-Service cerró el 2026-07-17.

## Errores conocidos
Ninguno (aún no hay código).

## Comandos de ejecución
Ninguno todavía (proyecto sin inicializar).

## Resultados de las últimas pruebas
No aplica.

## Puntos no verificados
Ver `docs/provider-research.md` §7.

## Próximo paso recomendado
Que el usuario revise el resumen, apruebe (o corrija) D-001…D-004 y autorice la Fase 2.

## Reglas de intervención
Pedir permiso al usuario antes de: crear cuentas, usar credenciales, `git push`, desplegar o cualquier cosa con posible coste.
