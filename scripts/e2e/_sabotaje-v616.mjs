// Matriz de sabotaje de «LOS AJUSTES DEL COACH TAMBIÉN TIENEN COLA» (v616).
//
// Por qué hace falta versionada: el defecto NO daba error. `_persistCoachWrite` ganó su cola en
// v588 y la rama de `coach_settings` se quedó fuera: al fallar hacía `warn()` + `_setAuthDirty`,
// y esa bandera NADIE la lee cuando el rol es coach (`_enterCoachAuth` devuelve antes del bloque
// que la consume). Como localStorage sí se queda con el valor, la app le decía que había
// guardado. Se perdían su Nequi, su nombre, su sitio y la BIBLIOTECA de ejercicios.
//
// Corre: node scripts/e2e/_sabotaje-v616.mjs
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
  ['1· el fallo vuelve a perderse en silencio (el defecto original)',
    'inf', [['      if(typeof _cwqAddSetting===\'function\')_cwqAddSetting(short,v);\n      else _setAuthDirty(true);',
      '      _setAuthDirty(true);']]],
  ['2· guardar bien NO limpia la cola: el aviso se queda clavado para siempre',
    'inf', [['      if(typeof _cwqDropSetting===\'function\')_cwqDropSetting(short);', '']]],
  ['3· la exención se cae: el ajuste queda RETENIDO para siempre y no sube nunca',
    'core', [["  if (String(entry.col).indexOf('cs:') === 0) return true;", '']]],
  ['4· CONTROL: la exención se contagia a TODA la cola (el reintento pisa el entreno de hoy)',
    'core', [["  if (String(entry.col).indexOf('cs:') === 0) return true;", '  return true;']]],
  ['5· todos los ajustes comparten una entrada: cambiar el Nequi borra la biblioteca de la cola',
    'coach', [["function _cwqAddSetting(short,val){ return _cwqAdd('cs:'+short,_cwqSettingId(),val,'Tus ajustes'); }",
      "function _cwqAddSetting(short,val){ return _cwqAdd('cs:',_cwqSettingId(),val,'Tus ajustes'); }"]]],
  ['6· el reintento vuelve a subir la columna ENTERA (la biblioteca de 240 KB de acompañante)',
    'coach', [['        await UD.patchCoachSettings(patch);', '        await UD.upsertOwn({coach_settings:patch});']]],
  ['7· el reintento de ajustes decide por su cuenta en vez de obedecer al veredicto',
    'coach', [['        const v=coachQueueVerdict(e,{estado:(lec&&lec.estado)||\'mudo\',updatedAt:lec&&lec.row&&lec.row.updated_at});',
      '        const v=\'subir\';']]],
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
