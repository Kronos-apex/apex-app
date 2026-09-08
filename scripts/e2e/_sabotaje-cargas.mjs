// Matriz de sabotaje del PANEL «CARGAS» (v585).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: este panel llevaba desde siempre pintando el peso de la ÚLTIMA
// sesión como si fuera el récord, sin rótulo, y nadie lo cazó porque no hay nada que falle —
// cada número que muestra viene de una sesión real. Lo que estaba mal era la ELECCIÓN de qué
// dato es el titular. Un defecto así solo lo protege un candado que muerda de verdad.
//
// Sabotea DOS archivos, a propósito: la función pura (avi-core) y el CABLEADO (app-2-login).
// `progressRowModel` puede estar impecable y el panel seguir pintando `m.last` sin rótulo —
// «puerta cerrada, ventana abierta» (v509), y por eso los candados van separados.
//
// Corre: node scripts/e2e/_sabotaje-cargas.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// ⚠️ Los patrones se anclan en UNA sola línea (los finales de línea del repo no son estables,
// v537) y en el TROZO que cambia, nunca en una línea entera que un lote pueda alargar (v549/v550).
const CORE = new URL('../../avi-core.js', import.meta.url);
const APP2 = new URL('../../app-2-login.js', import.meta.url);

const SABOTAJES = [
  // ── la función pura ──
  [CORE, '1· el titular vuelve a ser la ÚLTIMA sesión (el defecto original: Astrid, 4,5 kg)',
    '  const record = Math.max.apply(null, vals);',
    '  const record = vals[vals.length - 1];'],
  [CORE, '2· la tendencia vuelve a medirse contra la última sesión (los 9 «↓ bajando» falsos)',
    '    gain: record - first,          // progreso REAL acumulado; nunca puede ser negativo',
    '    gain: last - first,'],
  [CORE, '3· la fila deja de avisar de que hoy NO está en su récord (se esconde «última X»)',
    '    atRecord: last >= record,      // su última sesión ES su mejor marca',
    '    atRecord: true,'],
  [CORE, '4· el estancamiento deja de mandar sobre la tendencia (el coach pierde lo accionable)',
    "    state: stalled ? 'stalled' : (record > first ? 'up' : 'flat'),",
    "    state: (record > first ? 'up' : 'flat'),"],
  [CORE, '5· el estancamiento se casa por NOMBRE y no por identidad (se pierden marcas, v484)',
    '  const stalled = !!(stalledKeys && (typeof stalledKeys.has === \'function\'',
    '  const stalled = !!(stalledKeys && (typeof stalledKeys.hasNombre === \'function\''],
  [CORE, '6· «lleva N sin mejorarlo» se cuenta desde la ÚLTIMA vez: da 0 en la meseta típica',
    '  const sinceRecord = pts.length - 1 - firstAt;',
    '  const sinceRecord = 0;'],
  [CORE, '7· el filtro «Estancados» deja pasar cualquier fila (deja de separar nada)',
    "  if (filter === 'stalled') return model.state === 'stalled';",
    "  if (filter === 'stalled') return true;"],
  // ── el CABLEADO: nada de esto lo caza la suite sin el candado estático ──
  [APP2, '8· el panel vuelve a pintar la última sesión como número grande',
    '<div style="font-family:\'JetBrains Mono\',monospace;font-size:13px;font-weight:700">${fmtMetric(m.record,unit)}</div>',
    '<div style="font-family:\'JetBrains Mono\',monospace;font-size:13px;font-weight:700">${fmtMetric(m.last,unit)}</div>'],
  [APP2, '9· desaparece el rótulo: vuelve el número desnudo que nadie sabe qué es',
    '<div style="font-size:10px;color:var(--t3);line-height:1.3">récord</div>',
    '<div style="font-size:10px;color:var(--t3);line-height:1.3"></div>'],
  [APP2, '10· el panel deja de preguntarle al detector (nadie sale nunca estancado)',
    '      try{stalledExercises(c,(DB.history[c.id]||[]),Date.now()).forEach(s=>{if(s&&s.key)stalledKeys.add(s.key);});}catch(e){}',
    '      try{void 0;}catch(e){}'],
  [APP2, '11· el filtro deja de delegar en la función pura y se vuelve una segunda definición',
    '    const filtered=models.filter(m=>progressRowMatches(m,_progFilter));',
    '    const filtered=models.slice();'],
];

const ORIG = new Map();
for (const [ruta] of SABOTAJES) if (!ORIG.has(ruta.href)) ORIG.set(ruta.href, readFileSync(ruta, 'utf8'));

let muerden = 0;
try {
  for (const [ruta, nombre, buscar, poner] of SABOTAJES) {
    const original = ORIG.get(ruta.href);
    const veces = original.split(buscar).length - 1;
    if (veces !== 1) {
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto aparece ${veces} veces (esperaba 1)`);
      continue;
    }
    // Reemplazo con FUNCIÓN: un `$` en el texto de reemplazo es un patrón especial (v583).
    writeFileSync(ruta, original.replace(buscar, () => poner), 'utf8');
    let rojo = false, linea = '';
    try {
      const out = execSync('node --test avi.test.js', { cwd: new URL('../..', import.meta.url), encoding: 'utf8', stdio: 'pipe' });
      linea = (out.match(/AVI Tests: .*/) || [''])[0];
    } catch (e) {
      rojo = true;
      linea = ((e.stdout || '').match(/AVI Tests: .*/) || [''])[0];
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
