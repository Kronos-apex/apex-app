// Matriz de sabotaje de v666 — «¿Cómo te sientes hoy?» con los íconos de la marca (modelo D).
// Cada fila rompe el selector de UNA forma y la suite TIENE que ponerse roja. Reemplazos con
// FUNCIÓN y escritura ATÓMICA.   node scripts/e2e/_sabotaje-v666.mjs   (COMMITEAR antes)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), ent: join(ROOT, 'app-4-entreno.js'), css: join(ROOT, 'styles.css') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['el amarillo de «Estresado» vuelve al tono claro (el ícono blanco no se lee)', 'css', '--mood-estres:#9A6A12;', '--mood-estres:#F2C94C;'],
  ['un ánimo apunta a un ícono que no existe (saldría ✨)', 'core', "icon: 'bandage',", "icon: 'bandaid',"],
  ['el selector vuelve a los emojis del teléfono', 'ent', "<span class=\"mood-emoji${ic?' mood-ic':''}\">${ic||m.emoji}</span>", "<span class=\"mood-emoji\">${m.emoji}</span>"],
  ['sin módulo de íconos el círculo queda vacío', 'ent', '${ic||m.emoji}</span>', '${ic}</span>'],
  ['el círculo toma el color de marca del tema (no el del ánimo)', 'ent', '--ms:var(--mood-${m.id})', '--ms:var(--mc)'],
  ['el círculo deja de pintarse con el color del ánimo', 'css', '.mood-emoji.mood-ic{background:var(--ms);', '.mood-emoji.mood-ic{background:var(--mct);'],
];

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
let muerden = 0, noAplican = 0;
for (const [nombre, archivo, buscar, poner] of SABOTAJES) {
  const src = orig[archivo];
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
