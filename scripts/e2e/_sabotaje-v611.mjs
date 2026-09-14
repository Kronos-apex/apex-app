// Matriz de sabotaje de «LA SEGUNDA CIFRA SE LLAMA COMO EL EJERCICIO DICE» (v611).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: esto es un RÓTULO, y un rótulo equivocado no da error nunca —
// la app siguió tres meses pidiéndole «REPS» a un ejercicio cuya propia ficha dice PASOS, y solo
// se supo porque el PO preguntó. Ningún cálculo cambia, así que el único guardián es la suite.
//
// Corre: node scripts/e2e/_sabotaje-v611.mjs
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

// 🔴 ESCRITURA ATÓMICA (13-sep-2026). Un corte de luz a mitad de un `writeFileSync` deja el archivo
// con su TAMAÑO nuevo y el contenido en CEROS — `app-6-extra.js` se destruyó DOS veces así, y la
// suite no lo canta como corrupción: solo caen los checks estáticos, que se leen como un defecto
// del cambio en curso. Se escribe a un `.tmp` y se RENOMBRA, que en el mismo volumen es atómico:
// o queda el archivo viejo entero o el nuevo entero, nunca un archivo a medio escribir.
// Es la misma regla que el repo ya tenía para `io.open(p,'w')` en python (bitácora 30-jul).
const escribir = (url, texto) => {
  const p = fileURLToPath(url), tmp = p + '.tmp';
  writeFileSync(tmp, texto, 'utf8');
  renameSync(tmp, p);
};

const F = {
  core: new URL('../../avi-core.js', import.meta.url),
  app3: new URL('../../app-3-coach.js', import.meta.url),
  app4: new URL('../../app-4-entreno.js', import.meta.url),
  app6: new URL('../../app-6-extra.js', import.meta.url),
  html: new URL('../../index.html', import.meta.url),
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
  ['1· el granjero sale del mapa: vuelve a pedir REPS (el defecto original)',
    'core', [["const REPS_UNIT_EX = { e136: 'pasos' };", 'const REPS_UNIT_EX = {};']]],
  ['2· la regla se vuelve ANCHA: TODO el catálogo cuenta pasos',
    'core', [["  return REPS_UNIT_EX[ex.id] || 'reps';", "  return 'pasos';"]]],
  ['3· la unidad deja de resolverse desde la CLAVE de un récord (string suelto)',
    'core', [["  if (typeof ex === 'string') ex = { id: ex };", "  if (typeof ex === 'string') ex = {};"]]],
  ['4· la MODALIDAD deja de mandar: a un cardio se le vuelve a llamar «reps» a sus minutos',
    'core', [["  if (t === 'cardio') return 'min';\n  if (t === 'tiempo') return 'seg';\n  if (t === 'hiit') return 'rondas';\n",
      '']]],
  ['5· la dosis del héroe vuelve a callar la unidad («3 × 40» sin decir de qué)',
    'core', [["  const rs = reps && u !== 'reps' ? reps + ' ' + u : reps;", '  const rs = reps;']]],
  ['6· la dosis nombra la unidad SIEMPRE (el ruido que el héroe no aguanta)',
    'core', [["  const rs = reps && u !== 'reps' ? reps + ' ' + u : reps;",
      "  const rs = reps ? reps + ' ' + u : reps;"]]],
  ['7· la instrucción de la progresión clava «reps» y se contradice con la casilla',
    'core', [["             ` cumpliendo ${tgt} ${unidad || 'reps'} para subir` };",
      '             ` cumpliendo ${tgt} reps para subir` };']]],
  ['8· el guiado vuelve al rótulo REPS escrito a mano (donde el PO lo vio)',
    'app6', [["  const RL=(typeof repsUnitOf==='function'?repsUnitOf(ex):'reps').toUpperCase();",
      "  const RL='REPS';"]]],
  ['9· el CALENTAMIENTO del granjero sigue pidiendo REPS (la superficie que se olvida)',
    'app6', [["<div class=\"gm-sinput-label\">${(typeof repsUnitOf==='function'?repsUnitOf(ex):'reps').toUpperCase()}</div>",
      '<div class="gm-sinput-label">REPS</div>']]],
  ['10· la ficha del ejercicio vuelve a rotular «Reps» pase lo que pase',
    'app6', [["  const _rl = document.getElementById('exd-reps-lbl');", '  const _rl = null;']]],
  ['11· el récord del perfil vuelve a decir «reps» a mano',
    'app4', [["${pr.reps} ${esc(typeof repsUnitOf==='function'?repsUnitOf(exId||pr.id||''):'reps')}",
      '${pr.reps} reps']]],
  ['12· la lista de récords pierde la clave: el arreglo queda INERTE en las 4 superficies',
    'app4', [['  const list=Object.entries(prs).filter(([,p])=>p&&typeof p===\'object\')\n    .sort((a,b)=>new Date(b[1].date)-new Date(a[1].date));',
      '  const list=Object.values(prs).sort((a,b)=>new Date(b.date)-new Date(a.date)).map(p=>[p.id||\'\',p]);']]],
  ['13· el récord nuevo deja de llevar su id (celebración e imagen compartible, mudas)',
    'app4', [['      newPRs.push({id:ex.id,name:ex.name', '      newPRs.push({name:ex.name']]],
  ['14· la dosis de la vista de rutina vuelve a «series × reps»',
    'app4', [["  return `${sets} series × ${ex.reps} ${typeof repsUnitOf==='function'?repsUnitOf(ex):'reps'}`;",
      '  return `${sets} series × ${ex.reps} reps`;']]],
  ['15· el constructor de rutinas del coach vuelve a rotular «Reps»',
    'app3', [['+ lbl(_rl)', "+ lbl('Reps')"]]],
  ['16· el rótulo del HTML se clava y la ficha ya no lo puede reescribir',
    'html', [['<div class="exdetail-stat-lbl" id="exd-reps-lbl">Reps</div>',
      '<div class="exdetail-stat-lbl">Reps</div>']]],
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
    escribir(F[cual], roto);
    const [linea, rojo] = suiteRoja();
    escribir(F[cual], orig[cual]);
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite quedó VERDE'}`);
    if (rojo) muerden++;
  }
} finally {
  for (const [k, u] of Object.entries(F)) escribir(u, orig[k]);
}

console.log(`\nMuerden ${muerden}/${total}` + (inertes ? ` · ${inertes} no se pudieron aplicar` : ''));
process.exitCode = (muerden === total) ? 0 : 1;
