/**
 * auth.routes.js — Autenticación y recuperación de contraseña.
 *   POST /api/auth/registro      Crear cuenta de cliente
 *   POST /api/auth/login         Login (cliente o admin según body.rol)
 *   POST /api/auth/logout        Cerrar sesión
 *   POST /api/auth/recuperar     Solicitar código de recuperación por email
 *   POST /api/auth/restablecer   Cambiar contraseña usando el código
 *
 * Medidas de seguridad:
 *   • Rate limiting estricto (limiterAuth).
 *   • Bloqueo de cuenta tras 5 intentos fallidos durante 15 min.
 *   • Mensajes genéricos para evitar enumeración de usuarios.
 *   • Códigos de recuperación hasheados y con expiración (15 min).
 *   • Política de contraseñas NIST 800-63B.
 */
const express = require('express');
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const router  = express.Router();

const Cliente = require('../models/Cliente');
const Admin   = require('../models/Admin');
const { BCRYPT_ROUNDS } = require('../config/db');
const { crearSesion, eliminarSesion, requiereAuth } = require('../auth');
const { validarPassword } = require('../utils/password');
const { limiterAuth } = require('../utils/seguridad');
const mailer = require('../utils/mailer');

const MAX_INTENTOS = 5;
const BLOQUEO_MS   = 15 * 60 * 1000;
const RESET_TTL_MS = 15 * 60 * 1000;
const EMAIL_RE     = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ----------------------------------------------------------------
// Registro de cliente
// ----------------------------------------------------------------
router.post('/registro', limiterAuth, async (req, res) => {
  const nombre   = (req.body.nombre   || '').trim();
  const email    = (req.body.email    || '').trim().toLowerCase();
  const telefono = (req.body.telefono || '').trim();
  const password = req.body.password  || '';

  if (!nombre || !email)          return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  if (!EMAIL_RE.test(email))      return res.status(400).json({ error: 'El correo electrónico no es válido.' });

  const errPass = validarPassword(password);
  if (errPass)                    return res.status(400).json({ error: errPass });

  if (await Cliente.findOne({ email })) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await Cliente.create({ nombre, email, telefono, passwordHash });

  res.json({ ok: true, mensaje: 'Cuenta creada con éxito.' });
});

