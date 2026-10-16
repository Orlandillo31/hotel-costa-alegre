/**
 * reservaciones.routes.js
 *   GET    /api/reservaciones/disponibilidad  Villas libres por fechas (público)
 *   POST   /api/reservaciones           Crear solicitud (público o cliente logueado) → pendiente
 *   POST   /api/reservaciones/admin     Registrar reserva ya acordada (admin) → confirmada
 *   GET    /api/reservaciones/mis       Las del cliente autenticado
 *   GET    /api/reservaciones           Todas (admin)
 *   PATCH  /api/reservaciones/:id       Cambiar estado (admin)
 *   PATCH  /api/reservaciones/:id/pago  Registrar lo pagado (admin)
 *   DELETE /api/reservaciones/:id       Borrar (admin)
 *
 * Una villa solo queda OCUPADA con una reserva CONFIRMADA. Las solicitudes
 * pendientes no bloquean (el admin decide cuál confirma) y las canceladas o
 * rechazadas liberan la villa. El precio sale de utils/precios.js.
 */
const express = require('express');
const router  = express.Router();

const Reservacion = require('../models/Reservacion');
const { NUM_VILLAS } = require('../config/db');
const { obtenerSesion, requiereAuth } = require('../auth');
const mailer = require('../utils/mailer');
const { correoConfirmacion, correoRechazo } = require('../utils/notificaciones');
const { EMAIL_RE, texto, correo, validarId } = require('../utils/entrada');
const { limiterReservas } = require('../utils/seguridad');
const { obtenerTarifas, calcularPrecio } = require('../utils/precios');

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const ESTADOS  = ['pendiente', 'confirmada', 'rechazada', 'cancelada'];
const ORIGENES = ['web', 'booking', 'telefono', 'whatsapp', 'otro'];
const MAX_MONTO = 10000000;

router.param('id', validarId);

// Villas OCUPADAS por reservas CONFIRMADAS que se solapan con [llegada, salida).
// `excepto` permite ignorar una reserva (al confirmar esa misma).
async function villasOcupadas(llegada, salida, excepto = null) {
  const filtro = {
    estado:  'confirmada',
    llegada: { $lt: salida },   // orden lexicográfico de 'YYYY-MM-DD' = cronológico
    salida:  { $gt: llegada }
  };
  if (excepto) filtro._id = { $ne: excepto };
  const docs = await Reservacion.find(filtro).select('villa -_id');
  return [...new Set(docs.map(d => d.villa))];
}

// Lee y valida los datos comunes de una reserva. Devuelve { error } o { datos }.
function leerReserva(body, { correoObligatorio }) {
  const datos = {
    nombre:      texto(body.nombre, 120),
    email:       correo(body.email),
    telefono:    texto(body.telefono, 30),
    huespedes:   texto(String(body.huespedes ?? ''), 10),
    comentarios: texto(body.comentarios, 1000),
    llegada:     texto(body.llegada, 10),
    salida:      texto(body.salida, 10),
    villa:       Number(body.villa)
  };
  const d = datos;
  if (!d.nombre || !d.llegada || !d.salida || !d.villa || (correoObligatorio && !d.email)) {
    return { error: 'Faltan campos obligatorios.' };
  }
  if (d.email && !EMAIL_RE.test(d.email)) return { error: 'El correo electrónico no es válido.' };
  if (!Number.isInteger(d.villa) || d.villa < 1 || d.villa > NUM_VILLAS) return { error: 'Número de villa inválido.' };
  if (!FECHA_RE.test(d.llegada) || !FECHA_RE.test(d.salida)) return { error: 'Fechas inválidas.' };
  if (d.salida <= d.llegada) return { error: 'La salida debe ser posterior a la llegada.' };
  d.noches = Math.round((new Date(d.salida + 'T00:00:00Z') - new Date(d.llegada + 'T00:00:00Z')) / 86400000);
  return { datos };
}

const noDisponible = villa =>
  `La Villa ${villa} ya no está disponible en esas fechas. Elige otra villa u otras fechas.`;

// Disponibilidad pública por fechas (solo números de villa; sin datos de huéspedes).
router.get('/disponibilidad', async (req, res) => {
  const llegada = texto(req.query.llegada, 10);
  const salida  = texto(req.query.salida, 10);
  if (!FECHA_RE.test(llegada) || !FECHA_RE.test(salida) || salida <= llegada) {
    return res.status(400).json({ error: 'Fechas inválidas.' });
  }
  const ocupadas = (await villasOcupadas(llegada, salida)).sort((a, b) => a - b);
  const disponibles = [];
  for (let v = 1; v <= NUM_VILLAS; v++) if (!ocupadas.includes(v)) disponibles.push(v);
  res.json({ total: NUM_VILLAS, ocupadas, disponibles });
});

// Solicitud de reserva desde la página (queda pendiente).
router.post('/', limiterReservas, async (req, res) => {
  const { error, datos } = leerReserva(req.body, { correoObligatorio: true });
  if (error) return res.status(400).json({ error });

  if ((await villasOcupadas(datos.llegada, datos.salida)).includes(datos.villa)) {
    return res.status(409).json({ error: noDisponible(datos.villa) });
  }

  const sesion    = obtenerSesion(req);
  const clienteId = (sesion && sesion.rol === 'cliente') ? sesion.id : null;
  const precio    = calcularPrecio(datos.noches, await obtenerTarifas());

  const reservacion = await Reservacion.create({
    ...datos, ...precio, clienteId, origen: 'web', estado: 'pendiente'
  });
  res.json({ ok: true, reservacion });
});

