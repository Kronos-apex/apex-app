// Lista de ejercicios SIN FOTO, agrupada por ESTACIÓN DEL GIMNASIO (no por músculo): el PO las va
// a tomar caminando por su gym, y una parada en las poleas resuelve treinta y pico de una.
// Corre: node scripts/fotos-pendientes.mjs [--json]
import { readFileSync, readdirSync } from 'node:fs';

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const src = readFileSync(new URL('../app-1-infra.js', import.meta.url), 'utf8');
const marcas = [...src.matchAll(/\{id:'(e\d+)',/g)];
const cat = marcas.map((m, i) => {
  const b = src.slice(m.index, marcas[i + 1] ? marcas[i + 1].index : src.length);
  const campo = k => (new RegExp(k + ":'((?:[^'\\\\]|\\\\.)*)'").exec(b) || [, ''])[1];
  return { id: m[1], name: campo('name'), muscle: campo('muscle'), desc: campo('descSimple'), q: campo('ytQuery') };
});
if (cat.some(e => !e.name)) { console.error('🔴 sonda incompleta'); process.exit(1); }

const conFoto = new Set(readdirSync(new URL('../media/exercises', import.meta.url))
  .filter(f => f.endsWith('.jpg')).map(f => f.replace('.jpg', '')));
const sin = cat.filter(e => !conFoto.has(e.id));

// El nombre casi siempre basta, pero no siempre: un «Jalón al Pecho» se hace en la POLEA aunque no
// diga polea, y un «Crunch Bicicleta» no se hace en ninguna bicicleta. Estos van a mano, y son
// pocos a propósito — la lista existe para que él no dé vueltas de más en el gimnasio.
const A_MANO = {
  e297: 'Poleas', e299: 'Poleas',                                  // los jalones se hacen en polea
  e369: 'Peso corporal',                                           // «Crunch Bicicleta» no es cardio
  e264: 'Mancuernas', e322: 'Mancuernas', e354: 'Mancuernas',
  e295: 'Barra y banco', e323: 'Barra y banco',                    // press de banca y landmine
  e331: 'Máquinas', e332: 'Máquinas', e357: 'Máquinas',
};
const ESTACIONES = [
  ['Poleas', /polea|cable|crossover/],
  ['Multipower', /multipower|smith/],
  ['Máquinas', /maquina|prensa|contractora|pec deck|asistida|silla romana|hammer|pendular|t-?bar/],
  ['Barra y banco', /barra|rack|skull|frances|clean|peso muerto|hexagonal|zercher|jm/],
  ['Mancuernas', /mancuerna|goblet|arnold|martillo|tate|renegado|cubano/],
  ['Cardio', /ski|asalto|escalador|cinta|trineo|comba|sprint|eliptica|ergometro/],
  ['Banda, disco y otros', /banda|disco|chaleco|balon|pesa rusa|anillas|trx/],
  ['Peso corporal', /.*/],
];
const estacionDe = e => A_MANO[e.id] || (ESTACIONES.find(([, re]) => re.test(norm(e.name))) || [])[0];

const grupos = {};
sin.forEach(e => (grupos[estacionDe(e)] ||= []).push(e));
const orden = ESTACIONES.map(([k]) => k);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(orden.filter(k => grupos[k]).map(k => ({
    estacion: k,
    ejercicios: grupos[k].sort((a, b) => a.muscle.localeCompare(b.muscle) || a.name.localeCompare(b.name))
      .map(e => ({ id: e.id, name: e.name, muscle: e.muscle, como: e.desc, q: e.q })),
  })), null, 1));
  process.exit(0);
}
console.log(`\n${sin.length} ejercicios sin foto, de ${cat.length} del catálogo\n`);
orden.forEach(k => {
  if (!grupos[k]) return;
  console.log(`\n━━ ${k.toUpperCase()} (${grupos[k].length}) ━━`);
  grupos[k].sort((a, b) => a.muscle.localeCompare(b.muscle) || a.name.localeCompare(b.name))
    .forEach(e => console.log(`  ${e.id.padEnd(6)}${e.name.padEnd(54)}${e.muscle}`));
});
