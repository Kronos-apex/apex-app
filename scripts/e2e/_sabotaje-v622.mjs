// Matriz de sabotaje del MODELO C de la imagen compartida (v622): retrato de 580 px (54%), las
// cuatro cifras en UNA fila centrada y los récords compactos. En un lienzo no hay reflow que
// avise: lo que se sale o se monta encima sale en la imagen que la persona ya compartió.
//
// Corre: node scripts/e2e/_sabotaje-v622.mjs   (COMMITEA antes: reescribe archivos del repo)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const escribir = (url, texto) => {          // atómico (v611)
  const p = fileURLToPath(url), tmp = p + '.tmp';
  writeFileSync(tmp, texto, 'utf8');
  renameSync(tmp, p);
};
const F = { ent: new URL('../../app-4-entreno.js', import.meta.url) };
const RAIZ = new URL('../..', import.meta.url);
const suiteRoja = () => {
  try { execSync('node avi.test.js', { cwd: RAIZ, encoding: 'utf8', stdio: 'pipe' }); return ['', false]; }
  catch (e) { return [((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló', true]; }
};
const orig = Object.fromEntries(Object.entries(F).map(([k, u]) => [k, readFileSync(u, 'utf8')]));
let muerden = 0, total = 0, inertes = 0;

const matriz = [
  ['1· el retrato vuelve al tamaño de v619 (26%)', 'ent', [['const CR_R=290, CR_TOP=150,', 'const CR_R=140, CR_TOP=150,']]],
  ['2· las cifras vuelven a partirse en dos filas', 'ent', [['const cx=X0+i*(CW+GAP), cy=yc;', 'const cx=X0+(i%2)*(CW+GAP), cy=yc+Math.floor(i/2)*(CH+GAP);']]],
  ['3· la fila deja de centrarse con las cifras que haya', 'ent', [['X0=540-(cells.length*CW+Math.max(0,cells.length-1)*GAP)/2;', 'X0=90;']]],
  ['4· la cifra ya no se ajusta a su ficha', 'ent', [['    while(vs>26&&x.measureText(String(c2[1])).width>CW-26){vs-=2;x.font=_cf(vs,\'800\');}', '']]],
  ['5· las fichas se ensanchan y se salen del lienzo', 'ent', [['const CW=210,CH=150,', 'const CW=260,CH=150,']]],
  ['6· las cifras dejan de seguir al círculo', 'ent', [['let yc=764+_dy;', 'let yc=764;']]],
  ['7· el círculo crece sin que lo de abajo quepa (se monta sobre el pie)', 'ent', [['const CR_R=290, CR_TOP=150,', 'const CR_R=380, CR_TOP=150,']]],
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
