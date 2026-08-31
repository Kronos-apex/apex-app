// Matriz de sabotaje de las ETIQUETAS DEL EJE (v560).
// Verificacion por CODIGO DE SALIDA, nunca por el texto impreso (leccion de v524).
// El runner normaliza los saltos de linea (v537) y grita si el patron no aparece 1 vez.
//
//   node scripts/e2e/_sabotaje-etiquetas.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = {
  core: join(RAIZ, 'avi-core.js'),
  app2: join(RAIZ, 'app-2-login.js'),
  app4: join(RAIZ, 'app-4-entreno.js'),
  app5: join(RAIZ, 'app-5-salud.js'),
};
const ORIG = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
const restaurar = () => Object.entries(F).forEach(([k, p]) => writeFileSync(p, ORIG[k], 'utf8'));
const suite = () => spawnSync('node', [join(RAIZ, 'avi.test.js')], { encoding: 'utf8' }).status;
const rx = s => new RegExp(s.split('\n').map(l =>
  l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\r?\\n'), 'g');

const SABOTAJES = [
  { n: 'S1 · vuelve a pintar una etiqueta por punto', f: 'core',
    de: '  const paso = Math.max(1, Math.ceil(anchoEtiqueta / espaciado));',
    a:  '  const paso = 1;' },

  { n: 'S2 · deja de proteger el ultimo punto (se cae por estar pegado)', f: 'core',
    de: '  while (idx.length && (ultimo - idx[idx.length - 1]) * espaciado < anchoEtiqueta) idx.pop();\n  idx.push(ultimo);',
    a:  '  if (idx[idx.length - 1] !== ultimo) idx.push(ultimo);' },

  { n: 'S3 · ignora el largo del texto (todas las etiquetas miden igual)', f: 'core',
    de: '  const anchoEtiqueta = largo * Math.max(1, charW || 6) + CHART_LABEL_GAP;',
    a:  '  const anchoEtiqueta = CHART_LABEL_GAP;' },

  { n: 'S4 · esconde TODAS cuando hay muchas (el tope a ojo de antes)', f: 'core',
    de: '  if (n === 1) return [0];',
    a:  '  if (n === 1) return [0];\n  if (n > 8) return [];' },

  { n: 'S5 · la grafica de VOLUMEN vuelve a pintarlas todas', f: 'app4',
    de: 'volConEtiqueta.has(i)?',
    a:  'true?' },

  { n: 'S6 · la de PROGRESION vuelve al tope a ojo', f: 'app2',
    de: '${epConFecha.has(i)?',
    a:  '${points.length<=8?' },

  { n: 'S7 · los VALORES sobre los puntos dejan de preguntar', f: 'app2',
    de: "      if(!epConValor.has(i))return '';\n",
    a:  '' },

  { n: 'S8 · la de MEDIDAS vuelve a pintarlas todas', f: 'app5',
    de: '${medConFecha.has(i)?',
    a:  '${true?' },
];

restaurar();
const base = suite();
if (base !== 0) { console.error('🔴 la suite YA esta roja sin sabotear (exit ' + base + ')'); process.exit(1); }
console.log('verde de partida: OK\n');

let muerden = 0, noAplicados = 0;
for (const s of SABOTAJES) {
  restaurar();
  const antes = readFileSync(F[s.f], 'utf8');
  const hits = (antes.match(rx(s.de)) || []).length;
  if (hits !== 1) {
    console.log(`❌ ${s.n} — NO SE APLICO (el patron aparece ${hits} veces, esperaba 1)`);
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
