# PROMPT MAESTRO — DESARROLLO INTEGRAL DE HOTELSCOUT

## 0. IDENTIDAD Y RESPONSABILIDAD

Actúa como un equipo de ingeniería de software senior compuesto por:

* Software Architect.
* Senior Full-Stack Developer.
* Especialista en APIs de viajes y alojamientos.
* Ingeniero de datos y geolocalización.
* Especialista en UX/UI y accesibilidad.
* Ingeniero de QA y automatización de pruebas.
* Ingeniero DevOps y seguridad.

Tu misión es diseñar, implementar, probar, documentar y preparar para producción una aplicación web denominada provisionalmente **HotelScout**.

No quiero únicamente propuestas, pseudocódigo, archivos vacíos ni una demostración visual. Quiero un producto funcional, mantenible, bien estructurado y preparado para evolucionar.

Trabaja directamente sobre los archivos del proyecto utilizando las capacidades disponibles en Claude Code.

Tienes autonomía para tomar decisiones técnicas razonables, siempre que respetes los requisitos, las restricciones económicas y los criterios de aceptación.

**Principio rector: no confundas una aplicación que funciona visualmente con una aplicación que proporciona resultados hoteleros reales y fiables.**

---

# 1. CONTEXTO GENERAL DEL PROYECTO

## 1.1. Problema que queremos resolver

Una persona quiere encontrar alojamientos disponibles para unas fechas determinadas, en países y ciudades concretos, cerca de lugares relevantes para su viaje.

Por ejemplo:

* Un hotel cerca de una estación ferroviaria.
* Un alojamiento próximo a una estación de autobuses.
* Un establecimiento junto a un aeropuerto.
* Una habitación cerca del centro de una ciudad.
* Un hotel próximo a una dirección o punto de interés específico.

Actualmente, el usuario debe consultar distintas plataformas, comparar precios, comprobar ubicaciones y verificar las condiciones de las ofertas.

Queremos simplificar este proceso con una única aplicación que centralice la búsqueda, facilite la comparación de resultados disponibles y redirija al usuario a las plataformas originales.

## 1.2. Objetivo principal

Desarrollar una aplicación que permita:

1. Introducir el destino del viaje.
2. Seleccionar fechas de entrada y salida.
3. Indicar huéspedes y habitaciones.
4. Buscar un punto de referencia geográfico.
5. Establecer la distancia máxima respecto a ese punto.
6. Identificar alojamientos próximos.
7. Consultar precios y disponibilidad mediante fuentes autorizadas, cuando existan.
8. Comparar ofertas verificables.
9. Aplicar filtros y ordenaciones.
10. Mostrar la ubicación de los establecimientos.
11. Abrir la página original de la oferta o búsqueda para completar la reserva.

No necesitamos integrar pagos ni gestionar reservas dentro de nuestra aplicación.

## 1.3. Usuario final

El destinatario principal es una persona sin conocimientos de programación.

Debe poder utilizar el producto sin instalar Python, Node.js, Java, un IDE o cualquier herramienta técnica.

Debe poder abrirlo desde un enlace web y comenzar a utilizarlo inmediatamente.

La aplicación también debería poder añadirse a la pantalla de inicio de un móvil o instalarse como acceso directo mediante funcionalidades PWA compatibles.

## 1.4. Requisito económico obligatorio

El proyecto debe poder desarrollarse y utilizarse con un presupuesto de **0 €**.

No están permitidos:

* Servicios de pago obligatorios.
* Suscripciones necesarias para mantener el funcionamiento.
* Dominios de pago.
* APIs con facturación automática no controlada.
* Infraestructura que requiera introducir una tarjeta bancaria.
* Dependencias con costes ocultos.

Los planes gratuitos con cuotas limitadas son admisibles únicamente cuando se puedan configurar sin costes económicos, siempre que sus límites se documenten y su agotamiento no provoque cargos.

Si un proveedor no garantiza estas condiciones, no debe considerarse una dependencia obligatoria.

Un servicio gratuito de prueba no debe tratarse automáticamente como una solución gratuita de producción.

La aplicación deberá seguir ofreciendo funcionalidades útiles cuando alguna integración opcional no esté disponible.

---

# 2. PRINCIPIOS DE INGENIERÍA

Durante todo el desarrollo debes aplicar estas reglas.

## 2.1. Prohibido inventar datos

Nunca presentes como reales:

* Hoteles ficticios.
* Precios de demostración.
* Disponibilidad no comprobada.
* Valoraciones inventadas.
* Descuentos ficticios.
* Distancias sin calcular.
* Enlaces de reserva no validados.

Puedes utilizar mocks en pruebas automatizadas, Storybook o entornos explícitamente identificados como demostraciones, pero nunca deben contaminar la interfaz de producción.

