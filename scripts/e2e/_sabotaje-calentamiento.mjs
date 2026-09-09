// Matriz de sabotaje de «EL CALENTAMIENTO NO REPITE LO QUE YA VIENE» (v594).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: esto no da error nunca. Un calentamiento que repite la sentadilla
// funciona, se pinta y se hace — solo que la persona calienta dos veces lo mismo y la sesión se
// alarga sin razón. Lo cazó el PO mirando sus propias rutinas, no ningún test, y medido eran
// **54 rutinas con dos sentadillas y 52 con dos zancadas** de 105.
//
// Corre: node scripts/e2e/_sabotaje-calentamiento.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CORE = new URL('../../avi-core.js', import.meta.url);
const EXTRA = new URL('../../app-6-extra.js', import.meta.url);

const SABOTAJES = [
  [CORE, '1· la sentadilla deja de reconocerse como patrón: vuelven las dos del calentamiento',
    "  ['sentadilla', /\\bsentadill|\\bsquat\\b/i],",
    '  // (sentadilla fuera)'],
  [CORE, '2· la regla se ensancha y marca lo que no toca (el calentamiento se quedaría corto)',
    "  ['plancha', /\\bplancha\\b/i],",
    "  ['plancha', /a/i],"],
  [CORE, '3· la sesión bloquea su patrón AUNQUE el primer ejercicio lleve carga (regla 3 del PO)',
    '  return conCarga ? [] : [p];',
    '  return [p];'],
  [CORE, '4· se mira la sesión ENTERA y no solo el primer ejercicio: vacía el calentamiento',
    '  const primero = (Array.isArray(exercises) ? exercises : [])[0];\n  if (!primero) return [];\n  const p = wuMovePattern(primero.name);',
    '  const primero = (Array.isArray(exercises) ? exercises : [])[0];\n  if (!primero) return [];\n  const p = (Array.isArray(exercises) ? exercises : []).map(x => wuMovePattern(x && x.name)).filter(Boolean)[0];'],
  [EXTRA, '5· el pool deja de filtrar por patrón: vuelve el duplicado dentro del calentamiento',
    '    return conFiltro.filter(ex=>{ const p=_pat(ex); return !p || !evitar.has(p); });',
    '    return conFiltro;'],
  [EXTRA, '6· el filtro corre DESPUÉS del corte: el calentamiento se queda corto en vez de rotar',
    '        const pool=wuPool(area,evitar);',
    '        const pool=wuPool(area).slice(0,2).filter(ex=>{ const p=_pat(ex); return !p || !evitar.has(p); });'],
  [EXTRA, '7· la activación deja de mirar lo que abre la sesión',
    '        const evitar=new Set([..._usados,..._sesPats]);',
    '        const evitar=new Set([..._usados]);'],
];

const ORIG = new Map();
for (const [ruta] of SABOTAJES) if (!ORIG.has(ruta.href)) ORIG.set(ruta.href, readFileSync(ruta, 'utf8'));

let muerden = 0;
try {
  for (const [ruta, nombre, buscar, poner] of SABOTAJES) {
    const original = ORIG.get(ruta.href);
    // Los finales de línea de este repo NO son estables (v537): el patrón se aplica con `\r?\n`.
    const re = new RegExp(buscar.split('\n').map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\r?\\n'));
    const veces = (original.match(new RegExp(re.source, 'g')) || []).length;
    if (veces !== 1) {
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto aparece ${veces} veces (esperaba 1)`);
      continue;
    }
    // Reemplazo con FUNCIÓN: un `$` en el reemplazo es un patrón especial (v583).
    writeFileSync(ruta, original.replace(re, () => poner), 'utf8');
    let rojo = false, linea = '';
    try {
      const out = execSync('node avi.test.js', { cwd: new URL('../..', import.meta.url), encoding: 'utf8', stdio: 'pipe' });
      linea = (out.match(/AVI Tests: .*/) || [''])[0];
    } catch (e) {
      rojo = true;
      linea = ((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló';
    }
    writeFileSync(ruta, original, 'utf8');
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite ni corrió'}`);
    if (rojo) muerden++;
  }
} finally {
  for (const [href, txt] of ORIG) writeFileSync(new URL(href), txt, 'utf8');
}
console.log(`\n${muerden === SABOTAJES.length ? '✅' : '🔴'} Sabotajes que muerden: ${muerden}/${SABOTAJES.length}`);
process.exit(muerden === SABOTAJES.length ? 0 : 1);
