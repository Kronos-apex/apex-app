// Matriz de sabotaje de «EL VACÍO DE LA BÚSQUEDA TIENE QUE TENER SALIDA» (v599).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: esto no da NI UN ERROR. La pantalla se pinta, el mensaje sale, la
// app «funciona» — y la persona se queda dando vueltas probando nombres de un producto que nunca
// va a estar en una lista de alimentos base. Medido el 10-sep-2026: `food_barcodes` tenía **0 filas
// en toda la historia de la app** con el camino desplegado hacía un mes, y el primero en chocarse
// fue el propio PO. Un callejón sin salida no se cae: se abandona en silencio.
//
// Corre: node scripts/e2e/_sabotaje-v599.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const APP5 = new URL('../../app-5-salud.js', import.meta.url);
const RAIZ = new URL('../..', import.meta.url);
const suiteRoja = () => {
  try { execSync('node avi.test.js', { cwd: RAIZ, encoding: 'utf8', stdio: 'pipe' }); return ['', false]; }
  catch (e) { return [((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló', true]; }
};

const orig = readFileSync(APP5, 'utf8');
// El fin de línea se deriva del archivo (CRLF en la copia de trabajo, LF en el repo): un patrón
// con `\n` a pelo no aparece ni una vez y el sabotaje sale «inerte» (lección de v597).
const EOL = orig.includes('\r\n') ? '\r\n' : '\n';
const eol = s => s.split('\n').join(EOL);
let muerden = 0, total = 0, inertes = 0;

const matriz = [
  ['1· el vacío vuelve al callejón sin salida («prueba con otro nombre»)',
    [[`  if(!r.total)return html+\`<div class="empty" style="padding:24px">
      <div class="etxt">No encontramos «\${esc((_flView.q||'').slice(0,40))}»</div>`,
      `  if(!r.total)return html+\`<div class="empty" style="padding:24px">
      <div class="etxt">No encontramos ese alimento</div><div class="esub">Prueba con otro nombre — la lista tiene \${cat.length} alimentos.</div></div>\`;
  if(false)return html+\`<div class="empty" style="padding:24px">
      <div class="etxt">x</div>`]]],
  ['2· la salida del vacío deja de ser el botón PRIMARIO (se pierde entre el texto gris)',
    [['<button class="btn bp" style="width:100%;margin-top:14px" onclick="flEscanear()">📷 Cópialo del empaque</button>',
      '<button class="btn bg bsm" style="margin-top:14px" onclick="flEscanear()">📷 Cópialo del empaque</button>']]],
  ['3· el vacío deja de decir POR QUÉ no está (la salida parece un botón cualquiera)',
    [['<b>Si es un producto de marca</b> —una bebida, una barra, un yogur— no va a estar aquí por más que cambies el nombre.',
      'Prueba con otro nombre.']]],
  ['4· el escáner de arriba se esconde SIEMPRE (el caso normal se queda sin él)',
    [["      ${sinResultados?'':`<button class=\"btn bg\" style=\"width:100%;margin-top:8px\" onclick=\"flEscanear()\">📷 Escanear un empaque</button>`}",
      '']]],
  ['5· vuelven los DOS botones de escanear a la vez en el vacío',
    [['const sinResultados=cat.length&&!_flView.sel&&!r.total;', 'const sinResultados=false;']]],
];

try {
  for (const [nombre, pares] of matriz) {
    total++;
    let roto = orig, aplicable = true;
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
    writeFileSync(APP5, roto, 'utf8');
    const [linea, rojo] = suiteRoja();
    writeFileSync(APP5, orig, 'utf8');
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite quedó VERDE'}`);
    if (rojo) muerden++;
  }
} finally {
  writeFileSync(APP5, orig, 'utf8');   // el archivo vuelve como estaba, pase lo que pase
}

console.log(`\nMuerden ${muerden}/${total}` + (inertes ? ` · ${inertes} no se pudieron aplicar` : ''));
process.exitCode = (muerden === total) ? 0 : 1;