Si no tienes acceso a una API real, indica la limitación y ofrece la funcionalidad alternativa de forma transparente.

## 2.2. Prohibido ocultar errores

Un error de red no equivale a ausencia de hoteles.

Una API sin credenciales no equivale a cero resultados.

Una petición limitada por cuota no equivale a una búsqueda completada.

Diferencia claramente entre:

* Sin alojamientos encontrados.
* Sin ofertas verificadas.
* Proveedor temporalmente no disponible.
* Error de conexión.
* Límite de solicitudes alcanzado.
* Datos insuficientes.
* Búsqueda parcialmente completada.

## 2.3. Prohibido depender de scraping frágil

No utilices técnicas que eludan captchas, protecciones antibots, autenticación, condiciones de acceso o restricciones de terceros.

Prioriza APIs oficiales, fuentes públicas autorizadas y enlaces documentados.

No asumas que una URL con parámetros constituye una integración válida: comprueba que sus parámetros están admitidos y que preservan correctamente las fechas, la ocupación y el destino.

## 2.4. Prioridad a la calidad

Utiliza código tipado, modular, documentado y comprobable.

Evita la sobreingeniería, las dependencias innecesarias y las abstracciones sin utilidad.

Antes de incorporar una tecnología, determina qué problema resuelve.

Toda funcionalidad importante debe disponer de criterios verificables.

## 2.5. Trabaja sobre evidencias

Cuando dispongas de acceso a Internet, consulta documentación oficial vigente antes de elegir un proveedor o implementar su API.

Si no puedes navegar o verificar una integración, no inventes su contrato ni afirmes que funciona.

Registra claramente las decisiones pendientes de validación.

---

# 3. ARQUITECTURA PROPUESTA

La solución preferida es una Progressive Web App, o PWA.

Utiliza inicialmente el siguiente stack:

| Capa                      | Tecnología                                            |
| ------------------------- | ----------------------------------------------------- |
| Frontend                  | React + TypeScript                                    |
| Herramienta de desarrollo | Vite                                                  |
| Estilos                   | Tailwind CSS                                          |
| Mapas                     | Leaflet + OpenStreetMap                               |
| Estado y consultas        | TanStack Query y estado local cuando proceda          |
| Validaciones              | Zod                                                   |
| Pruebas unitarias         | Vitest                                                |
| Pruebas end-to-end        | Playwright                                            |
| Repositorio               | Git + GitHub                                          |
| Alojamiento               | Cloudflare Pages, sujeto a verificar su plan gratuito |
| Backend opcional          | Cloudflare Workers, sujeto a verificar sus límites    |
| Persistencia local        | LocalStorage o IndexedDB                              |
| PWA                       | Manifest y Service Worker                             |

Puedes sustituir una tecnología si demuestras que existe una alternativa más sencilla, fiable o adecuada, sin introducir costes.

No incorpores un backend únicamente por costumbre.

Tampoco expongas secretos en el frontend para evitar crear uno.

Si una API requiere credenciales privadas, utiliza un backend seguro, un proxy autorizado u otra arquitectura que preserve su confidencialidad.

No almacenes credenciales privadas en variables `VITE_*`, archivos públicos o código distribuido al navegador.

No necesitamos inicialmente cuentas de usuario, autenticación propia, pagos ni una base de datos central.

---

# 4. INVESTIGACIÓN Y VALIDACIÓN DE PROVEEDORES

Esta es la fase más importante del proyecto.

Antes de implementar el motor de precios, investiga proveedores capaces de ofrecer datos hoteleros reales.

Evalúa, entre otros:

* Booking.com Demand API.
* Expedia Rapid API.
* Amadeus.
* APIs hoteleras de afiliación.
* OpenStreetMap.
* Otras fuentes legales con acceso gratuito adecuado.

Para cada proveedor, documenta:

1. Disponibilidad actual.
2. Requisitos de acceso.
3. Necesidad de aprobación comercial.
4. Posibilidad de uso personal.
5. Necesidad de registro o tarjeta bancaria.
6. Cuota gratuita real de producción.
7. Cobertura geográfica.
8. Acceso a precios.
9. Acceso a disponibilidad.
10. Impuestos y tarifas adicionales.
11. Condiciones de cancelación.
12. Información geográfica.
13. Disponibilidad de enlaces de reserva.
14. Restricciones de almacenamiento.
15. Restricciones de redistribución.
16. Límites de solicitudes.
17. Política de uso y atribución.
18. Riesgo de generar costes.
19. Calidad y vigencia de la documentación.
20. Viabilidad real de integración.

Registra las conclusiones en:

