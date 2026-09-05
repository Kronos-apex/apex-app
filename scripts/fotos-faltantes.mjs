#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// fotos-faltantes.mjs — la lista de trabajo de las fotos que faltan (v573).
//
// POR QUÉ EXISTE: `audit-catalog.mjs` dice CUÁLES faltan (141) pero las trata a
// todas igual. Una foto para un ejercicio que nadie hace es trabajo perdido, y
// una para el que 12 personas tienen en su plan se ve todos los días. Esto las
// ordena por USO REAL y las separa por dónde hay que ir a buscar la referencia.
//
// 🔴 EL PIPELINE QUE YA FUNCIONA (lección de v498-v500): cada foto buena partió
// de una FOTO DE REFERENCIA REAL. Cuando se generaron sin referencia, 9 de 22
// mostraban OTRO ejercicio y las cazó el PO abriendo la app, no la auditoría.
// Por eso la salida separa lo que necesita foto EN SU GIMNASIO de lo que no.
//
// 🔒 SOLO LECTURA. Sin --uso no toca la red y no necesita llave ninguna.
//
//   node scripts/fotos-faltantes.mjs              (catálogo + media, local)
//   node scripts/fotos-faltantes.mjs --uso        (+ uso real, lee producción)
//   node scripts/fotos-faltantes.mjs --json       (para alimentar otra cosa)
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CON_USO = process.argv.includes('--uso');
const JSON_OUT = process.argv.includes('--json');
const EX_DIR = 'media/exercises';

const FUENTES = ['index.html', 'app-1-infra.js', 'app-2-login.js', 'app-3-coach.js',
                 'app-4-entreno.js', 'app-5-salud.js', 'app-6-extra.js', 'avi-core.js'];
const src = FUENTES.filter(f => fs.existsSync(f)).map(f => fs.readFileSync(f, 'utf8')).join('\n');

