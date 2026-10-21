/**
 * ============================================================
 *  VILLAS CANGREJO — Punto de entrada
 * ============================================================
 *  Arranca el servidor de la página (server/app.js).
 *
 *  Arranque:  npm install && npm start
 *  Variable de entorno opcional: PORT (en Render se define sola).
 * ============================================================
 */
const app = require('./app');

const PORT = process.env.PORT || 3000;

// Express 5 llama a esta función también cuando NO se pudo abrir el
// puerto (con el error como argumento): hay que revisarlo.
app.listen(PORT, (err) => {
  if (err) {
    console.error('❌ No se pudo abrir el puerto ' + PORT + ':', err.message);
    process.exit(1);
  }
  console.log('');
  console.log('🦀 Villas Cangrejo — servidor en marcha');
  console.log('   → http://localhost:' + PORT);
  console.log('');
});
