// Matriz de sabotaje de v629 (etiquetas de la gráfica, «120 kg»), v630 (iconos de estado) y
// v631 (calorías y gramos con formato, tarjeta de descanso).
// Corre: node scripts/e2e/_sabotaje-v629-631.mjs   (COMMITEA antes: reescribe archivos del repo)
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
  a2: new URL('../../app-2-login.js', import.meta.url),
  a3: new URL('../../app-3-coach.js', import.meta.url),
  a4: new URL('../../app-4-entreno.js', import.meta.url),
  a5: new URL('../../app-5-salud.js', import.meta.url),
  html: new URL('../../index.html', import.meta.url),
};
const RAIZ = new URL('../..', import.meta.url);
const suiteRoja = () => {
  try { execSync('node avi.test.js', { cwd: RAIZ, encoding: 'utf8', stdio: 'pipe' }); return ['', false]; }
  catch (e) { return [((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló', true]; }
};
const orig = Object.fromEntries(Object.entries(F).map(([k, u]) => [k, readFileSync(u, 'utf8')]));
let muerden = 0, total = 0, inertes = 0;

const matriz = [
  // v629
  ['1· un plano cuenta como valle', 'core', [['return vec.length > 0 && vec.every(x => x > v);', 'return vec.length > 0 && vec.every(x => x >= v);']]],
  ['2· la gráfica ignora de qué lado va la etiqueta', 'a2', [['const ly=abajo?(p.y+13):(p.y-6);', 'const ly=(p.y-6);']]],
  ['3· vuelve el volteo por altura', 'a2', [['const abajo=typeof chartLabelBelow===\'function\'&&chartLabelBelow(vals,i);', 'const abajo=p.y<16;']]],
  ['4· un peso vuelve a pegarse a su unidad', 'a4', [['best=bw>0?`${bw} kg ×', 'best=bw>0?`${bw}kg ×']]],
  // v630
  ['5· vuelve el candado amarillo 🔒', 'a3', [['<div class="ic-circle">${_coIco(\'lock\',22,\'🔒\')}</div>', '<div style="font-size:26px;margin-bottom:6px">🔒</div>']]],
  ['6· vuelve el 👓 del aviso de letra', 'html', [['<div class="ic-circle" style="width:56px;height:56px">', '<div style="font-size:44px;margin-bottom:4px">👓</div><div hidden>']]],
  // v631
  ['7· la franja vuelve a mezclar formatos', 'a5', [['Hoy te toca entre <b>${fmtMiles(band.lo)}</b>', 'Hoy te toca entre <b>${band.lo}</b>']]],
  ['8· el titular del plan vuelve a «2400»', 'a5', [['${esc(fmtMiles(_kcalReal))}', '${esc(String(_kcalReal))}']]],
  ['9· un gramo se vuelve a pegar', 'a3', [['<div class="vmac-n">${macros.prot_g} g</div>', '<div class="vmac-n">${macros.prot_g}g</div>']]],
  ['10· la cabecera de nutrición vuelve al 🥗', 'a5', [['border:1px solid #10b98155;color:#10b981">${typeof aviIcon===\'function\'?aviIcon(\'apple\',26):\'🥗\'}</div>', 'border:1px solid #10b98155">🥗</div>']]],
  ['11· el descanso vuelve a contar ceros', 'a4', [['${exN?`<span class="rcpill">${exN} ejercicio', '${true?`<span class="rcpill">${exN} ejercicio']]],
];

try {
  for (const [nombre, cual, pares] of matriz) {
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
    total++; if (rojo) muerden++;
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite quedó VERDE'}`);
  }
} finally {
  for (const [k, u] of Object.entries(F)) escribir(u, orig[k]);
}
console.log(`\nMuerden ${muerden}/${total}` + (inertes ? ` · ${inertes} no se pudieron aplicar` : ''));
process.exitCode = (muerden === total && !inertes) ? 0 : 1;
