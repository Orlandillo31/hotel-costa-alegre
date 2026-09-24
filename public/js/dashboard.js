/* ============================================================
 *  VILLAS CANGREJO — Lógica de Login, Cliente y Administrador
 * ============================================================
 *  Habla con el backend Node.js (server/server.js) vía fetch().
 *  Maneja:
 *    • Modal de login / registro / recuperación de contraseña
 *    • Panel de cliente (sus reservaciones)
 *    • Panel de administrador (reservaciones, clientes, contabilidad)
 *    • Exportación a Excel (usa SheetJS cargado en index.html)
 * ============================================================ */

(function () {
  'use strict';

  // -----------------------------------------------------------
  //  URL base del backend.
  //  - Si la página se sirve desde el servidor Node (localhost:3000
  //    o un dominio público tipo ngrok) → mismo origen ('').
  //  - Si se abre con doble clic (protocolo file://) o desde un
  //    preview de Claude → apuntar explícitamente a localhost:3000.
  // -----------------------------------------------------------
  const API = (function () {
    const proto = window.location.protocol;
    const host  = window.location.hostname;
    // Si la página está cargada directamente del filesystem
    // o el host está vacío, no hay servidor en mismo origen.
    if (proto === 'file:' || !host) return 'http://localhost:3000';
    return '';
  })();

  // -------- Estado de sesión guardado en sessionStorage --------
  const SESION_KEY = 'hca_sesion';
  function getSesion() {
    try { return JSON.parse(sessionStorage.getItem(SESION_KEY)) || null; }
    catch { return null; }
  }
  function setSesion(s) { sessionStorage.setItem(SESION_KEY, JSON.stringify(s)); }
  function limpiarSesion() { sessionStorage.removeItem(SESION_KEY); }

  // -------- Helper fetch con token de auth --------
  async function api(ruta, opciones = {}) {
    const sesion = getSesion();
    const headers = Object.assign(
      { 'Content-Type': 'application/json' },
      opciones.headers || {},
      sesion ? { 'Authorization': 'Bearer ' + sesion.token } : {}
    );
    let resp;
    try {
      resp = await fetch(API + ruta, Object.assign({}, opciones, { headers }));
    } catch (errRed) {
      // Falla típica: el servidor Node no está corriendo, o la página
      // se abrió con doble clic en lugar de http://localhost:3000
      throw new Error(
        'No se pudo conectar con el servidor. Asegúrate de que el ' +
        'servidor Node esté corriendo (npm start) y abre la página ' +
        'en http://localhost:3000'
      );
    }
    let data = null;
    try { data = await resp.json(); } catch { /* sin cuerpo */ }
    if (!resp.ok) {
      throw new Error((data && data.error) || ('Error ' + resp.status));
    }
    return data;
  }

  // -------- Formateadores --------
  const fmtDinero = n => '$' + (n || 0).toLocaleString('es-MX');
  const fmtFecha  = s => s ? new Date(s).toLocaleDateString('es-MX') : '';
  const fmtVilla  = v => 'Villa ' + v;
  const COLOR_ESTADO = {
    pendiente:  'estado-pendiente',
    confirmada: 'estado-confirmada',
    rechazada:  'estado-rechazada'
  };

  // =========================================================
  // MODAL DE LOGIN
  // =========================================================
  const modal       = document.getElementById('modal-login');
  const modalMsg    = document.getElementById('modal-mensaje');
  const btnAbrir    = document.getElementById('btn-abrir-login');
  const btnCerrar   = document.getElementById('modal-cerrar');
  const modalTabs   = document.querySelectorAll('.modal-tab');
  const modalForms  = document.querySelectorAll('.modal-form');

  function abrirModal() {
    modal.style.display = 'flex';
    modalMsg.textContent = '';
    document.body.style.overflow = 'hidden';
  }
  function cerrarModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
  function mostrarMsg(texto, esError) {
    modalMsg.textContent = texto;
    modalMsg.className = 'modal-mensaje ' + (esError ? 'error' : 'ok');
  }

  if (btnAbrir)  btnAbrir.addEventListener('click',  (e) => { e.preventDefault(); abrirModal(); });
  if (btnCerrar) btnCerrar.addEventListener('click', cerrarModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });

  // Cambiar entre pestañas del modal
  modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      modalTabs.forEach(t => t.classList.remove('activo'));
      tab.classList.add('activo');
      const objetivo = tab.dataset.modalTab;
      modalForms.forEach(f => f.classList.remove('activo'));
      const map = {
        'login':            'form-login',
        'registro-cliente': 'form-registro-cliente'
      };
      document.getElementById(map[objetivo]).classList.add('activo');
      modalMsg.textContent = '';
    });
  });

  // ----- Login único -----
  // El servidor identifica en la BD si la cuenta es de un huésped o del
  // administrador y devuelve el rol; aquí solo se abre el panel que toca.
  // Cuenta los fallos para sugerir la recuperación tras varios intentos.
  let fallosLogin = 0;
  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          usuario:  document.getElementById('login-usuario').value.trim(),
          password: document.getElementById('login-pass').value
        })
      });
      fallosLogin = 0;
      // No dejar las credenciales escritas: tras cerrar sesión, en un equipo
      // compartido (p. ej. recepción) bastaría con volver a pulsar "Entrar".
      e.target.reset();
      setSesion({ token: data.token, rol: data.rol, nombre: data.nombre, email: data.email });
      cerrarModal();
      aplicarSesion();
      if (data.rol === 'admin') mostrarPanelAdmin();
      else mostrarPanelCliente();
    } catch (err) {
      fallosLogin++;
      // Tras 3 fallos (o si el backend bloqueó la cuenta) destacar la recuperación.
      const sugerir = fallosLogin >= 3 || /bloquead/i.test(err.message);
      mostrarMsg(err.message + (sugerir ? ' — ¿Olvidaste tu contraseña? Usa el enlace de abajo.' : ''), true);
      if (sugerir) document.getElementById('link-olvide').classList.add('resaltado');
    }
  });

  // ----- Registro cliente -----
  document.getElementById('form-registro-cliente').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/api/auth/registro', {
        method: 'POST',
        body: JSON.stringify({
          nombre:   document.getElementById('reg-nombre').value.trim(),
          email:    document.getElementById('reg-email').value.trim(),
          telefono: document.getElementById('reg-telefono').value.trim(),
          password: document.getElementById('reg-pass').value
        })
      });
      // Cambiar a la pestaña de login (el clic limpia el mensaje, así que va después)
      document.querySelector('.modal-tab[data-modal-tab="login"]').click();
      document.getElementById('login-usuario').value = document.getElementById('reg-email').value.trim();
      mostrarMsg('✅ Cuenta creada. Ahora inicia sesión.', false);
    } catch (err) {
      mostrarMsg(err.message, true);
    }
  });

  // =========================================================
  // RECUPERACIÓN DE CONTRASEÑA (cliente)
  // =========================================================
  function mostrarSoloForm(id) {
    modalForms.forEach(f => f.classList.remove('activo'));
    document.getElementById(id).classList.add('activo');
    modalMsg.textContent = '';
  }

  // Abrir el formulario de recuperación desde el login
  document.getElementById('link-olvide').addEventListener('click', (e) => {
    e.preventDefault();
    modalTabs.forEach(t => t.classList.remove('activo'));
    document.getElementById('reset-paso-1').style.display = '';
    document.getElementById('reset-paso-2').style.display = 'none';
    const escrito = document.getElementById('login-usuario').value.trim();
    document.getElementById('reset-email').value = escrito.includes('@') ? escrito : '';
    mostrarSoloForm('form-recuperar');
  });

  // Volver al login
  document.getElementById('link-volver-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('.modal-tab[data-modal-tab="login"]').click();
  });

  // Paso 1: solicitar el código de recuperación
  document.getElementById('btn-enviar-codigo').addEventListener('click', async () => {
    const email = document.getElementById('reset-email').value.trim();
    if (!email) { mostrarMsg('Ingresa tu correo electrónico.', true); return; }
    try {
      const data = await api('/api/auth/recuperar', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      let msg = data.mensaje || 'Si el correo está registrado, enviamos un código.';
      if (data.codigoDev) {            // modo desarrollo sin correo configurado
        msg += ' (código de prueba: ' + data.codigoDev + ')';
        document.getElementById('reset-codigo').value = data.codigoDev;
      }
      mostrarMsg(msg, false);
      document.getElementById('reset-paso-1').style.display = 'none';
      document.getElementById('reset-paso-2').style.display = '';
    } catch (err) {
      mostrarMsg(err.message, true);
    }
  });

  // Paso 2: restablecer la contraseña con el código
  document.getElementById('form-recuperar').addEventListener('submit', async (e) => {
    e.preventDefault();
    // Solo procesar si estamos en el paso 2 (evita envío con Enter en paso 1)
    if (document.getElementById('reset-paso-2').style.display === 'none') return;
    const email  = document.getElementById('reset-email').value.trim();
    const codigo = document.getElementById('reset-codigo').value.trim();
    const nuevaPassword = document.getElementById('reset-nueva').value;
    try {
      const data = await api('/api/auth/restablecer', {
        method: 'POST',
        body: JSON.stringify({ email, codigo, nuevaPassword })
      });
      setTimeout(() => {
        document.querySelector('.modal-tab[data-modal-tab="login"]').click();
        document.getElementById('login-usuario').value = email;
        mostrarMsg(data.mensaje || 'Contraseña actualizada. Inicia sesión.', false);
      }, 1200);
      mostrarMsg(data.mensaje || 'Contraseña actualizada.', false);
    } catch (err) {
      mostrarMsg(err.message, true);
    }
  });

  // =========================================================
  // NAVBAR — mostrar/ocultar links según sesión
  // =========================================================
  function aplicarSesion() {
    const s = getSesion();
    document.getElementById('nav-sesion-publica').style.display = s ? 'none' : '';
    document.getElementById('nav-sesion-cliente').style.display = (s && s.rol === 'cliente') ? '' : 'none';
    document.getElementById('nav-sesion-admin').style.display   = (s && s.rol === 'admin')   ? '' : 'none';
  }

  document.getElementById('btn-ir-cliente').addEventListener('click', (e) => {
    e.preventDefault();
    mostrarPanelCliente();
  });
  document.getElementById('btn-ir-admin').addEventListener('click', (e) => {
    e.preventDefault();
    mostrarPanelAdmin();
  });

  // =========================================================
  // PANEL CLIENTE
  // =========================================================
  async function mostrarPanelCliente() {
    const s = getSesion();
    if (!s || s.rol !== 'cliente') return;

    const panel = document.getElementById('panel-cliente');
    document.getElementById('cliente-nombre').textContent = s.nombre;
    panel.style.display = 'block';
    document.getElementById('panel-admin').style.display = 'none';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const reservas = await api('/api/reservaciones/mis');
      const tbody = document.getElementById('cliente-tbody');
      const vacio = document.getElementById('cliente-vacio');
      tbody.innerHTML = '';
      if (!reservas.length) {
        vacio.style.display = 'block';
      } else {
        vacio.style.display = 'none';
        reservas.forEach(r => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${fmtVilla(r.villa)}</td>
            <td>${fmtFecha(r.llegada)}</td>
            <td>${fmtFecha(r.salida)}</td>
            <td>${r.noches}</td>
            <td>${fmtDinero(r.total)}</td>
            <td><span class="badge ${COLOR_ESTADO[r.estado]}">${r.estado}</span></td>
          `;
          tbody.appendChild(tr);
        });
      }
    } catch (err) {
      alert('Error cargando reservaciones: ' + err.message);
    }
  }

  document.getElementById('btn-logout-cliente').addEventListener('click', cerrarSesion);
  document.getElementById('btn-logout-admin').addEventListener('click', cerrarSesion);

  async function cerrarSesion() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* ignorar */ }
    limpiarSesion();
    document.getElementById('panel-cliente').style.display = 'none';
    document.getElementById('panel-admin').style.display = 'none';
    aplicarSesion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // =========================================================
  // PANEL ADMIN
  // =========================================================
  async function mostrarPanelAdmin() {
    const s = getSesion();
    if (!s || s.rol !== 'admin') return;

    document.getElementById('panel-admin').style.display = 'block';
    document.getElementById('panel-cliente').style.display = 'none';
    document.getElementById('panel-admin').scrollIntoView({ behavior: 'smooth', block: 'start' });

    await Promise.all([
      cargarReservacionesAdmin(),
      cargarClientesAdmin(),
      cargarContabilidad(),
      cargarResenasAdmin()
    ]);
    renderCalendario();   // usa reservasAdminCache ya cargado
  }

  // Cambiar tabs dentro del panel admin
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('activo'));
      tab.classList.add('activo');
      const objetivo = tab.dataset.adminTab;
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('activo'));
      document.getElementById('admin-panel-' + objetivo).classList.add('activo');
    });
  });

  // ----- Lista de reservaciones (admin) -----
  let reservasAdminCache = [];   // para generar recibos sin volver a pedir datos
  async function cargarReservacionesAdmin() {
    try {
      const reservas = await api('/api/reservaciones');
      reservasAdminCache = reservas;
      const tbody = document.getElementById('admin-tbody-reservaciones');
      const vacio = document.getElementById('admin-reservaciones-vacio');
      tbody.innerHTML = '';
      if (!reservas.length) { vacio.style.display = 'block'; return; }
      vacio.style.display = 'none';

      // Ordenar de más reciente a más antigua
      reservas.sort((a, b) => new Date(b.creada) - new Date(a.creada));

      reservas.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${r.nombre}</td>
          <td>${r.email}<br><small>${r.telefono || '—'}</small></td>
          <td>${fmtVilla(r.villa)}<br><small>${r.huespedes} huésped(es)</small></td>
          <td>${fmtFecha(r.llegada)} →<br>${fmtFecha(r.salida)}</td>
          <td>${r.noches}</td>
          <td>${fmtDinero(r.total)}</td>
          <td><span class="badge ${COLOR_ESTADO[r.estado]}">${r.estado}</span></td>
          <td class="acciones-celda">
            ${r.estado !== 'confirmada' ? `<button class="btn-mini confirmar" data-id="${r.id}">✓ Confirmar</button>` : ''}
            ${r.estado !== 'rechazada'  ? `<button class="btn-mini rechazar"  data-id="${r.id}">✗ Rechazar</button>` : ''}
            <button class="btn-mini recibo" data-id="${r.id}">🧾 Recibo</button>
            <button class="btn-mini eliminar" data-id="${r.id}">🗑</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Wire-up de los botones de acción
      tbody.querySelectorAll('.btn-mini.confirmar').forEach(b => {
        b.addEventListener('click', () => cambiarEstado(b.dataset.id, 'confirmada'));
      });
      tbody.querySelectorAll('.btn-mini.rechazar').forEach(b => {
        b.addEventListener('click', () => cambiarEstado(b.dataset.id, 'rechazada'));
      });
      tbody.querySelectorAll('.btn-mini.eliminar').forEach(b => {
        b.addEventListener('click', () => eliminarReserva(b.dataset.id));
      });
      tbody.querySelectorAll('.btn-mini.recibo').forEach(b => {
        b.addEventListener('click', () => generarRecibo(b.dataset.id));
      });
    } catch (err) {
      alert('Error cargando reservaciones: ' + err.message);
    }
  }

  // ----- Generar recibo premium de una reservación en PDF (admin) -----
  async function generarRecibo(id) {
    const r = reservasAdminCache.find(x => x.id === id);
    if (!r) { alert('No se encontró la reservación.'); return; }
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('La librería para generar el PDF no se cargó. Verifica tu conexión a internet.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    const OCEANO = [11, 61, 78], ORO = [201, 160, 88], GRIS = [110, 110, 110], OSC = [25, 25, 25];
    const RAZON = 'Villas Cangrejo';
    const DOMICILIO = 'Km 72, Carr. Federal 200, San Patricio-Melaque, Jalisco';
    const TEL = '+52 315 100 7106', CORREO = 'joseangel.hotel68@gmail.com';
    const folio = String(r.id || '').slice(-8).toUpperCase();
    const MX = n => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const IVA_RATE = 0.16;
    const subtotal  = r.total;                              // noches × precio
    const iva       = +(subtotal * IVA_RATE).toFixed(2);    // 16% sobre el subtotal
    const granTotal = +(subtotal + iva).toFixed(2);         // total a pagar

    // Cargar el logo como dataURL PNG (más compatible con jsPDF que pasar
    // el elemento <img>). Si algo falla, el recibo se genera igual sin él.
    const logoData = await (async () => {
      try {
        const img = await new Promise((ok, no) => {
          const im = new Image();
          im.onload = () => ok(im);
          im.onerror = no;
          im.src = 'img/logo.png?v=3';
        });
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth || 512;
        cv.height = img.naturalHeight || 512;
        cv.getContext('2d').drawImage(img, 0, 0);
        return cv.toDataURL('image/png');
      } catch (e) {
        console.warn('No se pudo cargar el logo para el recibo:', e);
        return null;
      }
    })();

    // ---- Encabezado ----
    doc.setFillColor(...OCEANO); doc.rect(0, 0, W, 110, 'F');
    doc.setFillColor(...ORO);    doc.rect(0, 110, W, 4, 'F');
    if (logoData) doc.addImage(logoData, 'PNG', 40, 23, 64, 64);
    const xT = logoData ? 118 : 40;
    doc.setTextColor(...ORO); doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.text('VILLAS CANGREJO', xT, 46);
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text('Recibo de reservación', xT, 63);
    doc.setFontSize(8); doc.setTextColor(200, 220, 225);
    doc.text(DOMICILIO, xT, 79);
    doc.text('Tel. ' + TEL + '   ·   ' + CORREO, xT, 91);
    doc.setTextColor(255, 255, 255); doc.setFontSize(9);
    doc.text('FOLIO: ' + folio, W - 40, 40, { align: 'right' });
    doc.text('Emisión: ' + new Date().toLocaleDateString('es-MX'), W - 40, 56, { align: 'right' });
    doc.text('Lugar: Melaque, Jalisco', W - 40, 72, { align: 'right' });

    // Layout a todo el ancho (márgenes simétricos de 40 pt)
    const M = 40, R = W - 40, CW = R - M;
    const fechaCorta = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('es-MX') : '—';
    let y = 148;

    const tituloSec = (txt, x, ancho) => {
      doc.setTextColor(...OCEANO); doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5);
      doc.text(txt, x, y);
      doc.setDrawColor(...ORO); doc.setLineWidth(1); doc.line(x, y + 5, x + ancho, y + 5);
    };

    // ---- Dos columnas simétricas: cliente | reservación ----
    const colGap = 24;
    const colW = (CW - colGap) / 2;
    const c1 = M, c2 = M + colW + colGap;
    tituloSec('Datos del cliente', c1, colW);
    tituloSec('Datos de la reservación', c2, colW);
    y += 22;

    const campo = (x, label, valor, yy) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...GRIS);
      doc.text(label.toUpperCase(), x, yy);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...OSC);
      const lineas = doc.splitTextToSize(String(valor == null || valor === '' ? '—' : valor), colW - 4);
      doc.text(lineas, x, yy + 13);
    };
    const ROW = 34;
    campo(c1, 'Nombre',             r.nombre,                              y);
    campo(c2, 'Villa',              'Villa ' + r.villa,                    y);
    campo(c1, 'Correo electrónico', r.email,                               y + ROW);
    campo(c2, 'Huéspedes',          r.huespedes,                           y + ROW);
    campo(c1, 'Teléfono',           r.telefono || 'No proporcionado',      y + ROW * 2);
    campo(c2, 'Estado',             String(r.estado || '').toUpperCase(),  y + ROW * 2);
    y += ROW * 3 + 6;

    // ---- Tabla de concepto a todo el ancho ----
    const cDesc = M + 12, cNoches = M + CW * 0.56, cPU = M + CW * 0.76, cImp = R - 12;
    doc.setFillColor(...OCEANO); doc.rect(M, y, CW, 22, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text('DESCRIPCIÓN', cDesc, y + 14);
    doc.text('NOCHES', cNoches, y + 14, { align: 'center' });
    doc.text('P. UNITARIO', cPU, y + 14, { align: 'right' });
    doc.text('IMPORTE', cImp, y + 14, { align: 'right' });
    y += 22;
    doc.setTextColor(...OSC); doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
    doc.text('Hospedaje · Villa ' + r.villa, cDesc, y + 16);
    doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text(fechaCorta(r.llegada) + ' al ' + fechaCorta(r.salida) + '  (' + r.noches + ' noches)', cDesc, y + 28);
    doc.setFontSize(10.5); doc.setTextColor(...OSC);
    doc.text(String(r.noches), cNoches, y + 16, { align: 'center' });
    doc.text(MX(r.precioNoche), cPU, y + 16, { align: 'right' });
    doc.text(MX(r.total), cImp, y + 16, { align: 'right' });
    doc.setDrawColor(230, 224, 208); doc.setLineWidth(0.6); doc.line(M, y + 40, R, y + 40);
    y += 56;

    // ---- Forma de pago (izquierda) + totales (derecha), mismo nivel ----
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text('FORMA DE PAGO', M, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...OSC);
    doc.text('Por confirmar con el hotel', M, y + 14);
    doc.setFontSize(9); doc.setTextColor(...GRIS);
    doc.text('Check-in 3:00 PM  ·  Check-out 12:00 PM', M, y + 30);

    const totBoxX = R - 250, totLbl = R - 238, totVal = R - 12;
    let ty = y;
    const importe = (l, v) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...GRIS);
      doc.text(l, totBoxX, ty);
      doc.setTextColor(...OSC); doc.text(v, totVal, ty, { align: 'right' });
      ty += 19;
    };
    importe('Subtotal', MX(subtotal) + ' MXN');
    importe('IVA (16%)', MX(iva) + ' MXN');
    doc.setFillColor(...OCEANO); doc.rect(totBoxX, ty - 2, R - totBoxX, 32, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('TOTAL', totLbl, ty + 19);
    doc.setTextColor(...ORO); doc.setFontSize(14);
    doc.text(MX(granTotal) + ' MXN', totVal, ty + 20, { align: 'right' });

    // ---- Nota legal al pie ----
    doc.setDrawColor(230, 224, 208); doc.setLineWidth(0.8); doc.line(40, H - 96, W - 40, H - 96);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIS);
    const nota =
      'Comprobante de reservación de carácter informativo. No constituye un Comprobante Fiscal Digital ' +
      'por Internet (CFDI). Si requiere factura fiscal, solicítela proporcionando su RFC y uso de CFDI al ' +
      'correo del hotel. Importes en pesos mexicanos (MXN); el total incluye IVA del 16%.';
    doc.text(doc.splitTextToSize(nota, W - 80), 40, H - 82);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...OCEANO);
    doc.text(RAZON + ' · ' + DOMICILIO, 40, H - 40);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRIS);
    doc.text('¡Gracias por su preferencia!', 40, H - 28);

    doc.save('Recibo_VillasCangrejo_' + folio + '.pdf');
  }

  async function cambiarEstado(id, estado) {
    try {
      const data = await api('/api/reservaciones/' + id, {
        method: 'PATCH',
        body: JSON.stringify({ estado })
      });
      // El backend notifica al cliente por correo al confirmar/rechazar;
      // solo avisamos al admin si ese correo no se pudo enviar.
      if (data.correo === 'fallo') {
        alert('El estado se actualizó, pero el correo de aviso al cliente NO se pudo enviar. Contáctalo manualmente.');
      }
      await Promise.all([cargarReservacionesAdmin(), cargarContabilidad()]);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function eliminarReserva(id) {
    if (!confirm('¿Eliminar esta reservación de forma permanente?')) return;
    try {
      await api('/api/reservaciones/' + id, { method: 'DELETE' });
      await Promise.all([cargarReservacionesAdmin(), cargarContabilidad()]);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  // ----- Lista de clientes (admin) -----
  async function cargarClientesAdmin() {
    try {
      const clientes = await api('/api/clientes');
      const tbody = document.getElementById('admin-tbody-clientes');
      const vacio = document.getElementById('admin-clientes-vacio');
      tbody.innerHTML = '';
      if (!clientes.length) { vacio.style.display = 'block'; return; }
      vacio.style.display = 'none';
      clientes.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${c.nombre}</td>
          <td>${c.email}</td>
          <td>${c.telefono || '—'}</td>
          <td>${fmtFecha(c.creado)}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      alert('Error cargando clientes: ' + err.message);
    }
  }

  // ----- Contabilidad (admin) -----
  let datosContabilidad = null;
  async function cargarContabilidad() {
    try {
      const c = await api('/api/contabilidad');
      datosContabilidad = c;
      document.getElementById('conta-total-reservas').textContent = c.totalReservacionesConfirmadas;
      document.getElementById('conta-noches').textContent = c.nochesTotales;
      document.getElementById('conta-ingreso').textContent = fmtDinero(c.ingresoTotal);
      document.getElementById('conta-promedio').textContent = fmtDinero(c.promedioPorReserva);

      const tbody = document.getElementById('conta-tbody-desglose');
      tbody.innerHTML = '';
      const villas = Object.keys(c.porVilla || {});
      if (!villas.length) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;opacity:.6">Aún no hay reservaciones confirmadas.</td></tr>';
        return;
      }
      villas.forEach(t => {
        const row = c.porVilla[t];
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${t}</td>
          <td>${row.cantidad}</td>
          <td>${fmtDinero(row.ingresos)}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      alert('Error cargando contabilidad: ' + err.message);
    }
  }

  // ----- Exportar a Excel (.xlsx) -----
  document.getElementById('btn-exportar-excel').addEventListener('click', () => {
    if (!datosContabilidad) {
      alert('Aún no se cargaron los datos. Intenta de nuevo en un momento.');
      return;
    }
    if (typeof XLSX === 'undefined') {
      alert('La librería de Excel no está cargada. Verifica tu conexión a internet.');
      return;
    }

    const c = datosContabilidad;
    const wb = XLSX.utils.book_new();
    const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
    const fechaCorta = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('es-MX') : '';

    // ---------- Hoja 1: Resumen ----------
    const resumen = [
      ['VILLAS CANGREJO'],
      ['Reporte de contabilidad · reservaciones CONFIRMADAS'],
      ['Generado el:', new Date().toLocaleString('es-MX')],
      [],
      ['Indicador', 'Valor'],
      ['Reservaciones confirmadas', c.totalReservacionesConfirmadas],
      ['Noches vendidas',            c.nochesTotales],
      ['Ingreso total (MXN)',        c.ingresoTotal],
      ['Promedio por reserva (MXN)', c.promedioPorReserva],
      [],
      ['DESGLOSE POR VILLA', '', ''],
      ['Villa', 'Reservas confirmadas', 'Ingresos (MXN)']
    ];
    Object.keys(c.porVilla || {}).forEach(t => {
      resumen.push([t, c.porVilla[t].cantidad, c.porVilla[t].ingresos]);
    });
    resumen.push(['TOTAL', c.totalReservacionesConfirmadas, c.ingresoTotal]);

    const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
    wsResumen['!cols']   = [{ wch: 30 }, { wch: 22 }, { wch: 20 }];
    wsResumen['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },   // título
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },   // subtítulo
      { s: { r: 10, c: 0 }, e: { r: 10, c: 2 } }  // "DESGLOSE POR VILLA"
    ];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // ---------- Hoja 2: Detalle de reservaciones ----------
    const encabezados = [
      'Folio', 'Cliente', 'Correo', 'Teléfono', 'Villa', 'Huéspedes',
      'Llegada', 'Salida', 'Noches', 'Precio/noche (MXN)', 'Total (MXN)', 'Estado', 'Fecha de solicitud'
    ];
    const filas = c.reservaciones.map(r => ([
      String(r.id || '').slice(-8).toUpperCase(),
      r.nombre, r.email, r.telefono || '',
      'Villa ' + r.villa, r.huespedes,
      fechaCorta(r.llegada), fechaCorta(r.salida),
      r.noches, r.precioNoche, r.total, cap(r.estado),
      new Date(r.creada).toLocaleDateString('es-MX')
    ]));
    const totNoches  = c.reservaciones.reduce((s, r) => s + (r.noches || 0), 0);
    const totIngreso = c.reservaciones.reduce((s, r) => s + (r.total  || 0), 0);
    const filaTotales = ['', '', '', '', '', '', '', 'TOTALES', totNoches, '', totIngreso, '', ''];

    const wsDetalle = XLSX.utils.aoa_to_sheet([encabezados, ...filas, [], filaTotales]);
    wsDetalle['!cols'] = [
      { wch: 10 }, { wch: 24 }, { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 11 },
      { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 16 }
    ];
    // Autofiltro en los encabezados para ordenar/filtrar fácilmente
    wsDetalle['!autofilter'] = { ref: 'A1:M' + (filas.length + 1) };
    XLSX.utils.book_append_sheet(wb, wsDetalle, 'Reservaciones');

    XLSX.writeFile(wb, `Contabilidad_VillasCangrejo_${new Date().toISOString().split('T')[0]}.xlsx`);
  });

  // Escapar HTML en contenido de usuario (reseñas) para evitar XSS.
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // =========================================================
  // CALENDARIO DE OCUPACIÓN (admin) — llegadas y salidas
  // =========================================================
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const calMes = new Date(); calMes.setDate(1);

  function renderCalendario() {
    const grid = document.getElementById('cal-grid');
    if (!grid) return;
    const titulo = document.getElementById('cal-titulo');
    const anio = calMes.getFullYear(), mes = calMes.getMonth();
    titulo.textContent = MESES[mes] + ' ' + anio;

    const confirmadas = reservasAdminCache.filter(r => r.estado === 'confirmada');
    const primerDia = new Date(anio, mes, 1).getDay();          // 0 = Domingo
    const diasMes = new Date(anio, mes + 1, 0).getDate();

    let html = '';
    for (let i = 0; i < primerDia; i++) html += '<div class="cal-celda vacia"></div>';
    for (let d = 1; d <= diasMes; d++) {
      const fecha = anio + '-' + String(mes + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const llegadas = confirmadas.filter(r => r.llegada === fecha);
      const salidas  = confirmadas.filter(r => r.salida === fecha);
      const ocupada  = confirmadas.some(r => r.llegada <= fecha && r.salida > fecha);
      let chips = '';
      llegadas.forEach(r => chips += `<span class="cal-chip llegada" title="Llegada: ${esc(r.nombre)} — Villa ${r.villa}">↘ V${r.villa}</span>`);
      salidas.forEach(r => chips += `<span class="cal-chip salida" title="Salida: ${esc(r.nombre)} — Villa ${r.villa}">↗ V${r.villa}</span>`);
      html += `<div class="cal-celda${ocupada ? ' ocupada' : ''}">` +
              `<span class="cal-dia">${d}</span><div class="cal-chips">${chips}</div></div>`;
    }
    grid.innerHTML = html;
  }

  (function initCalendarioNav() {
    const prev = document.getElementById('cal-prev'), next = document.getElementById('cal-next');
    if (prev) prev.addEventListener('click', () => { calMes.setMonth(calMes.getMonth() - 1); renderCalendario(); });
    if (next) next.addEventListener('click', () => { calMes.setMonth(calMes.getMonth() + 1); renderCalendario(); });
  })();

  // =========================================================
  // RESEÑAS — moderación (admin) y vista pública
  // =========================================================
  async function cargarResenasAdmin() {
    const cont = document.getElementById('admin-resenas-lista');
    if (!cont) return;
    try {
      const resenas = await api('/api/resenas/todas');
      const vacio = document.getElementById('admin-resenas-vacio');
      cont.innerHTML = '';
      if (!resenas.length) { if (vacio) vacio.style.display = 'block'; return; }
      if (vacio) vacio.style.display = 'none';
      resenas.forEach(r => {
        const div = document.createElement('div');
        div.className = 'admin-resena' + (r.aprobada ? ' aprobada' : '');
        div.innerHTML = `
          <div class="admin-resena-top">
            <strong>${esc(r.nombre)}</strong>
            <span class="resena-estrellas">${'★'.repeat(r.calificacion)}${'☆'.repeat(5 - r.calificacion)}</span>
            <span class="admin-resena-estado">${r.aprobada ? '✓ Publicada' : '⏳ Pendiente'}</span>
          </div>
          <p class="admin-resena-texto">${esc(r.comentario)}</p>
          <div class="acciones-celda">
            ${!r.aprobada ? `<button class="btn-mini confirmar" data-id="${r.id}">✓ Aprobar</button>` : ''}
            <button class="btn-mini eliminar" data-id="${r.id}">🗑 Eliminar</button>
          </div>`;
        cont.appendChild(div);
      });
      cont.querySelectorAll('.btn-mini.confirmar').forEach(b => b.addEventListener('click', () => aprobarResena(b.dataset.id)));
      cont.querySelectorAll('.btn-mini.eliminar').forEach(b => b.addEventListener('click', () => eliminarResena(b.dataset.id)));
    } catch (err) {
      console.error('Error cargando reseñas:', err.message);
    }
  }

  async function aprobarResena(id) {
    try { await api('/api/resenas/' + id, { method: 'PATCH' }); cargarResenasAdmin(); cargarResenasPublicas(); }
    catch (err) { alert('Error: ' + err.message); }
  }
  async function eliminarResena(id) {
    if (!confirm('¿Eliminar esta reseña de forma permanente?')) return;
    try { await api('/api/resenas/' + id, { method: 'DELETE' }); cargarResenasAdmin(); cargarResenasPublicas(); }
    catch (err) { alert('Error: ' + err.message); }
  }

  async function cargarResenasPublicas() {
    const grid = document.getElementById('resenas-grid');
    if (!grid) return;
    const vacio = document.getElementById('resenas-vacio');
    try {
      const resenas = await api('/api/resenas');
      grid.innerHTML = '';
      if (!resenas.length) { if (vacio) vacio.style.display = 'block'; return; }
      if (vacio) vacio.style.display = 'none';
      resenas.forEach(r => {
        const div = document.createElement('div');
        div.className = 'resena-card';
        div.innerHTML = `
          <div class="resena-estrellas">${'★'.repeat(r.calificacion)}${'☆'.repeat(5 - r.calificacion)}</div>
          <p class="resena-texto">“${esc(r.comentario)}”</p>
          <p class="resena-autor">— ${esc(r.nombre)}</p>`;
        grid.appendChild(div);
      });
    } catch (err) {
      console.error('Error cargando reseñas públicas:', err.message);
    }
  }

  // Formulario público de reseña (estrellas + envío)
  (function initFormResena() {
    const form = document.getElementById('form-resena');
    if (!form) return;
    const estrellas = document.querySelectorAll('#estrellas-input .estrella');
    const inputCalif = document.getElementById('resena-calificacion');
    const msg = document.getElementById('resena-mensaje');
    estrellas.forEach(est => est.addEventListener('click', () => {
      const v = Number(est.dataset.valor);
      inputCalif.value = v;
      estrellas.forEach(e => e.classList.toggle('activa', Number(e.dataset.valor) <= v));
    }));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('resena-nombre').value.trim();
      const comentario = document.getElementById('resena-comentario').value.trim();
      const calificacion = Number(inputCalif.value);
      if (!calificacion) { msg.textContent = 'Elige una calificación (estrellas).'; msg.className = 'resena-mensaje error'; return; }
      try {
        const data = await api('/api/resenas', { method: 'POST', body: JSON.stringify({ nombre, comentario, calificacion }) });
        msg.textContent = data.mensaje || '¡Gracias por tu reseña!';
        msg.className = 'resena-mensaje ok';
        form.reset(); inputCalif.value = '0';
        estrellas.forEach(e => e.classList.remove('activa'));
      } catch (err) {
        msg.textContent = err.message; msg.className = 'resena-mensaje error';
      }
    });
  })();

  // =========================================================
  // INICIALIZACIÓN — restaurar sesión al recargar
  // =========================================================
  aplicarSesion();
  cargarResenasPublicas();   // reseñas aprobadas para la sección pública
  const sesionActual = getSesion();
  if (sesionActual) {
    if (sesionActual.rol === 'cliente') mostrarPanelCliente();
    if (sesionActual.rol === 'admin')   mostrarPanelAdmin();
  }

  // Consulta de disponibilidad por fechas (la usa el formulario de reserva
  // en main.js). Devuelve { total, ocupadas, disponibles } o null si falla.
  window.HCA_disponibilidad = async function (llegada, salida) {
    try {
      return await api('/api/reservaciones/disponibilidad?llegada=' +
        encodeURIComponent(llegada) + '&salida=' + encodeURIComponent(salida));
    } catch (err) {
      console.error('No se pudo consultar disponibilidad:', err.message);
      return null;
    }
  };

  // Exponer una función global para que main.js pueda mandar la reserva al backend.
  // Devuelve la reservación creada, o null si falla (avisando al usuario).
  window.HCA_guardarReservaEnBD = async function (datos) {
    try {
      const data = await api('/api/reservaciones', {
        method: 'POST',
        body: JSON.stringify(datos)
      });
      // Si el usuario es cliente con sesión, refrescar su tabla.
      const s = getSesion();
      if (s && s.rol === 'cliente') mostrarPanelCliente();
      return data.reservacion;
    } catch (err) {
      // Mostrar el motivo (p. ej. villa ya reservada en esas fechas).
      alert('No se pudo registrar la reserva:\n' + err.message);
      return null;
    }
  };
})();
