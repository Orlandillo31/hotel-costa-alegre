/**
 * ============================================================
 *  VILLAS CANGREJO — Aplicación Express (sin arrancar)
 * ============================================================
 *  Define middlewares, seguridad y rutas. server.js la arranca después de
 *  conectar la base de datos; las pruebas automáticas (test/) la usan
 *  directamente con una base en memoria.
 *
 *  Seguridad (OWASP):
 *   • helmet: cabeceras seguras + CSP estricta (solo scripts propios y del CDN).
 *   • Sin CORS: la API solo se usa desde este mismo sitio.
 *   • Límite de 10 kB por petición y rate limiting global / por ruta.
 *   • Express 5: un error dentro de una ruta async llega al manejador de
 *     errores en vez de tumbar el proceso.
 *   • Los errores internos no revelan detalles al cliente.
 * ============================================================
 */
const express = require('express');
const helmet  = require('helmet');
const path    = require('path');

const { limiterGlobal } = require('./utils/seguridad');

const app = express();

// Detrás del proxy de Render: confiar en 1 salto para conocer la IP real
// del visitante (la usa el rate limiting).
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", 'https://cdn.jsdelivr.net'],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'https://images.unsplash.com'],
      mediaSrc:   ["'self'", 'https://www.soundhelix.com'],
      connectSrc: ["'self'"],
      frameSrc:   ["'none'"],
      objectSrc:  ["'none'"],
      baseUri:    ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]     // nadie puede incrustar el sitio (anti-clickjacking)
    }
  },
  crossOriginEmbedderPolicy: false,  // permite las imágenes externas (Unsplash)
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

app.use(express.json({ limit: '10kb' }));
app.use((req, _res, next) => { if (req.body === undefined) req.body = {}; next(); });
app.use(limiterGlobal);

// Sitio estático (HTML, CSS, JS, imágenes)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Rutas REST
app.use('/api/auth',          require('./routes/auth.routes'));
app.use('/api/reservaciones', require('./routes/reservaciones.routes'));
app.use('/api/clientes',      require('./routes/clientes.routes'));
app.use('/api/contabilidad',  require('./routes/contabilidad.routes'));
app.use('/api/resenas',       require('./routes/resenas.routes'));

// 404 para rutas /api desconocidas
app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint no encontrado' }));

// Manejador de errores centralizado: JSON mal formado → 400, demasiado
// grande → 413; cualquier otro error → 500 genérico (el detalle solo va al log).
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('Error no controlado:', err);
  const mensajes = { 400: 'Petición inválida.', 413: 'La petición es demasiado grande.' };
  res.status(status).json({ error: mensajes[status] || 'Error interno del servidor' });
});

module.exports = app;
