# Investigación de proveedores — HotelScout

Fecha de las comprobaciones: **2026-09-23**. Método: lectura de documentación oficial mediante búsqueda web y descarga de páginas. Cuando solo se encontró una fuente secundaria (blog, foro, GitHub) se indica. Todo lo que no se pudo confirmar aparece como **no verificado**.

Leyenda: ✅ verificado en fuente oficial · 🟡 fuente secundaria · ❓ no verificado.

---

## 1. Resumen ejecutivo

| Proveedor | ¿Utilizable con 0 € y sin acuerdo comercial? | Veredicto |
|---|---|---|
| Booking.com Demand API | **No**: exige ser *Managed Affiliate Partner* con contrato firmado | Descartado como dependencia. Interfaz de adaptador preparada, sin implementar |
| Expedia Rapid API | **No**: exige ser partner aprobado y revisión de sitio antes de producción | Descartado |
| Amadeus Self-Service | **No existe ya**: portal desmantelado el 17-07-2026 | Descartado |
| OpenStreetMap (Overpass) | Sí, con límites muy bajos en la instancia pública | **Base del Modo A** |
| Nominatim público | Sí, pero 1 req/s máx., sin autocompletado, con caché | Base del Modo A **vía proxy** |
| Photon (komoot) | Sí, admite autocompletado; sin límites numéricos publicados | Alternativa opcional |
| Geoapify / LocationIQ | Sí, requieren registro (sin tarjeta) y clave | Alternativa opcional (requiere tu permiso para crear cuenta) |
| Cloudflare Pages + Workers | Sí, sin tarjeta, con cuotas diarias que se cortan (no facturan) | Alojamiento y proxy |

**Conclusión:** hoy **no existe ninguna API hotelera con precios y disponibilidad reales que se pueda usar gratis y sin acuerdo comercial**. El **Modo B (comparación de precios verificados) no es construible** ahora. Se construye el **Modo A**: localizar alojamientos reales (OpenStreetMap) y derivar a las plataformas con enlaces de búsqueda etiquetados con honestidad.

---

## 2. Proveedores hoteleros

### 2.1 Booking.com Demand API

