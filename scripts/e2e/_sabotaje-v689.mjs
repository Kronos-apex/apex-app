// Matriz de sabotaje de v689 — el aviso de salto (punto 3 del lote de progresión).
// Cada fila devuelve UN defecto y la suite TIENE que ponerse roja. Lo que ve la persona lo prueba
// `_verify-salto.mjs`. Reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-v689.mjs   (COMMITEAR o respaldar antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), e4: join(ROOT, 'app-4-entreno.js'), e6: join(ROOT, 'app-6-extra.js'), html: join(ROOT, 'index.html') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['sin el piso de 15 kg', 'core', "  if (dir !== 'baja' && k / p >= JUMP_HIGH && k - p >= JUMP_MIN_KG) return 'sube';", "  if (dir !== 'baja' && k / p >= JUMP_HIGH) return 'sube';"],
  ['el borde deja de contar (> en vez de ≥)', 'core', "  if (dir !== 'sube' && k / p <= JUMP_LOW && p - k >= JUMP_MIN_KG) return 'baja';", "  if (dir !== 'sube' && k / p < JUMP_LOW && p - k >= JUMP_MIN_KG) return 'baja';"],
  ['la dirección ya no se respeta', 'core', "  if (dir !== 'sube' && k / p <= JUMP_LOW && p - k >= JUMP_MIN_KG) return 'baja';", "  if (k / p <= JUMP_LOW && p - k >= JUMP_MIN_KG) return 'baja';"],
  ['la sesión en curso cuenta como «la anterior»', 'core', "    if (opts.excludeSessionId && s.sessionId === opts.excludeSessionId) return;", ''],
  ['sin ventana de 90 días', 'core', "    if (isNaN(t) || t > now || now - t > JUMP_WINDOW_DAYS * 864e5) return;", '    if (isNaN(t)) return;'],
  ['cuentan las series NO hechas', 'core', "(x.sets || []).forEach(st => { if (!st || !st.done) return;", '(x.sets || []).forEach(st => { if (!st) return;'],
  ['sin el nombre del catálogo', 'core', "  const nombres = nn((canon && canon.name) || '') + ' | ' + nn(ex.name);", "  const nombres = nn(ex.name);"],
  ['el multipower pregunta por la barra', 'core', "  if (/smith|multipower/.test(nombres)) return 'maquina';", ''],
  ['cualquier implemento pregunta por la máquina', 'core', "  if (_JUMP_MAQ_RE.test(nombres)) return 'maquina';\n  return null;", "  return 'maquina';"],
  ['el sí ya no ecoa (texto único)', 'core', "  barra: { q: '¿Cambiaste de barra?', si: 'Es otra barra' },", "  barra: { q: '¿Cambiaste de máquina?', si: 'Es otra máquina' },"],
  ['la respuesta sin el id del ejercicio', 'core', "  if (p.length !== 4 || p[0] !== String(ex.id) || JUMP_ESTADOS.indexOf(p[1]) < 0) return null;", "  if (p.length !== 4 || JUMP_ESTADOS.indexOf(p[1]) < 0) return null;"],
  ['salto_ no viaja en la mudanza', 'core', 'barra_|salto_|drop_', 'barra_|drop_'],
  ['salto fuera de _SK_EX', 'e4', "const _SK_EX=['lastre','wshow','barra','salto'];", "const _SK_EX=['lastre','wshow','barra'];"],
  ['la respuesta de ayer se hereda', 'e4', "  try{ Object.keys(localStorage).filter(k=>k.indexOf(sp)===0).forEach(k=>localStorage.removeItem(k)); }catch(_e){}", ''],
  ['el corte no llega al historial', 'e4', '...(corte?{corte:true}:{}),sets:', 'sets:'],
  ['sale encima de la confirmación de v417', 'e6', '    if(kgConfirmGuard(rid,ei,si,el)) return;\n    if(typeof kgOutlier', '    kgConfirmGuard(rid,ei,si,el);\n    if(typeof kgOutlier'],
  ['sale encima del «revisa el número»', 'e6', "      return;   // v689: con ese aviso ya puesto, el del salto sobra", ''],
  ['al teclear se pregunta también la bajada', 'e6', "parseFloat(getLog(rid,ei,si,'kg')),'sube')!=='sube') return;", "parseFloat(getLog(rid,ei,si,'kg')))==null) return;"],
  ['se pregunta más de una vez por sesión', 'e6', "    if(sessionJump(r,ei,ex)) return;                          // una vez por ejercicio y por sesión", ''],
  ['fuera de orden no se pregunta la bajada', 'e6', "    if(_cierra&&gmSaltoAlCerrar(ei)&&!_enOrden) _gmKeepAnchor('gm-ex-'+ei,gmRender);", "    if(_cierra&&_enOrden) gmSaltoAlCerrar(ei);"],
  ['el «sí» no se guarda en el entreno', 'e6', "  if(r==='si'&&typeof resaveSessionPartial==='function') resaveSessionPartial(R);", ''],
  ['la plancha deja el aviso pintado', 'e6', "  _gmRestSalto(null);   // v689 · la plancha: ahí no hay salto que preguntar", ''],
  ['el cardio deja el aviso pintado', 'e6', "  _gmRestSalto(null);   // v689 · el cardio: ahí no hay salto que preguntar", ''],
  ['falta el recuadro en el descanso', 'html', '    <div class="gm-rest-salto" id="gm-rest-salto" hidden></div>', ''],
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