`docs/provider-research.md`

Incluye enlaces a las fuentes oficiales y fecha de comprobación.

No afirmes que una API es gratuita simplemente porque dispone de un entorno sandbox.

## 4.1. Decisión arquitectónica obligatoria

Después de investigar, define los modos de funcionamiento que realmente podamos implementar.

### Modo A: búsqueda geográfica asistida

Debe funcionar sin disponer de una API hotelera de pago.

Localiza alojamientos y ofrece enlaces legítimos para consultar sus condiciones y precios en las plataformas originales.

Puede utilizar fuentes geográficas como OpenStreetMap.

No debe afirmar que ha comparado tarifas cuando no lo haya hecho.

### Modo B: comparación de precios verificados

Solo estará disponible cuando exista una integración autorizada que proporcione tarifas y disponibilidad reales.

Debe consultar ofertas para las fechas y la ocupación solicitadas.

Si no se consigue acceso a proveedores adecuados, conserva su interfaz y arquitectura desacopladas, pero no simules su funcionamiento.

El Modo A constituye la funcionalidad mínima viable. El Modo B es una ampliación condicionada a la validación efectiva de sus fuentes.

---

# 5. EXPERIENCIA DE USUARIO

La aplicación debe ser intuitiva, rápida, profesional, accesible y visualmente cuidada.

No quiero un diseño académico genérico ni un conjunto de formularios sin personalidad.

Debe transmitir confianza y claridad, sin parecer una página de reservas oficial ni utilizar marcas ajenas de forma engañosa.

## 5.1. Página principal

Incluye:

* Identidad visual HotelScout.
* Título principal.
* Descripción breve del servicio.
* Formulario de búsqueda.
* Explicación de su funcionamiento.
* Aviso discreto sobre la verificación de precios.
* Acceso a búsquedas recientes, si existen.

Utiliza una interfaz responsive que funcione correctamente en escritorio y móvil.

## 5.2. Formulario de búsqueda

Debe permitir introducir:

**Destino**

* País.
* Ciudad o localidad.
* Región, cuando resulte necesaria.
* Punto de referencia específico.

**Fechas**

* Check-in.
* Check-out.

**Ocupación**

* Número de adultos.
* Número de niños, cuando la fuente lo permita.
* Edades de los niños, si son necesarias.
* Número de habitaciones.

**Ubicación**

* Tipo de lugar: estación, aeropuerto, centro urbano, dirección u otro punto.
* Selección concreta del lugar.
* Radio máximo.

**Presupuesto**

* Importe máximo.
* Divisa.
* Preferencia de precio por noche o total.

**Preferencias opcionales**

* Cancelación gratuita.
* Desayuno.
* Tipo de alojamiento.
* Valoración mínima, cuando existan datos verificables.
* Baño privado.
* Otras características realmente disponibles en las fuentes.

No muestres filtros que no tengan efecto real.

## 5.3. Validaciones

Impide:

* Fechas de salida anteriores o iguales a la entrada.
* Fechas de entrada pasadas.
* Ocupación inferior a una persona.
* Número de habitaciones inválido.
* Distancias negativas.
* Presupuestos negativos.
* Consultas vacías.
* Fechas fuera del rango admitido por un proveedor.

Ten en cuenta la zona horaria del destino cuando resulte pertinente.

Trata las fechas de alojamiento como fechas de calendario, evitando desplazamientos causados por conversiones UTC.

Muestra mensajes de validación específicos y comprensibles.

---

# 6. GEOLOCALIZACIÓN Y PROXIMIDAD

Implementa un servicio geográfico desacoplado de la interfaz.

Debe resolver lugares introducidos por el usuario y obtener coordenadas.

Utiliza fuentes basadas en OpenStreetMap cuando su licencia y condiciones lo permitan.

## 6.1. Geocodificación

Permite buscar:

* Países.
* Ciudades.
* Estaciones ferroviarias.
* Estaciones de autobuses.
* Aeropuertos.
* Direcciones.
* Puntos de interés.

Si hay varias coincidencias, pide al usuario que seleccione la ubicación correcta.

No elijas silenciosamente una estación de otra ciudad con un nombre parecido.

## 6.2. Condiciones de los servicios públicos

Investiga las políticas vigentes de Nominatim, Overpass y los servicios de mapas que utilices.

Respeta sus límites.

No implementes autocompletado intensivo contra un servidor público que no lo permita.

Utiliza caché, solicitudes controladas, identificación adecuada cuando corresponda y atribución visible.

No distribuyas automáticamente miles de peticiones desde múltiples navegadores contra servicios comunitarios.

Cuando una API pública no permita el patrón de uso requerido, busca una alternativa autorizada que respete el presupuesto.

