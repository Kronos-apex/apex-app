// Matriz de sabotaje de LA CURA DE RÉCORDS ATASCADOS (v591, hallazgo D3-2).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: esta cura toca datos que la persona se GANÓ, y las cuatro reglas
// que la hacen segura salen de una medición que ya se hizo una vez y terminó en RECHAZO (v483).
// Aflojar cualquiera de ellas no da error: crea récords que un humano borró a propósito, o
// convierte en récord un número que alguien escribió en una casilla y no levantó.
//
// Corre: node scripts/e2e/_sabotaje-records.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CORE = new URL('../../avi-core.js', import.meta.url);
const COACH = new URL('../../app-3-coach.js', import.meta.url);

const SABOTAJES = [
  [CORE, '1· CREA el récord que no existe: resucita el que el coach borró a mano (v483)',
    '  Object.keys(out).forEach(key => {',
    '  const _todas=new Set(Object.keys(out)); hist.forEach(s=>((s&&s.exercises)||[]).forEach(ex=>{ if(ex&&(ex.id||ex.name))_todas.add(ex.id||ex.name); }));\n  _todas.forEach(key => {\n    if(!out[key]) out[key]={val:0,kg:0,unit:\'kg\',reps:0,date:\'2000-01-01T00:00:00Z\',name:key};'],
  [CORE, '2· una serie ANOTADA y no marcada pasa a ser récord (el caso de Nataly)',
    '          if (!se || se.done !== true) continue;',
    '          if (!se) continue;'],
  [CORE, '3· se cura hacia ATRÁS: una sesión ANTERIOR pisa el récord que un humano corrigió',
    '      if (!Number.isFinite(ts) || ts <= prTs) continue;',
    '      if (!Number.isFinite(ts)) continue;'],
  [CORE, '4· un récord de peso corporal (0 kg) se convierte en uno de carga',
    "    if (unit !== 'kg' || !(val > 0)) return;",
    "    if (unit !== 'kg') return;"],
  [CORE, '5· se pierde el rastro de dónde venía (la app cambiaría el dato en silencio)',
    '      healedFrom: { val, date: pr.date, at: mejor.date },',
    '      healedFrom: null,'],
  [CORE, '6· el récord se mueve aunque la sesión NO lo supere (deja de ser hacia arriba)',
    '          if (!(kg > 0) || kg <= val) continue;',
    '          if (!(kg > 0)) continue;'],
  [COACH, '7· la cura del asesorado corre sobre lo NO saneado (un 200 kg imposible sería récord)',
    "  const _hp=(typeof healStalePrs==='function')?healStalePrs(_sp.prs,_sh.history):{prs:_sp.prs,curados:[]};",
    "  const _hp=(typeof healStalePrs==='function')?healStalePrs(coll.prs||{},coll.history||[]):{prs:_sp.prs,curados:[]};"],
  [COACH, '8· lo curado NO se persiste: vuelve a estar atascado al siguiente arranque',
    '  if(_sp.removed>0||_pr.moved>0||_hp.curados.length){ try{ svNow(\'ax_pr\',DB.prs);',
    '  if(_sp.removed>0||_pr.moved>0){ try{ svNow(\'ax_pr\',DB.prs);'],
  [COACH, '9· el COACH entrenando se queda sin curar (5 de los 9 récords medidos son suyos)',
    "    const _hpSelf=(typeof healStalePrs==='function')?healStalePrs(_prSelf,DB.history[id]):{prs:_prSelf,curados:[]};",
    '    const _hpSelf={prs:_prSelf,curados:[]};'],
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
      const out = execSync('node avi.test.js', { cwd: new URL('../..', import.meta.url), encoding: 'utf8', stdio: 'pipe' });
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
