// Matriz de sabotaje de la IDENTIDAD DE EJERCICIO (v558).
//
// Cada sabotaje rompe UN mecanismo del arreglo y la suite tiene que ponerse ROJA.
// Se verifica por CÓDIGO DE SALIDA, jamás por el texto impreso (lección de v524: un
// test appendeado bajo el bloque RESUMEN imprime su fallo y devuelve 0).
//
// El runner NORMALIZA los saltos de línea (\r?\n) porque los finales de línea de este
// repo no son estables (v537), y GRITA cuando el patrón no aparece exactamente una vez:
// un sabotaje que no se aplica sale verde y se lee igual que un candado flojo.
//
//   node scripts/e2e/_sabotaje-identidad.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(RAIZ, 'avi-core.js'), app4: join(RAIZ, 'app-4-entreno.js') };
const ORIG = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
const restaurar = () => Object.entries(F).forEach(([k, p]) => writeFileSync(p, ORIG[k], 'utf8'));
const suite = () => spawnSync('node', [join(RAIZ, 'avi.test.js')], { encoding: 'utf8' }).status;

const rx = s => new RegExp(s.split('\n').map(l =>
  l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\r?\\n'), 'g');

const SABOTAJES = [
  { n: 'S1 · keyOf vuelve a agrupar por NOMBRE', f: 'core',
    de: `    if (ex.id) return String(ex.id);`,
    a:  `    if (false) return String(ex.id);` },

  { n: 'S2 · el puente nombre→id deja de exigir que sea inequívoco', f: 'core',
    de: `  idsPorNombre.forEach((ids, n) => { if (ids.size === 1) puente.set(n, [...ids][0]); });`,
    a:  `  idsPorNombre.forEach((ids, n) => { puente.set(n, [...ids][0]); });` },

  { n: 'S3 · el rótulo toma el nombre MÁS VIEJO en vez del más reciente', f: 'core',
    de: `    if (!prev || t > prev.t) rotulo.set(k, { nombre, t });`,
    a:  `    if (!prev || t < prev.t) rotulo.set(k, { nombre, t });` },

  { n: 'S4 · computeExerciseProgress vuelve a agrupar por nombre (cableado)', f: 'core',
    de: `      const k = ident.keyOf(ex);`,
    a:  `      const k = ex.name;` },

  { n: 'S5 · la fila deja de exponer su clave (la necesita openExerciseRoom)', f: 'core',
    de: `      if (!map[k]) map[k] = { key: k, name: ident.nameOf(k) || ex.name,`,
    a:  `      if (!map[k]) map[k] = { name: ident.nameOf(k) || ex.name,` },

  { n: 'S6 · la sala del músculo vuelve a agrupar por nombre', f: 'app4',
    de: `const k=ident.keyOf(ex)||'?';`,
    a:  `const k=ex.name||'?';` },
];

restaurar();
const base = suite();
if (base !== 0) { console.error('🔴 la suite YA está roja sin sabotear (exit ' + base + ')'); process.exit(1); }
console.log('verde de partida: OK\n');

let muerden = 0, noAplicados = 0;
for (const s of SABOTAJES) {
  restaurar();
  const antes = readFileSync(F[s.f], 'utf8');
  const hits = (antes.match(rx(s.de)) || []).length;
  if (hits !== 1) {
    console.log(`❌ ${s.n} — NO SE APLICÓ (el patrón aparece ${hits} veces, esperaba 1)`);
    noAplicados++; continue;
  }
  writeFileSync(F[s.f], antes.replace(rx(s.de), s.a.replace(/\$/g, '$$$$')), 'utf8');
  const code = suite();
  console.log(`${code !== 0 ? '✅ MUERDE ' : '🔴 VERDE  '} ${s.n}  (exit ${code})`);
  if (code !== 0) muerden++;
}
restaurar();

const finalOk = suite();
console.log(`\n${muerden}/${SABOTAJES.length} muerden` +
  (noAplicados ? ` · ${noAplicados} NO SE APLICARON` : '') +
  ` · suite tras restaurar: exit ${finalOk}`);
process.exit(muerden === SABOTAJES.length && !noAplicados && finalOk === 0 ? 0 : 1);
