// Matriz de sabotaje de v703 — «Sonido del entreno» (pedido de los asesorados; 11 tonos por decisión del PO,
// 9-oct-2026). Cada fila devuelve UN defecto y la capa indicada TIENE que ponerse roja: 'suite' corre
// avi.test.js y 'nav' corre el harness en Chrome (scripts/e2e/_verify-sonido.mjs), para lo que solo se ve
// pintando o tocando. Veredicto por CÓDIGO DE SALIDA, reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-v703.mjs            (todas)
//   node scripts/e2e/_sabotaje-v703.mjs --solo-suite
// COMMITEAR o respaldar antes: una matriz muta archivos del repo (lección v611).
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = {
  core: join(ROOT, 'avi-core.js'), e1: join(ROOT, 'app-1-infra.js'), e2: join(ROOT, 'app-2-login.js'),
  e4: join(ROOT, 'app-4-entreno.js'), e5: join(ROOT, 'app-5-salud.js'), e6: join(ROOT, 'app-6-extra.js'),
  css: join(ROOT, 'styles.css'),
};
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };
const SOLO_SUITE = process.argv.includes('--solo-suite');

const SABOTAJES = [
  // ── El ajuste decide (los 11 de la primera corrida) ──
  ['suite', 'el aviso final suena sin mirar el modo', 'e4', "function playRestEndBeep(){\n  const p=soundPref();\n  if(typeof soundShouldPlay!=='function'||soundShouldPlay(p)){", "function playRestEndBeep(){\n  const p=soundPref();\n  if(true){"],
  ['suite', 'la cuenta vibra por su cuenta y se salta el silencio', 'e4', '  alertVibrate(60);\n}', '  try{navigator.vibrate(60)}catch(e){}\n}'],
  ['suite', 'el aviso final ignora el tono elegido', 'e4', "soundToneNotes(p.tone,'fin')", "soundToneNotes('clasico','fin')"],
  ['suite', 'alertVibrate no respeta el silencio', 'e4', "  if(typeof soundShouldVibrate==='function'&&!soundShouldVibrate(soundPref())) return false;\n", ''],
  ['suite', 'el cardio terminado vibra directo', 'e6', "if(typeof alertVibrate==='function') alertVibrate([300,120,300]);", 'try{ if(navigator.vibrate)navigator.vibrate([300,120,300]); }catch(_e){}'],
  ['suite', 'lo guardado roto cae a SILENCIO', 'core', 'SOUND_MODES.some(m => m.id === r.mode) ? r.mode : SOUND_DEFAULT.mode', "SOUND_MODES.some(m => m.id === r.mode) ? r.mode : 'silencio'"],
  ['suite', '«Silenciar» vuelve siempre a sonido', 'core', 'return { mode: p.prev || SOUND_DEFAULT.mode, tone: p.tone };', 'return { mode: SOUND_DEFAULT.mode, tone: p.tone };'],
  ['suite', '«Clásico» deja de sonar como antes', 'core', 'f: 660, at: 0, d: 0.12', 'f: 670, at: 0, d: 0.12'],
  ['suite', '«Solo vibración» también suena', 'core', "function soundShouldPlay(pref) { return soundPrefNormalize(pref).mode === 'sonido'; }", "function soundShouldPlay(pref) { return soundPrefNormalize(pref).mode !== 'silencio'; }"],
  ['suite', 'el ajuste sube a la nube (es de ESTE teléfono)', 'e1', "'ax_cqr'];", "'ax_cqr','ax_sound'];"],
  ['suite', 'una cuenta que dura más de medio segundo', 'core', 'cuenta: [{ f: 587, at: 0, d: 0.18, v: 0.3 }]', 'cuenta: [{ f: 587, at: 0, d: 0.9, v: 0.3 }]'],
  // ── Los arreglos de la QA (Lucas y Julián) ──
  ['suite', 'tocar el texto de «Silenciar» minimiza el descanso (Lucas H1)', 'e6', "    if(ruta.some(n=>n&&n.tagName==='BUTTON'))return;\n", ''],
  ['suite', '«Silencio» del Perfil olvida el modo de antes (Lucas H2)', 'core', "prev: p.mode === 'silencio' ? p.prev : p.mode", 'prev: undefined'],
  ['suite', 'el Perfil cambia el modo sin soundWithMode (Lucas H2)', 'e4', "setSoundPref(typeof soundWithMode==='function'?soundWithMode(soundPref(),m):{mode:m,tone:soundPref().tone});", 'setSoundPref({mode:m,tone:soundPref().tone});'],
  ['suite', 'la nota de vibración vuelve a mirar el nombre del teléfono (Lucas H3)', 'e4', "un iPad en modo escritorio dice ser un Mac.\n  const sinVib=typeof navigator.vibrate!=='function';", "un iPad en modo escritorio dice ser un Mac.\n  const sinVib=/iPhone|iPad/.test(navigator.userAgent||'');"],
  ['suite', 'el compresor nace con el primer sonido y se lo come (Lucas H5)', 'e4', "    try{ if(typeof _sndOut==='function') _sndOut(_actx,false); }catch(e){}\n", ''],
  ['suite', 'el compresor pierde su recuperación corta (Lucas H5)', 'e4', '_sndComp.release.value=0.05; ', ''],
  ['suite', 'el primer sonido no espera a que el compresor se asiente (Lucas H5)', 'e4', ' if(_sndCompAt!=null) t0=Math.max(t0,_sndCompAt+0.12);', ''],
  ['suite', 'el ícono de silencio cambia de nombre y pinta ✨ (Julián 🟢1)', 'e1', "  'bell-off':", "  'bel-off':"],
  ['suite', 'un aviso nuevo en otro módulo vibra sin pasar por el ajuste (Julián 🟢3)', 'e5', 'navigator.vibrate(30); flBuscarEan', 'navigator.vibrate(500); flBuscarEan'],
  // ── Lo que solo se ve pintando o tocando ──
  ['nav', 'el arranque deja de pintar la tarjeta (Julián 🟡1)', 'e2', "  if(typeof initSoundSettings==='function')initSoundSettings();\n", ''],
  ['nav', '«Clásico» pasa por el compresor y deja de sonar igual (Julián 🟢2)', 'e4', '  if(crudo) return ctx.destination;\n', ''],
  ['nav', 'con letra «Muy grande» los botones del descanso se salen', 'css', '.gm-rest-ctl{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;justify-content:center}', '.gm-rest-ctl{display:flex;gap:10px;margin-top:14px}'],
  ['nav', 'con letra «Muy grande» los modos se cortan', 'css', '.snd-modes{display:flex;flex-wrap:wrap;gap:7px}', '.snd-modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}'],
];

