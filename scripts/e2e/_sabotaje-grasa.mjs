// Matriz de sabotaje de LA GRASA CORPORAL ESTIMADA (v607).
// Veredicto por CÓDIGO DE SALIDA, jamás por el mensaje impreso (lección v524).
// El `poner` va como FUNCIÓN en el replace: un `$` en el texto de reemplazo es un patrón
// especial y deja el sabotaje INERTE con cara de verde (lección v583).
//
// Corre: node scripts/e2e/_sabotaje-grasa.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CORE = new URL('../../avi-core.js', import.meta.url);
const APP5 = new URL('../../app-5-salud.js', import.meta.url);
const APP3 = new URL('../../app-3-coach.js', import.meta.url);

const SABOTAJES = [
  [CORE, '1· 🔒 se le estima la grasa a un MENOR',
    "  if (isFinite(edad) && edad < 18) return { ok: false, razon: 'menor' };",
    '  // sabotaje'],
  // ⚠️ Reapuntado: esta línea aparece DOS veces desde que `waistFlag` usa el mismo patrón, así
  //    que el ancla lleva su vecina para volver a ser única (la clase de v537/v549).
  [CORE, '2· sin sexo se asume HOMBRE (el defecto de v604 con otra cara)',
    "  const sexo = client.sex === 'F' ? 'F' : (client.sex === 'M' ? 'M' : null);\n  if (!sexo) return { ok: false, razon: 'sin_sexo' };",
    "  const sexo = client.sex === 'F' ? 'F' : 'M';\n  if (!sexo) return { ok: false, razon: 'sin_sexo' };"],
  [CORE, '3· UNA sola fórmula para todo el mundo (la de hombre)',
    "  if (sexo === 'F') {",
    '  if (false) {'],
  [CORE, '4· 🔴 se mezclan tomas: basta la cintura y el cuello se trae de otra fecha',
    '    if (need.every(k => { const v = Number(e[k]); return isFinite(v) && v > 0; })) return { entry: e, idx: i };',
    "    if (['cintura'].every(k => { const v = Number(e[k]); return isFinite(v) && v > 0; })) return { entry: e, idx: i };"],
  // ⚠️ Reapuntado: la línea usa `banda` desde que la franja va por sexo.
  [CORE, '5· desaparece la franja: el número finge precisión de laboratorio',
    '    lo: r1(Math.max(BF_MIN_PCT, crudo - banda)),',
    '    lo: r1(crudo),'],
  [CORE, '6· una toma BORRADA vuelve a contar (la lápida de v566 deja de respetarse)',
    '  const vivas = medLive(entries);\n  if (!vivas.length) return { ok: false, razon: \'sin_tomas\', falta: need.slice() };',
    '  const vivas = (entries || []).slice();\n  if (!vivas.length) return { ok: false, razon: \'sin_tomas\', falta: need.slice() };'],
  [CORE, '7· se pinta un número imposible en vez de callarse',
    '  if (crudo == null || crudo < BF_MIN_PCT || crudo > BF_MAX_PCT) {',
    '  if (crudo == null) {'],
  [CORE, '8· deja de decirse QUÉ perímetro falta («faltan datos» manda a adivinar)',
    '    return { ok: false, razon: \'faltan_medidas\', falta, ultima: ult.date };',
    "    return { ok: false, razon: 'faltan_medidas', falta: [], ultima: ult.date };"],
  [APP5, '9· CABLEADO: la tarjeta del asesorado deja de calcularla',
    '  html+=_medGrasaHtml(cli,(DB.medidas||{})[clientId]||[]);',
    '  // sabotaje'],
  [APP5, '10· 🔒 al MENOR se le pinta el bloque (se rompe el silencio)',
    "  if(!e || e.razon==='menor' || e.razon==='sin_sexo') return '';   // silencio, no explicación",
    '  if(!e) return null;'],
  [APP3, '11· CABLEADO: la valoración del coach deja de calcularla',
    "  const _bf=(typeof bodyFatEstimate==='function')\n    ? bodyFatEstimate(c,(DB.medidas&&DB.medidas[c.id])||[]) : null;",
    '  const _bf=null;'],
  [APP3, '12· la casilla del coach deja de decir qué medir',
    "    html += statBox(_coIco('scale',12,'⚖️'),'Grasa estim.','—','Falta medir '+esc(_fn.join(' y ')),'var(--t3)');",
    "    html += statBox(_coIco('scale',12,'⚖️'),'Grasa estim.','—','Sin datos','var(--t3)');"],
  // ── Lo que dictó el equipo el 11-sep ──────────────────────────────────────────────────────
  [CORE, '13· 🔒 la franja de la mujer vuelve a ser la del hombre (la clase de v604)',
    'const BF_BAND_PTS_F = 3.9;',
    'const BF_BAND_PTS_F = 3.5;'],
  [CORE, '14· la franja deja de ir por sexo (una sola para todo el mundo)',
    "function bfBandFor(sexo) { return sexo === 'F' ? BF_BAND_PTS_F : BF_BAND_PTS_M; }",
    'function bfBandFor(sexo) { return BF_BAND_PTS_M; }'],
  [CORE, '15· 🔴 un cambio dentro del margen se pinta como cambio real',
    '      out.dentroDelMargen = Math.abs(out.delta) < banda / 2;',
    '      out.dentroDelMargen = false;'],
  [CORE, '16· 🔴 se va la bandera de Laura del cambio imposible',
    "      if (Math.abs(out.delta) > banda * 2) out.bandera = 'cambio_grande';",
    '      // sabotaje'],
  [CORE, '17· 🔴 la cintura se juzga con UN corte para los dos sexos',
    'const WAIST_RISK_CM = { M: 102, F: 88 };',
    'const WAIST_RISK_CM = { M: 102, F: 102 };'],
  [CORE, '18· la bandera de cintura le sale también a un menor',
    "  if (isFinite(edad) && edad < 18) return null;     // a un menor no se le habla de esto",
    '  // sabotaje'],
  [CORE, '19· 🔴 «muslo por detrás» vuelve a apuntar solo a lumbar (queda el curl femoral)',
    "  'muslo por detrás': ['lumbar', 'isquios'],",
    "  'muslo por detrás': 'lumbar',"],
  [CORE, '20· 🔴 CONTROL DE LAURA: la regla de isquios se ensancha y vacía la cadena posterior',
    '  isquios: /curl femoral|curl nordico/,',
    '  isquios: /curl femoral|curl nordico|hip thrust|puente|bisagra|estiramiento/,'],
  [CORE, '21· 🔴 vuelve el `add(z)` con el array entero (el hueco preexistente de shockPlan)',
    '    painCareActive(client.painCare, nowTs).forEach(p => painExclZones(p.area).forEach(z => { if (GEN_ZONE_EXCL[z]) excludeZones.add(z); }));',
    '    painCareActive(client.painCare, nowTs).forEach(p => { const z = _PAIN_ZONE_TO_EXCL[p.area]; if (z) excludeZones.add(z); });'],
  [APP5, '22· 🔴 vuelve el «3 puntos» escrito a mano (le miente a las mujeres)',
    "  const pts=String(e.banda||'').replace('.',',');",
    "  const pts='3';"],
  [APP5, '23· CABLEADO: se va la bandera de cintura de la pantalla',
    '  html+=_medCinturaFlagHtml(cli,(DB.medidas||{})[clientId]||[]);',
    '  // sabotaje'],
  [APP3, '24· 🔒 la ficha del coach vuelve a quedar muda en un menor',
    "    html += statBox(_coIco('scale',12,'⚖️'),'Grasa estim.','—','No se estima en menores de edad','var(--t3)');",
    '    // sabotaje'],
];

