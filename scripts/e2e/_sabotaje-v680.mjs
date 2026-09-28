// Matriz de sabotaje de v680 — eliminar a un asesorado le quita también el acceso, y solo su coach
// puede. Cada fila devuelve UN defecto y la suite TIENE que ponerse roja. (El comportamiento contra el
// servidor lo prueba `_verify-borrado-por-coach.mjs --si-borrar`, que borra de verdad cuentas desechables.)
// Reemplazos con FUNCIÓN y escritura ATÓMICA.   node scripts/e2e/_sabotaje-v680.mjs   (COMMITEAR antes)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { edge: join(ROOT, 'supabase', 'functions', 'delete-account', 'index.ts'), coach: join(ROOT, 'app-3-coach.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['el servidor deja de comprobar que sea SU asesorado', 'edge',
    '      if (fila.coach_id !== uid) return json({ ok: false, error: "not_your_client" }, 403);\n', ''],
  ['el permiso se comprueba DESPUÉS de borrar', 'edge',
    '      if (fila.coach_id !== uid) return json({ ok: false, error: "not_your_client" }, 403);\n      const { tarjetasQuitadas } = await borrarTodo(admin, objetivo);',
    '      const { tarjetasQuitadas } = await borrarTodo(admin, objetivo);\n      if (fila.coach_id !== uid) return json({ ok: false, error: "not_your_client" }, 403);'],
  ['sin ficha se borraría igual', 'edge', '      if (!fila) return json({ ok: false, error: "not_found" }, 404);\n', ''],
  ['se puede apuntar a la cuenta del coach real', 'edge',
    'if (objetivo === uid || objetivo === COACH_UID) return', 'if (objetivo === uid) return'],
  ['el modo coach queda detrás de la protección (nunca correría)', 'edge',
    '  // El coach no puede autoborrarse por aquí (protege a sus asesorados).\n  if (uid === COACH_UID) {\n    return json({ ok: false, error: "coach_account_protected" }, 403);\n  }\n',
    ''],
  ['«borrar mi cuenta» vuelve a tener su propia lista', 'edge',
    '    const { tarjetasQuitadas } = await borrarTodo(admin, uid);',
    '    const tarjetasQuitadas = 0; await admin.auth.admin.deleteUser(uid);'],
  ['la app borra aunque el servidor falle', 'coach',
    '    if(_isAuthId(delId)){ if(!(await _delClientServer(delId))) return; }',
    '    if(_isAuthId(delId)){ await _delClientServer(delId); }'],
  ['la app vuelve a borrar solo la ficha', 'coach',
    '    if(_isAuthId(delId)){ if(!(await _delClientServer(delId))) return; }\n    // Una ficha sin cuenta real (id legacy) no tiene acceso que quitar: basta su fila.\n    else UD.deleteClientRow',
    '    UD.deleteClientRow'],
  ['un harness en localhost podría eliminar a alguien de verdad', 'coach',
    "  if(typeof cloudWriteSealed==='function'&&cloudWriteSealed(location.hostname,window.AVI_ALLOW_CLOUD_WRITE)) return true;\n", ''],
  ['un fallo del servidor no corta', 'coach',
    "    toast('⚠️ No se pudo eliminar ahora. Revisa tu conexión e intenta de nuevo — no se borró nada.');\n    return false;",
    "    toast('⚠️ No se pudo eliminar ahora. Revisa tu conexión e intenta de nuevo — no se borró nada.');\n    return true;"],
];

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
let muerden = 0, noAplican = 0;
for (const [nombre, archivo, buscar0, poner0] of SABOTAJES) {
  const src = orig[archivo];
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const buscar = buscar0.replace(/\n/g, eol), poner = poner0.replace(/\n/g, eol);
  const veces = src.split(buscar).length - 1;
  if (veces !== 1) { noAplican++; console.log(`⚠️  NO SE APLICÓ — «${nombre}»: el ancla aparece ${veces} veces.`); continue; }
  escribir(F[archivo], src.replace(buscar, () => poner));
  let rojo = false;
  try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' }); } catch { rojo = true; } finally { escribir(F[archivo], orig[archivo]); }
  if (rojo) { muerden++; console.log(`✅ MUERDE — «${nombre}»`); } else console.log(`🔴 VERDE CON SABOTAJE — «${nombre}»`);
}
let base = true;
try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' }); } catch { base = false; }
console.log(`\nControl: suite sin sabotaje ${base ? 'VERDE ✅' : 'ROJA 🔴'}`);
console.log(`Resultado: ${muerden}/${SABOTAJES.length} muerden · ${noAplican} sin aplicar.`);
process.exit(base && !noAplican && muerden === SABOTAJES.length ? 0 : 1);
