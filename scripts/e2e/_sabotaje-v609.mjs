// Matriz de sabotaje de «LAS DOS DECISIONES DE LA GRASA ESTIMADA» (v609).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: las dos decisiones las tomó el PO **con el equipo en desacuerdo**
// (Andrés y Coach Pro a favor de que la grasa reemplace al IMC, Laura en contra; Andrés a favor de
// las categorías, Valery en contra). Eso significa que el día que alguien «limpie» este código va a
// encontrar argumentos escritos para las dos direcciones — y lo único que distingue la decisión de
// una opinión es que los candados muerdan.
//
// Corre: node scripts/e2e/_sabotaje-v609.mjs
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
  ['1· la etiqueta se pone SIEMPRE, mirando solo el punto central (lo que pedía Andrés)',
    'core', [['  out.categoria = (kLo && kLo === kHi) ? kLo : null;',
      '  out.categoria = bfCategoryKey(sexo, edad, out.pct);']]],
  ['2· la franja se juzga por UN extremo (media decisión = la decisión equivocada)',
    'core', [['  const kHi = bfCategoryKey(sexo, edad, out.hi);', '  const kHi = kLo;']]],
  ['3· la tabla se aplana: se ignora la edad y todos caen en el tramo joven',
    'core', [['  const t = tramos.filter(x => a <= x.hasta)[0] || tramos[tramos.length - 1];',
      '  const t = tramos[0];']]],
  ['4· se etiqueta sin EDAD (se inventa el tramo en vez de callar)',
    'core', [['  if (!isFinite(a) || a < 18 || !isFinite(p)) return null;',
      '  if (!isFinite(p)) return null;\n  const _a2 = isFinite(a) ? a : 30;']]],
  ['5· el perfil de carga vuelve al IMC e ignora la grasa (la decisión, deshecha)',
    'core', [['  const masa = usaBf ? (bf >= corte) : (bmi != null && bmi >= 30);',
      '  const masa = (bmi != null && bmi >= 30);']]],
  ['6· la grasa se usa SIN sexo, con el corte masculino por defecto (el defecto de v604)',
    'core', [['  const usaBf = !!sexo && isFinite(bf) && bf >= BF_MIN_PCT && bf <= BF_MAX_PCT;',
      '  const usaBf = isFinite(bf) && bf >= BF_MIN_PCT && bf <= BF_MAX_PCT;']]],
  ['7· la grasa APAGA la cintura-talla (lo que Laura pidió conservar)',
    'core', [['  if (masa || (rct != null && rct >= 0.60)) return \'high\';',
      '  if (masa) return \'high\';']]],
  ['8· una de las dos vías de generación vuelve a decidir con el IMC',
    'app3', [['  const loadProfile=bodyLoadProfile(c,_waist,_coachPesoDe(c),_coachGrasaPct(c));\n  const _p=genPrefs(c);\n  const res=generarRutinas(c,DB.exercises,{idFn:uid,seed:_genSeed(c.id)',
      '  const loadProfile=bodyLoadProfile(c,_waist,_coachPesoDe(c));\n  const _p=genPrefs(c);\n  const res=generarRutinas(c,DB.exercises,{idFn:uid,seed:_genSeed(c.id)']]],
  ['9· la grasa del perfil de carga deja de salir de `bodyFatEstimate` (segunda definición)',
    'app3', [['  const e=bodyFatEstimate(c,(DB.medidas&&DB.medidas[c.id])||[]);\n  return (e&&e.ok)?e.pct:null;',
      '  return (c&&c.bfPct)||null;']]],
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
