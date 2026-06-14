/**
 * reservaciones.routes.js
 *   POST   /api/reservaciones        Crear (público o cliente logueado)
 *   GET    /api/reservaciones/mis    Listar las del cliente autenticado
 *   GET    /api/reservaciones        Listar todas (admin)
 *   PATCH  /api/reservaciones/:id    Cambiar estado (admin)
 *   DELETE /api/reservaciones/:id    Borrar (admin)
 *
 * Todas las villas son idénticas y cuestan PRECIO_NOCHE. Hay NUM_VILLAS
 * unidades, así que se evita el doble booking de una misma villa en
 * fechas que se solapan con reservas activas (pendiente/confirmada).
 */
const express = require('express');
const router  = express.Router();

const Reservacion = require('../models/Reservacion');
const { PRECIO_NOCHE, NUM_VILLAS } = require('../config/db');
const { obtenerSesion, requiereAuth } = require('../auth');
const mailer = require('../utils/mailer');
const { correoConfirmacion, correoRechazo } = require('../utils/notificaciones');

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

// Devuelve los números de villa OCUPADOS por reservas CONFIRMADAS que se
// solapan con el rango [llegada, salida). Función reutilizada por varios
// endpoints. No expone ningún dato del huésped ni fechas ajenas.
async function villasOcupadas(llegada, salida) {
  const docs = await Reservacion.find({
    estado:  'confirmada',
    llegada: { $lt: salida },   // orden lexicográfico de 'YYYY-MM-DD' = cronológico
    salida:  { $gt: llegada }
  }).select('villa -_id');
  return [...new Set(docs.map(d => d.villa))];
}

// Disponibilidad pública por fechas (solo villas; sin datos de huéspedes).
// GET /api/reservaciones/disponibilidad?llegada=YYYY-MM-DD&salida=YYYY-MM-DD
router.get('/disponibilidad', async (req, res) => {
  const llegada = (req.query.llegada || '').trim();
  const salida  = (req.query.salida  || '').trim();
  if (!FECHA_RE.test(llegada) || !FECHA_RE.test(salida) || salida <= llegada) {
    return res.status(400).json({ error: 'Fechas inválidas.' });
  }
  const ocupadas = (await villasOcupadas(llegada, salida)).sort((a, b) => a - b);
  const disponibles = [];
  for (let v = 1; v <= NUM_VILLAS; v++) if (!ocupadas.includes(v)) disponibles.push(v);
  res.json({ total: NUM_VILLAS, ocupadas, disponibles });
});

// Crear reservación
router.post('/', async (req, res) => {
  const nombre   = (req.body.nombre || '').trim();
  const email    = (req.body.email  || '').trim().toLowerCase();
  const telefono = (req.body.telefono || '').trim();
  const huespedes = String(req.body.huespedes || '').trim();
  const comentarios = (req.body.comentarios || '').trim();
  const llegada  = (req.body.llegada || '').trim();
  const salida   = (req.body.salida  || '').trim();
  const villa    = parseInt(req.body.villa, 10);

  // Validaciones de entrada
  if (!nombre || !email || !llegada || !salida || !villa) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }
  if (!Number.isInteger(villa) || villa < 1 || villa > NUM_VILLAS) {
    return res.status(400).json({ error: 'Número de villa inválido.' });
  }
  if (!FECHA_RE.test(llegada) || !FECHA_RE.test(salida)) {
    return res.status(400).json({ error: 'Fechas inválidas.' });
  }
  if (salida <= llegada) {
    return res.status(400).json({ error: 'La salida debe ser posterior a la llegada.' });
  }

  const noches = Math.max(1, Math.ceil(
    (new Date(salida) - new Date(llegada)) / (1000 * 60 * 60 * 24)
  ));

  // Solo una reserva CONFIRMADA por el administrador ocupa la villa. Varias
  // solicitudes pendientes pueden coexistir; el admin decide cuál confirma.
  const ocupadas = await villasOcupadas(llegada, salida);
  if (ocupadas.includes(villa)) {
    return res.status(409).json({
      error: `La Villa ${villa} ya no está disponible en esas fechas. Elige otra villa u otras fechas.`
    });
  }

  const sesion    = obtenerSesion(req);
  const clienteId = (sesion && sesion.rol === 'cliente') ? sesion.id : null;

  const reservacion = await Reservacion.create({
    clienteId, nombre, email, telefono,
    villa, huespedes, llegada, salida,
    noches, precioNoche: PRECIO_NOCHE, total: PRECIO_NOCHE * noches,
    comentarios, estado: 'pendiente'
  });

  res.json({ ok: true, reservacion });
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

// Cambiar estado (admin). Al confirmar o rechazar se notifica al cliente
// por correo automáticamente; si el envío falla, el cambio de estado se
// mantiene y se informa al admin en la respuesta (correo: 'fallo').
router.patch('/:id', requiereAuth('admin'), async (req, res) => {
  const { estado } = req.body;
  if (!['pendiente', 'confirmada', 'rechazada'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido.' });
  }
  const reservacion = await Reservacion.findById(req.params.id);
  if (!reservacion) return res.status(404).json({ error: 'Reservación no encontrada.' });

  // No permitir confirmar una villa que ya tiene OTRA reserva confirmada
  // en fechas que se solapan (evita doble reserva de la misma villa).
  if (estado === 'confirmada') {
    const conflicto = await Reservacion.findOne({
      _id:     { $ne: reservacion._id },
      villa:   reservacion.villa,
      estado:  'confirmada',
      llegada: { $lt: reservacion.salida },
      salida:  { $gt: reservacion.llegada }
    });
    if (conflicto) {
      return res.status(409).json({
        error: `No se puede confirmar: la Villa ${reservacion.villa} ya tiene otra reserva confirmada en esas fechas.`
      });
    }
  }

  reservacion.estado = estado;
  reservacion.actualizada = new Date();
  await reservacion.save();

  let correo = null;
  let correoError;
  if (estado === 'confirmada' || estado === 'rechazada') {
    const plantilla = estado === 'confirmada'
      ? correoConfirmacion(reservacion)
      : correoRechazo(reservacion);
    try {
      await mailer.enviar({ to: reservacion.email, ...plantilla });
      correo = 'enviado';
    } catch (e) {
      console.error('No se pudo notificar al cliente por correo:', e.message);
      correo = 'fallo';
      // Solo lo ve el admin (endpoint autenticado): ayuda a diagnosticar
      // problemas de configuración del proveedor de correo.
      correoError = e.message;
    }
  }

  res.json({ ok: true, reservacion, correo, correoError });
});

// Eliminar (admin)
router.delete('/:id', requiereAuth('admin'), async (req, res) => {
  const borrada = await Reservacion.findByIdAndDelete(req.params.id);
  if (!borrada) return res.status(404).json({ error: 'Reservación no encontrada.' });
  res.json({ ok: true });
});

module.exports = router;
