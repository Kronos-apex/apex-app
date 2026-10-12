// Matriz de sabotaje de v708 — el Perfil del asesorado en filas (lote 3 del estudio de organización, decisión del
// PO del 11-oct-2026). Cada fila devuelve UN defecto y la capa indicada TIENE que ponerse roja: 'suite' corre
// avi.test.js y 'nav' corre scripts/e2e/_verify-perfil-filas.mjs. Veredicto por CÓDIGO DE SALIDA, reemplazos con
// FUNCIÓN y escritura ATÓMICA. COMMITEAR antes de correrla (lección v611), y nunca con otro proceso leyendo el
// árbol. Se lee por la línea de CONTROL antes que por las filas (lección v707: un harness que no arranca hace que
// toda fila «nav» muerda en falso).
//   node scripts/e2e/_sabotaje-v708.mjs            (todas)
//   node scripts/e2e/_sabotaje-v708.mjs --solo-suite
//   node scripts/e2e/_sabotaje-v708.mjs --fila=<texto>
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), e2: join(ROOT, 'app-2-login.js'), e3: join(ROOT, 'app-3-coach.js'), e4: join(ROOT, 'app-4-entreno.js'), e5: join(ROOT, 'app-5-salud.js'),
  html: join(ROOT, 'index.html'), css: join(ROOT, 'styles.css') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };
const SOLO_SUITE = process.argv.includes('--solo-suite');
const FILA = (process.argv.find(a => a.startsWith('--fila=')) || '').slice(7);

const SABOTAJES = [
  // ── Las filas y su dato ──
  ['suite', '«Mis datos» vuelve a repetir la cabecera', 'core', "  const datos = [edad > 0 ? edad + ' años' : '', talla > 0 ? Math.round(talla) + ' cm' : ''].filter(Boolean).join(' · ');", "  const datos = [c.goal, c.level].filter(Boolean).join(' · ');"],
  ['nav', '«Mis datos» vuelve a repetir la cabecera (se ve)', 'core', "  const datos = [edad > 0 ? edad + ' años' : '', talla > 0 ? Math.round(talla) + ' cm' : ''].filter(Boolean).join(' · ');", "  const datos = [c.goal, c.level].filter(Boolean).join(' · ');"],
  ['suite', 'la fila del plan vuelve a llevar una cifra de calorías', 'core', "(x.tienePlan ? 'Armado por tu coach' :", "(x.tienePlan ? '2.000 kcal al día' :"],
  ['suite', '«Hace N» cuenta horas y no días de calendario', 'core', '  const d = Math.round((localDayStart(nowTs) - localDayStart(ts)) / 86400000);   // días de CALENDARIO (v707)', '  const d = Math.floor((nowTs - ts) / 86400000);'],
  ['suite', 'una fila con candado dice otra cosa que su candado', 'core', "const PROFILE_LOCK_TXT = { 'renovar-pro': 'Al renovar tu AVI PRO',", "const PROFILE_LOCK_TXT = { 'renovar-pro': 'Premium',"],
  ['nav', 'las filas no miran el candado (se ve)', 'e4', "    bloqueo:premiumLocked(client)?((typeof planLockExit==='function')?planLockExit(client):'opciones'):null,", '    bloqueo:null,'],
  ['suite', 'las filas cuentan lápidas como pesadas', 'e4', "  const bw=(typeof bwLive==='function')?bwLive((DB.bodyweight||{})[id]||[]):[];", '  const bw=(DB.bodyweight||{})[id]||[];'],
  ['nav', 'el Perfil no pinta sus filas', 'e4', '  renderProfileRows(client);   // v708', '  void 0;   // v708'],
  ['suite', 'el Perfil no pinta sus filas (suite)', 'e4', '  renderProfileRows(client);   // v708', '  void 0;   // v708'],
  ['nav', 'cerrar la pantalla no repinta la fila (la pesada nueva no se ve)', 'e4', "  const c=(DB.clients||[]).find(x=>x.id===CUR.clientId); if(c) renderProfileRows(c);\n}", '}'],
  // ── Las secciones y su pantalla ──
  ['suite', 'las secciones vuelven a verse completas en el Perfil', 'html', '      <div id="prof-guardado" hidden>', '      <div id="prof-guardado">'],
  ['nav', 'las secciones vuelven a verse completas en el Perfil (se ve)', 'html', '      <div id="prof-guardado" hidden>', '      <div id="prof-guardado">'],
  ['suite', 'abrir una fila no muda su sección a la pantalla', 'e4', '  body.appendChild(card);', '  void card;'],
  ['nav', 'abrir una fila no muda su sección a la pantalla (se ve)', 'e4', '  body.appendChild(card);', '  void card;'],
  ['suite', 'el atrás no cierra la pantalla de la fila', 'e2', "  if(pfr&&pfr.classList.contains('on')){if(typeof closePerfilRoom==='function')closePerfilRoom();else pfr.classList.remove('on');return true;}", '  void pfr;'],
  ['nav', 'el atrás no cierra la pantalla de la fila (se ve)', 'e2', "  if(pfr&&pfr.classList.contains('on')){if(typeof closePerfilRoom==='function')closePerfilRoom();else pfr.classList.remove('on');return true;}", '  void pfr;'],
  ['nav', 'la pantalla de la fila no lleva su título', 'e4', "  const t=document.getElementById('pfroom-t'); if(t) t.textContent=_PF_TITULO[sec];", '  void 0;'],
  // ── Lo que cazó el QA (Julián y Lucas) ──
  ['nav', 'la ventana de venta vuelve a abrirse DEBAJO de la pantalla (QA)', 'e4', "const _pu=document.getElementById('premium-upsell'); _alzarSobreSalas(_pu); _pu.classList.add('on');", "const _pu=document.getElementById('premium-upsell'); _pu.classList.add('on');"],
  ['suite', 'la ventana de venta vuelve a abrirse DEBAJO de la pantalla, suite (QA)', 'e4', "const _pu=document.getElementById('premium-upsell'); _alzarSobreSalas(_pu); _pu.classList.add('on');", "const _pu=document.getElementById('premium-upsell'); _pu.classList.add('on');"],
  ['nav', '«Hablar con mi coach» cambia la pestaña DEBAJO de la pantalla (QA)', 'e3', "  if(salas===1&&typeof AVINAV!=='undefined'&&AVINAV.layers>0){ history.back(); setTimeout(ir,60); } else ir();", '  ir();'],
  ['nav', 'con candado vuelven las acciones junto a él (QA)', 'css', '.pf-cerrada .ch button{display:none}', '.pf-cerrada .ch button{}'],
  ['suite', 'con candado vuelven las acciones junto a él, suite (QA)', 'css', '.pf-cerrada .ch button{display:none}', '.pf-cerrada .ch button{}'],
  ['nav', 'subir una foto con la cuenta bloqueada vuelve a dejarse (QA)', 'e5', "if(_c&&typeof premiumLocked==='function'&&premiumLocked(_c)){ if(typeof toast==='function') toast('Las fotos de progreso vienen con tu plan'); return; }", 'void 0;'],
  ['nav', 'el atrás vuelve a cerrar la pantalla debajo de la foto ampliada (QA)', 'e2', "  if(pv){pv.remove();return true;}", '  void pv;'],
  ['suite', 'el visor de la foto pierde su capa de historial (QA)', 'e5', "  if(typeof navOpenLayer==='function') navOpenLayer();   // v708 · el atrás cierra el visor", "  // v708 · el atrás cierra el visor"],
  ['nav', '«Mis datos» vuelve a mandar a completar algo que no se puede (QA)', 'core', "valor: datos || 'Sin edad ni estatura' }", "valor: datos || 'Completa tu perfil' }"],
];

