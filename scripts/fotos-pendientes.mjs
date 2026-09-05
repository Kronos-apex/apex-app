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

// ── USO REAL (--uso, lee producción sin escribir nada) ────────────────────────────────────
// 🔴 POR QUÉ IMPORTA (medido el 5-sep): de las 141 sin foto, **solo 20 le tocan hoy a una
// persona real** — las otras 121 no las tiene nadie en su rutina. Una foto para esas es
// trabajo que nadie ve. Sin este dato la lista trata a las 141 como si pesaran lo mismo.
if (process.argv.includes('--uso')) {
  const { homedir } = await import('node:os');
  const { join } = await import('node:path');
  const URL_SB = 'https://eoebhrxbokyllqalyecj.supabase.co';
  let KEY;
  try { KEY = readFileSync(join(homedir(), '.avi', 'service-role.key'), 'utf8').trim(); }
  catch { console.error('Falta ~/.avi/service-role.key (corre sin --uso para la lista sola)'); process.exit(1); }
  const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
  const filas = await (await fetch(`${URL_SB}/rest/v1/user_data?select=profile,routines,history`, { headers: H })).json();
  if (!Array.isArray(filas)) { console.error('Supabase no devolvió filas'); process.exit(1); }
  const porNombre = new Map(cat.map(e => [norm(e.name).trim(), e.id]));
  const plan = new Map(), hecho = new Map();
  // Se cuenta por PERSONA, no por apariciones: 40 series de una sola persona no valen lo
  // mismo que 1 serie de 12 personas distintas.
  const anota = (m, id, q) => { if (!m.has(id)) m.set(id, new Set()); m.get(id).add(q); };
  filas.forEach((f, i) => {
    const quien = ((f.profile || {}).name) || ('fila' + i);
    (f.routines || []).forEach(r => (r.exercises || []).forEach(x => {
      const id = x && (x.id || porNombre.get(norm(x.name).trim())); if (id) anota(plan, id, quien);
    }));
    (f.history || []).forEach(s => (s.exercises || []).forEach(x => {
      const id = x && (x.id || porNombre.get(norm(x.name).trim())); if (id) anota(hecho, id, quien);
    }));
  });
  // 🔴 CONTROL DE COBERTURA: si NINGÚN ejercicio del catálogo aparece en los datos, la lectura
  // falló y marcar las 141 como «no las usa nadie» sería una mentira con pinta de medición.
  const tocados = cat.filter(e => plan.has(e.id) || hecho.has(e.id)).length;
  if (!tocados) { console.error('🔴 CONTROL: ni un ejercicio del catálogo aparece en los datos reales'); process.exit(1); }
  console.error(`(control: ${tocados} de ${cat.length} ejercicios del catálogo aparecen en datos reales)`);
  sin.forEach(e => { e.plan = (plan.get(e.id) || new Set()).size; e.hecho = (hecho.get(e.id) || new Set()).size; });
}

const grupos = {};
sin.forEach(e => (grupos[estacionDe(e)] ||= []).push(e));
const orden = ESTACIONES.map(([k]) => k);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(orden.filter(k => grupos[k]).map(k => ({
    estacion: k,
    ejercicios: grupos[k].sort((a, b) => a.muscle.localeCompare(b.muscle) || a.name.localeCompare(b.name))
      .map(e => ({ id: e.id, name: e.name, muscle: e.muscle, como: e.desc, q: e.q,
                   plan: e.plan, hecho: e.hecho })),
  })), null, 1));
  process.exit(0);
}
const usa = e => (e.plan || 0) + (e.hecho || 0) > 0;
console.log(`\n${sin.length} ejercicios sin foto, de ${cat.length} del catálogo`);
if (sin.some(e => e.plan !== undefined)) {
  const v = sin.filter(usa).length;
  console.log(`🔴 ${v} le tocan HOY a alguien real · las otras ${sin.length - v} no las tiene nadie en su rutina`);
}
console.log('');
orden.forEach(k => {
  if (!grupos[k]) return;
  console.log(`\n━━ ${k.toUpperCase()} (${grupos[k].length}) ━━`);
  grupos[k].sort((a, b) => (usa(b) - usa(a)) || a.muscle.localeCompare(b.muscle) || a.name.localeCompare(b.name))
    .forEach(e => {
      const marca = e.plan === undefined ? '' : usa(e) ? `  ← ${e.plan} en plan, ${e.hecho} entrenado` : '';
      console.log(`  ${e.id.padEnd(6)}${e.name.padEnd(54)}${e.muscle}${marca}`);
    });
});
