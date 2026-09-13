// Matriz de sabotaje de «LO QUE EL COACH EDITA DEL CATÁLOGO TIENE QUE DURAR» (v608).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: este defecto no da ningún error ni deja rastro. El coach edita,
// la app le dice «✅ actualizado», y en el siguiente login el nombre vuelve a ser el del código.
// No hay víctima medida hoy (13-sep: 0 campos separados del catálogo en la nube) justamente
// porque cada reversión borra su propia evidencia — así que el único guardián es la suite.
//
// Corre: node scripts/e2e/_sabotaje-v608.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const F = {
  core: new URL('../../avi-core.js', import.meta.url),
  app1: new URL('../../app-1-infra.js', import.meta.url),
  app2: new URL('../../app-2-login.js', import.meta.url),
  app4: new URL('../../app-4-entreno.js', import.meta.url),
};
const RAIZ = new URL('../..', import.meta.url);
const suiteRoja = () => {
  try { execSync('node avi.test.js', { cwd: RAIZ, encoding: 'utf8', stdio: 'pipe' }); return ['', false]; }
  catch (e) { return [((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló', true]; }
};
const orig = Object.fromEntries(Object.entries(F).map(([k, u]) => [k, readFileSync(u, 'utf8')]));
const eolDe = s => (s.includes('\r\n') ? '\r\n' : '\n');   // ni se asume ni se mezcla (v600)
let muerden = 0, total = 0, inertes = 0;

const matriz = [
  ['1· la migración vuelve a ignorar la marca del coach (el defecto original)',
    'core', [['      if (mios.indexOf(k) !== -1) { kept++; return; }       // lo editó el coach: manda él\n', '']]],
  ['2· la marca se lee de un campo que nadie escribe (queda viva y sin efecto)',
    'core', [['const mios = Array.isArray(ex._ed) ? ex._ed : [];', 'const mios = Array.isArray(ex._editado) ? ex._editado : [];']]],
  ['3· vuelve a MUTAR la lista que recibe (contamina el catálogo del código)',
    'core', [['      copia = copia || Object.assign({}, ex);\n      copia[k] = def[k]; refreshed++;',
      '      copia = ex;\n      copia[k] = def[k]; refreshed++;']]],
  ['4· deja de refrescar lo que el coach NO tocó (la migración pierde su razón de ser)',
    'core', [['    f.forEach(k => {', '    f.forEach(() => {']]],
  ['5· la marca no se suelta: un campo editado queda congelado para siempre',
    'core', [['  return f.filter(k => def[k] !== undefined && ex[k] !== def[k]);',
      '  return f.filter(k => def[k] !== undefined);']]],
  ['6· `saveEx` deja de sellar lo que el coach acaba de editar',
    'app4', [['      const ed=catalogEditedFields(ex,defaultExercises.find(d=>d.id===CUR.editExId),CATALOG_FIELDS);',
      '      const ed=[];']]],
  ['7· el arranque del coach se salta la regla y refresca por su cuenta',
    'app2', [['  const r=refreshCatalogFields(DB.exercises,defaultExercises,CATALOG_FIELDS);',
      '  const r={list:DB.exercises.map(e=>Object.assign({},e,defaultExercises.find(d=>d.id===e.id)||{})),changed:true,added:0,refreshed:0,kept:0};']]],
  ['8· en un dispositivo nuevo la biblioteca vuelve a SER el catálogo del código',
    'app1', [['  exercises:_libreriaEjercicios(),', "  exercises:ld('ax_e',defaultExercises),"]]],
];

try {
  for (const [nombre, cual, pares] of matriz) {
    total++;
    const EOL = eolDe(orig[cual]);
    const eol = s => s.split('\n').join(EOL);
    let roto = orig[cual], aplicable = true;
    for (const [b, p] of pares) {
      const buscar = eol(b), poner = eol(p);
      if (roto.split(buscar).length - 1 !== 1) { aplicable = false; break; }
      roto = roto.split(buscar).join(poner);
    }
    if (!aplicable) {
      inertes++;
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto no aparece exactamente 1 vez (¿cambió el código?)`);
      continue;
    }
    writeFileSync(F[cual], roto, 'utf8');
    const [linea, rojo] = suiteRoja();
    writeFileSync(F[cual], orig[cual], 'utf8');
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite quedó VERDE'}`);
    if (rojo) muerden++;
  }
} finally {
  for (const [k, u] of Object.entries(F)) writeFileSync(u, orig[k], 'utf8');
}

console.log(`\nMuerden ${muerden}/${total}` + (inertes ? ` · ${inertes} no se pudieron aplicar` : ''));
process.exitCode = (muerden === total) ? 0 : 1;
