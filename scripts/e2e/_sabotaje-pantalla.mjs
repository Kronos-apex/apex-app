// ════════════════════════════════════════════════════════════════════════════════════════
// MATRIZ DE SABOTAJE — v569 · «la pantalla no se apaga en el descanso»
//
// El HIIT, el isometrico y el cardio pedian el candado de pantalla (`wakeLock`); el descanso
// ENTRE SERIES —el que corre en cada serie de cada entreno— no. La pantalla se apagaba a mitad
// y habia que despertarla para anotar el peso. Y al reves: `relWake()` vivia DENTRO de
// `if(GM.hiit){...}` en cuatro salidas, asi que cerrar el guiado durante un isometrico o un
// cardio dejaba el candado colgado y la pantalla encendida indefinidamente.
//
// ⚠️ El EFECTO no se puede reproducir aqui: `navigator.wakeLock` no existe en Chrome headless y
// que la pantalla se apague lo decide el sistema operativo. Lo que estos casos prueban es que
// los candados ESTATICOS muerden — misma honestidad que el zoom de iOS de v526.
//
//   node scripts/e2e/_sabotaje-pantalla.mjs
// ════════════════════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const P = (f) => join(ROOT, f);

const CASOS = [
  {
    n: 'S1 · el descanso entre series vuelve a correr sin candado (la pantalla se apaga)',
    file: 'app-6-extra.js',
    from: '  reqWake();\n  // Reset del estado de pausa/+15s',
    to: '  // Reset del estado de pausa/+15s',
  },
  {
    n: 'S2 · el descanso pide el candado y NO lo suelta al terminar',
    file: 'app-6-extra.js',
    from: '      _gmRemoveRestMini();\n      relWake();\n      playRestEndBeep();',
    to: '      _gmRemoveRestMini();\n      playRestEndBeep();',
  },
  {
    n: 'S3 · saltar el descanso deja el candado colgado',
    file: 'app-6-extra.js',
    from: '  relWake();   // saltar es una salida como cualquier otra',
    to: '  ;',
  },
  {
    n: 'S4 · cerrar el guiado solo suelta si venia del HIIT (hold y cardio quedan colgados)',
    file: 'app-6-extra.js',
    from: '  if(GM.hiit){ clearInterval(GM.hiit); GM.hiit = null; }\n  // 🔴 FUERA del `if(GM.hiit)`',
    to: '  if(GM.hiit){ clearInterval(GM.hiit); GM.hiit = null; relWake(); }\n  // 🔴 FUERA del `if(GM.hiit)`',
  },
  {
    n: 'S5 · reiniciar la sesion deja el candado colgado',
    file: 'app-6-extra.js',
    from: "  if(GM.hiit){ clearInterval(GM.hiit); GM.hiit=null; }\n  relWake();\n  document.getElementById('gm-rest-overlay').classList.add('hidden');\n  closeStartCard();\n  GM.currentStep=0;",
    to: "  if(GM.hiit){ clearInterval(GM.hiit); GM.hiit=null; relWake(); }\n  document.getElementById('gm-rest-overlay').classList.add('hidden');\n  closeStartCard();\n  GM.currentStep=0;",
  },
  {
    n: 'S6 · reqWake deja de ser idempotente (24 series = 24 candados colgados)',
    file: 'app-4-entreno.js',
    from: '  if(aviWakeLock)return;',
    to: '  ;',
  },
  {
    n: 'S7 · nadie se entera de que el sistema solto el candado (la variable queda muerta)',
    file: 'app-4-entreno.js',
    from: "    aviWakeLock.addEventListener('release',()=>{aviWakeLock=null;});",
    to: '    ;',
  },
  {
    n: 'S8 · al volver de otra app el candado NO se recupera',
    file: 'app-4-entreno.js',
    from: "  if(document.visibilityState==='visible' && _wakeWanted && !aviWakeLock) reqWake();",
    to: '  ;',
  },
  {
    n: 'S9 · soltar no apaga la intencion: el candado se resucita solo para siempre',
    file: 'app-4-entreno.js',
    from: 'function relWake(){\n  _wakeWanted=false;',
    to: 'function relWake(){',
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
