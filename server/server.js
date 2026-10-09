/**
 * ============================================================
 *  VILLAS CANGREJO — Punto de entrada del backend
 * ============================================================
 *  Conecta la base de datos y arranca la aplicación (server/app.js).
 *
 *  Arranque:           npm install && npm start
 *  Variables de entorno (ver .env.example):
 *    PORT, MONGODB_URI, ADMIN_USER, ADMIN_PASS, BREVO_API_KEY,
 *    EMAIL_USER, EMAIL_PASS, EMAIL_FROM, HOTEL_EMAIL, SITE_URL, NODE_ENV
 * ============================================================
 */
require('dotenv').config();

const app    = require('./app');
const db     = require('./config/db');
const mailer = require('./utils/mailer');

const PORT = process.env.PORT || 3000;

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
