/**
 * utils/notificaciones.js — Plantillas de correo que se envían al cliente
 * cuando el administrador confirma o rechaza su reservación.
 * Solo arman el contenido (subject/text/html); el envío lo hace mailer.js.
 */

const TEL_HOTEL = '+52 315 100 7106';

const fechaLarga = s =>
  new Date(s + 'T00:00:00').toLocaleDateString('es-MX',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const MX = n => '$' + (n || 0).toLocaleString('es-MX') + ' MXN';

// Maqueta base del correo (estilos inline: requisito de los clientes de correo)
function maqueta(tituloHtml, cuerpoHtml) {
  return `
  <div style="margin:0 auto;max-width:560px;font-family:Arial,Helvetica,sans-serif;color:#222">
    <div style="background:#0b3d4e;padding:26px 30px;border-radius:8px 8px 0 0">
      <div style="color:#c9a058;font-size:22px;font-weight:bold;letter-spacing:1px">VILLAS CANGREJO</div>
      <div style="color:#5ec4cc;font-size:12px;margin-top:4px">Costa Alegre, Jalisco, México</div>
    </div>
    <div style="height:4px;background:#c9a058"></div>
    <div style="background:#faf8f4;padding:28px 30px;border:1px solid #eee;border-top:0;border-radius:0 0 8px 8px">
      ${tituloHtml}
      ${cuerpoHtml}
      <p style="font-size:13px;color:#666;margin-top:26px">
        ¿Dudas? Llámanos o escríbenos por WhatsApp al <strong>${TEL_HOTEL}</strong>.<br>
        — El equipo de Villas Cangrejo 🦀
      </p>
    </div>
  </div>`;
}

function tablaDetalles(r) {
  const fila = (k, v) =>
    `<tr><td style="padding:6px 0;color:#666;font-size:13px">${k}</td>
     <td style="padding:6px 0;font-size:13px;text-align:right"><strong>${v}</strong></td></tr>`;
  return `
    <table style="width:100%;border-collapse:collapse;margin:14px 0;border-top:1px solid #e5dfd0;border-bottom:1px solid #e5dfd0">
      ${fila('Villa', 'Villa ' + r.villa)}
      ${fila('Huéspedes', r.huespedes || '—')}
      ${fila('Llegada', fechaLarga(r.llegada))}
      ${fila('Salida', fechaLarga(r.salida))}
      ${fila('Noches', r.noches)}
      ${fila('Precio por noche', MX(r.precioNoche))}
    </table>
    <div style="background:#0b3d4e;border-radius:6px;padding:14px 18px;display:flex">
      <span style="color:#fff;font-size:14px">TOTAL</span>
      <span style="color:#c9a058;font-size:18px;font-weight:bold;margin-left:auto">${MX(r.total)}</span>
    </div>`;
}

function correoConfirmacion(r) {
  return {
    subject: `✅ Reservación confirmada — Villa ${r.villa} · Villas Cangrejo`,
    text:
      `Hola ${r.nombre},\n\n` +
      `¡Tu reservación está CONFIRMADA!\n\n` +
      `Villa: ${r.villa}\nLlegada: ${fechaLarga(r.llegada)} (check-in 3:00 PM)\n` +
      `Salida: ${fechaLarga(r.salida)} (check-out 12:00 PM)\n` +
      `Noches: ${r.noches}\nTotal: ${MX(r.total)}\n\n` +
      `Folio: ${String(r.id || r._id || '').slice(-8).toUpperCase()}\n\n` +
      `¿Dudas? Llámanos al ${TEL_HOTEL}.\n— Villas Cangrejo`,
    html: maqueta(
      `<h2 style="color:#2d5a27;margin:0 0 6px">¡Tu reservación está confirmada! 🎉</h2>
       <p style="font-size:14px">Hola <strong>${r.nombre}</strong>, nos da mucho gusto confirmarte tu estadía.
       Tu folio es <strong>${String(r.id || r._id || '').slice(-8).toUpperCase()}</strong>.</p>`,
      tablaDetalles(r) +
      `<p style="font-size:13px;color:#444;margin-top:18px">
         🕐 <strong>Check-in:</strong> 3:00 PM &nbsp;·&nbsp; <strong>Check-out:</strong> 12:00 PM<br>
         📍 Km 72, Carretera Federal 200, Costa Alegre, Jalisco
       </p>`
    )
  };
}

function correoRechazo(r) {
  return {
    subject: `Sobre tu solicitud de reservación — Villas Cangrejo`,
    text:
      `Hola ${r.nombre},\n\n` +
      `Lamentamos informarte que no pudimos confirmar tu solicitud para la Villa ${r.villa} ` +
      `del ${fechaLarga(r.llegada)} al ${fechaLarga(r.salida)}.\n\n` +
      `Es posible que las fechas ya no estén disponibles. Contáctanos al ${TEL_HOTEL} ` +
      `y con gusto te ayudamos a encontrar otras fechas u otra villa.\n\n— Villas Cangrejo`,
    html: maqueta(
      `<h2 style="color:#0b3d4e;margin:0 0 6px">Sobre tu solicitud de reservación</h2>
       <p style="font-size:14px">Hola <strong>${r.nombre}</strong>, lamentamos informarte que
       <strong>no pudimos confirmar</strong> tu solicitud para la <strong>Villa ${r.villa}</strong>
       del ${fechaLarga(r.llegada)} al ${fechaLarga(r.salida)}.</p>`,
      `<p style="font-size:14px;color:#444">Lo más probable es que esas fechas ya estén ocupadas.
       Llámanos o escríbenos por WhatsApp al <strong>${TEL_HOTEL}</strong> y te ayudamos a
       encontrar otras fechas u otra de nuestras 16 villas. 🌊</p>`
    )
  };
}

module.exports = { correoConfirmacion, correoRechazo };
