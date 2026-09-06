// Matriz de sabotaje de «OLVIDÉ MI CONTRASEÑA» (v582).
// Veredicto por CÓDIGO DE SALIDA, jamás por el mensaje impreso (lección v524).
//
// Corre: node scripts/e2e/_sabotaje-reset-pass.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const INF = new URL('../../app-1-infra.js', import.meta.url);
const APP2 = new URL('../../app-2-login.js', import.meta.url);
const HTML = new URL('../../index.html', import.meta.url);

const SABOTAJES = [
  [HTML, '1· la conducta ANTERIOR: no hay puerta de vuelta en el login',
    '      <button type="button" id="l-forgot" class="cin-forgot" onclick="pedirResetPass()">¿Olvidaste tu contraseña?</button>',
    '      <!-- sin puerta -->'],
  [APP2, '2· el error del servidor se le enseña (delata si la cuenta existe)',
    "    if(r&&r.error) warn('AVI resetPassword:',r.error.message);",
    "    if(r&&r.error){ _forgotMsg('No pudimos: '+r.error.message,true); return; }"],
  [APP2, '3· el correo deja de normalizarse (« Juan@X.com » no encuentra su cuenta)',
    "  const correo=(inp&&inp.value||'').trim().toLowerCase();",
    "  const correo=(inp&&inp.value||'');"],
  [APP2, '4· se pierde el enfriamiento: a toques se gasta el límite del servidor',
    '  const falta=RESET_COOLDOWN_MS-(Date.now()-_resetEnviadoAt);',
    '  const falta=0;'],
  [APP2, '5· MEDIA FEATURE: entra por el enlace pero nunca le pide la clave nueva',
    '    if(authEntered){ setTimeout(()=>{ try{ openNewPassModal(); }catch(_e){} },1600); }',
    '    if(authEntered){ /* nada */ }'],
  [APP2, '6· la regla de contraseña se re-implementa en vez de delegar',
    "  const problema=(typeof passwordProblem==='function')?passwordProblem(nueva):(nueva.length<8?'Mínimo 8 caracteres':null);",
    "  const problema=nueva.length<4?'muy corta':null;"],
  [APP2, '7· al coach se le cambia solo la clave de la nube (su hash local queda desfasado)',
    "    if(AUTH_ROLE==='coach'&&typeof saveCoachPass==='function'){ await saveCoachPass(nueva); }",
    '    if(false){ }'],
  [APP2, '8· un enlace vencido vuelve a dejar a la persona sin explicación',
    "    else{ setTimeout(()=>{ try{ _forgotMsg('Ese enlace ya venció o se usó. Toca «¿Olvidaste tu contraseña?» para pedir uno nuevo.',true);",
    '    else{ setTimeout(()=>{ try{ ;'],
  [INF, '9· la marca deja de LEER el hash: el enlace del correo no se reconoce nunca',
    "window._aviRecovery=(function(){ try{ return /[#&]type=recovery/.test(location.hash||''); }catch(e){ return false; } })();",
    'window._aviRecovery=false;'],
];

const ORIGINALES = new Map([[INF.href, readFileSync(INF, 'utf8')], [APP2.href, readFileSync(APP2, 'utf8')], [HTML.href, readFileSync(HTML, 'utf8')]]);
const restaurar = () => { for (const [href, txt] of ORIGINALES) writeFileSync(new URL(href), txt, 'utf8'); };

let muerden = 0;
try {
  for (const [ruta, nombre, buscar, poner] of SABOTAJES) {
    const original = ORIGINALES.get(ruta.href);
    const veces = original.split(buscar).length - 1;
    if (veces !== 1) {
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto aparece ${veces} veces (esperaba 1)`);
      continue;
    }
    writeFileSync(ruta, original.replace(buscar, poner), 'utf8');
    let rojo = false, linea = '';
    try {
      const out = execSync('node avi.test.js', { cwd: new URL('../..', import.meta.url), encoding: 'utf8', stdio: 'pipe' });
      linea = (out.match(/AVI Tests: .*/) || [''])[0];
    } catch (e) {
      rojo = true;
      linea = ((e.stdout || '').match(/AVI Tests: .*/) || [''])[0];
    }
    restaurar();
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite ni corrió'}`);
    if (rojo) muerden++;
  }
} finally {
  restaurar();
}
console.log(`\n${muerden === SABOTAJES.length ? '✅' : '🔴'} Sabotajes que muerden: ${muerden}/${SABOTAJES.length}`);
process.exit(muerden === SABOTAJES.length ? 0 : 1);
