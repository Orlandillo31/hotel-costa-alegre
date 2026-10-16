/**
 * tarifas.routes.js — Precios del hotel.
 *   GET /api/tarifas   Precios vigentes (público: la página los muestra)
 *   PUT /api/tarifas   Cambiarlos (admin)
 * Cambiar las tarifas NO modifica reservas ya hechas: cada reserva guarda el
 * precio con el que se creó.
 */
const express = require('express');
const router  = express.Router();

const Tarifas = require('../models/Tarifas');
const { requiereAuth } = require('../auth');
const { obtenerTarifas } = require('../utils/precios');

const CAMPOS = ['precioNoche', 'mes1', 'mes2', 'mes3'];

router.get('/', async (_req, res) => {
  res.json(await obtenerTarifas());
});

router.put('/', requiereAuth('admin'), async (req, res) => {
  const nuevas = {};
  for (const c of CAMPOS) {
    const v = Number(req.body[c]);
    if (!Number.isInteger(v) || v < 1 || v > 1000000) {
      return res.status(400).json({ error: 'Los precios deben ser números enteros mayores a 0.' });
    }
    nuevas[c] = v;
  }
  await Tarifas.findOneAndUpdate({}, { ...nuevas, actualizada: new Date() }, { upsert: true, runValidators: true });
  res.json({ ok: true, tarifas: nuevas });
});

module.exports = router;
