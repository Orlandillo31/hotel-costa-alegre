/**
 * Crea un respaldo CIFRADO de la base de datos real.
 *
 *   npm run respaldo                      → respaldos/respaldo-AAAA-MM-DD.vcbk
 *   node server/scripts/respaldo.js X.vcbk
 *
 * Necesita MONGODB_URI y BACKUP_PASSWORD (en .env o como variables). GitHub
 * Actions lo ejecuta cada día (.github/workflows/respaldo.yml).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { exportar, cifrar } = require('../utils/respaldo');

(async () => {
  const { MONGODB_URI, BACKUP_PASSWORD } = process.env;
  if (!MONGODB_URI)     throw new Error('Falta MONGODB_URI (la base de datos a respaldar).');
  if (!BACKUP_PASSWORD) throw new Error('Falta BACKUP_PASSWORD (la contraseña con la que se cifra el respaldo).');

  const destino = process.argv[2] ||
    path.join('respaldos', 'respaldo-' + new Date().toISOString().slice(0, 10) + '.vcbk');
  fs.mkdirSync(path.dirname(path.resolve(destino)), { recursive: true });

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  const respaldo = await exportar();
  fs.writeFileSync(destino, cifrar(respaldo, BACKUP_PASSWORD));
  await mongoose.disconnect();

  console.log('✅ Respaldo cifrado creado:', destino);
  for (const [nombre, docs] of Object.entries(respaldo.colecciones)) console.log('   ' + nombre + ':', docs.length);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