// ⚠️ Los finales de línea de este repo NO son estables (v537/v594): el patrón se traduce al
// del ARCHIVO en vez de adivinarlo.
const traducir = (txt, crlf) => crlf ? txt.replace(/\r?\n/g, '\r\n') : txt.replace(/\r\n/g, '\n');

const ORIGINALES = new Map([CORE, APP5, APP3].map(u => [u.href, readFileSync(u, 'utf8')]));
const restaurar = () => { for (const [href, txt] of ORIGINALES) writeFileSync(new URL(href), txt, 'utf8'); };

let muerden = 0, inertes = 0;
try {
  for (const [ruta, nombre, buscarRaw, ponerRaw] of SABOTAJES) {
    const original = ORIGINALES.get(ruta.href);
    const crlf = original.includes('\r\n');
    const buscar = traducir(buscarRaw, crlf), poner = traducir(ponerRaw, crlf);
    const veces = original.split(buscar).length - 1;
    if (veces !== 1) {
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto aparece ${veces} veces (esperaba 1)`);
      inertes++;
      continue;
    }
    writeFileSync(ruta, original.replace(buscar, () => poner), 'utf8');
    let rojo = false, linea = '';
    try {
      const out = execSync('node avi.test.js', { cwd: new URL('../..', import.meta.url), encoding: 'utf8', stdio: 'pipe' });
      linea = (out.match(/AVI Tests: .*/) || [''])[0];
    } catch (e) {
      rojo = true;
      linea = ((e.stdout || '').match(/AVI Tests: .*/) || [''])[0];
    }
    restaurar();
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite ni corrió'}`);
    if (rojo) muerden++;
  }
} finally {
  restaurar();
}
const ok = muerden === SABOTAJES.length;
console.log(`\n${ok ? '✅' : '🔴'} Sabotajes que muerden: ${muerden}/${SABOTAJES.length}${inertes ? ` · INERTES: ${inertes}` : ''}`);
process.exit(ok ? 0 : 1);