const correr = capa => {
  const cmd = capa === 'suite' ? 'node avi.test.js' : 'node scripts/e2e/_verify-perfil-filas.mjs';
  try { execSync(cmd, { cwd: ROOT, stdio: 'pipe', timeout: 420000 }); return true; } catch { return false; }
};

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
// 🔴 El control va PRIMERO (lección v707/v708): si el harness o la suite ya salen rojos SIN sabotaje, cada fila
// «mordería» en falso. Se detiene sin dar ningún veredicto.
const preSuite = correr('suite'), preNav = SOLO_SUITE || correr('nav');
if (!preSuite || !preNav) {
  console.log(`🔴 CONTROL PREVIO ROJO (suite ${preSuite ? 'verde' : 'ROJA'} · harness ${preNav ? 'verde' : 'ROJO'}): sin sabotaje ya falla — no se corre ninguna fila.`);
  process.exit(1);
}
let muerden = 0, noAplican = 0, corridas = 0;
for (const [capa, nombre, archivo, buscar0, poner0] of SABOTAJES) {
  if (SOLO_SUITE && capa !== 'suite') continue;
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
const baseSuite = correr('suite'), baseNav = SOLO_SUITE || correr('nav'), base = baseSuite && baseNav;
console.log(`\nControl: sin sabotaje ${base ? 'VERDE ✅' : 'ROJO 🔴'} (suite ${baseSuite ? 'verde' : 'ROJA'} · harness ${baseNav ? 'verde' : 'ROJO'})`);
console.log(`Resultado: ${muerden}/${corridas} muerden · ${noAplican} sin aplicar.`);
process.exit(base && !noAplican && muerden === corridas ? 0 : 1);
