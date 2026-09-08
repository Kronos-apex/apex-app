// Matriz de sabotaje de LA ANTIGÜEDAD DEL PESO EN LA VALORACIÓN (v587).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: este frente ya tiene DOS bugs de la misma familia en la
// historia del repo (v448 leía el PRIMER peso de la persona para siempre; v511 lo arregló en la
// fuente pero cuatro pantallas seguían leyendo el campo crudo del alta). El defecto vuelve
// siempre por la misma puerta —leer un extremo de la lista en vez de decidir por fecha— y no da
// error: devuelve un número plausible.
//
// Corre: node scripts/e2e/_sabotaje-peso-fuente.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CORE = new URL('../../avi-core.js', import.meta.url);
const COACH = new URL('../../app-3-coach.js', import.meta.url);

const SABOTAJES = [
  [CORE, '1· el «más reciente» se lee por POSICIÓN y no por fecha (así volvió el bug en v448 y v511)',
    "  conFecha.forEach(x => { const t = new Date(x.date).getTime(); if (isNaN(t)) return; if (!ult || t > ult._t) ult = Object.assign({ _t: t }, x); });",
    "  ult = conFecha.length ? Object.assign({ _t: new Date(conFecha[conFecha.length-1].date).getTime() }, conFecha[conFecha.length-1]) : null;"],
  [CORE, '2· un peso sin fecha se declara FRESCO (afirmar frescura sobre un dato sin fecha)',
    '    stale: ageDays == null ? true : ageDays >= BW_STALE_DAYS,',
    '    stale: ageDays == null ? false : ageDays >= BW_STALE_DAYS,'],
  [CORE, '3· el umbral se afloja hasta que no marca a nadie de los medidos',
    'const BW_STALE_DAYS = 60;   // ver la medición de arriba antes de moverlo',
    'const BW_STALE_DAYS = 400;  // SABOTAJE'],
  [CORE, '4· «no tiene ninguna pesada» se confunde con tener una: se pierde el peor caso',
    "      fuente: (fichaKg != null && !isNaN(fichaKg)) ? 'ficha' : 'ninguno',",
    "      fuente: 'pesaje',"],
  [CORE, '5· sin ficha y sin pesada devuelve 0 en vez de null (un 0 se lee como un peso)',
    "      kg: (fichaKg != null && !isNaN(fichaKg)) ? fichaKg : null,",
    "      kg: (fichaKg != null && !isNaN(fichaKg)) ? fichaKg : 0,"],
  [CORE, '6· la antigüedad se calcula pero se devuelve siempre a cero',
    '  const ageDays = ult ? Math.floor((nowTs - ult._t) / 86400000) : null;',
    '  const ageDays = ult ? 0 : null;'],
  [COACH, '7· la valoración deja de preguntarle al motor: vuelve a no decir de cuándo es',
    '  const _bw=(typeof bodyWeightSource==='+"'function')?bodyWeightSource(c,_bwList,Date.now()):null;",
    '  const _bw=null;'],
  [COACH, '8· el aviso del descuadre con la ficha pasa a ser un `else if`: uno TAPA al otro (clase v506)',
    '  if(_bwList.length && _pesoFicha && Math.abs(w-_pesoFicha)>=1){',
    '  else if(_bwList.length && _pesoFicha && Math.abs(w-_pesoFicha)>=1){'],
  [COACH, '9· desaparece la línea que pinta la antigüedad (queda el aviso sin su dato)',
    '      — de hace <strong>${_bw.ageDays} días</strong>.',
    '      —'],
  [COACH, '10· el azul vuelve al token CRUDO, ilegible en tema claro (lo que cazó el candado de v570)',
    'font-size:11.5px;color:var(--blt);margin-top:8px;line-height:1.5">\n      ⚖️ Ojo: la ficha dice',
    'font-size:11.5px;color:var(--bl);margin-top:8px;line-height:1.5">\n      ⚖️ Ojo: la ficha dice'],
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
    // Reemplazo con FUNCIÓN: un `$` en el reemplazo es un patrón especial (v583).
    writeFileSync(ruta, original.replace(buscar, () => poner), 'utf8');
    let rojo = false, linea = '';
    try {
      const out = execSync('node --test avi.test.js', { cwd: new URL('../..', import.meta.url), encoding: 'utf8', stdio: 'pipe' });
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
