// Matriz de sabotaje de v692 — la contraseña no lleva el nombre ni el correo de la persona.
// Cada fila devuelve UN defecto y la suite TIENE que ponerse roja. Que el servidor de verdad lo rechace
// lo prueba `_verify-clave-nombre.mjs` contra la función desplegada.
// Reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-v692.mjs   (COMMITEAR o respaldar antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), c2: join(ROOT, 'app-2-login.js'), c3: join(ROOT, 'app-3-coach.js'),
  html: join(ROOT, 'index.html'), edge: join(ROOT, 'supabase/functions/coach-create-client/index.ts') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['passwordProblem ignora a la persona', 'core', '  if (who && passwordMentionsPerson(pass, who)) {', '  if (false) {'],
  ['tres letras en cualquier sitio («Manzana99» cae por Ana)', 'core', '    (t.length >= 4 ? r.indexOf(t) !== -1 : r.indexOf(t) === 0) || (r.length >= 4', '    (r.indexOf(t) !== -1) || (r.length >= 4'],
  ['el diminutivo pasa («Manu2026»)', 'core', ' || (r.length >= 4 && t.indexOf(r) === 0)));', '));'],
  ['los números disfrazan el nombre («Andr3a2026»)', 'core', ".concat(base.replace(/[0134578@$]/g, c => PW_LEET[c]).match(/[a-z]+/g) || []);", ';'],
  ['solo los tramos sin números («Aleja1234» se esconde)', 'core', '  const tramos = (base.match(/[a-z]+/g) || []).concat(', '  const tramos = ([]).concat('],
  ['el correo no cuenta', 'core', "  [who.name, String(who.email || '').split('@')[0]].forEach(src => {", '  [who.name].forEach(src => {'],
  ['las tildes esconden el nombre', 'core', "  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');\n}\nfunction passwordMentionsPerson(", "  return String(s || '').toLowerCase();\n}\nfunction passwordMentionsPerson("],
  ['las partículas cuentan como nombre («del»)', 'core', 'PW_PARTICULAS.indexOf(t) === -1 && ', ''],
  ['la generada sale de Math.random', 'core', '  rnd = rnd || function (n) { const a = new Uint32Array(1); globalThis.crypto.getRandomValues(a); return a[0] % n; };', '  rnd = rnd || function (n) { return Math.floor(Math.random() * n); };'],
  ['la generada puede llevar el nombre', 'core', '    if (!passwordProblem(p, who)) return p;', '    return p;'],
  ['la generada lleva 0 y 1', 'core', "PW_DIG = '23456789'", "PW_DIG = '0123456789'"],
  ['el registro no pasa el nombre', 'core', '  const pp = passwordProblem(pass, { name: name, email: email, self: true });', '  const pp = passwordProblem(pass);'],
  ['el alta del coach no pasa el nombre', 'c3', "passwordProblem(pass,{name:fn+' '+ln,email})", 'passwordProblem(pass)'],
  ['«crear contraseña nueva» no pasa quién la crea', 'c2', 'passwordProblem(nueva,_pwWhoMe())', 'passwordProblem(nueva)'],
  ['los ajustes del coach vuelven al «mínimo 6»', 'c2', '    const _pp=passwordProblem(nw,{name,email,self:true});', "    const _pp=nw.length<6?'mínimo 6':null;"],
  ['el alta vuelve a enseñar «Maria2026»', 'html', 'placeholder="Mín. 8 · sin su nombre" autocomplete', 'placeholder="Ej: Maria2026" autocomplete'],
  ['desaparece «Generar una»', 'html', ' onclick="cfGenPass()"', ''],
  ['editar muestra el código crudo', 'c3', "(_ACCOUNT_ERR[_code]||_code||", '(_code||'],
  ['sin texto para password_has_name', 'c3', ",password_has_name:'la contraseña lleva su nombre o su correo'};", '};'],
  ['el servidor no mira el nombre al EDITAR', 'edge', '      if (nameInPass(password, nombre, email || cur?.user?.email)) return json({ ok: false, error: "password_has_name" }, 200);\n', ''],
  ['el servidor no mira el nombre al CREAR', 'edge', '  if (nameInPass(password, (profile as any)?.name, email)) return json({ ok: false, error: "password_has_name" }, 200);\n', ''],
  ['el servidor responde 400 (la app lo encolaría para siempre)', 'edge', '  if (nameInPass(password, (profile as any)?.name, email)) return json({ ok: false, error: "password_has_name" }, 200);', '  if (nameInPass(password, (profile as any)?.name, email)) return json({ ok: false, error: "password_has_name" }, 400);'],
  ['el espejo del servidor se aparta de la app', 'edge', '    (t.length >= 4 ? r.includes(t) : r.startsWith(t))', '    (r.includes(t))'],
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
