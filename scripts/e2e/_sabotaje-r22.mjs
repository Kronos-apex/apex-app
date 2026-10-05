// Matriz de sabotaje de R22 (v701) — auditoría final de la web, «dale con todos» (5-oct-2026): el plan en la
// tarjeta de vitrina, la medición anónima del registro, Google primero en el paso 7 y el paso 2 sin jerga.
// Cada fila devuelve UN defecto y la suite TIENE que ponerse roja. Reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-r22.mjs   (COMMITEAR o respaldar antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = {
  core: join(ROOT, 'avi-core.js'), coach: join(ROOT, 'app-3-coach.js'), html: join(ROOT, 'index.html'),
  css: join(ROOT, 'styles.css'), s5: join(ROOT, 'supabase', 'community', 's5_signup_funnel.sql'),
  s4: join(ROOT, 'supabase', 'community', 's4_showcase_plan.sql'),
};
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  // ── el plan en la tarjeta ──
  ['AVI PRO se publica como «con coach»', 'core', "  if (t === 'app') return 'pro';\n", ''],
  ['un plan que el servidor rechaza viaja en la fila', 'core', '  if (SHOWCASE_PLANES.includes(story.plan)) row.plan = story.plan;', '  if (story.plan) row.plan = story.plan;'],
  ['la app y el servidor dejan de coincidir en los planes', 'core', "const SHOWCASE_PLANES = ['gratis', 'pro', 'coach'];", "const SHOWCASE_PLANES = ['gratis', 'pro', 'coach', 'presencial'];"],
  ['la columna del plan se vuelve obligatoria', 's4', '  add column if not exists plan text;', '  add column if not exists plan text not null;'],
  // ── la medición del registro ──
  ['un paso imposible produce fila', 'core', '  if (!Number.isInteger(n) || n < 1 || n > FUNNEL_PASO_MAX) return null;', '  if (!Number.isFinite(n)) return null;'],
  ['un nombre viaja como canal', 'core', "  if (typeof canal === 'string' && CANAL_RE.test(canal)) row.canal = canal;", "  if (typeof canal === 'string' && canal) row.canal = canal;"],
  ['cualquier origen cuenta como la web', 'core', "if (new URLSearchParams(String(search || '')).get('origen') === 'web') origen = 'web';", "if (String(search || '').includes('origen')) origen = 'web';"],
  ['el servidor acepta un paso de más', 's5', 'check (paso between 1 and 10)', 'check (paso between 1 and 12)'],
  ['la tabla anónima se puede leer desde la app', 's5', 'grant insert on table public.signup_funnel to anon, authenticated;', 'grant insert, select on table public.signup_funnel to anon, authenticated;'],
  ['la tabla anónima gana una columna de la persona', 's5', '  origen text not null', '  correo text,\n  origen text not null'],
  ['el asistente no cuenta los pasos que muestra', 'coach', '    _wzFunnel(this.cur+1);\n', ''],
  ['el paso 8 se cuenta antes de saber si la cuenta se creó', 'coach', "    _wzFunnel(8);\n    if(!session){", "    if(!session){"],
  ['el paso 9 se pierde al salir a Google', 'coach', '  Promise.race([_wzFunnel(9), new Promise(r=>setTimeout(r,400))]).then(()=>loginWithGoogle());', '  loginWithGoogle();'],
  ['el paso 9 sale sin esperar a que la fila llegue', 'coach', '  Promise.race([_wzFunnel(9), new Promise(r=>setTimeout(r,400))]).then(()=>loginWithGoogle());', '  _wzFunnel(9); loginWithGoogle();'],
  ['medir frena la salida a Google 5 segundos', 'coach', 'new Promise(r=>setTimeout(r,400))', 'new Promise(r=>setTimeout(r,5000))'],
  ['el paso 10 no se cuenta', 'coach', "  _wzFunnel(10);\n  // El canal ya quedó", '  // El canal ya quedó'],
  ['el paso 10 se cuenta después de soltar el canal (sale siempre sin canal)', 'coach', "  _wzFunnel(10);\n  // El canal ya quedó en SU perfil: se suelta, para no atribuírselo a otra cuenta creada en este aparato.\n  try{ localStorage.removeItem('ax_canal'); }catch(e){}", "  // El canal ya quedó en SU perfil: se suelta, para no atribuírselo a otra cuenta creada en este aparato.\n  try{ localStorage.removeItem('ax_canal'); }catch(e){}\n  _wzFunnel(10);"],
  ['un harness en localhost escribe en la medición de producción', 'coach', "    if(typeof cloudWriteSealed==='function'&&cloudWriteSealed(location.hostname,window.AVI_ALLOW_CLOUD_WRITE))return;\n", ''],
  ['el mismo paso se cuenta dos veces', 'coach', '    if(_wzFunnelSent.has(paso))return;\n', ''],
  ['medir frena el registro', 'coach', "    return AUTH.client().from('signup_funnel').insert(row).then(()=>{},()=>{});", "    await AUTH.client().from('signup_funnel').insert(row);"],
  ['un fallo de la medición rompe la salida a Google', 'coach', "    return AUTH.client().from('signup_funnel').insert(row).then(()=>{},()=>{});", "    return AUTH.client().from('signup_funnel').insert(row);"],
  ['el aviso del paso 7 queda fuera de la vista', 'coach', " try{ e.scrollIntoView({block:'nearest'}); }catch(_e){} } },", " } },"],
  ['Google sin casillas avisa por fuera de la función que se ve', 'coach', "  if(!consent){ WZ._err(_wzConsentError()); return; }", "  if(!consent){ const e=document.getElementById('su-err'); if(e){e.textContent=_wzConsentError();e.classList.add('on');} return; }"],
  ['el aviso del nombre se borra en el acto', 'coach', "WZ.cur=0; WZ._sync(); WZ._err('Escribe tu nombre antes de continuar con Google');", "WZ._err('Escribe tu nombre antes de continuar con Google'); WZ.cur=0; WZ._sync();"],
  ['el retorno de Google pierde que vino de la web', 'html', "      try{ sessionStorage.setItem('ax_origen','web'); }catch(e){}\n", ''],
  // ── Google primero ──
  ['el correo vuelve a ir antes que Google', 'html', '        <button type="button" class="wz-gbtn wz-gbtn-main" onclick="wzGoogle()">', '        <button type="button" id="su-mail-toggle" onclick="wzShowMail()">o con mi correo</button>\n        <button type="button" class="wz-gbtn wz-gbtn-main" onclick="wzGoogle()">'],
  ['el correo empieza desplegado', 'html', '<div id="su-mail-box" class="cx-off">', '<div id="su-mail-box">'],
  ['«o con mi correo» no abre nada', 'coach', "  if(box)box.classList.remove('cx-off');\n", ''],
  ['el asistente se reabre con el correo abierto', 'coach', "    const mb=document.getElementById('su-mail-box'); if(mb)mb.classList.add('cx-off');\n", ''],
  ['el enlace del correo sigue a la vista después de abrirlo', 'css', '.wz-mailtoggle[aria-expanded="true"]{display:none}\n', ''],
  ['«Instala la app» compite con «Crear cuenta» para quien viene de la web', 'html', "      document.documentElement.classList.add('av-desde-web');\n", ''],
  ['vuelve el apagado que busca #install-hint antes de que exista', 'html', "      document.documentElement.classList.add('av-desde-web');", "      var ih=document.getElementById('install-hint'); if(ih) ih.classList.add('av-desde-web');"],
  ['la regla de estilo no apaga el bloque', 'css', '.av-desde-web #install-hint{display:none!important}', '.av-desde-web #install-hint{opacity:.99}'],
  ['la marca de la web queda detrás de un return temprano', 'html', "      document.documentElement.classList.add('av-desde-web');\n      var cta=document.getElementById('cin-cta'); if(!cta) return;", "      var cta=document.getElementById('cin-cta'); if(!cta) return;\n      document.documentElement.classList.add('av-desde-web');"],
  // ── el paso 2 ──
  ['vuelve la jerga al paso 2', 'html', '<span class="sub">Bajar de peso y marcarte</span>', '<span class="sub">Definición y déficit</span>'],
  ['cambia el valor que guarda el asistente', 'html', "WZ.pick('su-goal','Fuerza',this)", "WZ.pick('su-goal','Ganar fuerza',this)"],
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
  try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe', env: { ...process.env, TZ: 'UTC' } }); } catch { rojo = true; } finally { escribir(F[archivo], orig[archivo]); }
  if (rojo) { muerden++; console.log(`✅ MUERDE — «${nombre}»`); } else console.log(`🔴 VERDE CON SABOTAJE — «${nombre}»`);
}
let base = true;
try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe', env: { ...process.env, TZ: 'UTC' } }); } catch { base = false; }
console.log(`\nControl: suite sin sabotaje ${base ? 'VERDE ✅' : 'ROJA 🔴'}`);
console.log(`Resultado: ${muerden}/${SABOTAJES.length} muerden · ${noAplican} sin aplicar.`);
process.exit(base && !noAplican && muerden === SABOTAJES.length ? 0 : 1);
