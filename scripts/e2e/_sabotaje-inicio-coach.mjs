// Matriz de sabotaje del INICIO DEL COACH SIN LO QUE LO SATURABA (v592).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: lo que esta versión hace es RETIRAR y REORDENAR, y eso se
// deshace sin querer con una línea — nadie ve un error, simplemente vuelve a taparse lo que el
// coach quiere ver. El reporte del PO fue literal: *«me ocultaste a los asesorados que han
// entrenado en el día»*, con 7 personas entrenando ese día y ninguna visible.
//
// Corre: node scripts/e2e/_sabotaje-inicio-coach.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CORE = new URL('../../avi-core.js', import.meta.url);
const LOGIN = new URL('../../app-2-login.js', import.meta.url);
const HTML = new URL('../../index.html', import.meta.url);

const SABOTAJES = [
  [CORE, '1· «entrenaron hoy» vuelve a ser el CUARTO aviso: con el tope de 2, no sale nunca',
    "const COACH_NOTICE_PRIORITY = [\n  'h-today-banner',\n  'h-expiry-banner',",
    "const COACH_NOTICE_PRIORITY = [\n  'h-expiry-banner',\n  'h-deload',\n  'h-today-banner',"],
  [CORE, '2· el banner de empujar vuelve a la lista y le roba el puesto',
    "  'h-today-banner',\n  'h-expiry-banner',",
    "  'h-today-banner',\n  'h-adherence-banner',\n  'h-expiry-banner',"],
  [HTML, '3· «entrenaron hoy» vuelve abajo, a dos pantallas de scroll',
    '      <div id="h-today-banner" style="display:none;margin-bottom:13px"></div>\n      <!-- Retención semanal -->',
    '      <!-- Retención semanal -->'],
  [HTML, '4· vuelve al marcado la tarjeta de versiones que el PO mandó sacar',
    '      <!-- Tu página pública (v542)',
    '      <div id="h-builds" style="display:none;margin-bottom:13px"></div>\n      <!-- Tu página pública (v542)'],
  [LOGIN, '5· la tarjeta de versiones se vuelve a pintar en el Inicio',
    "  if(typeof renderPageCard==='function')renderPageCard();",
    "  if(typeof renderBuildsCard==='function')renderBuildsCard();\n  if(typeof renderPageCard==='function')renderPageCard();"],
  [LOGIN, '6· el reporte ofrece «Empujar» también a quien NO se puede alcanzar (candado de v580)',
    "        html+=sinVia.map(x=>_fila(x,false)).join('');",
    "        html+=sinVia.map(x=>_fila(x,true)).join('');"],
  [LOGIN, '7· el botón de empujar desaparece también del reporte: la capacidad se pierde al mudarla',
    "        html+=conVia.map(x=>_fila(x,true)).join('');",
    "        html+=conVia.map(x=>_fila(x,false)).join('');"],
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
