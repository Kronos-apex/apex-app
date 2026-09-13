// Matriz de sabotaje de «EL ANCLA DE LA CARGA» (v610).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: este motor decide **cuánto peso le proponemos levantar a una
// persona real**, y ninguno de sus fallos da error. Un ancla equivocada manda a alguien a repetir
// un peso que ya no mueve (lo que pasaba) o, al revés, le rebaja la carga para siempre sin que
// nadie lo note. El único guardián es la suite.
//
// Corre: node scripts/e2e/_sabotaje-v610.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const F = {
  core: new URL('../../avi-core.js', import.meta.url),
  app4: new URL('../../app-4-entreno.js', import.meta.url),
  app6: new URL('../../app-6-extra.js', import.meta.url),
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
  ['1· el ancla vuelve a ser SIEMPRE el récord (el defecto original)',
    'core', [['  if (rec.kg >= recordKg * LOAD_ANCHOR_MIN_RATIO) {',
      '  if (true) {']]],
  ['2· la ventana se encoge a UNA sesión (la fragilidad de v595: 27 falsos de 59)',
    'core', [['const LOAD_ANCHOR_SESSIONS = 3;', 'const LOAD_ANCHOR_SESSIONS = 1;']]],
  ['3· `recentWorkLoad` se queda con la carga MÁS FLOJA de la ventana',
    'core', [['      if (k > kg || (k === kg && r > reps)) { kg = k; reps = r; }',
      '      if (kg === 0 || k < kg) { kg = k; reps = r; }']]],
  ['4· el corte se compara al revés (ancla reciente solo si está POR ENCIMA del récord)',
    'core', [['  if (rec.kg >= recordKg * LOAD_ANCHOR_MIN_RATIO) {',
      '  if (rec.kg < recordKg * LOAD_ANCHOR_MIN_RATIO) {']]],
  ['5· sin historial se CALLA en vez de caer al récord (el detector mudo de v433)',
    'core', [["  if (!rec) return tieneRecord ? { kg: recordKg, reps: parseInt(pr.reps) || 1, unit: 'kg', fuente: 'record', recordKg: recordKg } : null;",
      '  if (!rec) return null;']]],
  ['6· `progressHint` ignora la fuente y clava «según tu récord»',
    'core', [["  const segun = fuente === 'reciente' ? 'según lo que vienes moviendo' : 'según tu récord';",
      "  const segun = 'según tu récord';"]]],
  ['7· la consolidación se cuenta sobre el RÉCORD y no sobre el ancla (nadie vuelve a subir)',
    'app4', [['      ? sessionsAtLoad(_hist, ex.id||ex.name,\n                       parseFloat(_base&&(_base.val!=null?_base.val:_base.kg)), reps)',
      '      ? sessionsAtLoad(_hist, ex.id||ex.name,\n                       parseFloat(pr&&(pr.val!=null?pr.val:pr.kg)), reps)']]],
  ['8· el peso vuelve a calcularse desde el récord',
    'app4', [['return {sug:suggestFromPR(_base,reps,{sesionesEnPeso:_ses}),pr:_base,record:pr,reps:reps,ses:_ses,',
      'return {sug:suggestFromPR(pr,reps,{sesionesEnPeso:_ses}),pr:_base,record:pr,reps:reps,ses:_ses,']]],
  ['9· la FUENTE no viaja: la pantalla afirma «según tu récord» pase lo que pase',
    'app4', [["            fuente:(_anc&&_anc.fuente)||'record',deload:false};",
      "            fuente:'record',deload:false};"]]],
  ['10· el texto de respaldo de la pantalla vuelve a clavar «según tu récord»',
    'app6', [["            :((gmInfo&&gmInfo.fuente==='reciente')?'según lo que vienes moviendo':'según tu récord')}`;",
      "            :'según tu récord'}`;"]]],
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
