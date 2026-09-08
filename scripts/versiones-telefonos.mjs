#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// versiones-telefonos.mjs — ¿qué versión de AVI trae el teléfono de cada asesorado?
//
// Nace de RETIRAR la tarjeta que hacía esto en el Inicio del coach (v541 → fuera en v592). El
// PO tenía razón al sacarla: *«es gigante y no sé cuál es su función real»*. Y no la sabía
// porque **no era suya**: se construyó para responder una pregunta del que arregla («¿el arreglo
// ya le llegó al teléfono de esa persona?»), no una del que entrena.
//
// La capacidad no se pierde, cambia de sitio:
//   · para UNA persona → su ficha en el panel lo sigue diciendo (`deviceInfo`, app-3);
//   · para el conjunto → esto, que lee la nube y no ocupa ninguna pantalla suya.
//
// El sello lo escribe la propia app al arrancar (`deviceStamp`, v541): sin `?v=` no se inventa
// un número, así que «sin datos» es un estado propio y no se rellena con un «al día» optimista.
//
// Lee de Supabase con ~/.avi/service-role.key. NO escribe nada.
//   node scripts/versiones-telefonos.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require(new URL('../avi-core.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

const KEY = readFileSync(join(homedir(), '.avi', 'service-role.key'), 'utf8').trim();
const URL_SB = 'https://eoebhrxbokyllqalyecj.supabase.co';
const r = await fetch(`${URL_SB}/rest/v1/user_data?select=profile,role`,
  { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
if (!r.ok) { console.error('Supabase respondió', r.status); process.exit(1); }
const filas = await r.json();

// La versión que sirve producción AHORA (la misma que lee `_prodcheck`).
const sw = await (await fetch('https://kronos-apex.github.io/apex-app/sw.js')).text();
const build = parseInt((sw.match(/avi-v(\d+)/) || [])[1], 10);

const clientes = filas
  .filter(f => !/qa[- ]?(harness|coach)/i.test((f.profile || {}).name || ''))   // las cuentas de prueba no son teléfonos de nadie
  .map(f => Object.assign({ id: (f.profile || {}).name, name: (f.profile || {}).name, isSelf: f.role === 'coach' }, f.profile || {}));

const rep = core.coachBuildReport(clientes, build);
const dias = t => t == null ? '' : (t <= 0 ? 'hoy' : t === 1 ? 'ayer' : 'hace ' + t + ' días');

console.log(`producción sirve la versión ${build}\n`);
console.log(`🔴 atrasados (${rep.atrasados.length}):`);
rep.atrasados.forEach(x => console.log(`   ${String(x.name).padEnd(24)} v${String(x.version).padEnd(5)} ${dias(x.dias)}`));
console.log(`\n✅ al día (${rep.alDia.length}) · ❔ sin datos todavía (${rep.sinDato.length})`);
if (rep.sinDato.length) console.log('   ' + rep.sinDato.map(x => x.name).join(', '));
console.log('\n(Un teléfono se pone al día solo al cerrar y volver a abrir la app.)');
