// Matriz de sabotaje de «BORRAR UN PESO BORRA DE VERDAD» (v614). Rompe cada candado y exige
// que la suite se ponga ROJA. Un test que nunca viste caer no protege nada (R2.1).
//
// Por qué hace falta versionada: el defecto NO daba error ni dejaba rastro. `deleteBodyWeight`
// quitaba la toma con un `filter`, la pantalla la borraba delante de los ojos, y `mergeAuthRow`
// fusionaba el peso por UNIÓN por fecha — o sea que volvía en la primera fusión tras entrenar
// sin conexión. Medido sobre 45 respaldos (10-jul→15-sep-2026): 1 borrado real y 0
// resurrecciones, porque esa fusión solo corre con el arranque anterior `dirty`. Estructural.
//
// Corre: node scripts/e2e/_sabotaje-v614.mjs
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

// 🔴 ESCRITURA ATÓMICA (13-sep-2026): un corte de luz a mitad de un `writeFileSync` deja el
// archivo con su tamaño nuevo y el contenido en CEROS. `.tmp` + `rename` es todo-o-nada.
const escribir = (url, texto) => {
  const p = fileURLToPath(url), tmp = p + '.tmp';
  writeFileSync(tmp, texto, 'utf8');
  renameSync(tmp, p);
};

