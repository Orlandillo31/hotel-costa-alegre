/**
 * Pruebas automáticas de seguridad y de las funciones principales.
 * Ejecutar:  npm test
 *
 * Usan una base de datos MongoDB EN MEMORIA (nunca tocan Atlas) y no envían
 * correos (sin credenciales el mailer solo los imprime).
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV   = 'test';
delete process.env.MONGODB_URI;              // → MongoDB en memoria
process.env.ADMIN_USER = 'Admin Prueba';
process.env.ADMIN_PASS = 'AdminPrueba2026';

const db  = require('../server/config/db');
const app = require('../server/app');
const { correoConfirmacion } = require('../server/utils/notificaciones');

let servidor, B;
const json = (ruta, cuerpo, token, metodo = 'POST') => fetch(B + ruta, {
  method: metodo,
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
  body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)
});
const vivo = async () => (await fetch(B + '/api/resenas')).status === 200;

before(async () => {
  await db.conectar();
  servidor = app.listen(0);
  B = 'http://127.0.0.1:' + servidor.address().port;
});
after(async () => { servidor.close(); await db.desconectar(); });

// ---------------------------------------------------------------
// Datos con forma inesperada: antes tumbaban el servidor completo
// ---------------------------------------------------------------
test('login con campos que no son texto responde 401 y el servidor sigue vivo', async () => {
  const r = await json('/api/auth/login', { usuario: { $ne: null }, password: { $gt: '' } });
  assert.equal(r.status, 401);
  assert.ok(await vivo());
});

test('registro, reseña y reserva con objetos en vez de texto → 400, sin caída', async () => {
  assert.equal((await json('/api/auth/registro', { nombre: [], email: {}, password: {} })).status, 400);
  assert.equal((await json('/api/resenas', { nombre: {}, comentario: [], calificacion: '5' })).status, 400);
  assert.equal((await json('/api/reservaciones', { nombre: {}, email: [], villa: {}, llegada: {}, salida: {} })).status, 400);
  assert.ok(await vivo());
});

test('disponibilidad con parámetros repetidos o raros → 400', async () => {
  const r = await fetch(B + '/api/reservaciones/disponibilidad?llegada[]=2027-01-01&salida=x');
  assert.equal(r.status, 400);
  assert.ok(await vivo());
});

test('JSON mal formado → 400 y petición enorme → 413', async () => {
  assert.equal((await json('/api/auth/login', '{"usuario": ')).status, 400);
  assert.equal((await json('/api/resenas', { comentario: 'x'.repeat(20000) })).status, 413);
  assert.ok(await vivo());
});

test('un :id inválido responde 404 en vez de error de base de datos', async () => {
  const login = await (await json('/api/auth/login', { usuario: 'Admin Prueba', password: 'AdminPrueba2026' })).json();
  const r = await json('/api/reservaciones/no-es-un-id', { estado: 'confirmada' }, login.token, 'PATCH');
  assert.equal(r.status, 404);
});

// ---------------------------------------------------------------
// Cabeceras de seguridad
// ---------------------------------------------------------------
test('cabeceras: CSP, anti-clickjacking, sin CORS abierto ni X-Powered-By', async () => {
  const r = await fetch(B + '/', { headers: { Origin: 'https://sitio-malicioso.example' } });
  const csp = r.headers.get('content-security-policy') || '';
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /script-src 'self' https:\/\/cdn\.jsdelivr\.net/);
  assert.equal(r.headers.get('access-control-allow-origin'), null);
  assert.equal(r.headers.get('x-powered-by'), null);
});

// ---------------------------------------------------------------
// Inyección de HTML en los correos del hotel
// ---------------------------------------------------------------
test('el correo de confirmación escapa el nombre del huésped', () => {
  const c = correoConfirmacion({
    id: 'abcd1234', nombre: '<a href="https://phishing.example">Pague aquí</a>', email: 'x@y.com',
    villa: 1, huespedes: '2', llegada: '2027-01-01', salida: '2027-01-03', noches: 2, precioNoche: 1850, total: 3700
  });
  assert.ok(!c.html.includes('<a href="https://phishing.example">'));
  assert.ok(c.html.includes('&lt;a href=&quot;https://phishing.example&quot;&gt;'));
});

// ---------------------------------------------------------------
// Acceso y sesiones
// ---------------------------------------------------------------
test('login: el admin entra con su usuario; una cuenta inexistente recibe el mismo mensaje', async () => {
  const ok = await (await json('/api/auth/login', { usuario: 'Admin Prueba', password: 'AdminPrueba2026' })).json();
  assert.equal(ok.rol, 'admin');
  const mal = await json('/api/auth/login', { usuario: 'nadie@x.com', password: 'loquesea123' });
  assert.equal(mal.status, 401);
  assert.equal((await mal.json()).error, 'Credenciales inválidas.');
});

test('cambiar la contraseña con el código cierra las sesiones abiertas de esa cuenta', async () => {
  await json('/api/auth/registro', { nombre: 'Huésped', email: 'h@test.com', password: 'Original2026' });
  const viejo = (await (await json('/api/auth/login', { usuario: 'h@test.com', password: 'Original2026' })).json()).token;
  assert.equal((await fetch(B + '/api/reservaciones/mis', { headers: { Authorization: 'Bearer ' + viejo } })).status, 200);

  const { codigoDev } = await (await json('/api/auth/recuperar', { email: 'h@test.com' })).json();
  assert.ok(codigoDev, 'en pruebas el código se devuelve para poder usarlo');
  assert.equal((await json('/api/auth/restablecer', { email: 'h@test.com', codigo: codigoDev, nuevaPassword: 'Nueva2026x' })).status, 200);

  assert.equal((await fetch(B + '/api/reservaciones/mis', { headers: { Authorization: 'Bearer ' + viejo } })).status, 401);
});

// ---------------------------------------------------------------
// Reservaciones
// ---------------------------------------------------------------
test('reserva válida se crea pendiente; correo inválido se rechaza', async () => {
  const base = { nombre: 'Ana', villa: 3, huespedes: '2', llegada: '2027-05-01', salida: '2027-05-04' };
  const ok = await (await json('/api/reservaciones', { ...base, email: 'ana@test.com' })).json();
  assert.equal(ok.reservacion.estado, 'pendiente');
  assert.equal(ok.reservacion.total, 1850 * 3);
  assert.equal((await json('/api/reservaciones', { ...base, email: 'no-es-correo' })).status, 400);
});

test('límite anti-spam: demasiadas solicitudes de reserva desde la misma red → 429', async () => {
  let ultimo;
  for (let i = 0; i < 16; i++) {
    ultimo = await json('/api/reservaciones', { nombre: 'Spam', email: 's@test.com', villa: 1, llegada: '2027-06-01', salida: '2027-06-02' });
  }
  assert.equal(ultimo.status, 429);
});
