# Limitaciones — HotelScout

Lo que **sí** hace y lo que **no** hace la aplicación (2026-09-24).

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
- Nombres en español: el mapa usa la traducción de OSM (`name:es`) y, si no existe, la forma en alfabeto latino; algunas calles o barrios pueden seguir en el idioma local. Los hoteles con nombre en otro alfabeto solo se traducen si OSM tiene su traducción.
- Nominatim entiende mejor «Madrid Atocha» que «estación de tren de Atocha»; «Estación de Atocha» puede devolver paradas de autobús. Por eso se muestran las coincidencias para elegir.
- Búsqueda de alojamientos limitada a 300 resultados y radio máximo de 5 km.

## Enlaces
- «Buscar en Booking.com» usa una URL de búsqueda **no documentada oficialmente**. Puede dejar de conservar fechas u ocupación sin aviso. Decisión D-004.
- Booking solo admite fechas hasta ~16 meses vista y ajusta las habitaciones a los adultos; la app lo valida antes de buscar.
- Booking no lista todos los alojamientos de OpenStreetMap: si no aparece, verás los más cercanos. A veces Booking muestra su portada por un control antirrobots: vuelve atrás y pulsa otra vez.
- Búsqueda limitada a 500 alojamientos; si se alcanza, la app avisa de que puede faltar alguno.
- No se usan enlaces de Google Hotels ni de Expedia (no fiables o solo para socios).
- No hay enlaces de afiliado: no se genera ningún ingreso.

## Servicios gratuitos y sus límites
- **Overpass público:** ~100 consultas/día en uso regular, a menudo saturado (504) o limitando (429). La app cachea 24 h por zona, pero con muchos usuarios se agotaría.
- **Nominatim público:** 1 petición/s en total; caché de 7 días.
- **Mapa (OpenFreeMap):** gratis y sin límites declarados, pero mantenido con donaciones y sin garantía. Si no carga, la app usa las teselas estándar de OSM (nombres en el idioma local).
- **Teselas OSM (alternativa):** solo uso interactivo normal; pueden retirar el acceso.
- **Cloudflare (gratis):** 100 000 peticiones/día a las Functions; al superarlo, fallan (sin cargo). Caché por centro de datos.
- El límite por IP del proxy es «mejor esfuerzo» (memoria de cada instancia).
- **Cloudflare `waitUntil`:** si el móvil se desconecta, la consulta sigue como máximo 30 s más; una consulta de Overpass que tarde más se pierde igualmente y hay que reintentarla.

## Datos móviles y eSIM
La app no depende del tipo de conexión (Wi‑Fi, SIM o eSIM) ni del país por el que salga. Tolera cortes, falta de cobertura y conexiones lentas (ver `viaje-con-esim.md`). Booking puede elegir moneda según el país de la conexión (no verificado).

## Técnicas
- Probado en Chromium/Edge; Firefox y Safari sin probar.
- Sin cuentas: favoritos e historial viven en el navegador y no se sincronizan entre dispositivos.
- Interfaz solo en español.
