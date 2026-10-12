// Matriz de sabotaje de v709 — Progreso en pestañas (lote 4 del estudio de organización, decisión del PO del
// 11-oct-2026). Cada fila devuelve UN defecto y la capa indicada TIENE que ponerse roja: 'suite' corre avi.test.js
// y 'nav' corre scripts/e2e/_verify-progreso-pestanas.mjs. Veredicto por CÓDIGO DE SALIDA, reemplazos con FUNCIÓN
// y escritura ATÓMICA. COMMITEAR antes de correrla (lección v611), y nunca con otro proceso leyendo el árbol. El
// control SIN sabotaje corre PRIMERO y, si sale rojo, no se da ningún veredicto (lección v707/v708).
//   node scripts/e2e/_sabotaje-v709.mjs            (todas)
//   node scripts/e2e/_sabotaje-v709.mjs --solo-suite | --solo-nav | --fila=<texto>
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { e4: join(ROOT, 'app-4-entreno.js'), e6: join(ROOT, 'app-6-extra.js'), html: join(ROOT, 'index.html'), css: join(ROOT, 'styles.css') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };
const SOLO_SUITE = process.argv.includes('--solo-suite');
const SOLO_NAV = process.argv.includes('--solo-nav');
const FILA = (process.argv.find(a => a.startsWith('--fila=')) || '').slice(7);

const SABOTAJES = [
  ['suite', 'sin la regla base, las cuatro pestañas se ven a la vez', 'css', '#cn-history .pg-sec{display:none}', '#cn-history .pg-sec{display:block}'],
  ['nav', 'sin la regla base, las cuatro pestañas se ven a la vez (se ve)', 'css', '#cn-history .pg-sec{display:none}', '#cn-history .pg-sec{display:block}'],
  ['suite', '«Logros» no se puede ver', 'css', ',#cn-history[data-ptab="logros"] .pg-sec[data-pt="logros"]{display:block}', '{display:block}'],
  ['nav', '«Logros» no se puede ver (se ve)', 'css', ',#cn-history[data-ptab="logros"] .pg-sec[data-pt="logros"]{display:block}', '{display:block}'],
  ['suite', 'la gráfica de volumen sale de su pestaña', 'html', '      <section class="pg-sec" data-pt="historial" role="tabpanel" aria-label="Historial">\n', '      </section><section class="pg-sec" data-pt="historial" role="tabpanel" aria-label="Historial">\n'],
  ['suite', '«Récords» vuelve a depender de haber abierto el Perfil', 'e4', "  if(typeof renderClientExProgress==='function') renderClientExProgress(clientId);\n  _progSync();", '  _progSync();'],
  ['nav', '«Récords» vuelve a depender de haber abierto el Perfil (se ve)', 'e4', "  if(typeof renderClientExProgress==='function') renderClientExProgress(clientId);\n  _progSync();", '  _progSync();'],
  ['nav', 'la pestaña no se recuerda al volver', 'e4', "  progTab(CUR.progTab||'resumen',{quieto:true});", "  progTab('resumen',{quieto:true});"],
  ['suite', 'la pestaña no se recuerda al volver (suite)', 'e4', "  progTab(CUR.progTab||'resumen',{quieto:true});", "  progTab('resumen',{quieto:true});"],
  ['suite', 'cambiar de pestaña empuja historial', 'e4', "  CUR.progTab=t; P.setAttribute('data-ptab',t);", "  CUR.progTab=t; P.setAttribute('data-ptab',t); try{navPush&&0}catch(_e){}"],
  ['nav', 'con la pantalla bajada la pestaña nueva se queda a media altura', 'e4', "    const sc=P.closest('.cnbody'); if(sc&&sc.scrollTop>0) sc.scrollTop=0;", '    void 0;'],
  ['suite', 'con la pantalla bajada la pestaña nueva se queda a media altura (suite)', 'e4', "    const sc=P.closest('.cnbody'); if(sc&&sc.scrollTop>0) sc.scrollTop=0;", '    void 0;'],
  ['nav', '«Logros» queda en blanco para una asesorada nueva', 'e4', '  if(v) v.hidden=!!(g&&g.innerHTML.trim());', '  void v;'],
  ['suite', '«Logros» queda en blanco para una asesorada nueva (suite)', 'e4', '  if(v) v.hidden=!!(g&&g.innerHTML.trim());', '  void v;'],
  ['nav', 'con teclado solo se llega a la pestaña elegida', 'html', ' aria-label="Secciones de tu progreso" onkeydown="progTabKey(event)">', ' aria-label="Secciones de tu progreso">'],
  ['suite', 'con teclado solo se llega a la pestaña elegida (suite)', 'html', ' aria-label="Secciones de tu progreso" onkeydown="progTabKey(event)">', ' aria-label="Secciones de tu progreso">'],
  ['nav', 'con «Muy grande» la elegida no se trae a la vista', 'e4', "seg.scrollLeft+=(r.left+r.width/2)-(sr.left+sr.width/2); });\n  }\n  // Con la pantalla bajada", "void r; void sr; });\n  }\n  // Con la pantalla bajada"],
  ['suite', 'la ayuda del Perfil vuelve a hablar de una racha que no está ahí', 'e6', '    Aquí está lo tuyo, en filas:', '    Aquí están tus datos y tu <b>racha</b> de entrenamientos. Aquí está lo tuyo, en filas:'],
];

