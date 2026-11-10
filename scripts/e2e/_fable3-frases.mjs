#!/usr/bin/env node
// _fable3-frases.mjs — ¿qué detecta `parseLimitations` de lo que la gente escribe en el campo «Lesiones» del registro?
// Solo LEE avi-core. Cada frase lleva la zona que un humano esperaría.   node scripts/e2e/_fable3-frases.mjs
import { join } from 'node:path';
import { createRequire } from 'node:module';
const RAIZ = join(import.meta.dirname, '..', '..');
const core = createRequire(join(RAIZ, 'x.js'))('./avi-core.js');
const F = {
  rodilla: ['me duele la rodilla', 'tengo las rodillas malas', 'me operaron de los meniscos', 'rodiya derecha', 'condromalacia', 'desgaste de cartilago', 'me suena la rodilla y duele', 'ligamento cruzado', 'me truena la rodila', 'artrosis de rodilla', 'las rodillas no me dan'],
  hombro: ['me duele el hombro', 'ombro derecho lesionado', 'tendinitis en el hombro', 'se me sale el hombro', 'manguito rotador roto', 'bursitis', 'me operaron del supraespinoso', 'luxacion de clavicula', 'el brazo no me sube bien', 'pinzamiento subacromial'],
  lumbar: ['dolor lumbar', 'me duele la cintura', 'sufro de la columna', 'dolor de columna', 'tengo la columna desviada', 'dolor en la espalda', 'me duele la parte baja de la espalda', 'tengo discos desgastados', 'me operaron de la columna', 'tornillos en la columna', 'lumbalgia cronica', 'dolor de espalda', 'la espalda me molesta', 'tengo mala la espalda', 'problemas de espalda', 'discopatia', 'artrodesis', 'me duele el rabo/coxis'],
  hernia: ['hernia discal', 'ernia discal', 'tengo una ernia', 'hernia l5 s1', 'dos hernias en la columna', 'me operaron de una hernia', 'abombamiento discal', 'hernea lumbar', 'ernias'],
  ciatica: ['ciatica', 'siatica', 'me da la ciatica', 'el nervio ciatico', 'nervio siatico pinzado', 'dolor que baja por la pierna'],
  cuello: ['dolor cervical', 'me duele el cuello', 'cervicales', 'servical', 'hernia cervical', 'rectificacion cervical', 'me duele la nuca', 'tortícolis'],
  embarazo: ['estoy embarazada', 'estoy en embarazo', 'tengo 5 meses de embarazo', 'embarasada', 'enbarazada', 'en estado', 'estoy en cinta', 'estoy encinta', 'voy a ser mama', 'espero bebe', 'tengo 20 semanas', 'estoy esperando', 'embarazo de 3 meses', 'preñada', 'gestando'],
  presion: ['presion alta', 'tengo la presion alta', 'soy hipertenso', 'hipertensa', 'ipertension', 'sufro de la presion', 'sufro de tension', 'tension alta', 'la presion se me sube', 'tomo pastillas para la presion', 'tomo losartan', 'soy hipertenza', 'presión arterial alta', 'tengo la tension alta', 'presion', 'problemas de presion'],
  corazon: ['sufro del corazon', 'problemas del corazon', 'me operaron del corazon', 'tuve un infarto', 'tengo un soplo', 'soplo en el corazon', 'arritmia', 'tengo marcapasos', 'soy cardiaco', 'operado a corazon abierto', 'preinfarto', 'enfermo del corazon', 'tengo un stent', 'cateterismo', 'falla cardiaca'],
  hueso: ['osteoporosis', 'osteoporocis', 'osteopenia', 'tengo los huesos debiles', 'descalcificacion', 'me falta calcio en los huesos', 'huesos de cristal', 'osteoporósis en la columna'],
  piso_pelvico: ['piso pelvico debil', 'incontinencia', 'se me sale la orina', 'se me escapa la orina al saltar', 'prolapso', 'vejiga caida', 'diastasis', 'diastasis de rectos', 'tuve cesarea hace 3 meses', 'cesaria hace 2 meses', 'matriz caida', 'me orino cuando toso', 'tuve bebe hace 2 meses', 'hernia umbilical', 'ernia umbilical', 'me operaron de la matriz', 'histerectomia'],
};
const ESPERA = { rodilla: ['rodilla'], hombro: ['hombro'], lumbar: ['lumbar'], hernia: ['lumbar'], ciatica: ['lumbar'], cuello: ['cuello'],
  embarazo: ['embarazo'], presion: ['presion'], corazon: ['presion'], hueso: ['hueso'], piso_pelvico: ['core_central'] };
let tot = 0, ok = 0, nada = 0, otra = 0;
for (const [grupo, frases] of Object.entries(F)) {
  let g = 0; const malas = [];
  for (const f of frases) {
    tot++;
    const l = core.parseLimitations(f);
    const bien = ESPERA[grupo].every(z => l.keys.includes(z));
    if (bien) { ok++; g++; continue; }
    const filtraAlgo = l.keys.some(k => k !== 'generic');
    if (!l.keys.length && !l.cardiac) nada++; else otra++;
    malas.push(`«${f}» → ${l.keys.length ? JSON.stringify(l.keys) : 'NADA'}${l.cardiac ? ' +alerta corazón' : ''}${filtraAlgo ? '' : ' (no filtra)'}`);
  }
  console.log(`\n${grupo}: ${g}/${frases.length} con la zona esperada`);
  malas.forEach(m => console.log('   ❌ ' + m));
}
console.log(`\nTOTAL ${ok}/${tot} con la zona esperada · ${nada} sin NADA · ${otra} con otra cosa o solo «genérico»`);
