// Inventario plano del catálogo por músculo. Sirve para leer los huecos de un vistazo.
// Corre: node scripts/inventario.mjs > /ruta/inventario.txt
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../app-1-infra.js', import.meta.url), 'utf8');
const marcas = [...src.matchAll(/\{id:'(e\d+)',/g)];
const cat = marcas.map((m, i) => {
  const fin = i + 1 < marcas.length ? marcas[i + 1].index : m.index + 1500;
  const b = src.slice(m.index, fin);
  const campo = k => (new RegExp(k + ":'((?:[^'\\\\]|\\\\.)*)'").exec(b) || [, ''])[1];
  const env = (/env:\[([^\]]*)\]/.exec(b) || [, "'gym'"])[1].replace(/'/g, '').split(',').map(s => s.trim()).filter(Boolean);
  return { id: m[1], name: campo('name'), muscle: campo('muscle'), type: campo('type'), env };
});
if (cat.some(e => !e.name)) { console.error('🔴 sonda incompleta'); process.exit(1); }
const g = {};
cat.forEach(e => (g[e.muscle] ||= []).push(e));
Object.keys(g).sort().forEach(m => {
  console.log(`\n### ${m.toUpperCase()} (${g[m].length})`);
  g[m].forEach(e => console.log(`${e.id.padEnd(6)}${e.name.padEnd(48)}${e.type.padEnd(12)}${e.env.join('/')}`));
});
console.log(`\nTOTAL ${cat.length}`);
