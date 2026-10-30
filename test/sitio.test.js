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

test('las imágenes se guardan un día; CSS y JS se revisan en cada visita', async () => {
  const img = await fetch(B + '/img/logo.png');
  assert.equal(img.headers.get('cache-control'), 'public, max-age=86400');
  for (const ruta of ['/css/styles.css', '/js/main.js']) {
    const res = await fetch(B + ruta);
    assert.equal(res.status, 200, ruta);
    assert.equal(res.headers.get('cache-control'), null, ruta + ': no debe guardarse sin revisar');
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

// Páginas del sitio: cada botón del menú lleva a su propia página
const PAGINAS = ['/', '/villas', '/galeria', '/ubicacion', '/contacto', '/aviso-privacidad'];

test('cada página abre, con su título, descripción, canonical propio y un solo <h1>', async () => {
  for (const ruta of PAGINAS) {
    const res = await fetch(B + ruta);
    assert.equal(res.status, 200, ruta);
    const html = await res.text();
    assert.match(html, /<title>[^<]+<\/title>/, ruta);
    assert.match(html, /<meta name="description" content="[^"]{30,}"/, ruta);
    const canonical = html.match(/<link rel="canonical" href="https:\/\/[^/"]+([^"]*)"/);
    assert.ok(canonical, ruta + ': falta canonical');
    assert.equal(canonical[1], ruta, ruta + ': canonical de otra página');
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, ruta + ': debe haber un solo <h1>');
    assert.match(html, /<html lang="es" data-en-title="[^"]+"/, ruta + ': falta el título en inglés');
  }
});

test('el menú marca la página actual y solo se cargan scripts propios', async () => {
  for (const ruta of PAGINAS.filter(r => r !== '/' && r !== '/aviso-privacidad')) {
    const html = await (await fetch(B + ruta)).text();
    assert.match(html, new RegExp(`<a href="${ruta}" aria-current="page"`), ruta);
    const scripts = [...html.matchAll(/<script src="([^"?]+)/g)].map(m => m[1]);   // sin ?v=
    assert.deepEqual(scripts, ['/js/i18n.js', '/js/main.js'], ruta);
  }
});

test('las páginas que usa el menú y el pie existen todas', async () => {
  const html = await (await fetch(B + '/')).text();
  const internas = new Set([...html.matchAll(/href="(\/[a-z-]*)(?:#[a-z-]+)?"/g)].map(m => m[1]));
  for (const ruta of internas) assert.equal((await fetch(B + ruta)).status, 200, ruta);
});

test('el formulario de reserva está en /contacto con las tarifas para el precio estimado', async () => {
  const html = await (await fetch(B + '/contacto')).text();
  for (const id of ['formulario-reservacion', 'campo-nombre', 'campo-llegada', 'campo-salida', 'campo-huespedes', 'precio-estimado', 'formulario-exito', 'exito-whatsapp']) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  for (const t of ['precioNoche', 'mes1', 'mes2', 'mes3']) assert.match(html, new RegExp(`data-tarifa="${t}"`), t);
});

test('robots.txt y sitemap.xml están disponibles; el sitemap lista todas las páginas', async () => {
  const robots = await fetch(B + '/robots.txt');
  assert.equal(robots.status, 200);
  assert.match(await robots.text(), /Sitemap: https:\/\/\S+\/sitemap\.xml/);
  const mapa = await fetch(B + '/sitemap.xml');
  assert.equal(mapa.status, 200);
  const xml = await mapa.text();
  for (const ruta of PAGINAS) assert.match(xml, new RegExp(`<loc>https://[^/<]+${ruta === '/' ? '/' : ruta}</loc>`), ruta);
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
