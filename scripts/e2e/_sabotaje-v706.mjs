// Matriz de sabotaje de v706 — el coach comparte el plan de alimentación (pedido del PO, 10-oct-2026). Cada
// fila devuelve UN defecto y la capa indicada TIENE que ponerse roja: 'suite' corre avi.test.js y 'nav'
// corre scripts/e2e/_verify-compartir-plan.mjs. Veredicto por CÓDIGO DE SALIDA, reemplazos con FUNCIÓN y
// escritura ATÓMICA. COMMITEAR antes de correrla (lección v611), y nunca con otro agente leyendo el árbol.
//   node scripts/e2e/_sabotaje-v706.mjs            (todas)
//   node scripts/e2e/_sabotaje-v706.mjs --solo-suite
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { e3: join(ROOT, 'app-3-coach.js'), e4: join(ROOT, 'app-4-entreno.js'), e5: join(ROOT, 'app-5-salud.js'), css: join(ROOT, 'styles.css') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };
const SOLO_SUITE = process.argv.includes('--solo-suite');

const SABOTAJES = [
  // ── Las cifras: la ficha y lo que se manda dicen lo que VE la persona ──
  ['suite', 'la ficha vuelve a pintar las cifras escritas', 'e5', 'const _k=_c?_nutPlanCifras(_c,nut):{', 'const _k=_c?{kcal:+nut.kcal||0,prot:+nut.prot||0,carb:+nut.carbs||0,fat:+nut.fat||0}:{'],
  ['nav', 'la ficha vuelve a pintar las cifras escritas (se ve)', 'e5', 'const _k=_c?_nutPlanCifras(_c,nut):{', 'const _k=_c?{kcal:+nut.kcal||0,prot:+nut.prot||0,carb:+nut.carbs||0,fat:+nut.fat||0}:{'],
  ['suite', 'las cifras ignoran el piso de menores (sin nutBaseFor)', 'e5', "const b=(typeof nutBaseFor==='function'&&c)?nutBaseFor(c,nut,_nutPesoDe(c)):null;", 'const b=null;'],
  // ── WhatsApp a ESA persona ──
  ['suite', 'WhatsApp sin normalizar el número', 'e5', "window.open('https://wa.me/'+(tel||'')+'?text='", "window.open('https://wa.me/'+(c.phone||'')+'?text='"],
  ['nav', 'WhatsApp sin normalizar el número (se ve)', 'e5', "window.open('https://wa.me/'+(tel||'')+'?text='", "window.open('https://wa.me/'+(c.phone||'')+'?text='"],
  ['suite', 'el mensaje del coach habla en primera persona («MI PLAN»)', 'e5', "_nutPlanTexto(c,nut,'tu')", "_nutPlanTexto(c,nut,'yo')"],
  // ── El aviso: su marca viaja SOLO en ese mensaje ──
  ['suite', 'la marca no se consume y se pega al mensaje siguiente', 'e3', 'const act=_cchatAct; _cchatAct=null;', 'const act=_cchatAct;'],
  ['nav', 'la marca no se consume y se pega al mensaje siguiente (se ve)', 'e3', 'const act=_cchatAct; _cchatAct=null;', 'const act=_cchatAct;'],
  ['suite', 'el aviso sale sin su marca', 'e3', '  if(act)_msg.act=act;', '  void 0;'],
  ['nav', 'el aviso sale sin su marca (se ve)', 'e3', '  if(act)_msg.act=act;', '  void 0;'],
  ['suite', 'la persona no ve «Ver mi plan»', 'e4', "if(m.act==='nutplan'&&!mine&&", "if(false&&m.act==='nutplan'&&!mine&&"],
  ['nav', 'la persona no ve «Ver mi plan» (se ve)', 'e4', "if(m.act==='nutplan'&&!mine&&", "if(false&&m.act==='nutplan'&&!mine&&"],
  ['suite', 'el coach ve «tócalo aquí abajo» sin nada abajo', 'e3', "if(m.act==='nutplan'&&isC&&", "if(false&&m.act==='nutplan'&&isC&&"],
  ['suite', 'el botón de la persona abre otra cosa', 'e5', 'openNutritionRoom(CUR.clientId)', 'openNutritionRoom(null)'],
  ['nav', 'el botón de la persona abre otra cosa (se ve)', 'e5', 'openNutritionRoom(CUR.clientId)', 'openNutritionRoom(null)'],
  // ── Donde el aviso no llegaría, no se ofrece ──
  ['suite', 'la ficha ofrece el aviso sin preguntar si llega', 'e5', 'const _bloq=_nutAvisoNo(_c);', "const _bloq='';"],
  ['nav', 'la ficha ofrece el aviso sin preguntar si llega (se ve)', 'e5', 'const _bloq=_nutAvisoNo(_c);', "const _bloq='';"],
  ['suite', 'un plan sin coach recibe el aviso (se guardaría y no llega)', 'e5', '  if(blk) return', '  if(false) return'],
  ['suite', 'la acción del aviso no comprueba si llega', 'e5', 'const no=_nutAvisoNo(c); if(no){ toast(no); return; }', "const no=''; if(no){ toast(no); return; }"],
  ['nav', 'la acción del aviso no comprueba si llega (se ve)', 'e5', 'const no=_nutAvisoNo(c); if(no){ toast(no); return; }', "const no=''; if(no){ toast(no); return; }"],
  // ── La imagen ──
  ['nav', 'el texto de la imagen vuelve a tocar el pie', 'e5', 'const TOPE=1180;', 'const TOPE=1240;'],
  ['nav', 'el aire del plan corto vuelve a quedar todo abajo', 'e5', 'const dy=Math.max(0,Math.floor((TOPE-ultima)/2));', 'const dy=0;'],
  // ── Correcciones del QA (Lucas) ──
  ['suite', 'una palabra larga vuelve a salirse de la imagen', 'e5', 'while(w&&x.measureText(w).width>maxW){', 'while(false){'],
  ['suite', 'el archivo del chat vuelve a pintar el botón con la comida bloqueada', 'e5', '  if(_bloqueada()){', '  if(false){'],
  ['nav', 'el archivo del chat vuelve a pintar el botón con la comida bloqueada (se ve)', 'e5', '  if(_bloqueada()){', '  if(false){'],
  ['suite', 'un botón ya pintado abre el plan aunque hoy esté bloqueado', 'e5', 'b.onclick=()=>{ if(_bloqueada())return; ', 'b.onclick=()=>{ '],
  ['nav', 'con «Muy grande» el rótulo vuelve a salirse del botón', 'css', 'white-space:normal;text-align:left;line-height:1.3}', 'line-height:1.3}'],
  ['nav', 'la ficha vuelve a decir «Lo que ve» de alguien que no lo ve', 'e5', '${_noLoVe?', '${false?'],
  ['nav', 'el aviso vuelve a decir «aquí abajo» (sin sentido en la notificación)', 'e5', 'Lo ves en tu Perfil, en «Mi plan de alimentación».', 'Tócalo aquí abajo para verlo.'],
];

const correr = capa => {
  const cmd = capa === 'suite' ? 'node avi.test.js' : 'node scripts/e2e/_verify-compartir-plan.mjs';
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
