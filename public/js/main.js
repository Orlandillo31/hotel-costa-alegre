/* =======================================================
   Villas Cangrejo — JavaScript del sitio
   Se carga en todas las páginas; cada parte revisa si su
   sección existe en la página antes de hacer algo.
     1. Cabecera (sólida al bajar) y menú en celular
     2. Aparición suave de secciones al bajar
     3. Texto que se enciende palabra por palabra
     4. Esqueletos de carga en las fotos
     5. Visor de fotos de la galería
     6. Formulario de reserva → WhatsApp y precio estimado
======================================================= */

// Traduce los textos que arma este archivo cuando la página está en inglés
// (js/i18n.js define window.VC_t; si no está, deja el español).
const traducir = s => (window.VC_t ? window.VC_t(s) : s);
const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// -------------------------------------------------------
// 1. CABECERA Y MENÚ
// -------------------------------------------------------
const cabecera  = document.getElementById('cabecera');
const botonMenu = document.getElementById('menu-boton');

function alBajar() { cabecera.classList.toggle('solida', window.scrollY > 24); }
window.addEventListener('scroll', alBajar, { passive: true });
alBajar();

function abrirMenu(abrir) {
  document.body.classList.toggle('menu-abierto', abrir);
  botonMenu.setAttribute('aria-expanded', abrir);
  botonMenu.setAttribute('aria-label', traducir(abrir ? 'Cerrar menú' : 'Abrir menú'));
}
botonMenu.addEventListener('click', () => abrirMenu(!document.body.classList.contains('menu-abierto')));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.body.classList.contains('menu-abierto')) abrirMenu(false);
});
// Si se agranda la ventana con el menú abierto, cerrarlo
window.matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) abrirMenu(false); });

// -------------------------------------------------------
// 2. APARICIÓN AL BAJAR
//    Solo se esconden las secciones que todavía no están en
//    pantalla, así nunca parpadea lo que ya se ve al cargar.
// -------------------------------------------------------
if (!movimientoReducido && 'IntersectionObserver' in window) {
  const observador = new IntersectionObserver(entradas => {
    entradas.forEach(entrada => {
      if (!entrada.isIntersecting) return;
      entrada.target.classList.remove('oculto');
      observador.unobserve(entrada.target);
    });
  }, { rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.aparece').forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.classList.add('oculto');
    observador.observe(el);
  });
}

// -------------------------------------------------------
// 3. TEXTO QUE SE ENCIENDE PALABRA POR PALABRA
//    Las palabras empiezan tenues y se van encendiendo
//    conforme el texto sube por la pantalla.
// -------------------------------------------------------
const declaraciones = document.querySelectorAll('.declaracion');

function partirEnPalabras(el) {
  const palabras = el.textContent.trim().split(/\s+/);
  el.innerHTML = palabras.map(p => `<span class="palabra">${p}</span>`).join(' ');
}

function encenderPalabras() {
  declaraciones.forEach(el => {
    const caja = el.getBoundingClientRect();
    const avance = (window.innerHeight * 0.85 - caja.top) / (caja.height + window.innerHeight * 0.35);
    const palabras = el.querySelectorAll('.palabra');
    const encendidas = Math.round(Math.min(Math.max(avance, 0), 1) * palabras.length);
    palabras.forEach((p, i) => p.classList.toggle('activa', i < encendidas));
  });
}

if (declaraciones.length) {
  declaraciones.forEach(partirEnPalabras);
  if (!movimientoReducido) {
    window.addEventListener('scroll', encenderPalabras, { passive: true });
    window.addEventListener('resize', encenderPalabras);
    encenderPalabras();
  }
  // Al cambiar de idioma i18n.js reemplaza el texto: volver a partirlo
  document.addEventListener('vc:idioma', () => {
    declaraciones.forEach(partirEnPalabras);
    encenderPalabras();
  });
}

// -------------------------------------------------------
// 4. ESQUELETOS DE CARGA
//    Mientras una foto se descarga se ve un recuadro con un
//    brillo que pasa (CSS: img.esqueleto); al llegar, aparece suave.
// -------------------------------------------------------
document.querySelectorAll('img[src*="images.unsplash.com"]').forEach(img => {
  if (img.complete && img.naturalWidth) return;      // ya estaba en caché
  img.classList.add('esqueleto');
  const listo = () => {
    img.classList.remove('esqueleto');
    if (img.naturalWidth) img.classList.add('foto-lista');
  };
  img.addEventListener('load', listo, { once: true });
  img.addEventListener('error', listo, { once: true });
});

