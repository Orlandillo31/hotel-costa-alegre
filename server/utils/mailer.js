/**
 * utils/mailer.js — Envío de correos con nodemailer.
 *
 * Se configura con variables de entorno (EMAIL_USER / EMAIL_PASS, etc.).
 * Para Gmail se recomienda una "App Password":
 *   https://myaccount.google.com/apppasswords
 *
 * Si no hay credenciales configuradas, funciona en modo DEV: registra el
 * correo en consola en lugar de enviarlo (útil para desarrollo local).
 */
const nodemailer = require('nodemailer');

let transporter = null;

function init() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('✉  Correo en modo DEV (sin SMTP). Define EMAIL_USER/EMAIL_PASS para enviar correos reales.');
    return;
  }
  const port = Number(EMAIL_PORT) || 465;
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,       // 465 = SSL, 587 = STARTTLS
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
  });
  console.log('✉  Transporte de correo configurado (' + (EMAIL_HOST || 'smtp.gmail.com') + ')');
}

async function enviar({ to, subject, text, html }) {
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

const configurado = () => !!transporter;

module.exports = { init, enviar, configurado };
