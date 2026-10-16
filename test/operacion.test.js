/**
 * Pruebas de las funciones de operación del hotel: precios por noche y por
 * mes, reservas que registra el admin, pagos, cancelaciones, tarifas
 * editables y respaldos cifrados. Base de datos en memoria.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV   = 'test';
delete process.env.MONGODB_URI;
process.env.ADMIN_USER = 'Admin Prueba';
process.env.ADMIN_PASS = 'AdminPrueba2026';

const db  = require('../server/config/db');
const app = require('../server/app');
const { calcularPrecio, PREDETERMINADAS } = require('../server/utils/precios');
const respaldo = require('../server/utils/respaldo');

let servidor, B, admin;
const pedir = (ruta, cuerpo, metodo = 'POST', token = admin) => fetch(B + ruta, {
  method: metodo,
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
  body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
});
const disponibles = async (l, s) =>
  (await (await fetch(`${B}/api/reservaciones/disponibilidad?llegada=${l}&salida=${s}`)).json()).disponibles;

before(async () => {
  await db.conectar();
  servidor = app.listen(0);
  B = 'http://127.0.0.1:' + servidor.address().port;
  admin = (await (await pedir('/api/auth/login', { usuario: 'Admin Prueba', password: 'AdminPrueba2026' }, 'POST', null)).json()).token;
});
after(async () => { servidor.close(); await db.desconectar(); });

test('precios: por noche y tarifas mensuales por tramo', () => {
  const t = PREDETERMINADAS;
  assert.deepEqual(calcularPrecio(3, t),  { tarifa: 'noche', tarifaMensual: null, precioNoche: 1850, total: 5550 });
  assert.equal(calcularPrecio(29, t).total, 29 * 1850);
  assert.equal(calcularPrecio(30, t).total, 20000);          // 1 mes
  assert.equal(calcularPrecio(45, t).total, 30000);          // 1.5 meses a la tarifa de 1 mes
  assert.equal(calcularPrecio(60, t).total, 36000);          // 2 meses × 18,000
  assert.equal(calcularPrecio(90, t).total, 48000);          // 3 meses × 16,000
  assert.equal(calcularPrecio(120, t).total, 64000);         // 4 meses × 16,000
  assert.equal(calcularPrecio(90, t).tarifaMensual, 16000);
});

test('una solicitud de 90 noches desde la página se cobra con tarifa mensual', async () => {
  const r = await (await pedir('/api/reservaciones', {
    nombre: 'Snowbird', email: 'sb@test.com', villa: 5, huespedes: '2', llegada: '2026-11-01', salida: '2027-01-30'
  }, 'POST', null)).json();
  assert.equal(r.reservacion.noches, 90);
  assert.equal(r.reservacion.tarifa, 'mensual');
  assert.equal(r.reservacion.total, 48000);
  assert.equal(r.reservacion.estado, 'pendiente');
});

test('el admin registra una reserva ya pagada: queda confirmada y bloquea la villa', async () => {
  const res = await pedir('/api/reservaciones/admin', {
    nombre: 'Reserva de Booking', villa: 7, llegada: '2026-11-03', salida: '2026-11-10',
    origen: 'booking', totalAcordado: 14000, montoPagado: 16240
  });
  assert.equal(res.status, 200);
  const { reservacion } = await res.json();
  assert.equal(reservacion.estado, 'confirmada');
  assert.equal(reservacion.origen, 'booking');
  assert.equal(reservacion.total, 14000);          // precio acordado, no el de tarifas
  assert.equal(reservacion.email, '');             // el correo es opcional para el admin
  assert.ok(!(await disponibles('2026-11-05', '2026-11-06')).includes(7));

  // La página ya no deja pedir esa villa en esas fechas
  const choque = await pedir('/api/reservaciones', {
    nombre: 'X', email: 'x@test.com', villa: 7, llegada: '2026-11-04', salida: '2026-11-06'
  }, 'POST', null);
  assert.equal(choque.status, 409);
});

test('registrar pagos y cancelar una reserva libera la villa', async () => {
  const { reservacion } = await (await pedir('/api/reservaciones/admin', {
    nombre: 'Por cancelar', villa: 9, llegada: '2026-12-01', salida: '2026-12-05', origen: 'telefono'
  })).json();
  assert.ok(!(await disponibles('2026-12-02', '2026-12-03')).includes(9));

  const pago = await (await pedir(`/api/reservaciones/${reservacion.id}/pago`, { montoPagado: 2000 }, 'PATCH')).json();
  assert.equal(pago.reservacion.montoPagado, 2000);
  assert.equal((await pedir(`/api/reservaciones/${reservacion.id}/pago`, { montoPagado: -5 }, 'PATCH')).status, 400);

  const cancelada = await (await pedir(`/api/reservaciones/${reservacion.id}`, { estado: 'cancelada' }, 'PATCH')).json();
  assert.equal(cancelada.reservacion.estado, 'cancelada');
  assert.ok((await disponibles('2026-12-02', '2026-12-03')).includes(9));
});

test('solo el admin puede registrar reservas, pagos y precios', async () => {
  assert.equal((await pedir('/api/reservaciones/admin', { nombre: 'X', villa: 1, llegada: '2027-01-01', salida: '2027-01-02' }, 'POST', null)).status, 401);
  assert.equal((await pedir('/api/tarifas', { precioNoche: 1, mes1: 1, mes2: 1, mes3: 1 }, 'PUT', null)).status, 401);
});

test('cambiar las tarifas desde el panel afecta solo a reservas nuevas', async () => {
  assert.equal((await pedir('/api/tarifas', { precioNoche: 2000, mes1: 21000, mes2: 19000, mes3: 17000 }, 'PUT')).status, 200);
  assert.equal((await pedir('/api/tarifas', { precioNoche: -1, mes1: 0, mes2: 'x', mes3: 1 }, 'PUT')).status, 400);
  assert.deepEqual(await (await fetch(B + '/api/tarifas')).json(), { precioNoche: 2000, mes1: 21000, mes2: 19000, mes3: 17000 });

  const r = await (await pedir('/api/reservaciones', {
    nombre: 'Nueva tarifa', email: 'n@test.com', villa: 11, llegada: '2027-03-01', salida: '2027-03-03'
  }, 'POST', null)).json();
  assert.equal(r.reservacion.total, 4000);
});

test('contabilidad incluye lo cobrado y lo que falta por cobrar', async () => {
  const c = await (await pedir('/api/contabilidad', undefined, 'GET')).json();
  // Solo la reserva de Booking sigue confirmada: 14,000 + IVA = 16,240, ya pagado completo
  assert.equal(c.cobrado, 16240);
  assert.equal(c.porCobrar, 0);
});

test('respaldo cifrado: se restaura igual y no se abre con otra contraseña', async () => {
  const datos = await respaldo.exportar();
  const archivo = respaldo.cifrar(datos, 'contraseña-de-prueba-larga');
  assert.ok(!archivo.includes(Buffer.from('Snowbird')), 'el archivo no debe contener texto legible');
  assert.throws(() => respaldo.descifrar(archivo, 'otra-contraseña-larga'), /Contraseña incorrecta/);
  assert.throws(() => respaldo.cifrar(datos, 'corta'), /12 caracteres/);

  const recuperado = respaldo.descifrar(archivo, 'contraseña-de-prueba-larga');
  const antes = recuperado.colecciones.reservacions.length;
  await pedir('/api/reservaciones/admin', { nombre: 'Después del respaldo', villa: 2, llegada: '2027-05-01', salida: '2027-05-02' });
  await respaldo.importar(recuperado);
  const todas = await (await pedir('/api/reservaciones', undefined, 'GET')).json();
  assert.equal(todas.length, antes);
  assert.ok(!todas.some(r => r.nombre === 'Después del respaldo'));
});
