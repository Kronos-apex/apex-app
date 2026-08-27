// ¿Cuántos ejercicios caen bajo una regla de zona MIRANDO EL CATÁLOGO y sobreviven MIRANDO EL
// PLAN REAL de alguien? El filtro compara contra `ex.name`, y los planes guardan una COPIA del
// ejercicio cuyo nombre puede no ser el del catálogo (el coach lo renombra al armar la rutina).
// Corre: node scripts/fugas-zonas.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const core = require('../avi-core.js');

const SCRATCH = process.env.AVI_SCRATCH
  || 'C:/Users/KRONOS/AppData/Local/Temp/claude/C--Users-KRONOS/5bca095c-c863-4811-90a9-9de1d309561c/scratchpad';

// El catálogo: id → nombre canónico.
const src = readFileSync(new URL('../app-1-infra.js', import.meta.url), 'utf8');
const canon = new Map();
for (const m of src.matchAll(/\{id:'(e\d+)',name:'([^']*)'/g)) canon.set(m[1], m[2]);

const planes = readFileSync(`${SCRATCH}/nombres-en-planes.txt`, 'utf8').split('\n')
  .map(l => l.trim()).filter(Boolean)
  .map(l => { const [id, name] = l.split('|'); return { id, name }; });

const ZONAS = ['rodilla', 'lumbar', 'hombro', 'aductor', 'abductor', 'cuello', 'tobillo'];
let totalFugas = 0;
for (const z of ZONAS) {
  const fugas = planes.filter(p => {
    const nom = canon.get(p.id);
    if (!nom || nom === p.name) return false;                      // mismo nombre: nada que comparar
    const caeCanon = core.exerciseContraindicated({ id: p.id, name: nom }, [z]);
    const caePlan  = core.exerciseContraindicated({ id: p.id, name: p.name }, [z]);
    return caeCanon && !caePlan;                                   // la regla existe y no muerde
  });
  if (!fugas.length) continue;
  console.log(`\n🔴 ${z.toUpperCase()} — ${fugas.length} fuga(s)`);
  fugas.forEach(f => console.log(`   ${f.id.padEnd(5)} catálogo «${canon.get(f.id)}»\n         plan     «${f.name}»  → NO cae`));
  totalFugas += fugas.length;
}
console.log(`\n${totalFugas ? '🔴' : '✅'} Fugas por nombre en las 7 zonas vivas: ${totalFugas}`);
console.log(`   (${planes.filter(p => canon.get(p.id) && canon.get(p.id) !== p.name).length} de ${planes.length} nombres de plan difieren del catálogo)`);
