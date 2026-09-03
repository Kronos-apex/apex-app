// ════════════════════════════════════════════════════════════════════════════════════════
// MATRIZ DE SABOTAJE — v566 · «las medidas se pueden corregir, borrar y comparar por lado»
//
// Cada caso mete UN defecto real y exige que la suite se ponga en ROJO **por codigo de
// salida** (v524: leer el mensaje impreso no basta).
//
// El corazon de la matriz es S1: hasta v565 borrar era un `filter`, y la fila del usuario
// se fusiona con la nube por UNION — lo borrado en un telefono volvia en la siguiente
// fusion. S2 es su gemelo: la lapida puede estar perfecta y no servir de nada si
// `mergeAuthRow` vuelve a fusionar las medidas por fecha.
//
//   node scripts/e2e/_sabotaje-medidas.mjs
// ════════════════════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const P = (f) => join(ROOT, f);

const CASOS = [
  {
    n: 'S1 · borrar vuelve a ser un `filter`: lo eliminado resucita desde la nube',
    file: 'avi-core.js',
    from: '  lista[i] = { id: lista[i].id, date: lista[i].date, del: true, mAt: at };',
    to: '  lista.splice(i, 1);',
  },
  {
    n: 'S2 · la fila vuelve a fusionar las medidas por UNION (la lapida deja de importar)',
    file: 'avi-core.js',
    from: '  out.medidas = pair((l, c) => mergeMedidas(l, c), localRow.medidas || [], cloudRow.medidas || []);',
    to: '  out.medidas = pair((l, c) => mergeClientArrays(l, c, byDate, \'desc\'), localRow.medidas || [], cloudRow.medidas || []);',
  },
  {
    n: 'S3 · las lapidas se ven como tomas (la lista muestra lo que ya borraste)',
    file: 'avi-core.js',
    from: '    .filter(e => !e.del)',
    to: '    .filter(e => true)',
  },
  {
    n: 'S4 · corregir un dedazo MUEVE la fecha de la toma (te reescribe la historia)',
    file: 'avi-core.js',
    from: '    const base = { id: prev.id, date: prev.date, mAt: at };',
    to: '    const base = { id: prev.id, date: at, mAt: at };',
  },
  {
    n: 'S5 · editar MEZCLA en vez de reemplazar (el valor que borraste sigue vivo)',
    file: 'avi-core.js',
    from: '    lista[i] = Object.assign(base, limpio);',
    to: '    lista[i] = Object.assign({}, prev, base, limpio);',
  },
  {
    n: 'S6 · corregir borra la medida vieja sin lado (el unico dato que esa persona dio)',
    file: 'avi-core.js',
    from: '    MED_LEGACY.forEach(f => { if (prev[f.key] != null) base[f.key] = prev[f.key]; });',
    to: '    ;',
  },
  {
    n: 'S7 · a una medida vieja se le INVENTA el lado (un «brazo: 31» pasa a ser el derecho)',
    file: 'avi-core.js',
    from: "  { key: 'brazo',       label: 'Brazo (sin lado)',       par: 'brazo' },",
    to: "  { key: 'brazo',       label: 'Brazo (sin lado)',       par: 'brazo', lado: 'der' },",
  },
  {
    n: 'S8 · la identidad de las tomas viejas cambia (se duplican al actualizar la app)',
    file: 'avi-core.js',
    from: "  return 'd:' + String(entry.date || '');",
    to: "  return 'm' + Math.random().toString(36).slice(2);",
  },
  {
    // REAPUNTADO en v568: el recorte se mudo a la capa generica `tombPrune` cuando medidas y
    // fotos pasaron a compartir una sola definicion de borrado, y este ancla quedo en 0
    // ocurrencias ("NO SE APLICO"). La linea comun ya la sabotea `_sabotaje-fotos` S4; aqui se
    // ataca la DELEGACION de medidas, que es lo propio de esta matriz.
    n: 'S9 · medPrune deja de topar y las lapidas ocupan el cupo de las tomas vivas',
    file: 'avi-core.js',
    from: '  return tombPrune(entries, medEntryId, MED_CAP, MED_TUMBA_DIAS, nowIso);',
    to: '  return tombNormalize(entries, medEntryId);',
  },
  {
    n: 'S10 · el umbral de asimetria se mide en cm y no en % (sobre-alarma en el brazo)',
    file: 'app-5-salud.js',
    from: 'if(a.pct<MED_ASIM_RUIDO)',
    to: 'if(a.dif<MED_ASIM_RUIDO)',
  },
  {
    n: 'S11 · desaparece el piso de ruido: se alarma por medio centimetro de cinta',
    file: 'app-5-salud.js',
    from: 'const MED_ASIM_RUIDO=5, MED_ASIM_HABLAR=10;',
    to: 'const MED_ASIM_RUIDO=0, MED_ASIM_HABLAR=10;',
  },
  {
    n: 'S12 · la pantalla vuelve a prometer FUERZA a partir de una cinta metrica',
    file: 'app-5-salud.js',
    from: 'Es una diferencia de <b>tamaño</b>',
    to: 'Es un <b>desequilibrio de fuerza</b>',
  },
  {
    n: 'S13 · a un MENOR se le vuelve a interpretar cintura y cadera',
    file: 'app-5-salud.js',
    from: "const sinInterpretar=k=>menor&&(k==='cintura'||k==='cadera');",
    to: 'const sinInterpretar=k=>false;',
  },
  {
    n: 'S14 · vuelve la columna de ceros: con UNA toma se dice que no cambio nada',
    file: 'app-5-salud.js',
    from: 'const primera=!medComparable((DB.medidas||{})[clientId]||[]);',
    to: 'const primera=false;',
  },
  {
    n: 'S15 · con una sola toma la app TRANQUILIZA (autoridad que no tiene)',
    file: 'app-5-salud.js',
    from: 'const leyenda=primera',
    to: 'const leyenda=false',
  },
  {
    n: 'S16 · el asistente del dia 1 vuelve a tirar el lado que el mismo pide (Lucas QA)',
    file: 'app-6-extra.js',
    from: "    {key:'brazo_der',      id:'dob-brazo'},",
    to: "    {key:'brazo',      id:'dob-brazo'},",
  },
  {
    n: 'S17 · el candado Premium se rinde: un plan vencido vuelve a guardar medidas (Lucas QA)',
    file: 'app-5-salud.js',
    from: "  return (typeof premiumLocked==='function')&&premiumLocked(c);",
    to: '  return false;',
  },
  {
    n: 'S18 · la tarjeta de seguimiento vuelve a contar lapidas como tomas (Julian QA)',
    file: 'app-4-entreno.js',
    from: "  const med=(typeof medLive==='function')?medLive((DB.medidas||{})[clientId]||[]):((DB.medidas||{})[clientId]||[]);",
    to: '  const med=(DB.medidas||{})[clientId]||[];',
  },
  {
    n: 'S19 · la cadencia deja de ser la que decidio el PO (8 semanas)',
    file: 'avi-core.js',
    from: 'const MED_CADENCIA_DIAS = 56;',
    to: 'const MED_CADENCIA_DIAS = 21;',
  },
  {
    n: 'S20 · se acaba el aviso de una semana antes: solo avisa cuando ya se paso',
    file: 'avi-core.js',
    from: 'const MED_AVISO_DIAS = 7;',
    to: 'const MED_AVISO_DIAS = 0;',
  },
  {
    n: 'S21 · el aviso le sale a quien NUNCA se ha medido (no hay fecha que recordar)',
    file: 'avi-core.js',
    from: '  if (!vivas.length) return null;',
    to: '  if (false) return null;',
  },
  {
    n: 'S22 · posponer el aviso MUEVE la fecha de la proxima medicion',
    file: 'avi-core.js',
    from: '    if (isFinite(sn) && sn > now) return null;',
    to: '    if (isFinite(sn)) return null;',
  },
  {
    n: 'S23 · nadie pinta la tarjeta de volver a medirse (motor perfecto, cero avisos)',
    file: 'app-4-entreno.js',
    from: "  if(!_dia1 && typeof renderMedDueCard==='function')renderMedDueCard(client);",
    to: '  ;',
  },
  {
    n: 'S24 · la tarjeta pierde su puesto y el tope de 2 la tapa en silencio',
    file: 'avi-core.js',
    from: "  'cn-med-due',       // 4.",
    to: "  'cn-med-due-off',   // 4.",
  },
];

let muerden = 0;
const verdes = [];

for (const c of CASOS) {
  const path = P(c.file);
  const orig = readFileSync(path, 'utf8');
  const veces = orig.split(c.from).length - 1;
  if (veces !== 1) {
    console.log(`\x1b[33m  !! NO SE APLICO\x1b[0m  ${c.n}  (el texto aparece ${veces} veces, se esperaba 1)`);
    verdes.push(c.n + ' [NO SE APLICO]');
    continue;
  }
  writeFileSync(path, orig.replace(c.from, c.to), 'utf8');
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
