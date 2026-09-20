// Matriz de sabotaje de v643 — segundo lote del calentamiento.
// Cada fila rompe el mecanismo de UNA forma distinta y la suite TIENE que ponerse roja.
// Un sabotaje que sale VERDE significa que el candado no vigila nada (lección v503/v572), y un
// ANCLA QUE NO CASA no es un aprobado: es un sabotaje inerte (lección 8-sep).
// Reemplazos con FUNCIÓN, nunca con string: un `$` en el texto es un patrón especial de
// String.replace y el sabotaje escribiría basura saliendo verde (lección 6-sep).
// Los finales de línea se derivan del propio archivo: el repo guarda LF y la copia de trabajo es
// CRLF, así que un ancla de varias líneas escrita con `\n` no casa con nada (lección v642).
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { a6: join(ROOT, 'app-6-extra.js'), a3: join(ROOT, 'app-3-coach.js') };

const SABOTAJES = [
  // ── El título que se queda sin ejercicios debajo ──
  ['el título de Activación se pinta aunque no tenga ejercicios', 'a6',
    '${activaciones.length?`<div class="wu-section-title"',
    '${true?`<div class="wu-section-title"'],
  ['el título de Movilidad se pinta aunque no tenga ejercicios', 'a6',
    '${articulares.length?`<div class="wu-section-title">',
    '${true?`<div class="wu-section-title">'],
  // ── La lista propia que no resuelve ningún id ──
  ['una lista con 0 ids vivos vuelve a contar como lista del coach', 'a6',
    'const custom=(_customVivos&&_customVivos.length)?_customVivos:null;',
    'const custom=_customVivos;'],
  ['sin un solo movimiento se sigue pintando la tarjeta muerta', 'a6',
    "  if(!total){ con.innerHTML=''; return; }",
    '  if(false){ return; }'],
  // ── El icono de marca del botón de «cómo se hace» ──
  ['el botón de video vuelve al emoji crudo', 'a6',
    "${_gmIco('play',17,'🎥')}</button>",
    '🎥</button>'],
  ['el botón de video vuelve a apagarse con opacity', 'a6',
    'color:var(--t3);display:flex;align-items:center">',
    'opacity:.75;display:flex;align-items:center">'],
  // ── El selector que se cerraba en cada toque ──
  ['el selector vuelve a cerrarse en cada movimiento agregado', 'a3',
    'CUR.routineWarmup=cur; renderRfWarmup(); _wpMarkUsed(id);',
    "CUR.routineWarmup=cur; renderRfWarmup(); cm('m-warmpick');"],
  ['el selector se repinta entero (el coach pierde el scroll)', 'a3',
    'CUR.routineWarmup=cur; renderRfWarmup(); _wpMarkUsed(id);',
    'CUR.routineWarmup=cur; renderRfWarmup(); openWarmPicker();'],
  ['las filas del selector pierden su identificador (la marca no las encuentra)', 'a3',
    '`<div data-wp="${ex.id}" ',
    '`<div '],
  ['el ✓ del selector deja de poder actualizarse', 'a3',
    '<span data-wptick style=',
    '<span style='],
  ['lo ya agregado se vuelve a apagar con opacity sobre la letra', 'a3',
    "background:${used?'var(--bg)':'transparent'}\"",
    "opacity:${used?'.45':'1'}\""],
];

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
const _nl = (src) => (src.includes('\r\n') ? '\r\n' : '\n');
const _al = (txt, nl) => txt.split('\n').join(nl);
// 🔴 Escritura ATÓMICA: un corte de luz a mitad de un writeFileSync deja el archivo en CEROS con
//    el tamaño del nuevo, y eso ya destruyó `app-6-extra.js` DOS veces el 13-sep (v611).
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

// Control de cobertura: sin sabotaje, la suite tiene que estar VERDE. Si no, los rojos de arriba
// no prueban nada (podrían venir de otra cosa).
let base = true;
try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' }); } catch { base = false; }
console.log(`\nControl: suite sin sabotaje ${base ? 'VERDE ✅' : 'ROJA 🔴 (los resultados de arriba no valen)'}`);
console.log(`Resultado: ${muerden}/${SABOTAJES.length} muerden${inertes ? ` · ${inertes} INERTES` : ''}.`);
process.exit(base && muerden === SABOTAJES.length ? 0 : 1);
