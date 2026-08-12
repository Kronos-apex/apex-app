// Matriz de sabotaje de F6 (la cola de aprobación del coach). Rompe a propósito cada candado y
// exige que la suite se ponga ROJA. Misma doctrina que `_sabotaje-f5.mjs`: un candado que no
// muerde no es un candado, y en este repo un sabotaje ya salió VERDE tres veces.
// Los sabotajes de PERMISOS (RLS/RPC) viven en `_sabotaje-f6.sql`, que corre contra producción en
// una transacción con rollback — aquí solo va lo que la suite puede ver.
// Corre: node scripts/e2e/_sabotaje-f6.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const SABOTAJES = [
  ['1· el contador de la cola cuenta TAMBIÉN lo ya aprobado (un número que no baja nunca)',
    "lista.forEach(r => { if (r && r.ean) (r.verified ? verificados : pendientes).push(r); });",
    "lista.forEach(r => { if (r && r.ean) { pendientes.push(r); if (r.verified) verificados.push(r); } });"],
  // ⚠️ Los archivos del repo van con CRLF: los patrones de sabotaje NO pueden llevar `\n` suelto
  // (el 2 salió «no se aplicó» por eso). Se ancla en una sola línea.
  ['2· fbReviewNotes se inventa un umbral de densidad calórica sin datos que lo respalden',
    '  const gap = foodKcalGap(row);',
    "  if (k != null && k > 0 && k < 150) notas.push('Muy pocas calorias: la etiqueta era por porcion?');\n  const gap = foodKcalGap(row);"],
  ['3· un producto que declara energía sin un solo gramo de macro pasa sin aviso',
    "if (k != null && k > 0 && p === 0 && c === 0 && f === 0) {",
    'if (false) {'],
  ['4· la medida casera de más de un kilo deja de avisar (el peso del paquete entero)',
    'if (g != null && g > 1000) {',
    'if (false) {'],
  ['5· una fila sin código entra a la cola (no se puede aprobar lo que no se identifica)',
    'if (r && r.ean)',
    'if (r)'],
  // ── El .sql, leído de verdad (no una copia) ──
  ['6· fb_delete pierde el gate de moderador: cualquiera vacía el catálogo',
    "  if not private._is_moderator(auth.uid()) then\n    raise exception 'not a moderator';\n  end if;",
    '',
    'supabase/community/f6_fb_moderation.sql'],
  ['7· fb_delete acepta borrar una fila YA APROBADA de un solo toque',
    "raise exception 'verified row: unverify first';",
    'null;',
    'supabase/community/f6_fb_moderation.sql'],
  ['8· una DEFINER se queda sin search_path fijo (escalada por esquema)',
    "language sql stable security definer set search_path = '' as $$",
    'language sql stable security definer as $$',
    'supabase/community/f6_fb_moderation.sql'],
  ['9· el grant de UPDATE del cliente se lleva `verified` por delante (la clase c13c)',
    'grant update (name, brand, kcal, p, c, f, un_label, un_g) on public.food_barcodes to authenticated;',
    'grant update (name, brand, kcal, p, c, f, un_label, un_g, verified) on public.food_barcodes to authenticated;',
    'supabase/community/f5_food_barcodes.sql'],
  // ── Interfaz: estos NO los ve la suite, los tiene que morder el harness ──
  ['10· la tarjeta anuncia también lo ya aprobado (el número no baja al revisar)',
    'const n=split.porRevisar;',
    'const n=_fbQueue.length;',
    'app-3-coach.js', 'harness'],
  ['11· Descartar BORRA sin preguntar',
    "if(!confirm('¿Descartar «'+(r.name||r.ean)+'»? Se borra del catálogo. Lo que ya registró alguien con este producto NO se toca.')) return;",
    '',
    'app-3-coach.js', 'harness'],
  ['12· Corregir guarda aunque los macros sean imposibles (el CHECK devolvería error de motor)',
    'if(!res.ok){',
    'if(false){',
    'app-3-coach.js', 'harness'],
  ['13· el nombre del producto se pinta SIN escapar (XSS de quien aporta al catálogo)',
    "const nombre=esc(r.name||'(sin nombre)')",
    "const nombre=(r.name||'(sin nombre)')",
    'app-3-coach.js', 'harness'],
  ['14· Aprobar se cree su propio estado local en vez de releer del servidor',
    'async function _fbReload(){\r\n  try{\r\n    const cli=AUTH.client(); if(!cli)return;\r\n    const { data, error } = await cli.rpc(\'fb_pending\');\r\n    if(!error) _fbQueue=data||[];\r\n  }catch(e){}',
    'async function _fbReload(){',
    'app-3-coach.js', 'harness'],
  ['15· un botón de la cola llama a una función que no existe (no hace nada y no avisa)',
    'async function fbApprove(i){',
    'async function fbApproveRenombrada(i){',
    'app-3-coach.js', 'harness'],
];

const ARCHIVOS = ['avi-core.js', 'app-3-coach.js', 'supabase/community/f6_fb_moderation.sql', 'supabase/community/f5_food_barcodes.sql'];
const RUTA = n => new URL('../../' + n, import.meta.url);
const ORIGINAL = Object.fromEntries(ARCHIVOS.map(n => [n, readFileSync(RUTA(n), 'utf8')]));

let muerden = 0;
try {
  for (const [nombre, buscar, poner, archivo = 'avi-core.js', gate = 'suite'] of SABOTAJES) {
    const original = ORIGINAL[archivo];
    const veces = original.split(buscar).length - 1;
    if (veces !== 1) {
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto aparece ${veces} veces en ${archivo} (esperaba 1)`);
      continue;
    }
    writeFileSync(RUTA(archivo), original.replace(buscar, poner), 'utf8');
    // Los de interfaz no los ve la suite: los tiene que morder el harness, que abre la pantalla.
    const cmd = gate === 'harness' ? 'node scripts/e2e/_verify-fbqueue.mjs' : 'node --test avi.test.js';
    const marca = gate === 'harness' ? /_verify-fbqueue: .*/ : /AVI Tests: .*/;
    let rojo = false, linea = '';
    try {
      const out = execSync(cmd, { cwd: new URL('../..', import.meta.url), encoding: 'utf8', stdio: 'pipe' });
      linea = (out.match(marca) || [''])[0];
    } catch (e) {
      rojo = true;
      linea = ((e.stdout || '').match(marca) || [''])[0];
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
