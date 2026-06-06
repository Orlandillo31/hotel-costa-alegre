/**
 * models/Admin.js — Esquema del administrador.
 * Las credenciales nunca se hardcodean: el admin se crea en el primer
 * arranque a partir de las variables de entorno ADMIN_USER / ADMIN_PASS.
 */
const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  usuario: { type: String, required: true, unique: true, trim: true, index: true },
  nombre:  { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true },

  // Seguridad: mismo mecanismo de bloqueo que los clientes
  intentosFallidos: { type: Number, default: 0 },
  bloqueadoHasta:   { type: Date,   default: null },

  creado: { type: Date, default: Date.now }
});

adminSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.passwordHash;
    return ret;
  }
});

module.exports = mongoose.model('Admin', adminSchema);
