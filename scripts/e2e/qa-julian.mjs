// Julián QA — suite estática completa (deploy fotos _f + e126, avi-v146)
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';

const APP = 'apex-app';
const html = readFileSync(join(APP, 'index.html'), 'utf8');
const results = [];
const ok = (n, d) => results.push(['🟢', n, d]);
const warn = (n, d) => results.push(['🟡', n, d]);
const fail = (n, d) => results.push(['🔴', n, d]);

// 1. Sintaxis JS — inline scripts + archivos .js
try {
  const scripts = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  scripts.forEach((s, i) => {
    const f = join(tmpdir(), `avi_inline_${i}.js`);
    writeFileSync(f, s);
    execSync(`node --check "${f}"`, { stdio: 'pipe' });
  });
  for (const f of ['avi-core.js', 'sw.js']) execSync(`node --check "${join(APP, f)}"`, { stdio: 'pipe' });
  ok('Sintaxis JS', `${scripts.length} bloques inline + avi-core.js + sw.js`);
} catch (e) { fail('Sintaxis JS', String(e.stderr || e.message).slice(0, 300)); }

// 2. Funciones duplicadas
{
  const names = [...html.matchAll(/^\s*function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(m => m[1]);
  const seen = {}, dups = new Set();
  names.forEach(n => { seen[n] = (seen[n] || 0) + 1; if (seen[n] > 1) dups.add(n); });
  dups.size ? fail('Funciones duplicadas', [...dups].join(', ')) : ok('Funciones duplicadas', `ninguna (${names.length} funciones)`);
}

// 3. getElementById sin match
{
  const used = new Set([...html.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]));
  const defined = new Set([...html.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]));
  const dynamic = new Set([...html.matchAll(/id=\\?["']?\$\{?/g)]); // ids creados dinámicamente — heurística
  const missing = [...used].filter(id => !defined.has(id) && !html.includes(`id='${id}'`) && !html.includes(`id="${id}"`) && !new RegExp(`id=[\\\\"'\`]*${id}`).test(html));
  missing.length ? warn('IDs JS↔HTML', 'sin match estático (posibles dinámicos): ' + missing.slice(0, 8).join(', ')) : ok('IDs JS↔HTML', `${used.size} ids verificados`);
}

// 4. onclick sin función
{
  const calls = [...html.matchAll(/onclick=["']([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]);
  const undef = [...new Set(calls)].filter(fn => !new RegExp(`function\\s+${fn}\\s*\\(|(?:const|let|var)\\s+${fn}\\s*=|window\\.${fn}\\s*=`).test(html) && !new RegExp(`function\\s+${fn}\\s*\\(`).test(readFileSync(join(APP, 'avi-core.js'), 'utf8')));
  undef.length ? fail('onclick sin función', undef.join(', ')) : ok('onclick sin función', `${new Set(calls).size} handlers OK`);
}

// 5. SB_KEYS en syncFromCloud
{
  const sbm = html.match(/SB_KEYS\s*=\s*\[([^\]]*)\]/);
  if (!sbm) warn('SB_KEYS', 'no encontrado en index.html (¿en avi-core?)');
  else {
    const keys = [...sbm[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
    const syncBody = html.match(/function syncFromCloud[\s\S]*?\n\}/);
    const missing = syncBody ? keys.filter(k => !syncBody[0].includes(k) && !/SB_KEYS|forEach|for\s*\(/.test(syncBody[0])) : keys;
    const iterates = syncBody && /SB_KEYS/.test(syncBody[0]);
    iterates || missing.length === 0 ? ok('SB_KEYS↔syncFromCloud', iterates ? 'itera SB_KEYS' : 'claves cubiertas') : fail('SB_KEYS↔syncFromCloud', 'sin cobertura: ' + missing.join(', '));
  }
}

// 6. IDs de ejercicio duplicados
{
  const ids = [...html.matchAll(/\{id:'(e\d+)',name:/g)].map(m => m[1]);
  const seen = {}, dups = new Set();
  ids.forEach(i => { seen[i] = (seen[i] || 0) + 1; if (seen[i] > 1) dups.add(i); });
  dups.size ? fail('Ejercicios duplicados', [...dups].join(', ')) : ok('Ejercicios duplicados', `ninguno (${ids.length} definiciones)`);
}

// 7. Específicos del deploy
{
  const setM = html.match(/const EX_IMG_F=new Set\(\[([^\]]*)\]\);/);
  if (!setM) fail('EX_IMG_F', 'set no encontrado/ilegible');
  else {
    const ids = [...setM[1].matchAll(/e\d+/g)].map(m => m[0]);
    const noFile = ids.filter(id => { try { statSync(join(APP, 'media/exercises', id + '_f.jpg')); return false; } catch { return true; } });
    noFile.length ? fail('EX_IMG_F archivos', 'faltan: ' + noFile.join(', ')) : ok('EX_IMG_F archivos', `${ids.length} ids, todos con _f.jpg`);
  }
  const e126ok = /'e126'/.test(html);
  let e126file = true; try { statSync(join(APP, 'media/exercises/e126.jpg')); } catch { e126file = false; }
  e126ok && e126file ? ok('e126', 'en EX_IMG_IDS + e126.jpg existe') : fail('e126', `en código:${e126ok} archivo:${e126file}`);
  const sw = readFileSync(join(APP, 'sw.js'), 'utf8');
  const vers = [...new Set([...sw.matchAll(/avi-v(\d+)/g)].map(m => m[1]))];
  vers.length === 1 && vers[0] === '146' ? ok('sw.js versión', 'avi-v146 única') : fail('sw.js versión', 'versiones: ' + vers.join(','));
  const sizes = readdirSync(join(APP, 'media/exercises')).filter(f => f.endsWith('.jpg')).map(f => [f, statSync(join(APP, 'media/exercises', f)).size]);
  const bad = sizes.filter(([f, s]) => s === 0 || s > 500 * 1024);
  bad.length ? warn('Tamaños de imagen', bad.map(([f, s]) => `${f}:${Math.round(s / 1024)}KB`).slice(0, 5).join(', ')) : ok('Tamaños de imagen', `${sizes.length} jpg entre 1B y 500KB`);
}

for (const [s, n, d] of results) console.log(`${s} ${n}: ${d}`);
const reds = results.filter(r => r[0] === '🔴');
const yellows = results.filter(r => r[0] === '🟡');
console.log(reds.length ? `\n🔴 BLOQUEADO: ${reds.map(r => r[1]).join(', ')}` : yellows.length ? `\n🟡 AVISOS: ${yellows.map(r => r[1]).join(', ')}` : '\n🟢 PRODUCCIÓN OK');
