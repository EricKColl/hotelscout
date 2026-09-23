# Despliegue y publicación — HotelScout

Estado: **preparado, NO desplegado.** Nada de esto se hace sin tu permiso expreso (crear cuentas, `git push` y publicar). Documentación de Cloudflare consultada el 2026-09-23: [Vite en Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/), [Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/), [límites de Pages](https://developers.cloudflare.com/pages/platform/limits/), [precios de Workers](https://developers.cloudflare.com/workers/platform/pricing/).

## Qué necesitas (todo gratuito, sin tarjeta según la documentación; ❓ el alta real no se ha comprobado)
1. Una cuenta de **GitHub** (github.com, gratis).
2. Una cuenta de **Cloudflare** (cloudflare.com, plan Free). **Si en algún momento te pide una tarjeta, para y avísame**: no la introduzcas.

## Pasos concretos (cuando me des permiso, te acompaño en cada uno)

### A. Subir el código a GitHub (yo lo hago cuando lo autorices)
1. Crea en GitHub un repositorio **privado** vacío llamado `hotelscout`.
2. Me das la URL del repositorio. Yo ejecuto `git remote add` y `git push` **solo con tu «sí»**.
3. GitHub te pedirá iniciar sesión en el navegador la primera vez: es normal; yo nunca veo tu contraseña.

### B. Publicar en Cloudflare Pages
1. Entra en dash.cloudflare.com → **Workers & Pages** → **Create application** → **Pages** → **Import an existing Git repository**.
2. Conecta GitHub y elige `hotelscout`.
3. Configuración de compilación:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - (La carpeta `functions/` en la raíz se detecta sola: es el proxy.)
4. Antes de guardar, en **Environment variables** añade `PROXY_CONTACT` = un email tuyo (o el enlace de un repositorio). Se incluye en el `User-Agent` hacia Nominatim/Overpass para que puedan contactarte si hiciera falta. No es un secreto, pero es tu dato: **decide tú cuál usar**.
5. **Save and Deploy.** Al terminar tendrás una dirección `https://<nombre>.pages.dev`.
6. Copia esa dirección y pásamela: **no doy la web por publicada hasta abrir la URL y ver que responde.**

### C. Comprobar que funciona (lo hago yo con tu URL)
- Abrir la web, buscar «Madrid Atocha» y ver alojamientos.
- Comprobar cabeceras de seguridad y que `/api/*` responde.
- Comprobar la instalación como app en móvil.

## Prueba de enlaces (D-004) — te lo pido a ti, es sencillo
1. Abre la app (en local: `npm run dev` y `http://localhost:5173`, o la URL de Cloudflare).
2. Busca «Madrid Atocha», elige la estación y pulsa **Buscar en Booking.com** en un alojamiento.
3. En la página de Booking comprueba: ¿aparece el nombre del alojamiento o su ciudad?, ¿las **fechas** y el **número de personas** son las que pusiste?
4. Cuéntame qué viste (o mándame una captura). Si Booking pierde fechas, el botón se retira o se cambia de texto.

## Compartirla con tu amigo
Le pasas la URL `https://<nombre>.pages.dev`. En el móvil: abrirla en Chrome/Safari → «Añadir a pantalla de inicio» / «Instalar». No necesita cuenta ni instalar nada más.

## Costes y cuotas (Cloudflare Free, 2026-09-23)
- Archivos estáticos: gratis e ilimitados.
- Funciones (`/api/*`): 100 000 peticiones/día; **al superarlas fallan, no se cobra** en el plan Free. No actives ningún plan de pago.
- 500 compilaciones/mes, 20 000 archivos, 25 MiB por archivo.
- ❓ Cloudflare podría recomendar «Workers Static Assets» en lugar de Pages: no se pudo confirmar en la documentación consultada; Pages sigue documentado y disponible hoy.

## Desarrollo local (para quien programe)
```bash
npm install
npm run dev          # http://localhost:5173 (incluye /api con caché en memoria)
npm run build        # compilación de producción en dist/
npm test             # unitarias e integración
npm run test:e2e     # end-to-end (usa Microsoft Edge instalado)
```
Variables de entorno: ver `.env.example` (solo `PROXY_CONTACT`). Nunca uses `VITE_*` para secretos.
