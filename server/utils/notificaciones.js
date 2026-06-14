/**
 * utils/notificaciones.js — Correos al cliente al confirmar o rechazar su
 * reservación. Solo arman el contenido (subject/text/html); el envío lo
 * hace mailer.js.
 *
 * El correo de confirmación es además un COMPROBANTE de reservación con
 * desglose de IVA y los datos del establecimiento, siguiendo el formato
 * habitual de un recibo no fiscal en México. NO es un CFDI: si el cliente
 * requiere factura, debe solicitarla con su RFC (así se indica en el pie).
 */

// ---- Datos del establecimiento ----
const RAZON_SOCIAL = 'Villas Cangrejo';
const DOMICILIO    = 'Km 72, Carretera Federal 200, San Patricio-Melaque, Jalisco, México';
const TEL_HOTEL    = '+52 315 100 7106';
const EMAIL_HOTEL  = process.env.HOTEL_EMAIL || 'joseangel.hotel68@gmail.com';
const SITE_URL     = process.env.SITE_URL || 'https://hotel-costa-alegre-7wl2.onrender.com';
const LOGO_URL     = SITE_URL + '/img/logo.png';
const IVA_RATE     = 0.16;   // IVA general en México

// ---- Helpers ----
const folio = r => String(r.id || r._id || '').slice(-8).toUpperCase();
const fechaLarga = s =>
  new Date(s + 'T00:00:00').toLocaleDateString('es-MX',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const MX = n => '$' + Number(n || 0).toLocaleString('es-MX',
  { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MXN';

// Desglose de IVA asumiendo que el precio mostrado ya incluye IVA.
function desgloseIVA(total) {
  const base = +(total / (1 + IVA_RATE)).toFixed(2);
  const iva  = +(total - base).toFixed(2);
  return { base, iva, total };
}

// Encabezado con logo + razón social (tabla = compatible con Gmail/Outlook).
function encabezado(subtitulo) {
  return `
  <tr><td style="background:#0b3d4e;padding:22px 30px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="74" style="vertical-align:middle">
        <img src="${LOGO_URL}" width="64" height="64" alt="Villas Cangrejo"
             style="display:block;border:0;border-radius:50%"/>
      </td>
      <td style="vertical-align:middle;padding-left:14px">
        <div style="color:#c9a058;font-size:20px;font-weight:bold;letter-spacing:1px;font-family:Georgia,'Times New Roman',serif">VILLAS CANGREJO</div>
        <div style="color:#5ec4cc;font-size:12px;margin-top:3px">${subtitulo}</div>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="height:4px;background:#c9a058;font-size:0;line-height:0">&nbsp;</td></tr>`;
}

function pie() {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;border-top:1px solid #e5dfd0">
      <tr><td style="padding-top:14px;font-size:11px;color:#888;line-height:1.6">
        <strong>${RAZON_SOCIAL}</strong> · ${DOMICILIO}<br>
        Tel. / WhatsApp: ${TEL_HOTEL} · ${EMAIL_HOTEL}<br><br>
        <span style="color:#aaa">Este documento es un comprobante de reservación de carácter informativo y
        <strong>no constituye un Comprobante Fiscal Digital por Internet (CFDI)</strong>. Si requiere factura
        fiscal, solicítela proporcionando su RFC y uso de CFDI al correo del hotel. Precios en pesos mexicanos
        (MXN) con IVA incluido.</span>
      </td></tr>
    </table>`;
}

function envoltura(subtitulo, contenido) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f3;padding:24px 0;font-family:Arial,Helvetica,sans-serif">
   <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 6px 24px rgba(11,61,78,.12)">
      ${encabezado(subtitulo)}
      <tr><td style="padding:28px 30px;color:#222">
        ${contenido}
        ${pie()}
      </td></tr>
    </table>
   </td></tr>
  </table>`;
}

// Tabla de concepto + desglose de IVA (para el comprobante de confirmación).
function bloqueComprobante(r) {
  const { base, iva, total } = desgloseIVA(r.total);
  const fila = (k, v, extra = '') =>
    `<tr><td style="padding:7px 0;color:#666;font-size:13px">${k}</td>
     <td style="padding:7px 0;font-size:13px;text-align:right;${extra}">${v}</td></tr>`;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="margin:8px 0 4px;border:1px solid #e5dfd0;border-radius:8px">
      <tr><td style="background:#faf8f4;padding:10px 16px;font-size:11px;letter-spacing:1px;color:#0b3d4e;font-weight:bold;border-bottom:1px solid #e5dfd0">CONCEPTO</td></tr>
      <tr><td style="padding:12px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${fila('Hospedaje · Villa ' + r.villa, '')}
          ${fila('Llegada', fechaLarga(r.llegada))}
          ${fila('Salida',  fechaLarga(r.salida))}
          ${fila('Noches × precio', r.noches + ' × ' + MX(r.precioNoche))}
          ${fila('Huéspedes', r.huespedes || '—')}
        </table>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;background:#0b3d4e;border-radius:8px">
      <tr>
        <td style="padding:14px 18px;color:#fff;font-size:14px;font-weight:bold">TOTAL</td>
        <td style="padding:14px 18px;color:#c9a058;font-size:18px;font-weight:bold;text-align:right">${MX(total)}</td>
      </tr>
    </table>
    <p style="margin:6px 2px 0;font-size:11px;color:#888;text-align:right">
      Precio con IVA incluido &nbsp;·&nbsp; Base gravable: ${MX(base)} &nbsp;·&nbsp; IVA (16%): ${MX(iva)}
    </p>`;
}

function correoConfirmacion(r) {
  const { base, iva, total } = desgloseIVA(r.total);
  const contenido = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px">
      <tr>
        <td style="font-size:18px;color:#2d5a27;font-weight:bold">Reservación confirmada ✓</td>
        <td style="text-align:right;font-size:11px;color:#888">
          Folio: <strong style="color:#0b3d4e">${folio(r)}</strong><br>
          ${new Date().toLocaleDateString('es-MX')}
        </td>
      </tr>
    </table>
    <p style="font-size:14px;line-height:1.6;margin:6px 0 16px">
      Hola <strong>${r.nombre}</strong>, confirmamos tu reservación en Villas Cangrejo.
      A continuación tu comprobante:
    </p>
    <p style="font-size:12px;color:#666;margin:0 0 14px">
      <strong>Cliente:</strong> ${r.nombre} &nbsp;·&nbsp; <strong>Correo:</strong> ${r.email}
      ${r.telefono ? ' &nbsp;·&nbsp; <strong>Tel.:</strong> ' + r.telefono : ''}
    </p>
    ${bloqueComprobante(r)}
    <p style="font-size:13px;color:#444;margin-top:18px;line-height:1.6">
      🕐 <strong>Check-in:</strong> 3:00 PM &nbsp;·&nbsp; <strong>Check-out:</strong> 12:00 PM<br>
      📍 ${DOMICILIO}
    </p>`;
  return {
    subject: `Comprobante de reservación confirmada — Villa ${r.villa} · Villas Cangrejo (Folio ${folio(r)})`,
    text:
      `VILLAS CANGREJO — Comprobante de reservación\n` +
      `Folio: ${folio(r)}  ·  ${new Date().toLocaleDateString('es-MX')}\n\n` +
      `Hola ${r.nombre}, tu reservación está CONFIRMADA.\n\n` +
      `Cliente: ${r.nombre} (${r.email})\n` +
      `Villa: ${r.villa}\nLlegada: ${fechaLarga(r.llegada)} (check-in 3:00 PM)\n` +
      `Salida: ${fechaLarga(r.salida)} (check-out 12:00 PM)\n` +
      `Noches: ${r.noches} × ${MX(r.precioNoche)}\n\n` +
      `TOTAL: ${MX(total)} (IVA incluido)\n` +
      `Base gravable: ${MX(base)} · IVA (16%): ${MX(iva)}\n\n` +
      `${RAZON_SOCIAL} · ${DOMICILIO} · Tel. ${TEL_HOTEL}\n` +
      `Comprobante informativo, no es un CFDI. Para factura, solicítela con su RFC.`,
    html: envoltura('Comprobante de reservación', contenido)
  };
}

function correoRechazo(r) {
  const contenido = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px">
      <tr>
        <td style="font-size:18px;color:#0b3d4e;font-weight:bold">Sobre tu solicitud</td>
        <td style="text-align:right;font-size:11px;color:#888">Folio: <strong>${folio(r)}</strong></td>
      </tr>
    </table>
    <p style="font-size:14px;line-height:1.6">
      Hola <strong>${r.nombre}</strong>, lamentamos informarte que <strong>no pudimos confirmar</strong>
      tu solicitud para la <strong>Villa ${r.villa}</strong> del ${fechaLarga(r.llegada)} al
      ${fechaLarga(r.salida)}.
    </p>
    <p style="font-size:14px;color:#444;line-height:1.6">
      Lo más probable es que esas fechas ya estén ocupadas. Escríbenos o llámanos por WhatsApp al
      <strong>${TEL_HOTEL}</strong> y con gusto te ayudamos a encontrar otras fechas u otra de
      nuestras 16 villas. 🌊
    </p>`;
  return {
    subject: `Sobre tu solicitud de reservación — Villas Cangrejo (Folio ${folio(r)})`,
    text:
      `Hola ${r.nombre},\n\n` +
      `Lamentamos informarte que no pudimos confirmar tu solicitud para la Villa ${r.villa} ` +
      `del ${fechaLarga(r.llegada)} al ${fechaLarga(r.salida)}.\n\n` +
      `Es posible que las fechas ya no estén disponibles. Contáctanos al ${TEL_HOTEL} ` +
      `y te ayudamos a encontrar otras fechas u otra villa.\n\n— Villas Cangrejo`,
    html: envoltura('Solicitud de reservación', contenido)
  };
}

module.exports = { correoConfirmacion, correoRechazo };
