/* =======================================================
   Villas Cangrejo — JavaScript principal
   Archivo: js/main.js
   Descripción: Interactividad de la página: navbar, menú
   hamburguesa, parallax, scroll reveal, contadores,
   lightbox de galería, audio ambiental, precio estimado y
   formulario de reserva por WhatsApp.
======================================================= */

// Traduce los textos que arma este archivo cuando la página está en inglés
// (js/i18n.js define window.VC_t; si no está, deja el español).
const traducir = s => (window.VC_t ? window.VC_t(s) : s);

// -------------------------------------------------------
    // 1. NAVBAR — Se vuelve sólida al hacer scroll
    // -------------------------------------------------------
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', () => {
      if (window.scrollY > 60) {
        navbar.classList.add('navbar-solida');
      } else {
        navbar.classList.remove('navbar-solida');
      }
    });

    // -------------------------------------------------------
    // 2. MENÚ HAMBURGUESA — Toggle en mobile
    // -------------------------------------------------------
    const botonHamburguesa = document.getElementById('boton-hamburguesa');
    const navbarMenu       = document.getElementById('navbar-menu');

    botonHamburguesa.addEventListener('click', () => {
      const estaAbierto = navbarMenu.classList.toggle('abierto');
      botonHamburguesa.classList.toggle('activo', estaAbierto);
      botonHamburguesa.setAttribute('aria-expanded', estaAbierto);
    });

    // Cerrar menú al hacer clic en cualquier link del menú
    navbarMenu.querySelectorAll('a').forEach(enlace => {
      enlace.addEventListener('click', () => {
        navbarMenu.classList.remove('abierto');
        botonHamburguesa.classList.remove('activo');
        botonHamburguesa.setAttribute('aria-expanded', 'false');
      });
    });

    // -------------------------------------------------------
    // 3. PARALLAX SUAVE EN EL HERO
    //    El fondo se desplaza a la mitad de la velocidad del scroll,
    //    creando un efecto de profundidad.
    // -------------------------------------------------------
    const heroFondo = document.getElementById('hero-fondo');

    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      // Solo aplica parallax mientras el hero sea visible
      if (scrollY < window.innerHeight) {
        heroFondo.style.transform = `scale(1.08) translateY(${scrollY * 0.3}px)`;
      }
    });

    // -------------------------------------------------------
    // 4. INTERSECTION OBSERVER — Animación de aparición en scroll
    //    Agrega la clase .visible cuando el elemento entra en pantalla.
    // -------------------------------------------------------
    const elementosReveal = document.querySelectorAll('.reveal');

    const observadorReveal = new IntersectionObserver((entradas) => {
      entradas.forEach(entrada => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('visible');
          // Una vez visible, dejar de observar para mejorar rendimiento
          observadorReveal.unobserve(entrada.target);
        }
      });
    }, {
      threshold: 0.12,      // 12% del elemento debe estar visible
      rootMargin: '0px 0px -40px 0px'
    });

    elementosReveal.forEach(el => observadorReveal.observe(el));

    // -------------------------------------------------------
    // 5. CONTADORES ANIMADOS DE ESTADÍSTICAS
    //    Cuenta desde 0 hasta el número indicado en data-destino.
    //    Se activa cuando el elemento entra en el viewport.
    // -------------------------------------------------------
    const numerosEstadisticas = document.querySelectorAll('.stat-numero[data-destino]');

    const observadorContador = new IntersectionObserver((entradas) => {
      entradas.forEach(entrada => {
        if (!entrada.isIntersecting) return;

        const elemento  = entrada.target;
        const valorFinal = parseInt(elemento.getAttribute('data-destino'), 10);
        const duracion   = 1800; // milisegundos
        const inicio     = performance.now();

        // Función recursiva de animación con requestAnimationFrame
        function animarContador(tiempoActual) {
          const progreso  = Math.min((tiempoActual - inicio) / duracion, 1);
          // Función de easing: ease-out cuadrático
          const easedProg = 1 - Math.pow(1 - progreso, 3);
          elemento.textContent = Math.floor(easedProg * valorFinal);
          if (progreso < 1) requestAnimationFrame(animarContador);
          else elemento.textContent = valorFinal; // asegurar valor final exacto
        }

        requestAnimationFrame(animarContador);
        observadorContador.unobserve(elemento);
      });
    }, { threshold: 0.5 });

    numerosEstadisticas.forEach(num => observadorContador.observe(num));

    // -------------------------------------------------------
    // 6. LIGHTBOX DE GALERÍA
    //    Al clic en una foto se abre el modal con la imagen ampliada.
    //    Soporta navegación prev/next y cierre con Escape.
    // -------------------------------------------------------
    const fotosGaleria  = document.querySelectorAll('.galeria-item');
    const lightbox      = document.getElementById('lightbox');
    const lightboxImg   = document.getElementById('lightbox-imagen');
    const btnCerrar     = document.getElementById('lightbox-cerrar');
    const btnPrev       = document.getElementById('lightbox-prev');
    const btnNext       = document.getElementById('lightbox-next');

    // Extraer las URLs de las fotos en un arreglo
    const urlsFotos = Array.from(fotosGaleria).map(item => item.querySelector('.galeria-foto').src);
    let indiceActual = 0;

    // Función para abrir el lightbox en un índice dado
    function abrirLightbox(indice) {
      indiceActual = indice;
      lightboxImg.src = urlsFotos[indiceActual];
      lightbox.classList.add('abierto');
      document.body.style.overflow = 'hidden'; // evitar scroll mientras está abierto
    }

    // Función para cerrar el lightbox
    function cerrarLightbox() {
      lightbox.classList.remove('abierto');
      document.body.style.overflow = '';
    }

    // Función para ir a la foto anterior
    function fotoAnterior() {
      indiceActual = (indiceActual - 1 + urlsFotos.length) % urlsFotos.length;
      lightboxImg.src = urlsFotos[indiceActual];
    }

    // Función para ir a la foto siguiente
    function fotoSiguiente() {
      indiceActual = (indiceActual + 1) % urlsFotos.length;
      lightboxImg.src = urlsFotos[indiceActual];
    }

    // Asignar eventos a cada foto de la galería
    fotosGaleria.forEach((item, i) => {
      item.addEventListener('click', () => abrirLightbox(i));
    });

    btnCerrar.addEventListener('click', cerrarLightbox);
    btnPrev.addEventListener('click', fotoAnterior);
    btnNext.addEventListener('click', fotoSiguiente);

    // Cerrar lightbox al hacer clic en el fondo oscuro
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) cerrarLightbox();
    });

    // Navegación con teclado (← → Escape)
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('abierto')) return;
      if (e.key === 'Escape')      cerrarLightbox();
      if (e.key === 'ArrowLeft')   fotoAnterior();
      if (e.key === 'ArrowRight')  fotoSiguiente();
    });

    // -------------------------------------------------------
    // 8. REPRODUCTOR DE AUDIO AMBIENTAL
    //    Botón play/pausa personalizado. Al reproducir, las
    //    barras de onda se animan; al pausar, se detienen.
    // -------------------------------------------------------
    const btnAudio       = document.getElementById('btn-audio');
    const audioAmbiental = document.getElementById('audio-ambiental');
    const ondaAudio      = document.querySelector('.onda-audio');

    if (btnAudio && audioAmbiental) {
      btnAudio.addEventListener('click', () => {
        if (audioAmbiental.paused) {
          audioAmbiental.play();
          btnAudio.textContent = '❚❚';
          btnAudio.setAttribute('aria-label', traducir('Pausar música ambiental'));
          ondaAudio.classList.remove('pausada');
        } else {
          audioAmbiental.pause();
          btnAudio.textContent = '▶';
          btnAudio.setAttribute('aria-label', traducir('Reproducir música ambiental'));
          ondaAudio.classList.add('pausada');
        }
      });

      // Si el audio se detiene por cualquier motivo, restablecer el botón
      audioAmbiental.addEventListener('pause', () => {
        btnAudio.textContent = '▶';
        ondaAudio.classList.add('pausada');
      });
    }


    // -------------------------------------------------------
    // 9. FORMULARIO DE RESERVA → WHATSAPP
    //    Valida los campos y abre WhatsApp con el mensaje armado.
    //    No se guarda nada en un servidor: el hotel atiende las
    //    reservaciones directamente por WhatsApp.
    // -------------------------------------------------------
    const formulario   = document.getElementById('formulario-reservacion');
    const mensajeExito = document.getElementById('formulario-exito');
    const TELEFONO_HOTEL = '523151007106';
    const enlaceWhatsApp = texto => `https://wa.me/${TELEFONO_HOTEL}?text=${encodeURIComponent(texto)}`;

    // Fecha local 'YYYY-MM-DD' (toISOString daría la de UTC: en México,
    // después de las 6 de la tarde ya sería "mañana").
    function fechaLocal(d = new Date()) {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    // Función auxiliar: mostrar o quitar error de un campo
    function mostrarError(campoId, errorId, mostrar) {
      const campo = document.getElementById(campoId);
      const error = document.getElementById(errorId);
      if (mostrar) {
        campo.classList.add('error');
        error.classList.add('visible');
      } else {
        campo.classList.remove('error');
        error.classList.remove('visible');
      }
    }

    formulario.addEventListener('submit', (e) => {
      e.preventDefault(); // Evitar recarga de página
      let formularioValido = true;

      // --- Validar nombre (mínimo 3 caracteres) ---
      const nombre = document.getElementById('campo-nombre').value.trim();
      const nombreInvalido = nombre.length < 3;
      mostrarError('campo-nombre', 'error-nombre', nombreInvalido);
      if (nombreInvalido) formularioValido = false;

      // --- Validar email (opcional; si lo escribe, que sea válido) ---
      const email = document.getElementById('campo-email').value.trim();
      const emailInvalido = email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      mostrarError('campo-email', 'error-email', emailInvalido);
      if (emailInvalido) formularioValido = false;

      // --- Validar fecha de llegada (no puede ser vacía ni en el pasado) ---
      const llegada = document.getElementById('campo-llegada').value;
      const llegadaInvalida = !llegada || llegada < fechaLocal();
      mostrarError('campo-llegada', 'error-llegada', llegadaInvalida);
      if (llegadaInvalida) formularioValido = false;

      // --- Validar fecha de salida (debe ser posterior a la llegada) ---
      const salida = document.getElementById('campo-salida').value;
      const salidaInvalida = !salida || salida <= llegada;
      mostrarError('campo-salida', 'error-salida', salidaInvalida);
      if (salidaInvalida) formularioValido = false;

      // --- Validar número de huéspedes ---
      const campoHues = document.getElementById('campo-huespedes');
      const huespedesInvalido = !campoHues.value;
      mostrarError('campo-huespedes', 'error-huespedes', huespedesInvalido);
      if (huespedesInvalido) formularioValido = false;

      if (!formularioValido) return;

      // ---------- Armar el mensaje (siempre en español: lo lee el hotel) ----------
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

      // Mostrar el mensaje de éxito (con enlace de respaldo) y ocultar el formulario
      document.getElementById('exito-whatsapp').href = url;
      formulario.style.display   = 'none';
      mensajeExito.style.display = 'block';
      mensajeExito.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // Limpiar error de un campo en tiempo real cuando el usuario empieza a escribir
    ['campo-nombre', 'campo-email', 'campo-llegada', 'campo-salida', 'campo-huespedes'].forEach(id => {
      const campo = document.getElementById(id);
      campo.addEventListener('input', () => {
        campo.classList.remove('error');
        // Quitar el mensaje de error asociado
        const errorEl = document.getElementById('error-' + id.replace('campo-', ''));
        if (errorEl) errorEl.classList.remove('visible');
      });
    });

    // -------------------------------------------------------
    // 10. PRECIO ESTIMADO
    //     < 30 noches: por noche. 30+ noches: tarifa mensual prorrateada
    //     (30–59 → 1 mes, 60–89 → 2 meses, 90+ → 3 meses; un mes = 30 noches).
    //     Los precios se leen de la sección de villas (data-tarifa), así
    //     solo hay que cambiarlos en un lugar del HTML.
    // -------------------------------------------------------
    const NOCHES_MES = 30;
    const tarifas = {};
    document.querySelectorAll('[data-tarifa]').forEach(el => {
      tarifas[el.dataset.tarifa] = Number(el.textContent.replace(/[^\d]/g, ''));
    });
    const fmtDinero = n => '$' + n.toLocaleString('es-MX');

    // Noches entre dos fechas 'YYYY-MM-DD' (0 si no son válidas)
    function nochesEntre(a, b) {
      return (a && b && b > a)
        ? Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000) : 0;
    }

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

    const inputLlegada = document.getElementById('campo-llegada');
    const inputSalida  = document.getElementById('campo-salida');
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

    // -------------------------------------------------------
    // 11. ESQUELETOS DE CARGA
    //     Mientras una foto se descarga se ve un recuadro con un brillo
    //     que pasa (CSS: img.esqueleto); al llegar, la foto aparece suave.
    //     Las fotos con loading="lazy" muestran el esqueleto hasta que el
    //     visitante se acerca y terminan de descargarse.
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

    // Fotos de fondo (portada y banner): el brillo va detrás en CSS; aquí
    // solo se apaga la animación cuando la foto ya cargó.
    [['hero', 'hero-fondo'], ['cta-banner', 'cta-banner-fondo']].forEach(([seccionId, fondoId]) => {
      const seccion = document.getElementById(seccionId);
      const fondo   = document.getElementById(fondoId);
      const url = fondo && getComputedStyle(fondo).backgroundImage.match(/url\(["']?([^"')]+)/);
      if (!url) return;
      const foto = new Image();
      foto.onload = foto.onerror = () => seccion.classList.add('fondo-listo');
      foto.src = url[1];
    });

    // -------------------------------------------------------
    // BONUS: Smooth scroll personalizado para links del navbar
    // (complementa el scroll-behavior: smooth del CSS)
    // -------------------------------------------------------
    document.querySelectorAll('a[href^="#"]').forEach(enlace => {
      enlace.addEventListener('click', (e) => {
        const href = enlace.getAttribute('href');
        if (href === '#') return;
        const destino = document.querySelector(href);
        if (destino) {
          e.preventDefault();
          const offsetTop = destino.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: offsetTop, behavior: 'smooth' });
        }
      });
    });
