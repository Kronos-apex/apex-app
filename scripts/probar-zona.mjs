// Verifica que una regla de exclusión por zona sea IMPLEMENTABLE antes de escribirla en
// avi-core.js. El dictamen lo dicta Laura; el ingeniero comprueba que cada término atrape lo que
// dice, que no borre lo terapéutico y que el pool no se vacíe (doctrina, GOTCHAS VIGENTES).
//
// 🔴 POR QUÉ NO BASTA CON MEDIR CONTRA EL CATÁLOGO: los planes reales guardan una COPIA del
// ejercicio, y su `name` puede no ser el del catálogo. Medido el 27-ago: `e11` está en el catálogo
// como «Extensión de Tríceps con Cuerda en Polea» y en el plan del PO como «Extensión en Polea».
// Un regex afinado solo contra el catálogo lo atraparía ahí y lo dejaría pasar en el plan de la
// persona — que es justo donde tiene que morder.
//
// Corre:  node scripts/probar-zona.mjs "regex|sin|tildes"  [--ids e93,e12]
import { readFileSync } from 'node:fs';

const SCRATCH = process.env.AVI_SCRATCH
  || 'C:/Users/KRONOS/AppData/Local/Temp/claude/C--Users-KRONOS/5bca095c-c863-4811-90a9-9de1d309561c/scratchpad';

const patron = process.argv[2];
if (!patron) { console.error('Falta el regex. Ej: node scripts/probar-zona.mjs "extension de triceps|press frances"'); process.exit(2); }
const idsArg = (process.argv.find(a => a.startsWith('--ids=')) || '').slice(6);
const IDS = new Set(idsArg ? idsArg.split(',').map(s => s.trim()).filter(Boolean) : []);
const re = new RegExp(patron, 'i');

// Misma normalización que usa el motor (`exerciseContraindicated` compara sin tildes, minúsculas).
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// ── 1) El CATÁLOGO (lo que el generador puede elegir) ──
const src = readFileSync(new URL('../app-1-infra.js', import.meta.url), 'utf8');
const cat = [];
for (const m of src.matchAll(/\{id:'(e\d+)',name:'([^']*)'[^}]*?muscle:'([^']*)'[^}]*?type:'([^']*)'/g)) {
  cat.push({ id: m[1], name: m[2], muscle: m[3], type: m[4] });
}

// ── 2) Los NOMBRES REALES de los planes vivos (lo que la persona tiene escrito hoy) ──
let planes = [];
try {
  planes = readFileSync(`${SCRATCH}/nombres-en-planes.txt`, 'utf8').split('\n')
    .map(l => l.trim()).filter(Boolean)
    .map(l => { const [id, name, muscle] = l.split('|'); return { id, name, muscle }; });
} catch { console.log('⚠️  sin nombres-en-planes.txt: solo se mide el catálogo\n'); }

const cae = e => re.test(norm(e.name)) || IDS.has(e.id);

// ── Informe ──
const catCae = cat.filter(cae);
console.log(`\n━━━ CATÁLOGO (${cat.length} ejercicios) ━━━`);
console.log(`Caen: ${catCae.length}`);
catCae.forEach(e => console.log(`  ✂️  ${e.id.padEnd(5)} ${e.name}  ${IDS.has(e.id) && !re.test(norm(e.name)) ? '(por ID)' : ''}   [${e.muscle} · ${e.type}]`));

// Supervivientes por músculo: un músculo en 0 deja un HUECO en el plan, que es peor que el dolor.
console.log(`\n━━━ SUPERVIVIENTES POR MÚSCULO (0 = hueco en el plan) ━━━`);
const porMusc = {};
cat.forEach(e => { (porMusc[e.muscle] ||= { total: 0, vivos: 0 }); porMusc[e.muscle].total++; if (!cae(e)) porMusc[e.muscle].vivos++; });
Object.entries(porMusc).sort((a, b) => a[1].vivos - b[1].vivos).forEach(([m, v]) => {
  const alarma = v.vivos === 0 ? '🔴 HUECO' : v.vivos <= 2 ? '🟠 justo' : '';
  console.log(`  ${m.padEnd(12)} ${String(v.vivos).padStart(3)} de ${String(v.total).padStart(3)} sobreviven  ${alarma}`);
});

// ── El control que el catálogo NO puede dar ──
if (planes.length) {
  const planCae = planes.filter(cae);
  console.log(`\n━━━ PLANES REALES (${planes.length} nombres distintos en uso) ━━━`);
  console.log(`Caen: ${planCae.length}`);
  planCae.forEach(e => console.log(`  ✂️  ${e.id.padEnd(5)} ${e.name}`));

  // 🔴 EL CHEQUEO QUE IMPORTA: un id que cae por su nombre de CATÁLOGO pero sobrevive con el
  // nombre que tiene escrito en el plan de alguien. Ahí la regla existe y no protege a nadie.
  const idsCatCae = new Set(catCae.map(e => e.id));
  const fugas = planes.filter(p => idsCatCae.has(p.id) && !cae(p));
  console.log(`\n━━━ 🔴 FUGAS POR NOMBRE (cae en el catálogo, sobrevive en el plan) ━━━`);
  if (!fugas.length) console.log('  ninguna ✅');
  else fugas.forEach(p => console.log(`  🔴 ${p.id.padEnd(5)} plan dice «${p.name}» → NO cae`));
}
console.log('');
