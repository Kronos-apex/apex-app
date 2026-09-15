// Matriz de sabotaje de «EL RETRATO DE LA IMAGEN COMPARTIDA, MÁS GRANDE» (v619).
//
// Por qué hace falta versionada: en un lienzo NO HAY REFLOW QUE AVISE. Si el círculo crece y lo
// de abajo no baja, o baja de más, nada da error: sale en la imagen que la persona ya compartió
// en su historia. El PO reportó el 15-sep que la foto se veía muy pequeña (radio 92 = 17% del
// ancho) y agrandarla empuja las cinco cosas que van debajo.
//
// Corre: node scripts/e2e/_sabotaje-v619.mjs
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const escribir = (url, texto) => {          // atómico (v611)
  const p = fileURLToPath(url), tmp = p + '.tmp';
  writeFileSync(tmp, texto, 'utf8');
  renameSync(tmp, p);
};
const F = { app4: new URL('../../app-4-entreno.js', import.meta.url) };
const RAIZ = new URL('../..', import.meta.url);
const suiteRoja = () => {
  try { execSync('node avi.test.js', { cwd: RAIZ, encoding: 'utf8', stdio: 'pipe' }); return ['', false]; }
  catch (e) { return [((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló', true]; }
};
const orig = Object.fromEntries(Object.entries(F).map(([k, u]) => [k, readFileSync(u, 'utf8')]));
const eolDe = s => (s.includes('\r\n') ? '\r\n' : '\n');
let muerden = 0, total = 0, inertes = 0;

const matriz = [
  ['1· el retrato vuelve a ser chico (el defecto que reportó el PO)',
    'app4', [['  const CR_R=140, CR_TOP=200, CR_CY=CR_TOP+CR_R;', '  const CR_R=92, CR_TOP=238, CR_CY=CR_TOP+CR_R;']]],
  ['2· el retrato crece y lo de abajo NO baja: se monta sobre el nombre y el pie',
    'app4', [['  const _dy=(CR_CY+CR_R)-422;', '  const _dy=0;']]],
  ['3· el círculo vuelve a dibujarse con números escritos a mano',
    'app4', [['    _wfDrawCrest(x,540,CR_CY,CR_R,d.fullName||d.name,_wfShareAvatar,F);',
      '    _wfDrawCrest(x,540,330,92,d.fullName||d.name,_wfShareAvatar,F);']]],
  ['4· el retrato crece TANTO que el caso apretado se come la raya del pie',
    'app4', [['  const CR_R=140, CR_TOP=200, CR_CY=CR_TOP+CR_R;', '  const CR_R=260, CR_TOP=200, CR_CY=CR_TOP+CR_R;']]],
  ['5· las cifras se quedan donde estaban (el círculo nuevo las tapa)',
    'app4', [['  let yc=790+_dy;', '  let yc=790;']]],
  ['6· el nombre se queda donde estaba, debajo del círculo viejo',
    'app4', [['    x.fillText(d.name,540,492+_dy);', '    x.fillText(d.name,540,492);']]],
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
