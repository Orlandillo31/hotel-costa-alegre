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

  // Ingresos por mes: cada reservación cuenta en el mes de su LLEGADA
  // ('YYYY-MM'), así la suma de todos los meses coincide con el total.
  const meses = {};
  confirmadas.forEach(r => {
    const mes = String(r.llegada).slice(0, 7);
    (meses[mes] ||= { mes, reservas: 0, noches: 0, ingresos: 0 });
    meses[mes].reservas += 1;
    meses[mes].noches   += r.noches || 0;
    meses[mes].ingresos += r.total  || 0;
  });
  const porMes = Object.values(meses).sort((a, b) => a.mes.localeCompare(b.mes));

  res.json({
    totalReservacionesConfirmadas: confirmadas.length,
    nochesTotales,
    ingresoTotal,
    promedioPorReserva: confirmadas.length ? Math.round(ingresoTotal / confirmadas.length) : 0,
    porVilla,
    porMes,
    reservaciones: confirmadas
  });
});

module.exports = router;
