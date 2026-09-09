#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// calentamiento-repetido.mjs — ¿cuántas rutinas calientan dos veces el mismo movimiento?
//
// Nace del reporte del PO (8-sep): «pones para calentar sentadillas peso corporal y en activación
// vuelves a poner sentadillas, en rutinas donde se arranca con sentadillas peso corporal».
//
// 🔒 Usa la función REAL (`buildWarmup`, extraída del archivo de la app) con las globales que
//    necesita INYECTADAS. Sin inyectarlas, sus guardas `typeof x==='function'` dan false, el
//    filtro no corre y el script mide el comportamiento VIEJO creyendo medir el nuevo — me pasó
//    en la primera corrida y salía «no cambió nada».
//
// Lee de Supabase con ~/.avi/service-role.key. NO escribe nada.
//   node scripts/calentamiento-repetido.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require(new URL('../avi-core.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const src = readFileSync(new URL('../app-6-extra.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), 'utf8');
const trozo = src.slice(src.indexOf('const WARMUP_LIBRARY = {'), src.indexOf('\nfunction ', src.indexOf('function buildWarmup(') + 10));

// CON las globales (comportamiento de hoy) y SIN ellas (el de antes de v594): el mismo código,
// dos configuraciones — así el «antes» no es una reconstrucción de memoria.
const conFiltro = new Function('wuMovePattern,wuSessionPatterns,exTrack', trozo + '\n; return buildWarmup;')(
  core.wuMovePattern, core.wuSessionPatterns, core.exTrack);
const sinFiltro = new Function(trozo + '\n; return buildWarmup;')();
// 🔴 El salto de linea de arriba NO es cosmetico: el trozo termina en un comentario `//`,
//    y sin el, el `return` queda dentro del comentario y estas dos salen undefined (solo con LF).
if (typeof conFiltro !== 'function' || typeof sinFiltro !== 'function') {
  console.error('🔴 la extraccion de buildWarmup fallo: revisa el recorte del archivo'); process.exit(1);
}

const KEY = readFileSync(join(homedir(), '.avi', 'service-role.key'), 'utf8').trim();
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const filas = await fetch('https://eoebhrxbokyllqalyecj.supabase.co/rest/v1/user_data?select=profile,role,routines', { headers: H }).then(r => r.json());

const mide = (build) => {
  const dup = {}; let rutinas = 0, triples = 0;
  for (const f of filas) {
    if (/^qa[- ]/i.test((f.profile || {}).name || '')) continue;
    for (const r of (f.routines || [])) {
      if (Array.isArray(r.warmup) && r.warmup.length) continue;   // calentamiento propio del coach
      rutinas++;
      const wu = build(r.exercises || [], null);
      const pats = [...(wu.articulares || []), ...(wu.activaciones || [])]
        .map(x => core.wuMovePattern(x.name)).filter(Boolean);
      const vistos = new Set();
      pats.forEach(p => { if (vistos.has(p)) dup[p] = (dup[p] || 0) + 1; vistos.add(p); });
      // 🔬 Lo que la regla 2 del PO quita es que la ACTIVACION repita el primer ejercicio de la
      //    sesion cuando ese va sin carga. La MOVILIDAD conserva el suyo a proposito (tempo lento,
      //    preparacion articular), asi que contarla aqui medía otra cosa — mi primera version lo
      //    hacia y decia «4 → 4» sobre un arreglo que si funciona.
      const primero = (r.exercises || [])[0];
      if (primero) {
        const p = core.wuMovePattern(primero.name);
        const sinCarga = core.exTrack(primero) !== 'peso_reps';
        const enActivacion = (wu.activaciones || []).some(x => core.wuMovePattern(x.name) === p);
        if (p && sinCarga && enActivacion) triples++;
      }
    }
  }
  return { rutinas, dup, triples };
};

const antes = mide(sinFiltro), ahora = mide(conFiltro);
console.log('rutinas vivas con calentamiento automático:', antes.rutinas, '\n');
console.log('                                    ANTES   AHORA');
const claves = [...new Set([...Object.keys(antes.dup), ...Object.keys(ahora.dup)])];
for (const k of claves) console.log(`  calienta 2× ${k.padEnd(12)} ${String(antes.dup[k] || 0).padStart(5)}   ${String(ahora.dup[k] || 0).padStart(5)}`);
console.log(`  la activación repite lo que abre la sesión  ${String(antes.triples).padStart(5)}   ${String(ahora.triples).padStart(5)}`);
