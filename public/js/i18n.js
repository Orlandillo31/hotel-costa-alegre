/* ============================================================
 *  VILLAS CANGREJO — Versión en inglés (ES/EN)
 * ============================================================
 *  El español vive en el HTML como siempre. Aquí está solo el inglés:
 *    • TEXTOS:   [selector CSS, inglés, atributo?] para la parte pública.
 *                Si el inglés es un arreglo, va uno por cada elemento que
 *                encuentre el selector (null = dejar ese igual).
 *    • MENSAJES: textos que arma main.js; los pasa por window.VC_t()
 *                antes de mostrarlos.
 *  Idioma inicial: el que eligió el visitante (localStorage) o, si es su
 *  primera visita, el de su navegador (español → ES; cualquier otro → EN).
 * ============================================================ */
(function () {
  'use strict';

  const CLAVE = 'vc_idioma';
  const TITULO = { es: document.title, en: 'Villas Cangrejo · Hotel and villas in Melaque, Jalisco, Mexico' };

  const TEXTOS = [
    // ---------- Barra de navegación ----------
    ['.navbar-logo-texto > span', 'Jalisco, Mexico'],
    ['#navbar-menu a[href="#nosotros"]', 'About'],
    ['#navbar-menu a[href="#habitaciones"]', 'Villas'],
    ['#navbar-menu a[href="#galeria"]', 'Gallery'],
    ['#navbar-menu a[href="#amenidades"]', 'Amenities'],
    ['#navbar-menu a[href="#ubicacion"]', 'Location'],
    ['#navbar-menu a[href="#contacto"]', 'Book'],
    ['#boton-hamburguesa', 'Open menu', 'aria-label'],

    // ---------- Portada ----------
    ['.hero-subtitulo', 'Villas Cangrejo · Hotel in San Patricio-Melaque, Jalisco'],
    ['.hero-titulo', 'Where the sea<br><em>embraces the jungle</em>'],
    ['.hero-descripcion', 'Discover the magic of Jalisco\'s Costa Alegre: miles of unspoiled beaches, ' +
      'golden sunsets and a hospitality that comes straight from the Mexican heart.'],
    ['.hero-botones .btn-primario', 'Book now'],
    ['.hero-botones .btn-secundario', 'View gallery'],

    // ---------- Nosotros ----------
    ['.nosotros-etiqueta small', 'Years of<br>hospitality'],
    ['#nosotros .seccion-etiqueta', 'Our story'],
    ['#nosotros .seccion-titulo', 'A <em>unique</em> corner<br>of the Pacific'],
    ['.nosotros-texto .reveal-delay-2 p', [
      'Nestled between lush tropical jungle and the crystal-clear waters of the Pacific, ' +
      'Villas Cangrejo was born from the dream of offering an authentic experience on one of ' +
      'Mexico\'s most beautiful coastlines: Jalisco\'s Costa Alegre.',
      'From Barra de Navidad to Chamela, our region hides coral reefs, secluded bays and ' +
      'breathtaking wildlife. Our hotel is the gateway to this natural paradise.'
    ]],
    ['.stat-etiqueta', ['Villas', 'Meters of beach', '% Satisfaction']],

    // ---------- Villas ----------
    ['#habitaciones .seccion-etiqueta', 'Accommodation'],
    ['#habitaciones .seccion-titulo', 'Our <em>villas</em>'],
    ['.habitaciones-intro', 'We have <strong>16 identical villas</strong>, all with the same design, ' +
      'amenities and price. Pick the one you like: every villa offers the same luxury experience by the Pacific.'],
    ['.hp-unidad', 'MXN / night'],
    ['.habitacion-descripcion', 'A private, fully equipped villa in San Patricio-Melaque, designed for ' +
      'couples, families and long stays. All 16 villas are identical in design, amenities and price.'],
    ['.comodidad-item', ['Air conditioning', 'Television', 'Wi-Fi internet', 'Hot water',
      'Induction stove', 'Pool access']],
    ['.estancias-largas .el-titulo', 'Long stays'],
    ['.estancias-largas .el-plazo', ['1 month', '2 months', '3 months or more']],
    ['.estancias-largas .el-por', 'per month'],
    ['.estancias-largas .el-nota', 'Prices in Mexican pesos, plus VAT (16%).'],
    ['.habitacion-info .btn-primario', 'Book a villa'],

    // ---------- Galería ----------
    ['#galeria .seccion-etiqueta', 'Gallery'],
    ['#galeria .seccion-titulo', 'Live the <em>experience</em>'],
    ['.galeria-video-titulo', ['Discover the Costa Alegre', 'A tour of our beaches']],
    ['.audio-texto', '<strong>Hotel ambient music</strong> Press play and unwind with the lounge music of Bar El Pelícano.'],
    ['#btn-audio', 'Play ambient music', 'aria-label'],

    // ---------- Banner de Melaque ----------
    ['#cta-banner .seccion-titulo', 'Where the sun says goodbye<br><em style="color: var(--color-turquesa-claro)">' +
      'between palm trees and sea</em>'],
    ['#cta-banner p', 'In the heart of the Bahía de Navidad, Melaque welcomes you with golden sunsets, a quiet ' +
      'seaside promenade and the taste of the Pacific in every dish. A fishing village where time slows down ' +
      'and every wave invites you to stay one more day.'],
    ['#cta-banner .btn-primario', 'Come to Melaque'],

    // ---------- Amenidades ----------
    ['#amenidades .seccion-etiqueta', 'What awaits you'],
    ['#amenidades .seccion-titulo', 'Comforts <em>for your stay</em>'],
    ['.amenidad-nombre', ['The Peanut Pool', 'Air conditioning', 'Television', 'Wi-Fi internet',
      'Hot water', 'Induction stove']],
    ['.amenidad-descripcion', [
      'Our pool boasts a rather peculiar peanut shape —yes, a peanut— with curves for swimming and ' +
      'nooks for floating.',
      'Every villa has air conditioning so you can rest cool even on the hottest days on the coast.',
      'A TV in every villa to relax after a day at the beach.',
      'Internet in your villa: ideal for long stays or for working remotely.',
      'Hot water at all times for your comfort.',
      'Cook like at home with an induction stove: safe, fast and efficient.'
    ]],

    // ---------- Ubicación ----------
    ['#ubicacion .seccion-etiqueta', 'Location'],
    ['#ubicacion .seccion-titulo', 'In the heart of<br><em>Bahía de Navidad</em>'],
    ['.ubicacion-texto p', 'Villas Cangrejo is in San Patricio-Melaque, in the municipality of Cihuatlán, ' +
      'Jalisco, on the Costa Alegre of the Mexican Pacific. A quiet base to enjoy Melaque beach, ' +
      'explore Barra de Navidad and discover the bays along the coast.'],
    ['.ubicacion-texto .btn-primario', 'Open in Google Maps'],
    ['.ubicacion-subtitulo', 'What\'s nearby'],
    ['.ub-lugar', ['Cuastecomates beach', null, 'Manzanillo airport (ZLO)', null, null, null]],
    ['.ub-nota', 'Approximate driving times.'],

    // ---------- Contacto y formulario de reserva ----------
    ['#contacto .seccion-etiqueta', 'Contact'],
    ['#contacto .seccion-titulo', 'Let\'s talk and <em>plan</em><br>your getaway'],
    ['.contacto-info > p', 'Our team is available every day to help you plan the perfect getaway to the ' +
      'Costa Alegre. Write to us, call us or visit us in San Patricio-Melaque.'],
    ['.detalle-texto strong', ['Address', 'Phone', 'Email', 'Hours']],
    ['.detalle-texto span', ['14 C. Palmas, San Patricio-Melaque, Jalisco, Mexico', null, null, null]],
    ['.formulario-titulo', 'Request your reservation'],
    ['.formulario-subtitulo', 'Fill in your details and WhatsApp will open with your message ready to send.'],
    ['.form-paso .paso-texto', ['Your details', 'Your stay', 'Anything else']],
    ['label[for="campo-nombre"]', 'Full name *'],
    ['#campo-nombre', 'e.g. Ana García López', 'placeholder'],
    ['#error-nombre', 'Please enter your full name.'],
    ['label[for="campo-email"]', 'Email'],
    ['#campo-email', 'email@example.com', 'placeholder'],
    ['#error-email', 'Enter a valid email address.'],
    ['label[for="campo-telefono"]', 'Contact phone'],
    ['label[for="campo-llegada"]', 'Check-in date *'],
    ['#error-llegada', 'Select your check-in date.'],
    ['label[for="campo-salida"]', 'Check-out date *'],
    ['#error-salida', 'Check-out must be after check-in.'],
    ['label[for="campo-huespedes"]', 'Number of guests *'],
    ['#campo-huespedes option', ['— Number of guests —', '1 guest', '2 guests', '3 guests', '4 guests', '5+ guests']],
    ['#error-huespedes', 'Tell us how many guests are coming.'],
    ['label[for="campo-comentarios"]', 'Special requests'],
    ['#campo-comentarios', 'Food allergies, honeymoon, special celebration, etc.', 'placeholder'],
    ['#formulario-reservacion .btn-enviar', 'Send via WhatsApp'],
    ['#formulario-exito p', '<strong>All set!</strong><br>WhatsApp opened with your message. Just press send ' +
      'and we will reply to confirm your stay at Villas Cangrejo.'],
    ['#exito-whatsapp', 'WhatsApp didn\'t open? Tap here'],
    ['.whatsapp-flotante', 'Message us on WhatsApp', 'aria-label'],

    // ---------- Pie de página ----------
    ['.footer-marca p', 'Your home on the most beautiful coast of the Mexican Pacific. ' +
      'Nature, luxury and warmth in perfect harmony.'],
    ['.footer-columna h4', ['The Hotel', 'Services', 'Information']],
    ['.footer-columna li a', ['About', 'Villas', 'Comforts', 'Gallery',
      'Pool', 'Air conditioning', 'Wi-Fi internet', 'Long stays',
      'Reservations', 'Location', 'Getting here', 'Privacy notice (Spanish)']],
    ['.nota-privacidad', 'By sending you accept our <a href="aviso-privacidad.html" target="_blank">privacy notice</a> (in Spanish).'],
    ['.footer-inferior p', ['© 2026 Villas Cangrejo. All rights reserved.',
      'San Patricio-Melaque, Bahía de Navidad · Costa Alegre, Jalisco']]
  ];

  // Textos exactos que arma main.js.
  const MENSAJES = {
    'Reproducir música ambiental': 'Play ambient music',
    'Pausar música ambiental': 'Pause ambient music'
  };

  let idioma = 'es';
  const originales = new Map();   // elemento → { html | atributo: texto en español }
  const boton = document.getElementById('btn-idioma');

  function t(texto) {
    if (idioma !== 'en' || typeof texto !== 'string') return texto;
    return Object.prototype.hasOwnProperty.call(MENSAJES, texto) ? MENSAJES[texto] : texto;
  }

  function aplicar(lang) {
    idioma = lang;
    document.documentElement.lang = lang;
    document.title = TITULO[lang];
    TEXTOS.forEach(([selector, en, atributo]) => {
      document.querySelectorAll(selector).forEach((el, i) => {
        const valor = Array.isArray(en) ? en[i] : en;
        if (valor == null) return;
        const clave = atributo || 'html';
        let orig = originales.get(el);
        if (!orig) { orig = {}; originales.set(el, orig); }
        if (!(clave in orig)) orig[clave] = atributo ? el.getAttribute(atributo) : el.innerHTML;
        const nuevo = lang === 'en' ? valor : orig[clave];
        if (atributo) el.setAttribute(atributo, nuevo); else el.innerHTML = nuevo;
      });
    });
    actualizarBoton();
  }

  function actualizarBoton() {
    if (!boton) return;
    boton.textContent = idioma === 'en' ? 'ES' : 'EN';
    boton.setAttribute('aria-label', idioma === 'en' ? 'Ver la página en español' : 'View this page in English');
  }

  window.VC_t = t;
  window.VC_idioma = () => idioma;

  // Idioma inicial
  let guardado = null;
  try { guardado = localStorage.getItem(CLAVE); } catch { /* almacenamiento bloqueado */ }
  const delNavegador = (navigator.languages && navigator.languages[0]) || navigator.language || 'es';
  const inicial = guardado === 'es' || guardado === 'en' ? guardado : (/^es\b/i.test(delNavegador) ? 'es' : 'en');
  if (inicial === 'en') aplicar('en'); else actualizarBoton();   // el español ya está en el HTML

  if (boton) boton.addEventListener('click', () => {
    const nuevo = idioma === 'en' ? 'es' : 'en';
    aplicar(nuevo);
    try { localStorage.setItem(CLAVE, nuevo); } catch { /* sin almacenamiento: dura hasta recargar */ }
    // Para que main.js vuelva a dibujar lo que genera (precio estimado).
    document.dispatchEvent(new CustomEvent('vc:idioma', { detail: nuevo }));
  });
})();
