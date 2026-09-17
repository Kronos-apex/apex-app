// ¿HAY EMOJI HACIENDO DE ICONO DENTRO DE UN CONTROL, TENIENDO UN SPRITE SVG PROPIO?
//
// Pedido del PO (17-sep): «que se vea profesional y que no parezca hecha por un novato». Mirando
// las capturas, el delator más claro del panel era un 📲 DENTRO del botón «Instalar app»: un emoji
// no hereda el color del botón, se dibuja distinto en cada sistema operativo y convive con los SVG
// limpios del nav a dos centímetros.
//
// 🔴 ALCANCE, Y POR QUÉ ES TAN ESTRECHO. Esta sonda nació contando «218 emoji como icono» y era
//    FALSO cuatro veces seguidas, cada vez por una razón distinta:
//      · contaba los MENSAJES («⚠️ El nombre es obligatorio», «✅ Andrés añadido»), que son voz de
//        marca dentro de una frase y se quedan;
//      · al arreglar eso, empezó a contar los ICONOS DE LOS EJERCICIOS (`icon:'🏋️'`), que son
//        DATOS del catálogo, no interfaz.
//    Una sonda estática **no puede** distinguir icono de dato ni de voz de marca leyendo texto.
//    Así que solo mira lo que sí puede afirmar: **emoji dentro de un `<button>` del marcado
//    estático**, donde el elemento ES un control y se ve. Lo que queda fuera se mira a ojo, en las
//    capturas — que es como se encontró el del botón de instalar.
//
// Corre: node scripts/medir-emoji-como-icono.mjs
import { readFileSync } from 'node:fs';

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F000}-\u{1F0FF}]\u{FE0F}?/gu;
const html = readFileSync('index.html', 'utf8').replace(/<!--[\s\S]*?-->/g, '');

const controles = [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)];
const conEmoji = [];
for (const m of controles) {
  const dentro = m[1];
  const hay = dentro.match(EMOJI);
  if (!hay) continue;
  const texto = dentro.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  conEmoji.push([hay.join(''), texto.slice(0, 60)]);
}

console.log(`\n🔒 COBERTURA: ${controles.length} botones del marcado estático revisados`);
console.log(controles.length > 60 ? '   → la sonda sí está leyendo los controles\n'
  : '   → 🔴 SOSPECHOSO: muy pocos botones, revisar el patrón\n');
if (!conEmoji.length) {
  console.log('✅ Ni un emoji haciendo de icono dentro de un botón.');
} else {
  console.log(`🔴 ${conEmoji.length} botón(es) con un emoji dentro:`);
  conEmoji.forEach(([e, t]) => console.log(`   ${e}   ${t}`));
}
console.log('\n⚠️  Esto NO cubre: los botones que arma el JS, los iconos de los ejercicios (son datos)');
console.log('   ni los emoji dentro de frases (voz de marca). Eso se mira en las capturas.');
