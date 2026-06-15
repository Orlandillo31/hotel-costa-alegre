/**
 * models/Resena.js — Reseñas/opiniones de los huéspedes sobre el hotel.
 * Se crean como NO aprobadas; el administrador las aprueba antes de que
 * aparezcan públicamente (moderación para evitar spam o contenido indebido).
 */
const mongoose = require('mongoose');

const resenaSchema = new mongoose.Schema({
  nombre:       { type: String, required: true, trim: true, maxlength: 80 },
  calificacion: { type: Number, required: true, min: 1, max: 5 },
  comentario:   { type: String, required: true, trim: true, maxlength: 600 },
  aprobada:     { type: Boolean, default: false },
  creada:       { type: Date, default: Date.now }
});

resenaSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => { delete ret._id; return ret; }
});

module.exports = mongoose.model('Resena', resenaSchema);
