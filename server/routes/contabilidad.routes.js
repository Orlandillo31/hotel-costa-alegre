/**
 * contabilidad.routes.js — Resumen contable (solo admin).
 * Calcula totales SOLO con reservaciones CONFIRMADAS y desglosa la
 * ocupación e ingresos por número de villa.
 */
const express = require('express');
const router  = express.Router();

const Reservacion = require('../models/Reservacion');
const { requiereAuth } = require('../auth');

router.get('/', requiereAuth('admin'), async (req, res) => {
  const confirmadas = await Reservacion.find({ estado: 'confirmada' }).sort({ creada: -1 });

  const ingresoTotal  = confirmadas.reduce((s, r) => s + (r.total  || 0), 0);
  const nochesTotales = confirmadas.reduce((s, r) => s + (r.noches || 0), 0);

  // Desglose por villa (cuáles se reservan más y cuánto generan)
  const porVilla = {};
  confirmadas.forEach(r => {
    const clave = 'Villa ' + r.villa;
    (porVilla[clave] ||= { cantidad: 0, ingresos: 0 });
    porVilla[clave].cantidad += 1;
    porVilla[clave].ingresos += r.total;
  });

  res.json({
    totalReservacionesConfirmadas: confirmadas.length,
    nochesTotales,
    ingresoTotal,
    promedioPorReserva: confirmadas.length ? Math.round(ingresoTotal / confirmadas.length) : 0,
    porVilla,
    reservaciones: confirmadas
  });
});

module.exports = router;
