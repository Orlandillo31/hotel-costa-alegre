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
  async function cargarReservacionesAdmin() {
    try {
      const reservas = await api('/api/reservaciones');
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
    } catch (err) {
      alert('Error cargando reservaciones: ' + err.message);
    }
  }

  async function cambiarEstado(id, estado) {
    try {
      await api('/api/reservaciones/' + id, {
        method: 'PATCH',
        body: JSON.stringify({ estado })
      });
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

    // Hoja 1 — Resumen
    const resumen = [
      ['VILLAS CANGREJO — CONTABILIDAD'],
      ['Generado:', new Date().toLocaleString('es-MX')],
      [],
      ['Reservaciones confirmadas', c.totalReservacionesConfirmadas],
      ['Noches vendidas',           c.nochesTotales],
      ['Ingreso total (MXN)',       c.ingresoTotal],
      ['Promedio por reserva (MXN)', c.promedioPorReserva],
      [],
      ['DESGLOSE POR VILLA'],
      ['Villa', 'Reservas', 'Ingresos (MXN)']
    ];
    Object.keys(c.porVilla || {}).forEach(t => {
      resumen.push([t, c.porVilla[t].cantidad, c.porVilla[t].ingresos]);
    });
    const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
    wsResumen['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // Hoja 2 — Detalle de reservaciones confirmadas
    const detalle = [[
      'ID', 'Cliente', 'Correo', 'Teléfono',
      'Villa', 'Huéspedes', 'Llegada', 'Salida',
      'Noches', 'Precio/Noche', 'Total (MXN)', 'Estado', 'Creada'
    ]];
    c.reservaciones.forEach(r => {
      detalle.push([
        r.id,
        r.nombre,
        r.email,
        r.telefono,
        fmtVilla(r.villa),
        r.huespedes,
        r.llegada,
        r.salida,
        r.noches,
        r.precioNoche,
        r.total,
        r.estado,
        new Date(r.creada).toLocaleString('es-MX')
      ]);
    });
    const wsDetalle = XLSX.utils.aoa_to_sheet(detalle);
    wsDetalle['!cols'] = [
      { wch: 18 }, { wch: 24 }, { wch: 28 }, { wch: 16 },
      { wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 22 }
    ];
    XLSX.utils.book_append_sheet(wb, wsDetalle, 'Reservaciones confirmadas');

    const nombreArchivo = `Contabilidad_VillasCangrejo_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
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
