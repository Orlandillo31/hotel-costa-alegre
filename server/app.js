/**
 * ============================================================
 *  VILLAS CANGREJO — Servidor de la página (sin arrancar)
 * ============================================================
 *  La página es solo informativa: no hay base de datos, cuentas ni
 *  reservas en línea (el hotel las atiende por WhatsApp y teléfono).
 *  Este servidor únicamente entrega los archivos de public/ con
 *  cabeceras de seguridad. server.js lo arranca; las pruebas (test/)
 *  lo usan directamente.
 *
 *  Como todo es estático, la carpeta public/ también se puede publicar
 *  tal cual en un hosting estático (Render Static Site, Cloudflare Pages).
 * ============================================================
 */
const express = require('express');
const helmet  = require('helmet');
const path    = require('path');

const PUBLICO = path.join(__dirname, '..', 'public');

const app = express();
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
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

// Las páginas HTML se revisan en cada visita (así un cambio se ve de
// inmediato); CSS, JS e imágenes se guardan un día en el navegador.
app.use(express.static(PUBLICO, {
  maxAge: '1d',
  setHeaders: (res, archivo) => {
    if (archivo.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// Cualquier otra dirección: página no encontrada
app.use((_req, res) => res.status(404).sendFile(path.join(PUBLICO, '404.html')));

module.exports = app;
