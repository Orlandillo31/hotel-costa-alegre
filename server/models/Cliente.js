/**
 * models/Cliente.js — Esquema de clientes registrados.
 * Incluye campos de seguridad para bloqueo por intentos fallidos
 * y para el flujo de recuperación de contraseña (código + expiración).
 * El hash de contraseña y los datos sensibles nunca se serializan.
 */
const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  nombre:   { type: String, required: true, trim: true, maxlength: 120 },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  telefono: { type: String, default: '', trim: true, maxlength: 30 },
  passwordHash: { type: String, required: true },

  // Seguridad: bloqueo temporal tras varios intentos fallidos (OWASP)
  intentosFallidos: { type: Number, default: 0 },
  bloqueadoHasta:   { type: Date,   default: null },

  // Recuperación de contraseña (el código se guarda hasheado)
  resetCodeHash: { type: String, default: null },
  resetExpira:   { type: Date,   default: null },
  resetIntentos: { type: Number, default: 0 },

  creado: { type: Date, default: Date.now }
});

// Al convertir a JSON: exponer 'id' y ocultar campos sensibles.
clienteSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.passwordHash;
    delete ret.resetCodeHash;
    delete ret.resetExpira;
    delete ret.resetIntentos;
    delete ret.intentosFallidos;
    delete ret.bloqueadoHasta;
    return ret;
  }
});

module.exports = mongoose.model('Cliente', clienteSchema);
