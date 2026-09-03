// ════════════════════════════════════════════════════════════════════════════════════════
// MATRIZ DE SABOTAJE — v568 · «borrar una foto de progreso borra de verdad»
//
// `deletePhoto` borraba con un `filter` sobre una lista que la fila fusiona por UNION: la foto
// volvia en la siguiente sincronizacion. Y aqui es PEOR que en las medidas (v566), porque
// `deletePhotoFromStorage` SI borra el archivo — lo que resucitaba era una entrada apuntando a
// una imagen que ya no existe, o sea un recuadro roto donde estaba su «antes».
//
// Cada caso mete UN defecto real y exige que la suite se ponga en ROJO **por codigo de salida**
// (v524: leer el mensaje impreso no basta). El runner GRITA si el texto no aparece exactamente
// una vez: un sabotaje que no se aplica sale verde y se lee igual que un candado flojo.
//
//   node scripts/e2e/_sabotaje-fotos.mjs
// ════════════════════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const P = (f) => join(ROOT, f);

const CASOS = [
  {
    n: 'S1 · borrar vuelve a ser un `filter`: la foto resucita apuntando a un archivo borrado',
    file: 'app-5-salud.js',
    from: '  const lista=(typeof photoDelete===\'function\')?photoDelete((DB.photos||{})[cid]||[],photoId,new Date().toISOString()):null;',
    to: '  const lista=((DB.photos||{})[cid]||[]).filter(p=>p.id!==photoId);',
  },
  {
    n: 'S2 · la fila vuelve a fusionar las fotos por UNION (la lapida deja de importar)',
    file: 'avi-core.js',
    from: '  out.photos = pair((l, c) => mergePhotos(l, c), localRow.photos || [], cloudRow.photos || []);',
    to: '  out.photos = pair((l, c) => mergeClientArrays(l, c, byDate, \'desc\'), localRow.photos || [], cloudRow.photos || []);',
  },
  {
    n: 'S3 · las lapidas se ven como fotos (aparece el recuadro de la que ya borraste)',
    file: 'avi-core.js',
    from: 'function photoLive(list) { return tombLive(list, photoEntryId); }',
    to: 'function photoLive(list) { return tombNormalize(list, photoEntryId); }',
  },
  {
    n: 'S4 · una lapida ocupa el cupo de una foto viva (borrar te come el historial)',
    file: 'avi-core.js',
    from: '  return vivas.slice(0, cap).concat(tumbas);',
    to: '  return vivas.concat(tumbas).slice(0, cap);',
  },
  {
    n: 'S5 · la lapida pierde por fecha contra la copia viva de la nube',
    file: 'avi-core.js',
    from: '      if (t > tp) porId.set(it.id, it);',
    to: '      if (t >= tp && !it.del) porId.set(it.id, it);',
  },
  {
    n: 'S6 · se le pide a Storage que borre ANTES de saber si habia algo que borrar',
    file: 'app-5-salud.js',
    from: '  deletePhotoFromStorage(cid,photoId);\n  if(!DB.photos)DB.photos={};',
    to: '  if(!DB.photos)DB.photos={};',
  },
  {
    n: 'S7 · el boton de eliminar vuelve a borrar de UN toque, sin preguntar',
    file: 'app-5-salud.js',
    from: 'onclick="_photoAskDelete(this,',
    to: 'onclick="deletePhoto(',
  },
  {
    n: 'S8 · la confirmacion pierde su segundo paso (el primer toque ya borra)',
    file: 'app-5-salud.js',
    from: "  if(btn.dataset.armed==='1'){",
    to: '  if(true){',
  },
  {
    n: 'S9 · se puede borrar una foto con la pantalla bajo candado Premium',
    file: 'app-5-salud.js',
    from: "  if(typeof premiumLocked==='function'&&premiumLocked((DB.clients||[]).find(x=>x.id===cid)))return;",
    to: '  ;',
  },
  {
    n: 'S10 · las medidas dejan de delegar: vuelven las DOS definiciones de borrado',
    file: 'avi-core.js',
    from: 'function medLive(entries) { return tombLive(entries, medEntryId); }',
    to: 'function medLive(entries) { return medNormalize(entries).filter(e => !e.del); }',
  },
  {
    n: 'S11 · la identidad de una foto vieja sin id cambia en cada arranque (se duplica)',
    file: 'avi-core.js',
    from: "  return 'd:' + String(p.date || '');",
    to: "  return 'p' + Math.random().toString(36).slice(2);",
  },
  {
    n: 'S12 · la tarjeta de seguimiento cuenta lapidas como fotos',
    file: 'app-4-entreno.js',
    from: "  const ph=(typeof photoLive==='function')?photoLive((DB.photos||{})[clientId]||[]):((DB.photos||{})[clientId]||[]);",
    to: '  const ph=(DB.photos||{})[clientId]||[];',
  },
];

let muerden = 0;
const verdes = [];

for (const c of CASOS) {
  const path = P(c.file);
  const orig = readFileSync(path, 'utf8');
  // Los finales de linea de este repo NO son estables (v537): el patron se normaliza.
  const re = new RegExp(c.from.split('\n').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\r?\\n'));
  const veces = (orig.match(new RegExp(re.source, 'g')) || []).length;
  if (veces !== 1) {
    console.log(`\x1b[33m  !! NO SE APLICO\x1b[0m  ${c.n}  (el texto aparece ${veces} veces, se esperaba 1)`);
    verdes.push(c.n + ' [NO SE APLICO]');
    continue;
  }
  writeFileSync(path, orig.replace(re, c.to), 'utf8');
  let rojo = false;
  try {
    execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    rojo = true;                       // codigo de salida != 0 = la suite cayo
  } finally {
    writeFileSync(path, orig, 'utf8');  // restaurar SIEMPRE
  }
  if (rojo) { muerden++; console.log(`\x1b[32m  OK\x1b[0m  ${c.n}`); }
  else { verdes.push(c.n); console.log(`\x1b[31m  VERDE\x1b[0m  ${c.n}  <- el candado NO muerde`); }
}

console.log('\n' + '-'.repeat(70));
console.log(`${muerden}/${CASOS.length} sabotajes muerden`);
if (verdes.length) {
  console.log('\nSalieron VERDES (revisar):');
  verdes.forEach((v) => console.log('  - ' + v));
  process.exit(1);
}
console.log('MATRIZ OK');
