// Matriz de sabotaje de v707 — la ficha del asesorado en pestañas (lote 2 del estudio de organización, decisión
// del PO del 11-oct-2026). Cada fila devuelve UN defecto y la capa indicada TIENE que ponerse roja: 'suite' corre
// avi.test.js y 'nav' corre scripts/e2e/_verify-ficha-pestanas.mjs. Veredicto por CÓDIGO DE SALIDA, reemplazos
// con FUNCIÓN y escritura ATÓMICA. COMMITEAR antes de correrla (lección v611), y nunca con otro proceso leyendo
// el árbol (los harnesses sirven estos mismos archivos).
//   node scripts/e2e/_sabotaje-v707.mjs            (todas)
//   node scripts/e2e/_sabotaje-v707.mjs --solo-suite
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), e1: join(ROOT, 'app-1-infra.js'), e2: join(ROOT, 'app-2-login.js'), e3: join(ROOT, 'app-3-coach.js'),
  html: join(ROOT, 'index.html'), css: join(ROOT, 'styles.css') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };
const SOLO_SUITE = process.argv.includes('--solo-suite');
const FILA = (process.argv.find(a => a.startsWith('--fila=')) || '').slice(7);   // re-correr solo las filas que contengan ese texto

const SABOTAJES = [
  // ── Qué pestaña se ve ──
  ['suite', 'sin la regla base, las cinco pestañas se ven a la vez', 'css', '#p-detail .dt-sec{display:none}', '#p-detail .dt-sec{display:block}'],
  ['nav', 'sin la regla base, las cinco pestañas se ven a la vez (se ve)', 'css', '#p-detail .dt-sec{display:none}', '#p-detail .dt-sec{display:block}'],
  ['suite', '«Pagos» no se puede ver', 'css', ',#p-detail[data-dtab="pagos"] .dt-sec[data-dt="pagos"]{display:block}', '{display:block}'],
  ['nav', '«Pagos» no se puede ver (se ve)', 'css', ',#p-detail[data-dtab="pagos"] .dt-sec[data-dt="pagos"]{display:block}', '{display:block}'],
  ['suite', 'un bloque (las medidas) se queda fuera de su pestaña', 'html', '        <div style="margin-bottom:16px" id="d-med-wrap">', '        </section><section><div style="margin-bottom:16px" id="d-med-wrap">'],
  ['suite', 'el plan de choque vuelve al Resumen', 'html', '        <div id="d-shock" style="display:none;margin-bottom:13px"></div>\n', ''],
  // ── Las cinco caben y se tocan ──
  ['nav', 'la barra vuelve a botones sueltos y «Pagos» queda fuera a 360 px', 'css', '.dt-tab{flex:1 0 auto;position:relative;min-height:38px;padding:0 6px;', '.dt-tab{flex:1 0 auto;position:relative;min-height:38px;padding:0 14px;'],
  ['nav', 'con «Muy grande» la barra no trae la elegida a la vista', 'e3', 'seg.scrollLeft+=(r.left+r.width/2)-(sr.left+sr.width/2);', 'void 0;'],
  ['nav', 'la barra deja de quedarse fija al bajar', 'css', '.dt-tabs{position:sticky;top:0;', '.dt-tabs{position:relative;top:0;'],
  ['nav', 'cambiar de pestaña con la ficha bajada se queda a media altura', 'e3', 'if(main.scrollTop>y) main.scrollTop=y;', 'void 0;'],
  // ── Entrar, re-pintar y el atrás ──
  ['suite', 'entrar a la ficha no abre el Resumen', 'e3', "  if(!_yaEnFicha) CUR.detailTab='resumen';", '  void 0;'],
  ['nav', 'entrar a la ficha no abre el Resumen (se ve)', 'e3', "  if(!_yaEnFicha) CUR.detailTab='resumen';", '  void 0;'],
  ['suite', 're-pintar la ficha la devuelve siempre al Resumen', 'e3', "const _yaEnFicha=document.getElementById('p-detail').classList.contains('on')&&CUR.detailTabFor===id;", 'const _yaEnFicha=false;'],
  ['nav', 're-pintar la ficha la devuelve siempre al Resumen (se ve)', 'e3', "const _yaEnFicha=document.getElementById('p-detail').classList.contains('on')&&CUR.detailTabFor===id;", 'const _yaEnFicha=false;'],
  ['suite', 'el atrás olvida la pestaña', 'e2', 'const snap={id:prev,cid:CUR.clientId,dtab:CUR.detailTab};', 'const snap={id:prev,cid:CUR.clientId};'],
  ['nav', 'el atrás olvida la pestaña (se ve)', 'e2', 'const snap={id:prev,cid:CUR.clientId,dtab:CUR.detailTab};', 'const snap={id:prev,cid:CUR.clientId};'],
  ['suite', 'cambiar de pestaña empuja historial (el atrás recorrería pestañas)', 'e3', '  CUR.detailTab=t; P.setAttribute(\'data-dtab\',t);', '  CUR.detailTab=t; P.setAttribute(\'data-dtab\',t); try{navPush&&0}catch(_e){}'],
  ['suite', 'el pulso lleva al plan de choque sin abrir «Entreno»', 'e2', "  if(typeof detailTab==='function')detailTab('entreno',{quieto:true}); // v707 · el plan de choque", '  // v707 · el plan de choque'],
  ['suite', 'la notificación de un mensaje no abre el Resumen', 'e1', "openDetail(chatId); if(typeof detailTab==='function')detailTab('resumen',{quieto:true});", 'openDetail(chatId);'],
  ['suite', 'la rutina recién guardada queda escondida en otra pestaña', 'e3', "  if(typeof detailTab==='function')detailTab('entreno');\n", ''],
  ['suite', 'aplicar una plantilla deja el Resumen detrás del editor', 'e2', "  if(typeof detailTab==='function')detailTab('entreno',{quieto:true}); // v707 · detrás del editor", '  // v707 · detrás del editor'],
  // ── Correcciones del QA (Julián) ──
  ['suite', '«Último» vuelve a contar horas: lo de anoche sale como «hoy»', 'core', '  const dias = lastTs ? Math.round((localDayStart(nowTs) - localDayStart(lastTs)) / 86400000) : Infinity;', '  const dias = daysSinceLastSession(ses, nowTs);'],
  ['suite', 'sin los datos pesados, el Resumen repite «No tiene plan»', 'e3', "const _pesados=!(typeof AUTH_MODE!=='undefined'&&AUTH_MODE)||!!_heavyLoaded[c.id];", 'const _pesados=true;'],
  ['nav', 'sin los datos pesados, el Resumen repite «No tiene plan» (se ve)', 'e3', "const _pesados=!(typeof AUTH_MODE!=='undefined'&&AUTH_MODE)||!!_heavyLoaded[c.id];", 'const _pesados=true;'],
  ['suite', 'con teclado solo se llega a la pestaña elegida', 'html', ' onkeydown="detailTabKey(event)">', '>'],
  ['nav', 'con teclado solo se llega a la pestaña elegida (se ve)', 'html', ' onkeydown="detailTabKey(event)">', '>'],
  // ── El Resumen ──
  ['suite', 'quien entrena de más vuelve a leer «5 de 4 días»', 'core', "const titulo = h >= pd ? h + (h === 1 ? ' día' : ' días') + ' · cumplió' : h + ' de ' + pd + ' días';", "const titulo = h + ' de ' + pd + ' días';"],
  ['suite', 'el plan del Resumen cuenta los días distinto que su etiqueta', 'core', '      restan = Math.ceil((new Date(last.dueDate) - nowTs) / 86400000);', '      restan = Math.floor((new Date(last.dueDate) - nowTs) / 86400000);'],
  ['nav', 'el plan del Resumen cuenta los días distinto que su etiqueta (se ve)', 'core', '      restan = Math.ceil((new Date(last.dueDate) - nowTs) / 86400000);', '      restan = Math.floor((new Date(last.dueDate) - nowTs) / 86400000);'],
  ['suite', 'la descarga vencida no se avisa', 'core', "  if (dl && dl.over) revisar.push(", "  if (false) revisar.push("],
  ['nav', 'la descarga vencida no se avisa (se ve)', 'core', "  if (dl && dl.over) revisar.push(", "  if (false) revisar.push("],
  ['suite', 'a quien no tiene plan de comida se le dice que su plan tiene algo', 'core', "texto: TXT[f.comida] || 'Su plan de comida tiene algo que revisar'", "texto: 'Su plan de comida tiene algo que revisar'"],
  ['nav', 'a quien no tiene plan de comida se le dice que su plan tiene algo (se ve)', 'core', "texto: TXT[f.comida] || 'Su plan de comida tiene algo que revisar'", "texto: 'Su plan de comida tiene algo que revisar'"],
  ['nav', 'el Resumen no sabe qué caso pintó la tarjeta de comida', 'e3', "el.style.display='';el.dataset.rev=r.status;", "el.style.display='';"],
  ['suite', 'quien está en AVI FREE con un pago viejo se avisa como deudor', 'core', "    if (clientPlan(c) !== 'libre') {\n      if (st === 'expiring')", "    if (true) {\n      if (st === 'expiring')"],
  ['suite', 'el Resumen se pinta antes de que las tarjetas decidan', 'e3', "  renderDetailSummary(c);   // v707 · va al final", "  void 0;   // v707 · va al final"],
  ['nav', 'las pestañas pierden su marca', 'e3', "if(s.marcas[t]){", "if(false){"],
  ['nav', 'una fila de «Para revisar» no lleva a su pestaña', 'e3', "onclick=\"detailTab('${r.tab}')\"><span style=\"flex:1;min-width:0\">", "onclick=\"void 0\"><span style=\"flex:1;min-width:0\">"],
  ['nav', 'el texto nuevo se apaga hasta no leerse', 'css', '.dt-k{display:block;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--t2)}', '.dt-k{display:block;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--br2)}'],
];

const correr = capa => {
  const cmd = capa === 'suite' ? 'node avi.test.js' : 'node scripts/e2e/_verify-ficha-pestanas.mjs';
  try { execSync(cmd, { cwd: ROOT, stdio: 'pipe', timeout: 420000 }); return true; } catch { return false; }
};

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
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
