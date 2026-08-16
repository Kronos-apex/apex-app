// Matriz de sabotaje de LA PROCEDENCIA DE LOS 50 DEL RECETARIO (v487).
//
// ⚠️ Lo que esta matriz NO puede proteger: el TOPE de «sin verificar» (47). Aflojar un tope deja
// la suite verde por definición, así que un sabotaje que lo suba saldría verde y no probaría nada
// (lección de v476). Contra eso solo sirve la cifra MEDIDA escrita al lado, con su fecha — está en
// `NUT_SIN_VERIFICAR_TOPE`. Aquí se prueba lo que sí es probable: que falte la fuente, que se
// afirme una fuente sin cita, y que un valor DERIVADO se disfrace de verificado.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CORE = join(ROOT, 'avi-core.js');
const rx = (s) => new RegExp(s.split('\n').map(l =>
  l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\r?\\n'));

const SABOTAJES = [
  {
    n: 'F1 · un alimento deja de declarar de dónde salió su número',
    de: `{ id: 'crema_mani', src: 'sin_verificar',`,
    a: `{ id: 'crema_mani',`,
  },
  {
    n: 'F2 · se AFIRMA una fuente externa pero sin la cita al lado',
    de: `ref: "FDC 171477 - Chicken, broilers or fryers, breast, meat only, cooked, roasted",`,
    a: ``,
  },
  {
    n: 'F3 · la YUCA pierde su fuente oficial y vuelve a un origen inventado',
    de: `{ id: 'yuca', src: 'tcac2018',`,
    a: `{ id: 'yuca', src: 'usda_sr',`,
  },
  {
    n: 'F4 · entra un alimento NUEVO sin fuente (lo caza el CONTEO, no una lista)',
    de: `  { id: 'crema_mani', src: 'sin_verificar',`,
    a: `  { id: 'inventado_x', name: 'Alimento sin fuente', rol: 'carb', kcal: 100, p: 1, c: 20, f: 1, un: { label: 'porción', g: 100 } },
  { id: 'inventado_y', name: 'Otro sin fuente', rol: 'carb', kcal: 100, p: 1, c: 20, f: 1, un: { label: 'porción', g: 100 } },
  { id: 'inventado_z', name: 'Tercero sin fuente', rol: 'carb', kcal: 100, p: 1, c: 20, f: 1, un: { label: 'porción', g: 100 } },
  { id: 'crema_mani', src: 'sin_verificar',`,
  },
  {
    n: 'F5 · la yuca vuelve al 112 deducido (el test guarda la fila oficial)',
    de: `name: 'Yuca cocida', rol: 'carb', kcal: 157, p: 0.7, c: 36.6, f: 0.2,`,
    a: `name: 'Yuca cocida', rol: 'carb', kcal: 112, p: 1.0, c: 26.7, f: 0.2,`,
  },

];

const original = readFileSync(CORE, 'utf8');
let mordieron = 0; const verdes = [];

for (const s of SABOTAJES) {
  const re = rx(s.de);
  const hits = original.match(new RegExp(re.source, 'g'));
  if (!hits || hits.length !== 1) {
    console.log(`🛑 ${s.n}\n   NO SE APLICÓ — el patrón aparece ${hits ? hits.length : 0} veces (debe ser 1).`);
    verdes.push(s.n + ' (NO SE APLICÓ)'); continue;
  }
  const roto = original.replace(re, s.a.replace(/\$/g, '$$$$'));
  if (roto === original) { console.log(`🛑 ${s.n}\n   NO SE APLICÓ.`); verdes.push(s.n + ' (NO SE APLICÓ)'); continue; }
  writeFileSync(CORE, roto);
  let rojo = false, detalle = '';
  try {
    execFileSync(process.execPath, [join(ROOT, 'avi.test.js')], { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    rojo = true;
    const out = String(e.stdout || '') + String(e.stderr || '');
    const m = out.match(/❌[^\n]*/g);
    detalle = m ? m.slice(0, 2).join(' · ') : '(la suite falló)';
  } finally { writeFileSync(CORE, original); }
  if (rojo) { mordieron++; console.log(`✅ ${s.n}\n   → ROJA: ${detalle}`); }
  else { verdes.push(s.n); console.log(`❌ ${s.n}\n   → siguió VERDE. ¿test débil, código redundante, o no se aplicó?`); }
}

console.log(`\n${'─'.repeat(60)}\nMordieron ${mordieron} de ${SABOTAJES.length}`);
if (verdes.length) { console.log('SIN EXPLICAR:'); verdes.forEach(v => console.log('  · ' + v)); process.exit(1); }
console.log('Matriz completa: todos muerden.');
