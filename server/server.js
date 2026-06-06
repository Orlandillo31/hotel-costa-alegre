/**
 * ============================================================
 *  VILLAS CANGREJO — Punto de entrada del backend
 * ============================================================
 *  Express + MongoDB (mongoose). Sirve el sitio estático de /public,
 *  monta los routers /api/* y aplica medidas de seguridad (helmet,
 *  rate limiting, límites de payload) siguiendo guías OWASP/NIST.
 *
 *  Arranque:           npm install && npm start
 *  Variables de entorno (ver .env.example):
 *    PORT, MONGODB_URI, ADMIN_USER, ADMIN_PASS,
 *    EMAIL_USER, EMAIL_PASS, EMAIL_FROM, HOTEL_EMAIL, NODE_ENV
 * ============================================================
 */
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const path    = require('path');

const db     = require('./config/db');
const mailer = require('./utils/mailer');
const { limiterGlobal } = require('./utils/seguridad');

const app  = express();
const PORT = process.env.PORT || 3000;

// Detrás de un proxy (Render / túnel): confiar en 1 salto para obtener
// la IP real del cliente (necesario para el rate limiting).
app.set('trust proxy', 1);

// ------------------------------------------------------------
// Seguridad de cabeceras HTTP (helmet) con CSP a la medida de
// los recursos externos que usa el sitio.
// ------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", 'https://cdn.jsdelivr.net'],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'https://images.unsplash.com'],
      mediaSrc:   ["'self'", 'https://www.soundhelix.com'],
      frameSrc:   ['https://www.youtube.com'],
      connectSrc: ["'self'"],
      objectSrc:  ["'none'"],
      baseUri:    ["'self'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false   // permite incrustar recursos externos
}));

// ------------------------------------------------------------
// Middlewares generales
// ------------------------------------------------------------
app.use(cors());
app.use(express.json({ limit: '10kb' }));   // límite de payload anti-DoS
app.use(limiterGlobal);

// Sitio estático (HTML, CSS, JS) desde /public
app.use(express.static(path.join(__dirname, '..', 'public')));

// ------------------------------------------------------------
// Rutas REST
// ------------------------------------------------------------
app.use('/api/auth',          require('./routes/auth.routes'));
app.use('/api/reservaciones', require('./routes/reservaciones.routes'));
app.use('/api/clientes',      require('./routes/clientes.routes'));
app.use('/api/contabilidad',  require('./routes/contabilidad.routes'));

// 404 para rutas /api desconocidas
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint no encontrado' }));

// Manejador de errores centralizado
app.use((err, req, res, _next) => {
  console.error('Error no controlado:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ------------------------------------------------------------
// Arranque (conecta a la BD antes de aceptar peticiones)
// ------------------------------------------------------------
(async () => {
  try {
    mailer.init();
    await db.conectar();
    app.listen(PORT, () => {
      console.log('');
      console.log('🦀 Villas Cangrejo — servidor en marcha');
      console.log('   → http://localhost:' + PORT);
      console.log('');
    });
  } catch (err) {
    console.error('❌ No se pudo iniciar el servidor:', err.message);
    process.exit(1);
  }
})();
