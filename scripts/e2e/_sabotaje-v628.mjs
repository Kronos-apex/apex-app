// Matriz de sabotaje de «LAS CIFRAS SE ESCRIBEN IGUAL EN TODOS LOS TELÉFONOS» (v628).
// Corre: node scripts/e2e/_sabotaje-v628.mjs   (COMMITEA antes: reescribe archivos del repo)
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
  a4: new URL('../../app-4-entreno.js', import.meta.url),
  a3: new URL('../../app-3-coach.js', import.meta.url),
  css: new URL('../../styles.css', import.meta.url),
};
const RAIZ = new URL('../..', import.meta.url);
const suiteRoja = () => {
  try { execSync('node avi.test.js', { cwd: RAIZ, encoding: 'utf8', stdio: 'pipe' }); return ['', false]; }
  catch (e) { return [((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló', true]; }
};
const orig = Object.fromEntries(Object.entries(F).map(([k, u]) => [k, readFileSync(u, 'utf8')]));
let muerden = 0, total = 0, inertes = 0;

const matriz = [
  ['1· fmtMiles vuelve a usar coma de miles (inglés)', 'core',
    [[".replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.');", ".replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');"]]],
  ['2· fmtMiles pierde el decimal con coma', 'core',
    [["(partes[1] ? ',' + partes[1] : '')", "(partes[1] ? '.' + partes[1] : '')"]]],
  ['3· fmtMiles no ataja NaN', 'core',
    [["if (!isFinite(x)) return '0';", "if (false) return '0';"]]],
  ['4· el volumen de la sesión vuelve a toLocaleString()', 'a4',
    [["stats.push(['🏋️','Volumen',fmtMiles(s.totalVol)+' kg','#10b981']);", "stats.push(['🏋️','Volumen',s.totalVol.toLocaleString()+' kg','#10b981']);"]]],
  ['5· el coach vuelve a formatear las kcal con el idioma del teléfono', 'a3',
    [["<div class=\"vmac-kcal\">${fmtMiles(kcalObj)} kcal/día</div>", "<div class=\"vmac-kcal\">${kcalObj.toLocaleString()} kcal/día</div>"]]],
  ['6· la fecha vuelve a «17 De Septiembre»', 'css',
    [[".sroom-date{font-size:12px;color:rgba(234,251,244,.7);font-weight:600}", ".sroom-date{font-size:12px;color:rgba(234,251,244,.7);font-weight:600;text-transform:capitalize}"]]],
  ['7· el +150 kg se vuelve a partir', 'css',
    [["font-size:13px;white-space:nowrap}", "font-size:13px}"]]],
  ['8· vuelven las comillas rectas a la rutina', 'a4',
    [["Tócala en «Hoy» o usa <b>«Hacer esta rutina ahora»</b>", "Tócala en \"Hoy\" o usa <b>\"Hacer esta rutina ahora\"</b>"]]],
  ['9· la cabecera de la rutina vuelve al emoji 📋', 'a4',
    [["${typeof aviIcon==='function'?aviIcon('clipboard',26):'📋'}</div>", "📋</div>"]]],
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
