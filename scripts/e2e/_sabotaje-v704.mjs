// Matriz de sabotaje de v704 — «Ajustes» como una app de verdad (pedido del PO, 10-oct-2026). Cada fila
// devuelve UN defecto y la capa indicada TIENE que ponerse roja: 'suite' corre avi.test.js (en el huso
// local: hay una fila que solo se ve fuera de UTC) y 'nav' corre scripts/e2e/_verify-ajustes.mjs.
// Veredicto por CÓDIGO DE SALIDA, reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-v704.mjs            (todas)
//   node scripts/e2e/_sabotaje-v704.mjs --solo-suite
// COMMITEAR o respaldar antes: una matriz muta archivos del repo (lección v611).
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = {
  core: join(ROOT, 'avi-core.js'), e1: join(ROOT, 'app-1-infra.js'), e2: join(ROOT, 'app-2-login.js'),
  e4: join(ROOT, 'app-4-entreno.js'), e6: join(ROOT, 'app-6-extra.js'), html: join(ROOT, 'index.html'),
  css: join(ROOT, 'styles.css'),
};
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };
const SOLO_SUITE = process.argv.includes('--solo-suite');

const SABOTAJES = [
  // ── El Perfil y la entrada ──
  ['suite', 'un ajuste vuelve al Perfil', 'html', '      <div class="profhero" id="cn-prof-card"></div>\n', '      <div class="profhero" id="cn-prof-card"></div>\n      <div data-fs-btn="normal"></div>\n'],
  ['suite', 'el botón «Ajustes» del Perfil no abre nada', 'html', 'id="cn-aj-btn" class="aj-entrada" onclick="openAjustes()"', 'id="cn-aj-btn" class="aj-entrada"'],
  ['nav', 'el botón «Ajustes» no se ve en el Perfil', 'css', '.prof-aj{display:flex;justify-content:flex-end;margin-bottom:10px}', '.prof-aj{display:none}'],
  // ── El coach ──
  ['suite', 'el menú del coach vuelve a decir «Configuración»', 'html', 'data-ic-size="15">⚙️</span> Ajustes</div>', 'data-ic-size="15">⚙️</span> Configuración</div>'],
  ['suite', 'el menú del coach ya no abre Ajustes', 'e2', 'function openSettings(){ openAjustes(); }', 'function openSettings(){ }'],
  ['suite', 'Ajustes decide quién es el coach solo con loggedAs (v700)', 'e2', "  return (typeof COACH_SELF!=='undefined'&&COACH_SELF)||(typeof AUTH_ROLE!=='undefined'&&AUTH_ROLE==='coach')||(typeof CUR!=='undefined'&&CUR.loggedAs==='coach');", "  return (typeof CUR!=='undefined'&&CUR.loggedAs==='coach');"],
  ['suite', 'guardar los datos del coach deja la pantalla abierta', 'e2', "if(typeof navCloseLayer==='function') navCloseLayer(closeAjustesSub); else closeAjustesSub();", 'closeAjustesSub();'],
  ['suite', 'un <div> sin cerrar al mudar los campos del coach', 'html', '        <div id="st-perr" class="aj-error" role="alert" style="display:none"></div>\n      </div>\n', '        <div id="st-perr" class="aj-error" role="alert" style="display:none"></div>\n'],
  ['suite', 'un campo del coach vuelve a no tener etiqueta', 'html', '        <label class="aj-campo" for="st-cur">Contraseña actual</label>\n', ''],
  ['nav', 'un campo del coach vuelve a no tener etiqueta (se ve)', 'html', '        <label class="aj-campo" for="st-cur">Contraseña actual</label>\n', ''],
  // ── «Eliminar mi cuenta» encima de Ajustes (QA Lucas y Julián) ──
  ['suite', 'la ventana de «Eliminar mi cuenta» vuelve a abrirse detrás de Ajustes', 'e4', '  if(tope>=base) m.style.zIndex=String(tope+10);\n', ''],
  ['nav', 'la ventana de «Eliminar mi cuenta» vuelve a abrirse detrás de Ajustes (se toca)', 'e4', '  if(tope>=base) m.style.zIndex=String(tope+10);\n', ''],
  ['suite', 'el atrás cierra Ajustes y deja la ventana huérfana encima', 'e2', "  if(mdSobre){ mdSobre.classList.remove('on'); return true; }\n", ''],
  ['nav', 'el atrás cierra Ajustes y deja la ventana huérfana encima (se ve)', 'e2', "  if(mdSobre){ mdSobre.classList.remove('on'); return true; }\n", ''],
  // ── El atrás y «Salir» ──
  ['suite', 'el atrás no cierra el detalle de un ajuste', 'e2', "  const ajs=document.getElementById('ajustes-sub-room');\n  if(ajs&&ajs.classList.contains('on')){closeAjustesSub();return true;}\n", ''],
  ['suite', '«Cerrar sesión» desde Ajustes no sale', 'e2', 'function ajustesSalir(){ logout(); }', 'function ajustesSalir(){ }'],
  ['nav', '«Cerrar sesión» desde Ajustes no sale (se toca)', 'e2', 'function ajustesSalir(){ logout(); }', 'function ajustesSalir(){ }'],
  ['suite', 'cerrar la sesión deja la capa de historial colgada', 'e2', "    if(typeof AVINAV!=='undefined') AVINAV.layers=Math.max(0,(AVINAV.layers||0)-abiertas.length);\n", ''],
  ['suite', 'cerrar la sesión deja la habitación tapando el login (QA Julián)', 'e2', "    abiertas.forEach(r=>r.classList.remove('on'));\n", ''],
  ['nav', 'cerrar la sesión deja la habitación tapando el login (se ve)', 'e2', "    abiertas.forEach(r=>r.classList.remove('on'));\n", ''],
  ['suite', '«Cerrar sesión» lleva flecha como si abriera otra pantalla', 'e2', ",accion:true}]);", "}]);"],
  ['nav', 'Ajustes abre sin su entrada de historial (el atrás no la cierra)', 'e2', "  const b=document.getElementById('ajroom-body'); if(b) b.scrollTop=0;\n  if(typeof _roomFront==='function') _roomFront(room); else room.classList.add('on');", "  const b=document.getElementById('ajroom-body'); if(b) b.scrollTop=0;\n  room.classList.add('on');"],
  // ── La lista y sus valores ──
  ['nav', 'al volver de un ajuste la fila sigue diciendo lo de antes', 'e2', "  if(typeof _syncRoomBodyClass==='function') _syncRoomBodyClass();\n  renderAjustes();\n}", "  if(typeof _syncRoomBodyClass==='function') _syncRoomBodyClass();\n}"],
  ['nav', 'el detalle de un ajuste enseña todas las secciones a la vez', 'e2', "s.hidden=(s.dataset.aj!==sec);", 's.hidden=false;'],
  ['suite', 'en «Solo vibración» la fila nombra un tono que no suena', 'core', "  if (p.mode === 'vibracion') return 'Solo vibración';\n", ''],
  ['suite', '«Mi plan» de alguien vencido sigue diciendo su plan pagado (ya está en AVI FREE)', 'core', "  else if (st === 'overdue') return { nombre: SETTINGS_PLAN_NAME.libre,", "  else if (st === 'overdue') return { nombre,"],
  ['suite', '«Mi plan» lee «2026-11-02» como UTC y dice el día anterior', 'core', '  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);\n', ''],
  // ── Textos y estilo ──
  ['suite', 'el aviso de «Silenciar» vuelve a mandar al Perfil', 'e4', "'🔕 Avisos en silencio · lo cambias en Perfil › Ajustes'", "'🔕 Avisos en silencio · cámbialo en tu Perfil'"],
  ['suite', 'la novedad de Ajustes se esconde a quien no tiene coach', 'e6', "{v:704, icon:'sliders',", "{v:704, coach:true, icon:'sliders',"],
  ['suite', 'el tema sin marcar vuelve al borde oscuro', 'e1', "b.style.borderColor=b.dataset.themeBtn===mode?'var(--g)':'var(--br2)';", "b.style.borderColor=b.dataset.themeBtn===mode?'var(--g)':'';"],
  ['suite', 'la letra sin marcar vuelve al fondo gris', 'e1', "b.style.background=on?'var(--g)':'transparent';", "b.style.background=on?'var(--g)':'';"],
];

const correr = capa => {
  const cmd = capa === 'suite' ? 'node avi.test.js' : 'node scripts/e2e/_verify-ajustes.mjs';
  try { execSync(cmd, { cwd: ROOT, stdio: 'pipe', timeout: 420000 }); return true; } catch { return false; }
};

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
let muerden = 0, noAplican = 0, corridas = 0;
for (const [capa, nombre, archivo, buscar0, poner0] of SABOTAJES) {
  if (SOLO_SUITE && capa !== 'suite') continue;
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
const baseSuite = correr('suite'), baseNav = SOLO_SUITE || correr('nav'), base = baseSuite && baseNav;
console.log(`\nControl: sin sabotaje ${base ? 'VERDE ✅' : 'ROJO 🔴'} (suite ${baseSuite ? 'verde' : 'ROJA'} · harness ${baseNav ? 'verde' : 'ROJO'})`);
console.log(`Resultado: ${muerden}/${corridas} muerden · ${noAplican} sin aplicar.`);
process.exit(base && !noAplican && muerden === corridas ? 0 : 1);
