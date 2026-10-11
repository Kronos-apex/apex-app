// Matriz de sabotaje de v705 — el buscador del selector de ejercicios (pedido del PO, 10-oct-2026). Cada
// fila devuelve UN defecto y la capa indicada TIENE que ponerse roja: 'suite' corre avi.test.js y 'nav'
// corre scripts/e2e/_verify-buscar-ejercicio.mjs. Veredicto por CÓDIGO DE SALIDA, reemplazos con
// FUNCIÓN y escritura ATÓMICA. COMMITEAR antes de correrla (lección v611).
//   node scripts/e2e/_sabotaje-v705.mjs            (todas)
//   node scripts/e2e/_sabotaje-v705.mjs --solo-suite
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { e2: join(ROOT, 'app-2-login.js'), e3: join(ROOT, 'app-3-coach.js'), e4: join(ROOT, 'app-4-entreno.js'), html: join(ROOT, 'index.html') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };
const SOLO_SUITE = process.argv.includes('--solo-suite');

const SABOTAJES = [
  // ── El campo y su cableado ──
  ['suite', 'el selector pierde su buscador', 'html', ' oninput="pkSearch(this.value)">', '>'],
  ['nav', 'el selector pierde su buscador (se escribe y no pasa nada)', 'html', ' oninput="pkSearch(this.value)">', '>'],
  ['suite', 'busca con otra función (con tildes / frase exacta)', 'e2', 'searchExercises(DB.exercises,_pkQ,CUR.pkFilter)', "DB.exercises.filter(e=>e.name.toLowerCase().includes(_pkQ.toLowerCase())&&(CUR.pkFilter==='all'||e.muscle===CUR.pkFilter))"],
  ['nav', 'busca con otra función (con tildes / frase exacta) — se ve', 'e2', 'searchExercises(DB.exercises,_pkQ,CUR.pkFilter)', "DB.exercises.filter(e=>e.name.toLowerCase().includes(_pkQ.toLowerCase())&&(CUR.pkFilter==='all'||e.muscle===CUR.pkFilter))"],
  // ── 🔒 La zona que duele ──
  ['suite', 'lo buscado se salta el filtro de la zona que duele', 'e2', "_pkBase.filter(e=>(env==='all'||(e.env||['gym']).includes(env))&&_pkOk(e));", "_pkBase.filter(e=>(env==='all'||(e.env||['gym']).includes(env)));"],
  ['nav', 'lo buscado se salta el filtro de la zona que duele (se ve)', 'e2', "_pkBase.filter(e=>(env==='all'||(e.env||['gym']).includes(env))&&_pkOk(e));", "_pkBase.filter(e=>(env==='all'||(e.env||['gym']).includes(env)));"],
  // ── Cada vez, vacío ──
  ['suite', 'una puerta al selector hereda la búsqueda anterior', 'e2', "const es=document.getElementById('pk-env');if(es)es.value='all';_pkResetQ();", "const es=document.getElementById('pk-env');if(es)es.value='all';"],
  ['nav', 'el armado de rutinas hereda la búsqueda anterior (se ve)', 'e3', "  buildFilterBtns('pk-f',pkFilter);\n  if(typeof _pkResetQ==='function')_pkResetQ();\n  renderPickerForTarget();om('m-picker');", "  buildFilterBtns('pk-f',pkFilter);\n  renderPickerForTarget();om('m-picker');"],
  // ── El vacío dice por qué ──
  ['nav', 'el vacío vuelve a «Sin ejercicios en esta categoría» a secas', 'e2', '    if(!_pkQ) return defecto;\n', '    return defecto;\n'],
  ['nav', '«Buscar en todos» no quita el filtro de músculo', 'e2', "function pkSearchAll(){\n  CUR.pkFilter='all'; CUR.pkEnv='all';", "function pkSearchAll(){\n  CUR.pkEnv='all';"],
  ['suite', '«Buscar en todos» no quita el filtro de músculo (cableado)', 'e2', "function pkSearchAll(){\n  CUR.pkFilter='all'; CUR.pkEnv='all';", "function pkSearchAll(){\n  CUR.pkEnv='all';"],
  // ── Los botones dicen lo que muestra la lista ──
  ['suite', 'al cambiar un ejercicio los botones vuelven a marcar «Todos»', 'e4', "buildFilterBtns('pk-f',pkFilter,CUR.pkFilter)", "buildFilterBtns('pk-f',pkFilter)"],
  ['nav', 'al cambiar un ejercicio los botones vuelven a marcar «Todos» (se ve)', 'e4', "buildFilterBtns('pk-f',pkFilter,CUR.pkFilter)", "buildFilterBtns('pk-f',pkFilter)"],
  // ── Correcciones del QA (Lucas y Julián) ──
  ['suite', 'la guarda se vuelve inerte: if(false) delante de la limpieza (patrón v579)', 'e3', "  if(typeof _pkResetQ==='function')_pkResetQ();\n  renderPickerForTarget();om('m-picker');", "  if(false)_pkResetQ();\n  renderPickerForTarget();om('m-picker');"],
  ['suite', 'lo buscado que duele vuelve a mandar a saltarse el ejercicio', 'e2', 'return sinQ?', 'return false?'],
  ['nav', 'lo buscado que duele vuelve a mandar a saltarse el ejercicio (se ve)', 'e2', 'return sinQ?', 'return false?'],
  ['suite', 'los botones de músculo vuelven a ocupar varias filas', 'html', '<div class="pk-chips" id="pk-f"></div>', '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:9px" id="pk-f"></div>'],
  ['nav', 'los botones de músculo vuelven a ocupar varias filas (la lista baja bajo el teclado)', 'html', '<div class="pk-chips" id="pk-f"></div>', '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:9px" id="pk-f"></div>'],
  ['nav', 'el botón marcado se queda fuera de la fila (no se trae a la vista)', 'e4', 'con.scrollLeft+=a.getBoundingClientRect().left', 'con.scrollLeft+=0*a.getBoundingClientRect().left'],
];

const correr = capa => {
  const cmd = capa === 'suite' ? 'node avi.test.js' : 'node scripts/e2e/_verify-buscar-ejercicio.mjs';
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