## 6.3. Búsqueda de alojamientos

Identifica hoteles próximos al punto seleccionado.

Aplica un radio configurable.

Calcula distancias mediante una fórmula geodésica adecuada, como Haversine.

Considera el radio como distancia en línea recta.

No presentes esta distancia como recorrido peatonal.

## 6.4. Recorrido a pie

Diseña la arquitectura para incorporar posteriormente un motor de rutas peatonales.

Solo muestra distancias y tiempos andando cuando procedan de un cálculo real.

No conviertas automáticamente 800 metros en una cantidad inventada de minutos.

## 6.5. Calidad de datos geográficos

Ten en cuenta que OpenStreetMap puede contener:

* Alojamientos incompletos.
* Coordenadas incorrectas.
* Establecimientos duplicados.
* Nombres alternativos.
* Lugares cerrados.
* Estaciones sin información suficiente.

No trates sus datos como inventario hotelero comercial actualizado.

Diferencia los alojamientos localizados de aquellos cuya disponibilidad haya sido verificada.

---

# 7. MOTOR DE OFERTAS HOTELERAS

Diseña el motor mediante adaptadores de proveedores.

La interfaz nunca debe depender directamente del contrato particular de Booking, Expedia u otra API.

Crea un modelo interno normalizado.

Ejemplo conceptual:

```ts
interface Hotel {
  id: string;
  source: string;
  sourceHotelId?: string;

  name: string;
  latitude: number;
  longitude: number;

  address?: string;
  city?: string;
  country?: string;

  distanceMeters?: number;

  rating?: number;
  reviewCount?: number;

  amenities?: string[];

  websiteUrl?: string;

  offers: HotelOffer[];
}
```

```ts
interface HotelOffer {
  id: string;
  provider: string;

  checkIn: string;
  checkOut: string;

  adults: number;
  children?: number;
  rooms: number;

  currency: string;

  totalPrice?: number;
  nightlyAverage?: number;

  taxesIncluded?: boolean;
  mandatoryFeesIncluded?: boolean;

  refundable?: boolean;
  breakfastIncluded?: boolean;

  available?: boolean;

  bookingUrl?: string;

  verifiedAt?: string;

  verificationStatus:
    | "verified"
    | "unverified"
    | "expired";

  dataSource: string;
}
```

Adapta estos tipos según las necesidades reales. No conviertas todos los campos opcionales en información aparentemente disponible.

## 7.1. Disponibilidad

Consulta la disponibilidad exacta por:

* Fecha de entrada.
* Fecha de salida.
* Número de huéspedes.
* Edades de niños, si corresponde.
* Número de habitaciones.

No consideres disponible un alojamiento por el mero hecho de existir en un mapa.

## 7.2. Comparación de precios

Cuando existan ofertas verificadas, compara utilizando el coste total de la estancia.

Incluye impuestos y tasas obligatorias conocidos.

Si hay cargos cuyo importe no puede verificarse, indícalo.

Diferencia:

* Precio total.
* Precio medio por noche.
* Divisa.
* Tasas incluidas.
* Tasas pendientes de confirmar.
* Condiciones de reserva.

No compares importes expresados en distintas divisas sin una conversión explícita mediante una fuente de tipos de cambio identificada.

Si no existe conversión fiable, separa los resultados por divisa.

## 7.3. Actualización

Registra cuándo se consultó cada oferta.

No presentes datos de caché caducados como precios actuales.

Utiliza una política de vigencia por proveedor, respetando sus condiciones.

El precio final siempre deberá confirmarse en la plataforma de reserva.

## 7.4. Duplicados

Un mismo hotel puede aparecer en varios proveedores.

Diseña un sistema de identificación que tenga en cuenta:

* Identificadores oficiales.
* Nombre normalizado.
* Dirección.
* Coordenadas.
* Distancia entre coordenadas.
* Información adicional.

No fusiones establecimientos únicamente porque sus nombres sean parecidos.

Conserva la procedencia de cada oferta.

No atribuyas a un proveedor las tarifas de otro.

## 7.5. Ordenación

Ofrece al menos:

* Precio total ascendente.
* Precio medio por noche.
* Distancia ascendente.
* Valoración descendente, si existen datos.
* Relación entre precio y distancia, como opción explícita.

Los criterios de ordenación deben ser claros.

No crees una clasificación opaca que afirme cuál es el mejor hotel para cualquier persona.

---

# 8. ENLACES A LAS PLATAFORMAS

La aplicación no gestionará reservas.

Cada resultado deberá permitir abrir el proveedor original.

## 8.1. Prioridad

Utiliza enlaces de reserva oficiales cuando un proveedor los facilite.

