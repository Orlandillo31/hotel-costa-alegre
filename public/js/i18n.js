/* ============================================================
 *  VILLAS CANGREJO — Versión en inglés (ES/EN)
 * ============================================================
 *  El español está en el HTML. El inglés va en el mismo elemento:
 *    data-en="..."             → contenido (puede llevar <span>, <a>…)
 *    data-en-placeholder="..." → texto de ayuda de un campo
 *    data-en-aria-label="..."  → nombre para lectores de pantalla
 *    data-en-alt="..."         → descripción de una imagen
 *    <html data-en-title="..."> → título de la pestaña
 *  MENSAJES: textos que arma main.js; los pasa por window.VC_t().
 *  Idioma inicial: el que eligió el visitante (se recuerda entre
 *  páginas) o, si es su primera visita, el de su navegador.
 * ============================================================ */
(function () {
  'use strict';

  const CLAVE = 'vc_idioma';
  const ATRIBUTOS = ['placeholder', 'aria-label', 'alt'];
  const raiz = document.documentElement;
  const TITULO = { es: document.title, en: raiz.dataset.enTitle || document.title };

  // Textos exactos que arma main.js
  const MENSAJES = {
    'Menú': 'Menu',
    'Cerrar': 'Close'
  };

  let idioma = 'es';
  const originales = new Map();   // elemento → { html | atributo: texto en español }
  // Botones de idioma: en la cabecera y dentro del menú del celular
  const botones = document.querySelectorAll('.boton-idioma');

  function t(texto) {
    if (idioma !== 'en' || typeof texto !== 'string') return texto;
    return Object.prototype.hasOwnProperty.call(MENSAJES, texto) ? MENSAJES[texto] : texto;
  }

  // Guarda el español la primera vez y pone el idioma pedido
  function cambiar(el, clave, ingles, lang, leer, escribir) {
    let orig = originales.get(el);
    if (!orig) { orig = {}; originales.set(el, orig); }
    if (!(clave in orig)) orig[clave] = leer();
    escribir(lang === 'en' ? ingles : orig[clave]);
  }

  function aplicar(lang) {
    idioma = lang;
    raiz.lang = lang;
    document.title = TITULO[lang];
    document.querySelectorAll('[data-en]').forEach(el =>
      cambiar(el, 'html', el.dataset.en, lang, () => el.innerHTML, v => { el.innerHTML = v; }));
    ATRIBUTOS.forEach(attr => {
      document.querySelectorAll(`[data-en-${attr}]`).forEach(el =>
        cambiar(el, attr, el.getAttribute(`data-en-${attr}`), lang,
          () => el.getAttribute(attr), v => el.setAttribute(attr, v)));
    });
    actualizarBoton();
  }

  // Cada botón dice el idioma al que cambia, escrito en ese idioma
  function actualizarBoton() {
    botones.forEach(b => {
      b.textContent = idioma === 'en' ? 'Español' : 'English';
      b.lang = idioma === 'en' ? 'es' : 'en';
    });
  }

  window.VC_t = t;
  window.VC_idioma = () => idioma;

  // Idioma inicial
  let guardado = null;
  try { guardado = localStorage.getItem(CLAVE); } catch { /* almacenamiento bloqueado */ }
  const delNavegador = (navigator.languages && navigator.languages[0]) || navigator.language || 'es';
  const inicial = guardado === 'es' || guardado === 'en' ? guardado : (/^es\b/i.test(delNavegador) ? 'es' : 'en');
  if (inicial === 'en') aplicar('en'); else actualizarBoton();   // el español ya está en el HTML

  botones.forEach(b => b.addEventListener('click', () => {
    const nuevo = idioma === 'en' ? 'es' : 'en';
    aplicar(nuevo);
    try { localStorage.setItem(CLAVE, nuevo); } catch { /* sin almacenamiento: dura hasta recargar */ }
    // Para que main.js vuelva a dibujar lo que genera (precio estimado, texto por palabras, menú)
    document.dispatchEvent(new CustomEvent('vc:idioma', { detail: nuevo }));
  }));
})();