// ── El catálogo, con los campos que sirven para BUSCAR la referencia ──────────
// Se lee la línea entera de cada ejercicio: el `ytQuery` que ya trae cada uno es
// una frase de búsqueda escrita a mano y es el mejor punto de partida que hay.
const campo = (linea, k) => {
  const m = linea.match(new RegExp(k + ":'((?:[^'\\\\]|\\\\.)*)'"));
  return m ? m[1].replace(/\\'/g, "'") : '';
};
const cat = [];
for (const linea of src.split('\n')) {
  const m = linea.match(/\{id:'(e\d+)',name:'((?:[^'\\]|\\.)*)'/);
  if (!m) continue;
  const env = (linea.match(/env:\[([^\]]*)\]/) || [, ''])[1].replace(/'/g, '').split(',').filter(Boolean);
  cat.push({
    id: m[1], name: m[2].replace(/\\'/g, "'"),
    muscle: campo(linea, 'muscle'), type: campo(linea, 'type'),
    level: campo(linea, 'level'), ytQuery: campo(linea, 'ytQuery'),
    muscleLabel: campo(linea, 'muscleLabel'), env,
  });
}
// CONTROL: si el catálogo se muda de archivo, esto grita en vez de decir «no falta ninguna».
if (cat.length < 100) { console.error(`Solo leí ${cat.length} ejercicios — el catálogo se movió`); process.exit(1); }

const faltan = cat.filter(e => !fs.existsSync(`${EX_DIR}/${e.id}.jpg`));
// CONTROL inverso: si NADA falta, o si faltan TODAS, algo se leyó mal.
if (!faltan.length) { console.log(`Ninguna falta: las ${cat.length} tienen foto.`); process.exit(0); }
if (faltan.length === cat.length) { console.error('Faltan TODAS: no estoy viendo media/exercises'); process.exit(1); }

// ── ¿Dónde hay que ir a buscar la referencia? ─────────────────────────────────
// 🔴 La partición que importa NO es el músculo: es si el PO tiene que ir a su
// gimnasio con el celular. Un ejercicio que solo se hace en `gym` necesita ESA
// máquina; uno que se hace en casa o con el peso del cuerpo, no.
const soloGym = e => e.env.length > 0 && e.env.every(x => x === 'gym');
faltan.forEach(e => { e.donde = soloGym(e) ? 'SU GIMNASIO' : 'en cualquier parte'; });

// ── Uso real (opcional, lee producción sin escribir nada) ─────────────────────
if (CON_USO) {
  const URL_SB = 'https://eoebhrxbokyllqalyecj.supabase.co';
  let KEY;
  try { KEY = readFileSync(join(homedir(), '.avi', 'service-role.key'), 'utf8').trim(); }
  catch { console.error('Falta ~/.avi/service-role.key (corre sin --uso para la lista sola)'); process.exit(1); }
  const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
  const filas = await (await fetch(`${URL_SB}/rest/v1/user_data?select=profile,routines,history`, { headers: H })).json();
  if (!Array.isArray(filas)) { console.error('Supabase no devolvió filas'); process.exit(1); }

  const nf = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const porNombre = new Map(cat.map(e => [nf(e.name), e.id]));
  const enPlan = new Map(), entrenado = new Map();
  const anota = (mapa, id, quien) => { if (!mapa.has(id)) mapa.set(id, new Set()); mapa.get(id).add(quien); };
  // 🔴 Se cuenta por PERSONA, no por apariciones: 40 series del mismo ejercicio de una
  // sola persona no valen lo mismo que 1 serie de 12 personas distintas.
  filas.forEach((f, i) => {
    const quien = ((f.profile || {}).name) || ('fila' + i);
    (f.routines || []).forEach(r => (r.exercises || []).forEach(x => {
      const id = x && (x.id || porNombre.get(nf(x.name)));
      if (id) anota(enPlan, id, quien);
    }));
    (f.history || []).forEach(s => (s.exercises || []).forEach(x => {
      const id = x && (x.id || porNombre.get(nf(x.name)));
      if (id) anota(entrenado, id, quien);
    }));
  });
  faltan.forEach(e => {
    e.enPlanDe = (enPlan.get(e.id) || new Set()).size;
    e.entrenadoPor = (entrenado.get(e.id) || new Set()).size;
  });
  // CONTROL DE COBERTURA: si NINGÚN ejercicio del catálogo aparece en ningún plan, la
  // lectura falló y ordenar por un cero universal sería peor que no ordenar.
  const tocados = cat.filter(e => enPlan.has(e.id) || entrenado.has(e.id)).length;
  if (!tocados) { console.error('CONTROL: ni un solo ejercicio del catálogo aparece en los datos — no mido nada'); process.exit(1); }
  console.error(`(control: ${tocados} de ${cat.length} ejercicios del catálogo aparecen en datos reales)`);
}

const peso = e => (e.entrenadoPor || 0) * 10 + (e.enPlanDe || 0);
faltan.sort((a, b) => peso(b) - peso(a) || a.id.localeCompare(b.id, 'es', { numeric: true }));

if (JSON_OUT) { console.log(JSON.stringify(faltan, null, 1)); process.exit(0); }

console.log(`\n════ FOTOS QUE FALTAN: ${faltan.length} de ${cat.length} ejercicios ════\n`);
if (CON_USO) {
  const vivos = faltan.filter(e => peso(e) > 0);
  console.log(`🔴 ${vivos.length} de las ${faltan.length} le tocan a alguien REAL hoy. Las otras ${faltan.length - vivos.length} no las tiene nadie.\n`);
}
const gym = faltan.filter(e => e.donde === 'SU GIMNASIO');
console.log(`📍 ${gym.length} necesitan foto EN SU GIMNASIO (solo se hacen ahí) · ${faltan.length - gym.length} se pueden resolver en cualquier parte\n`);

let grupo = null;
for (const e of faltan) {
  const g = e.muscle || '(sin músculo)';
  if (g !== grupo) { grupo = g; console.log(`\n── ${g.toUpperCase()} ──`); }
  const uso = CON_USO
    ? ` [plan:${e.enPlanDe || 0} entrenado:${e.entrenadoPor || 0}]`
    : '';
  console.log(`  ${e.id.padEnd(6)} ${e.name}${uso}`);
  console.log(`         ${e.donde} · ${e.env.join('/') || 'sin entorno'} · buscar: "${e.ytQuery || e.name}"`);
}
console.log('');