Cuando no existan, utiliza enlaces de búsqueda admitidos por la plataforma.

Diferencia visualmente:

* Ver oferta.
* Consultar disponibilidad.
* Buscar este alojamiento.

No llames «Reservar por 70 €» a un enlace que simplemente abre una búsqueda genérica.

## 8.2. Validación de enlaces

Comprueba que:

* El dominio es el esperado.
* El enlace utiliza HTTPS.
* Los parámetros están correctamente codificados.
* La plataforma permite esos parámetros.
* Las fechas y huéspedes se conservan cuando sea posible.
* No contiene credenciales.
* No permite redirecciones arbitrarias hacia destinos inseguros.

Si un enlace no puede construirse de forma fiable, utiliza una alternativa documentada y explica su alcance.

Abre los enlaces externos con las medidas de seguridad correspondientes.

---

# 9. DISEÑO DE LA PÁGINA DE RESULTADOS

Implementa una página de resultados completa.

## 9.1. Información general

Muestra:

* Destino.
* Fechas.
* Ocupación.
* Punto de referencia.
* Radio aplicado.
* Número de alojamientos localizados.
* Número de ofertas verificadas, cuando existan.

No mezcles hoteles localizados con ofertas disponibles confirmadas en un único contador ambiguo.

## 9.2. Tarjetas de hoteles

Cada tarjeta debe incluir, cuando existan datos:

* Nombre.
* Ubicación.
* Distancia.
* Valoración y número de reseñas.
* Características.
* Precio total.
* Precio por noche.
* Condiciones relevantes.
* Fuente.
* Fecha de verificación.
* Botón para abrir la oferta.

Si no existe precio real, muestra «Consultar precio».

Si no existe valoración, no inventes estrellas.

Si hay fotografía, utiliza únicamente imágenes autorizadas para ese uso y respeta sus condiciones de atribución.

No dependas de imágenes aleatorias que puedan mostrar otro establecimiento.

## 9.3. Mapa

Muestra un mapa con:

* Punto de referencia.
* Hoteles localizados.
* Radio de búsqueda.
* Marcadores seleccionables.

Sincroniza, cuando resulte práctico, la selección de una tarjeta con su marcador.

Evita bloquear la interfaz al mostrar muchos resultados.

## 9.4. Estados especiales

Implementa pantallas o mensajes para:

* Cargando.
* Sin coincidencias.
* Error de proveedor.
* Error geográfico.
* Sin precios verificados.
* Búsqueda parcial.
* Sin conexión.
* Datos caducados.

Ofrece acciones de recuperación.

No mantengas un spinner indefinidamente.

---

# 10. FAVORITOS E HISTORIAL

Implementa almacenamiento local.

El usuario podrá:

* Guardar hoteles favoritos.
* Consultar búsquedas recientes.
* Recuperar preferencias.
* Eliminar registros.
* Borrar sus datos locales.

No es necesaria una cuenta.

Evita guardar innecesariamente datos personales.

Si se guardan precios anteriores, identifícalos como históricos y no actuales.

No implementes alertas de cambios de precio sin disponer de una fuente que permita comprobarlos de forma periódica y dentro del presupuesto.

---

# 11. PWA Y DISTRIBUCIÓN

Configura una PWA funcional.

Incluye:

* Web App Manifest.
* Iconos adecuados.
* Nombre y descripción.
* Configuración de instalación compatible.
* Service Worker, si procede.
* Estrategia de caché.
* Página o estado offline.
* Actualizaciones controladas.

La aplicación debe poder abrirse desde una URL.

La instalación debe ser opcional.

Una funcionalidad que requiere Internet no debe aparentar estar operativa cuando el dispositivo está desconectado.

En modo offline se pueden mostrar preferencias o favoritos locales, pero no presentarlos como disponibilidad actual.

No cachees respuestas hoteleras sensibles o de vigencia limitada de forma indiscriminada.

---

# 12. SEGURIDAD Y PRIVACIDAD

Aplica buenas prácticas de seguridad desde el inicio.

Incluye:

* Validación de entradas.
* Validación de respuestas externas.
* Protección de credenciales.
* Gestión segura de variables de entorno.
* Control de solicitudes.
* Limitación de reintentos.
* Timeouts.
* Protección frente a redirecciones maliciosas.
* Dependencias actualizadas.
* Tratamiento seguro de errores.
* Ausencia de secretos en logs.

Si implementas un proxy, no debe permitir que el usuario solicite URLs arbitrarias.

No introduzcas claves, tokens o contraseñas en el repositorio.

Crea un `.env.example` sin valores secretos.

Añade los archivos necesarios al `.gitignore`.

Utiliza las cabeceras de seguridad adecuadas cuando sean compatibles con el alojamiento.