// -------------------------------------------------------
// 5. VISOR DE FOTOS (galería)
// -------------------------------------------------------
const lightbox = document.getElementById('lightbox');
if (lightbox) {
  const fotos     = [...document.querySelectorAll('.galeria-item img')];
  const imagen    = document.getElementById('lightbox-imagen');
  const btnCerrar = document.getElementById('lightbox-cerrar');
  let actual = 0;
  let origen = null;   // elemento que abrió el visor (para regresarle el foco)

  const mostrar = i => {
    actual = (i + fotos.length) % fotos.length;
    // Versión más grande de la misma foto
    imagen.src = fotos[actual].currentSrc.replace(/w=\d+/, 'w=2000');
    imagen.alt = fotos[actual].alt;
  };
  const abrir = (i, quien) => {
    origen = quien;
    mostrar(i);
    lightbox.classList.add('abierto');
    document.body.style.overflow = 'hidden';
    btnCerrar.focus();
  };
  const cerrar = () => {
    lightbox.classList.remove('abierto');
    document.body.style.overflow = '';
    if (origen) origen.focus();
  };

  document.querySelectorAll('.galeria-item').forEach((item, i) => {
    item.addEventListener('click', () => abrir(i, item));
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(i, item); }
    });
  });
  btnCerrar.addEventListener('click', cerrar);
  document.getElementById('lightbox-prev').addEventListener('click', () => mostrar(actual - 1));
  document.getElementById('lightbox-next').addEventListener('click', () => mostrar(actual + 1));
  lightbox.addEventListener('click', e => { if (e.target === lightbox) cerrar(); });
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('abierto')) return;
    if (e.key === 'Escape')     cerrar();
    if (e.key === 'ArrowLeft')  mostrar(actual - 1);
    if (e.key === 'ArrowRight') mostrar(actual + 1);
  });
}