const F = {
  core: new URL('../../avi-core.js', import.meta.url),
  app3: new URL('../../app-3-coach.js', import.meta.url),
  app4: new URL('../../app-4-entreno.js', import.meta.url),
  app6: new URL('../../app-6-extra.js', import.meta.url),
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
  // ── EL BORRADO ─────────────────────────────────────────────────────────────────────────
  ['1· vuelve el `filter`: el borrado es una animación y la toma resucita (el defecto original)',
    'app4', [['  const lista=bwDelete((DB.bodyweight||{})[clientId]||[],id,new Date().toISOString());',
      '  const lista=((DB.bodyweight||{})[clientId]||[]).filter(e=>bwEntryId(e)!==id);']]],
  ['2· borrar algo que no existe FINGE que borró (en vez de devolver null)',
    'core', [['  if (i < 0) return null;', '  if (i < 0) return lista;']]],
  ['3· la lápida no se guarda: se quita la entrada y no queda nada que tape la copia de la nube',
    'core', [['  lista[i] = { id: lista[i].id, date: lista[i].date, del: true, mAt: at };',
      '  lista.splice(i, 1);']]],

  // ── LA FUSIÓN (el cableado: aquí es donde el bug vivía de verdad) ───────────────────────
  ['4· la fila vuelve a fusionar el peso por UNIÓN por fecha (la línea que causaba TODO)',
    'core', [['  out.bodyweight = pair((l, c) => mergeBodyweight(l, c), localRow.bodyweight || [], cloudRow.bodyweight || []);',
      '  out.bodyweight = pair((l, c) => mergeClientArrays(l, c, byDate, \'desc\'), localRow.bodyweight || [], cloudRow.bodyweight || []);']]],
  ['5· en la fusión gana la copia MÁS VIEJA: la lápida pierde contra la nube rezagada',
    'core', [['      if (t > tp) porId.set(it.id, it);', '      if (t < tp) porId.set(it.id, it);']]],

  // ── REVIVIR UN DÍA BORRADO ─────────────────────────────────────────────────────────────
  ['6· vuelve el findIndex que le escribe el kg ENCIMA a la lápida (peso invisible para siempre)',
    'core', [['  const entrada = { id: id, date: date, kg: kg, mAt: at };\n  if (i > -1) lista[i] = entrada; else lista.unshift(entrada);',
      '  const entrada = { id: id, date: date, kg: kg, mAt: at };\n  if (i > -1) lista[i].kg = kg; else lista.unshift(entrada);']]],
  ['7· el registro nuevo no estrena `mAt`: la lápida vieja lo mata en la siguiente fusión',
    'core', [['  const entrada = { id: id, date: date, kg: kg, mAt: at };',
      '  const entrada = { id: id, date: date, kg: kg, mAt: date };']]],

  // ── EL CUPO ────────────────────────────────────────────────────────────────────────────
  ['8· las lápidas gastan el cupo de las tomas vivas',
    'core', [['const BW_CAP = 52;', 'const BW_CAP = 1;']]],

  // ── LOS LECTORES (la lección de v566: cuentan e indexan, no solo pintan) ────────────────
  ['9· el peso del plan vuelve a salir de una lápida (NaN donde iba su peso)',
    'core', [['    if (e.del) continue;          // una lápida no es un pesaje (v614)', '']]],
  ['10· «cuántas veces se ha pesado» cuenta los borrados, y la fecha es la de la lápida',
    'core', [['  const conFecha = (bwList || []).filter(x => x && !x.del && x.date != null && x.date !== \'\');',
      '  const conFecha = (bwList || []).filter(x => x && x.date != null && x.date !== \'\');']]],
  ['11· la lista del peso vuelve a pintar la colección cruda (lápidas incluidas)',
    'app4', [['  const entries=bwLive(DB.bodyweight[clientId]||[]).slice().reverse();',
      '  const entries=(DB.bodyweight[clientId]||[]).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));']]],
  ['12· el perfil lee el índice 0 a pelo y enseña «undefined kg»',
    'app4', [['  const bwEntries=bwLive(DB.bodyweight[client.id]||[]);', '  const bwEntries=DB.bodyweight[client.id]||[];']]],
  ['13· el botón de borrar manda la fecha cruda y no la identidad que entiende la capa',
    'app4', [["onclick=\"deleteBodyWeight('${esc(bwEntryId(e))}')\"", "onclick=\"deleteBodyWeight('${e.date}')\""]]],
  ['14· la gráfica del coach vuelve a la colección cruda',
    'app3', [['  const entries=bwLive(DB.bodyweight[clientId]||[]).slice().reverse();',
      '  const entries=(DB.bodyweight[clientId]||[]).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));']]],
  ['15· el aviso del coach cuenta lápidas como pesadas',
    'app3', [['  const _bwList=bwLive((DB.bodyweight||{})[c.id]||[]);', '  const _bwList=(DB.bodyweight||{})[c.id]||[];']]],

  // ── UN SOLO MOTOR PARA LOS DOS FORMULARIOS ─────────────────────────────────────────────
  ['16· «Mi peso» vuelve a tener su propia copia del guardado',
    'app4', [['  DB.bodyweight[clientId]=bwUpsert(DB.bodyweight[clientId],today,val,new Date().toISOString());',
      '  const idx=DB.bodyweight[clientId].findIndex(e=>e.date===today);\n  if(idx>-1)DB.bodyweight[clientId][idx].kg=val;\n  else DB.bodyweight[clientId].unshift({date:today,kg:val});']]],
  ['17· el asistente del Día 1 vuelve a guardar por su cuenta (era el que no topaba)',
    'app6', [['  DB.bodyweight[clientId] = bwUpsert(DB.bodyweight[clientId], today, val, new Date().toISOString());',
      '  const idx = DB.bodyweight[clientId].findIndex(e => e.date === today);\n  if(idx > -1) DB.bodyweight[clientId][idx].kg = val;\n  else DB.bodyweight[clientId].unshift({date: today, kg: val});']]],
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
    escribir(F[cual], roto);
    const [linea, rojo] = suiteRoja();
    escribir(F[cual], orig[cual]);
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite quedó VERDE'}`);
    if (rojo) muerden++;
  }
} finally {
  for (const [k, u] of Object.entries(F)) escribir(u, orig[k]);
}

console.log(`\nMuerden ${muerden}/${total}` + (inertes ? ` · ${inertes} no se pudieron aplicar` : ''));
process.exitCode = (muerden === total) ? 0 : 1;
