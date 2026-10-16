/**
 * utils/precios.js — Cálculo del precio de una estancia.
 *
 *  • Menos de 30 noches: precio por noche.
 *  • 30 noches o más: tarifa MENSUAL según la duración, prorrateada por noche
 *    (un mes = 30 noches; p. ej. 45 noches = 1.5 meses a la tarifa de 1 mes):
 *        30–59 noches → mes1 (1 mes)       60–89 → mes2 (2 meses)
 *        90+ noches   → mes3 (3 meses o más)
 *  El total es el SUBTOTAL; el IVA (16%) se suma aparte en recibos y correos.
 */
const Tarifas = require('../models/Tarifas');

const NOCHES_MES = 30;
const PREDETERMINADAS = { precioNoche: 1850, mes1: 20000, mes2: 18000, mes3: 16000 };

async function obtenerTarifas() {
  const doc = await Tarifas.findOne().lean();
  if (!doc) return { ...PREDETERMINADAS };
  const { precioNoche, mes1, mes2, mes3 } = doc;
  return { precioNoche, mes1, mes2, mes3 };
}

function calcularPrecio(noches, t) {
  if (noches >= NOCHES_MES) {
    const mensual = noches >= NOCHES_MES * 3 ? t.mes3 : noches >= NOCHES_MES * 2 ? t.mes2 : t.mes1;
    return {
      tarifa: 'mensual',
      tarifaMensual: mensual,
      precioNoche: +(mensual / NOCHES_MES).toFixed(2),
      total: Math.round(noches * mensual / NOCHES_MES)
    };
  }
  return { tarifa: 'noche', tarifaMensual: null, precioNoche: t.precioNoche, total: t.precioNoche * noches };
}

module.exports = { NOCHES_MES, PREDETERMINADAS, obtenerTarifas, calcularPrecio };
