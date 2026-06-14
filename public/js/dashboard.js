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
        'login-cliente':    'form-login-cliente',
        'registro-cliente': 'form-registro-cliente',
        'login-admin':      'form-login-admin'
      };
      document.getElementById(map[objetivo]).classList.add('activo');
      modalMsg.textContent = '';
    });
  });

  // ----- Login cliente -----
  // Cuenta los fallos para sugerir la recuperación tras varios intentos.
  let fallosLoginCliente = 0;
  document.getElementById('form-login-cliente').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          usuario:  document.getElementById('login-cli-email').value.trim(),
          password: document.getElementById('login-cli-pass').value,
          rol: 'cliente'
        })
      });
      fallosLoginCliente = 0;
      setSesion({ token: data.token, rol: data.rol, nombre: data.nombre, email: data.email });
      cerrarModal();
      aplicarSesion();
      mostrarPanelCliente();
    } catch (err) {
      fallosLoginCliente++;
      // Tras 3 fallos (o si el backend bloqueó la cuenta) destacar la recuperación.
      const sugerir = fallosLoginCliente >= 3 || /bloquead/i.test(err.message);
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
      mostrarMsg('✅ Cuenta creada. Ahora inicia sesión.', false);
      // Cambiar a la pestaña de login
      document.querySelector('.modal-tab[data-modal-tab="login-cliente"]').click();
    } catch (err) {
      mostrarMsg(err.message, true);
    }
  });

  // ----- Login admin -----
  document.getElementById('form-login-admin').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          usuario:  document.getElementById('login-admin-usuario').value.trim(),
          password: document.getElementById('login-admin-pass').value,
          rol: 'admin'
        })
      });
      setSesion({ token: data.token, rol: data.rol, nombre: data.nombre });
      cerrarModal();
      aplicarSesion();
      mostrarPanelAdmin();
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
    document.getElementById('reset-email').value = document.getElementById('login-cli-email').value.trim();
    mostrarSoloForm('form-recuperar');
  });

  // Volver al login
  document.getElementById('link-volver-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('.modal-tab[data-modal-tab="login-cliente"]').click();
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
        document.querySelector('.modal-tab[data-modal-tab="login-cliente"]').click();
        document.getElementById('login-cli-email').value = email;
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
      cargarContabilidad()
    ]);
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
    const fechaLarga = s => s
      ? new Date(s + 'T00:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
      : '—';
    const IVA_RATE = 0.16;
    const base = +(r.total / (1 + IVA_RATE)).toFixed(2);
    const iva  = +(r.total - base).toFixed(2);

    // Cargar el logo como dataURL PNG (más compatible con jsPDF que pasar
    // el elemento <img>). Si algo falla, el recibo se genera igual sin él.
    const logoData = await (async () => {
      try {
        const img = await new Promise((ok, no) => {
          const im = new Image();
          im.onload = () => ok(im);
          im.onerror = no;
          im.src = 'img/logo.png?v=2';
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

    let y = 150;
    const seccion = (titulo, anchoLinea) => {
      doc.setTextColor(...OCEANO); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text(titulo, 40, y);
      doc.setDrawColor(...ORO); doc.setLineWidth(1); doc.line(40, y + 6, 40 + anchoLinea, y + 6);
      y += 24;
    };
    const fila = (label, valor) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
      doc.text(label, 40, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...OSC);
      doc.text(String(valor == null || valor === '' ? '—' : valor), 200, y);
      y += 20;
    };

    seccion('Datos del cliente', 150);
    fila('Nombre', r.nombre);
    fila('Correo electrónico', r.email);
    fila('Teléfono', r.telefono || 'No proporcionado');

    y += 10;
    seccion('Detalle del hospedaje', 200);
    fila('Villa', 'Villa ' + r.villa);
    fila('Huéspedes', r.huespedes);
    fila('Llegada', fechaLarga(r.llegada) + '  (check-in 3:00 PM)');
    fila('Salida', fechaLarga(r.salida) + '  (check-out 12:00 PM)');
    fila('Noches', r.noches);
    fila('Precio por noche', MX(r.precioNoche) + ' MXN');
    fila('Estado', String(r.estado || '').toUpperCase());
    fila('Forma de pago', 'Por confirmar con el hotel');

    // ---- Desglose de importes (alineado a la izquierda, como el resto) ----
    y += 14;
    const blkL = 40, blkR = 312;          // columna izquierda (ancho 272)
    doc.setDrawColor(...ORO); doc.setLineWidth(0.8); doc.line(blkL, y - 12, blkR, y - 12);
    const importe = (l, v) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...GRIS);
      doc.text(l, blkL, y);
      doc.setTextColor(...OSC); doc.text(v, blkR, y, { align: 'right' });
      y += 20;
    };
    importe('Subtotal', MX(base) + ' MXN');
    importe('IVA (16%)', MX(iva) + ' MXN');
    // Caja de TOTAL
    y += 2;
    doc.setFillColor(...OCEANO); doc.rect(blkL, y - 2, blkR - blkL, 32, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('TOTAL', blkL + 14, y + 19);
    doc.setTextColor(...ORO); doc.setFontSize(14);
    doc.text(MX(r.total) + ' MXN', blkR - 12, y + 20, { align: 'right' });

    // ---- Nota legal al pie ----
    doc.setDrawColor(230, 224, 208); doc.setLineWidth(0.8); doc.line(40, H - 96, W - 40, H - 96);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIS);
    const nota =
      'Comprobante de reservación de carácter informativo. No constituye un Comprobante Fiscal Digital ' +
      'por Internet (CFDI). Si requiere factura fiscal, solicítela proporcionando su RFC y uso de CFDI al ' +
      'correo del hotel. Precios en pesos mexicanos (MXN) con IVA incluido.';
    doc.text(doc.splitTextToSize(nota, W - 80), 40, H - 82);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...OCEANO);
    doc.text(RAZON + ' · ' + DOMICILIO, 40, H - 40);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRIS);
    doc.text('¡Gracias por su preferencia! 🦀', 40, H - 28);

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

  // =========================================================
  // INICIALIZACIÓN — restaurar sesión al recargar
  // =========================================================
  aplicarSesion();
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
