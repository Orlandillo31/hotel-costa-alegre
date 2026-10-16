/**
 * utils/respaldo.js — Respaldo completo de la base de datos, CIFRADO.
 *
 *  exportar()  → todas las colecciones como EJSON (conserva ObjectId y fechas)
 *  cifrar()    → gzip + AES-256-GCM con una clave derivada (scrypt) de la
 *                contraseña de respaldos. Sin esa contraseña el archivo no se
 *                puede leer (importante: el repositorio de GitHub es público).
 *  descifrar() / importar() → el camino de regreso para restaurar.
 *
 * Formato del archivo: "VCBK1" | sal (16) | iv (12) | etiqueta (16) | datos cifrados
 */
const crypto   = require('crypto');
const zlib     = require('zlib');
const mongoose = require('mongoose');

const { EJSON } = mongoose.mongo.BSON;
const MAGICO = Buffer.from('VCBK1');

function clave(password, sal) {
  if (!password || password.length < 12) {
    throw new Error('La contraseña de respaldos debe tener al menos 12 caracteres.');
  }
  return crypto.scryptSync(password, sal, 32);
}

async function exportar() {
  const db = mongoose.connection.db;
  const colecciones = {};
  for (const { name } of await db.listCollections({}, { nameOnly: true }).toArray()) {
    if (name.startsWith('system.')) continue;
    colecciones[name] = await db.collection(name).find().toArray();
  }
  return { version: 1, creado: new Date().toISOString(), colecciones };
}

function cifrar(respaldo, password) {
  const sal = crypto.randomBytes(16);
  const iv  = crypto.randomBytes(12);
  const cifrador = crypto.createCipheriv('aes-256-gcm', clave(password, sal), iv);
  const datos = Buffer.concat([
    cifrador.update(zlib.gzipSync(EJSON.stringify(respaldo, { relaxed: false }))),
    cifrador.final()
  ]);
  return Buffer.concat([MAGICO, sal, iv, cifrador.getAuthTag(), datos]);
}

function descifrar(archivo, password) {
  if (!archivo.subarray(0, 5).equals(MAGICO)) throw new Error('El archivo no es un respaldo de Villas Cangrejo.');
  const sal = archivo.subarray(5, 21), iv = archivo.subarray(21, 33), etiqueta = archivo.subarray(33, 49);
  const descifrador = crypto.createDecipheriv('aes-256-gcm', clave(password, sal), iv);
  descifrador.setAuthTag(etiqueta);
  let plano;
  try {
    plano = Buffer.concat([descifrador.update(archivo.subarray(49)), descifrador.final()]);
  } catch {
    throw new Error('Contraseña incorrecta o archivo dañado.');
  }
  return EJSON.parse(zlib.gunzipSync(plano).toString('utf8'), { relaxed: false });
}

// Reemplaza el contenido de cada colección del respaldo (¡borra lo actual!).
async function importar(respaldo) {
  const db = mongoose.connection.db;
  const resumen = {};
  for (const [nombre, docs] of Object.entries(respaldo.colecciones)) {
    await db.collection(nombre).deleteMany({});
    if (docs.length) await db.collection(nombre).insertMany(docs);
    resumen[nombre] = docs.length;
  }
  return resumen;
}

module.exports = { exportar, cifrar, descifrar, importar };
