// Matriz de sabotaje de v721 — el calentamiento por RECETA, con las cadenas y los candados de Laura.
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
const F = { core: join(ROOT, 'avi-core.js'), a6: join(ROOT, 'app-6-extra.js'), a3: join(ROOT, 'app-3-coach.js'), css: join(ROOT, 'styles.css') };

const SABOTAJES = [
  // ── Las cadenas de Laura ──
  ['el filtro de lesiones deja de correr sobre la receta', 'core',
    '      if (lim && warmupContraindicated(p, lim)) continue;',
    '      if (false) continue;'],
  ['una pieza ya puesta se puede repetir (el hueco vacío se rellena con la misma)', 'core',
    '      if (usados.has(id)) continue;\n      const p = lookup(id);',
    '      const p = lookup(id);'],
  ['los pares dejan de rotar con el plan', 'core',
    'wuTake(h[0], h[0].length, o.rot).concat(h.slice(1))',
    'h[0].concat(h.slice(1))'],
  ['la activación vuelve a repetir el primer ejercicio sin carga (regla 2 de v594)', 'core',
    '      if (esAct && sesPats.has(wuMovePattern(p.name))) continue;\n',
    ''],
  ['el día de impacto deja de sumar tobillo y talones', 'core',
    '  if (o.impacto && rec.imp) {',
    '  if (false && rec.imp) {'],
  ['el cardio suave deja de elegirse por el lugar', 'core',
    "  const genId = tomar([WU_GEN_BY_PLACE[o.place] || 'wg1', 'wg2'], false);",
    "  const genId = tomar(['wg1', 'wg2'], false);"],
  ['el cardio suave pierde la máquina de la receta', 'core',
    "(genId === 'wg1' && rec.gen.maq ? ' · ' + rec.gen.maq : '')",
    "''"],
  // ── Qué receta le toca a cada sesión ──
  ['el sexo deja de contar (la mujer recibe las recetas de hombre)', 'core',
    "  const mujer = sex === 'F';",
    '  const mujer = false;'],
  ['glúteo A y B se deciden solo por el primer ejercicio (la mayoría deja de contar)', 'core',
    "    if (dt) return dt > 0 ? 'GP_A' : 'GP_B';\n",
    ''],
  ['en empate, glúteo A y B se deciden al revés', 'core',
    "    return primero && primero.muscle === 'piernas' ? 'GP_B' : 'GP_A';",
    "    return primero && primero.muscle === 'piernas' ? 'GP_A' : 'GP_B';"],
  ['el impacto se lee por subcadena (la bicicleta de asalto cuenta como salto)', 'core',
    'const WU_IMPACT_RE = /\\bsalt|',
    'const WU_IMPACT_RE = /salt|'],
  // ── Las recetas ──
  ['una receta nombra una pieza que el PO sacó de la biblioteca', 'core',
    "mov: [['wt2', 'wt1'], ['wr3'], ['wc5']]",
    "mov: [['wr1'], ['wr3'], ['wc5']]"],
  ['el día de core de mujer vuelve a arrancar con el dead bug', 'core',
    "act: [['wac5'], ['wac4', 'wac2']]",
    "act: [['wac2'], ['wac4', 'wac5']]"],
  // ── Las listas de Laura (todo por id) ──
  ['los isquios de pie vuelven a la zona lumbar', 'core',
    "  lumbar: ['we5', 'wai3', 'wac3', 'wc3', 'wr3'],",
    "  lumbar: ['we5', 'wai3', 'wac3', 'wc3'],"],
  ['el colgado deja de caer por id en codo (queda solo el nombre)', 'core',
    "  codo: ['wa6'],",
    '  codo: [],'],
  ['el cardio suave entra en una lista de exclusión', 'core',
    "  tobillo: ['wai1', 'wai2', 'wai4', 'wt2', 'wr2', 'wc2', 'wag2'],",
    "  tobillo: ['wai1', 'wai2', 'wai4', 'wt2', 'wr2', 'wc2', 'wag2', 'wg1'],"],
  // ── El motor en app-6 y sus pantallas ──
  ['la dosis de la receta pisa la pieza de la biblioteca', 'a6',
    'Object.assign({},ex,{reps:s.reps})',
    'Object.assign(ex,{reps:s.reps})'],
  ['quitar el ✓ del cardio no devuelve «Ya vengo caliente»', 'a6',
    '  if(cal&&cal.dataset.gen===id) cal.hidden=done;\n',
    ''],
  ['«Ya vengo caliente» desmarca un cardio ya hecho', 'a6',
    '  if(!wuIsDone(rid,id)) wuToggle(id);',
    '  wuToggle(id);'],
  ['un texto vuelve a pedir «lo más alto posible»', 'a6',
    'hasta la altura de la cadera (no más)',
    'lo más alto posible'],
  ['la tarjeta vuelve a pintar el emoji de la pieza', 'a6',
    '<div class="wu-ex-num">${n}</div>',
    '<div class="wu-ex-icon">${ex.icon}</div>'],
  ['la numeración se reinicia en cada bloque', 'a6',
    '_nAct=_nMov+articulares.length',
    '_nAct=1'],
  ['una pieza vuelve a traer su emoji', 'a6',
    "{id:'wg1',name:'Cardio suave en máquina',",
    "{id:'wg1',name:'Cardio suave en máquina',icon:'🚴',"],
  ['vuelven los círculos de rodilla a la biblioteca', 'a6',
    "    {id:'wr2',",
    "    {id:'wr1',name:'Círculos de rodilla',reps:'10',desc:'x',ytQuery:'x'},\n    {id:'wr2',"],
  ['la ficha del coach previsualiza otro calentamiento', 'a3',
    'buildWarmup(r.exercises,_limKeys,wuOptsFor(c,r))',
    'buildWarmup(r.exercises,_limKeys)'],
  ['el botón ya hecho no se va (su display le gana a [hidden])', 'css',
    '.wu-caliente[hidden]{display:none}\n',
    ''],
];

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
const _nl = (src) => (src.includes('\r\n') ? '\r\n' : '\n');
const _al = (txt, nl) => txt.split('\n').join(nl);
const escribir = (p, txt) => { const t = p + '.tmp'; writeFileSync(t, txt); renameSync(t, p); };
let muerden = 0, inertes = 0;

