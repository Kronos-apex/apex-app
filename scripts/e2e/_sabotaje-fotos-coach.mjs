// Matriz de sabotaje de LAS FOTOS DE PROGRESO DEL LADO DEL COACH (v586).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: esta feature es puro CABLEADO, y el repo tiene tres precedentes
// de un candado que aprueba una llamada muerta — la llamada COMENTADA (v552), el identificador
// que sobrevive en otra parte de la función (v568) y el `if(false)` que conserva hasta el orden
// (v579). Un render que no se llama no da error: la sección simplemente no aparece, que es
// exactamente el estado del que venimos.
//
// Corre: node scripts/e2e/_sabotaje-fotos-coach.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const COACH = new URL('../../app-3-coach.js', import.meta.url);
const SALUD = new URL('../../app-5-salud.js', import.meta.url);
const HTML = new URL('../../index.html', import.meta.url);

// ⚠️ Anclas de UNA línea y en el TROZO que cambia (los finales de línea del repo no son
// estables, v537; y una línea entera se despega en cuanto un lote la alarga, v549).
const SABOTAJES = [
  [COACH, '1· el render no se llama en la pasada de los datos PESADOS: la sección sale vacía siempre',
    'renderMedidasCoach(id);renderPhotosCoach(id);\n    renderNutReviewCard(c);',
    'renderMedidasCoach(id);\n    renderNutReviewCard(c);'],
  [COACH, '2· ni en la primera pasada (re-abrir un cliente ya cargado deja de pintarlas)',
    'renderMedidasCoach(id);renderPhotosCoach(id);\n  renderDetailMembership(id);',
    'renderMedidasCoach(id);\n  renderDetailMembership(id);'],
  // El sabotaje de esta clase tiene que comentar la llamada REAL y EN LÍNEA: así el nombre
  // sigue apareciendo en el archivo y un candado que solo descarte las líneas que EMPIEZAN por
  // `//` la cuenta como viva. Es la cuarta cara de la clase v552/v568/v570/v579.
  // ⚠️ La primera versión de este caso salió VERDE y el defecto era del sabotaje, no del
  //    candado: comentaba una COPIA y dejaba la llamada de verdad en su sitio.
  [COACH, '3· la llamada se COMENTA en línea: el nombre sigue en el archivo (clase v552)',
    'renderMedidasCoach(id);renderPhotosCoach(id);\n    renderNutReviewCard(c);',
    'renderMedidasCoach(id);/*renderPhotosCoach(id);*/\n    renderNutReviewCard(c);'],
  [SALUD, '4· el coach abre el visor SIN solo-lectura → le vuelve el botón de borrar fotos ajenas',
    "onclick=\"viewPhoto('${esc(p.id)}','${esc(clientId)}',true)\"",
    "onclick=\"viewPhoto('${esc(p.id)}','${esc(clientId)}')\""],
  [SALUD, '5· el visor ignora el modo solo-lectura y pinta «Eliminar» igual',
    "      ${soloLectura?'':`<button id=\"ph-del-btn\"",
    "      ${false?'':`<button id=\"ph-del-btn\""],
  [SALUD, '6· al asesorado se le deja de decir que su coach ve sus fotos',
    "    ?'<div style=\"font-size:11px;color:var(--t3);margin-top:8px\">Tu entrenador ve estas fotos",
    "    ?'<div style=\"font-size:11px;color:var(--t3);margin-top:8px\">Nada que ver aquí"],
  [SALUD, '7· el aviso desaparece del estado VACÍO: se entera DESPUÉS de subir, que es tarde',
    'marca tu punto de partida.</div></div>`+_verCoach;return;',
    'marca tu punto de partida.</div></div>`;return;'],
  [SALUD, '8· el aviso se le suelta también a quien NO tiene coach (le promete un lector que no existe)',
    "const _verCoach=(typeof clientHasCoach==='function')&&clientHasCoach(_c)",
    "const _verCoach=(typeof clientHasCoach==='function')&&true"],
  [SALUD, '9· CONTROL: al asesorado se le quita SU botón de borrar (eso no es proteger, es borrar la feature)',
    '      ${soloLectura?\'\':`<button id="ph-del-btn"',
    '      ${true?\'\':`<button id="ph-del-btn"'],
  [HTML, '10· desaparece el contenedor: el render no tiene dónde pintar y falla en silencio',
    '<div id="d-photos"></div>',
    '<div></div>'],
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
    // Reemplazo con FUNCIÓN: un `$` en el texto de reemplazo es un patrón especial (v583) —
    // y aquí los reemplazos están LLENOS de `${...}`.
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
