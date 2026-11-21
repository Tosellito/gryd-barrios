# Gryd — sitio de spots aéreos 3D

Sitio estático con una función serverless para el formulario. Pensado para **Vercel**.

## Estructura
- `index.html`: portada con el spot, el proceso, el caso y el formulario
- `privacidad.html`, `terminos.html`: páginas legales (Ley 25.326 / RGPD)
- `404.html`: página de error
- `api/contact.js`: recibe el formulario, lo valida en el servidor y lo manda por email (Resend)
- `vercel.json`: cabeceras de seguridad (CSP, anti-clickjacking, HSTS) y URLs limpias
- `robots.txt`, `sitemap.xml`, `favicon.svg`
- `.env.example`: variables que tenés que cargar en Vercel (nunca en el código)

## Publicar (10 minutos)
1. Creá una cuenta gratis en https://resend.com, generá una API key.
2. Subí esta carpeta a un repo nuevo de GitHub (por ejemplo `gryd-barrios`).
3. En Vercel: **Add New > Project**, importá el repo. Nombre del proyecto: `gryd-barrios`
   (así la URL queda `gryd-barrios.vercel.app`, que es la que figura en los metadatos).
4. En **Settings > Environment Variables** cargá:
   - `RESEND_API_KEY` = tu clave de Resend
   - `CONTACT_TO` = el email donde querés recibir las consultas
   - `ALLOWED_ORIGIN` = `https://gryd-barrios.vercel.app`
5. **Deploy**. Probá el formulario mandándote una consulta.

> Sin dominio propio, Resend solo deja enviar al email con el que te registraste en Resend.
> Usá ese mismo email en `CONTACT_TO`. Con dominio propio, verificalo en Resend y cargá `CONTACT_FROM`.

## Si cambiás la URL o comprás un dominio
Reemplazá `https://gryd-barrios.vercel.app` en: `index.html`, `privacidad.html`, `terminos.html`,
`robots.txt`, `sitemap.xml` y la variable `ALLOWED_ORIGIN`.

## Pendientes antes de lanzar
- **CUIT** en `terminos.html` (hay un comentario marcado) cuando termines el alta de monotributo.
- **Data Fiscal (F.960/D)**: generá el QR en ARCA y descomentá el bloque en el pie de `index.html`.
  Guardá la imagen como `assets/img/data-fiscal.jpg`.
- Si agregás Google Analytics: poné el ID en `assets/js/main.js` (`GA_ID`) y sumá
  `https://www.googletagmanager.com https://*.google-analytics.com` a `script-src`, `img-src` y `connect-src` del CSP en `vercel.json`.

## Después de publicar
- Dar de alta el sitio en Google Search Console y enviar el `sitemap.xml`.
- Probar la tarjeta para compartir: pegá el link en WhatsApp o en https://www.opengraph.xyz
