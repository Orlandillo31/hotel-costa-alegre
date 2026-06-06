/**
 * auth.js — Sesiones en memoria con expiración + middleware de autorización.
 *
 * Cada login genera un token aleatorio (256 bits) que se asocia a la sesión.
 * Las sesiones expiran automáticamente (TTL) para reducir el riesgo de
 * secuestro de tokens. En un despliegue con varias instancias se migraría a
 * JWT o Redis; para este proyecto un Map en memoria es suficiente.
 */
const crypto = require('crypto');

const sesiones = new Map();          // token → { id, rol, nombre, email?, expira }
const TTL_MS   = 8 * 60 * 60 * 1000; // 8 horas

function crearSesion(datos) {
  const token = crypto.randomBytes(32).toString('hex');
  sesiones.set(token, { ...datos, expira: Date.now() + TTL_MS });
  return token;
}

function obtenerToken(req) {
  const auth = req.headers['authorization'] || '';
  return auth.replace(/^Bearer\s+/i, '');
}

function obtenerSesion(req) {
  const token  = obtenerToken(req);
  const sesion = sesiones.get(token);
  if (!sesion) return null;
  if (Date.now() > sesion.expira) {     // expiró → invalidar
    sesiones.delete(token);
    return null;
  }
  return sesion;
}

function eliminarSesion(req) {
  sesiones.delete(obtenerToken(req));
}

// Middleware: exige token válido y, opcionalmente, un rol concreto.
function requiereAuth(rolNecesario) {
  return (req, res, next) => {
    const sesion = obtenerSesion(req);
    if (!sesion)                                   return res.status(401).json({ error: 'No autenticado' });
    if (rolNecesario && sesion.rol !== rolNecesario) return res.status(403).json({ error: 'No autorizado' });
    req.sesion = sesion;
    next();
  };
}

module.exports = { crearSesion, obtenerToken, obtenerSesion, eliminarSesion, requiereAuth };
