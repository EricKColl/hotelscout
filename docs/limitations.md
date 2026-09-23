# Limitaciones — HotelScout

Lo que **sí** hace y lo que **no** hace la aplicación (2026-09-23).

## Lo que no hace
- **No compara precios ni comprueba disponibilidad.** No hay ninguna fuente gratuita autorizada (ver `provider-research.md`). En las tarjetas pone «Consultar precio». El contador de ofertas verificadas es siempre 0.
- **No reserva ni cobra.** Solo abre la web del alojamiento, la búsqueda de Booking.com o el mapa.
- **No filtra por cancelación gratuita, desayuno, presupuesto ni valoración de clientes**: OpenStreetMap no tiene esos datos y no se muestran filtros sin efecto real.
- **No calcula recorridos a pie ni minutos andando.** Las distancias son en línea recta (Haversine).
- **No hay autocompletado** al escribir: Nominatim público lo prohíbe.
- **No hay alertas de precio.**

## Calidad de los datos (OpenStreetMap)
- Puede faltar cualquier alojamiento, tener coordenadas erróneas, estar cerrado o duplicado. Solo salen los que tienen nombre.
- Las estrellas y la web aparecen solo si alguien las registró en OpenStreetMap.
- Nominatim entiende mejor «Madrid Atocha» que «estación de tren de Atocha»; «Estación de Atocha» puede devolver paradas de autobús. Por eso se muestran las coincidencias para elegir.
- Búsqueda de alojamientos limitada a 300 resultados y radio máximo de 5 km.

## Enlaces
- «Buscar en Booking.com» usa una URL de búsqueda **no documentada oficialmente**. Puede dejar de conservar fechas u ocupación sin aviso. Decisión D-004.
- No se usan enlaces de Google Hotels ni de Expedia (no fiables o solo para socios).
- No hay enlaces de afiliado: no se genera ningún ingreso.

## Servicios gratuitos y sus límites
- **Overpass público:** ~100 consultas/día en uso regular, a menudo saturado (504) o limitando (429). La app cachea 24 h por zona, pero con muchos usuarios se agotaría.
- **Nominatim público:** 1 petición/s en total; caché de 7 días.
- **Teselas OSM:** solo uso interactivo normal; pueden retirar el acceso.
- **Cloudflare (gratis):** 100 000 peticiones/día a las Functions; al superarlo, fallan (sin cargo). Caché por centro de datos.
- El límite por IP del proxy es «mejor esfuerzo» (memoria de cada instancia).

## Técnicas
- Probado en Chromium/Edge; Firefox y Safari sin probar.
- Sin cuentas: favoritos e historial viven en el navegador y no se sincronizan entre dispositivos.
- Interfaz solo en español.
