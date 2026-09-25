# Usar HotelScout de viaje con una eSIM (p. ej. en Japón)

Última revisión: 2026-09-25 (D-013).

## Respuesta corta

**Sí, funciona igual.** HotelScout es una web normal: solo necesita conexión a Internet, venga de Wi‑Fi, de tu SIM o de una eSIM. No usa tu número de teléfono, ni SMS, ni el GPS, ni el país de tu conexión para nada. Tampoco tiene cuentas ni pagos, así que no hay nada que se «bloquee» por estar en otro país.

Lo que sí cambia de viaje es la **calidad de la conexión** (cobertura que va y viene, metro, túneles, trenes, cambios entre Wi‑Fi del hotel y datos). Por eso se ha revisado y reforzado la app para ese caso.

## Qué se ha revisado y qué se ha cambiado

| Situación típica en el viaje | Antes | Ahora |
|---|---|---|
| La cobertura se corta un momento mientras buscas | «Error de conexión» y había que volver a escribir | Se reintenta **una vez sola** a los 2 s; si sigue fallando, botón **«Reintentar»** (también al buscar el lugar) |
| Te quedas sin conexión (metro, avión) y pulsas «Buscar» | Error | Aviso **«Esperando conexión…»** y la búsqueda **se lanza sola** al volver la conexión |
| Conexión «colgada» (hay rayitas, pero no pasan datos) | La búsqueda podía quedarse «cargando» indefinidamente | Tiempo límite real de 55 s y mensaje claro («puede ser cobertura débil o el servidor saturado») |
| El móvil se desconecta a mitad de una búsqueda lenta (~50 s) | El servidor abandonaba la consulta y había que repetirla entera | El servidor la **termina y la guarda** (hasta 30 s tras la desconexión); al reintentar sale de la caché al instante |
| Abrir la app con cobertura débil | Pantalla en blanco hasta que la red respondiera | Si la red no responde en 5 s, se abre la **copia guardada** en el móvil |
| Abrir la app sin conexión | Solo funcionaba si la habías abierto al menos dos veces antes | Funciona **desde la primera visita** (la app se guarda al cargarla) |
| Mapa con datos lentos | Si tardaba más de 20 s en total, se cambiaba al mapa de OSM, **rotulado en japonés** | Solo se cambia si pasan 20 s **sin ningún avance**; una conexión lenta pero que descarga ya no se considera fallo (y el estilo tiene 15 s en vez de 8) |

Todo está cubierto por pruebas automáticas (ver `qa-report.md`, sección D-013).

## Qué NO depende de la app (y cómo tenerlo bajo control)

- **País de la conexión:** muchas eSIM de viaje salen a Internet por otro país (Hong Kong, Singapur, Europa…). A HotelScout le da igual. **Booking** sí puede elegir la **moneda** según tu conexión (yenes, dólares de Hong Kong…): cámbiala arriba en Booking si hace falta. *No verificado en vivo desde el entorno de desarrollo.*
- **Control antirrobots de Booking:** a veces muestra su portada; vuelve atrás y pulsa otra vez (ya se avisa en la app).
- **Precios y reservas:** se hacen siempre en Booking o en la web del hotel, no en HotelScout.

## Consumo de datos (medido en el build del 2026-09-25, comprimido)

- **Primera visita a la app:** ≈ 120 kB (página, código y estilos). Después queda guardada en el móvil.
- **Primera vez que se muestra el mapa:** ≈ 480 kB más (motor del mapa), también se guarda y no se vuelve a descargar.
- **Cada búsqueda:** la lista de alojamientos y las teselas del mapa de esa zona. **No medido** (sin acceso a los servidores reales desde el entorno de desarrollo); con cualquier eSIM de 1 GB o más no debería notarse.

## Lista de comprobación antes de viajar

1. **Abre https://hotelscout.pages.dev en tu móvil una vez antes de salir** (con Wi‑Fi) y haz una búsqueda con mapa. Así la app y el mapa quedan guardados. Si aparece «Hay una versión nueva», pulsa **«Actualizar ahora»**.
2. Opcional: **instálala** en la pantalla de inicio (Android: menú ⋮ → «Instalar aplicación»; iPhone: Compartir → «Añadir a pantalla de inicio»).
3. Guarda como **favoritos** los alojamientos que te interesen: se pueden consultar sin conexión.
4. Ajustes del móvil (no es de la app, pero evita sustos y cargos):
   - Pon la **eSIM como línea de datos móviles**.
   - En la **eSIM**, activa «Itinerancia de datos» si tu proveedor de eSIM lo pide (casi todas las eSIM de viaje lo necesitan).
   - En tu **SIM española**, **desactiva la itinerancia de datos** para que no te cobre tu operador.
5. Comprueba la hora del móvil en **automática**: las fechas mínimas de entrada usan la fecha local del móvil (Japón va 7 h por delante de España en verano y 8 h en invierno).

## Si algo falla allí

| Lo que ves | Qué significa | Qué hacer |
|---|---|---|
| «Esperando conexión…» | El móvil no tiene Internet | Nada: se lanza sola al volver la conexión |
| «Error de conexión» | La conexión se cortó dos veces seguidas o tardó demasiado | Pulsa «Reintentar» cuando tengas mejor cobertura |
| «Servicio de mapas temporalmente no disponible» | El servidor gratuito de OpenStreetMap está saturado (no es tu eSIM) | Espera unos minutos o prueba un radio menor |
| «Límite de solicitudes alcanzado» | Demasiadas búsquedas en poco tiempo | Espera un minuto |
| El mapa sale con nombres en japonés | El mapa en español no pudo cargar | La lista y los enlaces funcionan igual; recarga más tarde |
