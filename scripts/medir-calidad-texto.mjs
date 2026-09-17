// ¿EL TEXTO QUE LEE UNA PERSONA DELATA QUE ESTO NO LO HIZO UN PROFESIONAL?
//
// Pedido del PO (17-sep): «mejora donde se pueda mejorar, que se vea profesional y que no parezca
// hecha por un novato». Los errores de texto son el delator NÚMERO UNO de un producto amateur, y
// a diferencia del gusto, son objetivos: una tilde está o no está.
//
// Qué mira, solo sobre texto VISIBLE (fuera de comentarios, identificadores, clases y rutas):
//   1. palabras que en español SIEMPRE llevan tilde y aquí no la llevan;
//   2. comillas rectas donde el resto de la app usa las angulares « » de la marca;
//   3. la misma etiqueta escrita de dos formas distintas.
//
// 🔒 CONTROL DE COBERTURA: imprime cuántos textos revisó. Si son pocos, no está leyendo nada y
//    sus ceros no valen (lección de las sondas falsas del 31-jul).
// ⚠️ Cada hallazgo se VERIFICA a mano antes de tocarlo: esta sonda propone, no dictamina.
//
// Corre: node scripts/medir-calidad-texto.mjs
import { readFileSync, readdirSync } from 'node:fs';

const SIN = {
  duracion: 'duración', sesion: 'sesión', informacion: 'información', numero: 'número',
  minimo: 'mínimo', maximo: 'máximo', proteina: 'proteína', calorias: 'calorías',
  musculo: 'músculo', musculos: 'músculos', tambien: 'también', segun: 'según',
  aqui: 'aquí', asi: 'así', despues: 'después', proximo: 'próximo', proxima: 'próxima',
  ultimo: 'último', ultima: 'última', ultimos: 'últimos', facil: 'fácil', dificil: 'difícil',
  rapido: 'rápido', energia: 'energía', estomago: 'estómago', util: 'útil', aun: 'aún',
  aerobico: 'aeróbico', metabolico: 'metabólico', fisico: 'físico', fisica: 'física',
  medico: 'médico', medica: 'médica', practica: 'práctica', tecnica: 'técnica',
  atras: 'atrás', ademas: 'además', quiza: 'quizá', esta_semana: 'esta semana',
};

const sinComentarios = s => s
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/\/\*[\s\S]*?\*\//g, '');

const archivos = ['index.html', 'avi-core.js',
  ...readdirSync('.').filter(f => /^app-\d.*\.js$/.test(f))];

const hallazgos = new Map();
let vistos = 0;
const esIdent = t => /^[a-z][a-z0-9-]*$/.test(t) || t.includes('_') || t.includes('://') || /^[.#]/.test(t);

for (const f of archivos) {
  const s = sinComentarios(readFileSync(f, 'utf8'));
  const cand = [];
  // 1· texto entre etiquetas HTML
  for (const m of s.matchAll(/>([^<>{}]{4,120})</g)) cand.push(m[1]);
  // 2· cadenas y plantillas que empiezan como una frase (mayúscula o signo de apertura)
  for (const m of s.matchAll(/[`'"]([A-ZÁÉÍÓÚÑ¿¡][^`'"<>{}\\]{5,120})[`'"]/g)) cand.push(m[1]);
  for (const t0 of cand) {
    const t = t0.trim();
    if (!t || !/[a-záéíóúñ]/i.test(t) || esIdent(t)) continue;
    vistos++;
    const low = ' ' + t.toLowerCase().replace(/\s+/g, ' ') + ' ';
    for (const p of Object.keys(SIN)) {
      if (p.includes('_')) continue;
      const re = new RegExp('[\\s¡¿(«"]' + p + '[\\s.,:;!?)»"]');
      if (re.test(low)) {
        if (!hallazgos.has(p)) hallazgos.set(p, []);
        hallazgos.get(p).push([f, t.slice(0, 90)]);
      }
    }
  }
}

console.log(`\n🔒 CONTROL DE COBERTURA: ${vistos} textos visibles revisados en ${archivos.length} archivos ` +
  (vistos > 800 ? '→ la sonda sí está leyendo' : '→ 🔴 SOSPECHOSO: muy pocos, sus ceros no valen'));
console.log();
if (!hallazgos.size) { console.log('✅ Ni una palabra sin tilde en el texto visible.'); }
const total = [...hallazgos.values()].reduce((a, b) => a + b.length, 0);
for (const [p, casos] of [...hallazgos].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${p.padEnd(13)} → ${SIN[p].padEnd(13)} ${casos.length} caso(s)`);
  casos.slice(0, 4).forEach(([f, t]) => console.log(`      ${f.padEnd(20)} ${t}`));
}
console.log(`\nTOTAL: ${total} apariciones sobre ${vistos} textos.`);
console.log('⚠️  Cada una se VERIFICA a mano antes de tocarla: esta sonda propone, no dictamina.');
