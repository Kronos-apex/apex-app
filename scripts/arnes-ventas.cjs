// Arnés de las ventas de suplementos (v750): corre el bloque REAL de app-6-extra.js con un DOM y un Supabase falsos.
// Lo usan scripts/comprobar-ventas-*.cjs (la suite los lanza en un proceso aparte: necesitan esperar promesas).
const fs = require('fs'), path = require('path'), vm = require('vm');
function crear(ROOT, opts) {
  opts = opts || {};
  const core = require(path.join(ROOT, 'avi-core.js'));
  let extra = fs.readFileSync(path.join(ROOT, 'app-6-extra.js'), 'utf8');
  const ini = extra.indexOf('// VENTAS DE SUPLEMENTOS (v748) — pantallas y escritura');
  if (ini < 0) throw new Error('no hay bloque de ventas');
  let code = extra.slice(ini);
  (opts.sabotajes || []).forEach(([a, b]) => { if (!code.includes(a)) throw new Error('sabotaje no aplica: ' + a); code = code.replace(a, b); });
  const login = fs.readFileSync(path.join(ROOT, 'app-2-login.js'), 'utf8');
  const infra = fs.readFileSync(path.join(ROOT, 'app-1-infra.js'), 'utf8');
  const sacar = (src, firma) => { const i = src.indexOf(firma); const j = src.indexOf('\n}', i); return src.slice(i, j + 2); };
  const escSrc = sacar(login, 'function esc(s){');
  const crepRow = sacar(login, 'function _crepRow(');
  const toastSrc = infra.split('\n').find(l => l.startsWith('function toast(msg,ms)'));
  // DOM
  const els = {};
  class El { constructor(id){ this.id=id; this.innerHTML=''; this.textContent=''; this.value=''; this.style={}; this._c=new Set(); const s=this._c; this.classList={add:c=>s.add(c),remove:c=>s.delete(c),contains:c=>s.has(c),toggle:(c,f)=>{ if(f===undefined)f=!s.has(c); f?s.add(c):s.delete(c); return f; }}; this.attrs={}; } setAttribute(k,v){ this.attrs[k]=v; } }
  const document = { getElementById: id => (opts.noEls && opts.noEls.includes(id)) ? null : (els[id] || (els[id] = new El(id))) };
  const store = Object.assign({}, opts.storage || {});
  const localStorage = { setItem: (k, v) => { store[k] = String(v); }, getItem: k => (k in store ? store[k] : null), removeItem: k => { delete store[k]; } };
  const net = { on: true, userOn: true };
  const cloud = { coach_productos: {}, coach_ventas: {}, tienda_pedidos: {} };   // v756: también los pedidos de la tienda
  if (opts.cloud) Object.keys(opts.cloud).forEach(t => opts.cloud[t].forEach(r => { cloud[t][r.id] = JSON.parse(JSON.stringify(r)); }));
  const llamadas = [];
  const COACH = '0a6484ed-42af-449d-9903-e440ac683ecf';
  // v756 · `opts.rpc(nombre, args)` simula las funciones del servidor (tienda_*); `opts.uid` = quién está logueado.
  const pushes = [];
  const AUTH = {
    client: () => ({ ...(opts.rpc ? { rpc: async (name, args) => { llamadas.push({ op: 'rpc', name, args: JSON.parse(JSON.stringify(args || {})) }); if (!net.on) return { data: null, error: { message: 'Failed to fetch' } }; return opts.rpc(name, args || {}, cloud); } } : {}), from: t => ({
      select: () => ({ eq: async (col, val) => { llamadas.push({ op: 'select', t, col, val }); if (net.on && opts.tablaFalta && opts.tablaFalta.includes(t)) return { data: null, error: { message: 'relation "public.' + t + '" does not exist', code: '42P01' } }; const foto = JSON.parse(JSON.stringify(Object.values(cloud[t] || {}))); if (opts.selectDelay) await new Promise(r => setTimeout(r, opts.selectDelay)); if (opts.selectDelay && net.on) return { data: foto, error: null }; if (!net.on) return { data: null, error: { message: 'Failed to fetch' } }; return { data: Object.values(cloud[t] || {}).map(r => JSON.parse(JSON.stringify(r))), error: null }; } }),
      upsert: async row => { llamadas.push({ op: 'upsert', t, row: JSON.parse(JSON.stringify(row)) }); if (!net.on) return { error: { message: 'Failed to fetch' } }; if (!cloud[t]) return { error: { message: 'tabla desconocida ' + t } }; cloud[t][row.id] = JSON.parse(JSON.stringify(row)); return { error: null }; },
    }) }),
    getUser: async () => (net.on && net.userOn ? { id: opts.uid || COACH } : null),
  };
  const listeners = {};
  const toasts = [];
  const ctx = Object.assign({}, core, {
    console, setTimeout, clearTimeout, JSON, Math, Date, Promise, Object, Array, String, Number, Set,
    warn() {}, ld: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_e) { return d; } },
    localStorage, document, AUTH,
    window: { addEventListener: (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); }, AVI_ALLOW_CLOUD_WRITE: false },
    location: { hostname: opts.hostname || 'app.avientrena.com' },
    crypto: { randomUUID: (() => { let n = 0; return () => 'id-' + (++n) + '-' + Math.random().toString(36).slice(2, 6); })() },
    confirm: () => true, om: id => document.getElementById(id).classList.add('on'), cm: id => document.getElementById(id).classList.remove('on'),
    gp: id => document.getElementById(id).classList.add('on'), history: { back() {} },
    openCoachStat() {}, avcStyle: () => '', ini: n => String(n || '').slice(0, 2).toUpperCase(),
    _crepAv: n => '<div class="crep-av"></div>', aviIcon: n => '<svg data-i="' + n + '"></svg>', _tt: null,
    DB: { clients: opts.clients || [] }, CUR: { clientId: null, loggedAs: opts.uid ? 'client' : 'coach' },
    pushToClient: async (...a) => { pushes.push(a); if (opts.pushFalla) throw new Error('push caído'); return null; },
    navigator: { onLine: true },
  });
  vm.createContext(ctx);
  vm.runInContext(escSrc + '\n' + crepRow + '\n' + toastSrc + '\n', ctx);
  // registrar cada toast además de la semántica real (un solo elemento, el último gana)
  vm.runInContext('const __toastReal=toast; toast=function(m,ms){ __toasts.push(m); return __toastReal(m,ms); };', Object.assign(ctx, { __toasts: toasts }));
  vm.runInContext(code + '\nthis.__SUPL=SUPL;', ctx);
  const disparar = async ev => { for (const fn of (listeners[ev] || [])) fn(); await new Promise(r => setTimeout(r, 20)); };
  return { ctx, els, store, net, cloud, llamadas, toasts, pushes, disparar, COACH, core, el: id => document.getElementById(id) };
}
module.exports = { crear };
