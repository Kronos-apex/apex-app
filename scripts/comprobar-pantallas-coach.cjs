// Prueba EN EJECUCIÓN de las pantallas del coach que cambiaron en la v756 (2ª parte): corre las funciones REALES de app-2-login.js
// (`openCoachStat`, `renderHome` y lo que pinta el Inicio) con un DOM falso. La lanza avi.test.js en un proceso aparte.
//
// Uso:  node scripts/comprobar-pantallas-coach.cjs [RAIZ]
//       SAB=<sabotaje> node scripts/comprobar-pantallas-coach.cjs    → tiene que salir con error
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const SAB = process.env.SAB || '';
const core = require(path.join(ROOT, 'avi-core.js'));
const SABOTAJES = {
  // el reporte de mensualidades vuelve a llevar los suplementos
  'ingresos-con-suplementos': { 'app-2-login.js': [["      html+=`<div class=\"sroom-sec\" style=\"margin-top:14px\">Mensualidades · de dónde salen</div>`;", "      html+=suplIngresosHTML(stat,empty);\n      html+=`<div class=\"sroom-sec\" style=\"margin-top:14px\">Mensualidades · de dónde salen</div>`;"]] },
  'ingresos-titulo-viejo': { 'app-2-login.js': [["title='Mensualidades de '+cap;", "title='Ingresos de '+cap;"]] },
};
const sab = SAB ? (SABOTAJES[SAB] || (() => { throw new Error('sabotaje desconocido: ' + SAB); })()) : {};
const leer = f => { let s = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n'); (sab[f] || []).forEach(([a, b]) => { if (s.split(a).length !== 2) throw new Error('el sabotaje no aplica: ' + a.slice(0, 60)); s = s.replace(a, () => b); }); return s; };
const sacar = (src, firma) => { const i = src.indexOf(firma); if (i < 0) throw new Error('no está ' + firma); const j = src.indexOf('\n}\n', i); return src.slice(i, j + 3); };
const fallas = [];
const ok = (c, m) => { if (!c) fallas.push(m); };

function montar(clients, extra) {
  const login = leer('app-2-login.js');
  const els = {};
  class El { constructor(id) { this.id = id; this.innerHTML = ''; this.textContent = ''; this.style = {}; this.scrollTop = 0; const s = new Set(); this.classList = { add: c => s.add(c), remove: c => s.delete(c), contains: c => s.has(c) }; } }
  const ctx = vm.createContext(Object.assign({}, core, {
    console, JSON, Math, Date, Object, Array, String, Number, Set, Promise, setTimeout,
    document: { getElementById: id => els[id] || (els[id] = new El(id)) },
    DB: { clients, history: {}, msgs: {}, prs: {} },
    avcStyle: () => '', ini: n => String(n || '').slice(0, 2), aviIcon: n => '<svg data-i="' + n + '"></svg>',
    _roomFront() {}, _syncRoomBodyClass() {}, openDetail() {}, history: { back() {} },
    suplIngresosHTML: () => { ctx.__suplLlamado = true; return '<div>SUPLEMENTOS</div>'; },
    suplCargar: () => Promise.resolve(), SUPL: { cargado: true },
  }, extra || {}));
  vm.runInContext(sacar(login, 'function esc(s){') + '\n' + sacar(login, 'function _crepAv(') + '\n' + sacar(login, 'function _crepRow(') + '\n' + sacar(login, 'function _crepHero(') + '\n' + sacar(login, 'function _dueMs(') + '\n' + sacar(login, 'function openCoachStat(') + '\n', ctx);
  return { ctx, els, el: id => ctx.document.getElementById(id) };
}
const iso = d => new Date(d).toISOString();
const ahora = Date.now(), dia = 864e5;

(async () => {
  // ═════ C · «Mensualidades de <mes>»: solo planes, sin suplementos ═════
  {
    const hoy = new Date();
    const pago = (monto, d) => ({ date: iso(d), dueDate: iso(+d + 30 * dia), amount: monto, note: '' });
    const M = montar([
      { id: 'c1', name: 'Mariana Prueba', age: 30, payments: [pago(150000, hoy)] },
      { id: 'c2', name: 'Sebastián Prueba', age: 33, payments: [pago(120000, hoy)] },
    ]);
    M.ctx.openCoachStat('ingresos');
    const html = M.el('coach-stat-body').innerHTML, titulo = M.el('coach-stat-title').textContent;
    ok(/^Mensualidades de /.test(titulo), '🔴 C: el reporte de ingresos tiene que llamarse «Mensualidades de <mes>»: «' + titulo + '»');
    ok(!M.ctx.__suplLlamado && !/SUPLEMENTOS/.test(html), '🔴 C: el reporte de mensualidades trae suplementos (van en Tienda → Ventas)');
    ok(/\$270\.000/.test(html) && /Mariana Prueba/.test(html) && /Sebastián Prueba/.test(html), 'C: CONTROL, el reporte sí trae las mensualidades (total $270.000 y quién pagó)');
    // sin pagos tampoco
    const V = montar([{ id: 'c1', name: 'Mariana Prueba', age: 30, payments: [] }]);
    V.ctx.openCoachStat('ingresos');
    ok(!V.ctx.__suplLlamado && /Aún no hay pagos registrados/.test(V.el('coach-stat-body').innerHTML), '🔴 C: sin pagos, el reporte dice que no hay pagos y NO trae suplementos');
  }
  if (fallas.length) { console.error('FALLA (' + fallas.length + ')' + (SAB ? ' [sabotaje ' + SAB + ']' : '') + ':\n - ' + fallas.join('\n - ')); process.exit(1); }
  console.log('OK');
})().catch(e => { console.error('ERROR', e && e.stack); process.exit(2); });
