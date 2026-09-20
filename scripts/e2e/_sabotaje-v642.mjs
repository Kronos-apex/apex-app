// Matriz de sabotaje de v642 — auditoría del calentamiento.
// Cada fila rompe el mecanismo de UNA forma distinta y la suite TIENE que ponerse roja.
// Un sabotaje que sale VERDE significa que el candado no vigila nada (lección v503/v572), y un
// ANCLA QUE NO CASA no es un aprobado: es un sabotaje inerte (lección 8-sep).
// Reemplazos con FUNCIÓN, nunca con string: un `$` en el texto es un patrón especial de
// String.replace y el sabotaje escribiría basura saliendo verde (lección 6-sep).
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = {
  core: join(ROOT, 'avi-core.js'),
  a6: join(ROOT, 'app-6-extra.js'),
  ent: join(ROOT, 'app-4-entreno.js'),
  css: join(ROOT, 'styles.css'),
};

const SABOTAJES = [
  // ── 1. El dictamen de Laura (wc3 con rodilla) ──
  ['wc3 vuelve a colarse en el calentamiento de quien declara rodilla', 'core',
    "rodilla: ['wr2', 'wai1', 'wai2', 'wc3'],",
    "rodilla: ['wr2', 'wai1', 'wai2'],"],

  // ── 2-5. El aviso en la pantalla donde se entrena ──
  ['la FILA del movimiento deja de pintar su aviso', 'a6',
    '        ${_wuAvisoFila(ex)}\n',
    ''],
  ['la CABECERA deja de pintar el aviso (queda escondido tras un toque)', 'a6',
    '          ${_wuAvisoCab}\n',
    ''],
  ['el aviso solo cubre la lista manual y la auto-derivada queda muda', 'a6',
    'const _wuItems=custom||[...articulares,...activaciones];',
    'const _wuItems=custom||[];'],
  ['renderWarmup deja de consultar las zonas (vuelve a existir solo en el editor)', 'a6',
    "const _wuZonasDe=(ex)=>(typeof warmupWarnZones==='function')?warmupWarnZones(ex,_wuLim):[];",
    'const _wuZonasDe=(ex)=>[];'],
  ['el aviso se queda sin tinta: texto invisible', 'css',
    '.wu-ex-warn{font-size:10.5px;font-weight:700;color:var(--ort);margin-top:2px;line-height:1.3}',
    '.wu-ex-warn{font-size:10.5px;font-weight:700;margin-top:2px;line-height:1.3}'],

  // ── 6-10. «Entrenar otra vez» abre limpio ──
  ['la limpieza vuelve a recorrer los ejercicios (deja vivos los índices huérfanos)', 'ent',
    "  const p='done_'+routine.id+'_';\n  try{ Object.keys(localStorage).filter(k=>k.indexOf(p)===0).forEach(k=>localStorage.removeItem(k)); }catch(_e){}",
    "  (routine.exercises||[]).forEach((ex,ei)=>{ const sets=parseInt(ex.sets)||3; for(let si=0;si<sets;si++) localStorage.removeItem('done_'+routine.id+'_'+ei+'_'+si); });"],
  ['la limpieza se lleva también los kg y las reps', 'ent',
    "  const p='done_'+routine.id+'_';",
    "  const p='';"],
  ['la limpieza pisa las marcas de OTRA rutina', 'ent',
    "  const p='done_'+routine.id+'_';",
    "  const p='done_';"],
  ['«Entrenar otra vez» deja de pedir la limpieza', 'ent',
    '  CUR.trainAgainWipe=true;\n',
    ''],
  ['el render limpia pero NO acuña sesión nueva (la 2ª sesión pisaría la de la mañana)', 'ent',
    '    _wipeSessionFlags(todayR);\n    startNewSession(todayR.id);',
    '    _wipeSessionFlags(todayR);'],
  ['el calentamiento de la sesión deja de limpiarse (queda en ✓)', 'ent',
    '  clearWarmup(routine.id);\n}\nfunction resetSession(){',
    '}\nfunction resetSession(){'],
];

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
let muerden = 0, inertes = 0;

// 🔴 Los finales de línea de este repo NO son estables: `core.autocrlf=true` guarda LF y la copia
// de trabajo es CRLF, así que un ancla escrita con `\n` no casa con NADA y el sabotaje sale INERTE
// (6 de 12 la primera vez que se corrió esta matriz). Se derivan del propio archivo, nunca se
// adivinan — misma lección que el rojo de CI de v594 y la matriz de v597.
const _nl = (src) => (src.includes('\r\n') ? '\r\n' : '\n');
const _al = (txt, nl) => txt.split('\n').join(nl);

for (const [nombre, archivo, buscarRaw, ponerRaw] of SABOTAJES) {
  const src = orig[archivo];
  const nl = _nl(src);
  const buscar = _al(buscarRaw, nl), poner = _al(ponerRaw, nl);
  if (!src.includes(buscar)) {
    inertes++;
    console.log(`⚠️  ANCLA NO CASA — «${nombre}»: sabotaje INERTE, no probó nada.`);
    continue;
  }
  writeFileSync(F[archivo], src.replace(buscar, () => poner));
  let rojo = false, detalle = '';
  try {
    execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    rojo = true;
    detalle = String(e.stdout || '').split('\n').filter(l => l.includes('❌')).slice(0, 2).join(' · ');
  }
  writeFileSync(F[archivo], orig[archivo]);
  if (rojo) { muerden++; console.log(`✅ MUERDE — «${nombre}»${detalle ? '\n     ' + detalle : ''}`); }
  else console.log(`🔴 VERDE CON SABOTAJE — «${nombre}»: la suite NO vigila esto.`);
}

// Control de cobertura: sin sabotaje, la suite tiene que estar VERDE. Si no, los rojos de arriba
// no prueban nada (podrían venir de otra cosa).
let base = true;
try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' }); } catch { base = false; }
console.log(`\nControl: suite sin sabotaje ${base ? 'VERDE ✅' : 'ROJA 🔴 (los resultados de arriba no valen)'}`);
console.log(`Resultado: ${muerden}/${SABOTAJES.length} muerden${inertes ? ` · ${inertes} INERTES` : ''}.`);
process.exit(base && muerden === SABOTAJES.length ? 0 : 1);