- **Disponibilidad:** existe (producción `demandapi.booking.com/3.1`, sandbox `demandapi-sandbox.booking.com/3.1`). ✅ [developers.booking.com/demand/docs/open-api/demand-api](https://developers.booking.com/demand/docs/open-api/demand-api)
- **Requisitos:** «Registered as a Booking.com Managed Affiliate Partner»; acceso a Partner Centre «provided by your Booking.com Account Manager after signing the agreed contract»; se generan token y `X-Affiliate-Id`. ✅ [Prerrequisitos](https://developers.booking.com/demand/docs/getting-started/prerequisites)
- **Aprobación comercial:** sí, contrato y gestor de cuenta. Reservar desde la API exige además aprobación aparte («Search, Look & Book»). 🟡 [Vorp Labs, comprobado por ellos el 2026-07-30](https://vorplabs.com/agent-tools/booking-demand-api)
- **Uso de IA:** según esa misma fuente secundaria, los General Partner Terms v5 exigen aprobación escrita previa para usar sistemas de IA en la ejecución del contrato. 🟡 (no se pudo leer el PDF original) ❓
- **Uso personal:** no hay nivel de desarrollador anónimo. ✅/🟡
- **Tarjeta:** no se menciona; el bloqueo es contractual, no de pago.
- **Cuota gratuita de producción:** sandbox 50 req/min 🟡; producción «específica del partner» 🟡.
- **Precios/disponibilidad, impuestos, cancelación, enlaces, almacenamiento, redistribución:** la API los ofrece a partners, pero **no se pudo verificar el detalle** sin acceso a la documentación completa ni a un contrato ❓.
- **Viabilidad real:** **nula** para este proyecto hoy. Requiere una empresa/sitio con audiencia y un acuerdo comercial.

### 2.2 Expedia Rapid API

- «To integrate with Rapid API, you need to be an Expedia partner.» La clave queda en «restricted development mode until after your site review». Entorno de pruebas `test.ean.com`. ✅ [Getting started](https://developers.expediagroup.com/docs/products/rapid/setup/getting-started)
- Las solicitudes se revisan «case by case». ✅ [Partner page](https://partner.expediagroup.com/en-us/join-us/rapid-api)
- Tarifas/mínimos contractuales: la guía **no los menciona** ❓.
- **Viabilidad real:** **nula** sin acuerdo de partner.

### 2.3 Amadeus

- El portal *Self-Service* (clave gratuita, cuota mensual gratuita, producción de pago por uso) **fue desmantelado el 17 de julio de 2026**; el registro se pausó en junio. El sitio actual es solo del portal *Enterprise*. 🟡 [PhocusWire](https://www.phocuswire.com/amadeus-shut-down-self-service-apis-portal-developers) (la página devolvió 403 al descargarla; datos obtenidos de resultados de búsqueda) y 🟡 [incidencia de GitHub que cita el aviso oficial del portal](https://github.com/abhinavmathur-atlan/mcp-travel-assistant/issues/4).
- El acceso Enterprise exige solicitud formal y certificación; no hay nivel gratuito equivalente. 🟡 [OneClick TravelTech](https://oneclicktraveltech.com/blogs/amadeus-api-pricing-and-access)
- No se pudo abrir `developers.amadeus.com` para contrastar directamente ❓ (respuesta vacía).
- **Viabilidad real:** **nula**.

### 2.4 APIs de afiliación / otras

- Programa de afiliados de Expedia (vía CJ Affiliate) y de Booking (vía sus propios programas): requieren alta y aprobación como afiliado; sirven para **enlaces con seguimiento**, no para consultar precios. 🟡 [Ayuda Expedia Affiliates](https://help.affiliates.expediagroup.com/hc/en-us/articles/4410934356887-How-to-access-products-for-the-Expedia-USA-Program-CJ-Affiliate) (el artículo «cómo crear enlaces» falló por error SSL; ❓ condiciones exactas).
- Otros agregadores (LiteAPI, Travelpayouts, etc.): **no se investigaron en profundidad**; quedan como ❓ para una revisión posterior si el usuario quiere explorar el Modo B.
- Conclusión: no hay fuente de precios gratuita verificada.

---

## 3. Fuentes geográficas

### 3.1 Nominatim público (geocodificación)

Fuente: [Política de uso de Nominatim](https://operations.osmfoundation.org/policies/nominatim/) ✅ (2026-09-23)

- Máximo **1 petición/segundo**, «no heavy uses».
- **Autocompletado prohibido:** «you must not implement such a service on the client side using the API».
- Obligatorio identificar la aplicación con `User-Agent` o `Referer` válidos.
- Recomienda montar un proxy con caché; los resultados deben cachearse.
- Los límites son **por aplicación**: «the sum of traffic by all your users should not exceed the limits».
- Atribución ODbL visible.
- API: `q` libre o consulta estructurada, `limit` máx. 40, `countrycodes`, `viewbox`/`bounded`. ✅ [Documentación de Search](https://nominatim.org/release-docs/latest/api/Search/)

### 3.2 Overpass API (alojamientos y estaciones)

Fuentes: [Wiki Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) ✅ (2026-09-23).

- «Menos de 10 000 consultas y 1 GB al día» no molesta a otros usuarios; **«si lo usas regularmente, divide entre 100»** → menos de **100 consultas y 10 MB/día**.
- Identificar la app con `User-Agent`/`Referer`. Ante 429/406, esperar 30 s.
- La instancia principal se describe como sobrecargada y sin garantías. Se pide evitar plataformas de despliegue rápido de IA (lovable.app, netlify.app).
- Instancias alternativas: `overpass.private.coffee` (sin límites declarados, avisar en proyectos grandes) 🟡 según esa wiki; otras son de pago o regionales.
- Etiquetas de alojamiento en OSM: `tourism=hotel|hostel|guest_house|motel|apartment|chalet…` ✅ [Key:tourism](https://wiki.openstreetmap.org/wiki/Key:tourism).
- **Implicación:** ~100 consultas/día es una cuota real y estrecha → **caché obligatoria** y consultas por zona, no por pulsación.

### 3.3 Teselas del mapa (OpenStreetMap)

Fuente: [Política de teselas](https://operations.osmfoundation.org/policies/tiles/) ✅.
Uso interactivo normal permitido; prohibida la descarga masiva y el uso offline; atribución visible; `Referer` válido; caché mínima 7 días; «el acceso puede retirarse en cualquier momento». **Suficiente para un uso personal/pequeño**; si crece, hará falta un proveedor de teselas alternativo (❓ no evaluado).

### 3.4 Alternativas gratuitas de geocodificación

| Servicio | Gratis | Tarjeta | Autocompletado | Atribución | Clave |
|---|---|---|---|---|---|
| **Photon** (`photon.komoot.io`) ✅ [photon.komoot.io](https://photon.komoot.io/) | Sin cifras; «uso razonable, se limitará el abuso», sin garantías | No | **Sí** (typeahead) | «Made with OpenStreetMap» | No |
| **Geoapify** ✅ [Precios](https://www.geoapify.com/pricing/) | 3 000 créditos/día, 5 req/s | **No** | Sí (1 crédito) | Obligatoria | Sí (registro) |
| **LocationIQ** 🟡 [Precios](https://locationiq.com/pricing) | 5 000 req/día, 2 req/s | No (aparente) | Sí | Enlace «Search by LocationIQ.com» | Sí (registro) |

Reglas de almacenamiento/caché de Geoapify y LocationIQ: ❓ no verificadas.

---

## 4. Infraestructura gratuita (Cloudflare)

Fuentes: [Precios Workers](https://developers.cloudflare.com/workers/platform/pricing/), [Límites Pages](https://developers.cloudflare.com/pages/platform/limits/), [Precios Pages Functions](https://developers.cloudflare.com/pages/functions/pricing/), [Límites KV](https://developers.cloudflare.com/kv/platform/limits/), [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/). ✅ 2026-09-23.

- **Workers Free:** 100 000 peticiones/día, 10 ms de CPU por invocación. «Si superas un límite, esas operaciones **fallan con error**»: **no hay cargos** en el plan Free. ✅
- **Pages Free:** 500 builds/mes, 20 000 archivos/sitio, 25 MiB/archivo, 100 dominios propios. Peticiones a estáticos **gratis e ilimitadas**. Las Functions consumen la cuota de Workers (100 000/día). ✅
- **KV Free:** 100 000 lecturas/día, **1 000 escrituras/día**, 1 GB. ✅
- **Cache API:** el contenido **no se replica fuera del centro de datos** donde se creó; solo peticiones `GET`; funciona en Pages Functions (`*.pages.dev`) y dominios propios, **no** en el editor del panel. ✅
- **Tarjeta:** los resultados de búsqueda indican que Workers/Pages Free no la piden 🟡; **no se comprobó el flujo de alta real** (Cloudflare puede pedir verificación al crear cuenta) ❓. Se confirmará contigo en la Fase 2, paso a paso.
- **Riesgo de coste:** con el plan Free, no hay facturación por exceso; el riesgo aparece solo si se activa un plan de pago manualmente. ✅
- **HTTPS y subdominio gratuito** (`*.pages.dev`): estándar de Pages 🟡 (no verificado con captura del panel) ❓.

---

## 5. Enlaces a plataformas: clasificación

Reglas de la decisión (registradas en `decisions.md`, D-004).

| # | Tipo de enlace | Clasificación | Evidencia | Uso en la app |
|---|---|---|---|---|
| L1 | Enlace de reserva devuelto por API oficial (Booking Demand, Rapid) | **Oficial y documentado** | Solo disponible para partners (ver §2) | **No disponible** (sin acceso) |
| L2 | Deep link de afiliado Expedia (`MDPCID`, `startDate`, `endDate`, `NumAdult-Room1`, `CityName`=código IATA de 3 letras) | **Oficial y documentado, pero solo para socios White Label**; documentación no pública para uso general ✅ [Attach links](https://developers.expediagroup.com/white-label-travel-platform/traffic-growth/attach-deeplink) | Requiere ser partner/afiliado; destino solo por código de aeropuerto → no sirve para "cerca de esta estación" | **No se usa** |
| L3 | Booking `searchresults.html?ss=…&checkin=…&checkout=…&group_adults=…&no_rooms=…` | **Funciona pero no documentado oficialmente** 🟡: aparece en guías de afiliados y ejemplos de terceros; no se encontró página oficial pública que lo garantice. `ss` lo interpreta el servidor por texto | Etiqueta «Buscar en Booking.com». Nunca «oferta» ni precio. **Sin parámetro `aid`** (sería enlace de afiliado; requiere cuenta) |
| L4 | Google Hotels / Google Travel con parámetros | **No fiable**: no se encontró documentación oficial pública de parámetros de `google.com/travel/hotels` (solo Hotel Center/Ads para anunciantes) 🟡 | **No se usa** (o solo enlace a búsqueda web genérica de Google Maps con nombre del hotel, ver L6) |
| L5 | Web oficial del establecimiento (`website`/`contact:website` de OSM) | **Oficial** (dato del propio hotel) pero de **calidad variable** (OSM puede estar desactualizado) | «Web del alojamiento», tras validar HTTPS y dominio |
| L6 | Enlace de mapa a las coordenadas (OpenStreetMap `?mlat=&mlon=`; `geo:`) | **Oficial y documentado** (OSM) [dato: convención pública de OSM; ❓ verificar en Fase 3] | «Ver en mapa» |
| L7 | Expedia/Hotels.com `Hotel-Search?destination=…&startDate=…` sin afiliación | **No verificado**: ❓ no se probó ni se halló documentación | No se usa hasta comprobarlo |

**No se hicieron pruebas en vivo de las URLs** (no se automatizan peticiones a Booking/Expedia para no chocar con sus protecciones). Comprobar el comportamiento real requiere que **tú abras el enlace en tu navegador** (paso sencillo en Fase 3).

---

## 6. Evaluación del proxy en Cloudflare para Nominatim

**Pregunta:** ¿hace falta un Worker proxy o basta llamar desde el navegador?

**Evidencia a favor del proxy:**
1. La política mide el tráfico **por aplicación, sumando a todos los usuarios** (1 req/s en total). Desde navegadores independientes no hay forma de coordinarse.
2. Exige **identificar la aplicación** con `User-Agent`/`Referer`. Un navegador **no puede fijar `User-Agent`** (solo envía `Referer`, que además puede recortarse por política de referrer). Un Worker sí puede enviar un `User-Agent` propio con contacto.
3. La política **recomienda expresamente** un proxy con caché.
4. Overpass admite ~100 consultas/día en uso regular: sin caché compartida se agota con muy pocos usuarios.
5. Un proxy permite **validar entradas** (solo hosts fijos, parámetros permitidos), cumpliendo el requisito de no permitir URLs arbitrarias (SPEC §12).

**Limitaciones honestas del proxy:**
- La caché de Cloudflare (Cache API) es **por centro de datos**, no global → un mismo dato puede consultarse varias veces desde regiones distintas. Para este uso (pocas personas) es aceptable.
- Un límite global exacto de 1 req/s requeriría estado compartido: **KV** (1 000 escrituras/día en Free) o **Durable Objects** (❓ no verificado en Free). Para 2–10 usuarios, basta con: caché + límite por IP + una cola simple en el Worker. **No se promete** un límite global estricto.
- Consumo de la cuota de Workers (100 000/día): irrelevante para este tráfico.

**Decisión (D-002):** **Sí, usar un Worker/Pages Function como proxy** para Nominatim y Overpass, con: lista blanca de hosts y parámetros, `User-Agent` propio, caché con `Cache-Control`, límite por IP, timeouts, y **sin autocompletado**: la búsqueda se lanza al pulsar «Buscar» o Enter. El navegador nunca llama directamente a Nominatim/Overpass.

**Alternativas evaluadas y resultado:**
- *Llamar desde el navegador:* incumple identificación y coordinación → descartado.
- *Photon para autocompletado:* técnicamente permitido, pero sin límites numéricos ni garantías; se deja como **mejora opcional** posterior, también vía proxy.
- *Geoapify/LocationIQ:* fiable y con autocompletado, pero exige que **tú crees una cuenta** y guardes una clave como secreto en el Worker; queda como plan B si Nominatim resulta insuficiente. **No se crea nada sin tu permiso.**

---

## 7. Pendiente de validar (no verificado)

1. Términos de IA de Booking (PDF original).
2. Contrato/tarifas de Expedia Rapid.
3. Página oficial de Amadeus tras el cierre.
4. Flujo de alta de Cloudflare (tarjeta, verificación).
5. Reglas de almacenamiento de Geoapify/LocationIQ.
6. Comportamiento real de enlaces L3 (`ss`, fechas, ocupación) — lo probarás tú.
7. Disponibilidad y límites de `overpass.private.coffee` en uso real.
8. Durable Objects en el plan Free.
9. Proveedores de teselas alternativas por si OSM limita el uso.
