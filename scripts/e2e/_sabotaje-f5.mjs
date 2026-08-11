// Matriz de sabotaje de F5 (el escáner de códigos). Rompe a propósito cada candado y exige que la
// suite se ponga ROJA. Un candado que no muerde no es un candado — y se ha visto tres veces en
// este repo que un sabotaje SALGA VERDE (test débil, código redundante, o parche no aplicado).
// Corre: node scripts/e2e/_sabotaje-f5.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// Cada sabotaje: [nombre, texto a buscar, texto con el que se reemplaza, archivo?].
// Sin archivo se entiende `avi-core.js` (la capa pura). Los de interfaz dicen el suyo.
const SABOTAJES = [
  ['1· eanValid deja de mirar el dígito de control (el código tecleado a medias entra)',
    'return dc == null || dc === parseInt(s[s.length - 1], 10);',
    'return true;'],
  ['2· labelPer100 no convierte: la etiqueta «por porción» entra como si fuera por 100 g',
    'return Math.round((x * 100 / g) * 10) / 10;',
    'return Math.round(x * 10) / 10;'],
  ['3· barcodeDraft pierde el espejo del CHECK p+c+f<=100 (el insert volvería con error de motor)',
    "errores.suma = 'Proteína, carbohidratos y grasa suman '",
    "errores._muerto = 'Proteína, carbohidratos y grasa suman '"],
  ['4· la porción se valida DESPUÉS de convertir: el error acusa a los macros que sí llenó',
    'if (porBase && !(Number.isFinite(porcion) && porcion > 0 && porcion <= FOOD_BC_MAX.un_g)) {',
    'if (false) {'],
  ['5· el aviso de kcal pasa a BLOQUEAR (el empaque raro deja a la persona sin registrar)',
    'return { ok: !hayError, errores: errores, aviso: aviso, fila: fila };',
    'if (aviso) errores.kcal = aviso;\n  return { ok: !Object.keys(errores).length ? false : false, errores: errores, aviso: aviso, fila: null };'],
  ['6· foodCatalog: lo escaneado SUSTITUYE en vez de sumarse cuando no hay foods.json',
    'if (!out.length) base.forEach(push);',
    'if (!out.length && !(Array.isArray(extra) && extra.length)) base.forEach(push);'],
  ['7· foodFromBarcode pierde el prefijo bc: (los ids de las tres capas pueden chocar)',
    "id: 'bc:' + eanNormalize(row.ean),",
    'id: eanNormalize(row.ean),'],
  ['8· el tope de kcal del cliente se desalinea del CHECK de la tabla',
    'const FOOD_BC_MAX = { kcal: 900,',
    'const FOOD_BC_MAX = { kcal: 800,'],
  ['9· foodFromBarcode se traga `verified` (un dato sin revisar se ve igual que uno verificado)',
    'verified: !!row.verified,',
    'verified: true,'],
  // ── Interfaz ──
  ['10· cerrar la habitación DEJA LA CÁMARA PRENDIDA',
    'function closeFoodLogRoom(){\n  _flScanStop();',
    'function closeFoodLogRoom(){',
    'app-5-salud.js'],
  ['11· un botón llama a una función que no existe (no hace nada y no avisa)',
    'function flEscanear(meal){',
    'function flEscanearRenombrada(meal){',
    'app-5-salud.js'],
  ['12· el permiso que llega tarde deja la cámara prendida en segundo plano',
    "if(_flView.modo!=='escanear'){ try{ stream.getTracks().forEach(t=>t.stop()); }catch(e){} return; }",
    '',
    'app-5-salud.js'],
  ['13· la caché de empaques se cuela en los datos personales que sincronizan',
    "const SB_KEYS=['ax_c',",
    "const SB_KEYS=['ax_bccache','ax_c',",
    'app-1-infra.js'],
];

const ARCHIVOS = ['avi-core.js', 'app-5-salud.js', 'app-1-infra.js'];
const RUTA = n => new URL('../../' + n, import.meta.url);
const ORIGINAL = Object.fromEntries(ARCHIVOS.map(n => [n, readFileSync(RUTA(n), 'utf8')]));

let muerden = 0;
try {
  for (const [nombre, buscar, poner, archivo = 'avi-core.js'] of SABOTAJES) {
    const original = ORIGINAL[archivo];
    const veces = original.split(buscar).length - 1;
    if (veces !== 1) {
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto aparece ${veces} veces en ${archivo} (esperaba 1)`);
      continue;
    }
    writeFileSync(RUTA(archivo), original.replace(buscar, poner), 'utf8');
    let rojo = false, linea = '';
    try {
      const out = execSync('node --test avi.test.js', { cwd: new URL('../..', import.meta.url), encoding: 'utf8', stdio: 'pipe' });
      linea = (out.match(/AVI Tests: .*/) || [''])[0];
    } catch (e) {
      rojo = true;
      linea = ((e.stdout || '').match(/AVI Tests: .*/) || [''])[0];
    }
    writeFileSync(RUTA(archivo), original, 'utf8');
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite ni corrió'}`);
    if (rojo) muerden++;
  }
} finally {
  ARCHIVOS.forEach(n => writeFileSync(RUTA(n), ORIGINAL[n], 'utf8'));
}
console.log(`\n${muerden === SABOTAJES.length ? '✅' : '🔴'} Sabotajes que muerden: ${muerden}/${SABOTAJES.length}`);
process.exit(muerden === SABOTAJES.length ? 0 : 1);
