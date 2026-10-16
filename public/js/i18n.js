/* ============================================================
 *  VILLAS CANGREJO — Versión en inglés (ES/EN)
 * ============================================================
 *  El español vive en el HTML como siempre. Aquí está solo el inglés:
 *    • TEXTOS:   [selector CSS, inglés, atributo?] para la parte pública.
 *                Si el inglés es un arreglo, va uno por cada elemento que
 *                encuentre el selector (null = dejar ese igual).
 *    • MENSAJES / PATRONES: textos que arma el JS o manda el servidor
 *                (errores, avisos); main.js y dashboard.js los pasan por
 *                window.VC_t() antes de mostrarlos.
 *  El panel de administración se queda en español.
 *  Idioma inicial: el que eligió el visitante (localStorage) o, si es su
 *  primera visita, el de su navegador (español → ES; cualquier otro → EN).
 * ============================================================ */
(function () {
  'use strict';

  const CLAVE = 'vc_idioma';
  const TITULO = { es: document.title, en: 'Villas Cangrejo | Melaque, Jalisco, Mexico' };

  const TEXTOS = [
    // ---------- Barra de navegación ----------
    ['.navbar-logo-texto > span', 'Jalisco, Mexico'],
    ['#navbar-menu a[href="#nosotros"]', 'About'],
    ['#navbar-menu a[href="#habitaciones"]', 'Villas'],
    ['#navbar-menu a[href="#galeria"]', 'Gallery'],
    ['#navbar-menu a[href="#amenidades"]', 'Amenities'],
    ['#navbar-menu a[href="#resenas"]', 'Reviews'],
    ['#navbar-menu a[href="#contacto"]', 'Book'],
    ['#btn-abrir-login', 'Sign in'],
    ['#btn-ir-cliente', 'My account'],
    ['#boton-hamburguesa', 'Open menu', 'aria-label'],

    // ---------- Modal de acceso ----------
    ['#modal-cerrar', 'Close', 'aria-label'],
    ['.modal-titulo', '✦ Account access'],
    ['.modal-tab[data-modal-tab="login"]', 'Sign in'],
    ['.modal-tab[data-modal-tab="registro-cliente"]', 'Sign up'],
    ['label[for="login-usuario"]', 'Email or username'],
    ['label[for="login-pass"]', 'Password'],
    ['#form-login .btn-enviar', 'Sign in'],
    ['#link-olvide', 'Forgot your password?'],
    ['#reset-paso-1 .modal-sub', 'We will send a recovery code to your email.'],
    ['#reset-paso-1 label', 'Email'],
    ['#btn-enviar-codigo', 'Send code'],
    ['#reset-paso-2 .modal-sub', 'Check your email and enter the 6-digit code.'],
    ['#reset-paso-2 label', ['Recovery code', 'New password (min. 8 characters)']],
    ['#reset-paso-2 .btn-enviar', 'Change password'],
    ['#link-volver-login', '← Back to sign in'],
    ['#form-registro-cliente label', ['Full name', 'Email', 'Phone (optional)', 'Password (min. 8 characters)']],
    ['#form-registro-cliente .btn-enviar', 'Create account'],

    // ---------- Panel del huésped ----------
    ['#panel-cliente .seccion-etiqueta', 'Your account'],
    ['#cliente-saludo', 'Hi'],
    ['#btn-logout-cliente', 'Sign out'],
    ['#panel-cliente .panel-subtitulo', 'Your reservations'],
    ['#panel-cliente thead th', ['Villa', 'Check-in', 'Check-out', 'Nights', 'Total', 'Status']],
    ['#cliente-vacio', 'You have no reservations yet.'],

    // ---------- Portada ----------
    ['.hero-subtitulo', 'Welcome to Pacific paradise'],
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
    // data-tarifa: dashboard.js vuelve a poner el precio vigente tras traducir
    ['.habitacion-precio', '<strong data-tarifa="precioNoche">$1,850</strong> MXN / night'],
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

    // ---------- Reseñas ----------
    ['#resenas .seccion-etiqueta', 'Reviews'],
    ['#resenas .seccion-titulo', 'What our <em>guests</em> say'],
    ['#resenas-vacio', 'No reviews yet. Be the first to share your experience!'],
    ['.resena-form-titulo', 'Leave a review'],
    ['label[for="resena-nombre"]', 'Your name *'],
    ['#form-resena .campo-grupo:nth-child(2) > label', 'Rating *'],
    ['label[for="resena-comentario"]', 'Your comment *'],
    ['#resena-comentario', 'Tell us about your stay at Villas Cangrejo…', 'placeholder'],
    ['#form-resena button[type="submit"]', 'Submit review'],

    // ---------- Contacto y formulario de reserva ----------
    ['#contacto .seccion-etiqueta', 'Contact'],
    ['#contacto .seccion-titulo', 'Let\'s talk and <em>plan</em><br>your getaway'],
    ['.contacto-info > p', 'Our team is available every day to help you plan the perfect getaway to the ' +
      'Costa Alegre. Write to us, call us or visit us in San Patricio-Melaque.'],
    ['.detalle-texto strong', ['Address', 'Phone', 'Email', 'Hours']],
    ['.detalle-texto span', ['14 C. Palmas, San Patricio-Melaque, Jalisco, Mexico', null, null, null]],
    ['.formulario-titulo', 'Request your reservation'],
    ['.formulario-subtitulo', 'We reply within 24 hours by email or WhatsApp.'],
    ['.form-paso .paso-texto', ['Your details', 'Your stay', 'Anything else']],
    ['label[for="campo-nombre"]', 'Full name *'],
    ['#campo-nombre', 'e.g. Ana García López', 'placeholder'],
    ['#error-nombre', 'Please enter your full name.'],
    ['label[for="campo-email"]', 'Email *'],
    ['#campo-email', 'email@example.com', 'placeholder'],
    ['#error-email', 'Enter a valid email address.'],
    ['label[for="campo-telefono"]', 'Contact phone'],
    ['label[for="campo-llegada"]', 'Check-in date *'],
    ['#error-llegada', 'Select your check-in date.'],
    ['label[for="campo-salida"]', 'Check-out date *'],
    ['#error-salida', 'Check-out must be after check-in.'],
    ['label[for="campo-villa"]', 'Choose your villa * <small style="font-weight:400;opacity:.7">(all identical)</small>'],
    ['#campo-villa option[value=""]', '— Select a villa —'],
    ['#error-villa', 'Select a villa.'],
    ['label[for="campo-huespedes"]', 'Number of guests *'],
    ['#campo-huespedes option', ['— Number of guests —', '1 guest', '2 guests', '3 guests', '4 guests', '5+ guests']],
    ['#error-huespedes', 'Tell us how many guests are coming.'],
    ['label[for="campo-comentarios"]', 'Special requests'],
    ['#campo-comentarios', 'Food allergies, honeymoon, special celebration, etc.', 'placeholder'],
    ['#formulario-reservacion .btn-enviar', 'Send reservation request'],
    ['#formulario-exito p', '<strong>Thank you for your request!</strong><br>Our reservations team will ' +
      'contact you within the next 24 hours to confirm your stay at Villas Cangrejo.'],

    // ---------- Pie de página ----------
    ['.footer-marca p', 'Your home on the most beautiful coast of the Mexican Pacific. ' +
      'Nature, luxury and warmth in perfect harmony.'],
    ['.footer-columna h4', ['The Hotel', 'Services', 'Information']],
    ['.footer-columna li a', ['About', 'Villas', 'Comforts', 'Gallery',
      'Pool', 'Air conditioning', 'Wi-Fi internet', 'Long stays',
      'Reservations', 'Getting here', 'Privacy notice (Spanish)']],
    // Orden en la página: primero el registro (modal), luego el formulario de reserva
    ['.nota-privacidad', [
      'By creating an account you accept our <a href="aviso-privacidad.html" target="_blank">privacy notice</a> (in Spanish).',
      'By sending you accept our <a href="aviso-privacidad.html" target="_blank">privacy notice</a> (in Spanish).'
    ]],
    ['.footer-inferior p', ['© 2026 Villas Cangrejo. All rights reserved.',
      'Designed with enthusiasm for the <a href="#">Costa Alegre, Jalisco</a>']]
  ];

  // Textos exactos que arma el JS o manda el servidor.
  const MENSAJES = {
    // Formulario de reserva (main.js)
    '— Selecciona una villa —': '— Select a villa —',
    'Consultando disponibilidad…': 'Checking availability…',
    'No hay villas disponibles en esas fechas. Prueba con otras fechas.': 'No villas are available for those dates. Please try other dates.',
    'Reproducir música ambiental': 'Play ambient music',
    'Pausar música ambiental': 'Pause ambient music',
    // Acceso, registro y recuperación
    'Credenciales inválidas.': 'Invalid credentials.',
    'Faltan campos obligatorios.': 'Please fill in all required fields.',
    'El correo electrónico no es válido.': 'The email address is not valid.',
    'Ya existe una cuenta con ese correo.': 'An account with that email already exists.',
    'La contraseña es obligatoria.': 'A password is required.',
    'La contraseña debe tener al menos 8 caracteres.': 'The password must be at least 8 characters long.',
    'La contraseña no puede exceder 64 caracteres.': 'The password cannot be longer than 64 characters.',
    'Esa contraseña es demasiado común; elige una más segura.': 'That password is too common; please choose a stronger one.',
    'Demasiados intentos fallidos. Cuenta bloqueada 15 minutos. Puedes recuperar tu contraseña.':
      'Too many failed attempts. Account locked for 15 minutes. You can recover your password.',
    'Demasiados intentos desde esta red. Espera unos minutos e inténtalo de nuevo.':
      'Too many attempts from this network. Please wait a few minutes and try again.',
    '✅ Cuenta creada. Ahora inicia sesión.': '✅ Account created. Now sign in.',
    ' — ¿Olvidaste tu contraseña? Usa el enlace de abajo.': ' — Forgot your password? Use the link below.',
    'Ingresa tu correo electrónico.': 'Enter your email.',
    'Si el correo está registrado, enviamos un código de recuperación.': 'If that email is registered, we sent you a recovery code.',
    'Si el correo está registrado, enviamos un código.': 'If that email is registered, we sent you a code.',
    'Solicitud inválida o expirada. Pide un nuevo código.': 'Invalid or expired request. Please ask for a new code.',
    'El código expiró. Pide uno nuevo.': 'The code expired. Please ask for a new one.',
    'Demasiados intentos. Pide un nuevo código.': 'Too many attempts. Please ask for a new code.',
    'Código incorrecto.': 'Incorrect code.',
    'Contraseña actualizada. Ya puedes iniciar sesión.': 'Password updated. You can now sign in.',
    'Contraseña actualizada. Inicia sesión.': 'Password updated. Please sign in.',
    'Contraseña actualizada.': 'Password updated.',
    // Reservas
    'Número de villa inválido.': 'Invalid villa number.',
    'Fechas inválidas.': 'Invalid dates.',
    'La salida debe ser posterior a la llegada.': 'Check-out must be after check-in.',
    'No se pudo registrar la reserva:': 'The reservation could not be saved:',
    'Error cargando reservaciones: ': 'Error loading reservations: ',
    'No se pudo conectar con el servidor. Asegúrate de que el servidor Node esté corriendo (npm start) y abre la página en http://localhost:3000':
      'Could not connect to the server. Please check your connection and try again.',
    'pendiente': 'pending', 'confirmada': 'confirmed', 'rechazada': 'declined', 'cancelada': 'cancelled',
    'Demasiadas solicitudes desde esta red. Espera un rato e inténtalo de nuevo.':
      'Too many requests from this network. Please wait a while and try again.',
    'Petición inválida.': 'Invalid request.',
    'La petición es demasiado grande.': 'The request is too large.',
    // Reseñas
    'Escribe tu nombre y tu comentario.': 'Please write your name and your comment.',
    'La calificación debe ser de 1 a 5 estrellas.': 'The rating must be from 1 to 5 stars.',
    'El comentario es demasiado largo (máx. 600 caracteres).': 'The comment is too long (max. 600 characters).',
    '¡Gracias por tu reseña! Se publicará cuando el hotel la apruebe.': 'Thank you for your review! It will be published once the hotel approves it.',
    '¡Gracias por tu reseña!': 'Thank you for your review!',
    'Elige una calificación (estrellas).': 'Choose a rating (stars).',
    'de 5': 'out of 5', 'reseña': 'review', 'reseñas': 'reviews'
  };

  // Textos con números u otros datos variables.
  const PATRONES = [
    [/^✓ (\d+) de (\d+) villas disponibles para esas fechas\.$/, '✓ $1 of $2 villas available for those dates.'],
    [/^La Villa (\d+) ya no está disponible en esas fechas\. Elige otra villa u otras fechas\.$/,
      'Villa $1 is no longer available for those dates. Please choose another villa or other dates.'],
    [/^Cuenta bloqueada por seguridad\. Intenta en (\d+) min o recupera tu contraseña\.$/,
      'Account locked for security. Try again in $1 min or recover your password.'],
    [/^ \(código de prueba: (\d+)\)$/, ' (test code: $1)'],
    [/^Error (\d+)$/, 'Error $1']
  ];

  let idioma = 'es';
  const originales = new Map();   // elemento → { html | atributo: texto en español }
  const boton = document.getElementById('btn-idioma');

  function t(texto) {
    if (idioma !== 'en' || typeof texto !== 'string') return texto;
    if (Object.prototype.hasOwnProperty.call(MENSAJES, texto)) return MENSAJES[texto];
    for (const [re, en] of PATRONES) if (re.test(texto)) return texto.replace(re, en);
    return texto;
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
    // Para que main.js y dashboard.js vuelvan a dibujar lo que generan ellos.
    document.dispatchEvent(new CustomEvent('vc:idioma', { detail: nuevo }));
  });
})();
