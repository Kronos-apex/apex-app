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
  // un Pendiente se pierde: las descargas terminadas ya no entran a la lista
  'pendiente-perdido': { 'app-2-login.js': [["    descarga:(typeof deloadOverdue==='function')?deloadOverdue(DB.clients,now.getTime()):[],\n", ""]] },
  // «Ver N más» no abre el resto
  'pendientes-sin-ver-mas': { 'app-2-login.js': [["function pendMasToggle(){ _pendAbierto=!_pendAbierto; renderPendientes(); }", "function pendMasToggle(){ renderPendientes(); }"]] },
  // «Sesiones semana» ya no dice quién entrenó hoy
  'sesiones-sin-hoy': { 'app-2-login.js': [["      html+=_entrenaronHoyHTML(now);\n", ""]] },
  // «Sesiones semana» ya no trae la retención
  'sesiones-sin-retencion': { 'app-2-login.js': [["    html+=_retencionHTML(now);\n", ""]] },
  // al guardar el plan de comida no se repinta la alerta de revisión
  'nutricion-sin-alerta': { 'app-5-salud.js': [["  if(_cNut&&typeof renderNutReviewCard==='function')renderNutReviewCard(_cNut);\n", ""]] },
  // al guardar el plan de comida no se repinta el Resumen
  'nutricion-sin-resumen': { 'app-5-salud.js': [["  if(typeof detailSummaryLater==='function')detailSummaryLater();", ""]] },
  // el Inicio no pinta los Pendientes
  'inicio-sin-pendientes': { 'app-2-login.js': [["  if(typeof renderPendientes==='function')renderPendientes();\n  if(typeof tiendaRenderHome", "  if(typeof tiendaRenderHome"]] },
};
const sab = SAB ? (SABOTAJES[SAB] || (() => { throw new Error('sabotaje desconocido: ' + SAB); })()) : {};
const leer = f => { let s = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n'); (sab[f] || []).forEach(([a, b]) => { if (s.split(a).length !== 2) throw new Error('el sabotaje no aplica: ' + a.slice(0, 60)); s = s.replace(a, () => b); }); return s; };
const sacar = (src, firma) => { const i = src.indexOf(firma); if (i < 0) throw new Error('no está ' + firma); const j = src.indexOf('\n}\n', i); return src.slice(i, j + 3); };
const fallas = [];
const ok = (c, m) => { if (!c) fallas.push(m); };

function montar(clients, extra) {
  const login = leer('app-2-login.js');
  const els = {};
  class El { constructor(id) { this.id = id; this.innerHTML = ''; this.textContent = ''; this.style = {}; this.scrollTop = 0; this.hijos = []; this.appendChild = x => { this.hijos.push(x); }; const s = new Set(); this.classList = { add: c => s.add(c), remove: c => s.delete(c), contains: c => s.has(c) }; } }
  const ctx = vm.createContext(Object.assign({}, core, {
    console, JSON, Math, Date, Object, Array, String, Number, Set, Promise, setTimeout,
    DB: { clients, history: (extra && extra.__history) || {}, msgs: {}, prs: {} },
    document: { getElementById: id => els[id] || (els[id] = new El(id)), createElement: () => new El('x') },
    avcStyle: () => '', ini: n => String(n || '').slice(0, 2), aviIcon: n => '<svg data-i="' + n + '"></svg>',
    _roomFront() {}, _syncRoomBodyClass() {}, openDetail() {}, history: { back() {} },
    suplIngresosHTML: () => { ctx.__suplLlamado = true; return '<div>SUPLEMENTOS</div>'; },
    suplCargar: () => Promise.resolve(), SUPL: { cargado: true },
    localStorage: { _m: {}, get length() { return Object.keys(this._m).length; }, key(i) { return Object.keys(this._m)[i]; }, getItem(k) { return k in this._m ? this._m[k] : null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } },
    _coachClears: () => ({}), _newSeen: () => ({}), gp: (id) => { ctx.__gp = id; }, whatsappReminder() {}, openCoachChat: id => { ctx.__chat = id; }, openMyTraining() {}, newAccountOpen() {}, _pulseGo() {},
    openCoachNote() {}, tiendaRenderHome: () => { ctx.__tiendaHome = true; }, painCareActive: a => a, COACH_OWN_ROW: null,
  }, extra || {}));
  const nombres = ['function esc(s){', 'function _crepAv(', 'function _crepRow(', 'function _crepHero(', 'function _dueMs(', 'function openCoachStat(', 'function _entrenaronHoyHTML(', 'function _retencionHTML(', 'function _pendDolorPropio(', 'function _pendDatos(', 'function renderPendientes(', 'function pendMasToggle(', 'function pendIr(', 'function pendDescartar(', 'function dismissPulse(', 'function renderHome('];
  vm.runInContext(nombres.map(n => sacar(login, n)).join('\n') + '\nlet _pendAbierto=false, _pendItems=[];\n', ctx);
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
  // ═════ D · El Inicio limpio: Pendientes, la nota «N hoy» y el reporte de Sesiones ═════
  {
    const hoy = new Date(), hace = h => iso(+hoy - h * 3600000);
    const clientes = [
      { id: 'c1', name: 'Ana Coach', age: 30, payments: [{ date: hace(24 * 25), dueDate: hace(-24 * 3), amount: 150000 }] },        // vence en 3 días
      { id: 'c2', name: 'Beto Coach', age: 41, payments: [{ date: hace(24 * 40), dueDate: hace(24 * 4), amount: 150000 }] },      // venció hace 4 días
      { id: 'c3', name: 'Carla Coach', age: 28, payments: [{ date: hace(5), dueDate: hace(-24 * 25), amount: 150000 }] },
    ];
    const history = { c1: [{ date: hace(0.03), routineName: 'Pierna A' }], c3: [{ date: hace(0.02), routineName: 'Empuje' }, { date: hace(0.01), routineName: 'Core' }], c2: [{ date: hace(24 * 3), routineName: 'Tirón' }] };
    const fuentes = {
      chatAwaiting: () => [{ id: 'c1', name: 'Ana Coach', horas: 30, n: 1 }, { id: 'c3', name: 'Carla Coach', horas: 52, n: 2 }],
      newAccountsList: () => [{ id: 'n1', name: 'Nuria Libre', at: hace(5), sesiones: 0 }, { id: 'n2', name: 'Omar Libre', at: hace(30), sesiones: 1 }],
      deloadOverdue: () => [{ id: 'c2', name: 'Beto Coach', daysOver: 2 }],
      coachPulse: () => [{ id: 'c3', name: 'Carla Coach', type: 'record', label: 'subió su récord en sentadilla' }, { id: 'c1', name: 'Ana Coach', type: 'racha', label: 'lleva 6 semanas seguidas' }],
    };
    const M = montar(clientes, Object.assign({ __history: history, COACH_OWN_ROW: { profile: { painCare: [{ area: 'hombro', side: 'izquierdo', level: 2 }] } } }, fuentes));
    const { ctx, el } = M;
    ctx.renderPendientes();
    let h = el('h-pend').innerHTML;
    const filas = x => (x.match(/class="pend-tx">[^<]*/g) || []).map(t => t.replace('class="pend-tx">', ''));
    let v = filas(h);
    ok(el('h-pend').style.display === 'block' && /Pendientes/.test(h), 'D: con pendientes aparece la tarjeta «Pendientes»');
    ok(v.length === 3, '🔴 D: la tarjeta muestra EXACTAMENTE 3 pendientes (muestra ' + v.length + '): ' + JSON.stringify(v));
    ok(/^2 chats esperan tu respuesta · hace 2 días$/.test(v[0]) && /^Reportaste dolor: hombro \(izquierdo\) · molesto$/.test(v[1]) && /^Beto Coach venció hace 4 días$/.test(v[2]), '🔴 D: van del más urgente al menos urgente (chats → dolor propio → vencido): ' + JSON.stringify(v));
    ok(/Ver 6 más/.test(h), '🔴 D: «Ver 6 más» (9 pendientes en total, 3 a la vista): ' + (h.match(/pend-more[^>]*>[^<]*/g) || []).join('|'));
    ok(/Escribirles a las cuentas nuevas en su app/.test(h), 'D: las cuentas nuevas conservan su puerta «Escribirles en su app»');
    ctx.pendMasToggle(); h = el('h-pend').innerHTML; v = filas(h);
    ok(v.length === 9, '🔴 D: «Ver más» abre TODOS (9) y no se pierde ninguno: ' + v.length + ' ' + JSON.stringify(v));
    ok(v.some(t => /Ana Coach vence/.test(t)) && v.some(t => /Nuria Libre · cuenta nueva/.test(t)) && v.some(t => /Omar Libre · cuenta nueva/.test(t)) && v.some(t => /Beto Coach: terminó su descarga/.test(t)) && v.some(t => /Carla Coach · subió su récord/.test(t)) && v.some(t => /Ana Coach · lleva 6 semanas/.test(t)), '🔴 D: faltan Pendientes en la lista completa (vencimiento, cuentas nuevas, descarga o pulso): ' + JSON.stringify(v));
    ok(/Ver menos/.test(h) && (h.match(/>WhatsApp</g) || []).length === 2 && (h.match(/aria-label="Descartar aviso"/g) || []).length === 2, 'D: «Ver menos», WhatsApp en los 2 vencimientos y ✕ en los 2 motivos para felicitar');
    // las acciones
    ctx.pendIr('await'); ok(ctx.__gp === 'p-msgs', 'D: tocar los chats que esperan abre Mensajes');
    let abierto = null; ctx.openDetail = id => { abierto = id; }; ctx.pendIr('vence:c2'); ok(abierto === 'c2', 'D: tocar un vencimiento abre la ficha de esa persona');
    ctx.pendDescartar('pulso:c3:record'); ok(ctx.localStorage.getItem('coachpulse_c3_record') && ctx.localStorage._m.coachpulse_c3_record > Date.now(), 'D: ✕ descarta ese motivo por 3 días');
    // sin nada pendiente, la tarjeta NO aparece
    const V = montar([{ id: 'c3', name: 'Carla Coach', age: 28, payments: [{ date: hace(5), dueDate: hace(-24 * 25), amount: 150000 }] }], { chatAwaiting: () => [], newAccountsList: () => [], deloadOverdue: () => [], coachPulse: () => [] });
    V.ctx.renderPendientes();
    ok(V.el('h-pend').style.display === 'none' && V.el('h-pend').innerHTML === '', '🔴 D: sin nada pendiente, la tarjeta de Pendientes NO aparece');
    // el Inicio: «N hoy» en Sesiones y los Pendientes + la Tienda se pintan
    const I = montar(clientes, Object.assign({ __history: history }, fuentes));
    I.ctx.renderHome();
    ok(I.el('h-sess-nota').textContent === '2 hoy', '🔴 D: la cifra Sesiones lleva la nota «N hoy»: «' + I.el('h-sess-nota').textContent + '»');
    ok(/Pendientes/.test(I.el('h-pend').innerHTML), '🔴 D: el Inicio pinta los Pendientes');
    ok(I.ctx.__tiendaHome === true, 'D: el Inicio pinta la tarjeta de la Tienda');
    ok(/\$/.test(I.el('h-ingr').textContent), 'D: «Mensualidades» sigue con su cifra');
    // Sesiones: quién entrenó hoy (tocable) y la retención semanal salieron del Inicio y viven aquí
    I.ctx.openCoachStat('sesiones');
    const r = I.el('coach-stat-body').innerHTML;
    ok(/Entrenaron hoy · /.test(r) && /_crepGoDetail\('c3'\)/.test(r) && /Empuje, Core/.test(r), '🔴 D: «Sesiones semana» dice quién entrenó hoy, tocable (Carla: Empuje, Core)');
    ok(/Retención semanal · \d+% entrenaron esta semana/.test(r) && /border-radius:4px 4px 0 0/.test(r), '🔴 D: «Sesiones semana» trae la Retención semanal con sus barras');
  }

  // ═════ E · Guardar el plan de comida repinta la alerta de revisión y el Resumen (sin salir de la ficha) ═════
  {
    const salud = leer('app-5-salud.js');
    const els = {}; const llamadas = [];
    class El2 { constructor(id) { this.id = id; this.value = ''; this.innerHTML = ''; } }
    const ctxE = vm.createContext({
      console, JSON, Math, Date, Object, Array, String, Number, parseInt,
      document: { getElementById: id => els[id] || (els[id] = new El2(id)) },
      CUR: { clientId: 'c1' }, DB: { clients: [{ id: 'c1', name: 'Ana Coach' }, { id: 'c2', name: 'Beto Coach' }], nutrition: {} },
      sv: () => {}, cm: () => {}, toast: () => {},
      renderNutritionCoach: id => llamadas.push('plan:' + id),
      renderNutReviewCard: c => llamadas.push('alerta:' + c.id),
      detailSummaryLater: () => llamadas.push('resumen'),
      renderNutritionClient: id => llamadas.push('cliente:' + id),
    });
    els['nut-kcal'] = Object.assign(new El2('nut-kcal'), { value: '2200' }); els['nut-plan'] = Object.assign(new El2('nut-plan'), { value: ' Plan de prueba ' });
    vm.runInContext(sacar(salud, 'function saveNutrition(') + '\nthis.__guardar=saveNutrition;', ctxE);
    ctxE.__guardar();
    ok(llamadas.includes('plan:c1'), 'E: CONTROL, guardar repinta el plan (lo que ya hacía)');
    ok(llamadas.includes('alerta:c1'), '🔴 E: al guardar el plan de comida se repinta la alerta de revisión DE ESA PERSONA (sin salir de la ficha)');
    ok(llamadas.includes('resumen'), '🔴 E: al guardar el plan de comida se repinta el Resumen (la marca de la pestaña Comida se apaga)');
    ok(ctxE.DB.nutrition.c1 && ctxE.DB.nutrition.c1.kcal === 2200 && ctxE.DB.nutrition.c1.plan === 'Plan de prueba', 'E: CONTROL, el plan se guardó');
  }

  if (fallas.length) { console.error('FALLA (' + fallas.length + ')' + (SAB ? ' [sabotaje ' + SAB + ']' : '') + ':\n - ' + fallas.join('\n - ')); process.exit(1); }
  console.log('OK');
})().catch(e => { console.error('ERROR', e && e.stack); process.exit(2); });
