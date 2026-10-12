// Matriz de sabotaje de v710 — la barra de cinco (lote 5 del estudio de organización, decisión del PO del
// 11-oct-2026): Hoy · Rutinas · Progreso · Mensajes · Perfil, y Comunidad se entra desde Progreso › Resumen.
// Cada fila devuelve UN defecto y la capa indicada TIENE que ponerse roja: 'suite' corre avi.test.js y 'nav'
// corre scripts/e2e/_verify-barra-cinco.mjs. Veredicto por CÓDIGO DE SALIDA, reemplazos con FUNCIÓN y
// escritura ATÓMICA. COMMITEAR antes de correrla (lección v611), y nunca con otro proceso leyendo el árbol. El
// control SIN sabotaje corre PRIMERO y, si sale rojo, no se da ningún veredicto (lección v707/v708).
//   node scripts/e2e/_sabotaje-v710.mjs            (todas)
//   node scripts/e2e/_sabotaje-v710.mjs --solo-suite | --solo-nav | --fila=<texto>
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { e4: join(ROOT, 'app-4-entreno.js'), e6: join(ROOT, 'app-6-extra.js'), e7: join(ROOT, 'app-7-community.js'), html: join(ROOT, 'index.html'), css: join(ROOT, 'styles.css'), core: join(ROOT, 'avi-core.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };
const SOLO_SUITE = process.argv.includes('--solo-suite');
const SOLO_NAV = process.argv.includes('--solo-nav');
const FILA = (process.argv.find(a => a.startsWith('--fila=')) || '').slice(7);

// El orden viejo (Mensajes antes que Progreso) se arma leyendo las dos líneas de verdad: escribirlas a mano
// aquí dejaría el ancla despegada en cuanto alguien toque un ícono.
const H = readFileSync(F.html, 'utf8').replace(/\r\n/g, '\n').split('\n');
const lProg = H.find(l => l.includes('data-cn="cn-history"')), lMsg = H.find(l => l.includes('data-cn="cn-messages"'));

const SABOTAJES = [
  ['suite', 'Comunidad vuelve a la barra', 'html', '<div class="cntab" data-cn="cn-profile"', `<div class="cntab" data-cn="cn-community" onclick="cnTab('cn-community',this)"><div class="ctico"></div>Comunidad</div><div class="cntab" data-cn="cn-profile"`],
  ['nav', 'Comunidad vuelve a la barra (se ve)', 'html', '<div class="cntab" data-cn="cn-profile"', `<div class="cntab" data-cn="cn-community" onclick="cnTab('cn-community',this)"><div class="ctico"></div>Comunidad</div><div class="cntab" data-cn="cn-profile"`],
  ['suite', 'la barra vuelve al orden viejo (Mensajes antes que Progreso)', 'html', lProg + '\n' + lMsg, lMsg + '\n' + lProg],
  ['nav', 'la barra vuelve al orden viejo (se ve)', 'html', lProg + '\n' + lMsg, lMsg + '\n' + lProg],
  ['suite', 'la fila «Comunidad» de Progreso no abre nada', 'html', 'id="pg-cmty" onclick="cnOpenCommunity()"', 'id="pg-cmty" onclick="void 0"'],
  ['nav', 'la fila «Comunidad» de Progreso no abre nada (se ve)', 'html', 'id="pg-cmty" onclick="cnOpenCommunity()"', 'id="pg-cmty" onclick="void 0"'],
  ['suite', 'la pestaña marcada vuelve a salir del botón que llamó', 'e4', "const _tabOn=_cnTabEl(id)||el; if(_tabOn)_tabOn.classList.add('on');", "if(el)el.classList.add('on');"],
  ['nav', 'la pestaña marcada vuelve a salir del botón que llamó (se ve)', 'e4', "const _tabOn=_cnTabEl(id)||el; if(_tabOn)_tabOn.classList.add('on');", "if(el)el.classList.add('on');"],
  ['suite', 'en Comunidad no queda ninguna pestaña marcada', 'e4', "const CN_TAB_HOST={'cn-community':'cn-history'};", 'const CN_TAB_HOST={};'],
  ['nav', 'en Comunidad no queda ninguna pestaña marcada (se ve)', 'e4', "const CN_TAB_HOST={'cn-community':'cn-history'};", 'const CN_TAB_HOST={};'],
  ['nav', 'Comunidad se abre a media altura', 'e4', "  if(!_antes||_antes.id!==id){ const _sc=document.getElementById(id).closest('.cnbody'); if(_sc) _sc.scrollTop=0; }", '  void 0;'],
  ['suite', 'cambiar de pantalla ya no vuelve arriba', 'e4', "  if(!_antes||_antes.id!==id){ const _sc=document.getElementById(id).closest('.cnbody'); if(_sc) _sc.scrollTop=0; }", '  void 0;'],
  ['suite', 'la píldora vuelve a quedarse con «7 días» en Progreso', 'e6', ",#cn-messages.on,#cn-history.on';", ",#cn-messages.on';"],
  ['suite', 'la invitación vuelve a mandar a la pestaña Comunidad', 'core', "entra a AVI, abre Progreso y toca Comunidad: '", "entra a AVI y toca la pestaña Comunidad: '"],
  ['suite', 'los accesos directos vuelven a buscar la pestaña por su posición', 'e4', '    const _tab=_cnTabEl(_goId);', "    const _tab=document.querySelectorAll('.cntab')[['cn-today','cn-routines','cn-messages','cn-history','cn-profile'].indexOf(_goId)];"],
  ['suite', '«Ver a mi gente» busca una pestaña que ya no existe', 'e7', "  if(typeof cnOpenCommunity === 'function'){ cnOpenCommunity(); return; }", "  const tab=document.querySelector('.cntab[onclick*=\"cn-community\"]'); if(typeof cnTab==='function'){ cnTab('cn-community', tab||null); return; }"],
  ['suite', 'la ayuda de Progreso ya no nombra Comunidad', 'e6', '    Al final del Resumen está <b>Comunidad</b>, tu gente.\n', ''],
  ['nav', 'la ayuda de Comunidad no dice por dónde se entra', 'e6', ' Se abre desde\n    <b>Progreso</b>, al final del Resumen.', ''],
  ['suite', 'la ayuda de Comunidad no dice por dónde se entra (suite)', 'e6', ' Se abre desde\n    <b>Progreso</b>, al final del Resumen.', ''],
  ['suite', 'nadie se entera de que Comunidad se mudó (sin novedad)', 'e6', "{v:710, icon:'users',", "{v:9710, icon:'users',"],
  // QA de v710: con «Muy grande» y la píldora «Instalar app» a la vista, la fila de Comunidad quedaba debajo de ella.
  ['nav', 'con letra grande el hueco vuelve a ser el de la píldora sola', 'css', '.cnbody{ padding-bottom:160px; }', '.cnbody{ padding-bottom:64px; }'],
  ['suite', 'con letra grande el hueco vuelve a ser el de la píldora sola (suite)', 'css', '.cnbody{ padding-bottom:160px; }', '.cnbody{ padding-bottom:64px; }'],
  ['nav', 'la descripción de Comunidad vuelve a la derecha y el título se monta', 'html', '<span class="aj-lbl">Comunidad<span class="aj-sub">Amigos y tu gimnasio</span></span>', '<span class="aj-lbl">Comunidad</span><span class="aj-val">Amigos y tu gimnasio</span>'],
];

const correr = capa => {
  const cmd = capa === 'suite' ? 'node avi.test.js' : 'node scripts/e2e/_verify-barra-cinco.mjs';
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
