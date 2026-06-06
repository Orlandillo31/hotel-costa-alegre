/**
 * clientes.routes.js — Gestión de clientes (solo admin).
 *   GET    /api/clientes        Listar (sin datos sensibles)
 *   DELETE /api/clientes/:id    Eliminar
 *
 * El esquema Cliente oculta automáticamente el hash y los campos de
 * seguridad al serializar a JSON (ver models/Cliente.js).
 */
const express = require('express');
const router  = express.Router();

const Cliente = require('../models/Cliente');
const { requiereAuth } = require('../auth');

router.get('/', requiereAuth('admin'), async (req, res) => {
  const clientes = await Cliente.find().sort({ creado: -1 });
  res.json(clientes);
});

router.delete('/:id', requiereAuth('admin'), async (req, res) => {
  const borrado = await Cliente.findByIdAndDelete(req.params.id);
  if (!borrado) return res.status(404).json({ error: 'Cliente no encontrado.' });
  res.json({ ok: true });
});

module.exports = router;
