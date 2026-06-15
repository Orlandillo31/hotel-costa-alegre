/**
 * resenas.routes.js — Reseñas de huéspedes.
 *   POST   /api/resenas         Crear reseña (público; queda pendiente de aprobar)
 *   GET    /api/resenas         Listar reseñas APROBADAS (público)
 *   GET    /api/resenas/todas   Listar todas (admin, para moderar)
 *   PATCH  /api/resenas/:id     Aprobar (admin)
 *   DELETE /api/resenas/:id     Eliminar (admin)
 */
const express = require('express');
const router  = express.Router();

const Resena = require('../models/Resena');
const { requiereAuth } = require('../auth');
const { limiterAuth } = require('../utils/seguridad');

// Crear reseña (público). limiterAuth para frenar spam.
router.post('/', limiterAuth, async (req, res) => {
  const nombre     = (req.body.nombre || '').trim();
  const comentario = (req.body.comentario || '').trim();
  const calificacion = parseInt(req.body.calificacion, 10);

  if (!nombre || !comentario) {
    return res.status(400).json({ error: 'Escribe tu nombre y tu comentario.' });
  }
  if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
    return res.status(400).json({ error: 'La calificación debe ser de 1 a 5 estrellas.' });
  }
  if (comentario.length > 600) {
    return res.status(400).json({ error: 'El comentario es demasiado largo (máx. 600 caracteres).' });
  }

  await Resena.create({
    nombre: nombre.slice(0, 80),
    calificacion,
    comentario,
    aprobada: false
  });

  res.json({ ok: true, mensaje: '¡Gracias por tu reseña! Se publicará cuando el hotel la apruebe.' });
});

// Reseñas aprobadas (público)
router.get('/', async (_req, res) => {
  const resenas = await Resena.find({ aprobada: true }).sort({ creada: -1 }).limit(60);
  res.json(resenas);
});

// Todas las reseñas (admin)
router.get('/todas', requiereAuth('admin'), async (_req, res) => {
  const resenas = await Resena.find().sort({ creada: -1 });
  res.json(resenas);
});

// Aprobar (admin)
router.patch('/:id', requiereAuth('admin'), async (req, res) => {
  const resena = await Resena.findByIdAndUpdate(req.params.id, { aprobada: true }, { new: true });
  if (!resena) return res.status(404).json({ error: 'Reseña no encontrada.' });
  res.json({ ok: true, resena });
});

// Eliminar (admin)
router.delete('/:id', requiereAuth('admin'), async (req, res) => {
  const borrada = await Resena.findByIdAndDelete(req.params.id);
  if (!borrada) return res.status(404).json({ error: 'Reseña no encontrada.' });
  res.json({ ok: true });
});

module.exports = router;
