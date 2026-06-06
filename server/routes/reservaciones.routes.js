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

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

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

  // Disponibilidad: ¿esta villa ya está reservada en fechas que se solapan?
  // (orden lexicográfico de 'YYYY-MM-DD' = orden cronológico)
  const solapada = await Reservacion.findOne({
    villa,
    estado:  { $in: ['pendiente', 'confirmada'] },
    llegada: { $lt: salida },
    salida:  { $gt: llegada }
  });
  if (solapada) {
    return res.status(409).json({
      error: `La Villa ${villa} ya está reservada en esas fechas. Elige otra villa u otras fechas.`
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

// Cambiar estado (admin)
router.patch('/:id', requiereAuth('admin'), async (req, res) => {
  const { estado } = req.body;
  if (!['pendiente', 'confirmada', 'rechazada'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido.' });
  }
  const reservacion = await Reservacion.findByIdAndUpdate(
    req.params.id,
    { estado, actualizada: new Date() },
    { new: true }
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
