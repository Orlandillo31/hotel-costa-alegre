/**
 * utils/password.js — Política de contraseñas según NIST SP 800-63B.
 *
 * Recomendaciones aplicadas:
 *   • Longitud mínima 8 (permitir frases largas, hasta 64).
 *   • Sin reglas de composición obligatorias (no exigir símbolos/números).
 *   • Rechazar contraseñas comunes / filtradas.
 *   • No forzar expiración periódica.
 */

// Pequeña lista negra de contraseñas extremadamente comunes.
const COMUNES = new Set([
  '12345678', '123456789', '1234567890', 'password', 'passw0rd',
  'contrasena', 'contraseña', 'qwertyui', 'qwerty123', '11111111',
  '00000000', 'iloveyou', 'admin123', 'administrador', 'bienvenido'
]);

/**
 * Devuelve null si la contraseña es válida, o un string con el motivo
 * del rechazo si no lo es.
 */
function validarPassword(pwd) {
  if (typeof pwd !== 'string')        return 'La contraseña es obligatoria.';
  if (pwd.length < 8)                 return 'La contraseña debe tener al menos 8 caracteres.';
  if (pwd.length > 64)               return 'La contraseña no puede exceder 64 caracteres.';
  if (COMUNES.has(pwd.toLowerCase())) return 'Esa contraseña es demasiado común; elige una más segura.';
  return null;
}

module.exports = { validarPassword };
