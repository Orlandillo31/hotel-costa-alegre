/**
 * utils/mailer.js — Envío de correos.
 *
 * Soporta dos vías (en este orden de prioridad):
 *
 *  1) BREVO (API HTTPS) — recomendado en Render, cuyo plan Free bloquea
 *     las conexiones SMTP salientes. Variables:
 *       BREVO_API_KEY   clave de https://app.brevo.com (gratis, 300/día)
 *       EMAIL_FROM      remitente, ej. "Villas Cangrejo <correo@gmail.com>"
 *       (el remitente debe estar verificado en Brevo)
 *
 *  2) SMTP con nodemailer (Gmail + contraseña de aplicación) — funciona
 *     en local y en hostings que permiten SMTP. Variables:
 *       EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
 *
 *  Sin credenciales → modo DEV: imprime el correo en consola.
 */
const nodemailer = require('nodemailer');

let transporter = null;
let usaBrevo    = false;

function init() {
  if (process.env.BREVO_API_KEY) {
    usaBrevo = true;
    console.log('✉  Correo por API de Brevo (HTTPS).');
    return;
  }
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('✉  Correo en modo DEV (sin SMTP ni Brevo). Define credenciales para enviar correos reales.');
    return;
  }
  const port = Number(EMAIL_PORT) || 465;
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,       // 465 = SSL, 587 = STARTTLS
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    // Timeouts cortos: si el SMTP no responde, el envío falla rápido en
    // lugar de colgar la petición HTTP que lo disparó (p. ej. confirmar
    // una reserva desde el panel admin).
    connectionTimeout: 10000,
    greetingTimeout:   10000,
    socketTimeout:     20000,
    dnsTimeout:        10000
  });
  console.log('✉  Transporte de correo configurado (' + (EMAIL_HOST || 'smtp.gmail.com') + ')');
}

// Separa "Nombre <correo@x.com>" en sus partes para la API de Brevo.
function parsearRemitente() {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || '';
  const m = from.match(/^(.*)<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim().replace(/^"|"$/g, ''), email: m[2].trim() };
  return { name: 'Villas Cangrejo', email: from.trim() };
}

async function enviarPorBrevo({ to, subject, text, html }) {
  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sender: parsearRemitente(),
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html || undefined
    }),
    signal: AbortSignal.timeout(20000)
  });
  if (!resp.ok) {
    const cuerpo = await resp.text().catch(() => '');
    throw new Error('Brevo respondió ' + resp.status + ': ' + cuerpo.slice(0, 200));
  }
  return resp.json();
}

async function enviar({ to, subject, text, html }) {
  if (usaBrevo) return enviarPorBrevo({ to, subject, text, html });

  if (!transporter) {
    console.log('────────── [CORREO MODO DEV] ──────────');
    console.log('Para:', to);
    console.log('Asunto:', subject);
    console.log(text || html);
    console.log('───────────────────────────────────────');
    return { dev: true };
  }
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  return transporter.sendMail({ from, to, subject, text, html });
}

const configurado = () => usaBrevo || !!transporter;

module.exports = { init, enviar, configurado };