// ----------------------------------------------------------------
// Login (cliente o admin)
// ----------------------------------------------------------------
router.post('/login', limiterAuth, async (req, res) => {
  const { password, rol } = req.body;
  const usuario = (req.body.usuario || '').trim();

  const doc = rol === 'admin'
    ? await Admin.findOne({ usuario })
    : await Cliente.findOne({ email: usuario.toLowerCase() });

  // Usuario inexistente → mensaje genérico (sin revelar si existe)
  if (!doc) return res.status(401).json({ error: 'Credenciales inválidas.' });

  // ¿Cuenta bloqueada temporalmente?
  if (doc.bloqueadoHasta && doc.bloqueadoHasta > new Date()) {
    const min = Math.ceil((doc.bloqueadoHasta - new Date()) / 60000);
    return res.status(429).json({
      error: `Cuenta bloqueada por seguridad. Intenta en ${min} min o recupera tu contraseña.`,
      bloqueado: true
    });
  }

  const ok = await bcrypt.compare(password || '', doc.passwordHash);

  if (!ok) {
    doc.intentosFallidos = (doc.intentosFallidos || 0) + 1;
    if (doc.intentosFallidos >= MAX_INTENTOS) {
      doc.bloqueadoHasta   = new Date(Date.now() + BLOQUEO_MS);
      doc.intentosFallidos = 0;
      await doc.save();
      return res.status(429).json({
        error: 'Demasiados intentos fallidos. Cuenta bloqueada 15 minutos. Puedes recuperar tu contraseña.',
        bloqueado: true
      });
    }
    await doc.save();
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  // Éxito → limpiar contadores de seguridad
  doc.intentosFallidos = 0;
  doc.bloqueadoHasta   = null;
  await doc.save();

  const datos = rol === 'admin'
    ? { id: doc._id.toString(), rol: 'admin',   nombre: doc.nombre }
    : { id: doc._id.toString(), rol: 'cliente', nombre: doc.nombre, email: doc.email };

  const token = crearSesion(datos);
  res.json({ ok: true, token, ...datos });
});

// ----------------------------------------------------------------
// Logout
// ----------------------------------------------------------------
router.post('/logout', requiereAuth(), (req, res) => {
  eliminarSesion(req);
  res.json({ ok: true });
});

// ----------------------------------------------------------------
// Recuperación: solicitar código por correo
// ----------------------------------------------------------------
router.post('/recuperar', limiterAuth, async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();

  // Respuesta SIEMPRE genérica para no revelar si el correo existe.
  const generica = { ok: true, mensaje: 'Si el correo está registrado, enviamos un código de recuperación.' };

  if (!EMAIL_RE.test(email)) return res.json(generica);

  const cliente = await Cliente.findOne({ email });
  if (!cliente) return res.json(generica);

  // Código numérico de 6 dígitos (criptográficamente aleatorio)
  const codigo = String(crypto.randomInt(100000, 1000000));
  cliente.resetCodeHash = await bcrypt.hash(codigo, BCRYPT_ROUNDS);
  cliente.resetExpira   = new Date(Date.now() + RESET_TTL_MS);
  cliente.resetIntentos = 0;
  await cliente.save();

  await mailer.enviar({
    to: email,
    subject: 'Código de recuperación — Villas Cangrejo',
    text: `Hola ${cliente.nombre},\n\nTu código de recuperación es: ${codigo}\n` +
          `Vence en 15 minutos. Si no solicitaste esto, ignora este mensaje.\n\n— Villas Cangrejo`,
    html: `<p>Hola <strong>${cliente.nombre}</strong>,</p>` +
          `<p>Tu código de recuperación es:</p>` +
          `<p style="font-size:1.8rem;letter-spacing:4px;font-weight:bold">${codigo}</p>` +
          `<p>Vence en 15 minutos. Si no solicitaste esto, ignora este mensaje.</p><p>— Villas Cangrejo</p>`
  });

  const resp = { ...generica };
  // Solo en desarrollo y sin SMTP real: devolver el código para poder probar.
  if (!mailer.configurado() && process.env.NODE_ENV !== 'production') {
    resp.codigoDev = codigo;
  }
  res.json(resp);
});

// ----------------------------------------------------------------
// Recuperación: restablecer contraseña con el código
// ----------------------------------------------------------------
router.post('/restablecer', limiterAuth, async (req, res) => {
  const email  = (req.body.email  || '').trim().toLowerCase();
  const codigo = (req.body.codigo || '').trim();
  const nueva  = req.body.nuevaPassword || '';

  const cliente = await Cliente.findOne({ email });
  if (!cliente || !cliente.resetCodeHash || !cliente.resetExpira) {
    return res.status(400).json({ error: 'Solicitud inválida o expirada. Pide un nuevo código.' });
  }
  if (cliente.resetExpira < new Date()) {
    cliente.resetCodeHash = null; cliente.resetExpira = null;
    await cliente.save();
    return res.status(400).json({ error: 'El código expiró. Pide uno nuevo.' });
  }
  if (cliente.resetIntentos >= MAX_INTENTOS) {
    cliente.resetCodeHash = null; cliente.resetExpira = null;
    await cliente.save();
    return res.status(429).json({ error: 'Demasiados intentos. Pide un nuevo código.' });
  }

  const codigoOk = await bcrypt.compare(codigo, cliente.resetCodeHash);
  if (!codigoOk) {
    cliente.resetIntentos += 1;
    await cliente.save();
    return res.status(400).json({ error: 'Código incorrecto.' });
  }

  const errPass = validarPassword(nueva);
  if (errPass) return res.status(400).json({ error: errPass });

  cliente.passwordHash    = await bcrypt.hash(nueva, BCRYPT_ROUNDS);
  cliente.resetCodeHash   = null;
  cliente.resetExpira     = null;
  cliente.resetIntentos   = 0;
  cliente.intentosFallidos = 0;
  cliente.bloqueadoHasta  = null;
  await cliente.save();

  res.json({ ok: true, mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
});

module.exports = router;
