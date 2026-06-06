/**
 * config/db.js — Conexión a MongoDB y datos iniciales.
 *
 *  • Si existe MONGODB_URI (p. ej. MongoDB Atlas) se conecta a esa base
 *    real y PERSISTENTE.
 *  • Si NO existe (desarrollo local rápido), arranca un MongoDB en memoria
 *    para poder probar sin instalar nada. ⚠ Esos datos NO persisten.
 *
 *  En el primer arranque crea el administrador a partir de las variables
 *  de entorno ADMIN_USER / ADMIN_PASS (nunca se hardcodean credenciales).
 */
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const Admin    = require('../models/Admin');

// Constantes del negocio: 16 villas idénticas a precio fijo.
const PRECIO_NOCHE  = 1850;
const NUM_VILLAS    = 16;
const BCRYPT_ROUNDS = 12;          // factor de costo recomendado (OWASP)

let memServer = null;

async function conectar() {
  let uri = process.env.MONGODB_URI;

  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memServer = await MongoMemoryServer.create();
    uri = memServer.getUri();
    console.warn('⚠  MONGODB_URI no definida → usando MongoDB EN MEMORIA (datos no persistentes).');
    console.warn('   Define MONGODB_URI en .env (MongoDB Atlas) para persistencia real.');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log('🗄  Conectado a MongoDB');

  await crearAdminInicial();
}

async function crearAdminInicial() {
  if (await Admin.countDocuments() > 0) return;

  const usuario = process.env.ADMIN_USER;
  const pass    = process.env.ADMIN_PASS;
  if (!usuario || !pass) {
    console.warn('⚠  No hay administrador y faltan ADMIN_USER/ADMIN_PASS.');
    console.warn('   Créalo con: npm run actualizar-admin  (o define las variables en .env)');
    return;
  }

  const passwordHash = await bcrypt.hash(pass, BCRYPT_ROUNDS);
  await Admin.create({ usuario, passwordHash, nombre: usuario + ' — Administrador' });
  console.log('🔑 Administrador inicial creado para el usuario: "' + usuario + '"');
}

async function desconectar() {
  await mongoose.disconnect();
  if (memServer) await memServer.stop();
}

module.exports = { conectar, desconectar, PRECIO_NOCHE, NUM_VILLAS, BCRYPT_ROUNDS };
