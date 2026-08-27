// Matriz de sabotaje de LAS ZONAS DE CODO, MUÑECA Y PECHO (v546).
// Rompe cada candado del dictamen de Laura del 27-ago y exige que la suite se ponga ROJA, por
// CÓDIGO DE SALIDA (nunca leyendo el texto impreso — lección de v524).
//
// Por qué versionada: este frente ya demostró que una zona puede estar OFRECIDA en el cuestionario
// y MUDA en el motor durante meses sin que nadie lo note. El PO reportó dolor de codo el 17-ago,
// la app le prometió por escrito que le sacaría lo que carga esa zona, y diez días después seguía
// con los tres ejercicios en su plan. Era el ÚNICO reporte de dolor de toda la base de datos.
//
// Corre: node scripts/e2e/_sabotaje-codo.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CORE = new URL('../../avi-core.js', import.meta.url);
const APP1 = new URL('../../app-1-infra.js', import.meta.url);

// ⚠️ Los patrones se anclan en UNA sola línea y se eligen ÚNICOS: los regex de `codo` y `muneca`
// comparten muchos términos, así que un ancla corta se aplica en la zona equivocada.
const SABOTAJES = [
  [CORE, '1· el codo vuelve a ser una zona muda (se cae del mapa de exclusión)',
    "  'codo': 'codo',", "  // 'codo': 'codo',"],
  [CORE, '2· el codo se ensancha con «muneca» a secas → caen los calentamientos que SON el tratamiento',
    'curl de muneca|rotaciones de muneca|curl invertido|zottman|scott',
    'muneca|curl invertido|zottman|scott'],
  [CORE, '3· el codo se ensancha con «agarre cerrado» → cae el jalón de agarre cerrado, que es el amable',
    'diamante|flexion cerrada|banca agarre cerrado|curl de muneca',
    'diamante|flexion cerrada|agarre cerrado|curl de muneca'],
  [CORE, '4· el codo se ensancha con «plancha» a secas → caen las planchas de antebrazo',
    'toques? de hombro|plancha saltarina|plancha a flexion|caminata del oso',
    'toques? de hombro|plancha|caminata del oso'],
  [CORE, '5· el pecho usa «pec deck» → se lleva el Pec Deck INVERSO, que es deltoides posterior',
    'pecho: /aperturas|apertura de pecho|contractora|fondos|lanzamiento|azote/,',
    'pecho: /aperturas|apertura de pecho|pec deck|fondos|lanzamiento|azote/,'],
  [CORE, '6· el filtro vuelve a mirar SOLO el nombre guardado → «Extensión en Polea» se escapa',
    '    if (canon && canon.name) {', '    if (false) {'],
  [CORE, '7· una zona pierde su etiqueta y nace muda para el coach',
    "  cuello: 'cuello', tobillo: 'tobillo',", "  cuello: 'cuello',"],
  [CORE, '8· la muñeca pierde la «Plancha de hombros», que el nombre no delata',
    "  muneca: ['we4'],", '  // muneca: [],'],
  [CORE, '9· se le inventa un correctivo al codo sin saber qué tendón es',
    'const GEN_CORRECTIVE = {', "const GEN_CORRECTIVE = {\n  codo: [{ id: 'e140', fase: 'subagudo' }],"],
  [APP1, '10· desaparece la patada en polea → el tríceps de gimnasio vuelve a quedarse en uno',
    "  {id:'e252',name:'Patada de Tríceps en Polea'", "  {id:'e252x',name:'Patada de Tríceps en Poleax'"],
];

const ORIGINALES = new Map([[CORE.href, readFileSync(CORE, 'utf8')], [APP1.href, readFileSync(APP1, 'utf8')]]);
const restaurar = () => { for (const [href, txt] of ORIGINALES) writeFileSync(new URL(href), txt, 'utf8'); };

let muerden = 0;
try {
  for (const [ruta, nombre, buscar, poner] of SABOTAJES) {
    const original = ORIGINALES.get(ruta.href);
    const veces = original.split(buscar).length - 1;
    if (veces !== 1) {
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto aparece ${veces} veces (esperaba 1)`);
      continue;
    }
    writeFileSync(ruta, original.replace(buscar, poner), 'utf8');
    let rojo = false, linea = '';
    try {
      const out = execSync('node avi.test.js', { cwd: new URL('../..', import.meta.url), encoding: 'utf8', stdio: 'pipe' });
      linea = (out.match(/AVI Tests: .*/) || [''])[0];
    } catch (e) {
      rojo = true;                       // ← el VEREDICTO es el código de salida
      linea = ((e.stdout || '').match(/AVI Tests: .*/) || [''])[0];
    }
    restaurar();
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite ni corrió'}`);
    if (rojo) muerden++;
  }
} finally {
  restaurar();
}
console.log(`\n${muerden === SABOTAJES.length ? '✅' : '🔴'} Sabotajes que muerden: ${muerden}/${SABOTAJES.length}`);
process.exit(muerden === SABOTAJES.length ? 0 : 1);
