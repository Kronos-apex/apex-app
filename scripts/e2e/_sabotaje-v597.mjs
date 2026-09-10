// Matriz de sabotaje de «EL CIERRE LLEVA SU CARA Y SU NOMBRE» (v597).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: NADA de esto da error nunca. La imagen se genera igual, se
// comparte igual y la pantalla de cierre sale igual — solo que sin decir de quién es, o con un
// cuadro roto donde iba la cara, o (el caso que de verdad muerde) sin poder compartir nada porque
// una foto de otro origen tiñó el lienzo y `toBlob` lanzó. Un candado que solo mira el fuente hay
// que romperlo a propósito para saber si muerde.
//
// Corre: node scripts/e2e/_sabotaje-v597.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const APP4 = new URL('../../app-4-entreno.js', import.meta.url);
const RAIZ = new URL('../..', import.meta.url);
const suiteRoja = () => {
  try { execSync('node avi.test.js', { cwd: RAIZ, encoding: 'utf8', stdio: 'pipe' }); return ['', false]; }
  catch (e) { return [((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló', true]; }
};

const orig = readFileSync(APP4, 'utf8');
// 🔴 EL FIN DE LÍNEA NO SE ASUME. El archivo está en CRLF en Windows y en LF en CI (v594 puso a
// CI en rojo justo por esto): un patrón con `\n` a pelo no aparece NI UNA VEZ y los 8 sabotajes
// salen «no se pudieron aplicar», que se lee como un problema del código y no de la sonda.
const EOL = orig.includes('\r\n') ? '\r\n' : '\n';
const eol = s => s.split('\n').join(EOL);
let muerden = 0, total = 0, inertes = 0;

// [nombre, [[buscar, poner], …]] — varias sustituciones cuando quitar el candado a medias
// dejaría el archivo sin compilar (y «la suite ni compiló» es una señal pobre).
const matriz = [
  ['1· la pantalla deja de pedir el retrato (el cable, cortado en el extremo de la pantalla)',
    [['  _wfRenderCrest(c);\n', '']]],
  ['2· el retrato deja de salir del dato real (lee un campo que no existe)',
    [["const src=(client&&client.avatar)||'';", "const src=(client&&client.foto)||'';"]]],
  // `if(!src)return;` y `img.src=src;` aparecen DOS veces cada uno (también en
  // `_wfPrepShareAvatar`), así que se anclan con su vecino: un patrón ambiguo no se aplica y el
  // sabotaje sale «inerte», que se lee como si el código hubiera cambiado.
  ['3· sin foto ya no queda el trofeo (quedaría el hueco)',
    [['  _wfPrepShareAvatar(src);\n  if(!src)return;\n', '  _wfPrepShareAvatar(src);\n']]],
  ['4· se va el respaldo de la foto rota (cuadro roto sobre la celebración)',
    [['  img.onerror=trofeo;\n', '']]],
  ['5· la foto de usuario vuelve a un url() de CSS (una URL con apóstrofo rompe la regla)',
    [["'wf-crest-photo');};\n  img.src=src;", "'wf-crest-photo');};\n  el.style.backgroundImage=\"url('\"+src+\"')\";"]]],
  ['6· la imagen deja de DIBUJAR el nombre (vuelve a no decir de quién es)',
    [['    x.fillText(d.name,282,424);\n', '']]],
  ['7· el nombre deja de encogerse (un nombre largo se sale del lienzo sin avisar)',
    [["    while(fs>34&&x.measureText(d.name).width>690){fs-=4;x.font='900 '+fs+'px '+F;}\n", '']]],
  ['8· la foto remota deja de pedirse con CORS (tiñe el lienzo)',
    [["  if(!/^data:/i.test(src))img.crossOrigin='anonymous';\n", '']]],
  ['9· se va la sonda de teñido (la única forma de saberlo es leer un píxel)',
    [['px.getImageData(0,0,1,1); // lanza si quedó teñido', '']]],
  ['10· `toBlob` vuelve a correr a pelo (un lienzo teñido se lleva el cierre entero)',
    [['  try{\n  cv.toBlob(async blob=>{', '  cv.toBlob(async blob=>{'],
     ["  }catch(e){ toast('No se pudo crear la imagen'); }\n", '']]],
  ['11· el nombre completo deja de viajar (el círculo pierde iniciales y color)',
    [["fullName:((c&&c.name)||'').trim(),", '']]],
  ['12· el color del avatar se separa de su tinta (candado viejo del 29-jul sobre código nuevo)',
    [["const col=(typeof avc==='function'&&name)?avc(name):'#0A7C5B', tinta=(typeof inkOn==='function')?inkOn(col):'#FFFFFF';",
      "const col=(typeof avc==='function'&&name)?avc(name):'#0A7C5B';\n    const tinta='#FFFFFF';"]]],
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
    writeFileSync(APP4, roto, 'utf8');
    const [linea, rojo] = suiteRoja();
    writeFileSync(APP4, orig, 'utf8');
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite quedó VERDE'}`);
    if (rojo) muerden++;
  }
} finally {
  writeFileSync(APP4, orig, 'utf8');   // el archivo vuelve como estaba, pase lo que pase
}

console.log(`\nMuerden ${muerden}/${total}` + (inertes ? ` · ${inertes} no se pudieron aplicar` : ''));
process.exitCode = (muerden === total) ? 0 : 1;
