/**
 * models/Reservacion.js — Esquema de reservaciones.
 * Todas las villas son idénticas (mismo diseño y precio), así que la
 * reserva solo guarda el NÚMERO de villa (1–16) y el precio fijo por noche.
 */
const mongoose = require('mongoose');

const reservacionSchema = new mongoose.Schema({
  // Si la reserva la hizo un cliente con sesión, queda ligada a su cuenta.
  clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', default: null },

  nombre:   { type: String, required: true, trim: true, maxlength: 120 },
  email:    { type: String, required: true, trim: true, lowercase: true },
  telefono: { type: String, default: '', trim: true, maxlength: 30 },

  villa:      { type: Number, required: true, min: 1, max: 16 },
  huespedes:  { type: String, default: '' },

  // Fechas en formato 'YYYY-MM-DD' (orden lexicográfico = orden cronológico)
  llegada: { type: String, required: true },
  salida:  { type: String, required: true },

  noches:      { type: Number, required: true },
  precioNoche: { type: Number, required: true },
  total:       { type: Number, required: true },

  comentarios: { type: String, default: '', maxlength: 1000 },

  estado: {
    type: String,
    enum: ['pendiente', 'confirmada', 'rechazada'],
    default: 'pendiente'
  },

  creada:      { type: Date, default: Date.now },
  actualizada: { type: Date, default: null }
});

reservacionSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => { delete ret._id; return ret; }
});

module.exports = mongoose.model('Reservacion', reservacionSchema);
