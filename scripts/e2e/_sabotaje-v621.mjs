// Matriz de sabotaje de «LA LÁPIDA NO SE PIERDE CUANDO UN TELÉFONO VIEJO GUARDA EL PERFIL» (v621).
//
// El hueco que dejó v620: `upsertOwn`/`updateClientRow` REEMPLAZAN `profile` entero, y un teléfono
// (o un panel del coach) abierto desde antes del borrado de un récord subía su perfil sin
// `prTombs`. La nube se quedaba sin lápida y con la copia vieja de `prs`: el récord borrado volvía.
//
// Corre: node scripts/e2e/_sabotaje-v621.mjs   (COMMITEA antes: reescribe archivos del repo)
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
const eolDe = s => (s.includes('\r\n') ? '\r\n' : '\n');
let muerden = 0, total = 0, inertes = 0;

const matriz = [
  ['1· el defecto original: guardar perfil/récords del asesorado ya no pregunta por las lápidas',
    'inf', [["    if(k==='ax_c'||k==='ax_pr') await _foldOwnPrTombs(id);", '']]],
  ['2· solo los récords preguntan: el perfil se sube sin lápidas',
    'inf', [["    if(k==='ax_c'||k==='ax_pr') await _foldOwnPrTombs(id);", "    if(k==='ax_pr') await _foldOwnPrTombs(id);"]]],
  ['3· la lápida de la nube no llega a la ficha que se sube',
    'inf', [['  if(f.profile!==client) client.prTombs=f.tombs;', '']]],
  ['4· los récords que se suben siguen trayendo el borrado',
    'inf', [['  if(f.removed&&DB.prs) DB.prs[id]=f.prs;', '']]],
  ['5· la subida al reconectar manda el perfil sin preguntar',
    'coach', [["  if(typeof _foldOwnPrTombs==='function'&&DB.clients&&DB.clients[0]) await _foldOwnPrTombs(DB.clients[0].id);", '']]],
  ['6· un panel viejo del coach pisa la lápida del asesorado',
    'inf', [['      row.profile=await _profileWithCloudPrTombs(id,row.profile);', '']]],
  ['7· el coach guardándose a sí mismo borra sus lápidas',
    'inf', [['        const _perfil=await _profileWithCloudPrTombs(_authUid,(', '        const _perfil=((']]],
  ['8· la cola de reintentos sube la foto vieja del perfil',
    'coach', [["        if(typeof foldPrTombs==='function') patch.profile=foldPrTombs(patch.profile,fila.profile&&fila.profile.prTombs,null).profile;", '']]],
  ['9· la fusión ignora las lápidas de la nube',
    'core', [['  const tombs = prTombsPrune(prTombsMerge(base.prTombs, cloudTombs), nowIso);', '  const tombs = prTombsPrune(prTombsMerge(base.prTombs, null), nowIso);']]],
  ['10· las lápidas no tapan los récords',
    'core', [['  const r = hay ? applyPrTombs(prs, tombs) : { prs: prs, removed: 0 };', '  const r = { prs: prs, removed: 0 };']]],
  ['11· inventa `prTombs:{}` en perfiles que no tenían',
    'core', [['profile: hay ? Object.assign({}, base, { prTombs: tombs }) : base,', 'profile: Object.assign({}, base, { prTombs: tombs }),']]],
  ['12· la lectura pide otra ruta del perfil (nunca trae lápidas)',
    'inf', [["    const lec=await this.readClientCol(userId,'tombs:profile->prTombs');", "    const lec=await this.readClientCol(userId,'tombs:profile->prtombs');"]]],
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
