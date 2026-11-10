#!/usr/bin/env node
// _fable2-matriz-selfreg.mjs — matriz adversarial del registro propio sobre `generarRutinas`.
// Solo LEE: carga avi-core y el catálogo real (app-1-infra.js) y barre lugar × días × objetivo × nivel × sexo ×
// nota de limitaciones × día de arranque × semilla, con las mismas opciones que manda `_autoGenerateWeek`.
//   node scripts/e2e/_fable2-matriz-selfreg.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const RAIZ = join(import.meta.dirname, '..', '..');
const require = createRequire(join(RAIZ, 'x.js'));
const core = require('./avi-core.js');

const src = readFileSync(join(RAIZ, 'app-1-infra.js'), 'utf8');
const LIB = [];
for (const m of src.matchAll(/\{id:'(e\d+)',name:'([^']+)',muscle:'([^']*)',type:'([^']*)'([^}]*)\}/g)) {
  const c = m[5]; const env = (c.match(/env:\[([^\]]*)\]/) || [])[1];
  LIB.push({ id: m[1], name: m[2], muscle: m[3], type: m[4],
    env: env ? env.split(',').map(s => s.replace(/'/g, '').trim()) : undefined,
    sets: +((c.match(/sets:(\d+)/) || [])[1] || 3), reps: +((c.match(/reps:(\d+)/) || [])[1] || 10) });
}
console.log('catálogo leído:', LIB.length, 'ejercicios');

// lo que elige `_autoGenerateWeek` por lugar (PLACE_DEFAULT_STYLE + TRAINING_STYLES)
const ESTILO = { gym: { env: 'gym', bias: 'hipertrofia' }, casa: { env: 'casa', bias: 'hipertrofia' },
  corporal: { env: 'corporal', bias: null }, parque: { env: 'parque', bias: 'calistenia' } };
const OBJ = ['Perder grasa', 'Ganar músculo', 'Recomposición', 'Fuerza', 'Resistencia', 'Salud general'];
const NIV = ['Principiante', 'Intermedio', 'Avanzado'];
const NOTAS = [
  '', 'dolor de rodilla', 'hernia discal', 'lesion de hombro', 'manguito rotador', 'embarazada de 5 meses',
  'hipertension', 'osteoporosis', 'diastasis', 'tunel carpiano', 'dolor de cuello', 'tobillo operado',
  'rodilla y hernia y hombro', 'embarazada, hipertension, dolor lumbar y de rodilla',
  'codo de tenista', 'pubalgia', 'fascitis plantar', 'me operaron del corazon',
];
// lo que la gente escribe de verdad: con errores, sin tildes, coloquial. ¿Se detecta?
const COLOQUIAL = [
  'ernia', 'ernia discal', 'rodiya', 'rodillas malas', 'me duele la cintura', 'dolor de columna', 'columna desviada',
  'sufro de la columna', 'tengo la presion alta', 'presion alta', 'soy hipertenso', 'asma', 'diabetes', 'artritis',
  'artrosis', 'estoy en embarazo', 'en embarazo', 'tengo 3 meses de gestacion', 'meniscos', 'tendinitis',
  'desgaste en las rodillas', 'me duele el hombro derecho', 'dolor en la espalda', 'espalda', 'ciatica', 'siatica',
  'vertigo', 'obesidad', 'sobrepeso', 'marcapasos', 'epilepsia', 'varices', 'hernia umbilical', 'hernia inguinal',
  'operado de la columna', 'tornillos en la columna', 'luxacion de hombro', 'munecas debiles', 'juanetes',
];

const fallos = {}; const anota = (k, d) => { (fallos[k] = fallos[k] || []).push(d); };
let corridas = 0; let cortado = false; const LIMITE = Date.now() + 130000; // tope de reloj: si corta, lo dice
const SEM = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const EQUIPO_RE = /barra|polea|maquina|máquina|smith|multipower|prensa|mancuerna|kettlebell|pesa rusa|banco|trx|banda/i;

for (const place of Object.keys(ESTILO)) for (const days of [1, 2, 3, 4, 5, 6]) for (const goal of OBJ)
  for (const level of NIV) for (const sex of ['M', 'F']) for (const notes of NOTAS)
    for (const startDay of ['Lunes']) for (const seed of [1])
      for (const [age, lp, adapt] of (notes === '' || notes === 'dolor de rodilla' ? [[30, 'normal', true], [14, 'normal', true], [62, 'high', false]] : [[30, 'normal', true]])) {
        if (Date.now() > LIMITE) { cortado = true; continue; }
        const c = { sex, age, level, days, goal, notes, place };
        let res;
        const caso = JSON.stringify({ place, days, goal, level, sex, notes, startDay, seed, age, lp });
        try {
          res = core.generarRutinas(c, LIB, { idFn: (() => { let i = 0; return () => 'r' + (i++); })(), startDay, seed,
            place: ESTILO[place].env, methodBias: ESTILO[place].bias, adaptation: adapt, loadProfile: lp, audience: 'client',
            now: '2026-11-10T15:00:00.000Z' });
        } catch (e) { anota('REVIENTA', caso + ' → ' + e.message); continue; }
        corridas++;
        const rs = res.routines || [];
        if (!rs.length) { anota('SIN_RUTINAS', caso); continue; }
        if (rs.length !== Math.min(days, 5)) anota('DIAS_DISTINTOS_A_LO_PEDIDO', caso + ' → ' + rs.length);
        const dias = rs.map(r => r.day);
        if (new Set(dias).size !== dias.length) anota('DIA_REPETIDO', caso + ' → ' + dias);
        if (dias.some(d => SEM.indexOf(d) < 0 || SEM.indexOf(d) > 4)) anota('DIA_FUERA_DE_LUN_VIE', caso + ' → ' + dias);
        const lim = core.limitationsFor(c, Date.parse('2026-11-10T15:00:00.000Z'));
        const zonas = (lim.keys || []);
        rs.forEach((r, i) => {
          const ex = r.exercises || [];
          if (ex.length === 0) anota('DIA_VACIO', caso + ' → día ' + (i + 1) + ' ' + r.name);
          else if (ex.length < 3) anota('DIA_FLACO(<3)', caso + ' → día ' + (i + 1) + ' ' + r.name + ': ' + ex.map(e => e.name).join(' | '));
          const ids = ex.map(e => e.exId || e.id);
          ex.forEach(e => {
            const base = LIB.find(l => l.id === (e.exId || e.libId || e.id)) || LIB.find(l => l.name === e.name) || e;
            if (zonas.length && core.exerciseContraindicated(base, zonas)) anota('CONTRAINDICADO', caso + ' → ' + e.name);
            if (place === 'corporal' && EQUIPO_RE.test(e.name)) anota('CORPORAL_CON_EQUIPO', e.name);
            if (!(parseInt(e.sets) > 0)) anota('SIN_SERIES', caso + ' → ' + e.name);
          });
          const nombres = ex.map(e => e.name);
          if (new Set(nombres).size !== nombres.length) anota('EJERCICIO_REPETIDO_MISMO_DIA', caso + ' → ' + r.name);
        });
      }

console.log('\ncorridas:', corridas, cortado ? 'CORTADO por tiempo: la matriz NO se recorrio entera' : '(matriz completa)');
const claves = Object.keys(fallos);
if (!claves.length) console.log('✅ ninguna combinación falló los chequeos');
for (const k of claves) {
  const l = fallos[k]; const unicos = [...new Set(l)];
  console.log(`\n❌ ${k}: ${l.length} casos (${unicos.length} distintos). Muestra:`);
  unicos.slice(0, k === 'CORPORAL_CON_EQUIPO' ? 30 : 6).forEach(x => console.log('   ', x.slice(0, 330)));
}

console.log('\n── notas coloquiales: ¿la app detecta algo? ──');
for (const t of COLOQUIAL) {
  const l = core.parseLimitations(t);
  console.log((l.detected || l.cardiac ? (l.hasExclusions ? '  filtra  ' : '  DETECTA SIN FILTRO') : '  ❌ NO VE NADA') + ' «' + t + '» → ' + JSON.stringify(l.keys) + (l.cardiac ? ' +alerta cardíaca' : ''));
}