// Reserva que el admin registra a mano (ya pagada, de Booking, por teléfono…).
// Queda CONFIRMADA de una vez, así bloquea la villa en la página.
router.post('/admin', requiereAuth('admin'), async (req, res) => {
  const { error, datos } = leerReserva(req.body, { correoObligatorio: false });
  if (error) return res.status(400).json({ error });

  const origen = texto(req.body.origen, 20) || 'otro';
  if (!ORIGENES.includes(origen)) return res.status(400).json({ error: 'Origen inválido.' });

  const montoPagado = req.body.montoPagado === undefined || req.body.montoPagado === '' ? 0 : Number(req.body.montoPagado);
  if (!Number.isFinite(montoPagado) || montoPagado < 0 || montoPagado > MAX_MONTO) {
    return res.status(400).json({ error: 'Monto pagado inválido.' });
  }

  if ((await villasOcupadas(datos.llegada, datos.salida)).includes(datos.villa)) {
    return res.status(409).json({ error: noDisponible(datos.villa) });
  }

  // Precio: el de las tarifas, salvo que se indique el total acordado
  // (p. ej. lo que cobró Booking), que se guarda como subtotal sin IVA.
  const precio = calcularPrecio(datos.noches, await obtenerTarifas());
  if (req.body.totalAcordado !== undefined && req.body.totalAcordado !== '') {
    const total = Number(req.body.totalAcordado);
    if (!Number.isFinite(total) || total <= 0 || total > MAX_MONTO) {
      return res.status(400).json({ error: 'Total acordado inválido.' });
    }
    Object.assign(precio, { total: Math.round(total), precioNoche: +(total / datos.noches).toFixed(2) });
  }

  const reservacion = await Reservacion.create({
    ...datos, ...precio, origen, montoPagado, estado: 'confirmada'
  });

  // Correo de confirmación solo si el admin lo pide y hay correo.
  let correoEnvio = null;
  if (req.body.enviarCorreo === true && reservacion.email) {
    try { await mailer.enviar({ to: reservacion.email, ...correoConfirmacion(reservacion) }); correoEnvio = 'enviado'; }
    catch (e) { console.error('No se pudo enviar la confirmación:', e.message); correoEnvio = 'fallo'; }
  }
  res.json({ ok: true, reservacion, correo: correoEnvio });
});

// Reservas del cliente autenticado
router.get('/mis', requiereAuth('cliente'), async (req, res) => {
  const reservas = await Reservacion.find({ clienteId: req.sesion.id }).sort({ creada: -1 });
  res.json(reservas);
});

// Todas las reservas (admin)
router.get('/', requiereAuth('admin'), async (req, res) => {
  const reservas = await Reservacion.find().sort({ creada: -1 });
  res.json(reservas);
});

// Cambiar estado (admin). Al confirmar o rechazar se avisa al cliente por
// correo (si tiene); si el envío falla, el cambio se mantiene y se informa.
router.patch('/:id', requiereAuth('admin'), async (req, res) => {
  const estado = texto(req.body.estado, 20);
  if (!ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });

  const reservacion = await Reservacion.findById(req.params.id);
  if (!reservacion) return res.status(404).json({ error: 'Reservación no encontrada.' });

  // No confirmar una villa que ya tiene OTRA reserva confirmada en esas fechas.
  if (estado === 'confirmada' &&
      (await villasOcupadas(reservacion.llegada, reservacion.salida, reservacion._id)).includes(reservacion.villa)) {
    return res.status(409).json({
      error: `No se puede confirmar: la Villa ${reservacion.villa} ya tiene otra reserva confirmada en esas fechas.`
    });
  }

  reservacion.estado = estado;
  reservacion.actualizada = new Date();
  await reservacion.save();

  let correoEnvio = null;
  let correoError;
  if ((estado === 'confirmada' || estado === 'rechazada') && reservacion.email) {
    const plantilla = estado === 'confirmada' ? correoConfirmacion(reservacion) : correoRechazo(reservacion);
    try {
      await mailer.enviar({ to: reservacion.email, ...plantilla });
      correoEnvio = 'enviado';
    } catch (e) {
      console.error('No se pudo notificar al cliente por correo:', e.message);
      correoEnvio = 'fallo';
      correoError = e.message;   // solo lo ve el admin (endpoint autenticado)
    }
  }
  res.json({ ok: true, reservacion, correo: correoEnvio, correoError });
});

// Registrar cuánto ha pagado el huésped (admin)
router.patch('/:id/pago', requiereAuth('admin'), async (req, res) => {
  const monto = Number(req.body.montoPagado);
  if (!Number.isFinite(monto) || monto < 0 || monto > MAX_MONTO) {
    return res.status(400).json({ error: 'Monto pagado inválido.' });
  }
  const reservacion = await Reservacion.findByIdAndUpdate(
    req.params.id, { montoPagado: Math.round(monto * 100) / 100, actualizada: new Date() }, { new: true }
  );
  if (!reservacion) return res.status(404).json({ error: 'Reservación no encontrada.' });
  res.json({ ok: true, reservacion });
});

// Eliminar (admin)
router.delete('/:id', requiereAuth('admin'), async (req, res) => {
  const borrada = await Reservacion.findByIdAndDelete(req.params.id);
  if (!borrada) return res.status(404).json({ error: 'Reservación no encontrada.' });
  res.json({ ok: true });
});

module.exports = router;
