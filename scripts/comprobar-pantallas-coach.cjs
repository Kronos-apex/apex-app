// Prueba EN EJECUCIÓN de las pantallas del coach que cambiaron en la v756 (2ª parte): corre las funciones REALES de app-2-login.js
// (`openCoachStat`, `renderHome` y lo que pinta el Inicio) con un DOM falso. La lanza avi.test.js en un proceso aparte.
//
// Uso:  node scripts/comprobar-pantallas-coach.cjs [RAIZ]
//       SAB=<sabotaje> node scripts/comprobar-pantallas-coach.cjs    → tiene que salir con error
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const SAB = process.env.SAB || '';
const core = require(path.join(ROOT, 'avi-core.js'));
const TARJ_RET = '      <div class="card" style="margin-bottom:13px;display:none" id="h-retention-card">\n        <div class="ch"><div class="ctitle"><span class="t-ic" data-ic="chart">📊</span> Retención semanal</div><div id="h-ret-label" style="font-size:12px;color:var(--t2)"></div></div>\n        <div id="h-ret-bars" style="padding:4px 12px 12px"></div>\n      </div>\n';
const PEND_DIV = '      <div id="h-pend" style="display:none;margin-bottom:13px"></div>\n';
const SABOTAJES = {
  // el reporte de mensualidades vuelve a llevar los suplementos
  'ingresos-con-suplementos': { 'app-2-login.js': [["      html+=`<div class=\"sroom-sec\" style=\"margin-top:14px\">Mensualidades · de dónde salen</div>`;", "      html+=suplIngresosHTML(stat,empty);\n      html+=`<div class=\"sroom-sec\" style=\"margin-top:14px\">Mensualidades · de dónde salen</div>`;"]] },
  'ingresos-titulo-viejo': { 'app-2-login.js': [["title='Mensualidades de '+cap;", "title='Ingresos de '+cap;"]] },
  // el reporte de mensualidades pierde la nota «ya no aparecen los suplementos»
  'ingresos-sin-nota': { 'app-2-login.js': [["    html+=`<div class=\"sroom-cmp flat\" style=\"margin:12px 0\"><span>Aquí ya no aparecen los suplementos. Esos se ven en Tienda → Ventas.</span></div>`;\n", ""]] },
  // el coach («Yo») vuelve a salir en Prioritarios
  'prioritarios-con-yo': { 'app-2-login.js': [["const _hClientes=DB.clients.filter(c=>!(typeof isSelfClient==='function'&&isSelfClient(c)));", "const _hClientes=DB.clients.slice();"]] },
  // sin asesorados, el Inicio sale antes de pintar Pendientes y Tienda
  'pendientes-tras-return': { 'app-2-login.js': [["Añade el primero con el botón de arriba</div></div>';\n  }else{", "Añade el primero con el botón de arriba</div></div>';return;\n  }else{"]] },
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
  // v757 · la retención no se pinta en el Inicio (la tarjeta queda vacía)
  'inicio-sin-retencion': { 'app-2-login.js': [["      if(retBars)retBars.innerHTML=_ret.html;\n", ""]] },
  // v757 · la tarjeta de retención se cae del Inicio
  'inicio-sin-tarjeta-retencion': { 'index.html': [[TARJ_RET, ""]] },
  // v757 · la tarjeta de retención queda DEBAJO de Pendientes (fuera de su lugar)
  'retencion-fuera-de-lugar': { 'index.html': [[TARJ_RET, ""], [PEND_DIV, PEND_DIV + TARJ_RET]] },
  // v757 · el Inicio arma las barras por su cuenta (no usa la función compartida con el reporte)
  // v758 · la lista de quién entrenó cuenta SESIONES (una fila por sesión) en vez de personas
  'retencion-lista-por-sesion': { 'app-2-login.js': [["const filas=o.people.map(p=>{", "const filas=Object.keys(DB.history).reduce((a,id)=>a.concat((DB.history[id]||[]).filter(s=>retentionByDay({[id]:[s]},now,null)[marcada].count>0).map(s=>({id,routines:[s.routineName]}))),[]).map(p=>{"]] },
  // v758 · la lista sale de OTRA fuente: siempre la gente de hoy, no la del día marcado
  'retencion-lista-otra-fuente': { 'app-2-login.js': [["const filas=o.people.map(p=>{", "const filas=ordered[6].people.map(p=>{"]] },
  // v758 · tocar el mismo día otra vez NO lo cierra
  'retencion-no-cierra': { 'app-2-login.js': [["_retDia=(_retDia===ms)?null:ms;", "_retDia=ms;"]] },
  // v758 · la fila no abre la ficha
  'retencion-fila-muerta': { 'app-2-login.js': [["onclick=\"_crepGoDetail('${esc(String(p.id))}')\" style=\"display:flex;align-items:center;gap:8px;width:100%", "style=\"display:flex;align-items:center;gap:8px;width:100%"]] },
  // v758 · la fila llama openDetail directo: en el reporte de Sesiones la ficha se abre DEBAJO del reporte (dos atrás para volver)
  'retencion-fila-directa': { 'app-2-login.js': [["onclick=\"_crepGoDetail('${esc(String(p.id))}')\" style=\"display:flex;align-items:center;gap:8px;width:100%", "onclick=\"openDetail('${esc(String(p.id))}')\" style=\"display:flex;align-items:center;gap:8px;width:100%"]] },
  // v758 · la barra cuenta a quien ya no está en DB.clients (se deja de pasar la lista de personas)
  'retencion-sin-filtro': { 'app-2-login.js': [["return semanaEntreno(DB.history,now,DB.clients.map(c=>c.id));", "return semanaEntreno(DB.history,now);"]] },
  // v759 · el % vuelve a ser la ventana móvil de 7×24 h (otra ventana que las barras)
  'semana-pct-movil': { 'app-2-login.js': [["const pct=Math.round(sem.personas.length/DB.clients.length*100);", "const pct=Math.round(DB.clients.filter(c=>((DB.history||{})[c.id]||[]).some(s=>new Date(s.date)>=Date.now()-7*864e5)).length/DB.clients.length*100);"]] },
  // v759 · «Sesiones semana» vuelve a recorrer TODO DB.history en 7×24 h (incluye a quien ya no está en DB.clients)
  'semana-sesiones-todo-historial': { 'app-2-login.js': [["elSess.textContent=_semanaCoach(now).total;", "{let n=0;Object.values(DB.history||{}).forEach(a=>(a||[]).forEach(s=>{if(new Date(s.date)>=Date.now()-7*864e5)n++;}));elSess.textContent=n;}"]] },
  // v759 · el reporte de Sesiones usa otra ventana (7×24 h por cliente) y no la semana del Inicio
  'semana-reporte-otra-ventana': { 'app-2-login.js': [["const sem=_semanaCoach(now), totalSess=sem.total, nEnt=sem.personas.length;", "const sem=_semanaCoach(now), _v=DB.clients.map(c=>({c,n:((DB.history||{})[c.id]||[]).filter(s=>new Date(s.date)>=Date.now()-7*864e5).length})).filter(x=>x.n), totalSess=_v.reduce((t,x)=>t+x.n,0), nEnt=_v.length;"]] },
  // v759 · la ventana se dice como «en los últimos 7 días» (la frase vieja, que ya no es la ventana real)
  'semana-texto-viejo': { 'app-2-login.js': [["`${_semanaDesde(sem)} · ${nEnt}", "`en los últimos 7 días · ${nEnt}"]] },
  // v759 · medianoche: tocar una barra con el día cambiado solo repinta las barras (el % y «Sesiones» quedan con la semana vieja)
  'medianoche-solo-barras': { 'app-2-login.js': [["  if(_retPintado!==null&&localDayStart(now)!==_retPintado){ _semanaRepintar(); return; }\n", ""]] },
  // v759 · medianoche: un día tocado que ya salió de la ventana se marca igual (cae en la posición 0, que ahora es OTRO día)
  'medianoche-por-indice': { 'app-2-login.js': [["const marcada=_retDia===null?-1:ordered.findIndex(o=>o.ms===_retDia);", "const marcada=_retDia===null?-1:Math.max(0,ordered.findIndex(o=>o.ms===_retDia));"]] },
  // v759 · medianoche: al volver a la app con el día cambiado NO se repinta
  'medianoche-sin-volver': { 'app-2-login.js': [["  if(localDayStart(new Date())!==_retPintado)_semanaRepintar();\n}", "}"]] },
  // v759 · la cifra «Sin entrenar» pierde su nota «4+ días»
  'sinentrenar-sin-nota': { 'index.html': [["<div class=\"smn\" id=\"h-venc-nota\">4+ días</div>", ""]] },
  // v758 · el nombre del coach sale como un asesorado más
  'retencion-yo-sin-etiqueta': { 'app-2-login.js': [["?'Yo (tu entreno)':(c.name||'Sin nombre')", "?(c.name||'Sin nombre'):(c.name||'Sin nombre')"]] },
  'inicio-barras-propias': { 'app-2-login.js': [["    const _ret=_retencionBarras(now);\n", "    const _ret={pct:0,html:'<i></i>'};\n"]] },
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
  const nombres = ['function esc(s){', 'function _crepAv(', 'function _crepGoDetail(', 'function _crepRow(', 'function _crepHero(', 'function _dueMs(', 'function openCoachStat(', 'function _entrenaronHoyHTML(', 'function _semanaCoach(', 'function _semanaDesde(', 'function _retEtq(', 'function _retTexto(', 'function _retencionBarras(', 'function retencionDia(', 'function _semanaRepintar(', 'function _semanaAlVolver(', 'function _retencionHTML(', 'function _pendDolorPropio(', 'function _pendDatos(', 'function renderPendientes(', 'function pendMasToggle(', 'function pendIr(', 'function pendDescartar(', 'function dismissPulse(', 'function renderHome('];
  vm.runInContext(nombres.map(n => sacar(login, n)).join('\n') + '\nlet _pendAbierto=false, _pendItems=[];\nlet _retDia=null, _retPintado=null, _statKind=null; const _RET_DIAS=[\'Domingo\',\'Lunes\',\'Martes\',\'Miércoles\',\'Jueves\',\'Viernes\',\'Sábado\'];\n', ctx);
  return { ctx, els, el: id => ctx.document.getElementById(id) };
}
const iso = d => new Date(d).toISOString();
// v759: el toque lleva la FECHA de la barra (ms), no su posición; este ayudante toca «la barra i» tal como la ve la persona
const tocarDia = (M, i) => M.ctx.retencionDia(M.ctx._semanaCoach(new Date()).dias[i].ms);
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
  // ═════ C2 · la nota del dibujo aprobado ═════
  {
    const M = montar([{ id: 'c1', name: 'Mariana Prueba', age: 30, payments: [{ date: iso(Date.now()), dueDate: iso(Date.now() + 30 * dia), amount: 150000, note: '' }] }]);
    M.ctx.openCoachStat('ingresos');
    ok(/Aquí ya no aparecen los suplementos\. Esos se ven en Tienda → Ventas\./.test(M.el('coach-stat-body').innerHTML), '🔴 C: el reporte de Mensualidades lleva la nota «Aquí ya no aparecen los suplementos. Esos se ven en Tienda → Ventas.»');
    const V = montar([{ id: 'c1', name: 'Mariana Prueba', age: 30, payments: [] }]);
    V.ctx.openCoachStat('ingresos');
    ok(/Esos se ven en Tienda → Ventas/.test(V.el('coach-stat-body').innerHTML), '🔴 C: sin pagos también lleva la nota de los suplementos');
  }
  // ═════ D2 · «Yo» fuera de Prioritarios y Pendientes siempre pintados ═════
  {
    const hoy = Date.now();
    const ven = { id: 'c3', name: 'Carla Coach', age: 28, payments: [{ date: iso(hoy - 5 * 36e5), dueDate: iso(hoy + 25 * dia), amount: 150000 }] };
    const sinFuentes = { chatAwaiting: () => [], newAccountsList: () => [], deloadOverdue: () => [], coachPulse: () => [] };
    const P = montar([{ id: '_self', name: 'Yo', age: 35 }, ven], sinFuentes);
    P.ctx.renderHome();
    const filas = P.el('h-list').hijos.map(x => x.innerHTML);
    ok(filas.length === 1 && /Carla Coach/.test(filas[0]), '🔴 D2: Prioritarios trae SOLO a la persona (CONTROL) y no al coach «Yo»: ' + filas.length + ' filas');
    ok(!filas.some(f => />Yo</.test(f)), '🔴 D2: el coach («Yo») NO sale en Prioritarios');
    const dolor = { COACH_OWN_ROW: { profile: { painCare: [{ area: 'rodilla', level: 2 }] } } };
    const S = montar([{ id: '_self', name: 'Yo', age: 35 }], Object.assign({}, sinFuentes, dolor));
    S.ctx.renderHome();
    ok(/Sin asesorados todavía/.test(S.el('h-list').innerHTML) && S.el('h-list').hijos.length === 0, '🔴 D2: con solo el coach, Prioritarios dice «Sin asesorados todavía» y no lista a «Yo»');
    ok(/Reportaste dolor: rodilla/.test(S.el('h-pend').innerHTML), '🔴 D2: sin asesorados, los Pendientes SE PINTAN igual (dolor propio)');
    ok(S.ctx.__tiendaHome === true, '🔴 D2: sin asesorados, la tarjeta de la Tienda SE PINTA igual');
    const Z = montar([], Object.assign({}, sinFuentes, dolor));
    Z.ctx.renderHome();
    ok(/Reportaste dolor/.test(Z.el('h-pend').innerHTML) && Z.ctx.__tiendaHome === true, '🔴 D2: con 0 personas en la lista también se pintan Pendientes y Tienda');
  }
  // ═════ D · El Inicio limpio: Pendientes, la nota «N hoy» y el reporte de Sesiones ═════
  {
    const hoy = new Date(), hace = h => iso(+hoy - h * 3600000);
    // 🔴 24-nov, 00:01 locales: «hace 0,03 h» (108 s) cae AYER en el primer minuto del día y la cifra «N hoy» salía 1 en vez de 2. Las
    //    sesiones de «hoy» se anclan a la medianoche local (k = el orden), como las de la sección R.
    const d00 = new Date(hoy); d00.setHours(0, 0, 0, 0);
    const haceHoy = (h, k) => iso(Math.max(+hoy - h * 3600000, +d00 + k * 1000));
    const clientes = [
      { id: 'c1', name: 'Ana Coach', age: 30, payments: [{ date: hace(24 * 25), dueDate: hace(-24 * 3), amount: 150000 }] },        // vence en 3 días
      { id: 'c2', name: 'Beto Coach', age: 41, payments: [{ date: hace(24 * 40), dueDate: hace(24 * 4), amount: 150000 }] },      // venció hace 4 días
      { id: 'c3', name: 'Carla Coach', age: 28, payments: [{ date: hace(5), dueDate: hace(-24 * 25), amount: 150000 }] },
    ];
    const history = { c1: [{ date: haceHoy(0.03, 1), routineName: 'Pierna A' }], c3: [{ date: haceHoy(0.02, 2), routineName: 'Empuje' }, { date: haceHoy(0.01, 3), routineName: 'Core' }], c2: [{ date: hace(24 * 3), routineName: 'Tirón' }] };
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
    // v757 · la retención VUELVE al Inicio (bajo las 4 cifras, antes de Pendientes) y es la MISMA que la del reporte
    const barrasInicio = I.el('h-ret-bars').innerHTML, etq = I.el('h-ret-label').textContent;
    ok(/border-radius:4px 4px 0 0/.test(barrasInicio) && /^\d+% entrenaron esta semana$/.test(etq) && I.el('h-retention-card').style.display === '', '🔴 v757: el Inicio pinta la tarjeta «Retención semanal» con sus barras y su porcentaje: «' + etq + '»');
    ok(r.includes(barrasInicio) && r.includes('Retención semanal · ' + etq), '🔴 v757: el Inicio y el reporte de Sesiones usan LA MISMA función de barras (mismo HTML y mismo porcentaje)');
    const nBarras = (barrasInicio.match(/border-radius:4px 4px 0 0/g) || []).length;
    ok(nBarras === 7, 'v757: CONTROL, son 7 barras (una por día): ' + nBarras);
    ok(new Set((barrasInicio.match(/height:\d+px;width:100%/g) || [])).size > 1, '🔴 v757: con datos sembrados las barras salen DISTINTAS (si todas miden igual, no se ve nada)');
    // El coach (_self) cuenta en la retención, como antes de v756: 1 de 2 entrenó = 50 %
    const hoyD = new Date();
    const Y = montar([{ id: '_self', name: 'Yo', age: 35 }, { id: 'c9', name: 'Dora Coach', age: 30, payments: [] }], { __history: { _self: [{ date: iso(+hoyD - 3600000), routineName: 'Mío' }] } });
    Y.ctx.renderHome();
    ok(Y.el('h-ret-label').textContent === '50% entrenaron esta semana', '🔴 v757: el coach (_self) cuenta en la retención como antes de v756 (1 de 2 = 50 %): «' + Y.el('h-ret-label').textContent + '»');
    // Estados no felices: sin asesorados la tarjeta se oculta; con uno y sin sesiones sale 0 %; con uno que entrenó, 100 %
    const Z0 = montar([]);
    Z0.ctx.renderHome();
    ok(Z0.el('h-retention-card').style.display === 'none' && Z0.el('h-ret-bars').innerHTML === '', '🔴 v757: sin asesorados la tarjeta de retención se OCULTA (como antes de v756)');
    const U0 = montar([{ id: 'c9', name: 'Dora Coach', age: 30, payments: [] }]);
    U0.ctx.renderHome();
    ok(U0.el('h-retention-card').style.display === '' && U0.el('h-ret-label').textContent === '0% entrenaron esta semana' && /border-radius:4px 4px 0 0/.test(U0.el('h-ret-bars').innerHTML), '🔴 v757: con un asesorado y sin sesiones sale 0 % y las 7 barras bajas (no se rompe)');
    const U1 = montar([{ id: 'c9', name: 'Dora Coach', age: 30, payments: [] }], { __history: { c9: [{ date: iso(+hoyD - 3600000), routineName: 'X' }] } });
    U1.ctx.renderHome();
    ok(U1.el('h-ret-label').textContent === '100% entrenaron esta semana', '🔴 v757: con un asesorado que entrenó sale 100 %: «' + U1.el('h-ret-label').textContent + '»');
    // El orden en index.html: 4 cifras → Retención semanal → Pendientes → Tienda → Prioritarios
    const html = leer('index.html').replace(/<!--[\s\S]*?-->/g, '');
    const pos = id => html.indexOf('id="' + id + '"');
    ok(pos('h-ingr') > 0 && pos('h-venc') > 0 && pos('h-venc') < pos('h-retention-card') && pos('h-retention-card') < pos('h-pend') && pos('h-pend') < pos('h-tienda') && pos('h-tienda') < pos('h-list'), '🔴 v757: el orden del Inicio es 4 cifras · Retención semanal · Pendientes · Tienda · Prioritarios (posiciones: ' + ['h-venc', 'h-retention-card', 'h-pend', 'h-tienda', 'h-list'].map(pos).join(' / ') + ')');
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

  // ═════ R · v758 · tocar una barra de la Retención: quién entrenó ese día (una fila por PERSONA, de la MISMA fuente que la barra) ═════
  {
    const d0 = new Date(); d0.setHours(0, 0, 0, 1); const base = +d0;
    const clientesR = [
      { id: 'c1', name: 'Ana Prueba', age: 30, payments: [] },
      { id: 'c2', name: 'Beto <b>Prueba</b>', age: 41, payments: [] },
      { id: 'c3', name: 'Carla Prueba', age: 28, payments: [] },
      { id: '_self', name: 'Yo', age: 35, payments: [] },
    ];
    const ses = (ms, rutina) => ({ date: iso(ms), routineName: rutina });
    const hist = {
      c1: [ses(base + 1000, 'Pierna A'), ses(base + 2000, 'Core'), ses(base - 2.5 * dia, 'Tirón')],   // hoy: 2 sesiones de UNA persona
      c3: [ses(base + 3000, 'Empuje'), ses(base - 12 * 36e5, 'Empuje')],
      _self: [ses(base + 4000, 'Mi pierna')],
      c2: [ses(base - 12 * 36e5, 'Tirón <i>x</i>')],
    };
    const R = montar(clientesR, { __history: hist });
    R.ctx.renderHome();
    const bars0 = R.el('h-ret-bars').innerHTML;
    ok((bars0.match(/class="ret-dia"/g) || []).length === 7 && !/class="ret-fila"/.test(bars0), '🔴 R: al cargar hay 7 barras-botón y NINGÚN día marcado ni lista');
    ok(/Toca un día para ver quién entrenó/.test(bars0) && !/aria-pressed="true"/.test(bars0), '🔴 R: al cargar sale la pista «Toca un día para ver quién entrenó»');
    const num = (html, i) => { const bt = html.split('class="ret-dia"').slice(1)[i] || ''; const m = bt.match(/<span style="font-size:9px;color:var\(--t2\)">(\d*)<\/span>/); return m ? Number(m[1] || 0) : -1; };
    // 🔒 para CADA día: las filas son tantas como dice la barra (misma fuente), y tocar el mismo día lo cierra
    let hayDia = 0;
    for (let i = 0; i < 7; i++) {
      tocarDia(R,i);
      const h1 = R.el('h-ret-bars').innerHTML, n = num(h1, i), filas = (h1.match(/class="ret-fila"/g) || []).length;
      ok(n === filas, '🔴 R: el día ' + i + ' dice ' + n + ' en la barra y la lista trae ' + filas + ' filas (tienen que ser las mismas)');
      ok((h1.match(/aria-pressed="true"/g) || []).length === 1 && new RegExp('data-ret="' + i + '" aria-pressed="true"').test(h1), '🔴 R: solo la barra tocada (' + i + ') queda marcada');
      if (n === 0) ok(/Nadie entrenó este día/.test(h1), '🔴 R: un día sin nadie dice «Nadie entrenó este día»'); else { hayDia++; ok(new RegExp(_etq() + '[^<]*· ' + n + (n === 1 ? ' entrenó' : ' entrenaron')).test(h1) || /· \d+ entren/.test(h1), 'R: el encabezado dice «Día N · n entrenaron»'); }
      tocarDia(R,i);
      const h2 = R.el('h-ret-bars').innerHTML;
      ok(!/class="ret-fila"/.test(h2) && !/aria-pressed="true"/.test(h2) && /Toca un día/.test(h2), '🔴 R: tocar el MISMO día otra vez lo cierra (día ' + i + ')');
    }
    function _etq() { return '[A-Za-zÁÉÍÓÚáéíóúñ]+ \\d+'; }
    ok(hayDia >= 3, 'R: CONTROL, la prueba recorrió al menos 3 días con gente (' + hayDia + ')');
    // hoy: 3 PERSONAS (4 sesiones): la barra dice 3 y la lista trae 3 filas, una por persona
    tocarDia(R,6);
    const hoyH = R.el('h-ret-bars').innerHTML;
    ok(num(hoyH, 6) === 3 && (hoyH.match(/class="ret-fila"/g) || []).length === 3, '🔴 R: hoy hay 4 sesiones de 3 personas: la barra dice 3 y la lista trae 3 filas (una por PERSONA): barra ' + num(hoyH, 6) + ', filas ' + (hoyH.match(/class="ret-fila"/g) || []).length);
    ok(/Pierna A · Core/.test(hoyH) && /Yo \(tu entreno\)/.test(hoyH) && /Ana Prueba/.test(hoyH) && /Carla Prueba/.test(hoyH), '🔴 R: cada fila lleva el nombre y la(s) rutina(s) del día; el coach sale como «Yo (tu entreno)»');
    // 🔒 se EJECUTA el toque de la fila (no se lee el texto): en el Inicio abre la ficha de una vez; con el reporte de Sesiones ABIERTO tiene que
    //    cerrar el reporte primero (history.back) y abrir la ficha después, como el resto de filas del reporte (_crepGoDetail).
    const alTocar = S => S.el('h-ret-bars').innerHTML.split('class="ret-fila"').slice(1).map(x => (x.match(/onclick="([^"]+)"/) || [])[1]);
    const llamadas = [], atras = []; R.ctx.openDetail = id => llamadas.push(id); R.ctx.history = { back() { atras.push(1); } };
    const toques = alTocar(R);   // hoy sigue marcado en el Inicio (el reporte de Sesiones aún no se abrió: la sala está cerrada)
    ok(toques.length === 3 && toques.every(x => x), '🔴 R: las filas traen su toque');
    vm.runInContext(toques[0], R.ctx);
    ok(llamadas.length === 1 && atras.length === 0, '🔴 R: en el Inicio (sin reporte abierto) tocar la fila abre la ficha de una vez y no toca el historial: ' + JSON.stringify({ llamadas, atras: atras.length }));
    R.el('coach-stat-room').classList.add('on');   // ahora el reporte de Sesiones está ABIERTO
    llamadas.length = 0;
    vm.runInContext(toques[1], R.ctx);
    ok(atras.length === 1 && llamadas.length === 0, '🔴 R: con el reporte abierto, tocar la fila lo CIERRA primero (history.back) y NO abre la ficha debajo del reporte: ' + JSON.stringify({ llamadas, atras: atras.length }));
    await new Promise(r => setTimeout(r, 150));
    ok(llamadas.length === 1, '🔴 R: y luego abre la ficha (tras cerrar el reporte): ' + JSON.stringify(llamadas));
    R.el('coach-stat-room').classList.remove('on');
    ok(/aria-label="[^"]+ \d+: 3 entrenaron"/.test(hoyH) && /aria-label="[^"]+ \d+: nadie entrenó"/.test(hoyH), '🔴 R: cada barra es un botón con aria-label «Viernes 21: 3 entrenaron» / «…: nadie entrenó»');
    ok(!/<b>Prueba<\/b>/.test(hoyH), 'R: CONTROL, el nombre con HTML se escapa (esc)');
    tocarDia(R,5);
    const ayerH = R.el('h-ret-bars').innerHTML;
    ok(/Beto &lt;b&gt;Prueba&lt;\/b&gt;/.test(ayerH) && /Tirón &lt;i&gt;x&lt;\/i&gt;/.test(ayerH) && !/<i>x<\/i>/.test(ayerH), '🔴 R: nombre y rutina se escapan con esc() (ayer: Beto y su rutina con HTML)');
    ok((ayerH.match(/aria-pressed="true"/g) || []).length === 1 && new RegExp('data-ret="5" aria-pressed="true"').test(ayerH) && (ayerH.match(/class="ret-fila"/g) || []).length === 2, '🔴 R: tocar OTRO día cambia la lista (ayer: 2 personas) y deja marcado solo ese');
    // el reporte de Sesiones usa la MISMA función y se repinta también
    tocarDia(R,5);
    R.ctx.openCoachStat('sesiones');
    const rep = R.el('coach-stat-body').innerHTML;
    ok(/id="ret-rep"/.test(rep) && (rep.match(/class="ret-dia"/g) || []).length === 7 && /Toca un día para ver quién entrenó/.test(rep), '🔴 R: el reporte de Sesiones trae las mismas barras-botón y la pista');
    tocarDia(R,6);
    ok((R.el('ret-rep').innerHTML.match(/class="ret-fila"/g) || []).length === 3 && (R.el('h-ret-bars').innerHTML.match(/class="ret-fila"/g) || []).length === 3, '🔴 R: al tocar un día se repintan LAS DOS pantallas (el Inicio y el reporte)');
    // 🔒 una sesión de alguien que ya NO está en DB.clients no infla la barra ni mete una fila fantasma
    const RF = montar(clientesR, { __history: Object.assign({}, hist, { fantasma: [ses(base + 6000, 'Fantasma')] }) });
    RF.ctx.renderHome(); tocarDia(RF,6);
    const hf = RF.el('h-ret-bars').innerHTML;
    ok(num(hf, 6) === 3 && (hf.match(/class="ret-fila"/g) || []).length === 3 && !/Fantasma/.test(hf), '🔴 R: un id que ya no está en DB.clients NO cuenta en la barra ni sale en la lista (hoy: 3 personas): barra ' + num(hf, 6));
    // el día marcado no es de los datos: un montaje nuevo arranca sin ninguno
    const R2 = montar(clientesR, { __history: hist });
    R2.ctx.renderHome();
    ok(!/aria-pressed="true"/.test(R2.el('h-ret-bars').innerHTML), 'R: CONTROL, un Inicio recién abierto no trae ningún día marcado');
    // sin nadie que entrenara (con asesorados): cada día dice «Nadie entrenó este día»
    const R3 = montar([{ id: 'c1', name: 'Ana Prueba', age: 30, payments: [] }], { __history: {} });
    R3.ctx.renderHome(); tocarDia(R3,3);
    ok(/Nadie entrenó este día/.test(R3.el('h-ret-bars').innerHTML) && !/class="ret-fila"/.test(R3.el('h-ret-bars').innerHTML), 'R: sin historial, un día marcado dice «Nadie entrenó este día»');
  }

  // ═════ S · v759 · UNA sola semana: el %, las barras, «Sesiones semana» y el reporte de Sesiones cuentan lo mismo ═════
  {
    const t = new Date();
    const en = (k, h, mi, se) => iso(new Date(t.getFullYear(), t.getMonth(), t.getDate() - k, h, mi || 0, se || 0));
    const clientesS = [
      { id: 'a', name: 'Ana Prueba', age: 30, payments: [] }, { id: 'b', name: 'Beto Prueba', age: 41, payments: [] },
      { id: 'c', name: 'Carla Prueba', age: 28, payments: [] }, { id: 'd', name: 'Dario Prueba', age: 35, payments: [] },
    ];
    const histS = {
      a: [{ date: en(0, 0, 0, 1), routineName: 'Pierna' }, { date: en(0, 0, 0, 2), routineName: 'Core' }, { date: en(6, 12), routineName: 'Tirón' }],   // 2 entrenos HOY + uno hace 6 días
      b: [{ date: en(6, 12), routineName: 'Empuje' }],                                                                                                // el día más viejo de la ventana
      c: [{ date: en(7, 23, 59, 59), routineName: 'Fantasma de ayer' }],                                                                              // hace 7 días a las 11:59 p. m.: FUERA de las barras, DENTRO de 7×24 h casi todo el día
      ghost: [{ date: en(0, 0, 0, 3), routineName: 'Ya no está' }],                                                                                    // alguien que ya no está en DB.clients
    };
    const S = montar(clientesS, { __history: histS });
    S.ctx.renderHome();
    const sem = S.ctx._semanaCoach(new Date());
    // la verdad que se espera, calculada aparte: 2 personas (a, b) y 4 sesiones (a: 3, b: 1); c cae fuera por un segundo y ghost no existe
    ok(sem.personas.length === 2 && sem.total === 4, '🔴 S: CONTROL, la fuente cuenta 2 personas y 4 sesiones (cuenta ' + sem.personas.length + ' y ' + sem.total + ')');
    // unión de las personas de las 7 barras (tocando cada día) ÷ DB.clients
    const unionIds = new Set(); let sumaBarras = 0;
    for (let i = 0; i < 7; i++) {
      tocarDia(S,i);
      const h1 = S.el('h-ret-bars').innerHTML;
      (h1.match(/_crepGoDetail\('([^']+)'\)/g) || []).forEach(x => unionIds.add(x.match(/'([^']+)'/)[1]));
      tocarDia(S,i);
    }
    sem.dias.forEach(d => { sumaBarras += d.sesiones; });
    const pctBarras = Math.round(unionIds.size / clientesS.length * 100);
    ok(unionIds.size === 2 && pctBarras === 50, '🔴 S: la unión de las personas de las 7 barras es 2 de 4 = 50 % (da ' + [...unionIds] + ')');
    ok(S.el('h-ret-label').textContent === pctBarras + '% entrenaron esta semana', '🔴 S: el % de la tarjeta («' + S.el('h-ret-label').textContent + '») tiene que ser la unión de las barras ÷ personas (' + pctBarras + ' %)');
    ok(String(S.el('h-sess').textContent) === String(sumaBarras) && sumaBarras === 4, '🔴 S: «Sesiones semana» (' + S.el('h-sess').textContent + ') tiene que ser la suma de las sesiones de los 7 días (' + sumaBarras + ')');
    // el reporte da LOS MISMOS números que el Inicio
    S.ctx.openCoachStat('sesiones');
    const rep = S.el('coach-stat-body').innerHTML;
    const stats = [...rep.matchAll(/<div class="sroom-stat-v">([^<]*)<\/div><div class="sroom-stat-l">([^<]*)<\/div>/g)].reduce((o, m) => { o[m[2]] = m[1]; return o; }, {});
    ok(stats.Sesiones === String(S.el('h-sess').textContent) && stats.Entrenaron === String(unionIds.size) && stats.Promedio === '2', '🔴 S: el reporte (Sesiones ' + stats.Sesiones + ' · Entrenaron ' + stats.Entrenaron + ' · Promedio ' + stats.Promedio + ') no da lo mismo que el Inicio (4 sesiones, 2 personas, promedio 2)');
    ok(new RegExp('class="sroom-title"[^>]*>' + S.el('h-sess').textContent + '<').test(rep), '🔴 S: el número grande del reporte no es el de «Sesiones semana»');
    const nombresRep = (rep.split('Quién entrenó')[1] || '').split('Retención semanal')[0];
    ok(/Ana Prueba/.test(nombresRep) && /Beto Prueba/.test(nombresRep) && !/Carla Prueba/.test(nombresRep) && !/Dario Prueba/.test(nombresRep) && !/Ya no está/.test(rep), '🔴 S: «Quién entrenó» trae a Ana y a Beto y NO a quien quedó fuera de la ventana ni a quien ya no está');
    ok(/Retención semanal · 50% entrenaron esta semana/.test(rep), '🔴 S: el encabezado de Retención del reporte dice 50 %');
    ok(new RegExp('del ' + sem.desde.label.toLowerCase() + ' ' + sem.desde.dia + ' a hoy · 2 asesorados').test(rep) && !/últimos 7 días/.test(rep), '🔴 S: el reporte dice la ventana real («del ' + sem.desde.label.toLowerCase() + ' ' + sem.desde.dia + ' a hoy · 2 asesorados»), no «en los últimos 7 días»');
    ok(/id="h-venc-nota"[^>]*>4\+ días</.test(leer('index.html')), '🔴 S: «Sin entrenar» lleva su nota «4+ días» bajo el número');
  }

  // ═════ M · v759 · LA MEDIANOCHE: el Inicio abierto al cambiar el día habla de UNA sola semana, y el día tocado se identifica por su FECHA ═════
  {
    const RealDate = Date;
    const fijo = ms => { class F extends RealDate { constructor(...a) { if (a.length === 0) super(ms); else super(...a); } static now() { return ms; } } return F; };
    const T1 = new RealDate(2026, 10, 24, 23, 59, 58).getTime(), T2 = new RealDate(2026, 10, 25, 0, 0, 2).getTime();
    const hs = (d, h) => new RealDate(2026, 10, d, h).toISOString();
    const histM = { a: [{ date: hs(18, 9), routineName: 'Pierna' }], b: [{ date: hs(24, 9), routineName: 'Empuje' }] };
    try {
      global.Date = fijo(T1);
      const Mn = montar([{ id: 'a', name: 'Ana Prueba', payments: [] }, { id: 'b', name: 'Beto Prueba', payments: [] }], { __history: histM, CUR: { loggedAs: 'coach' } });
      Mn.ctx.Date = global.Date; Mn.ctx.document.visibilityState = 'visible';
      Mn.ctx.renderHome();
      const ms18 = Mn.ctx._semanaCoach(new RealDate(T1)).dias[0].ms;   // la barra «Miércoles 18», tal como estaba pintada a las 23:59:58
      ok(Mn.el('h-ret-label').textContent === '100% entrenaron esta semana' && String(Mn.el('h-sess').textContent) === '2' && /data-ret="0"[^>]*aria-label="Miércoles 18/.test(Mn.el('h-ret-bars').innerHTML), '🔴 M: CONTROL, a las 23:59:58 el Inicio dice 100 %, 2 sesiones y la 1ª barra es el Miércoles 18');
      // el reloj cruza la medianoche y la persona toca la barra que VE (Miércoles 18)
      global.Date = fijo(T2); Mn.ctx.Date = global.Date;
      Mn.ctx.retencionDia(ms18);
      const h2 = Mn.el('h-ret-bars').innerHTML;
      ok(Mn.el('h-ret-label').textContent === '50% entrenaron esta semana' && String(Mn.el('h-sess').textContent) === '1', '🔴 M: con el día cambiado, tocar una barra repinta TODAS las cifras con la semana nueva (el % y «Sesiones» seguían con la de ayer): «' + Mn.el('h-ret-label').textContent + '» · ' + Mn.el('h-sess').textContent);
      ok(!/aria-pressed="true"/.test(h2) && !/ret-fila/.test(h2) && /Toca un día/.test(h2), '🔴 M: el Miércoles 18 ya salió de la ventana: NO se marca ningún día (se marcaba el Jueves 19, que ocupa su lugar)');
      ok(/data-ret="0"[^>]*aria-label="Jueves 19/.test(h2) && /data-ret="6"[^>]*aria-label="Miércoles 25/.test(h2), 'M: CONTROL, las barras son las de la semana nueva (Jueves 19 a Miércoles 25)');
      // CONTROL: tocar un día que SÍ sigue en la ventana lo marca por su fecha (Jueves 19 = posición 0 ahora)
      const ms19 = Mn.ctx._semanaCoach(new RealDate(T2)).dias[0].ms;
      Mn.ctx.retencionDia(ms19);
      ok(/data-ret="0" aria-pressed="true"/.test(Mn.el('h-ret-bars').innerHTML) && /Jueves 19 · nadie|Nadie entrenó este día/.test(Mn.el('h-ret-bars').innerHTML), '🔴 M: tocar el Jueves 19 (sigue en la ventana) lo marca por su fecha');
      Mn.ctx.retencionDia(ms19);
      ok(!/aria-pressed="true"/.test(Mn.el('h-ret-bars').innerHTML), 'M: CONTROL, tocar la misma fecha otra vez la desmarca');
      // el reporte de Sesiones ABIERTO al cruzar la medianoche, y la persona vuelve a la app (visibilitychange)
      global.Date = fijo(T1); Mn.ctx.Date = global.Date;
      Mn.ctx.renderHome(); Mn.ctx.openCoachStat('sesiones'); Mn.el('coach-stat-room').classList.add('on');
      ok(/class="sroom-title"[^>]*>2</.test(Mn.el('coach-stat-body').innerHTML), 'M: CONTROL, el reporte de las 23:59:58 dice 2 sesiones');
      Mn.el('h-sess').textContent = 'VIEJO';   // marca para ver si algo repinta
      Mn.ctx._semanaAlVolver();
      ok(Mn.el('h-sess').textContent === 'VIEJO', '🔴 M: al volver a la app con el MISMO día no se repinta nada (no hay por qué)');
      global.Date = fijo(T2); Mn.ctx.Date = global.Date;
      Mn.ctx._semanaAlVolver();
      const rep2 = Mn.el('coach-stat-body').innerHTML;
      ok(String(Mn.el('h-sess').textContent) === '1' && Mn.el('h-ret-label').textContent === '50% entrenaron esta semana', '🔴 M: al volver a la app con el día cambiado se repintan las cifras del Inicio («' + Mn.el('h-sess').textContent + '», «' + Mn.el('h-ret-label').textContent + '»)');
      ok(/class="sroom-title"[^>]*>1</.test(rep2) && /del jue 19 a hoy/.test(rep2) && /Retención semanal · 50%/.test(rep2), '🔴 M: y también el reporte de Sesiones abierto (1 sesión, «del jue 19 a hoy», 50 %)');
      // sin sesión de coach (otra pantalla) no se toca nada
      Mn.ctx.CUR.loggedAs = 'cliente'; Mn.el('h-sess').textContent = 'VIEJO'; Mn.ctx._semanaAlVolver();
      ok(Mn.el('h-sess').textContent === 'VIEJO', 'M: CONTROL, fuera del panel del coach no se repinta');
    } finally { global.Date = RealDate; }
  }

  if (fallas.length) { console.error('FALLA (' + fallas.length + ')' + (SAB ? ' [sabotaje ' + SAB + ']' : '') + ':\n - ' + fallas.join('\n - ')); process.exit(1); }
  console.log('OK');
})().catch(e => { console.error('ERROR', e && e.stack); process.exit(2); });
