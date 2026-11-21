// Vercel Serverless Function — recibe el formulario de contacto, lo valida en el servidor
// y lo envía por email con Resend. Las claves viven en variables de entorno de Vercel, nunca en el código.
//
// Variables de entorno (Vercel > Project > Settings > Environment Variables):
//   RESEND_API_KEY   clave de https://resend.com (obligatoria)
//   CONTACT_TO       email donde recibís las consultas (obligatoria)
//   CONTACT_FROM     remitente verificado en Resend, ej. "Gryd Web <web@tudominio.com>"
//                    (opcional; sin dominio propio usa onboarding@resend.dev)
//   ALLOWED_ORIGIN   ej. https://gryd-barrios.vercel.app (opcional, recomendado)

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const MIN_FILL_MS = 3000;            // un humano tarda más de 3 s en completar el formulario
const MAX_AGE_MS = 1000 * 60 * 60 * 6;

// Límite simple por IP (por instancia; frena ráfagas de un mismo origen)
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 5;
}

const clean = (v, max) =>
  String(v ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
  }

  const allowed = process.env.ALLOWED_ORIGIN;
  const origin = req.headers.origin;
  if (allowed && origin && origin !== allowed) {
    return res.status(403).json({ error: "Origen no permitido." });
  }

  if (!String(req.headers["content-type"] || "").includes("application/json")) {
    return res.status(415).json({ error: "Formato no soportado." });
  }

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "anon";
  if (rateLimited(ip)) {
    return res.status(429).json({ error: "Demasiados envíos seguidos. Probá en unos minutos." });
  }

  const body = typeof req.body === "object" && req.body ? req.body : {};

  // Honeypot: si viene completo es un bot. Respondemos OK para no darle pistas.
  if (clean(body.empresa_web, 200)) return res.status(200).json({ ok: true });

  // Trampa de tiempo
  const ts = Number(body.ts);
  const elapsed = Date.now() - ts;
  if (!Number.isFinite(ts) || elapsed < MIN_FILL_MS || elapsed > MAX_AGE_MS) {
    return res.status(400).json({ error: "No se pudo validar el envío. Recargá la página y probá de nuevo." });
  }

  const nombre = clean(body.nombre, 80);
  const email = clean(body.email, 120);
  const mensaje = clean(body.mensaje, 2000);

  if (nombre.length < 2) return res.status(400).json({ error: "Escribí tu nombre." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Revisá el email." });
  if (mensaje.length < 10) return res.status(400).json({ error: "Contame un poco más del proyecto." });
  if (body.acepto !== true) return res.status(400).json({ error: "Tenés que aceptar la Política de Privacidad." });
  if ((mensaje.match(/https?:\/\//g) || []).length > 3) {
    return res.status(400).json({ error: "El mensaje tiene demasiados enlaces." });
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  if (!key || !to) {
    console.error("Faltan RESEND_API_KEY o CONTACT_TO");
    return res.status(500).json({ error: "El formulario no está configurado. Escribime por WhatsApp." });
  }

  const html = `
    <h2>Nueva consulta desde la web</h2>
    <p><strong>Nombre:</strong> ${esc(nombre)}</p>
    <p><strong>Email:</strong> ${esc(email)}</p>
    <p><strong>Mensaje:</strong><br>${esc(mensaje).replace(/\n/g, "<br>")}</p>
    <p style="color:#888;font-size:12px">Aceptó la Política de Privacidad · ${new Date().toISOString()}</p>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM || "Gryd Web <onboarding@resend.dev>",
        to: [to],
        reply_to: email,
        subject: `Consulta web: ${nombre}`.slice(0, 120),
        html,
        text: `Nombre: ${nombre}\nEmail: ${email}\n\n${mensaje}`,
      }),
    });
    if (!r.ok) {
      console.error("Resend error", r.status, await r.text());
      return res.status(502).json({ error: "No se pudo enviar ahora. Probá de nuevo o escribime por WhatsApp." });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "No se pudo enviar ahora. Probá de nuevo o escribime por WhatsApp." });
  }
}
