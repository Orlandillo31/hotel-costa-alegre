/**
 * utils/entrada.js — Lectura segura de lo que envía el navegador.
 *
 * Nunca se confía en el TIPO de un campo: un atacante puede mandar un
 * objeto o un arreglo donde se espera texto (p. ej. {"usuario":{"$ne":null}}).
 * Antes eso hacía tronar el servidor completo; ahora cualquier valor que no
 * sea texto se trata como vacío y la ruta responde 400 normalmente.
 */
const mongoose = require('mongoose');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Campo de texto: recortado y con longitud máxima; si no es string → ''.
const texto = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Contraseñas: sin recortar espacios (son parte de la contraseña).
const clave = v => (typeof v === 'string' ? v : '');

// Correo en minúsculas (vacío si no es texto).
const correo = v => texto(v, 254).toLowerCase();

// router.param('id', validarId): un :id que no es un ObjectId válido
// responde 404 en vez de provocar un error de base de datos.
function validarId(req, res, next, id) {
  if (!mongoose.isValidObjectId(id)) return res.status(404).json({ error: 'No encontrado.' });
  next();
}

// Escapa texto del usuario antes de meterlo en HTML (correos).
const escHTML = s => String(s == null ? '' : s).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = { EMAIL_RE, texto, clave, correo, validarId, escHTML };
