/**
 * Pruebas de la página: que se sirva completa, con cabeceras de seguridad,
 * con los datos para Google (SEO) y sin restos del sistema de reservas.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('node:fs');
const path = require('node:path');

const app = require('../server/app');

let servidor, B;
before(() => {
  servidor = app.listen(0);
  B = 'http://127.0.0.1:' + servidor.address().port;
});
after(() => servidor.close());

test('la portada se sirve con las cabeceras de seguridad de public/_headers', async () => {
  const res = await fetch(B + '/');
  assert.equal(res.status, 200);
  const csp = res.headers.get('content-security-policy');
  assert.match(csp, /script-src 'self';/, 'solo scripts propios');
  assert.match(csp, /frame-ancestors 'none'/);
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.match(res.headers.get('strict-transport-security'), /max-age=31536000/);
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('cache-control'), null, 'el HTML no se guarda en caché');
});

test('CSS, JS e imágenes se guardan un día; la regla general no repite Cache-Control', async () => {
  for (const ruta of ['/css/styles.css', '/js/main.js', '/img/logo.png']) {
    const res = await fetch(B + ruta);
    assert.equal(res.status, 200, ruta);
    assert.equal(res.headers.get('cache-control'), 'public, max-age=86400', ruta);
    assert.ok(res.headers.get('content-security-policy'), ruta);
  }
});

test('direcciones sin .html, como en Cloudflare Pages', async () => {
  const aviso = await fetch(B + '/aviso-privacidad');
  assert.equal(aviso.status, 200);
  assert.match(await aviso.text(), /Aviso de privacidad/);
  for (const [vieja, nueva] of [['/aviso-privacidad.html', '/aviso-privacidad'], ['/index.html', '/']]) {
    const res = await fetch(B + vieja, { redirect: 'manual' });
    assert.equal(res.status, 308, vieja);
    assert.equal(res.headers.get('location'), nueva, vieja);
  }
});

test('los archivos de configuración de Cloudflare no se publican', async () => {
  assert.equal((await fetch(B + '/_headers')).status, 404);
});

test('la portada tiene título, descripción, canonical y ficha de hotel para Google', async () => {
  const html = await (await fetch(B + '/')).text();
  assert.match(html, /<title>[^<]*Melaque[^<]*<\/title>/);
  assert.match(html, /<meta name="description"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/[^"]+\/"/);
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, 'debe haber un solo <h1>');

  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(json, 'falta la ficha schema.org');
  const ficha = JSON.parse(json[1]);
  assert.equal(ficha['@type'], 'Hotel');
  assert.equal(ficha.address.addressLocality, 'San Patricio-Melaque');
  assert.equal(ficha.numberOfRooms, 16);
});

test('robots.txt y sitemap.xml están disponibles', async () => {
  const robots = await fetch(B + '/robots.txt');
  assert.equal(robots.status, 200);
  assert.match(await robots.text(), /Sitemap: https:\/\/\S+\/sitemap\.xml/);
  const mapa = await fetch(B + '/sitemap.xml');
  assert.equal(mapa.status, 200);
  assert.match(await mapa.text(), /<urlset/);
});

test('una dirección que no existe da 404 (también las de la antigua API)', async () => {
  for (const ruta of ['/no-existe', '/api/reservaciones', '/api/auth/login']) {
    const res = await fetch(B + ruta);
    assert.equal(res.status, 404, ruta);
    assert.match(await res.text(), /Página no encontrada/);
  }
});

test('la página ya no carga el panel, Excel ni PDF', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  assert.doesNotMatch(html, /dashboard\.js|xlsx|jspdf|modal-login|panel-admin/);
  assert.ok(!fs.existsSync(path.join(__dirname, '..', 'public', 'js', 'dashboard.js')));
});

test('wrangler.jsonc publica public/ con la página 404 propia', () => {
  const texto = fs.readFileSync(path.join(__dirname, '..', 'wrangler.jsonc'), 'utf8');
  const config = JSON.parse(texto.replace(/^\s*\/\/.*$/gm, ''));   // quitar comentarios
  assert.equal(config.name, 'hotel-costa-alegre');
  assert.equal(config.assets.directory, './public');
  assert.equal(config.assets.not_found_handling, '404-page');
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'public', '404.html')));
});
