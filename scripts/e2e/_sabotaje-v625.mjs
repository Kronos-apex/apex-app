// Matriz de sabotaje de «LOS MENSAJES SE UNEN, NUNCA SE REEMPLAZAN» (v625).
//
// El 5-ago-2026 el hilo propio del coach pasó de 29 mensajes a 2 porque el panel escribió la
// columna `msgs` entera con su copia en memoria. Aquí se comprueba que cada candado MUERDE.
//
// Corre: node scripts/e2e/_sabotaje-v625.mjs   (COMMITEA antes: reescribe archivos del repo)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const escribir = (url, texto) => {          // atómico (v611)
  const p = fileURLToPath(url), tmp = p + '.tmp';
  writeFileSync(tmp, texto, 'utf8');
  renameSync(tmp, p);
};
const F = { inf: new URL('../../app-1-infra.js', import.meta.url) };
const RAIZ = new URL('../..', import.meta.url);
const suiteRoja = () => {
  try { execSync('node avi.test.js', { cwd: RAIZ, encoding: 'utf8', stdio: 'pipe' }); return ['', false]; }
  catch (e) { return [((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló', true]; }
};
const orig = Object.fromEntries(Object.entries(F).map(([k, u]) => [k, readFileSync(u, 'utf8')]));
let muerden = 0, total = 0, inertes = 0;

const matriz = [
  ['1· el teléfono vuelve a subir su hilo entero desde memoria (el defecto original)', 'inf',
    [["    else if(k==='ax_m')      { await UD.upsertOwn({msgs:      await _msgsUnionCloud(_authUid,(v&&v[id])||[])}); }",
      "    else if(k==='ax_m')      { await UD.upsertOwn({msgs:      (v&&v[id])||[]}); }"]]],
  ['2· el panel deja de unir el hilo de un ASESORADO', 'inf',
    [["    const slice=(col==='msgs')?await _msgsUnionCloud(id,slice0):slice0;", '    const slice=slice0;']]],
  ['3· el panel deja de unir SU PROPIO hilo (el caso literal del 5-ago)', 'inf',
    [["      const slice=(col==='msgs')?await _msgsUnionCloud(_authUid,slice0):slice0;", '      const slice=slice0;']]],
  ['4· la unión no une: devuelve lo de este lado', 'inf',
    [['    return mergeMsgs(arr,lec.row.msgs);', '    return arr;']]],
  ['5· sin red se BLOQUEA el envío en vez de dejarlo salir (perdería el mensaje)', 'inf',
    [["    if(!lec||lec.estado!=='ok'||!lec.row||!Array.isArray(lec.row.msgs))return arr;",
      "    if(!lec||lec.estado!=='ok'||!lec.row||!Array.isArray(lec.row.msgs))return [];"]]],
  ['6· una lectura que revienta se lleva el mensaje por delante', 'inf',
    [['  }catch(e){ return arr; }', '  }catch(e){ return []; }']]],
  ['7· sin fila propia se devuelve vacío en vez de lo que hay', 'inf',
    [["  if(!rowId||!UD.readClientCol||typeof mergeMsgs!=='function')return arr;",
      "  if(!rowId||!UD.readClientCol||typeof mergeMsgs!=='function')return [];"]]],
  // ⚠️ El ancla lleva la línea VECINA porque `const val=(col==='msgs')?…` aparece DOS veces (la
  //    fila propia y la de cada asesorado) y con indentaciones distintas: sin el vecino no es
  //    único y el runner grita «NO SE APLICÓ», que no es un aprobado.
  ['8· lo confirmado se guarda con la copia vieja (el siguiente guardado cree que la nube tiene menos)', 'inf',
    [["    const val=(col==='msgs')?JSON.stringify(slice):val0;\n    if(col==='msgs'&&DB.msgs)DB.msgs[id]=slice;",
      '    const val=val0;']]],
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
