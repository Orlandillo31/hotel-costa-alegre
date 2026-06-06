/**
 * scripts/actualizar-admin.js
 * Crea o actualiza las credenciales del administrador en la base de datos.
 *
 * Las credenciales NUNCA se escriben en el código. Se leen de:
 *   1) variables de entorno ADMIN_USER / ADMIN_PASS (.env), o
 *   2) argumentos de línea de comandos.
 *
 * Uso:
 *   npm run actualizar-admin
 *   node server/scripts/actualizar-admin.js "Usuario" "ContraseñaSegura"
 *
 * Requiere MONGODB_URI en .env para escribir en la base persistente.
 */
require('dotenv').config();

const bcrypt = require('bcryptjs');
const db     = require('../config/db');
const Admin  = require('../models/Admin');
const { validarPassword } = require('../utils/password');

(async () => {
  const usuario = process.env.ADMIN_USER || process.argv[2];
  const pass    = process.env.ADMIN_PASS || process.argv[3];

  if (!usuario || !pass) {
    console.error('❌ Faltan credenciales.');
    console.error('   Define ADMIN_USER y ADMIN_PASS en .env, o pásalos como argumentos:');
    console.error('   node server/scripts/actualizar-admin.js "Usuario" "ContraseñaSegura"');
    process.exit(1);
  }

  const errPass = validarPassword(pass);
  if (errPass) { console.error('❌ Contraseña no válida:', errPass); process.exit(1); }

  if (!process.env.MONGODB_URI) {
    console.warn('⚠  Sin MONGODB_URI: los cambios irían a una BD en memoria y NO persistirían.');
  }

  await db.conectar();
  const passwordHash = await bcrypt.hash(pass, db.BCRYPT_ROUNDS);
  await Admin.findOneAndUpdate(
    { usuario },
    { usuario, passwordHash, nombre: usuario + ' — Administrador' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('✅ Administrador actualizado: "' + usuario + '"');
  await db.desconectar();
  process.exit(0);
})();
