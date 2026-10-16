/**
 * Restaura un respaldo cifrado.
 *
 *   npm run restaurar -- archivo.vcbk              → solo muestra qué contiene
 *   npm run restaurar -- archivo.vcbk --confirmar  → REEMPLAZA los datos actuales
 *
 * Necesita MONGODB_URI (la base de destino) y BACKUP_PASSWORD.
 * ⚠ Con --confirmar se borra lo que haya en cada colección del respaldo y se
 *   pone lo del archivo. Úsalo solo para recuperarte de una pérdida de datos.
 */
require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');
const { descifrar, importar } = require('../utils/respaldo');

(async () => {
  const archivo = process.argv[2];
  const confirmar = process.argv.includes('--confirmar');
  const { MONGODB_URI, BACKUP_PASSWORD } = process.env;
  if (!archivo)         throw new Error('Indica el archivo: npm run restaurar -- respaldo.vcbk');
  if (!BACKUP_PASSWORD) throw new Error('Falta BACKUP_PASSWORD.');

  const respaldo = descifrar(fs.readFileSync(archivo), BACKUP_PASSWORD);
  console.log('Respaldo del', respaldo.creado);
  for (const [nombre, docs] of Object.entries(respaldo.colecciones)) console.log('   ' + nombre + ':', docs.length);

  if (!confirmar) {
    console.log('\nNo se cambió nada. Para restaurar de verdad agrega --confirmar.');
    return;
  }
  if (!MONGODB_URI) throw new Error('Falta MONGODB_URI (la base de datos de destino).');
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  const resumen = await importar(respaldo);
  await mongoose.disconnect();
  console.log('\n✅ Restaurado:', resumen);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
