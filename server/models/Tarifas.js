/**
 * models/Tarifas.js — Precios del hotel, editables desde el panel de admin.
 * Es un documento único. Si todavía no existe se usan los valores de
 * utils/precios.js (PREDETERMINADAS).
 */
const mongoose = require('mongoose');

const precio = { type: Number, required: true, min: 1, max: 1000000 };

const tarifasSchema = new mongoose.Schema({
  precioNoche: precio,   // estancias de menos de 30 noches (por noche)
  mes1:        precio,   // 1 mes (30–59 noches), por mes
  mes2:        precio,   // 2 meses (60–89 noches), por mes
  mes3:        precio,   // 3 meses o más (90+ noches), por mes
  actualizada: { type: Date, default: Date.now }
});

tarifasSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => { delete ret._id; return ret; }
});

module.exports = mongoose.model('Tarifas', tarifasSchema);
