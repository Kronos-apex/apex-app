// Matriz de sabotaje de «COMPARTIR UN ENTRENO YA GUARDADO» (v624).
//
// Reporte del PO: la imagen solo existía en la pantalla de cierre y «si de casualidad oprimes
// Continuar ya perdiste la opción de compartir». El entreno queda guardado; su imagen no.
// Aquí se comprueba que cada candado MUERDE: la tarjeta de ESA sesión, lo que no se guardó no se
// pinta, el botón cableado en la habitación, el candado de menores y el reparto del aire.
//
// Corre: node scripts/e2e/_sabotaje-v624.mjs   (COMMITEA antes: reescribe archivos del repo)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const escribir = (url, texto) => {          // atómico (v611: un corte de luz dejó un archivo en ceros)
  const p = fileURLToPath(url), tmp = p + '.tmp';
  writeFileSync(tmp, texto, 'utf8');
  renameSync(tmp, p);
};
const F = {
  core: new URL('../../avi-core.js', import.meta.url),
  ent: new URL('../../app-4-entreno.js', import.meta.url),
};
const RAIZ = new URL('../..', import.meta.url);
const suiteRoja = () => {
  try { execSync('node avi.test.js', { cwd: RAIZ, encoding: 'utf8', stdio: 'pipe' }); return ['', false]; }
  catch (e) { return [((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló', true]; }
};
const orig = Object.fromEntries(Object.entries(F).map(([k, u]) => [k, readFileSync(u, 'utf8')]));
let muerden = 0, total = 0, inertes = 0;

const matriz = [
  // ── La tarjeta: lo que no se guardó no se pinta ──
  ['1· inventa una duración que la sesión no guardó', 'core',
    [['  if (s.durationSec > 0) chips.push([\'Duración\', fmtDuration(s.durationSec)]);',
      '  chips.push([\'Duración\', fmtDuration(s.durationSec || 2700)]);']]],
  ['2· inventa las calorías', 'core',
    [['  if (s.kcal > 0) chips.push([\'Calorías\', s.kcal + \' kcal\']);',
      '  chips.push([\'Calorías\', (s.kcal || 300) + \' kcal\']);']]],
  ['3· pinta un volumen en cero («0 kg» no dice nada)', 'core',
    [['  if (s.totalVol > 0) chips.push([\'Volumen\', s.totalVol.toLocaleString() + \' kg\']);',
      '  chips.push([\'Volumen\', (s.totalVol || 0).toLocaleString() + \' kg\']);']]],
  ['4· una sesión sin fecha igual arma tarjeta', 'core',
    [['  if (!s.date) return null;                       // sin fecha no hay sesión que contar', '']]],
  ['5· la fecha vuelve a depender del ICU del teléfono', 'core',
    [['  const fecha = SHARE_DIAS[d.getDay()] + \', \' + d.getDate() + \' de \' + SHARE_MESES[d.getMonth()];',
      '  const fecha = d.toLocaleDateString(\'es-CO\', { weekday: \'long\', day: \'numeric\', month: \'long\' });']]],
  ['6· la tarjeta pierde el nombre completo (el círculo pierde iniciales y color)', 'core',
    [['return { name: full.split(\' \')[0] || \'\', fullName: full,', 'return { name: full.split(\' \')[0] || \'\', fullName: \'\',']]],

  // ── El cableado en la habitación de la sesión ──
  ['7· el botón se arma y no se pinta (puerta cerrada, ventana abierta)', 'ent',
    [['    ${shareHTML}', '    ']]],
  ['8· la habitación deja de armar la tarjeta de ESA sesión', 'ent',
    [["  const _shData=(typeof sessionShareData==='function')?sessionShareData(s,_shClient):null;",
      '  const _shData=_wfShareData||null;']]],
  ['9· la foto del lienzo se prepara DESPUÉS del toque (navigator.share exige activación reciente)', 'ent',
    [['    _wfPrepShareCanvas(_shClient);\n', '']]],
  ['10· se va el candado de menores del panel del coach', 'ent',
    [["  const _shMenor=CUR.loggedAs==='coach' && _shClient && parseInt(_shClient.age)<18\n    && !(typeof showcaseMinorOk==='function' && showcaseMinorOk(_shClient));",
      '  const _shMenor=false;']]],
  ['11· el candado de menores deja de decidir si el botón existe', 'ent',
    [['  if(_shData&&!_shMenor){', '  if(_shData){']]],
  ['12· vuelven DOS reglas de qué foto de fondo le toca (v604)', 'ent',
    [['  const _bgSrc=_wfShareBgSrc(c);', "  const _bgSrc=(c&&c.photo)||'img/ob-2.jpg';"]]],

  // ── El reparto del aire de la tarjeta corta ──
  ['13· el reparto se calcula y NO se aplica (la tarjeta corta vuelve a colgar de arriba)', 'ent',
    [['  const CR_TOP=CR_TOP0+_sobra, CR_CY=CR_TOP+CR_R, _dy=_dy0+_sobra;',
      '  const CR_TOP=CR_TOP0, CR_CY=CR_TOP+CR_R, _dy=_dy0;']]],
  ['14· el fin del bloque ignora los récords (con 3 récords se montaría sobre el pie)', 'ent',
    [["  const _endNat=764+_dy0+(cells.length?CH:0)+30+prs3.length*(PRH+PRGAP);",
      '  const _endNat=764+_dy0+(cells.length?CH:0)+30;']]],
  ['15· la referencia del reparto se despega: la tarjeta LLENA también se movería', 'ent',
    [['  const _sobra=Math.max(0,Math.round((1624-_endNat)/2));', '  const _sobra=Math.max(0,Math.round((1760-_endNat)/2));']]],
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
