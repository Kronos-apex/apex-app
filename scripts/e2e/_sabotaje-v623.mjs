// Matriz de sabotaje de «LO QUE EL COACH CAMBIA EN EL PERFIL NO LO PISA UN TELÉFONO ABIERTO» (v623).
//
// Cada lado subía `profile`/`routines` ENTEROS desde su memoria: un vaso de agua desde un teléfono
// abierto borraba el pago que el coach acababa de registrar, y una rutina editada desde un panel
// abierto borraba el vaso. Ahora se fusiona en tres vías (base · este lado · nube) antes de subir.
//
// Corre: node scripts/e2e/_sabotaje-v623.mjs   (COMMITEA antes: reescribe archivos del repo)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const escribir = (url, texto) => {          // atómico (v611)
  const p = fileURLToPath(url), tmp = p + '.tmp';
  writeFileSync(tmp, texto, 'utf8');
  renameSync(tmp, p);
};
const F = {
  core: new URL('../../avi-core.js', import.meta.url),
  inf: new URL('../../app-1-infra.js', import.meta.url),
  coach: new URL('../../app-3-coach.js', import.meta.url),
};
const RAIZ = new URL('../..', import.meta.url);
const suiteRoja = () => {
  try { execSync('node avi.test.js', { cwd: RAIZ, encoding: 'utf8', stdio: 'pipe' }); return ['', false]; }
  catch (e) { return [((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló', true]; }
};
const orig = Object.fromEntries(Object.entries(F).map(([k, u]) => [k, readFileSync(u, 'utf8')]));
let muerden = 0, total = 0, inertes = 0;

const matriz = [
  ['1· gana siempre este lado (el defecto original)', 'core',
    [['const v = tocoLocal ? l[k] : c[k];', 'const v = l[k] !== undefined ? l[k] : c[k];']]],
  ['2· compara sin forma canónica (el orden de jsonb cuenta como cambio)', 'core',
    [['const tocoLocal = canonJSON(l[k]) !== canonJSON(b[k]);', 'const tocoLocal = JSON.stringify(l[k]) !== JSON.stringify(b[k]);']]],
  ['3· las lápidas dejan de unirse en la fusión', 'core',
    [['  if (Object.keys(tombs).length) profile = Object.assign({}, profile, { prTombs: tombs });', '']]],
  ['4· el teléfono guarda el perfil sin fusionar', 'inf',
    [["const _mg=(k==='ax_c')?await _mergeOwnWithCloud(id):null;", 'const _mg=null;']]],
  ['5· el teléfono manda siempre sus rutinas (pisa el plan nuevo del coach)', 'inf',
    [['if(!_mg||_mg.sendRoutines) patch.routines=row.routines;', 'patch.routines=row.routines;']]],
  ['6· la fusión no llega a la ficha que se sube', 'inf',
    [['  _applyOwnRow(client,m.profile,null);', '']]],
  ['7· la base no se mueve a lo que dice la nube', 'inf',
    [['  _authBaseSet({profile:nube.profile,routines:tocoRutinas?nube.routines:base.routines});', '']]],
  ['8· una lectura sin perfil se fusiona (borra la ficha entera)', 'inf',
    [["||!lec.row.profile||typeof lec.row.profile!=='object'||!Array.isArray(lec.row.routines)", '']]],
  ['9· el panel del coach deja de fusionar (condición apagada)', 'inf',
    [["      if(_lec&&_lec.estado==='ok'&&_lec.row&&_lec.row.profile", "      if(false&&_lec&&_lec.estado==='ok'&&_lec.row&&_lec.row.profile"]]],
  ['10· al reconectar se mandan las rutinas no tocadas', 'coach',
    [['  if(_mg&&!_mg.sendRoutines) delete patch.routines;', '']]],
  ['11· el arranque sin red deja de fusionar (condición apagada)', 'coach',
    [["        if(_b&&typeof mergeOwnRow3==='function'){", '        if(false){']]],
  ['12· la base en memoria sirve para cualquier cuenta de la pestaña', 'inf',
    [['  if(_authBase&&_authBaseUid===_authUid)return _authBase;', '  if(_authBase)return _authBase;']]],
  ['13· el refresco adopta el plan del coach sin anotarlo en la base', 'inf',
    [["      if(typeof _authBaseGet==='function'){ const _b=_authBaseGet(); if(_b) _authBaseSet(Object.assign({},_b,{routines:row.routines})); }", '']]],
  ['14· el arranque online no deja base', 'coach',
    [["    if(online&&!_mergedOffline&&typeof _authBaseSet==='function') _authBaseSet({profile:row.profile||{},routines:Array.isArray(row.routines)?row.routines:[]});", '']]],
];

try {
  for (const [nombre, cual, pares] of matriz) {
    total++;
    const EOL = orig[cual].includes('\r\n') ? '\r\n' : '\n';
    let roto = orig[cual], aplicable = true;
    for (const [b, p] of pares) {
      const buscar = b.split('\n').join(EOL), poner = p.split('\n').join(EOL);
      if (roto.split(buscar).length - 1 !== 1) { aplicable = false; break; }
      roto = roto.split(buscar).join(poner);
    }
    if (!aplicable) { inertes++; console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto no aparece exactamente 1 vez`); continue; }
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
