// Prueba del ARRANQUE REAL con aviso del celular (v756 · verificador): la app se abre desde una notificación con
// `?avi-pedidos=1` (pedido de la tienda) o `?avi-chat=<id>` (mensaje), con sesión de Supabase Auth y SIN `ax_session`
// (nadie la escribe desde el «login solo por Auth»). Corre `_enterCoachAuth` y `abrirDeAviso` REALES de app-3-coach.js.
//
// Uso:  node scripts/comprobar-aviso-arranque.cjs [RAIZ]
//       SAB=<sabotaje> node scripts/comprobar-aviso-arranque.cjs    → tiene que salir con error
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const SAB = process.env.SAB || '';
const SABOTAJES = {
  // la lectura vuelve a tryAutoLogin: la entrada real ya no abre nada
  'lectura-en-tryautologin': [["  abrirDeAviso('coach');   // el aviso con la app cerrada: abre el chat o la bandeja de pedidos", ""]],
  // abre pero deja la URL sucia: recargar reabre la bandeja
  'url-sucia': [["history.replaceState(history.state,'',u.pathname+u.search+u.hash);", ""]],
  // limpia la URL añadiendo una entrada al historial (rompe el atrás)
  'url-con-push': [["history.replaceState(history.state,'',u.pathname+u.search+u.hash);", "history.pushState(history.state,'',u.pathname+u.search+u.hash);"]],
};
let src = fs.readFileSync(path.join(ROOT, 'app-3-coach.js'), 'utf8').replace(/\r\n/g, '\n');
(SAB ? (SABOTAJES[SAB] || (() => { throw new Error('sabotaje desconocido: ' + SAB); })()) : []).forEach(([a, b]) => { if (src.split(a).length !== 2) throw new Error('el sabotaje no aplica: ' + a.slice(0, 60)); src = src.replace(a, () => b); });
const sacar = firma => { const i = src.indexOf(firma); if (i < 0) throw new Error('no está ' + firma); const j = src.indexOf('\n}\n', i); return src.slice(i, j + 3); };
const codigo = sacar('function abrirDeAviso(') + '\n' + sacar('async function _enterCoachAuth(');
const fallas = [];
const ok = (c, m) => { if (!c) fallas.push(m); };
const esperar = ms => new Promise(r => setTimeout(r, ms));

async function arrancar(url, rol) {
  const u = new URL(url);
  const loc = { href: u.href, search: u.search, pathname: u.pathname, hash: u.hash };
  const rec = { replace: [], push: [], abiertos: [], orden: [], axSessionLeida: false };
  const estado = { state: { pantalla: 'inicio' } };
  const history = {
    get state() { return estado.state; },
    replaceState(st, t, nuevo) { rec.replace.push({ st, nuevo }); const x = new URL(nuevo, loc.href); loc.href = x.href; loc.search = x.search; loc.hash = x.hash; },
    pushState(st, t, nuevo) { rec.push.push(nuevo); const x = new URL(nuevo, loc.href); loc.href = x.href; loc.search = x.search; loc.hash = x.hash; },
  };
  const ctx = vm.createContext({
    URL, URLSearchParams, setTimeout, console, JSON, Array, Object, Promise,
    location: loc, history,
    localStorage: { getItem: k => { if (k === 'ax_session') rec.axSessionLeida = true; return null; }, setItem() {}, removeItem() {} },
    COACH_OWN_ROW: null, _authUid: 'coach-uid', _cacheAuthRow() {}, DB: { templates: [], exercises: [], clients: [] }, healExerciseEnv() {}, warn() {},
    _loadCoachClientsIntoDB: async () => {}, CUR: {}, COACH_SELF: true, coachStampName() {},
    showScreen: n => rec.orden.push('showScreen:' + n), initCoach: () => rec.orden.push('initCoach'),
    openChatFor: id => rec.abiertos.push('chat:' + id), tiendaAbrirPedidos: () => rec.abiertos.push('pedidos'),
  });
  vm.runInContext(codigo + '\nthis.__f={abrirDeAviso,_enterCoachAuth};', ctx);
  if (rol === 'coach') await ctx.__f._enterCoachAuth({ id: 'coach-uid' }, { role: 'coach', templates: [] }, {});   // la entrada REAL con sesión de Auth
  else ctx.__f.abrirDeAviso('client');
  await esperar(1100);
  return { rec, loc, estado };
}

(async () => {
  // 1 · el aviso de un PEDIDO, app cerrada, el coach entra por Auth
  {
    const { rec, loc, estado } = await arrancar('https://app.avientrena.com/?avi-pedidos=1&otro=2#inicio', 'coach');
    ok(rec.abiertos.join() === 'pedidos', '🔴 1: el aviso del pedido NO abre la bandeja en el arranque real (abrió: ' + JSON.stringify(rec.abiertos) + ')');
    ok(rec.orden.join() === 'showScreen:s-coach,initCoach', '1: la bandeja se abre cuando el panel del coach ya está pintado: ' + rec.orden.join());
    ok(!/avi-pedidos/.test(loc.search) && loc.search === '?otro=2' && loc.hash === '#inicio', '🔴 1: la URL tiene que quedar limpia (sin avi-pedidos, conservando lo demás): ' + loc.href);
    ok(rec.push.length === 0 && rec.replace.length === 1 && rec.replace[0].st === estado.state, '🔴 1: se limpia con replaceState, sin pushState, conservando el estado del atrás');
    ok(!rec.axSessionLeida, '1: el arranque NO depende de ax_session');
  }
  // 2 · el aviso de un MENSAJE, app cerrada, el coach entra por Auth
  {
    const { rec, loc } = await arrancar('https://app.avientrena.com/?avi-chat=u7', 'coach');
    ok(rec.abiertos.join() === 'chat:u7', '🔴 2: el aviso del mensaje NO abre el chat en el arranque real (abrió: ' + JSON.stringify(rec.abiertos) + ')');
    ok(loc.search === '' && !/avi-chat/.test(loc.href), '🔴 2: la URL tiene que quedar limpia: ' + loc.href);
  }
  // 3 · el aviso de un mensaje del coach, la asesorada entra por Auth: abre su chat; el de pedido NO es suyo
  {
    const { rec, loc } = await arrancar('https://app.avientrena.com/?avi-chat=u7&avi-pedidos=1', 'client');
    ok(rec.abiertos.join() === 'chat:u7', '🔴 3: la asesorada tiene que abrir su chat y NO la bandeja del coach: ' + JSON.stringify(rec.abiertos));
    ok(loc.search === '', '3: la URL queda limpia: ' + loc.href);
  }
  // 4 · CONTROL: sin aviso no se abre nada ni se toca el historial
  {
    const { rec, loc } = await arrancar('https://app.avientrena.com/?utm=x', 'coach');
    ok(rec.abiertos.length === 0 && rec.replace.length === 0 && loc.search === '?utm=x', '4-CONTROL: sin aviso no abre nada ni toca la URL: ' + JSON.stringify(rec.abiertos) + ' ' + loc.href);
  }
  if (fallas.length) { console.error('FALLA (' + fallas.length + ')' + (SAB ? ' [sabotaje ' + SAB + ']' : '') + ':\n - ' + fallas.join('\n - ')); process.exit(1); }
  console.log('OK');
})().catch(e => { console.error('ERROR', e && e.stack); process.exit(2); });
