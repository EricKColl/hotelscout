# CLAUDE.md — HotelScout

**Al empezar una sesión: lee este archivo y `docs/PROJECT_STATUS.md`. Fuente de verdad: `docs/SPEC.md`, con los ajustes de `docs/decisions.md` (D-006).**

## Qué es
PWA en español para localizar alojamientos cerca de un punto de referencia y enviar al usuario a las plataformas originales. El usuario **no es programador**: cuando necesites algo de él, da pasos concretos y sencillos.

## Reglas permanentes
1. **Coste 0 €.** Nada de tarjetas, suscripciones ni dependencias de pago. Un plan gratuito solo sirve si su agotamiento no genera cargos.
2. **Datos reales.** Nunca inventes hoteles, precios, disponibilidad, valoraciones, distancias ni enlaces. Mocks solo en tests. Sin precio real: «Consultar precio».
3. **Estados de error distintos:** sin alojamientos / sin ofertas verificadas / proveedor caído / error de conexión / límite alcanzado / datos insuficientes / búsqueda parcial.
4. **Sin secretos en el repositorio ni en el navegador** (`VITE_*` incluido). `.env.example` sin valores.
5. **Arquitectura modular:** UI independiente de proveedores; adaptadores con modelo interno normalizado.
6. **Respeto a proveedores:** el navegador nunca llama directo a Nominatim/Overpass; solo vía `/api/*` (proxy con lista blanca, `User-Agent`, caché, límites). **Sin autocompletado contra Nominatim.** Atribución OSM visible.
7. **Enlaces** clasificados: oficial y documentado / funciona pero no documentado (solo «Buscar en [plataforma]», nunca oferta) / no fiable (no se usa). Ver D-004.
8. **Verificación en vivo:** condiciones de servicios externos se comprueban en su documentación oficial actual, con enlace y fecha; si no, «no verificado».
9. **Pruebas obligatorias.** No declares algo terminado o pasado sin haberlo ejecutado; informa fallos tal cual.
10. **Idioma:** interfaz, documentación y comunicación en español.

## Pide permiso al usuario antes de
Crear cuentas, usar credenciales, `git push`, desplegar, o cualquier acción con posible coste.

## Flujo
Fases 1–8 en `docs/implementation-plan.md`. Tras cada fase: actualizar `docs/PROJECT_STATUS.md` y hacer commit local. Punto de control obligatorio tras cada fase que el usuario indique (tras Fase 1: esperar aprobación).

## Estado del stack
Node 24 / npm 11 / Git 2.53 en Windows 11. Sin `gh`. Modo B (precios verificados) **no viable** hoy (ver `docs/provider-research.md`).