No incorpores analítica invasiva, rastreadores o cookies innecesarias.

Documenta las condiciones de uso de las fuentes externas y la información necesaria para una política de privacidad proporcionada al alcance real de la aplicación.

---

# 13. CALIDAD, RENDIMIENTO Y ACCESIBILIDAD

## 13.1. Rendimiento

Optimiza:

* Tamaño del bundle.
* Carga inicial.
* Renderizado de tarjetas.
* Consultas repetidas.
* Visualización del mapa.
* Gestión de estados.
* Consumo de API.
* Carga de imágenes autorizadas.

Utiliza carga diferida cuando tenga sentido.

Evita realizar una petición externa por cada pulsación del usuario.

Controla la concurrencia para respetar los límites de los proveedores.

## 13.2. Accesibilidad

Aplica las WCAG 2.2 AA en la medida razonablemente alcanzable.

Incluye:

* Navegación por teclado.
* Etiquetas correctamente asociadas.
* Contraste suficiente.
* Foco visible.
* Mensajes de error accesibles.
* Estados de carga comprensibles.
* Diseño adaptable.
* Respeto a preferencias de movimiento reducido.

## 13.3. Compatibilidad

Prueba los principales navegadores modernos.

Prioriza:

* Chrome.
* Edge.
* Firefox.
* Safari.

Comprueba el funcionamiento en escritorio y móvil.

---

# 14. ARQUITECTURA DEL REPOSITORIO

Organiza el proyecto de forma modular.

Estructura de referencia:

```text
hotelscout/
├── public/
│   ├── icons/
│   └── manifest.webmanifest
│
├── src/
│   ├── app/
│   ├── components/
│   │   ├── common/
│   │   ├── search/
│   │   ├── hotels/
│   │   └── maps/
│   │
│   ├── pages/
│   ├── features/
│   │   ├── search/
│   │   ├── hotels/
│   │   ├── favorites/
│   │   └── history/
│   │
│   ├── services/
│   │   ├── geo/
│   │   ├── providers/
│   │   └── search/
│   │
│   ├── hooks/
│   ├── types/
│   ├── schemas/
│   ├── utils/
│   └── styles/
│
├── functions/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── LICENSE
```

Esta estructura es orientativa.

Simplifícala si la arquitectura final no necesita determinadas capas.

No generes carpetas vacías únicamente para reproducir el esquema.

---

# 15. ESTRATEGIA DE PRUEBAS

No declares el proyecto terminado porque compile.

Debes demostrar que sus funcionalidades principales funcionan.

## 15.1. Pruebas unitarias

Comprueba:

* Fechas.
* Ocupación.
* Presupuestos.
* Cálculos de distancia.
* Conversión de importes.
* Comparación de precios.
* Ordenación.
* Filtros.
* Normalización de datos.
* Eliminación de duplicados.
* Validación de URLs.

## 15.2. Pruebas de integración

Utiliza fixtures y mocks para reproducir:

* Respuestas correctas.
* Respuestas incompletas.
* Errores 401.
* Errores 403.
* Errores 429.
* Errores 500.
* Timeouts.
* Ofertas caducadas.
* Hoteles sin coordenadas.
* Proveedores sin disponibilidad.

Las pruebas con mocks no sustituyen a una comprobación real de las integraciones.

## 15.3. Pruebas end-to-end

Automatiza el flujo completo:

1. Abrir la aplicación.
2. Introducir destino.
3. Seleccionar fechas.
4. Seleccionar ocupación.
5. Elegir punto de referencia.
6. Configurar radio.
7. Ejecutar búsqueda.
8. Aplicar filtros.
9. Cambiar ordenación.
10. Consultar mapa.
11. Abrir un resultado.
12. Guardar un favorito.
13. Recuperar una búsqueda.

Prueba también estados de error y ausencia de resultados.

## 15.4. Verificación real

Cuando exista acceso a un proveedor de producción, realiza búsquedas controladas y contrasta los resultados con su web original.

Comprueba:

* Identidad del hotel.
* Fechas.
* Ocupación.
* Divisa.
* Precio.
* Disponibilidad.
* Condiciones.
* Enlace.

Registra discrepancias.

Si el precio cambia entre la consulta y la web de reserva, no ocultes esta posibilidad.

## 15.5. Resultado de QA

Genera:

`docs/qa-report.md`

Incluye:

* Pruebas ejecutadas.
* Pruebas superadas.
* Pruebas fallidas.
* Problemas pendientes.
* Integraciones verificadas.
* Integraciones no verificadas.
* Limitaciones del entorno.

No afirmes que una prueba ha pasado si no la has ejecutado.

---