const correr = capa => {
  const cmd = capa === 'suite' ? 'node avi.test.js' : 'node scripts/e2e/_verify-progreso-pestanas.mjs';
  try { execSync(cmd, { cwd: ROOT, stdio: 'pipe', timeout: 420000 }); return true; } catch { return false; }
};

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
const preSuite = SOLO_NAV || correr('suite'), preNav = SOLO_SUITE || correr('nav');
if (!preSuite || !preNav) {
  console.log(`🔴 CONTROL PREVIO ROJO (suite ${preSuite ? 'verde' : 'ROJA'} · harness ${preNav ? 'verde' : 'ROJO'}): sin sabotaje ya falla — no se corre ninguna fila.`);
  process.exit(1);
}
let muerden = 0, noAplican = 0, corridas = 0;
for (const [capa, nombre, archivo, buscar0, poner0] of SABOTAJES) {
  if (SOLO_SUITE && capa !== 'suite') continue;
  if (SOLO_NAV && capa !== 'nav') continue;
  if (FILA && !nombre.includes(FILA)) continue;
  corridas++;
  const src = orig[archivo];
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const buscar = buscar0.replace(/\n/g, eol), poner = poner0.replace(/\n/g, eol);
  const veces = src.split(buscar).length - 1;
  if (veces !== 1) { noAplican++; console.log(`⚠️  NO SE APLICÓ — «${nombre}»: el ancla aparece ${veces} veces.`); continue; }
  escribir(F[archivo], src.replace(buscar, () => poner));
  let verde;
  try { verde = correr(capa); } finally { escribir(F[archivo], orig[archivo]); }
  if (!verde) { muerden++; console.log(`✅ MUERDE (${capa}) — «${nombre}»`); } else console.log(`🔴 VERDE CON SABOTAJE (${capa}) — «${nombre}»`);
}
const baseSuite = SOLO_NAV || correr('suite'), baseNav = SOLO_SUITE || correr('nav'), base = baseSuite && baseNav;
console.log(`\nControl: sin sabotaje ${base ? 'VERDE ✅' : 'ROJO 🔴'} (suite ${baseSuite ? 'verde' : 'ROJA'} · harness ${baseNav ? 'verde' : 'ROJO'})`);
console.log(`Resultado: ${muerden}/${corridas} muerden · ${noAplican} sin aplicar.`);
process.exit(base && !noAplican && muerden === corridas ? 0 : 1);
