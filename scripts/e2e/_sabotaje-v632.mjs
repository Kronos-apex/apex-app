// Matriz de sabotaje de v632 (día 1 de un toque, iniciales, emoji compuesto, «+ Rutina»).
// Derivada de la de v629 (etiquetas de la gráfica, «120 kg»), v630 (iconos de estado) y
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
  a1: new URL('../../app-1-infra.js', import.meta.url),
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
  ['1· vuelve el emoji compuesto de «Cansado»', 'core', [["{ id: 'cansado', emoji: '😴', label: 'Cansado' },", "{ id: 'cansado', emoji: '😮‍💨', label: 'Cansado' },"]]],
  ['2· las iniciales vuelven a tomar w[0]', 'a1', [[String.raw`const letras=String(n||'').trim().split(/\s+/).map(w=>(w.match(/\p{L}/u)||[''])[0]).filter(Boolean);`, String.raw`const letras=String(n||'').trim().split(/\s+/).map(w=>w[0]).filter(Boolean);`]]],
  ['3· el botón del día 1 vuelve a solo bajar', 'a4', [["if(typeof expandTodayWorkout==='function'){ expandTodayWorkout(); return; }", ""]]],
  ['4· la tarjeta repetida vuelve con la portada', 'a4', [["con.innerHTML=(_heroOK||_portada)?'':_startCardHTML(client,todayR);", "con.innerHTML=_heroOK?'':_startCardHTML(client,todayR);"]]],
  ['5· vuelve el 💪 a la portada', 'a4', [[`'<div class="ic-circle" aria-hidden="true">'+(typeof aviIcon==='function'?aviIcon('barbell',22):'💪')+'</div>'+`, `'<div class="fr-emoji" aria-hidden="true">💪</div>'+`]]],
  ['6· «+ Rutina» vuelve al color de alerta', 'html', [['<button class="btn bp bsm" style="flex:1" onclick="openNewRoutine()">+ Rutina</button>', '<button class="btn bo bsm" style="flex:1" onclick="openNewRoutine()">+ Rutina</button>']]],
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