for (const [nombre, archivo, buscarRaw, ponerRaw] of SABOTAJES) {
  // `SOLO=texto` corre solo las filas cuyo nombre lo contiene (para re-probar una fila corregida).
  if (process.env.SOLO && !nombre.includes(process.env.SOLO)) continue;
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
    detalle = String(e.stdout || '').split('\n').filter(l => l.includes('❌ ')).slice(0, 2).join(' · ');
  }
  escribir(F[archivo], orig[archivo]);
  if (rojo) { muerden++; console.log(`✅ MUERDE — «${nombre}»${detalle ? '\n     ' + detalle : ''}`); }
  else console.log(`🔴 VERDE CON SABOTAJE — «${nombre}»: la suite NO vigila esto.`);
}

let base = true;
try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' }); } catch { base = false; }
console.log(`\nControl: suite sin sabotaje ${base ? 'VERDE ✅' : 'ROJA 🔴 (los resultados de arriba no valen)'}`);
console.log(`Resultado: ${muerden}/${process.env.SOLO ? SABOTAJES.filter(s => s[0].includes(process.env.SOLO)).length : SABOTAJES.length} muerden${inertes ? ` · ${inertes} INERTES` : ''}.`);
const corridas = process.env.SOLO ? SABOTAJES.filter(s => s[0].includes(process.env.SOLO)).length : SABOTAJES.length;
process.exit(base && muerden === corridas ? 0 : 1);
