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

module.exports = { limiterGlobal, limiterAuth };