# 16. DOCUMENTACIÓN

Genera un README profesional que contenga:

* Descripción del proyecto.
* Objetivo.
* Funcionalidades.
* Limitaciones.
* Tecnologías.
* Arquitectura.
* Requisitos de desarrollo.
* Instalación para desarrolladores.
* Variables de entorno.
* Scripts.
* Ejecución de pruebas.
* Despliegue.
* Uso para el usuario final.
* Proveedores utilizados.
* Condiciones de uso.
* Licencia.
* Problemas conocidos.

Crea además:

```text
docs/
├── architecture.md
├── provider-research.md
├── implementation-plan.md
├── deployment.md
├── qa-report.md
├── limitations.md
└── decisions.md
```

Documenta cualquier cambio importante respecto a esta especificación.

---

# 17. DESPLIEGUE GRATUITO

Prepara la aplicación para Cloudflare Pages u otra alternativa gratuita apropiada.

Comprueba:

* Que el plan gratuito sigue disponible.
* Que no requiere introducir tarjeta.
* Que permite publicar el frontend.
* Que admite las funciones backend necesarias, si existen.
* Que sus cuotas son suficientes para el uso previsto.
* Que no genera cargos automáticos.
* Que ofrece HTTPS.
* Que permite utilizar un subdominio gratuito.

No asumas que puedes realizar un despliegue sin credenciales o permisos.

Si no tienes acceso a las cuentas necesarias, deja preparada la configuración y documenta los pasos de publicación.

No afirmes que la web está publicada sin comprobar su URL.

---

# 18. PLAN DE EJECUCIÓN OBLIGATORIO

No intentes resolver todos los problemas construyendo una interfaz bonita desde el primer momento.

Sigue este orden.

## Fase 1: análisis y viabilidad

1. Inspecciona el directorio de trabajo.
2. Identifica el entorno disponible.
3. Investiga los proveedores.
4. Verifica límites gratuitos.
5. Define la arquitectura.
6. Identifica riesgos.
7. Redacta el plan.

Entrega interna:

`docs/implementation-plan.md`

Si no hay acceso a una API hotelera de producción, registra el bloqueo y continúa con el modo geográfico asistido, sin inventar tarifas.

## Fase 2: infraestructura

1. Inicializa el proyecto.
2. Configura TypeScript estricto.
3. Configura Vite.
4. Configura estilos.
5. Configura rutas y estructura.
6. Configura linting.
7. Configura pruebas.
8. Configura Git.
9. Prepara variables de entorno.

Verifica que el proyecto puede compilar.

## Fase 3: motor geográfico

Implementa:

* Selección del destino.
* Resolución del punto de referencia.
* Búsqueda geográfica.
* Cálculo de distancias.
* Normalización.
* Ordenación por proximidad.
* Gestión de errores.

Verifica el resultado con ubicaciones conocidas.

## Fase 4: motor de proveedores

Implementa los adaptadores de las fuentes validadas.

No utilices endpoints inventados.

Respeta condiciones y cuotas.

Permite funcionar parcialmente si un proveedor falla.

## Fase 5: interfaz

Implementa:

* Página principal.
* Formulario.
* Resultados.
* Filtros.
* Ordenación.
* Tarjetas.
* Mapa.
* Enlaces.
* Favoritos.
* Historial.
* Estados de error.

## Fase 6: PWA y optimización

Configura la distribución y optimiza el rendimiento.

## Fase 7: QA

Ejecuta pruebas unitarias, de integración y end-to-end.

Corrige los errores detectados.

Repite las pruebas necesarias.

## Fase 8: preparación de entrega

Genera documentación y configuración de despliegue.

Deja el proyecto en un estado reproducible.

---

# 19. CRITERIOS DE ACEPTACIÓN

El proyecto únicamente podrá considerarse funcional cuando se cumplan los criterios siguientes.

### Aplicación

* Arranca correctamente.
* Compila sin errores.
* Se puede abrir desde un navegador.
* Es responsive.
* Dispone de navegación funcional.
* No requiere herramientas de desarrollo para el usuario final.

### Búsqueda geográfica

* Resuelve destinos válidos.
* Permite seleccionar el punto de referencia.
* Calcula distancias correctamente.
* Aplica el radio seleccionado.
* Muestra alojamientos geográficos reales cuando la fuente dispone de ellos.
* Gestiona búsquedas sin coincidencias.

### Precios

* No inventa tarifas.
* No inventa disponibilidad.
* Identifica las ofertas verificadas.
* Muestra fechas y ocupación correctas.
* Respeta la divisa.
* Diferencia costes totales y precios por noche.
* No afirma haber comparado proveedores no conectados.

### Enlaces

