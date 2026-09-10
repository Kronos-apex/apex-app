// Matriz de sabotaje de «HOMBROS ENTRA A LAS MEDIDAS» (v598).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: un perímetro a medio cablear **no da ni un error**. Si el campo
// está en `MED_FIELDS` y le falta el input, `openMedModal` no encuentra nada que rellenar y
// `saveMedidas` se lo salta: la casilla simplemente NO EXISTE y quien la busca cree que la app
// está rota (que es exactamente lo que le pasó al PO con los hombros). Y al revés: un input que la
// lista no conoce se teclea, se ve, y se TIRA al guardar. Las dos mitades son invisibles por
// separado — la misma familia que `EX_IMG_IDS` contra los archivos de foto.
//
// Corre: node scripts/e2e/_sabotaje-v598.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CORE = new URL('../../avi-core.js', import.meta.url);
const HTML = new URL('../../index.html', import.meta.url);
const RAIZ = new URL('../..', import.meta.url);
const suiteRoja = () => {
  try { execSync('node avi.test.js', { cwd: RAIZ, encoding: 'utf8', stdio: 'pipe' }); return ['', false]; }
  catch (e) { return [((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló', true]; }
};

const origCore = readFileSync(CORE, 'utf8');
const origHtml = readFileSync(HTML, 'utf8');
// El fin de línea se deriva del archivo, no se asume: la copia de trabajo es CRLF y el repo
// guarda LF (lección de v597, que salió 4/12 por esto).
const eolDe = s => (s.includes('\r\n') ? '\r\n' : '\n');
let muerden = 0, total = 0, inertes = 0;

const INPUT_HOMBROS = '      <div class="fg"><label class="ilbl" for="med-hombros">Hombros (cm)</label><input class="inp" id="med-hombros" type="number" inputmode="decimal" step="0.1" placeholder="Ej: 118"><div class="medhint">Rodeando los dos hombros por la parte más ancha, con los brazos relajados a los lados. Es la más difícil de tomarte solo: pide ayuda o sáltala.</div></div>\n';

const matriz = [
  ['1· el campo existe y su CASILLA no (nadie podría llenarlo nunca)',
    'html', [[INPUT_HOMBROS, '']]],
  ['2· la casilla existe y el CAMPO no (se teclea y se tira al guardar)',
    'core', [["  { key: 'hombros',         label: 'Hombros',          grupo: 'Tronco' },\n", '']]],
  ['3· la casilla se queda sin PISTA de cómo medirlo (dos tomas ya no son comparables)',
    'html', [['<div class="medhint">Rodeando los dos hombros por la parte más ancha, con los brazos relajados a los lados. Es la más difícil de tomarte solo: pide ayuda o sáltala.</div>',
      '<div class="medhint">Hombros.</div>']]],
  ['4· a hombros se le declara un LADO que una cinta no puede medir',
    'core', [["{ key: 'hombros',         label: 'Hombros',          grupo: 'Tronco' },",
      "{ key: 'hombros',         label: 'Hombros',          grupo: 'Tronco', par: 'hombros', lado: 'izq' },"]]],
  ['5· hombros se va al final del grupo (Tronco desordenado respecto al cuerpo)',
    'core', [["  { key: 'hombros',         label: 'Hombros',          grupo: 'Tronco' },\n", ''],
      ["  { key: 'cadera',          label: 'Cadera',           grupo: 'Tronco' },",
        "  { key: 'cadera',          label: 'Cadera',           grupo: 'Tronco' },\n  { key: 'hombros',         label: 'Hombros',          grupo: 'Tronco' },"]]],
];

try {
  for (const [nombre, cual, pares] of matriz) {
    total++;
    const destino = cual === 'core' ? CORE : HTML;
    const original = cual === 'core' ? origCore : origHtml;
    const EOL = eolDe(original);
    let roto = original, aplicable = true;
    for (const [b, p] of pares) {
      const buscar = b.split('\n').join(EOL), poner = p.split('\n').join(EOL);
      if (roto.split(buscar).length - 1 !== 1) { aplicable = false; break; }
      roto = roto.split(buscar).join(poner);
    }
    if (!aplicable) {
      inertes++;
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto no aparece exactamente 1 vez (¿cambió el código?)`);
      continue;
    }
    writeFileSync(destino, roto, 'utf8');
    const [linea, rojo] = suiteRoja();
    writeFileSync(destino, original, 'utf8');
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite quedó VERDE'}`);
    if (rojo) muerden++;
  }
} finally {
  writeFileSync(CORE, origCore, 'utf8');   // los dos archivos vuelven como estaban, pase lo que pase
  writeFileSync(HTML, origHtml, 'utf8');
}

console.log(`\nMuerden ${muerden}/${total}` + (inertes ? ` · ${inertes} no se pudieron aplicar` : ''));
process.exitCode = (muerden === total) ? 0 : 1;
