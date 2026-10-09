/**
 * utils/seguridad.js — Limitadores de peticiones (rate limiting).
 * Mitiga ataques de fuerza bruta y abuso de la API (OWASP A07/A04).
 */
const rateLimit = require('express-rate-limit');

// Limitador general para toda la API.
const limiterGlobal = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutos
  max: 600,                   // 600 peticiones por IP por ventana
  standardHeaders: true,
  legacyHeaders: false
});

// Limitador estricto para endpoints sensibles de autenticación.
const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,                    // 20 intentos por IP por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos desde esta red. Espera unos minutos e inténtalo de nuevo.' }
});

// Limitador para crear reservaciones (público): frena el envío masivo de
// solicitudes falsas que llenarían la base de datos y el panel del admin.
const limiterReservas = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hora
  max: 15,                    // 15 solicitudes por IP por hora
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes desde esta red. Espera un rato e inténtalo de nuevo.' }
});

module.exports = { limiterGlobal, limiterAuth, limiterReservas };
