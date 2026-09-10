// Matriz de sabotaje de «LA TARJETA DE HITO, CON GRÁFICA Y CON EL % HONESTO» (v601).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: esta tarjeta se PUBLICA con el nombre de una persona real. Un
// número inflado aquí no da ningún error — sale bonito, se comparte, y afirma algo que el dato no
// sostiene. Medido el 10-sep-2026: con el máximo en vez de la mediana, la tarjeta de Nataly diría
// «+650%» (una polea de 2 → 15 kg) mientras su volumen por sesión CAYÓ un 42%.
//
// Corre: node scripts/e2e/_sabotaje-v601.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const F = {
  core: new URL('../../avi-core.js', import.meta.url),
  app3: new URL('../../app-3-coach.js', import.meta.url),
};
const RAIZ = new URL('../..', import.meta.url);
const suiteRoja = () => {
  try { execSync('node avi.test.js', { cwd: RAIZ, encoding: 'utf8', stdio: 'pipe' }); return ['', false]; }
  catch (e) { return [((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló', true]; }
};
const orig = Object.fromEntries(Object.entries(F).map(([k, u]) => [k, readFileSync(u, 'utf8')]));
const eolDe = s => (s.includes('\r\n') ? '\r\n' : '\n');   // ni se asume ni se mezcla (v600)
let muerden = 0, total = 0, inertes = 0;

const matriz = [
  // 🔬 El primer intento de este sabotaje INVERTÍA el orden de `pcts` (asc → desc) y salió VERDE
  //    con razón: la mediana de un conjunto es la misma en los dos sentidos, así que el sabotaje
  //    no cambiaba nada. Un sabotaje inerte se lee como un candado flojo y no lo es. Este sí toca
  //    el valor: pone el MÁXIMO donde iba la mediana.
  ['1· el titular vuelve a ser el MÁXIMO (el número que infla la tarjeta)',
    'core', [[`  const mitad = pcts.length ? (pcts.length % 2
    ? pcts[(pcts.length - 1) / 2]
    : Math.round((pcts[pcts.length / 2 - 1] + pcts[pcts.length / 2]) / 2)) : null;`,
      '  const mitad = pcts.length ? pcts[pcts.length - 1] : null;']]],
  ['2· se cae la guarda del volumen (presume en % con el trabajo a la baja)',
    'core', [['(mitad != null && (volRatio == null || volRatio >= STORY_VOL_MIN_RATIO)) ? mitad : null',
      'mitad']]],
  ['3· la historia se ordena por PORCENTAJE (lo que v522 midió y rechazó)',
    'core', [['.sort((a, b) => (b.gano - a.gano) || (b.de - a.de) || (a.ejercicio < b.ejercicio ? -1 : 1));',
      '.sort((a, b) => (b.pct - a.pct) || (b.de - a.de) || (a.ejercicio < b.ejercicio ? -1 : 1));']]],
  ['4· el % deja de viajar pegado a sus kilos',
    'core', [['    pct: primero[n] > 0 ? Math.round(100 * (mayor[n] / primero[n] - 1)) : null,\n', '']]],
  ['5· la gráfica vuelve a recortar a 3 ejercicios',
    'app3', [['const lista=(d.subidas||[]).slice(0,8);', 'const lista=(d.subidas||[]).slice(0,3);']]],
  ['6· la BARRA mide el porcentaje (la más larga sería la de menos peso)',
    'app3', [['const w=Math.max(8,Math.round(560*((s2.gano||0)/maxGano)));',
      'const w=Math.max(8,Math.round(560*((s2.pct||0)/300)));']]],
  ['7· el titular dice FUERZA en vez de CARGA',
    'app3', [["x.fillText('DE CARGA',96+wBig,yTit-92);", "x.fillText('DE FUERZA',96+wBig,yTit-92);"]]],
  ['8· el titular se pinta aunque la guarda lo haya callado',
    'app3', [['if(d.medianaPct!=null&&d.medianaPct>0){', 'if(true){']]],
  ['9· sin titular se queda sin plan B (la tarjeta pierde su hero)',
    'app3', [["    x.fillText('EJERCICIOS CON MÁS CARGA QUE AL EMPEZAR',90,yTit+34);\n", '']]],
  ['10· la fila PUBLICADA deja de recortar a 3 (cambia el contrato del servidor)',
    'core', [['const subidas = (story.subidas || []).slice(0, 3).map(x => ({',
      'const subidas = (story.subidas || []).slice(0, 8).map(x => ({']]],
];

try {
  for (const [nombre, cual, pares] of matriz) {
    total++;
    const EOL = eolDe(orig[cual]);
    const eol = s => s.split('\n').join(EOL);
    let roto = orig[cual], aplicable = true;
    for (const [b, p] of pares) {
      const buscar = eol(b), poner = eol(p);
      if (roto.split(buscar).length - 1 !== 1) { aplicable = false; break; }
      roto = roto.split(buscar).join(poner);
    }
    if (!aplicable) {
      inertes++;
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto no aparece exactamente 1 vez (¿cambió el código?)`);
      continue;
    }
    writeFileSync(F[cual], roto, 'utf8');
    const [linea, rojo] = suiteRoja();
    writeFileSync(F[cual], orig[cual], 'utf8');
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite quedó VERDE'}`);
    if (rojo) muerden++;
  }
} finally {
  for (const [k, u] of Object.entries(F)) writeFileSync(u, orig[k], 'utf8');
}

console.log(`\nMuerden ${muerden}/${total}` + (inertes ? ` · ${inertes} no se pudieron aplicar` : ''));
process.exitCode = (muerden === total) ? 0 : 1;
