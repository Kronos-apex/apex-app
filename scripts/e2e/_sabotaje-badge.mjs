// Matriz de sabotaje de «EL ICONITO DE LA BARRA DE ESTADO NO PUEDE SER UNA MANCHA» (v596).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: esto no da error nunca. Una notificación con el badge
// equivocado se entrega, suena y se abre igual — solo que en la barra de estado sale una mancha
// sólida en vez de la marca. Lo reportó el PO mirando su teléfono, no un test.
//
// Corre: node scripts/e2e/_sabotaje-badge.mjs
import { readFileSync, writeFileSync, copyFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';

const SW = new URL('../../sw.js', import.meta.url);
const BADGE = new URL('../../icons/badge-96.png', import.meta.url);
const OPACO = new URL('../../icons/icon-192.png', import.meta.url);

const RAIZ = new URL('../..', import.meta.url);
const suiteRoja = () => {
  try { execSync('node avi.test.js', { cwd: RAIZ, encoding: 'utf8', stdio: 'pipe' }); return ['', false]; }
  catch (e) { return [((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló', true]; }
};

const swOrig = readFileSync(SW, 'utf8');
const badgeOrig = readFileSync(BADGE);
let muerden = 0, total = 0;

const texto = [
  ['1· el badge vuelve a apuntar al ícono a color (la mancha de antes)',
    "badge: '/apex-app/icons/badge-96.png'", "badge: '/apex-app/icons/icon-192.png'"],
  ['2· el badge sale del precache: sin red vuelve el ícono genérico',
    ", '/apex-app/icons/badge-96.png']", "]"],
];

try {
  for (const [nombre, buscar, poner] of texto) {
    total++;
    if (swOrig.split(buscar).length - 1 !== 1) {
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto no aparece exactamente 1 vez`);
      continue;
    }
    writeFileSync(SW, swOrig.split(buscar).join(poner), 'utf8');
    const [linea, rojo] = suiteRoja();
    writeFileSync(SW, swOrig, 'utf8');
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite quedó VERDE'}`);
    if (rojo) muerden++;
  }

  // 3· El archivo del badge se reemplaza por uno OPACO. Es el sabotaje que de verdad importa:
  //    el cableado puede estar perfecto y la imagen ser un cuadrado — que es el defecto original.
  total++;
  copyFileSync(new URL(OPACO), new URL(BADGE));
  {
    const [linea, rojo] = suiteRoja();
    console.log(`  ${rojo ? '✅' : '🔴'} 3· el archivo del badge se cambia por uno OPACO\n      ${linea || 'la suite quedó VERDE'}`);
    if (rojo) muerden++;
  }
} finally {
  writeFileSync(SW, swOrig, 'utf8');
  writeFileSync(BADGE, badgeOrig);
}

console.log(`\n${muerden === total ? '✅' : '🔴'} Sabotajes que muerden: ${muerden}/${total}`);
process.exit(muerden === total ? 0 : 1);
