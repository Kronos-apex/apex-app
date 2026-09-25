// Matriz de sabotaje de v671 — sin edad no se presume adulto (auditoría del 25-sep, F2-1): ni se
// publica, ni el coach comparte el entreno, ni se le estima la grasa o se le marca la cintura; y el
// alta del coach exige la edad. Cada fila devuelve UN defecto y la suite TIENE que ponerse roja.
// Reemplazos con FUNCIÓN, escritura ATÓMICA y el fin de línea tomado del propio archivo.
// node scripts/e2e/_sabotaje-v671.mjs   (COMMITEAR antes)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), a3: join(ROOT, 'app-3-coach.js'), a4: join(ROOT, 'app-4-entreno.js'), html: join(ROOT, 'index.html') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['la tarjeta de progreso vuelve a publicar la ficha sin edad', 'core',
    "  if (!(edad > 0)) return { ok: false, razon: 'sin_edad' };\n  if (edad < 18 && !showcaseMinorOk(client)) return { ok: false, razon: 'menor' };",
    "  if (edad && edad < 18 && !showcaseMinorOk(client)) return { ok: false, razon: 'menor' };"],
  ['la grasa estimada vuelve a calcularse sin edad', 'core',
    "  if (!(edad > 0)) return { ok: false, razon: 'sin_edad' };\n  if (edad < 18) return { ok: false, razon: 'menor' };",
    "  if (isFinite(edad) && edad < 18) return { ok: false, razon: 'menor' };"],
  ['la alerta de cintura vuelve a salir sin edad', 'core',
    '  if (!(edad >= 18)) return null;',
    '  if (isFinite(edad) && edad < 18) return null;'],
  ['el coach vuelve a poder compartir el entreno de una ficha sin edad', 'a4',
    "!(parseInt(_shClient.age)>=18)",
    'parseInt(_shClient.age)<18'],
  ['el alta del coach deja de exigir la edad', 'a3',
    'if(!CUR.editClientId&&!(_ageAlta>=10&&_ageAlta<=100)){',
    'if(false){'],
  ['el formulario deja de marcar la edad como obligatoria', 'html',
    '<label class="ilbl" for="cf-age">Edad (años) *</label>',
    '<label class="ilbl" for="cf-age">Edad (años)</label>'],
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
