// Matriz de sabotaje de v696 (R18) — AVI PRO dentro de la app y la bienvenida honesta. Cada fila devuelve
// UN defecto y la suite TIENE que ponerse roja. Lo visible lo prueba `_verify-r18-app.mjs`.
// Reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-v696.mjs   (COMMITEAR o respaldar antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), c3: join(ROOT, 'app-3-coach.js'), c4: join(ROOT, 'app-4-entreno.js'), html: join(ROOT, 'index.html') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['un PRO vencido vuelve a salir al chat', 'core', "  if (plan === 'app') return vencido ? 'renovar-pro' : 'coach';", "  if (plan === 'app') return vencido ? 'coach-chat' : 'coach';"],
  ['a un PRO se le ofrece PRO otra vez', 'core', "  if (plan === 'app') return ['coach'];", "  if (plan === 'app') return ['pro', 'coach'];"],
  ['al libre se le quita la opción de PRO', 'core', "  if (plan === 'libre') return ['pro', 'coach'];", "  if (plan === 'libre') return ['coach'];"],
  ['un PRO renueva por un chat que no tiene', 'core', "  return clientPlan(client) === 'app' ? 'whatsapp-pro' : 'chat';", "  return 'chat';"],
  ['el candado vuelve a decir «coach (Premium)»', 'c3', "    'opciones':'Se desbloquea con <b>AVI PRO</b> o con un coach.',", "    'opciones':'Disponible con un <b>coach (Premium)</b>.',"],
  ['el botón del PRO vencido vuelve al chat', 'c3', "    'renovar-pro':_b(\"abrirPlanWhatsApp('renovar-pro')\",'Renovar mi AVI PRO'),", "    'renovar-pro':_b(\"cnTab('cn-messages',document.getElementById('tab-msgs'))\",'Hablar con mi coach'),"],
  ['el candado deja de preguntarle a planLockExit', 'c3', "  const salida=(typeof planLockExit==='function')?planLockExit(c):'opciones';", "  const salida='opciones';"],
  ['la banda de gracia vuelve al botón del chat a mano', 'c4', "mientras lo renuevas. '+margen+'</div>'\n    +_gbandBoton(client)", "mientras lo renuevas. '+margen+'</div>'\n    +'<button class=\"gband-b\" onclick=\"cnTab(\\'cn-messages\\',document.getElementById(\\'tab-msgs\\'))\">Hablar con mi coach</button>'"],
  ['la vía de la banda ignora el plan', 'c4', "function _gbandVia(client){ return (typeof planRenewVia==='function')?planRenewVia(client):'chat'; }", "function _gbandVia(client){ return 'chat'; }"],
  ['la ventana no esconde la opción de PRO', 'c4', "if(pro)pro.style.display=ops.includes('pro')?'':'none';", "if(pro)pro.style.display='';"],
  ['el WhatsApp del coaching se abre después del await', 'c4', "  abrirPlanWhatsApp('coach');\n  try{ await requestCoach(); _puState(true); wfConfetti(); }", "  try{ await requestCoach(); abrirPlanWhatsApp('coach'); _puState(true); wfConfetti(); }"],
  ['un número de WhatsApp escrito en la app', 'c4', "const AVI_WEB_URL='https://avientrena.com/';", "const AVI_WEB_URL='https://avientrena.com/';\nconst _WA_X='https://wa.me/573000000000';"],
  ['la bienvenida vuelve a prometer un coach', 'html', '<div class="cin-eyebrow">Tu rutina, en tu celular</div>', '<div class="cin-eyebrow">Con un coach de verdad</div>'],
  ['con ?origen=web «Crear cuenta» no pasa adelante', 'html', "crear.className='cin-cta-fill'; entrar.className='cin-cta-out'; entrar.textContent='Ya tengo cuenta';", "entrar.textContent='Ya tengo cuenta';"],
  ['el enlace de vuelta a la web se queda', 'html', '      if(web&&web.parentNode) web.parentNode.removeChild(web);\n', ''],
  ['el titular le ofrece a un PRO desbloquear lo que ya tiene', 'c4', "if(_t)_t.textContent=ops.includes('pro')?'Elige cómo seguir':'Súmale un coach';", "if(_t)_t.textContent='Elige cómo seguir';"],
  ['la ventana pierde la opción de PRO', 'html', '<button class="wf-btn pu-opt-b" onclick="puPro()">', '<button class="wf-btn pu-opt-b" onclick="closePremiumUpsell()">'],
];

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
let muerden = 0, noAplican = 0;
for (const [nombre, archivo, buscar0, poner0] of SABOTAJES) {
  const src = orig[archivo];
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const buscar = buscar0.replace(/\n/g, eol), poner = poner0.replace(/\n/g, eol);
  const veces = src.split(buscar).length - 1;
  if (veces !== 1) { noAplican++; console.log(`⚠️  NO SE APLICÓ — «${nombre}»: el ancla aparece ${veces} veces.`); continue; }
  escribir(F[archivo], src.replace(buscar, () => poner));
  let rojo = false;
  try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' }); } catch { rojo = true; } finally { escribir(F[archivo], orig[archivo]); }
  if (rojo) { muerden++; console.log(`✅ MUERDE — «${nombre}»`); } else console.log(`🔴 VERDE CON SABOTAJE — «${nombre}»`);
}
let base = true;
try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' }); } catch { base = false; }
console.log(`\nControl: suite sin sabotaje ${base ? 'VERDE ✅' : 'ROJA 🔴'}`);
console.log(`Resultado: ${muerden}/${SABOTAJES.length} muerden · ${noAplican} sin aplicar.`);
process.exit(base && !noAplican && muerden === SABOTAJES.length ? 0 : 1);