// -------------------------------------------------------
// 6. FORMULARIO DE RESERVA → WHATSAPP (contacto)
//    Valida los campos y abre WhatsApp con el mensaje armado.
//    No se guarda nada en un servidor.
// -------------------------------------------------------
const formulario = document.getElementById('formulario-reservacion');
if (formulario) {
  const mensajeExito   = document.getElementById('formulario-exito');
  const TELEFONO_HOTEL = '523151007106';
  const enlaceWhatsApp = texto => `https://wa.me/${TELEFONO_HOTEL}?text=${encodeURIComponent(texto)}`;

  // Fecha local 'YYYY-MM-DD' (toISOString daría la de UTC: en México,
  // después de las 6 de la tarde ya sería "mañana").
  const fechaLocal = (d = new Date()) =>
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

  // Noches entre dos fechas 'YYYY-MM-DD' (0 si no son válidas)
  const nochesEntre = (a, b) => (a && b && b > a)
    ? Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000) : 0;

  function mostrarError(campoId, errorId, mostrar) {
    document.getElementById(campoId).classList.toggle('error', mostrar);
    document.getElementById(errorId).classList.toggle('visible', mostrar);
  }

  formulario.addEventListener('submit', e => {
    e.preventDefault();

    const nombre    = document.getElementById('campo-nombre').value.trim();
    const email     = document.getElementById('campo-email').value.trim();
    const llegada   = document.getElementById('campo-llegada').value;
    const salida    = document.getElementById('campo-salida').value;
    const campoHues = document.getElementById('campo-huespedes');

    const errores = {
      nombre:    nombre.length < 3,
      email:     email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),   // opcional
      llegada:   !llegada || llegada < fechaLocal(),
      salida:    !salida || salida <= llegada,
      huespedes: !campoHues.value
    };
    Object.entries(errores).forEach(([campo, hay]) => mostrarError('campo-' + campo, 'error-' + campo, hay));
    if (Object.values(errores).some(Boolean)) {
      formulario.querySelector('.error').focus();
      return;
    }

    // ---------- Mensaje (siempre en español: lo lee el hotel) ----------
    const telefono    = document.getElementById('campo-telefono').value.trim();
    const comentarios = document.getElementById('campo-comentarios').value.trim();
    const huespedes   = campoHues.value === '5' ? '5 o más' : campoHues.value;
    const noches      = nochesEntre(llegada, salida);
    const lineas = [
      '*🦀 SOLICITUD DE RESERVA - Villas Cangrejo*',
      '',
      `Hola, soy *${nombre}* y me gustaría reservar una villa.`,
      '',
      `• Llegada: ${llegada}`,
      `• Salida: ${salida} (${noches} noche${noches === 1 ? '' : 's'})`,
      `• Huéspedes: ${huespedes}`
    ];
    if (email)       lineas.push(`• Correo: ${email}`);
    if (telefono)    lineas.push(`• Teléfono: ${telefono}`);
    if (comentarios) lineas.push('', `📝 ${comentarios}`);
    lineas.push('', '¿Tienen disponibilidad? ¡Gracias!');
    const url = enlaceWhatsApp(lineas.join('\n'));

    // Se abre en el mismo clic del botón para que el navegador no lo bloquee
    window.open(url, '_blank', 'noopener');

    document.getElementById('exito-whatsapp').href = url;
    formulario.style.display   = 'none';
    mensajeExito.style.display = 'block';
    mensajeExito.scrollIntoView({ behavior: movimientoReducido ? 'auto' : 'smooth', block: 'center' });
  });

  // Quitar el error de un campo en cuanto el usuario lo corrige
  ['nombre', 'email', 'llegada', 'salida', 'huespedes'].forEach(campo => {
    document.getElementById('campo-' + campo).addEventListener('input', () => mostrarError('campo-' + campo, 'error-' + campo, false));
  });

  // ---------- Precio estimado ----------
  //  < 30 noches: por noche. 30+ noches: tarifa mensual prorrateada
  //  (30–59 → 1 mes, 60–89 → 2 meses, 90+ → 3 meses; un mes = 30 noches).
  //  Los precios se leen de la tarjeta de tarifas de la misma página.
  const NOCHES_MES = 30;
  const tarifas = {};
  document.querySelectorAll('[data-tarifa]').forEach(el => {
    tarifas[el.dataset.tarifa] = Number(el.textContent.replace(/[^\d]/g, ''));
  });
  const fmtDinero = n => '$' + n.toLocaleString('es-MX');

  function textoEstimado(noches) {
    const enIngles = !!(window.VC_idioma && window.VC_idioma() === 'en');
    if (noches >= NOCHES_MES) {
      const mensual = noches >= 90 ? tarifas.mes3 : noches >= 60 ? tarifas.mes2 : tarifas.mes1;
      const total = Math.round(noches * mensual / NOCHES_MES);
      return enIngles
        ? `Long stay (${noches} nights): ${fmtDinero(mensual)} per month = <strong>${fmtDinero(total)} MXN</strong> + VAT`
        : `Estancia larga (${noches} noches): ${fmtDinero(mensual)} por mes = <strong>${fmtDinero(total)} MXN</strong> + IVA`;
    }
    const total = tarifas.precioNoche * noches;
    return enIngles
      ? `Estimated price: ${noches} night${noches === 1 ? '' : 's'} × ${fmtDinero(tarifas.precioNoche)} = <strong>${fmtDinero(total)} MXN</strong> + VAT`
      : `Precio estimado: ${noches} noche${noches === 1 ? '' : 's'} × ${fmtDinero(tarifas.precioNoche)} = <strong>${fmtDinero(total)} MXN</strong> + IVA`;
  }

  const inputLlegada   = document.getElementById('campo-llegada');
  const inputSalida    = document.getElementById('campo-salida');
  const precioEstimado = document.getElementById('precio-estimado');

  function actualizarEstimado() {
    const noches = nochesEntre(inputLlegada.value, inputSalida.value);
    precioEstimado.hidden = !noches;
    if (noches) precioEstimado.innerHTML = textoEstimado(noches);
  }

  // No se pueden elegir fechas pasadas; la salida, después de la llegada.
  inputLlegada.min = fechaLocal();
  inputSalida.min  = fechaLocal();
  inputLlegada.addEventListener('change', () => {
    inputSalida.min = inputLlegada.value || fechaLocal();
    actualizarEstimado();
  });
  inputSalida.addEventListener('change', actualizarEstimado);
  document.addEventListener('vc:idioma', actualizarEstimado);
}
