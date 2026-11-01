/* =======================================================
   Villas Cangrejo — Animación de bienvenida (solo la portada)
   Se carga en el <head>, antes de dibujar la página, para decidir
   a tiempo si se muestra: solo la primera vez que el visitante
   entra al inicio en esta sesión. Si regresa al inicio, ya no.
   La animación en sí es CSS (.intro en styles.css).
======================================================= */
try {
  if (sessionStorage.getItem('vc_intro')) document.documentElement.classList.add('sin-intro');
  else sessionStorage.setItem('vc_intro', '1');
} catch (e) { /* sin almacenamiento: se muestra, dura 2 segundos */ }
