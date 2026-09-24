// Matriz de sabotaje de v668 — peso y medidas sin color por dirección, lista del peso quieta, fechas
// enteras y volumen en toneladas. Cada fila devuelve UN defecto y la suite TIENE que ponerse roja.
// Reemplazos con FUNCIÓN, escritura ATÓMICA y el fin de línea tomado del propio archivo.
// node scripts/e2e/_sabotaje-v668.mjs   (COMMITEAR antes)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = {
  a2: join(ROOT, 'app-2-login.js'), a3: join(ROOT, 'app-3-coach.js'), a4: join(ROOT, 'app-4-entreno.js'),
  a5: join(ROOT, 'app-5-salud.js'), css: join(ROOT, 'styles.css'), html: join(ROOT, 'index.html'),
};
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['la línea del peso vuelve a teñirse por dirección', 'a4', "const lineColor='var(--chart-g)';", "const lineColor=trend<=0?'var(--chart-g)':'var(--chart-or)';"],
  ['el resumen del peso vuelve a teñirse por dirección', 'a4', "const trendColor='var(--t1)';", "const trendColor=trend<0?'var(--chart-g)':trend>0?'var(--chart-or)':'var(--t3)';"],
  ['la píldora del peso vuelve a llevar color en línea', 'a4', '<span class="wlog-delta">${delta>0', '<span class="wlog-delta" style="color:${delta<0?\'var(--gt)\':\'var(--ort)\'}">${delta>0'],
  ['la píldora pierde su estilo neutro', 'css', 'background:var(--surface);color:var(--t2);box-shadow:inset 0 0 0 1px var(--br)}', '}'],
  ['el mini-gráfico del coach vuelve a naranja al subir', 'a3', "const col='var(--chart-g)';", "const col=entries[entries.length-1].kg<=entries[0].kg?'var(--chart-g)':'var(--chart-or)';"],
  ['la tabla de medidas vuelve a colorear por signo', 'a5', "const dc=delta===null?'':'var(--t1)';", "const dc=delta===null?'':parseFloat(delta)<0?'var(--gt)':'var(--ort)';"],
  ['la gráfica de medidas vuelve al naranja', 'a5', "'cintura','var(--chart-g)');", "'cintura','var(--chart-or)');"],
  ['la lista del peso vuelve a arrastrarse de lado', 'html', 'overflow-y:auto;overflow-x:hidden;padding-right:14px;', 'overflow-y:auto;'],
  ['las fechas de medidas vuelven a apoyarse en el borde', 'a5', 'y="${H-3}" text-anchor', 'y="${H}" text-anchor'],
  ['los puntos de medidas bajan a la franja de las fechas', 'a5', 'y:6+(H-22)-((p[field]-minV)/span)*(H-22),p', 'y:6+(H-16)-((p[field]-minV)/span)*(H-16),p'],
  ['la gráfica de la rutina deja de pasar su formateador', 'a4', "drawExProgChart(ch,pts,IND,'kg',fv);", "drawExProgChart(ch,pts,IND,'kg');"],
  ['la gráfica ignora el formateador que recibe', 'a2', "const _val=(typeof fmt==='function')?fmt:(v=>fmtMetric(v,unit));", "const _val=v=>fmtMetric(v,unit);"],
  ['CONTROL-ANCHO: se quita el color también al progreso de los ejercicios', 'a2', "const trendColor=trend>0?'var(--gt)':trend<0?'var(--ort)':'var(--t3)';", "const trendColor='var(--t1)';"],
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
