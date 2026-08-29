#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// _sabotaje-selfreg-lim.mjs — matriz VERSIONADA de los candados de v552.
//
// Qué protege: quien se registra POR SU CUENTA y declara una lesión en el paso 6 del asistente
// (1) no recibe un plan sellado como «revisado» por nadie, (2) lee una nota escrita para ELLA y
// no para un coach, y (3) su coach SE ENTERA — hasta v552 el único aviso de una limitación vivía
// en la vista previa del generador, que solo se abre cuando el coach pulsa ✨ Generar.
//
// Cada sabotaje devuelve el código a la conducta INCORRECTA, corre la suite y exige que CAIGA por
// CÓDIGO DE SALIDA (nunca por el mensaje impreso: leer el texto es como el smoke pasó 43 versiones
// muerto). Si el texto a sustituir no aparece EXACTAMENTE una vez, grita «NO SE APLICÓ» — un
// sabotaje que no muta nada sale verde y parece un candado flojo.
//
//   node scripts/e2e/_sabotaje-selfreg-lim.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const RAIZ = join(import.meta.dirname, '..', '..');
const CORE = join(RAIZ, 'avi-core.js');
const COACH = join(RAIZ, 'app-3-coach.js');

const SABOTAJES = [
  { n: 1, f: COACH, why: 'vuelve el sello «revisado» sobre un plan que nadie miró',
    de: 'c.routines=sortRoutinesByDay(res.routines);',
    a:  'c.routines=sortRoutinesByDay(res.routines.map(r=>({...r,reviewed:true})));' },
  { n: 2, f: COACH, why: 'la nota del auto-registro vuelve a escribirse para el coach',
    de: ",preferIds:_p.prefer,audience:'client'});",
    a:  ',preferIds:_p.prefer});' },
  { n: 3, f: COACH, why: 'el registro nuevo deja de avisarle al coach',
    de: '  _selfRegLimAlert(rec,_genRes);',
    a:  '  // _selfRegLimAlert(rec,_genRes);' },
  { n: 4, f: COACH, why: '«Regenerar mi semana» deja de avisar',
    de: '    _selfRegLimAlert(c,res);',
    a:  '    // _selfRegLimAlert(c,res);' },
  { n: 5, f: COACH, why: 'se quita el tope: el coach recibe un push en CADA regeneración',
    de: 'if(!c||!c.selfReg||c.limAlertAt)return false;',
    a:  'if(!c||!c.selfReg)return false;' },
  { n: 6, f: CORE, why: 'el aviso promete un filtro que en esa zona NO existe',
    de: "  const filtro = l.hasExclusions\n    ? 'El generador sacó lo que carga esa zona, que es un filtro por lo que escribió y no una valoración.'\n    : 'Esa zona NO tiene filtro automático: no se excluyó ni un ejercicio.';",
    a:  "  const filtro = 'El generador sacó lo que carga esa zona, que es un filtro por lo que escribió y no una valoración.';" },
  { n: 7, f: CORE, why: 'la nota del asesorado deja de decirle que nadie la ha revisado',
    de: ' Todavía no lo ha revisado un profesional: si algo te duele, no lo hagas y avísale a tu coach.`;',
    a:  '`;' },
  { n: 8, f: CORE, why: 'la frase clínica de Laura se reescribe en vez de viajar literal',
    de: 'así que este plan la tuvo en cuenta. ${l.advice}${nerv}',
    a:  'así que este plan la tuvo en cuenta. Quitamos lo que suele molestar.${nerv}' },
];

// ⚠️ LOS FINALES DE LÍNEA DE ESTE REPO NO SON ESTABLES (gotcha vigente: git los reescribe al
// hacer checkout, y `avi-core.js` va con CRLF mientras otros van con LF). Un patrón de varias
// líneas escrito con `\n` NO casa, y el sabotaje sale «NO SE APLICÓ» — le pasó a S6 en la primera
// corrida. La solución es del RUNNER, no adivinar: cada salto se convierte en `\r?\n`.
const rx = (txt) => new RegExp(
  txt.split('\n').map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\r?\\n'), 'g');

const suiteCae = () => {
  try { execFileSync('node', ['--test', join(RAIZ, 'avi.test.js')], { cwd: RAIZ, stdio: 'pipe' }); return false; }
  catch { return true; }
};

// Control: la suite tiene que estar VERDE antes de saborear nada, o el resultado no dice nada.
if (suiteCae()) { console.error('❌ La suite ya estaba en ROJO antes de empezar. Abortado.'); process.exit(1); }
console.log('control: suite verde antes de sabotear ✅\n');

let muerden = 0, fallos = 0;
for (const s of SABOTAJES) {
  const orig = readFileSync(s.f, 'utf8');
  const veces = (orig.match(rx(s.de)) || []).length;
  if (veces !== 1) {
    console.log(`  S${s.n} 🚨 NO SE APLICÓ — el texto aparece ${veces} veces (esperaba 1). ${s.why}`);
    fallos++; continue;
  }
  // La sustitución va con función para que un `$&` dentro del texto nuevo no se expanda.
  writeFileSync(s.f, orig.replace(rx(s.de), () => s.a), 'utf8');
  const cayo = suiteCae();
  writeFileSync(s.f, orig, 'utf8');
  console.log(`  S${s.n} ${cayo ? '✅ muerde' : '❌ VERDE'} — ${s.why}`);
  cayo ? muerden++ : fallos++;
}

console.log(`\n${muerden}/${SABOTAJES.length} muerden`);
if (suiteCae()) { console.error('❌ La suite quedó en ROJO al restaurar. Revisa los archivos.'); process.exit(1); }
if (fallos) { console.error(`❌ ${fallos} sabotaje(s) sin morder.`); process.exit(1); }
console.log('✅ TODO OK — los candados de v552 muerden y el código quedó restaurado.');
