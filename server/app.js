/**
 * ============================================================
 *  VILLAS CANGREJO — Servidor local (sin arrancar)
 * ============================================================
 *  La página se publica en Cloudflare Pages directamente desde public/.
 *  Este servidor solo sirve para verla en tu computadora (npm start) y
 *  para las pruebas (test/), imitando lo que hace Cloudflare:
 *   • Aplica las cabeceras de public/_headers (mismo archivo que usa
 *     Cloudflare), así las pruebas revisan la seguridad real.
 *   • Direcciones sin .html: /aviso-privacidad.html → /aviso-privacidad.
 *   • Página 404 propia para lo que no existe.
 *  server.js lo arranca; las pruebas lo usan directamente.
 * ============================================================
 */
const express = require('express');
const fs      = require('fs');
const path    = require('path');

const PUBLICO = path.join(__dirname, '..', 'public');

// Lee public/_headers: líneas sin sangría = ruta (con * como comodín);
// líneas con sangría = "Cabecera: valor" para esa ruta.
function leerCabeceras(archivo) {
  const reglas = [];
  for (const linea of fs.readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    if (!linea.trim() || linea.trim().startsWith('#')) continue;
    if (!/^\s/.test(linea)) {
      const patron = linea.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      reglas.push({ patron: new RegExp('^' + patron + '$'), cabeceras: [] });
    } else {
      const i = linea.indexOf(':');
      reglas[reglas.length - 1].cabeceras.push([linea.slice(0, i).trim(), linea.slice(i + 1).trim()]);
    }
  }
  return reglas;
}
const REGLAS = leerCabeceras(path.join(PUBLICO, '_headers'));

const app = express();
app.disable('x-powered-by');

// Cabeceras de _headers (si dos reglas repiten una, se juntan con coma, como en Cloudflare)
app.use((req, res, next) => {
  for (const { patron, cabeceras } of REGLAS) {
    if (!patron.test(req.path)) continue;
    for (const [nombre, valor] of cabeceras) {
      const previo = res.getHeader(nombre);
      res.setHeader(nombre, previo ? previo + ', ' + valor : valor);
    }
  }
  next();
});

// Direcciones limpias, como Cloudflare: /index.html → /, /pagina.html → /pagina
app.use((req, res, next) => {
  if (!req.path.endsWith('.html') || req.path === '/404.html') return next();
  const limpia = req.path.replace(/(index)?\.html$/, '');
  const consulta = req.originalUrl.slice(req.path.length);
  res.redirect(308, limpia + consulta);
});

// Los archivos de configuración de Cloudflare no se publican
app.use((req, res, next) => (/^\/_(headers|redirects)$/.test(req.path) ? noEncontrada(req, res) : next()));

app.use(express.static(PUBLICO, { extensions: ['html'], cacheControl: false }));

// Cualquier otra dirección: página no encontrada
function noEncontrada(_req, res) { res.status(404).sendFile(path.join(PUBLICO, '404.html')); }
app.use(noEncontrada);

module.exports = app;
