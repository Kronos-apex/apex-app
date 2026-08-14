// Matriz de sabotaje de LA CARGA EN LA SEMANA DE DESCARGA (v482).
// Rompe cada candado nuevo y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: este frente ya demostró que un candado puede pintar VERDE encima
// del defecto durante 48 versiones. El check D2 del harness comparaba la sugerencia de descarga
// contra la sugerencia NORMAL —que venía subida un escalón por la progresión— en vez de contra el
// récord, así que leía «bajó un 10%» mientras la persona recibía más peso del que ya levantaba.
// Un candado con el oráculo equivocado es peor que no tener candado: da tranquilidad falsa.
//
// Corre: node scripts/e2e/_sabotaje-deload.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// ⚠️ Los patrones se anclan en UNA sola línea (los finales de línea del repo no son estables).
const SABOTAJES = [
  ['1· cae el TOPE contra el récord: vuelve el defecto original (el factor sobre el peso ya subido)',
    '  const partida = (rec > 0) ? Math.min(base, rec) : base;',
    '  const partida = base;'],
  ['2· el redondeo puede EMPATAR el récord (récord de 1 kg → «descarga» de 1 kg)',
    '  if (rec > 0 && kg >= rec) return Math.max(0.5, Math.round((rec - 0.5) * 2) / 2);',
    '  if (false) return 0;'],
  ['3· la descarga deja de descargar del todo (el factor se vuelve 1)',
    '  const kg = Math.round(partida * DELOAD_LOAD_FACTOR * 2) / 2;',
    '  const kg = Math.round(partida * 2) / 2;'],
  ['4· la frase para quien no tiene récord se apaga (9 de 21 personas vuelven a no recibir nada)',
    '  return DELOAD_NO_PR_HINT;',
    '  return null;'],
  ['5· la frase se le suelta también a quien está en fase de adaptación (lo que prohibió Andrés)',
    '  if (isInAdaptation(client, history, now)) return null;',
    '  if (false) return null;'],
  ['6· la frase se cuela en cardio y en isométricos («baja el peso» de una plancha)',
    "  if (exTrack(ex) !== 'peso_reps') return null;",
    '  if (false) return null;'],
  ['7· la frase se muestra fuera de la semana de descarga',
    '  if (!deloadState(client, now)) return null;',
    '  if (false) return null;'],
  ['8· la frase vuelve a hablar en jerga de entrenador',
    "const DELOAD_NO_PR_HINT = 'Esta semana agarra la mancuerna que sigue por debajo de la de siempre. '",
    "const DELOAD_NO_PR_HINT = 'Esta semana entrena al 60% de tu 1RM con RIR 5. '"],
];
// ⚠️ NO se pone aquí un «sabotaje» que AFLOJE el factor (0,85 → 0,95): aflojar un tope deja la
// suite verde por definición y nunca mordería. Contra eso protege la cifra medida escrita junto al
// número (mediana −15,0% sobre 186 casos reales, `scripts/deload-carga.mjs`, 14-ago) y la banda
// que firmó Andrés — no una matriz. Es la misma nota que dejó `_sabotaje-carb2`.

const RUTA = new URL('../../avi-core.js', import.meta.url);
const ORIGINAL = readFileSync(RUTA, 'utf8');

let muerden = 0;
try {
  for (const [nombre, buscar, poner] of SABOTAJES) {
    const veces = ORIGINAL.split(buscar).length - 1;
    if (veces !== 1) {
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto aparece ${veces} veces (esperaba 1)`);
      continue;
    }
    writeFileSync(RUTA, ORIGINAL.replace(buscar, poner), 'utf8');
    let rojo = false, linea = '';
    try {
      const out = execSync('node --test avi.test.js', { cwd: new URL('../..', import.meta.url), encoding: 'utf8', stdio: 'pipe' });
      linea = (out.match(/AVI Tests: .*/) || [''])[0];
    } catch (e) {
      rojo = true;
      linea = ((e.stdout || '').match(/AVI Tests: .*/) || [''])[0];
    }
    writeFileSync(RUTA, ORIGINAL, 'utf8');
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite ni corrió'}`);
    if (rojo) muerden++;
  }
} finally {
  writeFileSync(RUTA, ORIGINAL, 'utf8');
}
console.log(`\n${muerden === SABOTAJES.length ? '✅' : '🔴'} Sabotajes que muerden: ${muerden}/${SABOTAJES.length}`);
process.exit(muerden === SABOTAJES.length ? 0 : 1);
