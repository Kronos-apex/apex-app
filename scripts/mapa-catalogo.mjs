// Radiografía del catálogo por MÚSCULO × EQUIPO. Un catálogo no se juzga por el total sino por
// dónde están los huecos: el PO pide «bíceps en polea con cuerda, bíceps en polea con barra corta»,
// o sea el eje de VARIANTE (mismo patrón, distinto implemento), que es el que no se ve en un conteo.
// Corre: node scripts/mapa-catalogo.mjs [--detalle musculo]
import { readFileSync } from 'node:fs';

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const src = readFileSync(new URL('../app-1-infra.js', import.meta.url), 'utf8');

// 🔴 EL ORDEN DE LOS CAMPOS NO ES ESTABLE: 4 entradas (e89, e93, e94, e96) llevan `env` ANTES de
// `muscle`, y una sonda con el orden quemado las perdía en silencio — 243 de 247. Se corta por el
// límite de la entidad y cada campo se busca por separado. El CONTROL DE COBERTURA va abajo: un
// conteo que no cuadra invalida todo lo que se concluya de esta tabla.
const cat = [];
const marcas = [...src.matchAll(/\{id:'(e\d+)',/g)];
marcas.forEach((m, i) => {
  const fin = i + 1 < marcas.length ? marcas[i + 1].index : m.index + 1500;
  const b = src.slice(m.index, fin);
  const campo = (k) => (new RegExp(k + ":'((?:[^'\\\\]|\\\\.)*)'").exec(b) || [, ''])[1];
  const env = (/env:\[([^\]]*)\]/.exec(b) || [, "'gym'"])[1].replace(/'/g, '').split(',').map(s => s.trim()).filter(Boolean);
  cat.push({ id: m[1], name: campo('name'), muscle: campo('muscle'), type: campo('type'), env, desc: campo('desc') });
});
const enArchivo = marcas.length;

// El EQUIPO se infiere del nombre y, si no basta, de la descripción. El orden importa: `smith` y
// `barra z` antes que `barra`, `polea` antes que `maquina` (una polea es una máquina pero el
// implemento manda), y `peso corporal` al final como resto.
const EQUIPOS = [
  ['polea', /polea|cable|gironda|jalon|pull ?over en polea|face pull|crossover/],
  ['maquina', /maquina|hammer|pec deck|contractora|prensa|escaladora|eliptica|ergometro|bicicleta|spinning|asistida|pendular|t-?bar|remo en t/],
  ['smith', /smith/],
  ['barra', /barra|z \(|skull|frances con barra|militar con barra|clean|push press|peso muerto(?! con mancuernas| rumano con mancuernas)|hip thrust con barra|arrastre|landmine/],
  ['mancuerna', /mancuerna|goblet|arnold|goblet|martillo|concentrado|pajaro|goblet/],
  ['pesa rusa', /pesa rusa|kettlebell|turco|balanceo/],
  ['banda', /banda|elastic|miniband/],
  ['balon', /balon|medicinal|lanzamiento|slam|pelota|fitball|suizo/],
  ['trx/anillas', /trx|anillas|suspension/],
  ['disco/otro', /disco|placa|trineo|sled|cuerdas de batalla|azote|saco|bulgara con|chaleco/],
  ['peso corporal', /.*/],
];
const equipoDe = e => {
  const n = norm(e.name), d = norm(e.desc);
  for (const [k, re] of EQUIPOS) { if (re.test(n)) return k; }
  for (const [k, re] of EQUIPOS) { if (k !== 'peso corporal' && re.test(d)) return k + '?'; }
  return 'peso corporal';
};

cat.forEach(e => { e.equipo = equipoDe(e); });

// 🔒 CONTROL DE COBERTURA: si la sonda no resolvió a todos, la tabla de abajo es humo.
const sinNombre = cat.filter(e => !e.name || !e.muscle);
if (cat.length !== enArchivo || sinNombre.length) {
  console.error(`🔴 la sonda resolvió ${cat.length - sinNombre.length} de ${enArchivo} — no se puede concluir nada`);
  process.exit(1);
}

const MUS = [...new Set(cat.map(e => e.muscle))];
const EQ = [...new Set(cat.map(e => e.equipo.replace('?', '')))].sort();

const detalle = (process.argv.find(a => a.startsWith('--detalle=')) || '').slice(10);
if (detalle) {
  console.log(`\n━━━ ${detalle.toUpperCase()} — ${cat.filter(e => e.muscle === detalle).length} ejercicios ━━━`);
  const g = {};
  cat.filter(e => e.muscle === detalle).forEach(e => (g[e.equipo.replace('?', '')] ||= []).push(e));
  Object.keys(g).sort().forEach(k => {
    console.log(`\n  ${k.toUpperCase()} (${g[k].length})`);
    g[k].forEach(e => console.log(`    ${e.id.padEnd(6)}${e.name.padEnd(46)} ${e.type.padEnd(13)} ${e.env.join('/')}`));
  });
  process.exit(0);
}

console.log(`\n━━━━━━ CATÁLOGO: ${cat.length} ejercicios · MÚSCULO × EQUIPO ━━━━━━\n`);
const anchoM = Math.max(...MUS.map(m => m.length)) + 1;
console.log(' '.repeat(anchoM) + EQ.map(q => q.slice(0, 7).padStart(8)).join('') + '   TOTAL');
const orden = MUS.map(m => [m, cat.filter(e => e.muscle === m).length]).sort((a, b) => b[1] - a[1]);
for (const [m, tot] of orden) {
  const fila = EQ.map(q => {
    const n = cat.filter(e => e.muscle === m && e.equipo.replace('?', '') === q).length;
    return (n === 0 ? '·' : String(n)).padStart(8);
  }).join('');
  console.log(m.padEnd(anchoM) + fila + String(tot).padStart(8));
}
console.log('\n' + ' '.repeat(anchoM) + EQ.map(q => String(cat.filter(e => e.equipo.replace('?', '') === q).length).padStart(8)).join('') + String(cat.length).padStart(8));

// El hueco que el PO nombra: mismo músculo, mismo equipo, UNA sola opción → no hay variante.
console.log(`\n━━━━━━ CELDAS CON 1 SOLA OPCIÓN (no hay variante que ofrecer) ━━━━━━`);
const flacas = [];
for (const m of MUS) for (const q of EQ) {
  const n = cat.filter(e => e.muscle === m && e.equipo.replace('?', '') === q);
  if (n.length === 1) flacas.push(`${m}/${q}: ${n[0].name}`);
}
console.log('  ' + (flacas.length ? flacas.join('\n  ') : 'ninguna'));

console.log(`\n━━━━━━ POR ENTORNO ━━━━━━`);
['gym', 'casa', 'parque', 'corporal'].forEach(en => {
  console.log(`  ${en.padEnd(9)} ${cat.filter(e => e.env.includes(en)).length}`);
});