* Utiliza enlaces autorizados.
* Evita URLs maliciosas.
* Distingue ofertas directas de búsquedas externas.
* Permite acceder al proveedor original.

### Calidad

* Las pruebas implementadas se ejecutan.
* Los errores conocidos están documentados.
* Los estados de fallo son comprensibles.
* No existen secretos en el código público.
* No existen dependencias de pago obligatorias.

### Distribución

* Existe una build de producción.
* La configuración de despliegue está preparada.
* La instalación PWA funciona donde es compatible.
* La documentación permite reproducir el proyecto.

El Modo B tendrá criterios adicionales que solo podrán marcarse como superados cuando existan pruebas reales con proveedores autorizados.

---

# 20. INSTRUCCIONES PARA TRABAJAR EN CLAUDE CODE

Trabaja de forma autónoma y disciplinada.

No te limites a explicar cómo debería hacerse: implementa los archivos.

Antes de modificar código existente, inspecciónalo.

No sobrescribas archivos del usuario sin necesidad.

Utiliza las herramientas disponibles para:

* Crear archivos.
* Editar código.
* Instalar dependencias.
* Ejecutar comandos.
* Compilar.
* Ejecutar pruebas.
* Inspeccionar errores.
* Corregir fallos.

No necesitas solicitar aprobación por cada decisión técnica menor.

Sin embargo, solicita intervención cuando resulte imprescindible para:

* Autorizar el acceso a una cuenta.
* Obtener credenciales.
* Aceptar condiciones comerciales.
* Realizar una acción que implique gasto.
* Publicar recursos en servicios externos cuando requieran autorización.

Nunca presupongas que puedes introducir una tarjeta bancaria o contratar servicios.

Si una herramienta no está disponible, explica la limitación y realiza el resto del trabajo posible.

Si el entorno no dispone de Internet, desarrolla las partes independientes y deja identificadas las verificaciones externas pendientes.

No sustituyas pruebas reales por afirmaciones de éxito.

No declares terminado algo que no puedes comprobar.

---

# 21. GESTIÓN DEL CONTEXTO Y CONTINUIDAD

El proyecto puede requerir varias sesiones de desarrollo.

Mantén actualizado:

`docs/PROJECT_STATUS.md`

Debe contener:

* Objetivo.
* Arquitectura actual.
* Fase activa.
* Tareas completadas.
* Tareas pendientes.
* Bloqueos.
* Errores conocidos.
* Comandos de ejecución.
* Resultados de las últimas pruebas.
* Próximo paso recomendado.

Actualízalo al completar cada fase importante.

Crea también un archivo `CLAUDE.md` con las instrucciones permanentes del repositorio.

Su contenido deberá reflejar los principios fundamentales de este prompt, especialmente:

* Coste cero.
* Datos reales.
* Arquitectura modular.
* Ausencia de credenciales públicas.
* Respeto a proveedores.
* Pruebas obligatorias.
* Prohibición de resultados inventados.

Si el contexto de una sesión se agota, la siguiente debe poder continuar leyendo estos documentos sin reconstruir el proyecto desde cero.

---

# 22. RESULTADO FINAL ESPERADO

Al finalizar, entrégame:

1. Código fuente completo.
2. Aplicación compilable.
3. Configuración de despliegue.
4. Documentación técnica.
5. Manual básico de uso.
6. Informe de pruebas.
7. Lista de integraciones reales.
8. Lista de funcionalidades limitadas.
9. Informe de costes y cuotas gratuitas.
10. Instrucciones para compartir la aplicación con mi amigo.

Explica exactamente qué puede hacer el producto.

Diferencia lo implementado de lo simulado, pendiente o condicionado.

No declares completado el comparador de ofertas si únicamente has construido un buscador geográfico.

No afirmes que el producto es gratuito en producción si depende de un servicio de pago.

No afirmes que funciona sin errores si no has podido ejecutar las pruebas necesarias.

---

# 23. COMIENZA AHORA

Empieza inspeccionando el entorno y realizando la Fase 1.

Investiga primero la viabilidad real de las fuentes gratuitas y define la arquitectura definitiva.

Después implementa el proyecto siguiendo las fases anteriores, ejecutando pruebas y corrigiendo los problemas detectados.

No te detengas tras entregar un plan si el entorno permite continuar trabajando.

Avanza hasta conseguir el producto funcional más completo posible dentro de las restricciones.

Prioriza siempre la calidad y la veracidad de los datos sobre la cantidad de funcionalidades.

**El objetivo final es que una persona pueda abrir HotelScout, buscar alojamiento cerca del lugar que necesita y acceder a ofertas o búsquedas reales sin conocimientos técnicos y sin pagar por utilizar nuestra aplicación.**
