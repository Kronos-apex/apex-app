// Matriz de sabotaje de v644 — el calentamiento sigue al PLAN, no al calendario.
// Cada fila rompe el mecanismo de UNA forma distinta y la suite TIENE que ponerse roja.
// Un sabotaje que sale VERDE significa que el candado no vigila nada (lección v503/v572); un ANCLA
// QUE NO ES ÚNICA no es un aprobado: es un sabotaje inerte que no se aplicó donde uno cree (v643).
// Reemplazos con FUNCIÓN y finales de línea derivados del archivo (lecciones v583 y v642).
// Escritura ATÓMICA: un corte de luz a mitad de un writeFileSync deja el archivo en CEROS (v611).
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), a6: join(ROOT, 'app-6-extra.js'), a3: join(ROOT, 'app-3-coach.js') };

const SABOTAJES = [
  // ── La decisión del PO: el calentamiento NO se mueve solo ──
  ['el calentamiento vuelve a moverse por DÍA (lo que el PO descartó)', 'core',
    'function wuRotForRoutine(routine) {',
    'function wuRotForDate(d){ return Math.floor(Date.now()/86400000); }\nfunction wuRotForRoutine(routine) {'],
  ['la misma rutina deja de dar el mismo calentamiento', 'core',
    "    const s = String(e.id || e.name || '') + '|' + String(e.muscle || '');",
    "    const s = String(Math.random());"],
  ['modificar la rutina ya no mueve el calentamiento', 'core',
    '  let acc = 0;\n  for (const e of exs) {',
    '  let acc = 0;\n  for (const e of []) {'],
  // ── El desplazamiento y su control ──
  ['con desplazamiento 0 deja de devolver los dos primeros', 'core',
    '  const r = (!isFinite(rot) || rot < 0) ? 0 : Math.floor(rot) % p.length;',
    '  const r = (!isFinite(rot) || rot < 0) ? 1 : (Math.floor(rot) + 1) % p.length;'],
  ['el desplazamiento no da la vuelta al final del grupo', 'core',
    '  for (let i = 0; i < k; i++) out.push(p[(r + i) % p.length]);',
    '  for (let i = 0; i < k; i++) out.push(p[Math.min(r + i, p.length - 1)]);'],
  ['un desplazamiento inválido deja de caer al de siempre', 'core',
    '  const r = (!isFinite(rot) || rot < 0) ? 0 : Math.floor(rot) % p.length;',
    '  const r = Math.abs(Math.floor(rot || 0)) % p.length;'],
  ['pedir más piezas de las que hay revienta o repite', 'core',
    '  const k = Math.max(0, Math.min(n | 0, p.length));',
    '  const k = n | 0;'],
  // ── El cableado ──
  ['el motor vuelve a tomar SIEMPRE los dos primeros (movilidad)', 'a6',
    '        _toma(pool,2).forEach(ex=>{ articulares.push(ex);',
    '        pool.slice(0,2).forEach(ex=>{ articulares.push(ex);'],
  ['el motor vuelve a tomar SIEMPRE los dos primeros (activación)', 'a6',
    '        _toma(pool,2).forEach(ex=>{\n          if(activaciones.length<4){',
    '        pool.slice(0,2).forEach(ex=>{\n          if(activaciones.length<4){'],
  ['renderWarmup deja de pasarle el desplazamiento al motor', 'a6',
    'buildWarmup(exercises,_wuLim,{rot:_wuRot})',
    'buildWarmup(exercises,_wuLim)'],
  ['el desplazamiento sale de la rutina YA ADAPTADA por el ánimo', 'a6',
    'const _wuRot=(typeof wuRotForRoutine==="function")?wuRotForRoutine(_wuGuardada):0;'
      .replace(/"/g, "'"),
    "const _wuRot=(typeof wuRotForRoutine==='function')?wuRotForRoutine(CUR.activeRoutine):0;"],
  ['el editor del coach deja de ver el calentamiento que recibirá la persona', 'a3',
    "const _r=(typeof wuRotForRoutine==='function')?wuRotForRoutine({exercises:CUR.routineExs||[]}):0;",
    'const _r=0;'],
];

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
const _nl = (src) => (src.includes('\r\n') ? '\r\n' : '\n');
const _al = (txt, nl) => txt.split('\n').join(nl);
const escribir = (p, txt) => { const t = p + '.tmp'; writeFileSync(t, txt); renameSync(t, p); };
let muerden = 0, inertes = 0;

for (const [nombre, archivo, buscarRaw, ponerRaw] of SABOTAJES) {
  const src = orig[archivo];
  const nl = _nl(src);
  const buscar = _al(buscarRaw, nl), poner = _al(ponerRaw, nl);
  const veces = src.split(buscar).length - 1;
  if (veces !== 1) {
    inertes++;
    console.log(`⚠️  ANCLA NO ÚNICA (${veces}) — «${nombre}»: sabotaje INERTE, no probó nada.`);
    continue;
  }
  escribir(F[archivo], src.replace(buscar, () => poner));
  let rojo = false, detalle = '';
  try {
    execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    rojo = true;
    detalle = String(e.stdout || '').split('\n').filter(l => l.includes('❌')).slice(0, 2).join(' · ');
  }
  escribir(F[archivo], orig[archivo]);
  if (rojo) { muerden++; console.log(`✅ MUERDE — «${nombre}»${detalle ? '\n     ' + detalle : ''}`); }
  else console.log(`🔴 VERDE CON SABOTAJE — «${nombre}»: la suite NO vigila esto.`);
}

let base = true;
try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' }); } catch { base = false; }
console.log(`\nControl: suite sin sabotaje ${base ? 'VERDE ✅' : 'ROJA 🔴 (los resultados de arriba no valen)'}`);
console.log(`Resultado: ${muerden}/${SABOTAJES.length} muerden${inertes ? ` · ${inertes} INERTES` : ''}.`);
process.exit(base && muerden === SABOTAJES.length ? 0 : 1);
