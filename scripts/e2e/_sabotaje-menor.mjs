// ════════════════════════════════════════════════════════════════════════════════════════
// MATRIZ DE SABOTAJE — v565 · «la app ya no obliga a un menor a mentir»
//
// Cada caso mete UN defecto real y exige que la suite se ponga en ROJO **por codigo de
// salida** (v524: leer el mensaje impreso no basta; un test appendeado bajo el bloque
// RESUMEN imprime su fallo y sale con codigo 0).
//
// El runner GRITA si el texto no aparece exactamente una vez: un sabotaje que no se
// aplica sale verde y se lee igual que un candado flojo (v490/v537).
//
//   node scripts/e2e/_sabotaje-menor.mjs
// ════════════════════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const P = (f) => join(ROOT, f);

const CASOS = [
  {
    n: 'S1 · la edad deja de decidir: un menor vuelve a firmar «soy mayor de 18»',
    file: 'avi-core.js',
    from: 'if (consentNeedsGuardian(edad)) {',
    to: 'if (false) {',
  },
  {
    n: 'S2 · el acudiente deja de ser obligatorio (autorizacion sin representante)',
    file: 'avi-core.js',
    from: 'if (!checks.acudiente || nombre.length < 2) return null;',
    to: 'if (false) return null;',
  },
  {
    n: 'S3 · consentNeedsGuardian miente: nadie es menor',
    file: 'avi-core.js',
    from: '  return n < 18;',
    to: '  return false;',
  },
  {
    n: 'S4 · el formulario deja de pasar la edad a la funcion pura',
    file: 'app-3-coach.js',
    from: '{age:isFinite(age)?age:null, acudienteNombre:val(\'su-acu-nombre\'), acudienteTel:val(\'su-acu-tel\')}',
    to: '{}',
  },
  {
    n: 'S5 · el alta del coach deja de guardar la evidencia',
    file: 'app-3-coach.js',
    from: "data.consent=(typeof consentKeep==='function')?consentKeep(_prev,_ev):_ev;",
    to: ";",
  },
  {
    n: 'S6 · el aviso al coach se desconecta de una de las dos puertas',
    file: 'app-3-coach.js',
    from: '  _selfRegLimAlert(rec,_genRes);\n  _selfRegMinorAlert(rec);',
    to: '  _selfRegLimAlert(rec,_genRes);',
  },
  {
    n: 'S7 · la pantalla pierde la salida del acudiente (el menor vuelve a no tener opcion)',
    file: 'index.html',
    // Ancla en el TROZO que no se mueve (el id), no en la linea entera: el arreglo del
    // display ya la despego una vez (leccion v549/v550).
    from: 'id="su-menor-box"',
    to: 'id="su-menor-box-off"',
  },
  {
    n: 'S8 · el aviso al coach se le manda tambien a los adultos (ruido que se aprende a ignorar)',
    file: 'avi-core.js',
    from: '  if (!c.menor) return null;',
    to: '  if (false) return null;',
  },
  {
    n: 'S9 · consentKeep se rinde: guardar el peso vuelve a re-fechar la autorizacion',
    file: 'avi-core.js',
    from: '  return consentSame(prev, next) ? prev : next;',
    to: '  return next;',
  },
  {
    n: 'S10 · consentSame deja de mirar la edad declarada',
    file: 'avi-core.js',
    from: '  if ((a.edad == null ? null : a.edad) !== (b.edad == null ? null : b.edad)) return false;',
    to: '  ;',
  },
  {
    n: 'S11 · la edad vuelve a ser opcional (un menor cae al camino de adulto con el campo en blanco)',
    file: 'app-3-coach.js',
    from: "if(this.steps[this.cur]==='wz-s-body'){",
    to: 'if(false){',
  },
  {
    n: 'S12 · la ficha del coach acredita una autorizacion sin edad (adulto:true, edad:null)',
    file: 'app-3-coach.js',
    from: 'if(_ckC&&_ckC.checked&&!(data.age>0)){',
    to: 'if(false){',
  },
];

let muerden = 0;
const verdes = [];

for (const c of CASOS) {
  const path = P(c.file);
  const orig = readFileSync(path, 'utf8');
  const veces = orig.split(c.from).length - 1;
  if (veces !== 1) {
    console.log(`\x1b[33m  !! NO SE APLICO\x1b[0m  ${c.n}  (el texto aparece ${veces} veces, se esperaba 1)`);
    verdes.push(c.n + ' [NO SE APLICO]');
    continue;
  }
  writeFileSync(path, orig.replace(c.from, c.to), 'utf8');
  let rojo = false;
  try {
    execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    rojo = true;                       // codigo de salida != 0 = la suite cayo
  } finally {
    writeFileSync(path, orig, 'utf8');  // restaurar SIEMPRE
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