const correr = capa => {
  const cmd = capa === 'suite' ? 'node avi.test.js' : 'node scripts/e2e/_verify-sonido.mjs';
  try { execSync(cmd, { cwd: ROOT, stdio: 'pipe', timeout: 420000, env: { ...process.env, TZ: 'UTC' } }); return true; } catch { return false; }
};

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
let muerden = 0, noAplican = 0, corridas = 0;
for (const [capa, nombre, archivo, buscar0, poner0] of SABOTAJES) {
  if (SOLO_SUITE && capa !== 'suite') continue;
  corridas++;
  const src = orig[archivo];
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const buscar = buscar0.replace(/\n/g, eol), poner = poner0.replace(/\n/g, eol);
  const veces = src.split(buscar).length - 1;
  if (veces !== 1) { noAplican++; console.log(`⚠️  NO SE APLICÓ — «${nombre}»: el ancla aparece ${veces} veces.`); continue; }
  escribir(F[archivo], src.replace(buscar, () => poner));
  let verde;
  try { verde = correr(capa); } finally { escribir(F[archivo], orig[archivo]); }
  if (!verde) { muerden++; console.log(`✅ MUERDE (${capa}) — «${nombre}»`); } else console.log(`🔴 VERDE CON SABOTAJE (${capa}) — «${nombre}»`);
}
const base = correr('suite') && (SOLO_SUITE || correr('nav'));
console.log(`\nControl: sin sabotaje ${base ? 'VERDE ✅' : 'ROJO 🔴'}`);
console.log(`Resultado: ${muerden}/${corridas} muerden · ${noAplican} sin aplicar.`);
process.exit(base && !noAplican && muerden === corridas ? 0 : 1);
