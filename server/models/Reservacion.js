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
  // Obligatorio en la página; opcional en reservas que registra el admin
  // (p. ej. una reserva por teléfono sin correo).
  email:    { type: String, default: '', trim: true, lowercase: true, maxlength: 254 },
  telefono: { type: String, default: '', trim: true, maxlength: 30 },

  villa:      { type: Number, required: true, min: 1, max: 16 },
  huespedes:  { type: String, default: '' },

  // Fechas en formato 'YYYY-MM-DD' (orden lexicográfico = orden cronológico)
  llegada: { type: String, required: true },
  salida:  { type: String, required: true },

  noches:      { type: Number, required: true },
  precioNoche: { type: Number, required: true },   // por noche (en tarifa mensual: mensual / 30)
  total:       { type: Number, required: true },   // subtotal sin IVA

  // 'noche' (menos de 30 noches) o 'mensual' (estancia larga) — ver utils/precios.js
  tarifa:        { type: String, enum: ['noche', 'mensual'], default: 'noche' },
  tarifaMensual: { type: Number, default: null },

  comentarios: { type: String, default: '', maxlength: 1000 },

  // De dónde vino la reserva (las que registra el admin pueden venir de fuera).
  origen: {
    type: String,
    enum: ['web', 'booking', 'telefono', 'whatsapp', 'otro'],
    default: 'web'
  },
  // Dinero recibido hasta ahora (MXN, con IVA). El estado del pago se deriva:
  // 0 → sin pago · menos que el total con IVA → anticipo · igual o más → pagado.
  montoPagado: { type: Number, default: 0, min: 0 },

  estado: {
    type: String,
    enum: ['pendiente', 'confirmada', 'rechazada', 'cancelada'],
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
