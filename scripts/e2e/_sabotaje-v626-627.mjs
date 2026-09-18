// Matriz de sabotaje de «LOS CONTROLES LLEVAN ICONO, NO EMOJI» (v626) y «LOS BOTONES SIGUEN LA
// CONVENCIÓN DE LA APP» (v627).
//
// Incluye el CONTROL que importa aquí: un emoji dentro de <span class="t-ic" data-ic="…"> NO debe
// morder, porque `aviIconizeStatic` lo cambia por SVG al cargar y nadie lo ve. La primera versión
// del test de v627 acusaba justo esos — medía el código fuente, no la pantalla.
//
// Corre: node scripts/e2e/_sabotaje-v626-627.mjs   (COMMITEA antes: reescribe archivos del repo)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const escribir = (url, texto) => {          // atómico (v611)
  const p = fileURLToPath(url), tmp = p + '.tmp';
  writeFileSync(tmp, texto, 'utf8');
  renameSync(tmp, p);
};
const F = {
  html: new URL('../../index.html', import.meta.url),
  login: new URL('../../app-2-login.js', import.meta.url),
  coach: new URL('../../app-3-coach.js', import.meta.url),
};
const RAIZ = new URL('../..', import.meta.url);
const suiteRoja = () => {
  try { execSync('node avi.test.js', { cwd: RAIZ, encoding: 'utf8', stdio: 'pipe' }); return ['', false]; }
  catch (e) { return [((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló', true]; }
};
const orig = Object.fromEntries(Object.entries(F).map(([k, u]) => [k, readFileSync(u, 'utf8')]));
let muerden = 0, total = 0, inertes = 0, controlesOk = 0, controles = 0;

// [nombre, archivo, [[buscar, poner]], esRojoEsperado]
const matriz = [
  // ── v626 ──
  // ⚠️ El svg del ojo aparece 8 veces (8 campos de contraseña): el ancla lleva el de ENTRAR para ser única.
  ['1· el ojo de la contraseña vuelve a ser un emoji', 'html',
    [[`onclick="togglePass(this,'lp')" aria-label="Mostrar contraseña" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:18px;line-height:1;padding:6px;opacity:.7"><svg class="ic-eye" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-eye"/></svg></button>`,
      `onclick="togglePass(this,'lp')" aria-label="Mostrar contraseña" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:18px;line-height:1;padding:6px;opacity:.7">\u{1F441}</button>`]], true],
  ['2· falta el símbolo del ojo en el sprite (el botón quedaría en blanco)', 'html',
    [['<symbol id="i-eye" viewBox', '<symbol id="i-eye-XX" viewBox']], true],
  ['3· alternar la contraseña escribe texto encima (borra el icono)', 'login',
    [["  if(uso) uso.setAttribute('href',show?'#i-eye-off':'#i-eye');\n  else btn.textContent=show?'🙈':'👁';", "  btn.textContent=show?'🙈':'👁';"]], true],
  ['4· la etiqueta del lector de pantalla deja de cambiar', 'login',
    [["  btn.setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña');\n}", "  btn.setAttribute('aria-label','Mostrar contraseña');\n}"]], true],
  ['5· la píldora «Instalar app» vuelve al emoji', 'html',
    [['<svg viewBox="0 0 24 24" aria-hidden="true" style="width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0"><use href="#i-install"/></svg> Instalar app', '<span style="font-size:18px">\u{1F4F2}</span> Instalar app']], true],
  ['6· el saludo del coach vuelve a traer 👋 (la puerta que repinta)', 'login',
    [["(h<13?'Buenos días':h<20?'Buenas tardes':'Buenas noches');", "(h<13?'Buenos días':h<20?'Buenas tardes':'Buenas noches')+' 👋';"]], true],
  ['7· vuelven las comillas rectas a la primera pantalla', 'html',
    [['<strong>«Instalar aplicación»</strong>', '<strong>"Instalar aplicación"</strong>']], true],
  // ── v627 ──
  ['8· un botón de guardar vuelve a llevar 💾', 'html',
    [['onclick="saveNutrition()">Guardar plan</button>', 'onclick="saveNutrition()">\u{1F4BE} Guardar plan</button>']], true],
  ['9· el contador del generador vuelve a escribir 🚫 (la SEGUNDA puerta)', 'coach',
    [['eb.textContent=`Excluidos (${p.exclude.length})`', 'eb.textContent=`\u{1F6AB} Excluidos (${p.exclude.length})`']], true],
  // ── CONTROL: esto NO debe morder ──
  ['C· CONTROL: un emoji DENTRO de un t-ic (se vuelve SVG al cargar) no se acusa', 'html',
    [['onclick="saveNutrition()">Guardar plan</button>', 'onclick="saveNutrition()"><span class="t-ic" data-ic="check">✅</span> Guardar plan</button>']], false],
];

try {
  for (const [nombre, cual, pares, debeMorder] of matriz) {
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
    if (debeMorder) {
      total++; if (rojo) muerden++;
      console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite quedó VERDE'}`);
    } else {
      controles++; if (!rojo) controlesOk++;
      console.log(`  ${!rojo ? '✅' : '🔴'} ${nombre}\n      ${rojo ? linea + ' ← el test acusa algo que nadie ve' : 'la suite quedó VERDE, como debe'}`);
    }
  }
} finally {
  for (const [k, u] of Object.entries(F)) escribir(u, orig[k]);
}
console.log(`\nMuerden ${muerden}/${total} · controles ${controlesOk}/${controles}` + (inertes ? ` · ${inertes} no se pudieron aplicar` : ''));
process.exitCode = (muerden === total && controlesOk === controles && !inertes) ? 0 : 1;
