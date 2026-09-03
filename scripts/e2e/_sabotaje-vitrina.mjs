// ════════════════════════════════════════════════════════════════════════════════════════
// MATRIZ DE SABOTAJE — v570 · «quitar no puede depender de poder publicar»
//
// Samuel se registro declarando 28 anos y tiene 15. Con esa edad falsa la app le publico la
// tarjeta el 29-ago: el candado de menores de `clientProgressStory` nunca se activo porque le
// pregunto a la cifra equivocada. Lo grave aparecio al ir a corregirlo: el UNICO boton para
// QUITAR una tarjeta vive dentro de la ficha y solo se dibuja cuando la historia SI es
// publicable — o sea que corregir la edad escondia el boton de bajar la tarjeta que esa misma
// correccion volvia ilegal. Y borrando a la persona, la tarjeta se queda publica sin puerta.
//
//   node scripts/e2e/_sabotaje-vitrina.mjs
// ════════════════════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const P = (f) => join(ROOT, f);

const CASOS = [
  // ── El motor: la atadura tarjeta ↔ persona ──────────────────────────────────────────
  {
    n: 'S1 · una tarjeta sin persona se da por buena (la huerfana queda invisible)',
    file: 'avi-core.js',
    from: "    if (!cand.length) return Object.assign(base, { estado: 'huerfana' });",
    to: "    if (!cand.length) return Object.assign(base, { estado: 'ok' });",
  },
  {
    n: 'S2 · con dos personas del mismo nombre se elige la primera (decide sobre la tarjeta ajena)',
    file: 'avi-core.js',
    from: "      return Object.assign(base, { estado: 'ambigua', cuantos: cand.length });",
    to: "      return Object.assign(base, { estado: 'ok' });",
  },
  {
    n: 'S3 · quien hoy NO se publicaria se da por bueno (el caso de Samuel)',
    file: 'avi-core.js',
    from: "      estado: 'revisar', clienteId: c.id, razon: (st && st.razon) || 'desconocida',",
    to: "      estado: 'ok', clienteId: c.id,",
  },
  {
    n: 'S4 · el nombre de la tarjeta deja de derivarse igual que el de la historia',
    file: 'avi-core.js',
    from: "  return String(name || '').trim().split(/\\s+/)[0] || '';",
    to: "  return String(name || '').trim();",
  },
  {
    n: 'S5 · `showcasePendientes` deja de filtrar: el Inicio grita tambien sobre lo sano',
    file: 'avi-core.js',
    from: "  return showcaseAudit(cards, clients, historyByClient, now).filter(x => x.estado !== 'ok');",
    to: '  return showcaseAudit(cards, clients, historyByClient, now);',
  },

  // ── La ficha: la salida no puede depender de la entrada ─────────────────────────────
  {
    n: 'S6 · vuelve la TRAMPA: la rama no-publicable sale sin dibujar el boton Quitar',
    file: 'app-3-coach.js',
    from: `    _renderStoryPub({nombre:(typeof showcaseFirstName==='function')?showcaseFirstName(c.name):'',
                     ok:false, razon:(st&&st.razon)||null});
    return;`,
    to: '    return;',
  },
  {
    n: 'S7 · el contenedor del boton desaparece de la rama no-publicable',
    file: 'app-3-coach.js',
    from: `      \`<div id="d-story-pub"\${_menor?' style="margin-top:9px"':''}></div></div></div>\`;`,
    to: '      `</div></div>`;',
  },
  {
    n: 'S8 · al encontrar la tarjeta nadie revela la ficha (el boton existe y no se ve)',
    file: 'app-3-coach.js',
    from: "    const _cont=document.getElementById('d-story'); if(_cont)_cont.style.display='block';",
    to: '    ;',
  },
  {
    n: 'S9 · se calla el aviso de que la tarjeta publicada hoy no se publicaria',
    file: 'app-3-coach.js',
    from: '    const mal=st.ok===false;',
    to: '    const mal=false;',
  },

  // ── El Inicio: la puerta para las tarjetas SIN ficha ────────────────────────────────
  {
    n: 'S10 · nadie llama a la revision del Inicio (la huerfana se queda sin puerta)',
    file: 'app-2-login.js',
    from: '        _renderPagePendientes(filas);',
    to: '        ;',
  },
  {
    n: 'S11 · el aviso del Inicio pierde el boton Quitar (informa y no deja actuar)',
    file: 'app-2-login.js',
    from: `      <button class="btn bd bsm" onclick="unpublishProgress('\${esc(p.id)}')">Quitar</button></div>\`).join('')}`,
    to: '      </div>`).join("")}',
  },
  {
    n: 'S12 · el bloque se pinta siempre (un aviso permanente se vuelve invisible, v505)',
    file: 'app-2-login.js',
    from: '  if(!pend.length)return;',
    to: '  ;',
  },
];

let muerden = 0;
const verdes = [];

for (const c of CASOS) {
  const path = P(c.file);
  const orig = readFileSync(path, 'utf8');
  // Los finales de linea de este repo NO son estables (v537): el patron se normaliza.
  const re = new RegExp(c.from.split('\n').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\r?\\n'));
  const veces = (orig.match(new RegExp(re.source, 'g')) || []).length;
  if (veces !== 1) {
    console.log(`\x1b[33m  !! NO SE APLICO\x1b[0m  ${c.n}  (el texto aparece ${veces} veces, se esperaba 1)`);
    verdes.push(c.n + ' [NO SE APLICO]');
    continue;
  }
  writeFileSync(path, orig.replace(re, c.to), 'utf8');
  let rojo = false;
  try {
    execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    rojo = true;
  } finally {
    writeFileSync(path, orig, 'utf8');
  }
  if (rojo) { muerden++; console.log(`\x1b[32m  OK\x1b[0m  ${c.n}`); }
  else { verdes.push(c.n); console.log(`\x1b[31m  VERDE\x1b[0m  ${c.n}  <- el candado NO muerde`); }
}

console.log('\n' + '-'.repeat(70));
console.log(`${muerden}/${CASOS.length} sabotajes muerden`);
if (verdes.length) {
  console.log('\nSalieron VERDES (revisar):');
  verdes.forEach((v) => console.log('  - ' + v));
  process.exit(1);
}
console.log('MATRIZ OK');
