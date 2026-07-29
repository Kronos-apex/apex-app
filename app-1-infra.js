'use strict';

// ── Debug logger: silencia console.log en producción ──
window.AVI_DEBUG = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const log  = (...a) => window.AVI_DEBUG && console.log(...a);
const warn = (...a) => window.AVI_DEBUG && console.warn(...a);

// ── Navegación con botón ATRÁS (Android/TWA): stack lógico de pantallas ──
// Cada navegación HACIA ADELANTE (cambiar de pestaña) registra en AVINAV.stack cómo
// deshacerse. El handler (_aviHandleBack en app-2-login.js) por cada atrás del sistema:
// cierra la habitación/overlay de arriba → o saca UN paso del stack (pestaña) → o en el
// inicio pide doble-atrás para salir.
//
// CLAVE (bug Camilo "atrás se devuelve una vez y a la SIGUIENTE se sale", reincidente pese a
// v211/v216): la lógica JS estaba bien (reproducida OK en escritorio); el bug es del WebView
// del TWA. El patrón viejo mantenía UN solo "guard" y lo RE-EMPUJABA dentro del popstate;
// esa operación (pushState dentro del propio handler de popstate) el WebView de Android la
// pierde a veces → el siguiente atrás cae al fondo del historial y Android cierra la app.
// ARREGLO (avi-v223): cada HABITACIÓN, al abrirse, empuja su PROPIA entrada de historial real
// (navOpenLayer → AVINAV.layers). El botón físico la saca de forma natural y el handler solo
// DESCUENTA la capa, sin re-empujar nada. Así se elimina la operación frágil para el flujo que
// Camilo usa (entrar a una habitación y salir con el botón físico).
const AVINAV = { stack: [], exitArmed: false, curTab: null, layers: 0 };
function navRecord(undo){ if(typeof undo==='function') AVINAV.stack.push({ undo: undo }); }
function navReset(tab){ AVINAV.stack.length=0; AVINAV.curTab=tab||null; AVINAV.exitArmed=false; AVINAV.layers=0; }
// Empuja una entrada de historial REAL por cada habitación que se abre (ver nota de arriba).
function navOpenLayer(){ AVINAV.layers=(AVINAV.layers||0)+1; history.pushState({aviLayer:1},''); }
// Cierre por UI (tap/swipe/Escape) de un overlay que empujó capa con navOpenLayer: consumir
// su entrada de historial con history.back() — el popstate hace el cierre real y descuenta
// la capa, igual que los botones "‹ Volver" de las habitaciones. Colchón: si no hay capa
// contada (el handler del atrás no llegó a instalarse), cerrar directo sin tocar el historial.
function navCloseLayer(closeFn){ if(AVINAV.layers>0){ history.back(); } else if(typeof closeFn==='function'){ closeFn(); } }

// ── Rate limiter de login ──
const LOGIN_ATTEMPTS_KEY = 'ax_login_attempts';
const LOGIN_BLOCK_KEY    = 'ax_login_block_until';
const MAX_ATTEMPTS = 5;
const BLOCK_MS     = 30000; // 30 segundos

function isLoginBlocked(){
  const until = parseInt(sessionStorage.getItem(LOGIN_BLOCK_KEY)||'0');
  return Date.now() < until;
}
function getLoginBlockRemaining(){
  const until = parseInt(sessionStorage.getItem(LOGIN_BLOCK_KEY)||'0');
  return Math.ceil((until - Date.now()) / 1000);
}
function recordLoginFail(){
  const attempts = parseInt(sessionStorage.getItem(LOGIN_ATTEMPTS_KEY)||'0') + 1;
  sessionStorage.setItem(LOGIN_ATTEMPTS_KEY, attempts);
  if(attempts >= MAX_ATTEMPTS){
    sessionStorage.setItem(LOGIN_BLOCK_KEY, Date.now() + BLOCK_MS);
    sessionStorage.setItem(LOGIN_ATTEMPTS_KEY, '0');
    return true; // blocked
  }
  return false;
}
function resetLoginAttempts(){
  sessionStorage.removeItem(LOGIN_ATTEMPTS_KEY);
  sessionStorage.removeItem(LOGIN_BLOCK_KEY);
}
// ══════════════════════ UTILS ══════════════════════
const MC={pecho:'#E76F51',espalda:'#457B9D',hombros:'#A855F7',biceps:'#0A7C5B',triceps:'#C77DFF',piernas:'#00BFA5',gluteo:'#F4845F',core:'#E63946',cardio:'#FF6B6B',otro:'#6B6B6B'};
const ME={pecho:'💪',espalda:'🔙',hombros:'⬆️',biceps:'🦾',triceps:'💪',piernas:'🦵',gluteo:'🍑',core:'🎯',cardio:'🏃',otro:'⚡'};
// Íconos por grupo muscular — SILUETA de cuerpo con el músculo trabajado RESALTADO en su
// color (estilo "músculos trabajados" de apps serias). Reemplaza los emojis genéricos.
// Cardio y "otro" no son músculos → ícono propio (corazón / mancuerna). muscleIcon(m,size).
const _BODY='<circle cx="12" cy="3.4" r="2.1"/><rect x="8.6" y="6.2" width="6.8" height="8" rx="2.2"/><rect x="5.4" y="6.6" width="2.4" height="6.6" rx="1.2"/><rect x="16.2" y="6.6" width="2.4" height="6.6" rx="1.2"/><rect x="9" y="14" width="2.7" height="7.4" rx="1.3"/><rect x="12.3" y="14" width="2.7" height="7.4" rx="1.3"/>';
const MH={
  pecho:'<rect x="8.6" y="6.2" width="6.8" height="3.7" rx="2"/>',
  espalda:'<rect x="8.6" y="6.2" width="6.8" height="7.7" rx="2.4"/>',
  hombros:'<rect x="8.6" y="6.2" width="6.8" height="2.1" rx="1"/><rect x="5.4" y="6.6" width="2.4" height="2.8" rx="1.2"/><rect x="16.2" y="6.6" width="2.4" height="2.8" rx="1.2"/>',
  biceps:'<rect x="5.4" y="6.6" width="2.4" height="3.7" rx="1.2"/><rect x="16.2" y="6.6" width="2.4" height="3.7" rx="1.2"/>',
  triceps:'<rect x="5.4" y="9.5" width="2.4" height="3.7" rx="1.2"/><rect x="16.2" y="9.5" width="2.4" height="3.7" rx="1.2"/>',
  piernas:'<rect x="9" y="14" width="2.7" height="7.4" rx="1.3"/><rect x="12.3" y="14" width="2.7" height="7.4" rx="1.3"/>',
  gluteo:'<rect x="8.8" y="13.3" width="6.4" height="3" rx="1.5"/>',
  core:'<rect x="8.9" y="10" width="6.2" height="4" rx="1.6"/>',
};
const _ICON_HEART='<path d="M12 19s-6-4.2-8-8a3.8 3.8 0 0 1 8-1 3.8 3.8 0 0 1 8 1c-2 3.8-8 8-8 8z"/>';
const _ICON_DUMBBELL='<path d="M6.5 9v6"/><path d="M9 7v10"/><path d="M15 7v10"/><path d="M17.5 9v6"/><path d="M9 12h6"/>';
// Vista anatómica que mejor muestra cada grupo en el ícono (frente o espalda).
const MM_ICON_VIEW={pecho:'front',espalda:'back',hombros:'front',biceps:'front',triceps:'back',piernas:'front',gluteo:'back',core:'front'};
function muscleIcon(muscle,size){
  const s=size||20;
  const m=muscle||'otro';
  const col=MC[m]||'var(--g)';
  if(m==='cardio') return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="${col}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block">${_ICON_HEART}</svg>`;
  if(!MH[m]) return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="${col}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block">${_ICON_DUMBBELL}</svg>`;
  // Mini-silueta anatómica con el músculo del grupo resaltado en su color (forma humana real).
  // A tamaño chico la silueta angosta se pierde; usamos un alto mínimo y silueta limpia
  // (sin líneas internas) para que el músculo resaltado se LEA. Si muscle-map.js no cargó,
  // caemos al ícono de bloques (respaldo seguro).
  if(typeof muscleMapSVG==='function'){
    try{ return muscleMapSVG(m, [], {view:MM_ICON_VIEW[m]||'front', size:Math.max(s,30), prim:col, primStroke:col, body:'#52665a', stroke:'#2a3d33', sw:0.4}); }catch(_){}
  }
  return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true" style="display:block"><g fill="var(--t3)" opacity="0.42">${_BODY}</g><g fill="${col}">${MH[m]}</g></svg>`;
}
// Paleta de avatares. Las iniciales las pinta `avcInk` con la tinta que contraste con cada
// color (`inkOn`, avi-core): con `color:white` fijo, 6 de los 8 no llegaban al mínimo de lectura
// y el amarillo daba 1.67:1. Dos colores se nudgearon lo justo para que el BLANCO les sirva —
// morado y rojo caían en la franja donde ni el blanco ni la tinta oscura alcanzaban (4.40/4.18);
// el tono es el mismo a ojo y así el conjunto no queda con mitad de iniciales blancas y mitad
// oscuras por un pelo de luminancia.
const AVC=['#0A7C5B','#457B9D','#E76F51','#994DE1','#00BFA5','#E9C46A','#D83642','#FF6B6B'];
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2)}
function ini(n){return n.trim().split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}
function avc(n){let h=0;for(const c of n)h=(h*31+c.charCodeAt(0))%AVC.length;return AVC[Math.abs(h)]}
// Estilo completo del avatar: el relleno y SU tinta, para que ningún sitio vuelva a escribir
// `background:${avc(x)}` a secas y heredar el blanco fijo de `.cav`.
function avcStyle(n){const c=avc(n);return `background:${c};color:${typeof inkOn==='function'?inkOn(c):'#FFFFFF'}`}
function fmtT(d){return new Date(d).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}
function fmtD(d){return new Date(d).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}
// ══════════ SUPABASE SYNC ══════════
const SB_URL='https://eoebhrxbokyllqalyecj.supabase.co';
const SB_KEY='sb_publishable_hKjgo84b9Lews5oq90b9Fg_1pue73W8';
const SB_KEYS=['ax_c','ax_e','ax_m','ax_hist','ax_pr','ax_bw','ax_tpl','ax_ce','ax_cn','ax_nut','ax_med','ax_photos','ax_cph','ax_site','ax_nequi','ax_msgreads','ax_leadsdone'];
// Ajustes GLOBALES del coach (no per-cliente, no secretos): ejercicios custom, nº Nequi para
// cobrar, nombre/email/sitio. En AUTH_MODE viven en SU fila (columna `coach_settings` jsonb),
// igual que las plantillas (ax_tpl→templates). Antes caían al vacío en _persistCoachWrite →
// se perdían al recargar (bug #1 auditoría 2026-06-30). ax_cph NO va aquí: la clave real del
// coach es la de Supabase Auth (lo cubre saveCoachPass→updateUser, bug #2).
const _COACH_SETTINGS_KEYS=['ax_e','ax_nequi','ax_cn','ax_ce','ax_site','ax_msgreads','ax_leadsdone'];
// Construye el objeto completo coach_settings desde el estado local (sv ya espejó cada clave a
// localStorage antes de persistir) → un upsert idempotente que no pisa las demás claves.
// `mr` (v321) = mapa {clientId: iso} de leído del chat → el estado de leído persiste entre
// dispositivos (antes coach_read_<id> era solo-local y re-notificaba mensajes ya leídos).
function _coachSettingsObj(){
  // `ld` = leads ya ATENDIDOS {clientId: iso}. Vive del lado del COACH a propósito: el flag
  // `wantsCoach` está en la fila del asesorado y su dispositivo puede re-subirlo (clase F7).
  return { e:ld('ax_e',[]), nequi:ld('ax_nequi',''), cn:ld('ax_cn',''), ce:ld('ax_ce',''), site:ld('ax_site',''), mr:ld('ax_msgreads',{}), ld:ld('ax_leadsdone',{}) };
}
const VAPID_PUBLIC='BDf4sPyqahfUqJxuWpgCwFopVoX5jivStXpjyrrtDG1QP9Bxf3pVbcFSisPBsFL3bCac9c-jrkLvGgchgPfg7d8';

// ══════════ TELEMETRÍA DE ERRORES (v282) ══════════
// Los errores de producción fallaban EN SILENCIO (caso Luz 2026-07-02: el vínculo Google
// quedó a medias y nadie se enteró por días). window error + unhandledrejection → INSERT
// en app_errors (RLS: insert-only para anon/auth; solo el coach lee). El limitador
// errReportGate (avi-core, puro, testeado) aplica dedupe + 5 por sesión + 20 por día
// (el tope diario persiste en localStorage ax_errday). JAMÁS lanza: la telemetría no
// puede tumbar la app que vigila. `build` = CACHE_NAME del SW activo leído del Cache
// Storage → sin constante de versión que mantener a mano.
let _errSt=null; // estado de sesión del limitador (seen/sent)
function _logAppError(kind,msg,src){
  try{
    // localhost = harness/smoke/dev — sus errores (incluidos los inyectados a propósito
    // por los repros) NO van a la telemetría de producción (auditoría 2026-07-07: un
    // throw de prueba del harness terminó como fila real en app_errors).
    if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname))return;
    if(typeof errReportGate!=='function')return; // avi-core no cargó aún
    let day=null; try{ day=JSON.parse(localStorage.getItem('ax_errday')||'null'); }catch(_e){}
    const st={seen:(_errSt&&_errSt.seen)||[],sent:(_errSt&&_errSt.sent)||0,day:day&&day.d,dayCount:(day&&day.n)||0};
    const g=errReportGate(st,msg);
    _errSt={seen:g.state.seen,sent:g.state.sent};
    try{ localStorage.setItem('ax_errday',JSON.stringify({d:g.state.day,n:g.state.dayCount})); }catch(_e){}
    if(!g.report)return;
    const fin=b=>{ try{ fetch(SB_URL+'/rest/v1/app_errors',{method:'POST',headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({
      kind, msg:String(msg).slice(0,500), src:String(src||'').slice(0,300), build:b,
      ua:(navigator.userAgent||'').slice(0,300),
      ctx:{standalone:!!(window.matchMedia&&matchMedia('(display-mode: standalone)').matches),w:window.innerWidth||0,
           uid:(typeof _authUid!=='undefined'&&_authUid)||null}
    })}).catch(()=>{}); }catch(_e){} };
    try{ caches.keys().then(ks=>fin((ks.find(k=>/^avi-v\d+$/.test(k))||'').slice(0,40))).catch(()=>fin('')); }
    catch(_e){ fin(''); }
  }catch(_e){}
}
// Sin capture: solo errores JS de runtime (los 404 de recursos no burbujean hasta window).
// Cuerpos try-totales (hallazgo Lucas QA): un reason exótico (toString/getter que lanza,
// Object.create(null)) haría lanzar a la PROPIA telemetría al leerle message/String/stack.
window.addEventListener('error',e=>{
  try{ _logAppError('error',e&&e.message,e&&e.filename?String(e.filename).split('/').pop()+':'+e.lineno+':'+e.colno:''); }catch(_e){}
});
window.addEventListener('unhandledrejection',e=>{
  try{
    const r=e&&e.reason;
    let m=''; try{ m=(r&&r.message)||''; if(!m)m=String(r); }catch(_e){ m='razón no serializable'; }
    let st=''; try{ st=((r&&r.stack)||'').split('\n')[1]||''; }catch(_e){}
    _logAppError('promise',m||'promesa rechazada sin razón',st);
  }catch(_e){}
});

// ══════════ SUPABASE AUTH — Fase 2 (login real, fila por usuario) ══════════
// supabase-js se carga por CDN con `defer`. El cliente se crea LAZY: solo al usar
// login/registro, jamás en el arranque → el boot offline-first NUNCA depende del CDN.
// Si la librería no cargó (sin red / file://), las funciones degradan con gracia y la
// app sigue funcionando con el camino actual (localStorage). NADA llama a AUTH todavía:
// es el cimiento que el paso 2.2 (reescritura de login + capa de datos) va a conectar.
let _sbc=null;
// Captura TEMPRANA (al parsear este script, ANTES de crear el cliente) del retorno de
// OAuth: detectSessionInUrl consume/limpia el hash, y los errores reales del vínculo
// Google (identity_already_exists, etc.) llegan AQUÍ — no en el return de linkIdentity.
// Ver _handleGoogleLinkReturn (app-2-login.js). Caso Luz 2026-07-02.
const _OAUTH_RET=(typeof parseOAuthReturn==='function'&&typeof location!=='undefined')
  ? parseOAuthReturn(location.hash,location.search)
  : {error:'',code:'',desc:''};
function sbAuthReady(){return typeof window!=='undefined'&&!!window.supabase&&typeof window.supabase.createClient==='function';}
function sbAuthClient(){
  if(_sbc)return _sbc;
  if(!sbAuthReady())return null;
  _sbc=window.supabase.createClient(SB_URL,SB_KEY,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'avi_auth'}
  });
  return _sbc;
}
const AUTH={
  ready(){return sbAuthReady();},
  client(){return sbAuthClient();},
  async getSession(){const c=sbAuthClient();if(!c)return null;const {data}=await c.auth.getSession();return (data&&data.session)||null;},
  async getUser(){const c=sbAuthClient();if(!c)return null;const {data}=await c.auth.getUser();return (data&&data.user)||null;},
  async signUpEmail(email,password,meta){const c=sbAuthClient();if(!c)throw new Error('Auth no disponible');return await c.auth.signUp({email,password,options:{data:meta||{}}});},
  async signInEmail(email,password){const c=sbAuthClient();if(!c)throw new Error('Auth no disponible');return await c.auth.signInWithPassword({email,password});},
  async signInGoogle(){const c=sbAuthClient();if(!c)throw new Error('Auth no disponible');return await c.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}});},
  async sendMagicLink(email){const c=sbAuthClient();if(!c)throw new Error('Auth no disponible');return await c.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});},
  async resetPassword(email){const c=sbAuthClient();if(!c)throw new Error('Auth no disponible');return await c.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});},
  async updatePassword(password){const c=sbAuthClient();if(!c)throw new Error('Auth no disponible');return await c.auth.updateUser({password});},
  async signOut(){const c=sbAuthClient();if(!c)return;return await c.auth.signOut();},
  onChange(cb){const c=sbAuthClient();if(!c)return null;return c.auth.onAuthStateChange((_e,session)=>cb(session));},
};

// ══════════ CAPA DE DATOS POR USUARIO — Fase 2.2 (tabla user_data) ══════════
// Lee/escribe la fila del usuario logueado (asesorado/libre) o, para el coach, las
// filas de SUS clientes (coach_id = su uid). Todo pasa por el cliente con sesión
// (AUTH.client) → RLS aplica con el JWT real. Reusa clientToRow/rowToClient (avi-core).
// Aún INERTE: lo conectan los pasos 2.2b-2.2e (registro, login, guardado, coach).
const UD={
  // Fila cruda del usuario actual (o null si no existe / sin sesión / SIN RED).
  // NUNCA lanza: offline (getUser o el select fallan) → null, para que el arranque
  // pueda caer al respaldo local en vez de colgarse o expulsar al login.
  async loadOwn(){
    try{
      const c=AUTH.client();const u=await AUTH.getUser();if(!c||!u)return null;
      const {data,error}=await c.from('user_data').select('*').eq('user_id',u.id).maybeSingle();
      if(error){warn('UD.loadOwn:',error.message);return null;}
      return data;
    }catch(e){ warn('UD.loadOwn (¿sin conexión?):',e&&e.message); return null; }
  },
  // Upsert de la fila propia. patch = columnas a escribir (profile/routines/history/…).
  // user_id y updated_at se fijan aquí; RLS exige user_id === auth.uid().
  async upsertOwn(patch){
    if(cloudWriteSealed(location.hostname,window.AVI_ALLOW_CLOUD_WRITE)){ if(window.AVI_DEBUG)console.warn('[AVI] UD.upsertOwn SELLADO en localhost (harness/dev) — no toca la nube'); return null; }
    const c=AUTH.client();const u=await AUTH.getUser();if(!c||!u)throw new Error('Sin sesión');
    const row=Object.assign({user_id:u.id,updated_at:new Date().toISOString()},patch||{});
    const {data,error}=await c.from('user_data').upsert(row).select().maybeSingle();
    if(error)throw error;
    return data;
  },
  // Crea la fila inicial del usuario a partir de un objeto cliente (registro/migración).
  async createFromClient(client,opts){
    const u=await AUTH.getUser();
    const row=clientToRow(client,Object.assign({userId:u&&u.id},opts||{}));
    return await this.upsertOwn(row);
  },
  // Para el coach: todas las filas donde él es el coach (coach_id = su uid). RLS las filtra.
  // Lazy-load: la lista del coach solo necesita perfil/rutinas + history/msgs/bodyweight
  // (dashboard, tarjetas, bandeja y sparkline de peso). Las colecciones pesadas
  // (photos/prs/medidas/nutrition) se traen al abrir cada cliente (loadClientHeavy) → con
  // 300 socios la carga del panel es liviana en vez de bajar todas las fotos de una.
  async loadCoachClients(){
    // Devuelve null al FALLAR (sin red/auth) para distinguirlo de "0 clientes" ([]). Así el
    // caller no pisa la lista guardada cuando el coach abre el panel sin conexión (auditoría 2026-06-21).
    const c=AUTH.client();const u=await AUTH.getUser();if(!c||!u)return null;
    const {data,error}=await c.from('user_data')
      .select('user_id,coach_id,role,profile,routines,history,msgs,bodyweight,updated_at')
      .eq('coach_id',u.id);
    if(error){warn('UD.loadCoachClients:',error.message);return null;}
    return data||[];
  },
  // Colecciones pesadas de UN cliente, bajo demanda (al abrir su detalle). Ver _ensureClientHeavy.
  async loadClientHeavy(clientId){
    const c=AUTH.client();if(!c)return null;
    const {data,error}=await c.from('user_data')
      .select('prs,medidas,nutrition,photos')
      .eq('user_id',clientId).maybeSingle();
    if(error){warn('UD.loadClientHeavy:',error.message);return null;}
    return data;
  },
  // Actualiza la fila de un cliente (el coach puede por RLS: coach_id = su uid). UPDATE
  // (no upsert: el INSERT lo bloquea la política WITH CHECK auth.uid()=user_id). Para 2.2e-2.
  async updateClientRow(clientId,patch){
    if(cloudWriteSealed(location.hostname,window.AVI_ALLOW_CLOUD_WRITE)){ if(window.AVI_DEBUG)console.warn('[AVI] UD.updateClientRow SELLADO en localhost (harness/dev) — no toca la nube'); return null; }
    const c=AUTH.client();if(!c)throw new Error('Auth no disponible');
    const {data,error}=await c.from('user_data')
      .update(Object.assign({updated_at:new Date().toISOString()},patch||{}))
      .eq('user_id',clientId).select().maybeSingle();
    if(error)throw error;
    return data;
  },
  // Borra la fila de un cliente en la nube (el coach puede por RLS: coach_id = su uid).
  // Sin esto, al eliminar un cliente su fila quedaba y reaparecía al volver a entrar.
  async deleteClientRow(clientId){
    if(cloudWriteSealed(location.hostname,window.AVI_ALLOW_CLOUD_WRITE)){ if(window.AVI_DEBUG)console.warn('[AVI] UD.deleteClientRow SELLADO en localhost (harness/dev) — no toca la nube'); return; }
    const c=AUTH.client();if(!c)throw new Error('Auth no disponible');
    const {error}=await c.from('user_data').delete().eq('user_id',clientId);
    if(error)throw error;
  },
};

// Modo auth: true cuando el usuario entró por Supabase Auth (fila user_data) en vez del
// camino legacy (blob global). En modo auth NO se escribe ni se sondea el blob global
// `apex_data` (los datos viven en user_data vía UD) → evita contaminar la nube legacy
// durante la transición. Persiste solo lo del usuario por su propia fila (2.2d).
let AUTH_MODE=false;
let AUTH_ROLE='client'; // 'client' | 'coach' — rol del usuario auth logueado
let COACH_SELF=false;   // true cuando el coach está viendo SU propio entrenamiento (guarda en su fila)
let COACH_OWN_ROW=null; // fila propia del coach, ya cargada al entrar al panel → "Mi entrenamiento" abre instantáneo sin re-pedir red
// UID del coach (modelo de un solo coach). Un usuario libre que pide coach se auto-asigna
// este coach_id para que su fila sea visible por RLS (select: coach_id = auth.uid()) y la
// solicitud + mensajes lleguen a la bandeja del coach. Ver requestCoach().
const COACH_UID='0a6484ed-42af-449d-9903-e440ac683ecf';

// Convierte VAPID key de base64 a Uint8Array
function urlBase64ToUint8Array(b64){
  const pad=b64.length%4===0?b64:b64+'='.repeat(4-b64.length%4);
  const raw=atob(pad.replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from({length:raw.length},(_,i)=>raw.charCodeAt(i));
}

// Suscribe este dispositivo a push y guarda en Supabase
// Devuelve TRUE solo si el dispositivo quedó suscrito de verdad (POST 2xx, o ya estaba al
// día sin force). FALSE en cualquier bail (sin SW/permiso/token, POST rechazado, error) —
// así el caller NO canta éxito ni marca "curado" cuando en realidad falló en silencio
// (esa falla muda fue la raíz de los 40 días sin push del coach, 2026-07-11).
async function subscribePush(clientId, trainingDays=[], shiftMap=null, force=false){
  if(!('serviceWorker' in navigator)||!('PushManager' in window))return false;
  if(Notification.permission!=='granted')return false;
  try{
    const reg=window._swReg||await navigator.serviceWorker.ready;
    if(!reg)return false;
    let sub=await reg.pushManager.getSubscription();
    if(!sub){
      sub=await reg.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:urlBase64ToUint8Array(VAPID_PUBLIC)
      });
    }
    const _pushKey=`apex_push:${clientId}`;
    // force: re-inserta aunque el endpoint no haya cambiado (self-heal cuando la fila del
    // servidor se borró — p.ej. tras el cutover o al podar suscripciones muertas).
    if(!force && !shouldPostPush(localStorage.getItem(_pushKey),sub.endpoint))return true; // ya al día
    // Escribir con el CLIENTE de Supabase (como UD.upsertOwn), NO con fetch crudo. El fetch
    // crudo mandaba `Bearer ${getSession().access_token}` — un token que llegaba VENCIDO (no se
    // refrescaba) → PostgREST lo trataba como ANÓNIMO → la RLS rechazaba TODAS las suscripciones
    // (bug 2026-07-11, logs postgres: cientos de "violates row-level security" → CERO asesorados
    // suscritos y el _coach del coach sin refrescar). El cliente refresca el JWT antes de la
    // petición, igual que el resto de escrituras que SÍ funcionan. onConflict = la UNIQUE
    // (client_id, subscription) → re-suscribir el mismo endpoint ACTUALIZA en vez de duplicar.
    if(cloudWriteSealed(location.hostname,window.AVI_ALLOW_CLOUD_WRITE))return false; // no registrar desde localhost/harness
    const _c=AUTH.client(); let _u=null; try{ _u=await AUTH.getUser(); }catch(_e){}
    if(!_c||!_u){ warn('AVI Push: sin sesión auth — registro pospuesto'); return false; }
    // client_id = el UID REAL del usuario autenticado (no el _pushCtx, que podía estar
    // desfasado) → coincide SIEMPRE con la RLS `client_id = auth.uid()`. El coach usa '_coach'.
    const _cid=(clientId==='_coach')?'_coach':_u.id;
    const { error:_perr }=await _c.from('push_subscriptions').upsert(
      { client_id:_cid, subscription:sub.toJSON(), updated_at:new Date().toISOString(), training_days:trainingDays, training_shift:shiftMap },
      { onConflict:'client_id,subscription' }
    );
    if(_perr){ warn('AVI Push: registro rechazado',_perr.message); return false; } // no marcar el endpoint como registrado
    localStorage.setItem(_pushKey,sub.endpoint);
    log('AVI Push: suscripción guardada ✅');
    return true;
  }catch(e){warn('AVI Push subscribe error:',e);return false;}
}

// ── Activación de push del ASESORADO (auditoría 2026-07-07) ──
// Nadie le pedía el permiso al asesorado (requestPermission solo existía en pantallas
// del coach) → 0 asesorados suscritos y las notifs diarias solo le llegaban al coach.
// Tarjeta amable en "Hoy" cuando el permiso está en 'default'; el prompt del navegador
// SOLO se lanza con gesto del usuario (Chrome penaliza los prompts no solicitados).
var _pushCtx=null; // {clientId,days,shifts} — lo fija el camino auth del cliente (var: ya es un
                   // global compartido entre archivos; expuesto en window para poder testearlo)
// Instrucciones para reactivar cuando el permiso está BLOQUEADO — compartidas coach/asesorado.
// En PWA instalada (standalone) NO hay barra ni candado 🔒 → hay que ir a los ajustes del sistema.
function _pushDeniedHowto(){
  const standalone=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
  return standalone
    ? 'Mantén pulsado el ícono de AVI en tu pantalla de inicio → Información de la app → Notificaciones → Activar, y vuelve a abrir AVI.'
    : 'Ábrelas en el candado 🔒 junto a la dirección → Notificaciones → Permitir, y recarga la app.';
}
function renderPushNudge(){
  const el=document.getElementById('cn-push-nudge'); if(!el)return;
  const cid=_pushCtx&&_pushCtx.clientId;
  if(!cid||typeof Notification==='undefined'||!('PushManager' in window)){ el.innerHTML=''; return; }
  const bell=typeof aviIcon==='function'?aviIcon('bell',15):'🔔';
  if(Notification.permission==='granted'){ el.innerHTML=''; return; }
  // Bloqueadas: instrucciones (antes el asesorado quedaba sin salida — aviso Lucas v320).
  if(Notification.permission==='denied'){
    el.innerHTML=`<div class="push-nudge"><div class="push-nudge-txt"><b>${bell} Notificaciones bloqueadas</b><span>Para recibir tus recordatorios de entreno: ${_pushDeniedHowto()}</span></div></div>`;
    return;
  }
  let snooze=0; try{ snooze=parseInt(localStorage.getItem('ax_push_snooze_'+cid)||'0',10)||0; }catch(_e){}
  if(Date.now()-snooze<7*86400000){ el.innerHTML=''; return; }
  el.innerHTML=`<div class="push-nudge">
    <div class="push-nudge-txt"><b>${bell} Activa tus recordatorios</b><span>Te avisamos en tus días de entreno, con tips de hidratación y recuperación. Sin spam.</span></div>
    <div class="push-nudge-btns"><button class="btn bp bsm" onclick="aviAskPush()">Activar</button><button class="btn bg bsm" onclick="aviSnoozePush()">Ahora no</button></div>
  </div>`;
}
async function aviAskPush(){
  try{
    const p=await Notification.requestPermission();
    if(p==='granted'){
      // Toast HONESTO (mismo fix que el coach v318): solo "¡Listo!" si el registro entró de
      // verdad. force=true re-inserta aunque el endpoint no cambie (self-heal del cutover).
      const ok=_pushCtx?await subscribePush(_pushCtx.clientId,_pushCtx.days,_pushCtx.shifts,true):false;
      if(ok){ _clientPushHealed=true; _clientPushPending=false; toast('🔔 ¡Listo! Te avisamos en tus días de entreno.'); }
      // Fallo transitorio (token/red): NO pedir reintento manual — la app reintenta sola en el
      // próximo render de Hoy y ensureClientPush cierra el lazo con el "¡Listo!" (aviso Lucas v320).
      else { _clientPushPending=true; toast('🔔 Activando tus recordatorios… puede tardar unos segundos.'); }
    } else if(p==='denied'){ toast('Sin problema — puedes activarlas luego en la configuración del navegador.'); }
  }catch(_e){}
  renderPushNudge();
}
function aviSnoozePush(){ try{ if(_pushCtx)localStorage.setItem('ax_push_snooze_'+_pushCtx.clientId,String(Date.now())); }catch(_e){} renderPushNudge(); }
// Self-heal del ASESORADO (2026-07-11): si ya dio permiso, re-suscribe FORZADO una vez por
// sesión — así el asesorado cuya suscripción murió en el cutover (o que nunca posteó por la
// carrera del token a los 4s) se recupera al abrir la app. Marca "curado" SOLO tras éxito
// (reintenta en el próximo render si falló). Gemelo de ensureCoachPush. CERO asesorados
// suscritos en 40+ días (auditoría 2026-07-11) → este es el camino de recuperación.
let _clientPushHealed=false;
let _clientPushPending=false; // aviAskPush concedió pero el POST falló → cerrar el lazo al curar
async function ensureClientPush(){
  if(!_pushCtx||CUR.loggedAs!=='client')return;
  try{
    if(typeof Notification!=='undefined'&&Notification.permission==='granted'&&!_clientPushHealed){
      const ok=await subscribePush(_pushCtx.clientId,_pushCtx.days,_pushCtx.shifts,true);
      if(ok){ _clientPushHealed=true;
        // Si un intento previo (botón Activar) había quedado pendiente, ahora sí confirma.
        if(_clientPushPending){ _clientPushPending=false; if(typeof toast==='function')toast('🔔 ¡Listo! Te avisamos en tus días de entreno.'); }
      }
    }
  }catch(_e){}
}

// ── Activación de push del COACH (2026-07-11) ──
// Diagnóstico (Supabase): TODAS las suscripciones '_coach' murieron en el cutover de Auth
// (updated_at ≤ 2026-06-01) y nada las re-registraba → los mensajes/dolor/pagos de los
// asesorados NUNCA le llegaban a Camilo, y — a diferencia del asesorado — no había tarjeta
// que se lo recordara. Esta vive en el home del coach (#h-push-nudge). Decisión pura en
// avi-core (pushNudgeDecision) para no repetir el manejo de snooze/estados.
function renderCoachPushNudge(){
  const el=document.getElementById('h-push-nudge'); if(!el)return;
  if(CUR.loggedAs!=='coach'||typeof Notification==='undefined'||!('PushManager' in window)){ el.innerHTML=''; return; }
  let snooze=0; try{ snooze=parseInt(localStorage.getItem('ax_push_snooze__coach')||'0',10)||0; }catch(_e){}
  const state=(typeof pushNudgeDecision==='function')
    ? pushNudgeDecision(Notification.permission,snooze,Date.now(),7)
    : (Notification.permission==='granted'?'hidden':'ask');
  if(state==='hidden'){ el.innerHTML=''; return; }
  const bell=typeof aviIcon==='function'?aviIcon('bell',15):'🔔';
  if(state==='denied'){
    el.innerHTML=`<div class="push-nudge"><div class="push-nudge-txt"><b>${bell} Notificaciones bloqueadas</b><span>Tu navegador las tiene bloqueadas. ${_pushDeniedHowto()}</span></div></div>`;
    return;
  }
  el.innerHTML=`<div class="push-nudge">
    <div class="push-nudge-txt"><b>${bell} Activa tus notificaciones</b><span>Te avisamos al instante cuando un asesorado te escriba, reporte dolor o notifique un pago. Sin esto, no te enteras.</span></div>
    <div class="push-nudge-btns"><button class="btn bp bsm" onclick="aviAskCoachPush()">Activar</button><button class="btn bg bsm" onclick="aviSnoozeCoachPush()">Ahora no</button></div>
  </div>`;
}
function aviSnoozeCoachPush(){ try{ localStorage.setItem('ax_push_snooze__coach',String(Date.now())); }catch(_e){} renderCoachPushNudge(); }
async function aviAskCoachPush(){
  try{
    const p=await Notification.requestPermission();
    if(p==='granted'){
      // Toast HONESTO: solo "¡Listo!" si el registro realmente entró (aviso Lucas v318 — antes
      // cantaba éxito aunque el POST fallara en silencio, el mismo patrón de los 40 días).
      const ok=await subscribePush('_coach',[],null,true);
      if(ok){ _coachPushHealed=true; toast('🔔 ¡Listo! Ahora te avisamos al instante.'); }
      else { toast('⚠️ No se pudo activar ahora. Revisa tu conexión e inténtalo de nuevo.'); }
    }
    else if(p==='denied'){ toast('Quedaron bloqueadas — puedes activarlas en la configuración del navegador.'); }
  }catch(_e){}
  renderCoachPushNudge();
}
// Home del coach: si YA dio permiso, re-suscribe FORZADO una vez por sesión (self-heal del
// endpoint que murió en el cutover — shouldPostPush no lo re-añadía porque el endpoint no
// cambió). Marca "curado" SOLO si el POST entró (si falló, reintenta en el próximo render de
// esta sesión — hay muchos por el poll; aviso Lucas/Julián v318). Idempotente y barato.
let _coachPushHealed=false;
async function ensureCoachPush(){
  if(CUR.loggedAs!=='coach')return;
  try{
    if(typeof Notification!=='undefined'&&Notification.permission==='granted'&&!_coachPushHealed){
      const ok=await subscribePush('_coach',[],null,true);
      if(ok)_coachPushHealed=true;
    }
  }catch(_e){}
  renderCoachPushNudge();
}

// Enviar push via Edge Function de Supabase
async function pushToClient(clientId,title,body,extras={}){
  try{
    const res=await fetch(`${SB_URL}/functions/v1/send-push`,{
      method:'POST',
      headers:{'apikey':SB_KEY,'Authorization':`Bearer ${SB_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({clientId,title,body,...extras})
    });
    return await res.json();
  }catch(e){warn('AVI Push send error:',e);return null;}
}


// Mostrar notificación usando SW si disponible, fallback a new Notification
function showAviNotif(title,body,tag){
  if(Notification.permission!=='granted')return;
  const icon='/apex-app/icons/icon-192.png';
  const opts={body,tag:tag||'avi-'+Date.now(),icon,badge:icon,vibrate:[200,100,200],requireInteraction:false};
  if('serviceWorker' in navigator){
    navigator.serviceWorker.ready.then(reg=>{
      return reg.showNotification(title,opts);
    }).catch(()=>{try{new Notification(title,opts);}catch(e){}});
  } else {
    try{new Notification(title,opts);}catch(e){}
  }
}

// Notificar mensaje nuevo
function notifNewMessage(fromName,preview){
  showAviNotif(
    '💬 Nuevo mensaje de '+fromName,
    preview.length>80?preview.slice(0,77)+'...':preview,
    'avi-msg-'+Date.now()
  );
}

// ══════════════════════════════════════════
// POLLING DE MENSAJES — tiempo real (30s)
// ══════════════════════════════════════════
let _msgPollInt=null;
let _msgNotifSince=0; // v321: solo notificar mensajes/leads posteriores al arranque de sesión

async function pollMessages(){
  if(!CUR.loggedAs)return;
  if(AUTH_MODE)return _pollAuthData(); // modo auth: refresco en vivo desde user_data (ver _pollAuthData)
  if(!SB_URL)return;
  try{
    const res=await fetch(`${SB_URL}/rest/v1/apex_data?select=value&key=eq.ax_m`,{
      headers:{'apikey':SB_KEY,'Authorization':`Bearer ${SB_KEY}`},
      signal:AbortSignal.timeout(8000)
    });
    if(!res.ok)return;
    const rows=await res.json();
    if(!rows||!rows.length)return;
    const remote=rows[0].value||{};

    if(CUR.loggedAs==='client'){
      const cid=CUR.clientId;
      const localList=DB.msgs[cid]||[];
      const remoteList=remote[cid]||[];
      if(remoteList.length>localList.length){
        const newMsgs=remoteList.slice(localList.length);
        DB.msgs=remote;
        try{localStorage.setItem('ax_m',JSON.stringify(remote));}catch(e){}
        renderClientMsgs(cid);
        updateMsgBadge(cid);
        newMsgs.filter(m=>m.from==='coach').forEach(m=>{
          notifNewMessage('Tu Coach',m.text);
          // Solo mostrar toast si el chat no está abierto
          const chatEl=document.getElementById('cn-messages');
          if(chatEl&&!chatEl.classList.contains('on'))toast('💬 Nuevo mensaje de tu coach');
        });
      }
    } else if(CUR.loggedAs==='coach'){
      // Re-traer ax_c para detectar asesorados nuevos (auto-registro) y solicitudes de
      // coach que llegaron después de abrir la sesión. Merge ADITIVO: solo agrega
      // clientes que no están y propaga wantsCoach; nunca pisa ediciones locales.
      try{
        const rcRes=await fetch(`${SB_URL}/rest/v1/apex_data?select=value&key=eq.ax_c`,{
          headers:{'apikey':SB_KEY,'Authorization':`Bearer ${SB_KEY}`},signal:AbortSignal.timeout(8000)
        });
        if(rcRes.ok){
          const rcRows=await rcRes.json();
          const remoteClients=(rcRows&&rcRows[0]&&rcRows[0].value)||[];
          let cChanged=false;const newcomers=[];
          remoteClients.forEach(r=>{
            if(!r||!r.id)return;
            const local=DB.clients.find(x=>x.id===r.id);
            if(!local){DB.clients.push(r);cChanged=true;if(r.selfReg)newcomers.push(r);}
            else if(r.wantsCoach&&!local.wantsCoach){local.wantsCoach=true;local.wantsCoachAt=r.wantsCoachAt;cChanged=true;newcomers.push(local);}
          });
          if(cChanged){
            try{localStorage.setItem('ax_c',JSON.stringify(DB.clients));}catch(e){}
            renderClients();renderHome();
            newcomers.forEach(c=>notifNewMessage('AVI — nuevo interesado',`${c.name} quiere un coach 🙋`));
          }
        }
      }catch(e){/* red, silencioso */}
      let anyNew=false;
      const newMsgsList=[];
      DB.clients.forEach(c=>{
        const localList=DB.msgs[c.id]||[];
        const remoteList=remote[c.id]||[];
        if(remoteList.length>localList.length){
          const newMsgs=remoteList.slice(localList.length);
          newMsgs.filter(m=>m.from==='client').forEach(m=>{
            newMsgsList.push({client:c,text:m.text});
          });
          anyNew=true;
        }
      });
      if(anyNew){
        DB.msgs=remote;
        try{localStorage.setItem('ax_m',JSON.stringify(remote));}catch(e){}
        renderMsgs();
        // Si el coach está viendo el detalle de un cliente, re-renderizar el chat
        const detailEl=document.getElementById('p-detail');
        if(detailEl&&detailEl.classList.contains('on')&&CUR.clientId){
          renderDetailMsgs(CUR.clientId);
        }
        newMsgsList.forEach(({client,text})=>notifNewMessage(client.name,text));
      }
    }
  }catch(e){/* error de red, silencioso */}
}

// ── Refresco EN VIVO en modo auth (reemplaza al sondeo del blob legacy, que quedaba
// deshabilitado con `if(AUTH_MODE)return`) ──────────────────────────────────────────
// Re-trae la fila del usuario (cliente) o las de sus asesorados (coach) y refresca SOLO
// las vistas abiertas, para que los mensajes nuevos y los cambios de rutina del coach
// lleguen SIN tener que salir y volver a entrar. Pedido de Camilo 2026-06-25.
async function _pollAuthData(){
  try{
    if(AUTH_ROLE==='coach') return await _pollAuthCoach();
    return await _pollAuthClient();
  }catch(e){ /* red, silencioso */ }
}

async function _pollAuthClient(){
  const cid=CUR.clientId; if(!cid)return;
  const row=await UD.loadOwn(); if(!row)return;
  let touched=false;
  // 1) Mensajes nuevos del coach — UNIÓN, no reemplazo por longitud (P1-3 auditoría
  //    2026-07-01): antes, si el cliente tenía un mensaje local sin subir y el remoto
  //    venía más largo, el reemplazo lo DESCARTABA; y con longitudes empatadas el del
  //    coach no se pintaba. mergeMsgs (avi-core, testeada) une por (from,date,text).
  const remoteMsgs=Array.isArray(row.msgs)?row.msgs:[];
  const localMsgs=DB.msgs[cid]||[];
  const mergedMsgs=mergeMsgs(localMsgs,remoteMsgs);
  if(mergedMsgs.length!==localMsgs.length){
    const seen=new Set(localMsgs.map(_msgKey));
    const fresh=mergedMsgs.filter(m=>!seen.has(_msgKey(m)));
    DB.msgs[cid]=mergedMsgs; touched=true;
    if(typeof renderClientMsgs==='function')renderClientMsgs(cid);
    if(typeof updateMsgBadge==='function')updateMsgBadge(cid);
    fresh.filter(m=>m.from==='coach').forEach(m=>{
      if(typeof notifNewMessage==='function')notifNewMessage('Tu Coach',m.text);
      const chatEl=document.getElementById('cn-messages');
      if(chatEl&&!chatEl.classList.contains('on')&&typeof toast==='function')toast('💬 Nuevo mensaje de tu coach');
    });
  }
  // 2) Cambios de rutina que hizo el coach. NO pisar si el usuario está editando, entrenando
  //    o tiene cambios locales sin confirmar (_authDirty) — su copia manda hasta que suba.
  const editorOpen=(()=>{const m=document.getElementById('m-routine');return !!(m&&getComputedStyle(m).display!=='none');})();
  // CUR.todayOverride: está viendo/haciendo otra rutina (extra rápido u otro día) → no le
  // pises "Hoy" con el plan nuevo hasta que vuelva a su día (si no, lo saca del entreno).
  const busy=editorOpen||CUR.todayWorking||CUR.todayDirty||_authDirty||CUR.todayOverride;
  if(!busy&&Array.isArray(row.routines)){
    const client=DB.clients.find(x=>x.id===cid);
    if(client&&JSON.stringify(client.routines||[])!==JSON.stringify(row.routines)){
      client.routines=row.routines; touched=true;
      if(typeof renderClientToday==='function')renderClientToday(client);
      const rtTab=document.getElementById('cn-routines');
      if(rtTab&&rtTab.classList.contains('on')&&typeof renderClientAllRoutines==='function')renderClientAllRoutines(client);
      if(typeof toast==='function')toast('🔄 Tu coach actualizó tu plan');
    }
  }
  if(touched)_refreshAuthCache();
}

async function _pollAuthCoach(){
  const rows=await UD.loadCoachClients(); if(!rows)return;
  let changed=false; const inbox=[]; const leads=[];
  rows.forEach(r=>{
    if(!r||!r.user_id)return;
    let local=DB.clients.find(x=>x.id===r.user_id);
    if(!local){ // asesorado nuevo (auto-registro) que llegó después de abrir la sesión
      local=rowToClient(r);
      DB.clients.push(local);
      DB.msgs[local.id]=Array.isArray(r.msgs)?r.msgs:[];
      if(Array.isArray(r.history)){DB.history=DB.history||{};DB.history[local.id]=r.history;}
      changed=true; if(local.selfReg)leads.push(local);
      return;
    }
    // Mensajes nuevos del cliente — UNIÓN, no reemplazo por longitud (P1-3, ver
    // _pollAuthClient): un mensaje del coach aún sin subir ya no se descarta.
    // NO traemos sus rutinas aquí para no pisar una edición del coach en vuelo;
    // las autoediciones del cliente se ven al abrir su detalle.
    const remoteMs=Array.isArray(r.msgs)?r.msgs:[]; const localMs=DB.msgs[local.id]||[];
    const mergedMs=mergeMsgs(localMs,remoteMs);
    if(mergedMs.length!==localMs.length){
      const seenMs=new Set(localMs.map(_msgKey));
      mergedMs.filter(m=>!seenMs.has(_msgKey(m))&&m.from==='client').forEach(m=>inbox.push({client:local,text:m.text,date:m.date}));
      DB.msgs[local.id]=mergedMs; changed=true;
    }
    const rWants=r.profile&&r.profile.wantsCoach;
    if(rWants&&!local.wantsCoach){ local.wantsCoach=true; local.wantsCoachAt=r.profile&&r.profile.wantsCoachAt; changed=true; leads.push(local); }
  });
  if(changed){
    if(typeof renderMsgs==='function')renderMsgs();
    if(typeof renderClients==='function')renderClients();
    if(typeof renderHome==='function')renderHome();
    const detailEl=document.getElementById('p-detail');
    if(detailEl&&detailEl.classList.contains('on')&&CUR.clientId&&typeof renderDetailMsgs==='function')renderDetailMsgs(CUR.clientId);
    // v321: si el chat de pantalla completa está abierto para este asesorado, refréscalo en vivo.
    const cch=document.getElementById('coach-chat');
    if(cch&&cch.classList.contains('on')&&_cchatId&&typeof renderCoachChatThread==='function'){ renderCoachChatThread(_cchatId); if(typeof markCoachRead==='function')markCoachRead(_cchatId); }
    // Anti-ráfaga (v321): solo notificar lo que llegó DESPUÉS del arranque de sesión (los viejos
    // del cargado inicial no re-notifican). El badge/lista de no-leídos sí los muestra igual.
    inbox.forEach(({client,text,date})=>{ if(new Date(date).getTime()>_msgNotifSince && typeof notifNewMessage==='function')notifNewMessage(client.name,text); });
    // Un lead SIN `wantsCoachAt` (legacy/degradado) NO es un pedido nuevo → fallback 0 (época), no
    // Date.now(): con Date.now() burlaba este guard y re-notificaba a CADA sesión (bug: "me siguen
    // llegando los 21 asesorados pidiendo coach", 2026-07-16). requestCoach SIEMPRE fija la fecha, así
    // que un lead genuinamente nuevo la trae; los viejos sin fecha ya salen en la lista con su etiqueta.
    // ...y ADEMÁS: si el coach ya lo atendió (`ax_leadsdone`, registro suyo), no se vuelve a
    // avisar aunque el dispositivo del asesorado re-suba `wantsCoach` (clase F7).
    leads.forEach(c=>{ const at=c.wantsCoachAt?new Date(c.wantsCoachAt).getTime():0;
      if(at>_msgNotifSince && (typeof _leadPending!=='function'||_leadPending(c)) && typeof notifNewMessage==='function')notifNewMessage('AVI — nuevo interesado',`${c.name} quiere un coach 🙋`); });
  }
}

function startMsgPolling(){
  if(_msgPollInt)clearInterval(_msgPollInt);
  // Anti-ráfaga (v321): solo notificamos mensajes/leads cuyo timestamp sea POSTERIOR al
  // arranque de esta sesión. Al abrir la app, los mensajes viejos que llegan del cargado
  // inicial NO deben re-notificar (bug reportado: ráfaga de "mensajes viejos ya leídos").
  _msgNotifSince=Date.now();
  // Primera verificación a los 5s del login (no solaparse con syncFromCloud) y luego cada 15s
  // para que el chat y los cambios de plan se sientan en vivo con la app abierta.
  setTimeout(pollMessages,5000);
  _msgPollInt=setInterval(pollMessages,15000);
}

function stopMsgPolling(){
  if(_msgPollInt){clearInterval(_msgPollInt);_msgPollInt=null;}
}

function openChatFor(chatId){
  if(!chatId)return;
  if(CUR.loggedAs==='coach'){
    if(chatId==='_coach')return;
    // v321: chat de pantalla completa directo a la conversación (antes abría el perfil y había
    // que scrollear hasta el chat enterrado). Fallback al detalle si el chat no está montado.
    if(typeof openCoachChat==='function')openCoachChat(chatId);
    else { openDetail(chatId); setTimeout(()=>{const el=document.getElementById('d-msgs');if(el)el.scrollIntoView({behavior:'smooth',block:'center'});},350); }
  } else {
    const tab=document.getElementById('tab-msgs');
    cnTab('cn-messages',tab);markMsgsRead();
  }
}

// Listener para notificaciones push — navega al chat al tocar la notificación
if('serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('message',e=>{
    if(e.data&&e.data.type==='notif-click'&&e.data.notifType==='message'){
      openChatFor(e.data.chatId);
    }
  });
}

function ld(k,def){try{const v=localStorage.getItem(k);return v?JSON.parse(v):def}catch{return def}}

function initTheme(){
  const t=ld('ax_theme','dark');
  if(t==='dark') document.documentElement.setAttribute('data-theme','dark');
  else if(t==='light') document.documentElement.setAttribute('data-theme','light');
  else document.documentElement.removeAttribute('data-theme');
}

function setTheme(mode){
  sv('ax_theme',mode);
  if(mode==='dark') document.documentElement.setAttribute('data-theme','dark');
  else if(mode==='light') document.documentElement.setAttribute('data-theme','light');
  else document.documentElement.removeAttribute('data-theme');
  document.querySelectorAll('[data-theme-btn]').forEach(b=>{
    b.style.background=b.dataset.themeBtn===mode?'var(--g)':'';
    b.style.color=b.dataset.themeBtn===mode?'white':'';
    b.style.borderColor=b.dataset.themeBtn===mode?'var(--g)':'';
  });
}

// ── Tamaño de texto POR DISPOSITIVO (accesibilidad) ──
// Ajuste fijo elegible en el Perfil (Normal / Grande / Muy grande), recordado en este
// celular (ax_textsize). NO es pinch-zoom: escala la app de forma proporcional vía CSS
// (la tipografía está en px fijos). Pedido de Camilo 2026-06-23 (letras chicas cansan la
// vista en ciertos celulares). Mismo patrón que setTheme.
function _syncFsBtns(size){
  document.querySelectorAll('[data-fs-btn]').forEach(b=>{
    const on=b.dataset.fsBtn===(size||'normal');
    b.style.background=on?'var(--g)':''; b.style.color=on?'white':''; b.style.borderColor=on?'var(--g)':'';
  });
}
function applyTextSize(size){
  if(size==='lg'||size==='xl') document.documentElement.setAttribute('data-fs',size);
  else document.documentElement.removeAttribute('data-fs');
}
// El `zoom` que usa el ajuste de texto se comporta distinto según el motor: estandarizado
// (Chrome/WebView ≥128, escritorio) NO escala el ancho → width:100% ya llena; LEGACY (WebViews
// viejos/Huawei sin Google) SÍ escala el ancho → width:100% desborda y hay que compensar con
// width:calc(100%/zoom). Ningún CSS fijo sirve para ambos, así que medimos el motor en runtime:
// un hijo width:100% con zoom:2 dentro de un padre fijo de 300px → si el hijo mide ~600px (ratio≈2)
// el zoom escala el ancho (legacy) y marcamos html[data-zoomw="scale"] para activar la compensación
// (solo bajo ese atributo en styles.css). Si mide ~300px (ratio≈1, estandarizado) NO se compensa.
// Verificado: escritorio→ratio 1.00 (sin comp llena, con comp dejaba 50% de hueco) / Huawei→desborda
// sin comp. Camilo 2026-06-29. Ver [[feedback_avi_tamano_texto_accesibilidad]].
function detectZoomWidthScaling(){
  try{
    const host=document.body||document.documentElement; if(!host) return;
    const parent=document.createElement('div');
    parent.style.cssText='position:fixed;left:-99999px;top:0;width:300px;height:10px;visibility:hidden;pointer-events:none';
    const child=document.createElement('div');
    child.style.cssText='width:100%;height:10px;zoom:2';
    parent.appendChild(child); host.appendChild(parent);
    const cw=child.getBoundingClientRect().width, pw=parent.getBoundingClientRect().width;
    parent.remove();
    if(pw>0 && (cw/pw)>1.5) document.documentElement.setAttribute('data-zoomw','scale');
    else document.documentElement.removeAttribute('data-zoomw');
  }catch(e){ /* ante la duda, sin comp (el escritorio/WebView moderno es lo común) */ }
}
function initTextSize(){ detectZoomWidthScaling(); const s=ld('ax_textsize','normal'); applyTextSize(s); _syncFsBtns(s); }
function setTextSize(size){ sv('ax_textsize',size); applyTextSize(size); _syncFsBtns(size); }

// (F5a 2026-07-06: el flag ax_ui_guided / uiGuided / setUiGuided / ?uig se RETIRARON —
// el guiado embebido es la única vista de "Hoy". El valor viejo en localStorage de
// dispositivos que hicieron opt-out simplemente deja de leerse.)

// Aviso ÚNICO por dispositivo que OFRECE agrandar el texto (descubribilidad: quien más lo
// necesita es quien menos explora el Perfil). Solo si no se ofreció antes y el tamaño sigue en
// 'normal'. Pedido de Camilo 2026-06-23. Ver [[feedback_avi_tamano_texto_accesibilidad]].
function shouldShowFsIntro(){ return !ld('ax_fsPrompted',false) && ld('ax_textsize','normal')==='normal'; }
function showFsIntro(){ if(typeof om==='function') om('m-fsintro'); }
function fsIntroApply(){ sv('ax_fsPrompted',true); cm('m-fsintro'); setTextSize('lg'); toast('🔠 Texto agrandado · ajústalo en tu Perfil → Tamaño de texto'); }
function fsIntroDismiss(){ sv('ax_fsPrompted',true); cm('m-fsintro'); }

// Debounce timers + cola de reintento por clave — la red de seguridad del sync.
const _sbDebounce = {};
const _pendingPush = {}; // clave -> último valor AÚN NO confirmado en la nube (reintentable)
function sv(k,v){
  // Modo auth: las claves por-usuario van a SU fila user_data (no a localStorage global
  // ni al blob legacy) → evita contaminar la nube/caché legacy. Debounce 800ms.
  if(AUTH_MODE&&SB_KEYS.includes(k)){
    // Ajustes globales del coach: además de la nube, espejar a localStorage para que los
    // lectores ld()-based (getCoachName/Email/Site, DB.nequi/exercises) los vean frescos
    // sin esperar recarga. No son per-usuario ni secretos → no contaminan datos de cliente.
    if(_COACH_SETTINGS_KEYS.includes(k)){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){} }
    _persistAuthUserDebounced(k,v); return;
  }
  // Guardar en localStorage inmediatamente (nunca pierde datos)
  try{localStorage.setItem(k,JSON.stringify(v));}catch(e){warn('localStorage full:',e);}
  // Enviar a Supabase con debounce de 1.5s (excepto operaciones críticas)
  if(SB_KEYS.includes(k)){
    _pendingPush[k]=v;
    clearTimeout(_sbDebounce[k]);
    _sbDebounce[k] = setTimeout(()=>sbSet(k,v), 1500);
  }
}
// Forzar sync inmediato (para logout, completar entrenamiento, etc.)
function svNow(k,v){
  if(AUTH_MODE&&SB_KEYS.includes(k)){
    if(_COACH_SETTINGS_KEYS.includes(k)){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){} }
    _persistAuthUser(k,v); return;
  }
  try{localStorage.setItem(k,JSON.stringify(v));}catch(e){warn('localStorage full:',e);}
  if(SB_KEYS.includes(k)){_pendingPush[k]=v;clearTimeout(_sbDebounce[k]);sbSet(k,v);}
}

// ── Persistencia en modo auth: mapea cada clave ax_* a la columna de la fila del
// usuario logueado y la guarda con UD.upsertOwn (RLS por JWT). Las colecciones del
// usuario viven indexadas por su id en DB.*, así que extraemos su porción (v[id]).
const _udDebounce={};
const _udPending={};   // clave -> valor con persistencia AÚN pendiente (debounce sin disparar)
const _udFailedKeys={}; // clave -> true: escritura que la nube NO confirmó (se limpia al confirmar)
let _udInflight=0;      // escrituras auth en vuelo (para no limpiar el flag antes de tiempo)
// ¿Quedó todo confirmado? → apaga el flag dirty persistido (P0-2 auditoría 2026-07-01).
// Solo cuando: esta es la única escritura en vuelo, no hay debounces esperando y
// ninguna clave quedó marcada como fallida. Antes NADA limpiaba _authDirty tras un
// guardado exitoso → el flag vivía prendido y el merge del boot correría siempre.
function _udMaybeClean(){
  if(_udInflight<=1 && !Object.keys(_udPending).length && !Object.keys(_udFailedKeys).length) _setAuthDirty(false);
}
function _persistAuthUserDebounced(k,v){
  // Respaldo local INMEDIATO + marca "sucio": si cierran/duermen la app dentro de los 800ms,
  // el dato ya quedó en el caché local (ax_udcache_) y _flushAuthOnline lo reintenta al
  // reconectar. Antes se perdía el guardado PARCIAL del entreno en esa ventana (auditoría 2026-06-21).
  _setAuthDirty(true);
  _refreshAuthCache();
  _udPending[k]=v;
  clearTimeout(_udDebounce[k]);
  _udDebounce[k]=setTimeout(()=>{ delete _udPending[k]; _persistAuthUser(k,v); },800);
}
// Vacía de inmediato las escrituras de modo auth que aún esperaban el debounce (al cerrar/
// ocultar la app o al reconectar). Cubre al cliente y al coach (escritura per-cliente).
function flushAuthDebounced(){
  Object.keys(_udPending).forEach(k=>{ const v=_udPending[k]; delete _udPending[k]; clearTimeout(_udDebounce[k]); _persistAuthUser(k,v); });
}
async function _persistAuthUser(k,v){
  // Plantillas (ax_tpl): nivel coach/global → viven en la fila PROPIA del coach (columna
  // `templates`), no por-cliente ni en el blob legacy. Sin esto NO se guardaban en modo auth
  // (memoria-only → se perdían al recargar). Camilo 2026-06-29.
  if(k==='ax_tpl'){
    try{ await UD.upsertOwn({templates:Array.isArray(v)?v:[]}); }
    catch(e){ _setAuthDirty(true); warn('AVI: persistir plantillas falló, reintento al reconectar:',e&&e.message); }
    return;
  }
  // Ajustes globales del coach (ax_e/ax_nequi/ax_cn/ax_ce/ax_site): nivel coach → fila PROPIA,
  // columna `coach_settings` (jsonb). Sin esto caían al vacío en _persistCoachWrite → se perdían
  // al recargar (bug #1 auditoría 2026-06-30). Idempotente: re-escribe el objeto completo.
  if(AUTH_ROLE==='coach' && _COACH_SETTINGS_KEYS.includes(k)){
    try{ await UD.upsertOwn({coach_settings:_coachSettingsObj()}); }
    catch(e){ _setAuthDirty(true); warn('AVI: persistir ajustes de coach falló, reintento al reconectar:',e&&e.message); }
    return;
  }
  // Coach en modo auth: escribe la fila del cliente que cambió (no la suya). Ver _persistCoachWrite.
  if(AUTH_ROLE==='coach' && !COACH_SELF){ return await _persistCoachWrite(k,v); }
  // COACH_SELF (coach en su propio entreno) o cliente normal → escribe en SU propia fila.
  const id=CUR.clientId; if(!id)return;
  _udInflight++;
  try{
    if(k==='ax_c'){
      const client=(DB.clients&&DB.clients[0])||null; if(!client)return;
      const row=clientToRow(client,{}); // perfil (escalares) + rutinas, sin tocar coach_id/role
      await UD.upsertOwn({profile:row.profile, routines:row.routines});
    }
    else if(k==='ax_hist')   { await UD.upsertOwn({history:   (v&&v[id])||[]}); }
    else if(k==='ax_pr')     { await UD.upsertOwn({prs:       (v&&v[id])||{}}); }
    else if(k==='ax_bw')     { await UD.upsertOwn({bodyweight:(v&&v[id])||[]}); }
    else if(k==='ax_med')    { await UD.upsertOwn({medidas:   (v&&v[id])||[]}); }
    else if(k==='ax_nut')    { await UD.upsertOwn({nutrition: (v&&v[id])||{}}); }
    else if(k==='ax_photos') { await UD.upsertOwn({photos:    (v&&v[id])||[]}); }
    else if(k==='ax_m')      { await UD.upsertOwn({msgs:      (v&&v[id])||[]}); }
    // ax_e/ax_tpl/ax_cn/ax_site/ax_nequi/ax_cph/ax_ce: nivel coach/global → no aplica al cliente libre
    delete _udFailedKeys[k]; _udMaybeClean(); // la nube confirmó ESTA clave
  }catch(e){
    // Sin red (entrenando en el parque): el dato NO se pierde — queda en el respaldo
    // local (abajo) y se reintenta al reconectar (_flushAuthOnline) o al próximo
    // arranque (merge del boot vía flag persistido; P0-2 auditoría 2026-07-01).
    _udFailedKeys[k]=true;
    _setAuthDirty(true);
    warn('AVI: persistencia modo auth falló ('+k+'), guardado local + reintento al reconectar:',e&&e.message);
  }finally{ _udInflight--; }
  // Respaldo local SIEMPRE (haya o no red) → la app abre offline con los últimos datos.
  _refreshAuthCache();
}

// ── Escritura del coach por-cliente (2.2e-2) ──
// El coach muta DB.* y guarda con sv('ax_c'/'ax_m'/…). Aquí detectamos QUÉ cliente
// cambió (diff contra _coachSnap) y escribimos SOLO su fila vía UD.updateClientRow
// (NO toca coach_id/role). Genérico → cubre convertir/editar/asignar rutina/mensajes
// sin tocar cada función del coach.
const _coachSnap={};                 // `${k}:${clientId}` -> último JSON persistido
const _COACH_COL={ax_m:'msgs',ax_hist:'history',ax_pr:'prs',ax_bw:'bodyweight',ax_med:'medidas',ax_nut:'nutrition',ax_photos:'photos'};
function _coachClientJSON(c){ const row=clientToRow(c,{}); return JSON.stringify({p:row.profile,r:row.routines}); }
// Toma una "foto" del estado actual de los clientes para no re-escribir lo que no cambió.
function _primeCoachSnap(){
  (DB.clients||[]).forEach(c=>{
    const id=c.id; if(!id)return;
    _coachSnap['ax_c:'+id]=_coachClientJSON(c);
    Object.keys(_COACH_COL).forEach(k=>{ const src=DB[_COACH_COL[k]]; _coachSnap[k+':'+id]=JSON.stringify((src&&src[id])||null); });
  });
}
async function _persistCoachWrite(k,v){
  if(k==='ax_c'){
    for(const c of (DB.clients||[])){
      const id=c.id; if(!id)continue;
      const val=_coachClientJSON(c), sk='ax_c:'+id;
      if(_coachSnap[sk]===val)continue; // ese cliente no cambió
      const row=clientToRow(c,{});
      try{ await UD.updateClientRow(id,{profile:row.profile,routines:row.routines}); _coachSnap[sk]=val; }
      catch(e){ warn('AVI coach persist ax_c falló:',id,e&&e.message); }
    }
    return;
  }
  const col=_COACH_COL[k]; if(!col)return; // ax_e/ax_tpl/ax_cn/…: nivel coach, fuera de alcance 2.2e-2
  for(const c of (DB.clients||[])){
    const id=c.id; if(!id)continue;
    const slice=v&&v[id]; if(slice===undefined)continue;
    const val=JSON.stringify(slice), sk=k+':'+id;
    if(_coachSnap[sk]===val)continue;
    try{ await UD.updateClientRow(id,{[col]:slice}); _coachSnap[sk]=val; }
    catch(e){ warn('AVI coach persist '+k+' falló:',id,e&&e.message); }
  }
}

// ⚠️ Solo escribir a la nube desde https/localhost — NUNCA desde file://.
// Abrir el index.html local (file://) jamás debe poder tocar/pisar la nube.
function canCloudWrite(){return location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1';}
async function sbSet(k,v){
  if(!canCloudWrite()){return;}
  if(AUTH_MODE){return;} // en modo auth los datos van a user_data (UD), no al blob global
  // Anti-borrado: nunca subir vacíos ax_c (asesorados) ni ax_e (biblioteca) — casi siempre es un bug, no intención.
  if((k==='ax_c'||k==='ax_e')&&Array.isArray(v)&&v.length===0){warn('AVI: push vacío bloqueado para',k,'(anti-borrado masivo)');return;}
  const dot=document.getElementById('sync-dot');
  if(dot)dot.classList.add('on');
  try{
    const res=await fetch(`${SB_URL}/rest/v1/apex_data`,{
      method:'POST',
      headers:{'apikey':SB_KEY,'Authorization':`Bearer ${SB_KEY}`,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify({key:k,value:v,updated_at:new Date().toISOString()})
    });
    // Confirmado en la nube → sale de la cola. Si llegó un valor más nuevo entretanto
    // (_pendingPush[k] !== v), NO lo borramos: ese push más reciente sigue pendiente.
    if(res&&res.ok){ if(_pendingPush[k]===v) delete _pendingPush[k]; }
  }catch(e){warn('AVI sync error (queda en cola para reintento):',e&&e.message);}
  finally{setTimeout(()=>{if(dot)dot.classList.remove('on');},600);}
}

// Reintenta todo lo que no se confirmó en la nube (mala señal en el gym, app cerrada rápido).
// Es la red de seguridad contra pérdida de datos por envíos fallidos o debounce sin disparar.
function flushPendingSync(){
  if(!canCloudWrite())return;
  Object.keys(_pendingPush).forEach(k=>{ clearTimeout(_sbDebounce[k]); sbSet(k,_pendingPush[k]); });
}
if(typeof window!=='undefined'){
  // Al recuperar conexión y al cerrar/ocultar o volver a la app → forzar lo pendiente
  // (cola legacy/blob + escrituras debounced de modo auth, para no perder el parcial offline).
  const _flushAll=()=>{ flushPendingSync(); flushAuthDebounced(); };
  window.addEventListener('online', _flushAll);
  window.addEventListener('pagehide', _flushAll);
  document.addEventListener('visibilitychange', _flushAll);
  // Al volver a la app (foreground) refresca de inmediato mensajes/plan, sin esperar el tick.
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible'&&CUR.loggedAs&&typeof pollMessages==='function'){ setTimeout(pollMessages,400); } });
  window.addEventListener('online', ()=>{ if(CUR.loggedAs&&typeof pollMessages==='function')setTimeout(pollMessages,800); });
}

async function syncFromCloud(){
  const fill=document.getElementById('ld-fill');
  const msg=document.getElementById('ld-msg');
  const setP=(p,t)=>{if(fill)fill.style.width=p+'%';if(msg)msg.textContent=t;};
  // El blob legacy apex_data quedó bloqueado por RLS (2026-06-03): la lectura
  // anónima SIEMPRE devuelve vacío, así que el fetch de arranque era peso muerto
  // (hasta 8s de timeout en red lenta). Los datos reales bajan por UD (user_data)
  // al restaurar la sesión auth, justo después de este boot local.
  setP(60,'Cargando tus datos...');
  // Recargar DB desde localStorage (con o sin sync exitoso)
  DB.clients=ld('ax_c',[]);
  // Migración blindada (como las de abajo): si lanza (datos raros, avi-core.js viejo en
  // caché tras un update) NUNCA debe colgar el arranque en el splash. Auditoría 2026-06-21.
  let _routineMigrated=false;
  try{ _routineMigrated=migrateRoutineIds(DB.clients,uid); }
  catch(e){ warn('AVI: migrateRoutineIds falló (no bloquea):',e&&e.message); }
  if(_routineMigrated){sv('ax_c',DB.clients);log('AVI: routine.id migration applied');}
  // Migración blindada: reordena rutinas por día (Lunes primero). Datos viejos se
  // crearon en cualquier orden; esto los normaliza una sola vez y persiste.
  try{
    let _daySorted=false;
    (DB.clients||[]).forEach(c=>{
      if(!c.routines||c.routines.length<2)return;
      const before=c.routines.map(r=>r.id).join(',');
      c.routines=sortRoutinesByDay(c.routines);
      if(c.routines.map(r=>r.id).join(',')!==before)_daySorted=true;
    });
    if(_daySorted){sv('ax_c',DB.clients);log('AVI: routine day-order migration applied');}
  }catch(e){ warn('AVI: ordenamiento de días falló (no bloquea):',e&&e.message); }
  DB.exercises=ld('ax_e',defaultExercises);
  // Migraciones blindadas: si una falla (p.ej. avi-core.js viejo en caché tras un update),
  // NUNCA debe colgar el arranque. Se degrada con gracia y la app igual carga.
  try{ migrateExTypes(); }catch(e){ warn('AVI: migrateExTypes falló (no bloquea):',e&&e.message); }
  try{ migrateEnv(); }catch(e){ warn('AVI: migrateEnv falló (no bloquea):',e&&e.message); }
  DB.msgs=ld('ax_m',{});
  DB.history=ld('ax_hist',{});
  DB.prs=ld('ax_pr',{});
  DB.bodyweight=ld('ax_bw',{});
  DB.templates=ld('ax_tpl',[]);
  DB.nutrition=ld('ax_nut',{});
  DB.medidas=ld('ax_med',{});
  DB.photos=ld('ax_photos',{});
  DB.nequi=ld('ax_nequi','');
  setP(100,'¡Listo!');
  setTimeout(()=>migratePhotosToStorage(),3000);
  // Mantener la pantalla de carga unos segundos para que se vea la marca y se lea
  // el mensaje (antes se quitaba en 100-350ms y no daba tiempo). Un poco menos si ya
  // hay sesión guardada (no es registro nuevo), pero igual visible.
  const hasSession = !!ld('ax_session', null);
  await new Promise(r=>setTimeout(r, hasSession ? 2800 : 3200));
  const overlay=document.getElementById('avi-loading');
  if(overlay){overlay.classList.add('fade');setTimeout(()=>overlay.remove(),300);}
}
function ar(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,90)+'px'}
let _tt;
function toast(msg,ms){const e=document.getElementById('toast');clearTimeout(_tt);e.textContent=msg;e.classList.add('on');_tt=setTimeout(()=>e.classList.remove('on'),ms||2500)}
// Anuncio para lectores de pantalla (aria-live). Se limpia y reescribe para forzar la relectura.
function a11ySay(msg){try{const e=document.getElementById('a11y-live');if(!e)return;e.textContent='';setTimeout(()=>{e.textContent=msg;},60);}catch(_){}}

// ══════════════════════ DB ══════════════════════
// ══ IMÁGENES DE EJERCICIOS ══ (base libre dominio público, reemplazables por clips propios)
// IDs y nombres con foto en media/exercises/<id>.jpg. exImgSrc resuelve por id o por nombre
// (las rutinas copian el ejercicio; el nombre garantiza el match aunque cambie el id).
// EX_IMG_IDS se deriva de EX_IMG_NAME (abajo) para no duplicar los 99 ids
const EX_IMG_NAME={"press de banca":"e1","press inclinado mancuernas":"e2","aperturas con cable":"e3","press de banca con mancuernas":"e71","dominadas":"e4","remo con barra":"e5","jalon al pecho":"e6","pullover en polea":"e24","remo en polea a una mano":"e25","jalon al pecho agarre amplio":"e26","jalon al pecho agarre neutro":"e27","jalon al pecho agarre cerrado":"e28","peso muerto convencional":"e34","buenos dias con barra":"e50","remo gironda en polea":"e51","remo con mancuerna a una mano":"e52","press militar con barra":"e7","elevaciones laterales":"e8","face pull en polea":"e21","press militar con mancuerna":"e22","press militar en maquina":"e23","elevaciones frontales":"e53","pajaro / elevaciones posteriores":"e54","curl con barra":"e9","curl martillo":"e10","curl biceps con mancuerna":"e29","curl en polea baja":"e55","curl scott / predicador":"e56","extension en polea alta":"e11","skull crushers":"e12","fondos en paralelas":"e19","extension de triceps trasnuca":"e30","extension a una mano en polea":"e31","press frances con mancuernas":"e57","sentadilla con barra":"e13","peso muerto rumano":"e14","curl femoral tumbado":"e15","elevacion de talones de pie":"e16","sentadilla en smith":"e33","desplantes / zancada":"e35","prensa de pierna":"e36","extension de cuadriceps en maquina":"e37","curl femoral de pie en maquina":"e39","zancada bulgara":"e40","step-up con mancuernas":"e41","sentadilla hack":"e58","elevacion de talones sentado":"e59","sentadilla goblet":"e70","hip thrust con barra":"e42","hip thrust en maquina":"e43","patada de gluteo en polea":"e44","aduccion de cadera en maquina":"e60","peso muerto piernas rigidas":"e46","sentadilla sumo":"e61","puente de gluteo":"e73","plancha frontal":"e17","crunch abdominal":"e18","rueda abdominal (ab wheel)":"e47","elevacion de piernas colgado":"e48","plancha lateral":"e49","russian twist":"e62","carrera / caminata":"e20","bicicleta estatica":"e64","remo ergometro":"e65","salto a la cuerda":"e66","eliptica":"e67","peso muerto sumo":"e68","clean & press ⚠️ avanzado":"e69","flexiones en pared":"e77","flexiones en rodillas":"e78","fondos en banco":"e79","sentadilla de peso corporal":"e80","mountain climbers":"e81","superman":"e82","lagartijas (push-up)":"e83","press en maquina hammer (pecho)":"e84","aperturas en polea alta":"e85","aperturas en polea baja":"e86","patada lateral en polea":"e87","patada en polea rodilla doblada":"e88","hip thrust unilateral":"e92","peso muerto rumano a una pierna":"e95","kickback con banda (en suelo)":"e96","pike push-up (flexion pica)":"e97","press de hombro con banda":"e98","elevaciones laterales con banda":"e99","face pull con banda":"e100","curl de biceps con banda":"e101","curl martillo con banda":"e102","dominada supina (chin-up)":"e103","remo con banda":"e104","extension de triceps con banda":"e105","puente de gluteo a una pierna":"e106","step-up a peso corporal":"e107","sentadilla con banda de resistencia":"e93","clamshell con banda (concha)":"e89","abduccion de cadera de pie con banda":"e94"};
// Blindaje (C4 auditoría 2026-07-13; hallazgo Julián v315): sin prototipo, un ejercicio custom
// llamado 'constructor'/'__proto__'/'toString' NO resuelve a un miembro HEREDADO en el lookup
// `EX_IMG_NAME[nf(name)]` (daba un id basura → 404 de imagen). Mata la clase en el ORIGEN:
// todos los lookups por nombre (exImgSrc/exVidSrc) quedan seguros sin tocar cada call-site.
// Object.values (abajo) es estático y funciona igual sobre un objeto null-proto.
Object.setPrototypeOf(EX_IMG_NAME,null);
const EX_IMG_IDS=new Set(Object.values(EX_IMG_NAME));
// Fotos nuevas por id (ejercicios que antes NO tenían foto y no están en EX_IMG_NAME)
['e126','e63','e45','e72','e74','e75','e76','e90','e91','e108','e109','e110','e111','e112','e113','e114','e115','e116','e117','e118','e119','e120','e121','e122','e123','e124','e125','e127','e128','e129','e131','e132','e133','e135','e138','e139','e140','e130','e134','e136','e137','e141','e142','e143','e144','e145','e146','e147','e148','e149','e150','e151','e152','e153','e154','e155','e156','e157','e158','e160','e161','e162','e163','e164','fb03','fb01','fb02','fb04'].forEach(id=>EX_IMG_IDS.add(id));
// Lote 50 ejercicios nuevos (e165–e214, 2026-06-29): cobertura de huecos del catálogo. Imágenes
// generadas e integradas en media/exercises; faltaba registrar los ids aquí para que se muestren.
['e165','e166','e167','e168','e169','e170','e171','e172','e173','e174','e175','e176','e177','e178','e179','e180','e182','e183','e184','e185','e186','e187','e188','e189','e190','e191','e192','e193','e194','e195','e196','e197','e198','e199','e200','e201','e202','e203','e204','e205','e206','e207','e209','e210','e211','e212','e213','e214'].forEach(id=>EX_IMG_IDS.add(id));
// Repoblado 2026-07-27 + e159, el único viejo que se había quedado sin foto. Generadas con el
// atleta canon del catálogo y revisadas una por una: de 11 entraron 8.
// TRES se quedan con el ÍCONO a propósito, porque una foto con la técnica mal es peor que
// ninguna (el asesorado copia lo que ve):
//   e217 aperturas declinadas — 4 intentos: el banco salía inclinado (el ejercicio contrario)
//        o los brazos asimétricos, como un press alternado.
//   e215 press declinado con barra y e222 press de banca agarre cerrado — RECHAZADAS POR EL PO
//        (2026-07-28): «no tienen lógica». Discos desparejos a lado y lado de la barra y el
//        ángulo de la barra imposible. El modelo no sostiene la simetría de una barra cargada.
// Para estas tres, la vía buena es foto REAL del gimnasio, como se hizo con e126 curl femoral.
['e159','e216','e218','e219','e220','e223','e225','e226'].forEach(id=>EX_IMG_IDS.add(id));
// Nota del coach: cue profesional corto por ejercicio (lo ve el asesorado en el detalle).
// Se resuelve por id al renderizar (como las imágenes) — sin tocar los datos guardados.
// Lote 1 (2026-06-07): ejercicios con foto nueva + compuestos base. Rollout al resto pendiente.
const EX_COACHTIP={
 e1:"Baja la barra al pecho en 2-3 segundos y empuja sin rebote: el músculo trabaja tanto al bajar como al subir.",
 e2:"Controla la bajada hasta sentir el estiramiento del pecho; sube juntando sin chocar las mancuernas.",
 e110:"Banco a 30-45°, no más empinado. La barra baja al pecho ALTO (bajo la clavícula), no al esternón; codos a ~45° del torso, no abiertos en T.",
 e4:"Inicia bajando hombros y codos hacia el bolsillo; jala con la espalda, no pienses solo en subir la barbilla.",
 e5:"Columna neutra y tira hacia el ombligo apretando la espalda; si la lumbar se redondea, baja el peso.",
 e8:"Lidera con los codos, no con las manos, y sube solo hasta la línea del hombro; sin impulso de cadera.",
 e9:"Codos fijos al costado: si se van hacia adelante, trabaja el hombro. Domina la bajada, no sueltes el peso.",
 e11:"Solo se mueve el antebrazo; pega los codos al torso y extiende completo, sin balancear el cuerpo.",
 e13:"Cadera y rodillas bajan juntas, talón clavado y pecho arriba; baja hasta donde controles la técnica.",
 e14:"Es bisagra de cadera, no sentadilla: lleva la cadera atrás y siente el femoral; nunca fuerces la lumbar.",
 e16:"Sube a la punta del pie con pausa de 1 segundo arriba y baja lento buscando el estiramiento completo.",
 e17:"Glúteo y abdomen apretados formando una línea recta; vale más la calidad de la posición que el tiempo total.",
 e19:"Baja hasta que el codo llegue a 90°, no más, y lleva el pecho ligeramente adelante para cuidar el hombro.",
 e21:"Aquí manda la técnica, no el peso: jala hacia la frente abriendo los codos y aprieta la espalda alta.",
 e22:"Aprieta glúteo y abdomen para no arquear la espalda baja; empuja en línea con las orejas.",
 e27:"Deja caer los codos a los lados y lleva la barra al pecho apretando la espalda media; no te recuestes de más.",
 e28:"Tira hacia el esternón con el pecho arriba; siente trabajar el dorsal bajo, no solo el brazo.",
 e30:"Codos apuntando al frente y quietos; baja con control detrás de la nuca sin abrirlos.",
 e34:"Barra pegada al cuerpo y empuja el suelo con los pies; sube cadera y pecho a la vez, con la espalda neutra.",
 e53:"Sube solo hasta la altura del hombro y sin balanceo; usa el peso justo para no jalar con la espalda.",
 e54:"Pecho arriba y codos ligeramente doblados; abre como mostrando el logo y aprieta la espalda alta.",
 e55:"Tensión constante: no descanses abajo, codos fijos y aprieta el bíceps arriba.",
 e57:"Solo se mueven los codos; baja hacia la frente con control y evita abrirlos.",
 e79:"Rodillas a 90° y codos hacia atrás, no hacia afuera; baja solo hasta 90° para proteger el hombro.",
 e83:"Cuerpo recto de cabeza a talones; baja el pecho con los codos en diagonal, no hacia los lados.",
 e84:"Espalda y omóplatos pegados al respaldo; empuja sin bloquear de golpe y controla la vuelta.",
 e97:"Cuanto más alta la cadera, más trabajan los hombros; baja la coronilla hacia el suelo con control.",
 e98:"Pisa firme la banda y empuja en línea con las orejas; controla la bajada, no dejes que te jale.",
 e99:"Sube hasta la línea del hombro liderando con los codos; la banda no debe ganarte en la bajada.",
 e3:"Codos fijos y ligeramente doblados: es un abrazo, no un press; aprieta el pecho al cruzar y abre con control.",
 e71:"Baja hasta sentir el pecho estirado y empuja juntando arriba sin chocar las mancuernas; controla, no rebotes.",
 e77:"Cuerpo recto de cabeza a pies; codos a 45° del torso (no en T) y empuja sin dejar caer la cadera.",
 e78:"Línea recta de rodillas a cabeza; si la cadera sube o se hunde, esa es tu señal para parar.",
 e85:"Cruza de arriba hacia abajo apretando el pecho bajo; codos fijos, no lo conviertas en un press.",
 e86:"Sube y junta al frente buscando el pecho alto; codos quietos y ligeramente doblados todo el recorrido.",
 e6:"Baja primero los hombros y lleva los codos al costado; jala a la clavícula con el pecho arriba, sin recostarte de más.",
 e24:"Brazos casi rectos y fijos; dibuja un arco hasta los muslos sintiendo el dorsal, sin doblar los codos.",
 e25:"Tira llevando el codo atrás y junta el omóplato; un leve giro del torso al final suma rango, sin perder control.",
 e26:"Manos anchas y codos hacia abajo; lleva la barra a la clavícula apretando la espalda alta, sin balancearte.",
 e50:"Bisagra de cadera con la espalda neutra; baja hasta sentir el femoral y nunca redondees la lumbar. Empieza ligero.",
 e51:"Codos atrás y arriba rozando las costillas; aprieta la espalda media al final y suelta el peso despacio.",
 e52:"Apoya bien y tira la mancuerna a la cadera girando el codo al techo; estira abajo, aprieta arriba.",
 e82:"Sube brazos y piernas apretando el glúteo; aguanta 2 segundos y mantén el cuello en línea, sin tirar la cabeza atrás.",
 e104:"Codos atrás juntando los omóplatos, como apretando un lápiz entre ellos; regresa con control, sin soltar la tensión.",
 e7:"Aprieta glúteo y abdomen para no arquear la lumbar; mete la cabeza al pasar la barra y empuja en línea recta.",
 e23:"Espalda apoyada y empuja en línea con las orejas; no bloquees de golpe y controla la bajada.",
 e100:"Jala a la frente abriendo los codos; aquí prioriza la contracción de la espalda alta, nunca el peso.",
 e109:"Movimiento pequeño y preciso: levanta los brazos apretando la espalda alta, sin impulso ni subir los hombros a las orejas.",
 e10:"Agarre neutro (pulgares arriba) y codos fijos; sube sin girar la muñeca y baja con control sintiendo el antebrazo.",
 e29:"Codos pegados al costado; gira un poco la muñeca arriba para apretar el bíceps y resiste la bajada.",
 e56:"El brazo apoyado quita el impulso: no extiendas del todo abajo para cuidar el codo y aprieta arriba.",
 e101:"Tensión constante que crece arriba; codos fijos y aprieta el bíceps al final, baja despacio.",
 e102:"Palmas enfrentadas y muñeca firme; suma antebrazo al bíceps y controla la vuelta sin que la banda te gane.",
 e103:"Palmas hacia ti: sube llevando los codos abajo hasta pasar el mentón; usa banda si hace falta, pero baja con control.",
 e12:"Solo se mueven los codos y apuntan al techo; baja hacia la frente con control, sin abrirlos.",
 e31:"Codo pegado al costado y quieto; extiende completo y resiste la subida, sin balanceo.",
 e105:"Codos pegados y fijos: extiende hacia abajo apretando el tríceps y sube lento sin moverlos.",
 e15:"Sin impulso ni despegar la cadera; sube apretando el femoral y resiste 2 segundos en la bajada.",
 e33:"Rodillas siguen la punta del pie y baja con el pecho arriba; usa la guía para controlar el rango, no para descuidar la técnica.",
 e35:"Tronco erguido y baja la rodilla de atrás hacia el suelo; la rodilla de adelante no pasa la punta del pie.",
 e36:"Baja hasta 90° sin que la cadera se despegue del respaldo; no bloquees las rodillas de golpe arriba.",
 e37:"Sube con control y aprieta el cuádriceps 1 segundo arriba; baja despacio, sin soltar el peso de golpe.",
 e39:"Aísla una pierna: sube apretando el femoral sin mover la cadera y baja con control.",
 e40:"Pie de atrás en el banco; baja vertical con el tronco firme y el peso en el talón de la pierna de adelante.",
 e41:"Sube empujando con el talón de la pierna de arriba, sin impulsarte con la de abajo; baja controlando.",
 e58:"Espalda pegada al respaldo y talones firmes; baja hasta 90° con las rodillas siguiendo la punta del pie.",
 e59:"Rango completo: estira abajo y sube a la punta con pausa de 1 segundo; aquí trabaja el sóleo.",
 e70:"Mancuerna pegada al pecho y codos adentro; baja entre las rodillas con el pecho arriba y los talones clavados.",
 e80:"Cadera atrás como sentándote en una silla lejana; rodillas hacia la punta del pie y sube empujando los talones.",
 e93:"Empuja las rodillas hacia afuera contra la banda; eso activa el glúteo medio y evita que colapsen adentro.",
 e95:"Forma una T con el cuerpo desde la cadera; ve sin peso hasta dominar el equilibrio y siente el femoral, no la lumbar.",
 e107:"Apoya todo el pie y sube empujando con esa pierna; baja despacio controlando, sin dejarte caer.",
 e108:"Sostente para controlar el descenso; baja lo que tu técnica aguante y sube empujando con el talón.",
 e42:"Mentón metido y costillas abajo; empuja con los talones y aprieta el glúteo arriba sin arquear la lumbar.",
 e43:"Sube apretando el glúteo, no la espalda baja; pausa arriba 1 segundo y baja con control.",
 e44:"Lleva el talón atrás apretando el glúteo; el movimiento sale de la cadera, no de arquear la espalda.",
 e45:"Abre con control y aprieta el glúteo medio al final; inclínate un poco al frente para sentirlo más.",
 e60:"Cierra con control sintiendo el interior del muslo; no dejes que el peso te abra de golpe a la vuelta.",
 e46:"Bisagra de cadera con piernas casi rectas; baja la barra pegada buscando el femoral, lumbar siempre neutra.",
 e61:"Pies anchos y puntas afuera; baja con las rodillas siguiendo los pies y sube apretando glúteo e interior del muslo.",
 e73:"Empuja con los talones y aprieta el glúteo arriba; no arquees la lumbar, el trabajo es de la cadera.",
 e87:"Lleva la pierna al lado con el core firme; el movimiento sale de la cadera, no de inclinar el tronco.",
 e88:"Rodilla a 90° y lleva el talón al techo apretando el glúteo; no muevas la cadera ni arquees la espalda.",
 e89:"Pies juntos y abre la rodilla de arriba sin girar la cadera; lento y sintiendo el costado del glúteo.",
 e90:"Sin mover la cadera, lleva la rodilla doblada afuera y arriba; baja con control, no dejes caer la cadera.",
 e91:"Plantas juntas y rodillas abiertas; sube apretando el glúteo al máximo y baja sin tocar el suelo.",
 e92:"Una pierna a la vez: sube con el glúteo del lado apoyado sin rotar la cadera; empieza con tu peso corporal.",
 e94:"Lleva la pierna afuera con el tronco firme; controla la vuelta sin dejar caer el pie ni inclinarte.",
 e96:"Extiende la pierna atrás apretando el glúteo arriba; no arquees la lumbar, mantén el core firme.",
 e106:"Sube con el glúteo de la pierna apoyada manteniendo la otra recta; baja sin tocar el suelo.",
 e18:"Enrolla la columna llevando las costillas a la cadera, no tires del cuello; exhala arriba y baja con control.",
 e47:"Abdomen y glúteo apretados todo el rango; rueda solo hasta donde la lumbar no se arquee. Es avanzado.",
 e48:"Sube con el abdomen, no con impulso; controla la bajada y evita balancearte.",
 e49:"Cuerpo en línea y cadera arriba; aprieta el oblicuo y no dejes caer la cintura.",
 e62:"Gira desde el tronco llevando las manos de lado a lado; no es velocidad, es rotación controlada del core.",
 e63:"Lumbar pegada al suelo todo el tiempo; si se despega, sube un poco brazos o piernas. La técnica define el ejercicio.",
 e72:"Lumbar pegada al suelo; baja brazo y pierna opuestos lento sin arquear la espalda. Calidad sobre cantidad.",
 e81:"Cadera estable como una tabla; lleva las rodillas al pecho sin subir ni bajar la cola.",
 e20:"Mantén un ritmo en el que puedas hablar entrecortado; postura erguida y pisada suave.",
 e64:"Ajusta el sillín para no estirar del todo la rodilla; cadencia constante, sin mecerte.",
 e65:"El orden es piernas, tronco y brazos; empuja con las piernas y suelta a la inversa, espalda firme.",
 e66:"Saltos bajos sobre el mediopié y el giro sale de las muñecas; ritmo constante, aterriza suave.",
 e67:"Postura erguida sin colgarte de los brazos; empuja con las piernas y mantén una cadencia pareja.",
 e74:"En el bloque intenso vas casi al máximo y en la pausa recuperas de verdad; la técnica no se rompe ni cansado.",
 e75:"Espalda neutra en la plancha; cambia los saltos por pasos si recién empiezas y prioriza la calidad de cada repetición.",
 e76:"Coordina brazos y piernas con ritmo constante; aterriza suave sobre el mediopié, no sobre los talones.",
 e68:"Pies muy anchos y puntas afuera; agarre entre las piernas, empuja el suelo y sube cadera y pecho juntos con espalda neutra.",
 e69:"Movimiento avanzado: domina la técnica sin peso y con supervisión antes de cargar. Potencia desde el suelo, recibe con cuidado.",
 e111:"Ajusta el asiento para que los manerales queden a la altura del pecho; aprieta 1s al cerrar y no dejes que el peso te abra de golpe.",
 e112:"Codos un poco doblados y QUIETOS: si se doblan más al subir, lo convertiste en press. Abre solo hasta el estiramiento cómodo.",
 e113:"Cuerpo en tabla: si la cadera se hunde, el ejercicio se pierde. Apoyo más alto = más fácil; más bajo = más cerca del suelo.",
 e114:"El pecho NUNCA se despega del cojín: si se despega, estás jalando con impulso. Aprieta los omóplatos 1s al final.",
 e115:"Sube recto hacia las orejas y baja estirando: nada de círculos con los hombros. Pausa de 1s arriba con el cuello relajado.",
 e116:"Sube solo hasta la línea recta del cuerpo: hiperextender arriba castiga la lumbar. La bajada controlada es la mitad del trabajo.",
 e117:"Deja que el brazo baje cruzando un poco frente al cuerpo: ahí la polea mantiene la tensión que la mancuerna pierde abajo.",
 e118:"El giro acompaña al empuje, no lo precede: palmas hacia ti abajo, al frente arriba. Sentado y con carga moderada.",
 e119:"Codos casi rectos y FIJOS a la altura del hombro: si se doblan, jala el tríceps. Piensa en juntar los omóplatos atrás.",
 e120:"El codo clavado contra el muslo no se mueve ni un centímetro: si se despega, estás usando impulso. Pausa arriba y baja en 3s.",
 e121:"Deja el brazo colgar bien atrás y estira COMPLETO abajo: ese estiramiento es el motivo del ejercicio. Hombros pegados al banco.",
 e122:"El brazo paralelo al suelo es la regla: si el codo cae, el tríceps descansa. Bloquea atrás 1s con poco peso.",
 e123:"Codos pegados al cuerpo al bajar, no abiertos. Si las muñecas molestan, separa un poco las manos: el diamante no es sagrado.",
 e124:"El paso atrás debe ser LARGO: rodilla delantera sobre el tobillo, no sobre la punta. Empuja con el talón de adelante.",
 e125:"Paso largo y pausa breve abajo antes de enlazar el siguiente: encadenar rápido sin control convierte el ejercicio en caminata.",
 e126:"Cadera pegada al asiento al doblar: si se levanta, bajaste demasiado el peso de golpe. Regresa en 3 segundos.",
 e127:"Codos ALTOS o la barra se rueda: ese es todo el secreto. Si la muñeca no da, usa el agarre de brazos cruzados.",
 e128:"Muslos paralelos al suelo y espalda completa contra la pared; respira normal, sin apoyar las manos en las rodillas.",
 e129:"La banda nunca se afloja: pies separados siempre, pasos cortos y cadera baja. El ardor lateral es la señal correcta.",
 e130:"El talón sube hacia el techo desde la CADERA: si la lumbar se arquea, recorta el rango. Aprieta 1s arriba.",
 e131:"La cadera no se mueve: enróllate llevando las costillas a la cadera. Si jalas con los brazos, el abdomen no trabaja.",
 e132:"La lumbar pegada al suelo manda: en cuanto se despegue al bajar, dobla las rodillas o recorta el rango.",
 e133:"Cuanto más estiras los brazos, más fuerte gira la banda: aguanta 2-3s sin que el tronco rote ni un grado.",
 e134:"Cadera nivelada como si llevaras un vaso de agua en la espalda baja: estirar más alto no vale si el tronco se ladea.",
 e135:"Pisa el escalón completo y suelta las barandas: colgarse de ellas le quita la mitad del trabajo a glúteos y piernas.",
 e136:"Hombros atrás y pasos cortos: la serie termina cuando la postura se rompe, no cuando se te abren las manos.",
 e137:"Codos casi rectos y QUIETOS: si se doblan al bajar se vuelve press francés. Baja solo hasta el estiramiento cómodo del hombro.",
 e138:"Carga mínima y el codo soldado al cuerpo: si el codo se despega, el hombro grande le roba el trabajo al manguito.",
 e139:"Muñecas firmes en línea con el antebrazo: si se quiebran hacia abajo, baja el peso. Es normal cargar menos que en el curl clásico.",
 e140:"Los antebrazos no se despegan del apoyo: solo se mueve la muñeca. Deja rodar la barra a los dedos para ampliar el rango."
};
// Fotos de ejercicio con versión MUJER (media/exercises/{id}_f.jpg). Gender-aware: la
// asesorada ve la demo en mujer; coach/hombre ven el default. Se amplía conforme llegan fotos.
const EX_IMG_F=new Set(['e1','e2','e3','e4','e5','e6','e7','e8','e9','e10','e11','e12','e13','e14','e15','e16','e17','e18','e19','e20','e22','e23','e24','e25','e26','e27','e28','e29','e30','e31','e33','e34','e35','e36','e37','e39','e40','e41','e42','e43','e44','e45','e46','e47','e48','e49','e50','e51','e52','e53','e54','e55','e56','e57','e58','e59','e60','e61','e62','e63','e64','e65','e66','e67','e68','e69','e70','e71','e72','e73','e74','e75','e76','e77','e78','e79','e80','e81','e82','e83','e84','e85','e86','e87','e89','e90','e91','e92','e93','e94','e95','e96','e97','e98','e99','e100','e101','e102','e103','e104','e105','e106','e107','e108','e109','e110','e111','e112','e113','e114','e115','e116','e117','e118','e119','e120','e121','e122','e123','e124','e125','e126','e127','e128','e129','e130','e132','e133','e134','e135','e136','e137','e138','e139','e140','e141','e142','e143','e144','e145','e146','e147','e148','e149','e150','e151','e152','e153','e154','e155','e156','e157','e158','e160','e161','e162','e163','e164','fb03','fb01','fb02','fb04']);
// Sexo de quien mira: en vista del asesorado sigue su sexo; el coach ve el default.
function _viewSex(){ if(CUR.loggedAs==='client'){ const c=DB.clients.find(x=>x.id===CUR.clientId); return (c&&c.sex)||''; } return ''; }
// Fotos DESACTIVADAS por contenido incorrecto (auditoría 2026-06-09) → muestran el ícono
// hasta regenerarlas en Gemini. Quitar de aquí cuando la foto correcta esté lista.
//  e43/e92 = reusaban la foto de barra de e42 (no máquina / no unilateral)
//  e31/e105 = compartían una foto ambigua (parecía press en banco, no extensión de tríceps)
const EX_IMG_HIDE=new Set([]);
function exImgSrc(e,sex){
  if(!e) return '';
  const nf=s=>(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
  const id=(e.id&&EX_IMG_IDS.has(e.id))?e.id:(EX_IMG_NAME[nf(e.name)]||'');
  if(!id||EX_IMG_HIDE.has(id)) return '';
  const s=(sex!==undefined)?sex:_viewSex();
  if(s==='F'&&EX_IMG_F.has(id)) return 'media/exercises/'+id+'_f.jpg';
  return 'media/exercises/'+id+'.jpg';
}
// Ejercicios con VIDEO de demostración (media/exercises/{id}.mp4). Se muestra en el
// DETALLE del ejercicio (loop, mudo); la lista sigue con foto (liviana). Si no hay
// video resuelve '' → cae a la foto. Se amplía conforme llegan más videos.
const EX_VID=new Set(['e5','e6','e13','e11','e9','e27','e22','e84','e36','e1','e2','e24','e23','e14','e26','e28','e37','e42','e51','e52','e58','e80','e85','e86','e56','e3','e40','e47','e48','e57']);
// 1 VIDEO POR EJERCICIO, SE MUESTRA A TODOS — el sexo NO define el video (Camilo 2026-06-09:
// hacer 220 videos ♂+♀ es inviable). EX_VID_F = ejercicios cuyo único video está guardado como
// {id}_f.mp4 (se grabó con modelo mujer); igual se muestra a hombres y mujeres por igual.
const EX_VID_F=new Set(['e34']);
// Gender-aware SOLO donde existen ambas versiones (.mp4 ♂ + _f.mp4 ♀): la mujer ve la suya.
const EX_VID_BOTH=new Set(['e2','e33']);
function exVidSrc(e){
  if(!e) return '';
  const nf=s=>(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
  const id=(e.id&&EX_IMG_IDS.has(e.id))?e.id:(EX_IMG_NAME[nf(e.name)]||'');
  if(!id) return '';
  if(EX_VID_BOTH.has(id)) return 'media/exercises/'+id+(_viewSex()==='F'?'_f':'')+'.mp4';
  if(EX_VID.has(id)) return 'media/exercises/'+id+'.mp4';
  if(EX_VID_F.has(id)) return 'media/exercises/'+id+'_f.mp4';
  return '';
}
// Marca <img> de ejercicio reutilizable (tarjetas y detalle) — lazy + tocable
function exImgTag(src,name){
  return `<img class="exicon-img" src="${src}" alt="${esc(name||'')}" loading="lazy" decoding="async" onclick="event.stopPropagation();openExImg(this.src,this.alt)">`;
}
function exIcon(e){
  const s=exImgSrc(e);
  if(!s) return esc((e&&e.icon)||'💪');
  return exImgTag(s,(e&&e.name)||'');
}
// Lightbox: tocar la imagen del ejercicio la expande a pantalla completa.
// Empuja su PROPIA capa de historial (navOpenLayer) — igual que las habitaciones — para que
// el atrás físico lo cierre sin robarle la capa a la habitación que tenga debajo (bug #7
// auditoría 2026-06-30: atrás desde "Ver técnica" dentro de una sala podía cerrar la app en TWA).
function openExImg(src,name){
  const lb=document.getElementById('ex-lightbox'); if(!lb||!src) return;
  const vid=document.getElementById('exlb-vid'); if(vid){try{vid.pause();}catch(e){} vid.removeAttribute('src'); vid.style.display='none';}
  const img=document.getElementById('exlb-img'); img.style.display=''; img.src=src;
  document.getElementById('exlb-name').textContent=name||'';
  if(!lb.classList.contains('on')) navOpenLayer();
  lb.classList.add('on');
}
// Igual que openExImg pero para el video del ejercicio (se ve COMPLETO, sin recorte).
function openExVid(src,name){
  const lb=document.getElementById('ex-lightbox'); if(!lb||!src) return;
  const img=document.getElementById('exlb-img'); if(img)img.style.display='none';
  const vid=document.getElementById('exlb-vid');
  if(vid){vid.style.display='block'; vid.src=src; vid.play&&vid.play().catch(()=>{});}
  document.getElementById('exlb-name').textContent=name||'';
  if(!lb.classList.contains('on')) navOpenLayer();
  lb.classList.add('on');
}
function closeExImg(){
  const lb=document.getElementById('ex-lightbox'); if(!lb)return;
  lb.classList.remove('on');
  const vid=document.getElementById('exlb-vid'); if(vid){try{vid.pause();}catch(e){} vid.removeAttribute('src'); vid.style.display='none';}
  const img=document.getElementById('exlb-img'); if(img)img.style.display='';
}
// Cerrar lightbox / bienvenida con la tecla Escape (no interfiere con otros handlers).
// El lightbox tiene capa de historial propia → cerrar via navCloseLayer para consumirla.
document.addEventListener('keydown',function(e){ if(e.key==='Escape'){
  const lb=document.getElementById('ex-lightbox');
  if(lb&&lb.classList.contains('on')) navCloseLayer(closeExImg);
  hideClientWelcome();
} });

const defaultExercises=[
  // ── PECHO ──
  {id:'e1',name:'Press de Banca con Barra',muscle:'pecho',type:'Compuesto',sets:4,reps:10,icon:'🏋️',desc:'Rey del empuje horizontal: trabaja el pectoral mayor con apoyo del hombro anterior y el tríceps. Omóplatos juntos y retraídos, pies firmes; baja la barra al pecho con control y empuja en línea ligeramente hacia atrás. Sin rebotes ni despegar la espalda del banco.',descSimple:'Acuéstate en el banco con los pies en el suelo. Junta los omóplatos y empuja la barra hacia arriba y un poco hacia atrás, sintiendo el pecho. No rebotes el peso ni despegues la espalda del banco.',muscleLabel:'Pecho, hombros y tríceps',ytQuery:'press de banca como hacerlo correctamente'},
  {id:'e2',name:'Press Inclinado con Mancuernas',muscle:'pecho',type:'Compuesto',sets:3,reps:12,icon:'📐',desc:'Compuesto para el pectoral superior (clavicular) en banco a ~30-45°. El recorrido independiente de las mancuernas cuida los hombros y da más rango que la barra. Baja al nivel del pecho alto y empuja arriba y adentro sin chocar las mancuernas.',descSimple:'En banco inclinado, sostén una mancuerna en cada mano a la altura del pecho. Empuja hacia arriba juntándolas suavemente arriba, sintiendo la parte alta del pecho. Baja lento.',muscleLabel:'Pecho superior',ytQuery:'press inclinado con mancuernas tutorial'},
  {id:'e110',name:'Press Inclinado con Barra',muscle:'pecho',type:'Compuesto',sets:4,reps:10,icon:'📈',desc:'Compuesto para el pectoral superior (clavicular) en banco inclinado a ~30-45° con barra, que permite mover más carga que con mancuernas. Omóplatos retraídos y pies firmes; baja la barra al pecho alto (bajo la clavícula) con control y empuja en línea sin rebotar ni despegar la espalda del banco.',descSimple:'Acuéstate en un banco inclinado (30-45°) con los pies en el suelo. Junta los omóplatos y baja la barra hacia la parte alta del pecho; empuja hacia arriba sintiendo el pecho de arriba. No rebotes la barra ni arquees de más la espalda.',muscleLabel:'Pecho superior, hombros y tríceps',ytQuery:'press inclinado con barra técnica correcta'},
  {id:'e3',name:'Aperturas con Cable',muscle:'pecho',type:'Aislamiento',sets:3,reps:15,icon:'📉',desc:'Aislamiento del pectoral mayor con tensión constante en polea. Codos ligeramente flexionados y FIJOS (no es un press): abre y cruza al frente en un arco amplio, apretando el pecho al juntar. Controla la fase de apertura para no forzar el hombro.',descSimple:'De pie entre las poleas, con los brazos ligeramente doblados y fijos, junta las manos al frente como si abrazaras un árbol, apretando el pecho. Abre despacio. No dobles más los codos: no es un press.',muscleLabel:'Pecho (pectoral mayor)',ytQuery:'aperturas con cable pecho tutorial'},
  {id:'e71',name:'Press de Banca con Mancuernas',muscle:'pecho',type:'Compuesto',sets:3,reps:'12',icon:'🤲',desc:'Tumbado en banco, mancuernas a los lados del pecho. Empuja hacia arriba juntando ligeramente al tope. Más accesible que la barra para principiantes.',descSimple:'Acuéstate en el banco con una mancuerna en cada mano a la altura del pecho. Empuja ambas hacia arriba hasta casi juntar las mancuernas arriba. Más fácil y seguro que con barra para comenzar.',muscleLabel:'Pecho, hombros y tríceps',ytQuery:'press de banca mancuernas tutorial principiantes'},
  // ── ESPALDA ──
  {id:'e4',name:'Dominadas',muscle:'espalda',type:'Bodyweight',sets:4,reps:8,icon:'🦅',desc:'Rey de la tracción vertical con peso corporal: trabaja el dorsal ancho con apoyo de bíceps y romboides. Agarre prono al ancho de hombros o algo más; sube llevando los codos hacia abajo y atrás hasta que el mentón pase la barra y baja con control hasta extender.',descSimple:'Cuélgate de la barra con las palmas mirando al frente. Sube llevando los codos hacia abajo hasta que el mentón pase la barra, sintiendo la espalda (no solo los brazos). Baja lento. Si no puedes solo, usa una banda de resistencia o la máquina asistida.',muscleLabel:'Espalda (dorsal) y bíceps',ytQuery:'dominadas como hacerlas desde cero tutorial'},
  {id:'e5',name:'Remo con Barra',muscle:'espalda',type:'Compuesto',sets:4,reps:10,icon:'⬇️',desc:'Espalda a 45°, tira la barra hacia el ombligo. Codos pegados.',descSimple:'Inclínate hacia adelante unos 45 grados con la espalda recta, no redonda. Tira la barra hacia tu ombligo manteniendo los codos cerca del cuerpo. Nunca redondees la espalda baja, sin importar el peso.',muscleLabel:'Espalda media',ytQuery:'remo con barra espalda tutorial'},
  {id:'e6',name:'Jalón al Pecho en Polea',muscle:'espalda',type:'Compuesto',sets:3,reps:12,icon:'🔄',desc:'Tracción vertical en polea para el dorsal ancho. Agarre prono algo más ancho que los hombros; lleva la barra al pecho alto bajando los codos hacia los costados y atrás, pecho arriba y leve inclinación. Inicia el tirón desde la espalda, no desde los brazos.',descSimple:'Sentado en la máquina, agarra la barra y jálala hacia el pecho alto bajando los codos hacia los costados. Siente trabajar la espalda (el dorsal), no los brazos. Sube controlando sin encoger los hombros.',muscleLabel:'Dorsal (espalda)',ytQuery:'jalón al pecho máquina tutorial'},
  {id:'e24',name:'Pullover en Polea',muscle:'espalda',type:'Aislamiento',sets:3,reps:12,icon:'🌊',desc:'De pie frente a polea alta, extiende los brazos hacia abajo arqueando. Trabaja dorsal y serrato.',descSimple:'De pie frente a la polea alta. Con los brazos extendidos jálalos hacia abajo hasta las caderas como un arco. Mantén los codos ligeramente doblados.',muscleLabel:'Dorsal y serrato',ytQuery:'pullover en polea alta tutorial'},
  {id:'e25',name:'Remo en Polea a una Mano',muscle:'espalda',type:'Aislamiento',sets:4,reps:12,icon:'🫳',desc:'Remo unilateral en polea para el dorsal, un brazo a la vez para corregir asimetrías y ganar rango. Tira la manija hacia la cadera llevando el codo atrás y junto al cuerpo; aprieta la escápula al final y estira al volver.',descSimple:'Con un brazo a la vez, tira el agarre de la polea hacia tu cadera llevando el codo hacia atrás, apretando la espalda. Estira bien al volver. Ideal para equilibrar si un lado es más fuerte que el otro.',muscleLabel:'Dorsal (espalda)',ytQuery:'remo en polea un brazo tutorial'},
  {id:'e26',name:'Jalón al Pecho Agarre Amplio',muscle:'espalda',type:'Compuesto',sets:4,reps:10,icon:'↕️',desc:'Agarre más ancho que los hombros, tira hacia la clavícula. Énfasis en dorsal superior.',descSimple:'Como el jalón al pecho pero con las manos bien separadas. Baja los hombros, jala la barra hasta la clavícula con el pecho arriba y aprieta la espalda alta. Baja con control y no te balancees para subir el peso.',muscleLabel:'Espalda superior',ytQuery:'jalón agarre amplio espalda tutorial'},
  {id:'e27',name:'Jalón al Pecho Agarre Neutro',muscle:'espalda',type:'Compuesto',sets:4,reps:10,icon:'🤝',desc:'Barra en V, codos caen al lado del cuerpo. Activa romboides eficientemente.',descSimple:'Usa la barra en V con las palmas enfrentadas. Baja primero los hombros y jala hacia el pecho dejando caer los codos a los lados. Aprieta la espalda media al final y sube con control, sin recostarte de más.',muscleLabel:'Espalda media',ytQuery:'jalón agarre neutro v-bar tutorial'},
  {id:'e28',name:'Jalón al Pecho Agarre Cerrado',muscle:'espalda',type:'Compuesto',sets:4,reps:10,icon:'🔽',desc:'Agarre supino cerrado, tira hacia el esternón. Mayor dorsal inferior y bíceps.',descSimple:'Manos juntas y palmas mirando hacia ti. Con el pecho arriba, jala la barra hacia el pecho bajo llevando los codos hacia abajo. Sentirás trabajar la espalda baja del dorsal y los bíceps; baja con control hasta estirar.',muscleLabel:'Dorsal inferior',ytQuery:'jalón agarre supino cerrado tutorial'},
  {id:'e34',name:'Peso Muerto Convencional',muscle:'espalda',type:'Compuesto',sets:4,reps:5,icon:'🏗️',desc:'El rey de los compuestos. Barra sobre el mediopié, espalda neutra en todo momento.',descSimple:'Párate con la barra justo sobre el medio del pie. Agáchate, agarra la barra con las manos fuera de las piernas, espalda recta y pecho arriba. Respira profundo, aprieta el abdomen y empuja el suelo con los pies para levantarte. Es el ejercicio más técnico — pide guía antes de aumentar peso.',muscleLabel:'Espalda, piernas y glúteos',ytQuery:'peso muerto convencional como hacerlo bien'},
  {id:'e50',name:'Buenos Días con Barra',muscle:'espalda',type:'Compuesto',sets:3,reps:10,icon:'🌅',desc:'Barra en la nuca, bisagra de cadera hasta 45 grados. Trabaja erectores, femoral y glúteo. Contraindicado en hernias lumbares activas.',descSimple:'Barra apoyada en los hombros (no en el cuello). Inclínate hacia adelante desde la cadera solo hasta unos 45 grados, manteniendo la espalda completamente recta. Regresa lento. Usa poco peso — es muy exigente para la espalda baja. ⚠️ No recomendado si tienes dolor lumbar activo.',muscleLabel:'Espalda baja y femoral',ytQuery:'buenos días con barra ejercicio tutorial'},
  {id:'e51',name:'Remo Gironda en Polea',muscle:'espalda',type:'Aislamiento',sets:4,reps:12,icon:'🪝',desc:'Polea baja, agarre neutro, codos hacia atrás y arriba tocando las costillas. Máxima contracción del dorsal medio.',descSimple:'Polea baja, siéntate en el suelo. Tira el agarre hacia tu barriga llevando los codos hacia atrás. Aprieta la espalda al final del movimiento.',muscleLabel:'Dorsal medio',ytQuery:'remo en polea baja sentado tutorial'},
  {id:'e52',name:'Remo con Mancuerna a una Mano',muscle:'espalda',type:'Aislamiento',sets:4,reps:12,icon:'💼',desc:'Apoyado en banco, tira la mancuerna hacia la cadera girando el codo hacia el techo. Gran estiramiento del dorsal.',descSimple:'Apoya una mano y una rodilla en el banco con la espalda plana. Sube la mancuerna hacia la cadera llevando el codo atrás y arriba, y baja estirando bien el dorsal. Un brazo a la vez, sin girar el tronco.',muscleLabel:'Dorsal (espalda)',ytQuery:'remo con mancuerna un brazo tutorial'},
  // ── HOMBROS ──
  {id:'e7',name:'Press Militar con Barra',muscle:'hombros',type:'Compuesto',sets:4,reps:8,icon:'⬆️',desc:'Empuje vertical para el deltoides (cabeza anterior y media) con apoyo de tríceps. De pie, barra a la altura de las clavículas; aprieta abdomen y glúteo y empuja en vertical hasta bloquear arriba metiendo la cabeza al final. Sin arquear la lumbar.',descSimple:'De pie, sostén la barra a la altura de los hombros. Aprieta el abdomen fuerte y empuja la barra hacia arriba hasta estirar los brazos, sintiendo los hombros. Baja controlado. Si la espalda se arquea mucho, baja el peso.',muscleLabel:'Deltoides (hombros) y tríceps',ytQuery:'press militar con barra de pie tutorial'},
  {id:'e8',name:'Elevaciones Laterales',muscle:'hombros',type:'Aislamiento',sets:4,reps:15,icon:'🚣',desc:'Aislamiento del deltoides lateral (medio), el que da anchura al hombro. Codo ligeramente flexionado y fijo; sube las mancuernas a los lados hasta la altura del hombro liderando con el codo (no con la mano). Baja despacio, sin impulso.',descSimple:'Con una mancuerna en cada mano, sube los brazos hacia los lados hasta la altura del hombro guiando con el codo. Baja despacio, sin impulso. Trabaja la parte lateral del hombro (la que da anchura).',muscleLabel:'Hombro lateral (deltoides medio)',ytQuery:'elevaciones laterales hombros tutorial'},
  {id:'e21',name:'Face Pull en Polea',muscle:'hombros',type:'Aislamiento',sets:4,reps:15,icon:'🎯',desc:'Polea alta con cuerda, tira hacia la cara abriendo los codos. Salud del manguito rotador.',descSimple:'Coloca la polea a la altura de la cara y toma la cuerda. Jala hacia tu nariz abriendo los codos hacia los lados y aprieta la espalda alta. Aquí manda la técnica, no el peso: cuida y fortalece tus hombros.',muscleLabel:'Hombro posterior',ytQuery:'face pull polea cuerda tutorial'},
  {id:'e22',name:'Press Militar con Mancuernas',muscle:'hombros',type:'Compuesto',sets:4,reps:10,icon:'🤲',desc:'Empuje vertical con mancuernas para el deltoides; el recorrido libre cuida los hombros y exige más estabilidad que la barra. Sentado o de pie, sube ambas mancuernas coordinadas hasta casi juntarlas arriba, sin bloquear de golpe.',descSimple:'Sostén una mancuerna en cada mano a la altura del hombro y empuja ambas hacia arriba al mismo tiempo, sintiendo los hombros. Puedes hacerlo sentado (más estable) o de pie. Baja controlado.',muscleLabel:'Deltoides (hombros)',ytQuery:'press militar mancuernas sentado tutorial'},
  {id:'e23',name:'Press Militar en Máquina',muscle:'hombros',type:'Compuesto',sets:4,reps:10,icon:'🖥️',desc:'Press de hombro en máquina de trayectoria guiada: trabaja el deltoides con menor demanda de estabilización — ideal para principiantes o para cargar seguro. Empuja hasta casi extender y baja controlado.',descSimple:'Siéntate en la máquina con la espalda apoyada, agarra los manerales a la altura de los hombros y empuja hacia arriba. La máquina guía el movimiento, así que es fácil y segura. Baja lento.',muscleLabel:'Deltoides (hombros)',ytQuery:'press de hombros en máquina tutorial'},
  {id:'e53',name:'Elevaciones Frontales',muscle:'hombros',type:'Aislamiento',sets:3,reps:15,icon:'⬆️',desc:'Mancuerna o disco, sube al frente hasta la altura del hombro. Trabaja deltoides anterior.',descSimple:'Con la mancuerna colgando al frente, sube el brazo recto hasta la altura del hombro y baja controlado. Sin balanceo de cadera ni columpiar el peso: si necesitas impulso, baja la carga. Trabaja el hombro de adelante.',muscleLabel:'Hombro frontal',ytQuery:'elevaciones frontales hombros mancuerna tutorial'},
  {id:'e54',name:'Pájaro / Elevaciones Posteriores',muscle:'hombros',type:'Aislamiento',sets:4,reps:15,icon:'🦜',desc:'Inclinado al frente, abre los brazos hacia los lados. Trabaja deltoides posterior y romboides.',descSimple:'Inclínate hacia adelante con la espalda recta. Sube las mancuernas hacia los lados como abriendo las alas. Trabaja la parte trasera del hombro.',muscleLabel:'Hombro posterior',ytQuery:'pájaro elevaciones posteriores tutorial'},
  // ── BÍCEPS ──
  {id:'e9',name:'Curl de Bíceps con Barra',muscle:'biceps',type:'Aislamiento',sets:3,reps:12,icon:'🧲',desc:'Aislamiento básico de bíceps con barra (recta o EZ). Codos pegados al cuerpo y fijos: sube por flexión de codo contrayendo el bíceps y baja controlado en 2-3s. Sin balanceo del torso ni llevar los codos hacia adelante.',descSimple:'De pie con la barra, dobla los codos para subir el peso apretando el bíceps (parte delantera del brazo). Mantén los codos quietos pegados al cuerpo y baja lento. No uses impulso con la espalda.',muscleLabel:'Bíceps (parte delantera del brazo)',ytQuery:'curl con barra bíceps tutorial'},
  {id:'e10',name:'Curl Martillo con Mancuernas',muscle:'biceps',type:'Aislamiento',sets:3,reps:12,icon:'🎣',desc:'Curl con agarre neutro (martillo) que enfatiza el braquial y el braquiorradial (antebrazo) además del bíceps, dando grosor al brazo. Sube sin rotar la muñeca, codos fijos pegados al cuerpo.',descSimple:'Mancuernas con el agarre vertical (como sostener un martillo). Sube sin girar la muñeca, codos quietos. Trabaja el bíceps y también el antebrazo.',muscleLabel:'Bíceps y antebrazo',ytQuery:'curl martillo mancuernas tutorial'},
  {id:'e29',name:'Curl de Bíceps con Mancuernas',muscle:'biceps',type:'Aislamiento',sets:3,reps:12,icon:'🦾',desc:'Aislamiento de bíceps con mancuernas (alternado o simultáneo). Supina la muñeca al subir (gira el meñique hacia afuera) para la máxima contracción del bíceps. Codos fijos, sin balanceo.',descSimple:'Con una mancuerna en cada mano, dobla los codos subiendo el peso y gira un poco la muñeca al final para apretar el bíceps. Puedes alternar o subir las dos juntas. Codos quietos.',muscleLabel:'Bíceps',ytQuery:'curl bíceps mancuerna alternado tutorial'},
  {id:'e55',name:'Curl de Bíceps en Polea Baja',muscle:'biceps',type:'Aislamiento',sets:3,reps:15,icon:'〰️',desc:'Curl de bíceps en polea baja con tensión constante en todo el rango (sin punto muerto), ideal para buscar el pico del bíceps y series largas. Codos fijos pegados al cuerpo, contrae arriba y controla la bajada.',descSimple:'Polea a la altura del suelo. Dobla los codos jalando el agarre hacia arriba hasta apretar el bíceps. La polea mantiene tensión en todo el movimiento. Mantén los codos quietos.',muscleLabel:'Bíceps',ytQuery:'curl en polea baja bíceps tutorial'},
  {id:'e56',name:'Curl Scott / Predicador',muscle:'biceps',type:'Aislamiento',sets:3,reps:12,icon:'🪑',desc:'Curl en banco Scott (predicador): el apoyo del brazo elimina el impulso y aísla el bíceps, con énfasis en la cabeza corta y el estiramiento inicial. Extiende casi por completo abajo y controla la bajada (cuida el codo).',descSimple:'Siéntate en el banco con el cojín inclinado, apoya los brazos y dobla los codos subiendo el peso, apretando el bíceps. El apoyo evita que uses el cuerpo. Baja lento, sin soltar de golpe.',muscleLabel:'Bíceps',ytQuery:'curl scott predicador tutorial'},
  // ── TRÍCEPS ──
  {id:'e11',name:'Extensión de Tríceps con Cuerda en Polea',muscle:'triceps',type:'Aislamiento',sets:4,reps:15,icon:'📉',desc:'Aislamiento de tríceps con cuerda en polea alta, con énfasis en la cabeza lateral. Codos pegados al torso y completamente fijos: solo se mueve el antebrazo. En el bloqueo separa los extremos de la cuerda para apretar el tríceps. Sube controlando, sin que los codos se abran ni los hombros suban.',descSimple:'Parado frente a la polea alta, agarra la cuerda con las dos manos. Pega los codos a las costillas y, sin moverlos, estira los brazos hacia abajo hasta dejarlos rectos: ahí aprietas el tríceps (la parte de atrás del brazo). Sube despacio. Si los codos se van hacia adelante, baja el peso.',muscleLabel:'Tríceps (3 cabezas)',ytQuery:'extensión tríceps polea alta cuerda tutorial'},
  {id:'e12',name:'Press Francés con Barra Z (Skull Crushers)',muscle:'triceps',type:'Aislamiento',sets:3,reps:12,icon:'💀',desc:'Aislamiento de tríceps tumbado con barra EZ, fuerte en la cabeza larga. Brazos perpendiculares al suelo, codos apuntando al techo y fijos. Baja la barra hacia la frente flexionando solo el codo y extiende sin abrir los codos. Controla la bajada.',descSimple:'Acuéstate en el banco con la barra arriba. Mantén los codos apuntando al techo y quietos. Baja la barra hacia tu frente doblando solo los codos y sube extendiendo el tríceps (parte de atrás del brazo). Usa un peso que controles siempre.',muscleLabel:'Tríceps (cabeza larga)',ytQuery:'skull crushers tríceps cómo hacerlo'},
  {id:'e19',name:'Fondos en Paralelas (Tríceps)',muscle:'triceps',type:'Bodyweight',sets:3,reps:12,icon:'🤸',desc:'Compuesto de empuje vertical con peso corporal. Con el torso vertical el trabajo recae en el tríceps; inclinado hacia adelante reparte al pectoral inferior. Baja hasta ~90° de codo con los codos cerca del cuerpo. Evítalo si hay molestia en el hombro anterior.',descSimple:'Apóyate en las barras con los brazos estirados. Mantén el torso lo más vertical posible y baja doblando los codos hasta 90 grados; sube empujando con el tríceps. Si sientes molestia en el hombro, reduce el rango o evítalo.',muscleLabel:'Tríceps y pecho',ytQuery:'fondos en paralelas tríceps pecho tutorial'},
  {id:'e30',name:'Extensión de Tríceps sobre la Cabeza (Trasnuca)',muscle:'triceps',type:'Aislamiento',sets:3,reps:12,icon:'🙆',desc:'Aislamiento de tríceps por encima de la cabeza con mancuerna o barra EZ; el brazo elevado pone la cabeza larga en máximo estiramiento (su mejor estímulo). Codos arriba y fijos: baja el peso detrás de la nuca y extiende sin abrir los codos.',descSimple:'Sostén el peso sobre la cabeza con los brazos estirados. Baja doblando los codos detrás de la nuca hasta sentir estirar el tríceps; sube extendiendo. Mantén los codos quietos apuntando hacia arriba.',muscleLabel:'Tríceps (cabeza larga)',ytQuery:'extensión tríceps trasnuca mancuerna tutorial'},
  {id:'e31',name:'Extensión de Tríceps a una Mano en Polea',muscle:'triceps',type:'Aislamiento',sets:3,reps:12,icon:'☝️',desc:'Aislamiento unilateral de tríceps en polea alta (agarre de manija, palma arriba o neutra). Trabaja un brazo a la vez para corregir asimetrías. Codo pegado y fijo, extensión completa y contracción al final del recorrido.',descSimple:'Con un brazo a la vez, empuja hacia abajo la manija de la polea estirando el codo hasta apretar el tríceps. Mantén el codo pegado al cuerpo. Ideal para emparejar la fuerza de los dos brazos.',muscleLabel:'Tríceps',ytQuery:'extensión tríceps polea un brazo tutorial'},
  {id:'e57',name:'Press Francés con Mancuernas (Tríceps)',muscle:'triceps',type:'Aislamiento',sets:3,reps:12,icon:'🇫🇷',desc:'Aislamiento de tríceps tumbado con mancuernas; el agarre neutro cuida los codos y permite bajar a los lados de la cabeza para más rango. Codos fijos apuntando al techo, extiende controlado apretando el tríceps.',descSimple:'Acuéstate con una mancuerna en cada mano, brazos hacia el techo. Baja doblando los codos hasta los lados de la cabeza y sube extendiendo, apretando el tríceps. Mantén los codos quietos.',muscleLabel:'Tríceps',ytQuery:'press francés mancuernas tumbado tutorial'},
  // ── PIERNAS ──
  {id:'e13',name:'Sentadilla con Barra',muscle:'piernas',type:'Compuesto',sets:4,reps:8,icon:'🦵',desc:'Pies al ancho de hombros, baja hasta los 90° o más. La reina de las piernas.',descSimple:'Pies al ancho de los hombros con las puntas ligeramente abiertas. Baja como si te sentaras en una silla. La espalda recta y las rodillas deben ir en la misma dirección que apuntan los pies, nunca hacia adentro. Sube empujando el suelo.',muscleLabel:'Cuádriceps, glúteos y piernas',ytQuery:'sentadilla con barra cómo hacerla correctamente'},
  {id:'e14',name:'Peso Muerto Rumano',muscle:'piernas',type:'Compuesto',sets:3,reps:10,icon:'🔻',desc:'Espalda neutra, bisagra de cadera. Siente el estiramiento del femoral.',descSimple:'Con la barra en las manos, empuja las caderas hacia atrás manteniendo la barra pegada a las piernas. Las rodillas ligeramente dobladas. Baja hasta sentir el estiramiento en la parte trasera del muslo. Espalda recta en todo momento.',muscleLabel:'Femoral y glúteos',ytQuery:'peso muerto rumano tutorial cómo hacerlo'},
  {id:'e15',name:'Curl Femoral Tumbado',muscle:'piernas',type:'Aislamiento',sets:3,reps:15,icon:'🦿',desc:'Boca abajo en la máquina, dobla la rodilla contrayendo el femoral. Baja 3 segundos.',descSimple:'Boca abajo en la máquina, dobla las rodillas llevando los talones hacia las nalgas apretando el femoral. Baja muy lento, en unos 3 segundos, sin despegar la cadera del apoyo ni usar impulso.',muscleLabel:'Femoral (parte trasera del muslo)',ytQuery:'curl femoral tumbado máquina tutorial'},
  {id:'e16',name:'Elevación de Talones de Pie',muscle:'piernas',type:'Aislamiento',sets:4,reps:20,icon:'👟',desc:'Sube de puntillas, aguanta 1 segundo arriba, baja lento. Trabaja gastrocnemio.',descSimple:'Párate en el borde de un escalón con el peso en la punta del pie. Sube de puntillas lo más alto posible, aguanta 1 segundo arriba y baja despacio buscando el estiramiento completo de la pantorrilla.',muscleLabel:'Pantorrilla',ytQuery:'elevación de talones pantorrilla calf raise tutorial'},
  {id:'e33',name:'Sentadilla en Smith',muscle:'piernas',type:'Compuesto',sets:4,reps:10,icon:'🔩',desc:'Sentadilla en máquina Smith de trayectoria guiada para cuádriceps y glúteo; los pies un poco adelantados aumentan la profundidad y descargan la lumbar. Baja hasta muslos paralelos con las rodillas siguiendo la dirección de los pies.',descSimple:'Como la sentadilla normal pero en la máquina Smith, que guía la barra. Puedes poner los pies un poco adelante. Baja doblando las rodillas y empuja para subir, sintiendo cuádriceps y glúteo. Buena para principiantes.',muscleLabel:'Cuádriceps y glúteos',ytQuery:'sentadilla en smith máquina tutorial'},
  {id:'e35',name:'Desplantes / Zancada',muscle:'piernas',type:'Compuesto',sets:3,reps:12,icon:'👣',desc:'Un paso al frente, rodilla trasera al suelo. Cuádriceps, glúteo y equilibrio. Funciona con o sin peso — sin carga es el punto de partida correcto para principiantes.',descSimple:'Da un paso largo al frente y baja la rodilla trasera hacia el suelo. El torso permanece recto. La rodilla delantera apunta hacia el pie, no se desploma hacia adentro. Regresa y repite con la otra pierna.',muscleLabel:'Cuádriceps y glúteos',ytQuery:'zancada desplante piernas cómo hacerlo'},
  {id:'e36',name:'Prensa de Pierna',muscle:'piernas',type:'Compuesto',sets:4,reps:12,icon:'🦶',desc:'Empuje de piernas en prensa para cuádriceps y glúteo, con menos demanda técnica que la sentadilla libre. Pies al ancho de hombros; baja hasta ~90° de rodilla sin despegar la lumbar del respaldo y empuja sin bloquear de golpe.',descSimple:'Siéntate en la máquina con los pies en la plataforma al ancho de los hombros. Baja doblando las rodillas hacia el pecho y empuja para extender las piernas, sintiendo cuádriceps y glúteo. No despegues la espalda baja del asiento ni estires de golpe.',muscleLabel:'Cuádriceps y glúteos',ytQuery:'prensa de pierna máquina tutorial'},
  {id:'e37',name:'Extensión de Cuádriceps en Máquina',muscle:'piernas',type:'Aislamiento',sets:4,reps:15,icon:'⚙️',desc:'Sube hasta extensión completa, aguanta 1 segundo. Aísla el cuádricep.',descSimple:'Siéntate con la espalda apoyada y los rodillos sobre los tobillos. Extiende las piernas hasta estirarlas y aprieta el cuádriceps 1 segundo arriba; baja lento, sin soltar el peso de golpe.',muscleLabel:'Cuádriceps (frente del muslo)',ytQuery:'extensión cuádriceps máquina leg extension tutorial'},
  {id:'e39',name:'Curl Femoral de Pie en Máquina',muscle:'piernas',type:'Aislamiento',sets:3,reps:15,icon:'🦵',desc:'Un pie a la vez. Mayor rango y activación unilateral del femoral.',descSimple:'De pie y sujeto del apoyo, dobla una rodilla llevando el talón hacia atrás hasta apretar el femoral. Trabaja un pie a la vez y baja lento; no muevas la cadera ni uses impulso.',muscleLabel:'Femoral',ytQuery:'curl femoral de pie máquina standing leg curl tutorial'},
  {id:'e40',name:'Zancada Búlgara',muscle:'piernas',type:'Compuesto',sets:4,reps:10,icon:'🏔️',desc:'Pie trasero elevado, desciende hasta 90°. Altísima activación de glúteo y cuádricep.',descSimple:'Apoya el empeine del pie trasero en un banco. El pie delantero va suficientemente adelante para que al bajar, la rodilla delantera no pase de la punta del pie. Baja la rodilla trasera al suelo. Mantén el torso recto.',muscleLabel:'Glúteos y cuádriceps',ytQuery:'zancada búlgara split squat tutorial'},
  {id:'e41',name:'Step-up con Mancuernas',muscle:'piernas',type:'Funcional',sets:3,reps:12,icon:'🪜',desc:'Subida a cajón unilateral con mancuernas para cuádriceps y glúteo, con componente de equilibrio. Sube empujando desde el TALÓN de la pierna de arriba (sin impulsarte con la de abajo) y baja con control. Reps por pierna.',descSimple:'Con una mancuerna en cada mano, sube a un cajón o escalón firme pisando con un pie y empujando desde el talón, sin impulsarte con la pierna de abajo. Baja controlado y repite. Trabaja cuádriceps y glúteo. Cuenta las repeticiones por cada pierna.',muscleLabel:'Cuádriceps y glúteos',ytQuery:'step up con mancuernas tutorial'},
  {id:'e58',name:'Sentadilla Hack',muscle:'piernas',type:'Compuesto',sets:4,reps:10,icon:'⬇️',desc:'En máquina hack, pies adelantados para énfasis en cuádriceps. Rodillas siguen los pies.',descSimple:'En la máquina hack sentadilla. Pies un poco adelantados. Baja doblando las rodillas y empuja para subir. Las rodillas deben ir en la dirección de los pies.',muscleLabel:'Cuádriceps',ytQuery:'hack squat máquina tutorial'},
  {id:'e59',name:'Elevación de Talones Sentado',muscle:'piernas',type:'Aislamiento',sets:4,reps:20,icon:'🪑',desc:'Sentado en máquina, trabaja el sóleo. Complementa la elevación de pie.',descSimple:'Sentado en la máquina con las rodillas bajo los apoyos, sube los talones lo más alto posible con pausa de 1 segundo y baja lento estirando. Esta posición enfatiza el sóleo, el músculo más profundo de la pantorrilla.',muscleLabel:'Pantorrilla (sóleo)',ytQuery:'elevación de talones sentado máquina sóleo tutorial'},
  {id:'e70',name:'Sentadilla Goblet',muscle:'piernas',type:'Compuesto',sets:3,reps:'12',icon:'🥤',desc:'Sostén una mancuerna vertical frente al pecho. Pies al ancho de hombros. Baja profundo manteniendo el torso erguido. El mejor ejercicio para aprender la mecánica de sentadilla.',descSimple:'Sostén una mancuerna vertical frente a tu pecho con las dos manos. Pies separados al ancho de los hombros. Baja en sentadilla lo más profundo que puedas manteniendo la espalda recta y el pecho arriba. Ideal para aprender la mecánica correcta.',muscleLabel:'Cuádriceps, glúteos y core',ytQuery:'sentadilla goblet mancuerna tutorial principiantes'},
  // ── GLÚTEO ──
  {id:'e42',name:'Hip Thrust con Barra',muscle:'gluteo',type:'Compuesto',sets:4,reps:10,icon:'🍑',desc:'Espalda en banco, barra sobre caderas. Empuja al cielo contrayendo el glúteo al tope.',descSimple:'Espalda apoyada en el banco y la barra sobre las caderas (usa una almohadilla). Sube las caderas apretando el glúteo al máximo, sin arquear la espalda baja. Sostén 1 segundo arriba y baja lento.',muscleLabel:'Glúteos',ytQuery:'hip thrust barra glúteo tutorial cómo hacerlo'},
  {id:'e43',name:'Hip Thrust en Máquina',muscle:'gluteo',type:'Compuesto',sets:4,reps:12,icon:'🤖',desc:'Empuje de cadera en máquina para el glúteo mayor: versión guiada, más estable y fácil de cargar progresivamente que con barra. Sube hasta la extensión completa de cadera apretando el glúteo arriba, sin arquear la lumbar.',descSimple:'Igual al hip thrust con barra pero en la máquina. Más fácil de usar y muy seguro. Empuja las caderas hacia arriba apretando el glúteo al máximo y baja controlado.',muscleLabel:'Glúteos',ytQuery:'hip thrust máquina glúteo tutorial'},
  {id:'e44',name:'Patada de Glúteo en Polea',muscle:'gluteo',type:'Aislamiento',sets:4,reps:15,icon:'🦵',desc:'De pie, lleva la pierna hacia atrás extendida. Core activo y espalda neutra.',descSimple:'Con la polea en el tobillo e inclinado al frente apoyando las manos, lleva la pierna atrás extendida y aprieta el glúteo al tope. El movimiento sale de la cadera: mantén la espalda recta y no la arquees.',muscleLabel:'Glúteos',ytQuery:'patada de glúteo en polea cable kickback tutorial'},
  {id:'e45',name:'Abducción de Cadera en Máquina',muscle:'gluteo',type:'Aislamiento',sets:4,reps:15,icon:'🦋',desc:'Sentado, abre las piernas contra la resistencia. Glúteo medio y lateral.',descSimple:'Sentado en la máquina, empuja las piernas hacia afuera contra la resistencia y aprieta el glúteo medio al final. Inclínate un poco al frente para sentirlo más y regresa con control, sin que el peso te cierre de golpe.',muscleLabel:'Glúteo medio y lateral',ytQuery:'abducción cadera máquina glúteo medio tutorial'},
  {id:'e60',name:'Aducción de Cadera en Máquina',muscle:'gluteo',type:'Aislamiento',sets:4,reps:15,icon:'🫶',desc:'Sentado, cierra las piernas contra la resistencia. Trabaja el aductor y cara interna del muslo.',descSimple:'Siéntate en la máquina con las piernas abiertas sobre los soportes. Junta las piernas con control contra la resistencia, sintiendo la cara interna del muslo, y regresa despacio sin dejar que el peso te abra de golpe.',muscleLabel:'Cara interna del muslo',ytQuery:'aducción cadera máquina inner thigh tutorial'},
  {id:'e46',name:'Peso Muerto Piernas Rígidas',muscle:'gluteo',type:'Compuesto',sets:3,reps:10,icon:'🔱',desc:'Piernas casi rectas, desciende hasta sentir el estiramiento del femoral y glúteo. ⚠️ Contraindicado en ciatalgia, hernias discales L4-S1 e hiperlordosis marcada.',descSimple:'A diferencia del Peso Muerto Rumano, aquí las piernas van casi completamente rectas. Baja el peso frente a las piernas sintiendo el estiramiento máximo en la parte trasera del muslo. Usa poco peso — es muy exigente para la espalda baja. ⚠️ No recomendado si tienes dolor ciático, hernia de disco o mucha curva en la espalda baja.',muscleLabel:'Glúteos y femoral',ytQuery:'peso muerto piernas rígidas stiff leg deadlift tutorial'},
  {id:'e61',name:'Sentadilla Sumo',muscle:'gluteo',type:'Compuesto',sets:4,reps:10,icon:'🏆',desc:'Pies muy abiertos y puntas hacia afuera. Mayor activación del glúteo e interior de muslo.',descSimple:'Pies muy separados y apuntando hacia afuera. Baja en sentadilla. Trabaja más el glúteo y la cara interna del muslo que la sentadilla normal.',muscleLabel:'Glúteos y muslo interno',ytQuery:'sentadilla sumo glúteo tutorial'},
  {id:'e73',name:'Puente de Glúteo',muscle:'gluteo',type:'Bodyweight',sets:3,reps:'15',icon:'🌉',desc:'Tumbado boca arriba, pies apoyados. Sube las caderas apretando el glúteo al máximo. Versión sin carga del hip thrust, ideal para principiantes o activación.',descSimple:'Acuéstate boca arriba con las rodillas dobladas y los pies en el suelo. Sube las caderas apretando el glúteo al máximo. Aguanta 1 segundo arriba y baja lento. Sin barra ni equipos — perfecto para comenzar o calentar.',muscleLabel:'Glúteos',ytQuery:'puente de gluteo glute bridge tutorial'},
  // ── CORE ──
  {id:'e17',name:'Plancha Frontal',muscle:'core',type:'Isométrico',sets:3,reps:60,icon:'🟰',desc:'Isométrico de core completo: el recto abdominal y el transverso (la faja profunda) estabilizan, con apoyo de glúteo y lumbar. Cuerpo recto de cabeza a talones, sin que caiga ni suba la cadera; aprieta abdomen y glúteo. Reps = segundos.',descSimple:'Apoya los antebrazos y las puntas de los pies en el suelo. Mantén el cuerpo recto como una tabla, apretando abdomen y glúteo, sin dejar caer la cadera. Los "reps" son segundos que aguantas.',muscleLabel:'Core (abdomen profundo)',ytQuery:'plancha frontal abdominal cómo hacerla tutorial'},
  {id:'e18',name:'Crunch Abdominal',muscle:'core',type:'Bodyweight',sets:3,reps:20,icon:'〽️',desc:'Aislamiento del recto abdominal (la "tableta"). Sube solo los hombros del suelo enrollando la columna y exhalando; la zona lumbar queda apoyada. No tires del cuello con las manos ni uses impulso.',descSimple:'Acostado boca arriba con rodillas dobladas. Sube solo los hombros del suelo apretando el abdomen (el recto abdominal). No jales el cuello con las manos ni uses impulso. Baja lento.',muscleLabel:'Abdomen (recto abdominal)',ytQuery:'crunch abdominal cómo hacerlo correctamente'},
  {id:'e47',name:'Rueda Abdominal (Ab Wheel)',muscle:'core',type:'Bodyweight',sets:3,reps:10,icon:'⭕',desc:'Extiende la rueda hacia adelante manteniendo lumbar neutral. Regresa lento.',descSimple:'De rodillas, agarra la rueda. Ruédala hacia adelante solo hasta donde puedas mantener la espalda recta, sin que caiga el abdomen. Regresa lento. Empieza con poco rango y ve aumentando. No apto para principiantes sin base de core.',muscleLabel:'Abdomen y espalda baja',ytQuery:'rueda abdominal ab wheel tutorial'},
  {id:'e48',name:'Elevación de Piernas Colgado',muscle:'core',type:'Bodyweight',sets:3,reps:15,icon:'🧲',desc:'Colgado de barra, eleva las piernas rectas. Sin balanceo, control total.',descSimple:'Cuélgate de la barra. Sube las piernas controlado, sin balancearte. Si es muy difícil, empieza subiendo solo las rodillas al pecho. Baja lento.',muscleLabel:'Abdomen bajo',ytQuery:'elevación de piernas colgado barra abdomen tutorial'},
  {id:'e49',name:'Plancha Lateral',muscle:'core',type:'Isométrico',sets:3,reps:30,icon:'🎯',desc:'Apoyado en un codo, cuerpo recto lateral. Reps = segundos por lado. Oblicuos.',descSimple:'Apoya el antebrazo bajo el hombro y el canto del pie; sube la cadera hasta que el cuerpo quede recto de lado. Aprieta el oblicuo y no dejes caer la cintura. Los "reps" son segundos por cada lado.',muscleLabel:'Oblicuos y core',ytQuery:'plancha lateral oblicuos side plank tutorial'},
  {id:'e62',name:'Russian Twist',muscle:'core',type:'Bodyweight',sets:3,reps:20,icon:'🔁',desc:'Sentado en V, gira el tronco de lado a lado. Con o sin peso. Trabaja oblicuos.',descSimple:'Siéntate inclinado hacia atrás con las rodillas dobladas. Gira el torso de un lado al otro llevando las manos de lado a lado. Mantén la espalda recta, no redonda. Puedes apoyar los pies en el suelo si es muy difícil.',muscleLabel:'Oblicuos',ytQuery:'russian twist abdomen oblicuos tutorial'},
  {id:'e63',name:'Hollow Body',muscle:'core',type:'Isométrico',sets:3,reps:30,icon:'🌙',desc:'Tumbado, espalda pegada al suelo, piernas y brazos elevados. Reps = segundos. Core profundo.',descSimple:'Boca arriba, pega la lumbar al suelo y levanta brazos y piernas unos 15 cm. Mantén la posición sin que la espalda baja se despegue; si se levanta, sube un poco los brazos o las piernas. Los "reps" son segundos.',muscleLabel:'Core profundo',ytQuery:'hollow body position core gymnastics tutorial'},
  {id:'e72',name:'Dead Bug',muscle:'core',type:'Bodyweight',sets:3,reps:'10',icon:'🐛',desc:'Tumbado boca arriba, brazos al techo y piernas en 90°. Baja brazo y pierna opuestos manteniendo la lumbar pegada al suelo. Core profundo sin riesgo lumbar.',descSimple:'Acuéstate boca arriba. Sube los brazos al techo y dobla las rodillas a 90°. Pega la espalda baja al suelo. Baja el brazo derecho y la pierna izquierda a la vez sin despegar la espalda. Regresa y alterna. Lento y controlado.',muscleLabel:'Core profundo y estabilización',ytQuery:'dead bug ejercicio core tutorial'},
  // ── CARDIO ──
  {id:'e20',name:'Carrera / Caminata',muscle:'cardio',type:'Cardio',sets:1,reps:20,icon:'🏃',desc:'Reps = minutos. Mantén un ritmo constante y respira por la nariz.',descSimple:'Corre o camina en la cinta o al aire libre con la postura erguida y la pisada suave. Los "reps" son minutos. Busca un ritmo en el que puedas hablar entrecortado: ese es tu punto de cardio sostenible.',muscleLabel:'Cardio (corazón y piernas)',ytQuery:'cómo correr en cinta treadmill principiantes'},
  {id:'e64',name:'Bicicleta Estática',muscle:'cardio',type:'Cardio',sets:1,reps:20,icon:'🚴',desc:'Reps = minutos. Ideal como calentamiento o cardio de baja intensidad.',descSimple:'Ajusta el sillín para que la rodilla no se estire del todo abajo. Pedalea a una cadencia constante sin mecerte. Los "reps" son minutos: ideal para calentar o como cardio ligero sin impacto en las rodillas.',muscleLabel:'Cardio y piernas',ytQuery:'bicicleta estática cardio tutorial principiantes'},
  {id:'e65',name:'Remo Ergómetro',muscle:'cardio',type:'Cardio',sets:1,reps:10,icon:'🛶',desc:'Reps = minutos. Cardio de cuerpo completo. Empuja con las piernas primero.',descSimple:'En la máquina de remo el orden es piernas, tronco y brazos: empuja con las piernas, inclínate un poco atrás y jala a la barriga; regresa a la inversa. Los "reps" son minutos. Espalda firme, trabaja todo el cuerpo.',muscleLabel:'Cardio y cuerpo completo',ytQuery:'máquina de remo ergómetro cómo usar tutorial'},
  {id:'e66',name:'Salto a la Cuerda',muscle:'cardio',type:'Cardio',sets:3,reps:3,icon:'🪢',desc:'Reps = minutos por ronda. Excelente para coordinación y quema calórica.',descSimple:'Salta la cuerda con saltos bajos sobre la punta del pie; el giro sale de las muñecas, no de los brazos. Los "reps" son minutos por ronda: empieza lento, aterriza suave y sube la velocidad cuando el ritmo te salga natural.',muscleLabel:'Cardio y coordinación',ytQuery:'saltar cuerda jump rope tutorial principiantes'},
  {id:'e67',name:'Elíptica',muscle:'cardio',type:'Cardio',sets:1,reps:20,icon:'🔁',desc:'Reps = minutos. Sin impacto articular. Ideal para recuperación activa.',descSimple:'Pedalea erguido sin colgarte de los brazos, empujando con las piernas a una cadencia pareja. Los "reps" son minutos. Sin impacto en las rodillas: excelente para calentar o para días de recuperación activa.',muscleLabel:'Cardio (sin impacto)',ytQuery:'máquina elíptica cómo usarla correctamente'},
  {id:'e74',name:'HIIT / Intervalos',muscle:'cardio',type:'HIIT',sets:6,reps:'1',icon:'⚡',desc:'Alterna 20-40s de máximo esfuerzo con 20-40s de descanso. Más eficiente que el cardio de estado estable para quemar grasa. Reps = intervalos completos.',descSimple:'Alterna períodos de máximo esfuerzo (20-40 segundos) con períodos de descanso suave (20-40 segundos). Puedes hacerlo corriendo, en bici o saltando. Los "reps" son intervalos completos. Más efectivo que correr a ritmo constante para quemar grasa.',muscleLabel:'Cardio (quema de grasa)',ytQuery:'HIIT intervalos cardio tutorial principiantes'},
  // ── OTRO ──
  {id:'e68',name:'Peso Muerto Sumo',muscle:'otro',type:'Compuesto',sets:4,reps:6,icon:'🏋️',desc:'Pies muy abiertos, agarre entre las piernas. Mayor activación de aductores y glúteo.',descSimple:'Pies muy abiertos con las puntas apuntando hacia afuera. Agarra la barra entre las piernas. Espalda recta y pecho arriba. Empuja el suelo con los pies para levantarte. Las rodillas siguen la dirección de los pies.',muscleLabel:'Piernas, glúteos y espalda',ytQuery:'peso muerto sumo cómo hacerlo tutorial'},
  {id:'e69',name:'Clean & Press ⚠️ AVANZADO',muscle:'otro',type:'Funcional',sets:4,reps:6,icon:'⚡',desc:'Levantamiento olímpico básico. Potencia desde el suelo hasta sobre la cabeza. ⚠️ Requiere dominio técnico — no prescribir a principiantes sin supervisión directa.',descSimple:'Levanta la barra del suelo de manera explosiva hasta los hombros y luego empuja hacia arriba. Es un movimiento avanzado que requiere aprender la técnica antes de usar peso. Pide guía a tu coach antes de intentarlo. ⚠️ Solo para nivel intermedio-avanzado con supervisión.',muscleLabel:'Cuerpo completo',ytQuery:'clean and press levantamiento olímpico tutorial'},
  {id:'e75',name:'Burpees',muscle:'cardio',type:'Bodyweight',sets:3,reps:'8',icon:'🔥',desc:'De pie, lleva las manos al suelo, salta o camina los pies hacia atrás a posición de plancha, regresa los pies y salta vertical con palmas al cielo. Mantén la espalda neutra en la posición de plancha. Versión modificada para principiantes: reemplaza los saltos por pasos controlados.',descSimple:'Baja las manos al suelo, lleva los pies atrás (salta o da pasos si es tu primera vez), regresa los pies y salta arriba con los brazos al cielo. Descansa bien entre cada repetición — la calidad manda sobre la cantidad.',muscleLabel:'Cardio y cuerpo completo',ytQuery:'burpee modificado principiantes sin salto tutorial'},
  {id:'e76',name:'Saltos de Tijera',muscle:'cardio',type:'Bodyweight',sets:3,reps:'20',icon:'⭐',desc:'De pie, salta abriendo piernas más allá del ancho de hombros mientras subes los brazos al cielo. Regresa al centro coordinando brazos y piernas. Mantén un ritmo constante y aterriza suave sobre el mediopie, no sobre los talones.',descSimple:'Salta abriendo las piernas y subiendo los brazos al mismo tiempo, luego salta juntándolos de nuevo. Ritmo constante y aterrizaje suave. Ideal para calentar o como cardio ligero.',muscleLabel:'Cardio y coordinación',ytQuery:'saltos de tijera jumping jacks tutorial principiantes'},
  {id:'e77',name:'Flexiones en Pared',muscle:'pecho',type:'Bodyweight',sets:3,reps:'12',icon:'🧱',desc:'De pie a una distancia del brazo de la pared, manos a la altura del pecho. Dobla los codos a 45 grados del torso (no en T) acercando el pecho a la pared. Extiende empujando. Versión de menor carga del patrón de empuje horizontal, ideal para principiantes absolutos o rehabilitación.',descSimple:'Parado frente a la pared, apoya las manos a la altura del pecho. Dobla los codos acercándote a la pared y empuja de regreso. Cuerpo recto de cabeza a pies — no dejes caer la cadera.',muscleLabel:'Pecho, hombros y tríceps',ytQuery:'flexiones en pared wall push up principiantes tutorial'},
  {id:'e78',name:'Flexiones en Rodillas',muscle:'pecho',type:'Bodyweight',sets:3,reps:'10',icon:'🙏',desc:'Manos ligeramente más anchas que los hombros, rodillas apoyadas. Cuerpo recto de rodillas a cabeza — NO dejes caer la cadera. Dobla los codos a 45 grados del torso bajando el pecho al suelo. Paso previo a las flexiones completas.',descSimple:'Apoya las rodillas y las manos en el suelo. Mantén el cuerpo recto desde las rodillas hasta la cabeza y baja el pecho hacia el suelo doblando los codos. Sube empujando. Si la cadera cae o sube, es la señal de parar.',muscleLabel:'Pecho, hombros y tríceps',ytQuery:'flexiones en rodillas knee push up técnica correcta'},
  {id:'e79',name:'Fondos en Banco (Tríceps)',muscle:'triceps',type:'Bodyweight',sets:3,reps:'10',icon:'🪑',desc:'Empuje con peso corporal para tríceps, apoyado en un banco o silla firme. Rodillas dobladas a 90° y pies en el suelo. Baja flexionando el codo hasta 90° exactos — no más profundo. Codos apuntan hacia atrás, no se abren al lado. ⚠️ La versión con piernas extendidas aumenta mucho el riesgo en el hombro anterior.',descSimple:'Siéntate en el borde de una silla firme, apoya las manos en el borde y desliza las nalgas hacia adelante. Baja doblando los codos hasta 90 grados y sube empujando con el tríceps (parte de atrás del brazo). Rodillas dobladas, pies en el suelo. Si sientes molestia en el hombro, detente.',muscleLabel:'Tríceps y pecho inferior',ytQuery:'fondos en banco silla triceps sin lesionar hombro tutorial'},
  {id:'e80',name:'Sentadilla de Peso Corporal',muscle:'piernas',type:'Bodyweight',sets:3,reps:'15',icon:'🦵',desc:'Pies al ancho de hombros, puntas ligeramente abiertas. Baja llevando las caderas hacia atrás y abajo hasta que los muslos queden paralelos al suelo. Rodillas siguen la dirección de los pies en todo momento, nunca colapsan hacia adentro. Talón en el suelo. El patrón base antes de agregar cualquier carga.',descSimple:'Pies separados al ancho de tus hombros. Baja como si fueras a sentarte en una silla que está un poco lejos. La espalda recta, el pecho arriba y las rodillas apuntan hacia donde apuntan tus pies. Sube empujando el suelo con los talones.',muscleLabel:'Cuádriceps, glúteos y piernas',ytQuery:'sentadilla peso corporal air squat técnica perfecta principiantes'},
  {id:'e81',name:'Escaladores (Mountain Climbers)',muscle:'core',type:'Bodyweight',sets:3,reps:'20',icon:'🌀',desc:'Posición de plancha alta (manos en el suelo), lleva las rodillas alternadas hacia el pecho sin dejar caer ni elevar la cadera. La columna permanece neutra durante todo el movimiento. Reps = repeticiones totales (10 por pierna). Velocidad moderada antes de velocidad alta.',descSimple:'Apoya las manos en el suelo como en una flexión. Sin mover la cadera, lleva una rodilla hacia el pecho y regrésala, luego la otra. El cuerpo queda como una tabla que no se mueve excepto las piernas. Cuenta 1 repetición por cada pierna.',muscleLabel:'Core, cardio y cadera',ytQuery:'mountain climbers técnica correcta core tutorial'},
  {id:'e82',name:'Superman',muscle:'espalda',type:'Isométrico',sets:3,reps:'12',icon:'🦸',desc:'Boca abajo, brazos extendidos al frente. Eleva simultáneamente brazos y piernas del suelo contrayendo glúteos y erectores. Mantén 2 segundos arriba. La cabeza va en extensión natural de la columna — no elevar el cuello en hiperextensión. Versión unilateral (brazo y pierna opuestos) para principiantes absolutos.',descSimple:'Acuéstate boca abajo con los brazos extendidos al frente. Sube brazos y piernas del suelo al mismo tiempo apretando el glúteo. Aguanta 2 segundos y baja. La cabeza sigue el movimiento natural del cuerpo — no la fuerces hacia arriba.',muscleLabel:'Espalda baja y glúteos',ytQuery:'superman ejercicio espalda baja lumbar tutorial'},
  // ── PECHO (variantes) ──
  {id:'e83',name:'Lagartijas (Push-up)',muscle:'pecho',type:'Bodyweight',sets:3,reps:15,icon:'🤸',desc:'Posición de plancha alta, baja el pecho al suelo doblando los codos a 45°. Cuerpo recto de cabeza a talones. La versión completa del patrón de empuje.',descSimple:'Apoya las manos y las puntas de los pies. El cuerpo queda recto como una tabla. Baja el pecho al suelo doblando los codos en diagonal (no hacia los lados) y sube empujando. Si no puedes completo, apoya las rodillas.',muscleLabel:'Pecho, hombros y tríceps',ytQuery:'lagartijas push up técnica perfecta tutorial'},
  {id:'e84',name:'Press en Máquina Hammer (Pecho)',muscle:'pecho',type:'Compuesto',sets:4,reps:10,icon:'🔨',desc:'Máquina Hammer inclinada o plana. Empuja los agarres hacia adelante con el pecho. Ideal para progresar con carga con menos riesgo que la barra libre.',descSimple:'Siéntate con la espalda bien apoyada. Agarra las manijas a la altura del pecho y empuja hacia adelante hasta extender los brazos. Baja lento y controlado. Puedes usarla inclinada (pecho superior) o plana (pecho completo).',muscleLabel:'Pecho completo',ytQuery:'press pecho máquina hammer strength tutorial'},
  {id:'e85',name:'Aperturas en Polea Alta',muscle:'pecho',type:'Aislamiento',sets:3,reps:15,icon:'⬇️',desc:'Polea alta a ambos lados. Cruza los brazos de arriba hacia abajo y al frente. Énfasis en pecho inferior y medio por el ángulo de tracción.',descSimple:'Coloca las poleas arriba. De pie en el centro, jala ambos cables hacia abajo y al frente cruzando las manos. Los codos van ligeramente doblados. Siente la parte baja del pecho trabajar al juntar las manos.',muscleLabel:'Pecho inferior y medio',ytQuery:'aperturas en polea alta cable crossover pecho inferior tutorial'},
  {id:'e86',name:'Aperturas en Polea Baja',muscle:'pecho',type:'Aislamiento',sets:3,reps:15,icon:'⬆️',desc:'Polea baja a ambos lados. Sube los brazos hacia adelante y arriba. Énfasis en pecho superior (clavicular) por el ángulo de tracción ascendente.',descSimple:'Coloca las poleas abajo. De pie en el centro, jala los cables hacia arriba y al frente hasta la altura del pecho. Los codos van ligeramente doblados. Siente la parte alta del pecho (cerca de la clavícula) contraerse.',muscleLabel:'Pecho superior (clavicular)',ytQuery:'aperturas en polea baja cable crossover pecho superior tutorial'},
  // ── GLÚTEO (variantes de patada en polea) ──
  {id:'e87',name:'Patada Lateral en Polea',muscle:'gluteo',type:'Aislamiento',sets:4,reps:15,icon:'↔️',desc:'Polea en el tobillo. Lleva la pierna hacia el lado alejándola del cuerpo. Activa el glúteo medio, clave para la estabilidad de la cadera y la postura.',descSimple:'Con la polea en el tobillo, párate de lado a la máquina. Lleva la pierna hacia afuera separándola del cuerpo. Core activo y espalda recta. Regresa lento sin dejar caer el pie. Siente el costado del glúteo trabajar.',muscleLabel:'Glúteo medio y lateral',ytQuery:'patada lateral en polea glúteo medio cable hip abduction tutorial'},
  {id:'e88',name:'Patada en Polea Rodilla Doblada',muscle:'gluteo',type:'Aislamiento',sets:4,reps:15,icon:'🦵',desc:'Polea en el tobillo, rodilla doblada a 90°. Lleva el talón hacia el techo. Mayor aislamiento del glúteo mayor al eliminar la participación del femoral.',descSimple:'Con la polea en el tobillo, inclínate ligeramente hacia adelante apoyando las manos. Dobla la rodilla a 90° y lleva el talón hacia el techo apretando el glúteo al máximo. No muevas la cadera. Baja lento.',muscleLabel:'Glúteo mayor (aislamiento)',ytQuery:'patada polea rodilla doblada donkey kickback cable glúteo tutorial'},
  // ── Ejercicios Valery — Programa Femenino ──────────────────────────────────
  {id:'e89',name:'Clamshell con Banda (Concha)',muscle:'gluteo',type:'Aislamiento',sets:3,reps:20,icon:'🐚',desc:'Tumbada de lado con banda en las rodillas. Abre la rodilla superior como una almeja sin mover la cadera. Activa el glúteo medio — el estabilizador más descuidado.',descSimple:'Acuéstate de lado con las rodillas dobladas y la banda a la altura de las rodillas. Mantén los pies juntos y abre la rodilla de arriba hacia el techo lo que más puedas sin girar la cadera. Cierra lento. Vas a sentir el costado del glúteo trabajar — es exactamente lo que buscamos.',muscleLabel:'Glúteo medio',ytQuery:'clamshell con banda glúteo medio cómo hacerlo tutorial'},
  {id:'e90',name:'Fire Hydrant (Hidrante)',muscle:'gluteo',type:'Aislamiento',sets:3,reps:15,icon:'🚒',desc:'En cuatro apoyos, lleva la rodilla doblada hacia afuera y arriba. Sin equipos. Activa el glúteo medio y las rotadoras de cadera. Imprescindible en activación.',descSimple:'Apoya manos y rodillas en el suelo (posición de cuatro apoyos). Sin mover la cadera, lleva una rodilla doblada hacia afuera y arriba, como un perro marcando territorio. Baja lento sin dejar caer la cadera. Cuenta las repeticiones por cada lado.',muscleLabel:'Glúteo medio y rotadores de cadera',ytQuery:'fire hydrant ejercicio glúteo medio cuatro apoyos tutorial'},
  {id:'e91',name:'Frog Pump (Bomba de Rana)',muscle:'gluteo',type:'Aislamiento',sets:3,reps:20,icon:'🐸',desc:'Tumbada boca arriba, plantas de los pies juntas y rodillas abiertas. Sube las caderas apretando el glúteo. Aislamiento máximo del glúteo mayor sin cargar el femoral.',descSimple:'Acuéstate boca arriba y une las plantas de los pies con las rodillas abiertas hacia los lados (como una rana). Sube las caderas apretando el glúteo al máximo arriba. Baja sin llegar a tocar el suelo y repite. Vas a sentir una quema intensa en el glúteo — es lo normal.',muscleLabel:'Glúteo mayor',ytQuery:'frog pump glúteo ejercicio en suelo tutorial'},
  {id:'e92',name:'Hip Thrust Unilateral',muscle:'gluteo',type:'Compuesto',sets:3,reps:12,icon:'🍑',desc:'Hip thrust a una sola pierna. Espalda en banco, una pierna extendida, sube la cadera con el glúteo del lado de trabajo. Progresión avanzada del hip thrust convencional.',descSimple:'Igual que el hip thrust normal pero con una sola pierna en el suelo. Extiende la otra pierna hacia adelante. Sube la cadera apretando el glúteo del lado de la pierna apoyada. Es más difícil — usa primero solo el peso de tu cuerpo antes de agregar carga.',muscleLabel:'Glúteos (unilateral)',ytQuery:'hip thrust unilateral una pierna single leg glute bridge tutorial'},
  {id:'e93',name:'Sentadilla con Banda de Resistencia',muscle:'piernas',type:'Compuesto',sets:3,reps:15,icon:'🎀',desc:'Sentadilla con banda en las rodillas o muslos. La banda fuerza la activación del glúteo medio para evitar el valgo. Ideal para principiantes que aún no tienen la fuerza glútea necesaria.',descSimple:'Coloca una banda de resistencia a la altura de las rodillas o muslos. Haz la sentadilla empujando las rodillas hacia afuera contra la banda — esto activa el costado del glúteo. No dejes que las rodillas colapsen hacia adentro. Es más difícil de lo que parece.',muscleLabel:'Cuádriceps, glúteos y glúteo medio',ytQuery:'sentadilla con banda resistencia glúteo medio técnica tutorial'},
  {id:'e94',name:'Abducción de Cadera de Pie con Banda',muscle:'gluteo',type:'Aislamiento',sets:3,reps:15,icon:'🦋',desc:'De pie con banda en los tobillos o rodillas, lleva una pierna hacia afuera. Sin máquinas — ideal para entrenar en casa. Activa glúteo medio y menor.',descSimple:'Coloca la banda en los tobillos o justo encima de las rodillas. Párate en una pierna (apóyate en la pared si necesitas). Lleva la otra pierna hacia afuera separándola del cuerpo. Regresa lento sin dejar caer el pie. Siente el costado del glúteo trabajar.',muscleLabel:'Glúteo medio y menor',ytQuery:'abducción cadera de pie con banda resistencia glúteo tutorial'},
  {id:'e95',name:'Peso Muerto Rumano a Una Pierna',muscle:'piernas',type:'Compuesto',sets:3,reps:10,icon:'🦩',desc:'RDL unilateral con mancuerna. Bisagra de cadera sobre una pierna, el otro pie levantado atrás. Trabaja femoral, glúteo y equilibrio simultáneamente. Empieza sin peso.',descSimple:'Párate en una pierna con la mancuerna en la mano opuesta (mano derecha si apoyas en pie izquierdo). Inclínate hacia adelante desde la cadera dejando que la pierna libre suba hacia atrás, formando una T con el cuerpo. Siente el estiramiento en la parte de atrás del muslo. Regresa lento. Empieza sin peso hasta dominar el equilibrio.',muscleLabel:'Femoral y glúteos (unilateral)',ytQuery:'peso muerto rumano una pierna single leg RDL mancuerna tutorial'},
  {id:'e96',name:'Kickback con Banda (en Suelo)',muscle:'gluteo',type:'Aislamiento',sets:3,reps:15,icon:'🎯',desc:'En cuatro apoyos con banda en los pies, extiende una pierna hacia atrás apretando el glúteo al tope. Versión de suelo para entrenar en casa sin polea.',descSimple:'En cuatro apoyos (manos y rodillas en el suelo), coloca la banda alrededor de los pies. Extiende una pierna hacia atrás hasta que esté casi recta, apretando el glúteo al máximo. Baja lento sin dejar caer la rodilla al suelo. Cuenta las reps por cada lado. Para mayor dificultad, mantén 1 segundo arriba.',muscleLabel:'Glúteo mayor',ytQuery:'kickback con banda en suelo donkey kick resistencia glúteo tutorial'},
  // ── Ejercicios sin gym (peso corporal / banda) — borrador 2026-05-30, para revisión del coach. Ver docs/estilos-y-entornos.md ──
  {id:'e97',name:'Pike Push-up (Flexión Pica)',muscle:'hombros',type:'Bodyweight',sets:3,reps:10,icon:'🔻',env:['corporal','casa','parque','gym'],desc:'Flexión en V invertida (cadera alta), el peso recae sobre los hombros. Progresión hacia el press de hombro sin equipo.',descSimple:'Ponte en posición de flexión pero levanta la cadera formando una V o pico con el cuerpo. Baja la cabeza hacia el suelo doblando los codos, como si empujaras hacia arriba con los hombros. Cuanto más alta la cadera, más trabaja el hombro. Si es difícil, apoya las manos en una silla.',muscleLabel:'Hombros',ytQuery:'pike push up flexión pica hombros sin equipo tutorial'},
  {id:'e98',name:'Press de Hombro con Banda',muscle:'hombros',type:'Compuesto',track:'reps',sets:3,reps:12,icon:'🎗️',env:['casa','parque','gym'],desc:'Pisa la banda y empuja sobre la cabeza. Sustituye al press militar en casa. Resistencia progresiva sin carga axial.',descSimple:'Párate sobre el centro de la banda con los dos pies. Toma un extremo en cada mano a la altura de los hombros. Empuja las manos hacia arriba hasta estirar los brazos. Baja lento. Cuenta las repeticiones (no hay peso que anotar).',muscleLabel:'Hombros',ytQuery:'press de hombro con banda elástica de pie tutorial'},
  {id:'e99',name:'Elevaciones Laterales con Banda',muscle:'hombros',type:'Aislamiento',track:'reps',sets:3,reps:15,icon:'↔️',env:['casa','parque','gym'],desc:'Pisa la banda, sube los brazos a los lados hasta la altura del hombro. Versión en casa de las elevaciones laterales.',descSimple:'Párate sobre la banda con un pie. Toma los extremos y sube los brazos hacia los lados hasta la altura de los hombros, como abriendo alas. Baja despacio. No uses impulso. Cuenta las repeticiones.',muscleLabel:'Hombro lateral',ytQuery:'elevaciones laterales con banda elástica tutorial'},
  {id:'e100',name:'Face Pull con Banda',muscle:'hombros',type:'Aislamiento',track:'reps',sets:3,reps:15,icon:'🎯',env:['casa','parque','gym'],desc:'Banda anclada a la altura de la cara, tira hacia la frente abriendo codos. Salud del hombro y postura — ideal para quien trabaja sentado.',descSimple:'Engancha la banda a algo firme a la altura de tu cara (una manija, un poste). Toma un extremo en cada mano y jala hacia tu frente abriendo los codos hacia los lados. Aprieta la parte de atrás de los hombros. Excelente para la postura.',muscleLabel:'Hombro posterior y postura',ytQuery:'face pull con banda elástica postura hombro tutorial'},
  {id:'e101',name:'Curl de Bíceps con Banda',muscle:'biceps',type:'Aislamiento',track:'reps',sets:3,reps:15,icon:'🎗️',env:['casa','parque','gym'],desc:'Curl de bíceps con banda: tensión constante que aumenta al final del recorrido — versión en casa o parque del curl. Pisa la banda, codos pegados y fijos, flexiona apretando el bíceps y baja controlado.',descSimple:'Párate sobre la banda con los dos pies. Toma un extremo en cada mano con las palmas al frente. Dobla los codos subiendo las manos hacia los hombros y aprieta el bíceps. Mantén los codos pegados al cuerpo. Baja lento. Cuenta las repeticiones.',muscleLabel:'Bíceps',ytQuery:'curl de bíceps con banda elástica tutorial'},
  {id:'e102',name:'Curl Martillo con Banda',muscle:'biceps',type:'Aislamiento',track:'reps',sets:3,reps:15,icon:'🔨',env:['casa','parque','gym'],desc:'Curl martillo con banda (agarre neutro, pulgares arriba): suma el braquial y el antebrazo al bíceps. Tensión constante, codos fijos pegados al cuerpo.',descSimple:'Párate sobre la banda. Toma los extremos con las palmas mirándose entre sí (como sosteniendo un martillo). Sube doblando los codos sin girar las muñecas, apretando bíceps y antebrazo. Codos quietos. Cuenta las repeticiones.',muscleLabel:'Bíceps y antebrazo',ytQuery:'curl martillo con banda elástica tutorial'},
  {id:'e103',name:'Dominada Supina (Chin-up)',muscle:'biceps',type:'Bodyweight',sets:3,reps:8,icon:'🦅',env:['parque','gym'],desc:'Agarre supino (palmas hacia ti), sube el mentón sobre la barra. Máximo énfasis en bíceps junto a la espalda. Usa banda de asistencia si hace falta.',descSimple:'Cuélgate de una barra con las palmas mirando hacia ti y las manos al ancho de los hombros. Sube hasta que el mentón pase la barra, sintiendo trabajar bíceps y espalda. Baja lento. Si no puedes solo, pon una banda bajo los pies para que te ayude.',muscleLabel:'Bíceps y espalda',ytQuery:'dominada supina chin up bíceps desde cero tutorial'},
  {id:'e104',name:'Remo con Banda',muscle:'espalda',type:'Compuesto',track:'reps',sets:3,reps:12,icon:'🎗️',env:['casa','parque','gym'],desc:'Banda anclada al frente, tira los codos hacia atrás juntando los omóplatos. Sustituye al remo en casa.',descSimple:'Engancha la banda a algo firme al frente (o pásala por una puerta). Siéntate o párate y toma un extremo en cada mano. Tira llevando los codos hacia atrás, juntando los omóplatos como si apretaras un lápiz entre ellos. Regresa lento. Cuenta las repeticiones.',muscleLabel:'Espalda media',ytQuery:'remo con banda elástica espalda tutorial casa'},
  {id:'e105',name:'Extensión de Tríceps con Banda',muscle:'triceps',type:'Aislamiento',track:'reps',sets:3,reps:15,icon:'🎗️',env:['casa','parque','gym'],desc:'Aislamiento de tríceps con banda anclada en alto — versión en casa o parque de la extensión en polea. Codos pegados y fijos: extiende hacia abajo y controla la subida. La tensión es máxima al final del recorrido.',descSimple:'Engancha la banda en alto (una puerta, un poste). Toma el extremo con ambas manos y, con los codos pegados al cuerpo, estira los brazos hacia abajo apretando el tríceps. Sube lento sin mover los codos. Cuenta las repeticiones.',muscleLabel:'Tríceps',ytQuery:'extensión de tríceps con banda elástica tutorial'},
  {id:'e106',name:'Puente de Glúteo a Una Pierna',muscle:'gluteo',type:'Bodyweight',sets:3,reps:12,icon:'🌉',env:['corporal','casa','parque','gym'],desc:'Puente de glúteo con una sola pierna apoyada, la otra extendida. Mayor intensidad sin peso. Trabaja glúteo y corrige asimetrías.',descSimple:'Acuéstate boca arriba con una rodilla doblada y el pie en el suelo; estira la otra pierna al aire. Sube la cadera apretando el glúteo de la pierna apoyada, manteniendo la otra recta. Baja lento sin tocar el suelo. Cuenta las repeticiones por cada lado.',muscleLabel:'Glúteo mayor (unilateral)',ytQuery:'puente de glúteo a una pierna peso corporal tutorial'},
  {id:'e107',name:'Step-up a Peso Corporal',muscle:'piernas',type:'Funcional',track:'reps',sets:3,reps:12,icon:'📦',env:['corporal','casa','parque','gym'],desc:'Sube a un cajón/escalón firme con una pierna, controlando la bajada. Patrón funcional unilateral sin equipo.',descSimple:'Párate frente a un escalón o banco firme. Sube apoyando todo un pie y empujando con esa pierna hasta quedar de pie arriba. Baja despacio controlando. Trabaja una pierna a la vez. Cuenta las repeticiones por cada lado. Usa un escalón más bajo si te cuesta.',muscleLabel:'Cuádriceps y glúteo',ytQuery:'step up subida al cajón peso corporal tutorial'},
  {id:'e108',name:'Sentadilla a Una Pierna Asistida',muscle:'piernas',type:'Bodyweight',sets:3,reps:8,icon:'🦩',env:['corporal','casa','parque','gym'],desc:'Sentadilla unilateral sujetándose de un apoyo (marco de puerta, TRX). Progresión hacia la pistol. Fuerza y equilibrio sin carga.',descSimple:'Sujétate de un marco de puerta o algo firme con las manos. Párate en una pierna y baja como en una sentadilla, dejando la otra pierna al frente sin tocar el suelo. Usa los brazos solo lo necesario para ayudarte. Sube apretando la pierna. Cuenta las repeticiones por cada lado.',muscleLabel:'Cuádriceps, glúteo y equilibrio',ytQuery:'sentadilla a una pierna asistida pistol progresión tutorial'},
  {id:'e109',name:'Elevaciones Y-T-W en Suelo',muscle:'hombros',type:'Bodyweight',sets:3,reps:12,icon:'🅈',env:['corporal','casa','parque','gym'],desc:'Boca abajo, levanta los brazos formando Y, T y W. Fortalece hombro posterior y trapecio bajo — postura y salud del hombro sin equipo.',descSimple:'Acuéstate boca abajo. Levanta los brazos del suelo formando primero una Y (brazos arriba en diagonal), luego una T (brazos a los lados) y luego una W (codos doblados pegados al cuerpo). Aprieta la espalda alta en cada posición. Ideal para la postura y para cuidar los hombros.',muscleLabel:'Hombro posterior y postura',ytQuery:'elevaciones Y T W boca abajo postura hombro tutorial'},
  // ── EXPANSIÓN 2026-06-11 (e111–e136): huecos detectados por auditoría — trapecio, máquinas comunes, progresiones de principiante y unilaterales. Sin foto aún (fallback a ícono). ──
  {id:'e111',name:'Pec Deck (Máquina Contractora)',muscle:'pecho',type:'Aislamiento',sets:3,reps:12,icon:'🦋',env:['gym'],desc:'Aislamiento del pectoral mayor en máquina contractora: trayectoria guiada y tensión pareja, ideal para aprender a sentir el pecho sin estabilizar peso libre. Codos a la altura del pecho, junta los brazos al frente y aprieta 1 segundo; abre solo hasta un estiramiento cómodo del hombro.',descSimple:'Siéntate con la espalda apoyada y agarra los manerales con los codos a la altura del pecho. Junta los brazos al frente apretando el pecho 1 segundo y abre despacio, sin dejar que el peso te jale de golpe. No abras más allá de donde el hombro se sienta cómodo.',muscleLabel:'Pecho (pectoral mayor)',ytQuery:'pec deck máquina contractora pecho tutorial'},
  {id:'e112',name:'Aperturas con Mancuernas en Banco',muscle:'pecho',type:'Aislamiento',sets:3,reps:12,icon:'🪽',env:['casa','gym'],desc:'Aislamiento del pectoral mayor con mancuernas en banco plano, con énfasis en el estiramiento. Codos ligeramente flexionados y FIJOS: abre en arco hasta sentir estirar el pecho (sin pasar la línea del torso) y cierra como abrazando. No es un press: el codo no se dobla más al subir.',descSimple:'Acuéstate en el banco con una mancuerna en cada mano sobre el pecho. Con los codos un poco doblados y quietos, abre los brazos en arco hasta sentir el estiramiento del pecho y ciérralos como si abrazaras a alguien. Usa menos peso del que crees: aquí manda el estiramiento, no la carga.',muscleLabel:'Pecho (pectoral mayor)',ytQuery:'aperturas con mancuernas banco plano pecho tutorial'},
  {id:'e113',name:'Flexiones Inclinadas (Manos Elevadas)',muscle:'pecho',type:'Bodyweight',track:'reps',sets:3,reps:12,icon:'📐',env:['corporal','casa','parque','gym'],desc:'Flexión con las manos sobre un apoyo elevado (banco, mesa, baranda): el ángulo reduce la carga y es el puente perfecto entre las flexiones en pared y las del suelo. Cuerpo recto de cabeza a talones, baja el pecho al borde del apoyo y empuja.',descSimple:'Apoya las manos en un banco, mesa o baranda firme, con el cuerpo recto como una tabla. Baja el pecho hacia el apoyo doblando los codos y empuja para subir. Mientras más alto el apoyo, más fácil. Cuando logres 15 repeticiones fáciles, busca un apoyo más bajo.',muscleLabel:'Pecho, hombros y tríceps',ytQuery:'flexiones inclinadas manos elevadas principiantes tutorial'},
  {id:'e114',name:'Remo Sentado en Máquina',muscle:'espalda',type:'Compuesto',sets:4,reps:12,icon:'🚣',env:['gym'],desc:'Remo horizontal en máquina con apoyo de pecho: aísla el jalón de la espalda media (romboides y dorsal) eliminando el trabajo de la lumbar — ideal para principiantes o para series pesadas seguras. Tira llevando los codos atrás y aprieta las escápulas al final.',descSimple:'Siéntate con el pecho apoyado en el cojín y agarra los manerales. Tira hacia ti llevando los codos hacia atrás y aprieta los omóplatos como si quisieras juntar ambos codos detrás de la espalda. Regresa despacio sin soltar el peso de golpe. El pecho no se despega del apoyo.',muscleLabel:'Espalda media y dorsal',ytQuery:'remo sentado en máquina espalda tutorial'},
  {id:'e115',name:'Encogimientos con Mancuernas',muscle:'espalda',type:'Aislamiento',sets:3,reps:15,icon:'🤷',env:['casa','gym'],desc:'Aislamiento del trapecio superior: con mancuernas a los lados, encoge los hombros hacia las orejas en vertical, pausa de 1 segundo arriba y baja estirando. Sin girar los hombros en círculo (no aporta y castiga la articulación) ni doblar los codos.',descSimple:'De pie con una mancuerna en cada mano a los lados del cuerpo, sube los hombros hacia las orejas lo más alto que puedas, aguanta 1 segundo y baja despacio. Los brazos quedan rectos todo el tiempo: solo se mueven los hombros, sin hacer círculos.',muscleLabel:'Trapecio (cuello-hombro)',ytQuery:'encogimientos de hombros con mancuernas trapecio tutorial'},
  {id:'e116',name:'Hiperextensiones en Banco Romano',muscle:'espalda',type:'Compuesto',sets:3,reps:12,icon:'🛋️',env:['gym'],desc:'Extensión de cadera y columna en banco 45° para la cadena posterior: erectores lumbares, glúteo y femoral. Baja con la espalda neutra hasta donde el femoral lo permita y sube hasta la línea del cuerpo SIN hiperextender arriba. Cruza los brazos al pecho; agrega disco solo con técnica dominada.',descSimple:'Acomódate en el banco inclinado con los muslos en el cojín y los pies fijos. Cruza los brazos sobre el pecho, baja el torso controlado manteniendo la espalda recta y sube apretando glúteo y espalda baja hasta quedar en línea recta, sin pasar de ahí ni arquearte de más arriba.',muscleLabel:'Espalda baja, glúteo y femoral',ytQuery:'hiperextensiones banco romano 45 grados tutorial'},
  {id:'e117',name:'Elevaciones Laterales en Polea',muscle:'hombros',type:'Aislamiento',sets:3,reps:15,icon:'📡',env:['gym'],desc:'Aislamiento del deltoides medio en polea baja: a diferencia de la mancuerna, la tensión es constante también abajo, donde más crece el estímulo. De lado a la polea, sube el brazo liderando con el codo hasta la altura del hombro y baja en 2-3 segundos.',descSimple:'Párate de lado a la polea baja y toma la manija con la mano más lejana (el cable cruza por delante del cuerpo). Sube el brazo hacia el lado hasta la altura del hombro guiando con el codo y baja despacio. La polea hace que el hombro trabaje durante todo el recorrido.',muscleLabel:'Hombro lateral (deltoides medio)',ytQuery:'elevaciones laterales en polea baja hombro tutorial'},
  {id:'e118',name:'Press Arnold con Mancuernas',muscle:'hombros',type:'Compuesto',sets:3,reps:10,icon:'🌀',env:['casa','gym'],desc:'Press de hombro con rotación: arranca con las palmas mirando hacia ti a la altura del pecho y termina arriba con las palmas al frente. La rotación recorre las tres cabezas del deltoides con énfasis en la anterior. Hazlo sentado y controlado; no es para cargas máximas.',descSimple:'Sentado, sostén las mancuernas frente al pecho con las palmas mirando hacia ti. Empuja hacia arriba girando las muñecas, de modo que arriba las palmas miren al frente. Baja deshaciendo el giro, despacio. Usa menos peso que en el press normal: el giro es lo que trabaja.',muscleLabel:'Deltoides (las 3 cabezas)',ytQuery:'press arnold con mancuernas hombro tutorial'},
  {id:'e119',name:'Posteriores en Máquina (Pec Deck Inverso)',muscle:'hombros',type:'Aislamiento',sets:3,reps:15,icon:'🔄',env:['gym'],desc:'Aislamiento del deltoides posterior y romboides en la máquina contractora usada al revés (de frente al respaldo). Abre los brazos hacia atrás en arco con los codos casi rectos y fijos, pausa atrás y regresa controlado. Complemento clave del press para el equilibrio del hombro.',descSimple:'Siéntate de frente al respaldo de la máquina contractora y agarra los manerales con los brazos extendidos al frente. Abre los brazos hacia atrás como si quisieras juntar los omóplatos, aguanta 1 segundo y regresa despacio. Trabaja la parte de atrás del hombro, la que casi nadie entrena.',muscleLabel:'Hombro posterior',ytQuery:'pec deck inverso posteriores máquina tutorial'},
  {id:'e120',name:'Curl Concentrado con Mancuerna',muscle:'biceps',type:'Aislamiento',sets:3,reps:12,icon:'🎯',env:['casa','gym'],desc:'Aislamiento estricto del bíceps: sentado, el codo apoyado contra la cara interna del muslo elimina todo impulso. Sube contrayendo el pico del bíceps, pausa arriba y baja en 2-3 segundos hasta extender. Un brazo a la vez — perfecto para corregir asimetrías.',descSimple:'Siéntate con las piernas abiertas y apoya el codo contra la parte interna del muslo. Sube la mancuerna doblando el codo y apretando el bíceps, aguanta arriba y baja despacio hasta estirar el brazo. El codo nunca se despega del muslo. Un brazo a la vez.',muscleLabel:'Bíceps (pico)',ytQuery:'curl concentrado mancuerna bíceps tutorial'},
  {id:'e121',name:'Curl en Banco Inclinado con Mancuernas',muscle:'biceps',type:'Aislamiento',sets:3,reps:10,icon:'🛗',env:['gym'],desc:'Curl en banco inclinado (45-60°): con los brazos colgando detrás del torso, el bíceps (cabeza larga) trabaja desde su máximo estiramiento — uno de los mejores estímulos de crecimiento. Codos quietos apuntando al suelo; sube sin encoger los hombros y baja hasta estirar del todo.',descSimple:'Recuéstate en un banco inclinado con una mancuerna en cada mano y deja los brazos colgar hacia atrás. Sube doblando solo los codos, sin mover los hombros, y baja muy despacio hasta sentir el estiramiento del bíceps. Usa menos peso que en el curl normal: el estiramiento es la clave.',muscleLabel:'Bíceps (cabeza larga)',ytQuery:'curl inclinado en banco mancuernas bíceps tutorial'},
  {id:'e122',name:'Patada de Tríceps con Mancuerna (Kickback)',muscle:'triceps',type:'Aislamiento',sets:3,reps:15,icon:'🦵',env:['casa','gym'],desc:'Aislamiento de tríceps con el codo elevado: torso inclinado, brazo paralelo al suelo y FIJO; extiende el antebrazo hacia atrás hasta bloquear apretando el tríceps. En esa posición la contracción final es máxima. Si el codo cae, se pierde el ejercicio: usa poco peso.',descSimple:'Inclínate hacia adelante con la espalda recta (puedes apoyar una mano en un banco). Sube el codo hasta que el brazo quede paralelo al suelo y, sin moverlo de ahí, estira el antebrazo hacia atrás apretando el tríceps. Regresa despacio. Si necesitas balancearte, baja el peso.',muscleLabel:'Tríceps',ytQuery:'patada de tríceps kickback mancuerna tutorial'},
  {id:'e123',name:'Flexiones Diamante',muscle:'triceps',type:'Bodyweight',track:'reps',sets:3,reps:10,icon:'💎',env:['corporal','casa','parque','gym'],desc:'Flexión con las manos juntas bajo el pecho (índices y pulgares formando un diamante): el agarre cerrado carga el tríceps y el pecho interno. Codos pegados al cuerpo al bajar. Exigente — domina antes las lagartijas normales. Molestia en muñecas: separa un poco las manos.',descSimple:'Ponte en posición de lagartija pero con las manos juntas debajo del pecho, formando un diamante con los dedos. Baja con los codos pegados al cuerpo y empuja para subir, sintiendo la parte de atrás del brazo. Si aún no dominas las lagartijas normales, empieza por esas.',muscleLabel:'Tríceps y pecho interno',ytQuery:'flexiones diamante tríceps tutorial'},
  {id:'e124',name:'Zancada Inversa',muscle:'piernas',type:'Compuesto',sets:3,reps:12,icon:'↩️',env:['corporal','casa','parque','gym'],desc:'Zancada dando el paso hacia ATRÁS: el mismo trabajo de cuádriceps y glúteo que la zancada al frente pero con menos estrés en la rodilla delantera — la opción correcta para rodillas sensibles o principiantes. Torso erguido, baja la rodilla trasera y empuja con el talón delantero para volver.',descSimple:'De pie, da un paso largo hacia atrás y baja la rodilla de atrás hacia el suelo, manteniendo el torso recto. Empuja con el talón de la pierna de adelante para volver a ponerte de pie. Más amable con las rodillas que la zancada hacia adelante. Cuenta las repeticiones por cada lado.',muscleLabel:'Cuádriceps y glúteos',ytQuery:'zancada inversa hacia atrás técnica tutorial'},
  {id:'e125',name:'Zancada Caminando con Mancuernas',muscle:'piernas',type:'Compuesto',sets:3,reps:10,icon:'🚶',env:['casa','parque','gym'],desc:'Zancadas avanzando en línea con mancuernas: cada paso es una repetición que encadena cuádriceps, glúteo y estabilidad. Paso largo, rodilla trasera cerca del suelo y torso erguido; empuja con el talón delantero para enlazar el siguiente paso. Reps por pierna.',descSimple:'Con una mancuerna en cada mano, da un paso largo al frente, baja la rodilla trasera hacia el suelo y, al subir, encadena el paso con la otra pierna avanzando. El torso siempre recto y las rodillas en la dirección de los pies. Cuenta las repeticiones por cada pierna.',muscleLabel:'Cuádriceps, glúteos y estabilidad',ytQuery:'zancada caminando con mancuernas walking lunge tutorial'},
  {id:'e126',name:'Curl Femoral Sentado en Máquina',muscle:'piernas',type:'Aislamiento',sets:3,reps:12,icon:'💺',env:['gym'],desc:'Aislamiento del femoral sentado: con la cadera flexionada el femoral parte más estirado que en la versión tumbada, lo que da un estímulo de crecimiento superior. Espalda pegada al respaldo, dobla las rodillas llevando los talones abajo-atrás y regresa en 3 segundos sin soltar.',descSimple:'Siéntate con la espalda bien pegada al respaldo y las piernas sobre el rodillo. Dobla las rodillas llevando los talones hacia abajo y atrás, apretando la parte trasera del muslo, y regresa muy despacio. No despegues la cadera del asiento al hacer fuerza.',muscleLabel:'Femoral (parte trasera del muslo)',ytQuery:'curl femoral sentado en máquina tutorial'},
  {id:'e127',name:'Sentadilla Frontal con Barra',muscle:'piernas',type:'Compuesto',sets:4,reps:8,icon:'🏆',env:['gym'],desc:'Sentadilla con la barra al frente sobre los deltoides (agarre limpio o de brazos cruzados): el torso queda más vertical, el cuádriceps domina y la lumbar sufre menos que en la trasera — pero exige movilidad de muñeca/hombro y un core fuerte. Codos ALTOS todo el recorrido. Para nivel intermedio.',descSimple:'Apoya la barra al frente, sobre los hombros, con los codos apuntando hacia adelante y bien altos. Baja en sentadilla manteniendo el torso lo más vertical posible y sube empujando el suelo. Si los codos caen, la barra se rueda: empieza con poco peso hasta dominar la posición.',muscleLabel:'Cuádriceps y core',ytQuery:'sentadilla frontal con barra front squat tutorial'},
  {id:'e128',name:'Sentadilla Isométrica en Pared (Wall Sit)',muscle:'piernas',type:'Isométrico',sets:3,reps:45,icon:'🧱',env:['corporal','casa','parque','gym'],desc:'Isométrico de cuádriceps: espalda plana contra la pared, muslos paralelos al suelo y rodillas a 90° sobre los tobillos. Aguanta la posición respirando normal. Reps = segundos. Sin equipo, rodilla-amigable y perfecto para finalizar pierna o entrenar en casa.',descSimple:'Apoya toda la espalda en una pared y baja deslizándote hasta que los muslos queden paralelos al suelo, como sentado en una silla invisible. Aguanta ahí respirando normal, sin apoyar las manos en las piernas. Los "reps" son segundos. Quema, pero es muy seguro.',muscleLabel:'Cuádriceps',ytQuery:'sentadilla isométrica en la pared wall sit tutorial'},
  {id:'e129',name:'Paseo Lateral con Banda',muscle:'gluteo',type:'Aislamiento',track:'reps',sets:3,reps:12,icon:'🦀',env:['casa','parque','gym'],desc:'Pasos laterales con banda sobre las rodillas o tobillos en media sentadilla: enciende el glúteo medio, el estabilizador de la cadera que protege las rodillas en sentadillas y zancadas. Mantén tensión constante en la banda (los pies nunca se juntan del todo) y la cadera baja. Reps = pasos por lado.',descSimple:'Ponte una banda alrededor de las piernas (arriba de las rodillas), baja a media sentadilla y da pasos hacia un lado sin que los pies se junten del todo, manteniendo la banda siempre estirada. Da los pasos hacia un lado y luego regresa. Sentirás arder el costado de la cadera: ese es el músculo que cuida tus rodillas.',muscleLabel:'Glúteo medio (estabilidad de cadera)',ytQuery:'paseo lateral con banda glúteo medio tutorial'},
  {id:'e130',name:'Patada de Glúteo en Cuadrupedia',muscle:'gluteo',type:'Bodyweight',track:'reps',sets:3,reps:15,icon:'🐴',env:['corporal','casa','parque','gym'],desc:'En cuatro apoyos, extiende la cadera llevando el talón al techo con la rodilla doblada a 90°: aislamiento clásico del glúteo mayor sin equipo. El movimiento sale de la CADERA, no de arquear la lumbar — el core va apretado y el rango termina donde la espalda se mantiene neutra.',descSimple:'Ponte en el suelo sobre manos y rodillas. Con la rodilla doblada, sube una pierna llevando el talón hacia el techo y aprieta el glúteo arriba 1 segundo. Baja sin tocar el suelo y repite. No arquees la espalda baja para subir más: el movimiento es de la cadera. Cuenta las repeticiones por cada lado.',muscleLabel:'Glúteo mayor',ytQuery:'patada de glúteo en cuatro apoyos donkey kick tutorial'},
  {id:'e131',name:'Crunch en Polea Alta',muscle:'core',type:'Aislamiento',sets:3,reps:15,icon:'🙇',env:['gym'],desc:'Crunch arrodillado frente a la polea alta con cuerda: el único crunch fácil de PROGRESAR con carga. La cadera queda fija; flexiona la columna llevando los codos hacia los muslos con el abdomen, no jalando con los brazos. Regresa controlado hasta estirar el abdomen.',descSimple:'Arrodíllate frente a la polea alta sosteniendo la cuerda a los lados de la cabeza. Enróllate hacia abajo llevando los codos hacia los muslos, apretando el abdomen como si quisieras juntar las costillas con la cadera. Regresa despacio. Los brazos solo sostienen: el que jala es el abdomen.',muscleLabel:'Abdomen (recto abdominal)',ytQuery:'crunch en polea alta abdominales con cuerda tutorial'},
  {id:'e132',name:'Elevación de Piernas Tumbado',muscle:'core',type:'Bodyweight',track:'reps',sets:3,reps:12,icon:'🛏️',env:['corporal','casa','parque','gym'],desc:'Elevación de piernas acostado para el abdomen bajo: la progresión accesible antes de la versión colgado. La clave es la LUMBAR pegada al suelo todo el tiempo; si se despega al bajar las piernas, dobla las rodillas o reduce el rango. Manos bajo la cadera ayudan al inicio.',descSimple:'Acuéstate boca arriba con las manos bajo la cadera y la espalda baja pegada al suelo. Sube las piernas casi rectas hasta la vertical y bájalas despacio sin que la espalda baja se despegue del piso. Si se despega, dobla un poco las rodillas. Mucho más accesible que la versión colgado de la barra.',muscleLabel:'Abdomen bajo',ytQuery:'elevación de piernas acostado abdomen bajo tutorial'},
  {id:'e133',name:'Press Pallof con Banda',muscle:'core',type:'Funcional',track:'reps',sets:3,reps:10,icon:'🛡️',env:['casa','parque','gym'],desc:'Anti-rotación: con la banda anclada al costado, extiende los brazos al frente y RESISTE el giro que la banda intenta provocar. Entrena la función real del core (estabilizar la columna), transfiere a sentadillas y pesos muertos y es seguro para espaldas sensibles. Reps por lado, con pausa de 2-3s extendido.',descSimple:'Engancha la banda a un poste a la altura del pecho y párate de lado, sosteniéndola con las dos manos al pecho. Estira los brazos al frente y aguanta 2-3 segundos sin dejar que la banda te gire el cuerpo; regresa las manos al pecho. El abdomen trabaja quieto, resistiendo. Cuenta las repeticiones por cada lado.',muscleLabel:'Core (anti-rotación)',ytQuery:'press pallof con banda core tutorial'},
  {id:'e134',name:'Bird Dog (Perro de Caza)',muscle:'core',type:'Bodyweight',track:'reps',sets:3,reps:10,icon:'🐕',env:['corporal','casa','parque','gym'],desc:'En cuadrupedia, extiende a la vez el brazo y la pierna contrarios manteniendo la cadera y la lumbar inmóviles: estabilidad de core y coordinación, el complemento de pie del dead bug. Imagina un vaso de agua apoyado en la espalda baja — que no se derrame. Pausa de 2s extendido; reps por lado.',descSimple:'Ponte sobre manos y rodillas con la espalda plana. Estira al mismo tiempo un brazo al frente y la pierna contraria hacia atrás, sin que la cadera se ladee ni la espalda se mueva. Aguanta 2 segundos y cambia de lado. Imagina que llevas un vaso de agua apoyado en la espalda: que no se caiga.',muscleLabel:'Core y espalda baja (estabilidad)',ytQuery:'bird dog ejercicio core estabilidad tutorial'},
  {id:'e135',name:'Escaladora (Stair Climber)',muscle:'cardio',type:'Cardio',sets:1,reps:15,icon:'🪜',env:['gym'],desc:'Reps = minutos. Cardio en máquina de escaleras: mayor gasto que caminar y trabajo extra de glúteo y pierna, con bajo impacto. Pisa el escalón COMPLETO con el cuerpo erguido y las manos apenas apoyadas — colgarse de las barandas le quita la mitad del trabajo.',descSimple:'Sube a la escaladora y camina los escalones pisando con todo el pie, con el cuerpo derecho. Apoya las manos solo para equilibrarte, sin descargar el peso en las barandas. Los "reps" son minutos. Quema bastante y además trabaja glúteos y piernas.',muscleLabel:'Cardio, glúteos y piernas',ytQuery:'escaladora stair climber cómo usarla tutorial'},
  {id:'e136',name:'Caminata del Granjero (Farmers Walk)',muscle:'otro',type:'Funcional',sets:3,reps:40,icon:'🧳',env:['casa','parque','gym'],desc:'Carga pesada en cada mano y camina erguido: fuerza de agarre, trapecio, core y postura bajo carga real — el ejercicio funcional más transferible a la vida diaria. Hombros atrás, pasos cortos y firmes, sin ladearse. Reps = pasos (o metros). Que el agarre sea el límite, no la postura.',descSimple:'Toma una mancuerna o pesa en cada mano, ponte derecho con los hombros atrás y camina dando pasos cortos y firmes, sin inclinarte a ningún lado. Los "reps" son pasos. Suelta el peso cuando ya no puedas mantener la postura, no cuando se te abran las manos. Trabaja agarre, abdomen y postura a la vez.',muscleLabel:'Agarre, core y cuerpo completo',ytQuery:'caminata del granjero farmers walk tutorial'},
  // ── EXPANSIÓN 2 · 2026-06-11 (e137–e140): huecos confirmados al cruzar con bibliografía de musculación — pullover con mancuerna, salud de hombro (rotadores) y antebrazo (no existía). ──
  {id:'e137',name:'Pullover con Mancuerna en Banco',muscle:'espalda',type:'Aislamiento',sets:3,reps:12,icon:'🌉',env:['casa','gym'],desc:'Clásico de tracción con una sola mancuerna tumbado en banco: lleva el peso por detrás de la cabeza en arco y regresa sobre el pecho. Trabaja dorsal ancho y serrato con apoyo del pectoral, y expande la caja torácica en el estiramiento. Codos casi rectos y fijos; baja solo hasta un estiramiento cómodo del hombro.',descSimple:'Acuéstate en el banco sosteniendo UNA mancuerna con las dos manos sobre el pecho. Con los brazos casi rectos, llévala en arco por detrás de la cabeza hasta sentir el estiramiento de la espalda y el pecho, y regresa al inicio. Agarra firme la mancuerna por dentro del disco de arriba y no bajes más de donde el hombro se sienta cómodo.',muscleLabel:'Dorsal, serrato y pecho',ytQuery:'pullover con mancuerna en banco tutorial'},
  {id:'e138',name:'Rotación Externa con Banda',muscle:'hombros',type:'Aislamiento',track:'reps',sets:3,reps:15,icon:'🧷',env:['casa','parque','gym'],desc:'Trabajo directo del manguito rotador (infraespinoso y redondo menor), los estabilizadores que protegen el hombro en todos los presses. Codo pegado al cuerpo a 90°: gira el antebrazo hacia afuera contra la banda y regresa lento. Carga MUY ligera y técnica estricta — es prevención, no ego. Ideal en el calentamiento de empuje.',descSimple:'Engancha la banda a un poste a la altura del codo y párate de lado. Con el codo pegado al cuerpo y doblado a 90 grados, gira el antebrazo hacia afuera (como abriendo una puerta) y regresa despacio. Se siente suave y así debe ser: este ejercicio cuida los músculos profundos que protegen tu hombro. Cuenta las repeticiones por cada lado.',muscleLabel:'Manguito rotador (salud del hombro)',ytQuery:'rotación externa con banda manguito rotador tutorial'},
  {id:'e139',name:'Curl Invertido con Barra',muscle:'biceps',type:'Aislamiento',sets:3,reps:12,icon:'🔃',env:['gym'],desc:'Curl con agarre prono (palmas hacia abajo): el protagonista pasa a ser el braquiorradial y los extensores del antebrazo, con el braquial debajo del bíceps — grosor de brazo y fuerza de agarre que el curl normal no da. Codos fijos pegados al cuerpo, muñecas firmes en línea con el antebrazo, menos peso que en el curl clásico.',descSimple:'Toma la barra con las palmas mirando hacia ABAJO y los codos pegados al cuerpo. Sube doblando los codos sin que las muñecas se quiebren hacia abajo y baja despacio. Usa bastante menos peso que en el curl normal: aquí trabajan el antebrazo y un músculo que está debajo del bíceps y empuja el brazo hacia afuera.',muscleLabel:'Antebrazo y braquial',ytQuery:'curl invertido con barra agarre prono tutorial'},
  {id:'e140',name:'Curl de Muñeca con Barra',muscle:'biceps',type:'Aislamiento',sets:3,reps:15,icon:'🪬',env:['casa','gym'],desc:'Aislamiento de los flexores del antebrazo: antebrazos apoyados en el banco (o en los muslos) con las muñecas por fuera del borde, palmas arriba; sube y baja el peso solo con la muñeca en rango completo. Fuerza de agarre que transfiere a remos, pesos muertos y dominadas. Movimiento corto y controlado, sin que los antebrazos se despeguen.',descSimple:'Siéntate y apoya los antebrazos en los muslos o en un banco, con las palmas hacia arriba y las muñecas colgando por fuera del borde. Deja rodar la barra hacia los dedos, ciérrala y sube doblando solo las muñecas. Baja despacio. Es un movimiento cortico: el antebrazo no se despega del apoyo. Fortalece el agarre para todos los demás ejercicios.',muscleLabel:'Antebrazo (flexores de muñeca)',ytQuery:'curl de muñeca con barra antebrazo tutorial'},
  // ── NUEVOS 2026-06-14: principiante peso corporal — casa / parque (cierran el hueco del gate por nivel) ──
  {id:'e141',name:'Marcha en el Sitio',muscle:'cardio',type:'Cardio',sets:1,reps:60,icon:'🚶',env:['corporal','casa','parque','gym'],level:'P',desc:'Cardio de bajo impacto para arrancar sin castigar articulaciones: marcha en el mismo lugar levantando las rodillas a ritmo cómodo y bombeando los brazos, sin saltar. Sube el ritmo poco a poco manteniendo la respiración bajo control.',descSimple:'Camina en el mismo sitio levantando las rodillas y moviendo los brazos, sin saltar. Empieza suave; el ritmo está bien si todavía puedes hablar. Cero golpe a las rodillas.',muscleLabel:'Cardio (cuerpo completo)',ytQuery:'marcha en el sitio cardio bajo impacto principiantes'},
  {id:'e142',name:'Paso Lateral (Step-Touch)',muscle:'cardio',type:'Cardio',sets:1,reps:60,icon:'↔️',env:['corporal','casa','parque','gym'],level:'P',desc:'Cardio rítmico de bajo impacto: paso a un lado y junta el otro pie tocando el suelo, alternando, con los brazos acompañando. Mantén el pecho alto y un ritmo constante que puedas sostener.',descSimple:'Da un paso a la derecha y junta el pie izquierdo; luego a la izquierda. Como bailando suave de lado a lado, moviendo los brazos. Sin saltos, ritmo constante.',muscleLabel:'Cardio (cuerpo completo)',ytQuery:'step touch paso lateral cardio principiantes'},
  {id:'e143',name:'Talones Atrás Suave',muscle:'cardio',type:'Cardio',sets:1,reps:60,icon:'🦵',env:['corporal','casa','parque','gym'],level:'P',desc:'Trote muy suave en el sitio llevando los talones hacia los glúteos, alternando, sin despegar mucho del piso. Activa piernas y sube pulsaciones con impacto mínimo.',descSimple:'En el mismo lugar, lleva un talón hacia el glúteo y luego el otro, suave, casi sin saltar. Acompaña con los brazos. Si cansa, baja el ritmo.',muscleLabel:'Cardio (piernas)',ytQuery:'talones a los gluteos cardio suave principiantes'},
  {id:'e144',name:'Sombra de Boxeo',muscle:'cardio',type:'Cardio',sets:1,reps:60,icon:'🥊',env:['corporal','casa','parque','gym'],level:'P',desc:'Cardio entretenido sin impacto: lanza golpes al aire (jabs y crosses) con la guardia arriba y las rodillas suaves, rotando el tronco. Mantén un ritmo que puedas sostener varios minutos.',descSimple:'Sube las manos como guardia y lanza golpes al aire al frente, alternando brazos, moviéndote suave sobre las piernas. Diviértete y mantén el ritmo. Nada de saltos.',muscleLabel:'Cardio (cuerpo completo)',ytQuery:'shadow boxing principiantes cardio en casa'},
  {id:'e145',name:'Subir y Bajar Escalón',muscle:'cardio',type:'Cardio',sets:1,reps:40,icon:'🪜',env:['casa','parque','gym'],level:'P',desc:'Cardio funcional sobre un escalón firme o banca baja: sube un pie, luego el otro, baja y repite, alternando la pierna que inicia. Apoya el pie completo y controla la bajada.',descSimple:'Usa un escalón o banca bajita. Sube con un pie, luego el otro, y baja igual. Cambia la pierna que empieza cada tanto. Sube y baja a ritmo cómodo, agarrándote de algo si lo necesitas.',muscleLabel:'Cardio y piernas',ytQuery:'step ups escalon cardio principiantes en casa'},
  {id:'e146',name:'Remo Invertido en Mesa o Barra Baja',muscle:'espalda',type:'Bodyweight',sets:3,reps:10,icon:'🪑',env:['casa','parque','gym'],level:'P',desc:'El mejor jalón de espalda sin máquina: tumbado boca arriba bajo una mesa firme (o una barra baja en el parque), agárrate del borde y tira del pecho hacia arriba con el cuerpo recto. Más fácil cuanto más vertical estés; más difícil cuanto más horizontal.',descSimple:'Acuéstate boca arriba debajo de una mesa resistente (o barra baja). Agárrate del borde y jala tu pecho hacia la mesa manteniendo el cuerpo en línea, como un remo al revés. Si pesa mucho, dobla las rodillas y apoya más los pies.',muscleLabel:'Espalda y bíceps',ytQuery:'remo invertido en mesa principiantes espalda en casa'},
  {id:'e147',name:'Remo con Toalla en Puerta',muscle:'espalda',type:'Bodyweight',sets:3,reps:12,icon:'🚪',env:['casa'],level:'P',desc:'Pasa una toalla resistente por ambos lados de una puerta firme (con pestillo), agárrala con las dos manos, inclínate hacia atrás con los brazos estirados y tira llevando el pecho a la puerta. Tu propio peso es la resistencia.',descSimple:'Enrolla una toalla por el borde de una puerta cerrada y bien firme; agárrala con las dos manos. Inclínate hacia atrás con los brazos estirados y jálate hacia la puerta apretando la espalda. Cuanto más atrás te inclines, más cuesta.',muscleLabel:'Espalda y bíceps',ytQuery:'remo con toalla en puerta espalda en casa'},
  {id:'e148',name:'Patrón de Bisagra (Buenos Días sin Peso)',muscle:'espalda',type:'Bodyweight',sets:3,reps:12,icon:'🙇',env:['corporal','casa','parque','gym'],level:'P',desc:'Enseña el patrón de bisagra de cadera que protege la espalda en la vida diaria: manos en la nuca, rodillas algo flexionadas, lleva la cadera hacia atrás bajando el pecho con la espalda recta, y vuelve apretando glúteos. Sin redondear la columna.',descSimple:'De pie, manos en la nuca y rodillas un poco dobladas. Empuja la cola hacia atrás y baja el pecho con la espalda RECTA (no encorvada), hasta sentir el estiramiento atrás del muslo; vuelve apretando los glúteos. Aprende a agacharte sin lastimar la espalda.',muscleLabel:'Zona lumbar y glúteo',ytQuery:'patron de bisagra buenos dias sin peso tecnica'},
  {id:'e149',name:'Nadador en Suelo',muscle:'espalda',type:'Bodyweight',sets:3,reps:12,icon:'🏊',env:['corporal','casa','parque','gym'],level:'P',desc:'Boca abajo, brazos y piernas estirados; levanta brazo y pierna opuestos del piso a la vez, alternando como nadando, apretando la zona baja de la espalda y los glúteos. Movimiento corto y controlado, sin tirones.',descSimple:'Acuéstate boca abajo con brazos y piernas estirados. Sube a la vez un brazo y la pierna del lado contrario, bájalos y cambia, como nadando lento. Aprieta la espalda baja y la cola. Sin rebotes.',muscleLabel:'Espalda baja y glúteo',ytQuery:'nadador en suelo swimmers espalda baja principiantes'},
  {id:'e150',name:'Curl con Botellas o Mochila',muscle:'biceps',type:'Aislamiento',sets:3,reps:12,icon:'🍶',env:['casa','parque'],level:'P',desc:'Bíceps en casa sin pesas: usa botellas de agua llenas o una mochila con peso. Codos pegados al cuerpo y fijos, sube doblando solo el codo y baja despacio sin balancear el cuerpo.',descSimple:'Agarra una botella de agua llena en cada mano (o una mochila con cosas). Con los codos pegados a las costillas, súbelas doblando los brazos y bájalas despacio. No balancees el cuerpo para ayudarte.',muscleLabel:'Bíceps',ytQuery:'curl de biceps con botellas en casa principiantes'},
  {id:'e151',name:'Curl Isométrico Autorresistido',muscle:'biceps',type:'Isométrico',sets:3,reps:20,icon:'✊',env:['corporal','casa','parque','gym'],level:'P',desc:'Bíceps sin ningún equipo: con una mano intenta subir (curl) mientras la otra mano empuja hacia abajo resistiendo, generando tensión sin que el brazo casi se mueva, o bajando muy lento. Aprieta fuerte unos segundos por repetición.',descSimple:'Pon la palma de una mano debajo del puño de la otra. Intenta subir el puño doblando el codo mientras la mano de abajo lo frena. Aprieta fuerte unos segundos, suelta y repite. Trabajas el bíceps sin necesitar pesas.',muscleLabel:'Bíceps',ytQuery:'curl isometrico autorresistido biceps sin pesas'},
  {id:'e152',name:'Flexión Cerrada Inclinada',muscle:'triceps',type:'Bodyweight',sets:3,reps:12,icon:'🔺',env:['corporal','casa','parque','gym'],level:'P',desc:'Versión amable de la flexión diamante: manos juntas (o casi) apoyadas en una superficie elevada y firme (mesa, banca, pared), codos rozando el costado al bajar. Mientras más alta la superficie, más fácil. Trabaja sobre todo el tríceps.',descSimple:'Apoya las manos juntas en una mesa o banca firme y aleja los pies para quedar inclinado. Baja el pecho doblando los codos pegados al cuerpo y empuja. Mientras más alta la superficie, más fácil; ve bajando la altura con el tiempo.',muscleLabel:'Tríceps y pecho',ytQuery:'flexion cerrada inclinada triceps principiantes'},
  {id:'e153',name:'Patada de Tríceps con Botella',muscle:'triceps',type:'Aislamiento',sets:3,reps:14,icon:'🍶',env:['casa','parque'],level:'P',desc:'Tríceps en casa con botella o mochila pequeña: tronco inclinado al frente con la espalda recta, codo arriba y pegado al costado; estira el brazo hacia atrás llevando la botella hasta la cadera y vuelve con control. El codo no se mueve, solo el antebrazo.',descSimple:'Inclínate al frente con la espalda recta y el codo arriba pegado a las costillas, una botella en la mano. Estira el brazo hacia atrás hasta que quede recto y vuelve despacio. Solo se mueve del codo para abajo.',muscleLabel:'Tríceps',ytQuery:'patada de triceps con botella kickback en casa'},
  {id:'e154',name:'Pike Push-up Inclinado',muscle:'hombros',type:'Bodyweight',sets:3,reps:10,icon:'⛰️',env:['corporal','casa','parque','gym'],level:'P',desc:'Entrada amable al press de hombro con peso corporal: manos en el suelo y pies elevados en un escalón/banca formando una V invertida; baja la cabeza entre las manos doblando los codos y empuja. Cuanto menos elevados los pies, más fácil. Puente hacia la flexión pica avanzada.',descSimple:'Pon las manos en el piso y los pies sobre un escalón, formando una "V" con la cola arriba. Baja la cabeza despacio entre las manos doblando los codos y empuja para subir. Si cuesta mucho, baja la altura de los pies o hazlo con las manos en una mesa.',muscleLabel:'Hombros y tríceps',ytQuery:'pike push up principiantes hombros peso corporal'},
  {id:'e155',name:'Elevaciones Laterales con Botellas',muscle:'hombros',type:'Aislamiento',sets:3,reps:14,icon:'🍶',env:['casa','parque'],level:'P',desc:'Hombros redondos en casa: una botella ligera en cada mano, codos apenas flexionados; sube los brazos a los lados hasta la altura de los hombros (no más) y baja despacio. Sin impulso ni encoger el cuello.',descSimple:'Una botella de agua en cada mano, brazos a los lados. Súbelos abriéndolos hacia los lados hasta la altura de los hombros, como alas, y baja lento. No uses impulso ni subas los hombros hacia las orejas. Poco peso, mucho control.',muscleLabel:'Hombro (deltoides lateral)',ytQuery:'elevaciones laterales con botellas hombros en casa'},
  {id:'e156',name:'Press de Hombro con Mochila',muscle:'hombros',type:'Compuesto',sets:3,reps:12,icon:'🎒',env:['casa','parque'],level:'P',desc:'Press de hombro en casa con una mochila cargada: sostenla a la altura de los hombros y empújala arriba hasta estirar los brazos sin arquear la espalda, luego baja con control. Aprieta los glúteos y el abdomen para proteger la zona lumbar.',descSimple:'Carga una mochila con libros o botellas y sostenla pegada al pecho/hombros. Empújala hacia arriba hasta estirar los brazos y bájala despacio. Mantén el abdomen y la cola apretados para no arquear la espalda.',muscleLabel:'Hombros y tríceps',ytQuery:'press de hombro con mochila en casa principiantes'},
  {id:'e157',name:'Toques de Hombro en Plancha',muscle:'hombros',type:'Bodyweight',sets:3,reps:16,icon:'🤚',env:['corporal','casa','parque','gym'],level:'P',desc:'Estabilidad de hombro y core a la vez: en posición de plancha alta (manos y pies), toca con una mano el hombro contrario sin que la cadera se balancee, alternando. Pies más separados = más estable y fácil. Apoya las manos en una mesa para empezar más suave.',descSimple:'Ponte en plancha con los brazos estirados (manos y puntas de los pies). Toca con una mano el hombro contrario y vuelve, alternando, SIN que la cola se mueva de lado a lado. Separa más los pies para que sea más fácil; o apoya las manos en una mesa.',muscleLabel:'Hombros y core',ytQuery:'toques de hombro en plancha shoulder taps principiantes'},
  {id:'e158',name:'Sentadilla a Silla (Sit-to-Stand)',muscle:'piernas',type:'Bodyweight',sets:3,reps:12,icon:'🪑',env:['corporal','casa','parque','gym'],level:'P',desc:'La sentadilla rey del principiante y la persona mayor: párate frente a una silla firme, baja la cadera hacia atrás hasta rozar el asiento (o sentarte suave) y levántate empujando con los talones. La silla enseña la profundidad y da seguridad. Sube la dificultad usando un asiento más bajo.',descSimple:'Párate frente a una silla con los pies al ancho de los hombros. Baja sentándote suave hasta tocar el asiento y levántate empujando con los talones, sin impulso de los brazos. La silla te enseña a bajar bien y te da confianza. Más adelante usa una silla más bajita.',muscleLabel:'Cuádriceps y glúteo',ytQuery:'sentadilla a la silla sit to stand principiantes mayores'},
  {id:'e159',name:'Elevación de Talones a Peso Corporal',muscle:'piernas',type:'Bodyweight',sets:3,reps:18,icon:'🦶',env:['corporal','casa','parque','gym'],level:'P',desc:'Pantorrillas en cualquier lado: de pie, sube sobre las puntas de los pies lo más alto posible y baja despacio. Apóyate en una pared o silla para no perder el equilibrio. Súbele dificultad haciéndolo en un escalón con los talones colgando.',descSimple:'De pie, sube sobre las puntas de los pies todo lo que puedas y baja despacio. Agárrate de una pared o silla para no bambolearte. Si quieres más, párate en el borde de un escalón y deja bajar los talones.',muscleLabel:'Pantorrillas',ytQuery:'elevacion de talones peso corporal pantorrilla principiantes'},
  {id:'e160',name:'Zancada Estática con Apoyo',muscle:'piernas',type:'Bodyweight',sets:3,reps:10,icon:'🦵',env:['corporal','casa','parque','gym'],level:'P',desc:'Versión segura de la zancada: un pie adelante y otro atrás fijos, agarrado de una silla o pared para el equilibrio; baja la rodilla de atrás hacia el suelo doblando ambas piernas y sube. Sin dar pasos ni perder el balance. Prepara para zancadas más exigentes.',descSimple:'Pon un pie adelante y otro atrás (sin moverlos) y agárrate de una silla o pared. Baja doblando las dos rodillas, llevando la de atrás hacia el piso, y sube. Como arrodillarte y levantarte en el sitio. Cambia de pierna cada serie.',muscleLabel:'Cuádriceps y glúteo',ytQuery:'zancada estatica con apoyo principiantes split squat'},
  {id:'e161',name:'Sentadilla Sumo a Peso Corporal',muscle:'piernas',type:'Bodyweight',sets:3,reps:14,icon:'🧎',env:['corporal','casa','parque','gym'],level:'P',desc:'Sentadilla con pies más anchos que los hombros y puntas hacia afuera; baja la cadera recta entre los talones manteniendo el pecho alto y las rodillas siguiendo la línea de los pies. Trabaja glúteo e interno del muslo, cómoda para caderas rígidas.',descSimple:'Abre los pies más que los hombros con las puntas hacia afuera. Baja la cola recta hacia abajo (no atrás) manteniendo el pecho arriba, y sube empujando con los talones. Las rodillas apuntan hacia donde miran los pies. Buena si te cuesta la sentadilla normal.',muscleLabel:'Glúteo e interno del muslo',ytQuery:'sentadilla sumo peso corporal principiantes'},
  {id:'e162',name:'Zancada Inversa a Peso Corporal',muscle:'gluteo',type:'Bodyweight',sets:3,reps:10,icon:'🚶',env:['corporal','casa','parque','gym'],level:'P',desc:'Más amable para las rodillas que la zancada al frente: da un paso hacia ATRÁS y baja la rodilla de atrás hacia el suelo, luego empuja con la pierna de adelante para volver. Controla el descenso y mantén el tronco erguido. Apóyate en algo si hace falta.',descSimple:'De pie, da un paso hacia atrás con una pierna y baja la rodilla de atrás cerca del piso; vuelve empujando con la pierna de adelante. Es más suave para las rodillas que dar el paso al frente. Agárrate de una silla si pierdes el equilibrio.',muscleLabel:'Glúteo y cuádriceps',ytQuery:'zancada inversa peso corporal principiantes reverse lunge'},
  {id:'e163',name:'Abducción Tumbado de Lado',muscle:'gluteo',type:'Bodyweight',sets:3,reps:16,icon:'🦵',env:['corporal','casa','parque','gym'],level:'P',desc:'Glúteo medio sin equipo: acostado de lado con el cuerpo en línea, sube la pierna de arriba estirada hacia el techo de forma controlada y baja sin dejarla caer. Mantén la pelvis quieta, no la dejes rodar hacia atrás.',descSimple:'Acuéstate de lado con las piernas estiradas y el cuerpo derecho. Sube la pierna de arriba hacia el techo despacio y bájala con control, sin dejarla caer. No dejes que la cadera ruede hacia atrás. Trabaja el lado de la cola.',muscleLabel:'Glúteo medio',ytQuery:'abduccion de cadera tumbado de lado gluteo medio principiantes'},
  {id:'e164',name:'Plancha en Rodillas',muscle:'core',type:'Isométrico',sets:3,reps:30,icon:'🧱',env:['corporal','casa','parque','gym'],level:'P',desc:'Entrada accesible a la plancha: apoya antebrazos y RODILLAS en el suelo formando una línea recta de la cabeza a las rodillas, abdomen y glúteos apretados, sin hundir la cadera ni subirla. Aguanta el tiempo que puedas con buena forma antes de pasar a la plancha completa.',descSimple:'Apóyate en los antebrazos y las rodillas (no los pies), con el cuerpo en línea recta de la cabeza a las rodillas. Aprieta la barriga y la cola para no hundir la cadera. Aguanta unos segundos. Es la plancha más fácil para empezar.',muscleLabel:'Core (abdomen)',ytQuery:'plancha en rodillas principiantes core'},
  // ── NUEVOS e165-e214 (movilidad + HIIT/funcional + antebrazo/grip) ──
  {id:'e165',name:'Gato–Camello',muscle:'core',type:'Movilidad',sets:1,reps:10,icon:'🐈',env:['corporal','casa','parque','gym'],track:'reps',desc:'Movilidad suave de columna: en cuatro apoyos alterna hundir y redondear la espalda de forma controlada, acompañando con la respiración. Ideal para calentar o liberar tensión.',descSimple:'En cuatro apoyos, alterna arquear (mirar arriba) y redondear (esconder ombligo) la espalda, lento y al ritmo de la respiración.',muscleLabel:'Columna y core',ytQuery:'gato camello movilidad columna'},
  {id:'e166',name:'Perro Boca Abajo',muscle:'piernas',type:'Movilidad',sets:1,reps:30,icon:'🔻',env:['corporal','casa','parque','gym'],track:'tiempo',desc:'Estiramiento global de cadena posterior: V invertida con caderas altas, talones buscando el suelo y pecho empujando hacia los muslos. Aguanta respirando.',descSimple:'Forma una V invertida con manos y pies en el suelo y cadera alta; empuja el pecho atrás y estira talones al piso.',muscleLabel:'Isquios, pantorrilla y hombro',ytQuery:'perro boca abajo estiramiento'},
  {id:'e167',name:'Postura del Niño',muscle:'core',type:'Movilidad',sets:1,reps:30,icon:'🙇',env:['corporal','casa','parque','gym'],track:'tiempo',desc:'Descarga suave de la espalda: sentado sobre los talones con brazos extendidos al frente y frente cerca del suelo. Respira y suelta la zona lumbar.',descSimple:'De rodillas, siéntate sobre los talones y estira los brazos al frente bajando el pecho; relaja la espalda baja.',muscleLabel:'Espalda baja y dorsal',ytQuery:'postura del niño estiramiento espalda'},
  {id:'e168',name:'Cobra',muscle:'core',type:'Movilidad',sets:1,reps:20,icon:'🐍',env:['corporal','casa','parque','gym'],track:'tiempo',desc:'Extensión suave de columna: tumbado boca abajo eleva el pecho con los brazos sin forzar la lumbar, estirando la parte frontal del torso. Sin tirones.',descSimple:'Boca abajo, apoya las manos y eleva el pecho extendiendo suavemente la espalda; hombros lejos de las orejas.',muscleLabel:'Abdomen y espalda baja',ytQuery:'cobra estiramiento abdomen movilidad'},
  {id:'e169',name:'Círculos de Brazos',muscle:'hombros',type:'Movilidad',sets:1,reps:12,icon:'🔄',env:['corporal','casa','parque','gym'],track:'reps',desc:'Calentamiento de hombros: brazos extendidos trazando círculos amplios y controlados, hacia adelante y hacia atrás. Prepara la articulación antes de empujar/tirar.',descSimple:'De pie, brazos extendidos a los lados haciendo círculos amplios, adelante y luego atrás.',muscleLabel:'Hombros',ytQuery:'círculos de brazos calentamiento hombro'},
  {id:'e170',name:'Círculos de Cadera',muscle:'core',type:'Movilidad',sets:1,reps:10,icon:'⭕',env:['corporal','casa','parque','gym'],track:'reps',desc:'Movilidad de cadera: con las manos en la cintura, traza círculos amplios con la pelvis en los dos sentidos para soltar la articulación.',descSimple:'De pie con manos en la cintura, dibuja círculos amplios con la cadera en ambos sentidos.',muscleLabel:'Cadera y core',ytQuery:'círculos de cadera movilidad'},
  {id:'e171',name:'Balanceo de Piernas',muscle:'piernas',type:'Movilidad',sets:1,reps:12,icon:'🦵',env:['corporal','casa','parque','gym'],track:'reps',desc:'Movilidad dinámica de cadera: con apoyo a un lado, balancea la pierna recta adelante y atrás dentro de un rango cómodo. Gran calentamiento para piernas.',descSimple:'Sujétate de un apoyo y balancea una pierna recta adelante y atrás, controlado; luego cambia.',muscleLabel:'Cadera e isquios',ytQuery:'balanceo de piernas calentamiento'},
  {id:'e172',name:'Estiramiento del Mundo',muscle:'piernas',type:'Movilidad',sets:1,reps:8,icon:'🌍',env:['corporal','casa','parque','gym'],track:'reps',desc:'El mejor estiramiento de calentamiento: zancada profunda, un codo al piso y rotación torácica abriendo el brazo arriba. Abre cadera, aductores y columna en un solo gesto.',descSimple:'En zancada profunda apoya un codo cerca del pie y rota el otro brazo abriendo el pecho al techo.',muscleLabel:'Cadera, aductores y torso',ytQuery:'world greatest stretch movilidad'},
  {id:'e173',name:'Rotación Torácica',muscle:'core',type:'Movilidad',sets:1,reps:10,icon:'🌀',env:['corporal','casa','parque','gym'],track:'reps',desc:'Movilidad de la columna media: en cuatro apoyos, con una mano en la nuca, abre el codo rotando el torso hacia el techo. Clave para hombro y postura.',descSimple:'En cuatro apoyos, mano detrás de la cabeza, rota el codo abriendo el pecho hacia el techo y vuelve.',muscleLabel:'Columna torácica',ytQuery:'rotación torácica movilidad cuadrupedia'},
  {id:'e174',name:'Cadera 90/90',muscle:'gluteo',type:'Movilidad',sets:1,reps:30,icon:'📐',env:['corporal','casa','parque','gym'],track:'tiempo',desc:'Movilidad de rotación de cadera: sentado con las dos piernas a 90 grados, torso alto; alterna lados. Suelta caderas tensas por estar sentado.',descSimple:'Sentado con ambas piernas dobladas a 90° (una al frente, otra al lado), mantén el tronco erguido.',muscleLabel:'Rotadores de cadera',ytQuery:'movilidad cadera 90 90'},
  {id:'e175',name:'Zancada con Giro',muscle:'piernas',type:'Movilidad',sets:1,reps:8,icon:'🔃',env:['corporal','casa','parque','gym'],track:'reps',desc:'Movilidad dinámica: en cada zancada rota el tronco sobre la pierna de adelante, abriendo cadera y columna. Excelente parte del calentamiento.',descSimple:'Da una zancada al frente y gira el torso hacia la pierna adelantada; alterna lados.',muscleLabel:'Cadera y torso',ytQuery:'zancada con giro movilidad'},
  {id:'e176',name:'Oruga',muscle:'core',type:'Movilidad',sets:1,reps:6,icon:'🐛',env:['corporal','casa','parque','gym'],track:'reps',desc:'Calentamiento de cuerpo completo: caminas con las manos hasta una plancha y regresas, estirando isquios y activando el core. Sube el ritmo cardíaco suave.',descSimple:'De pie, baja las manos al suelo y camina con ellas hasta una plancha; camina de regreso y sube.',muscleLabel:'Isquios y core',ytQuery:'oruga inchworm calentamiento'},
  {id:'e177',name:'Movilidad de Tobillo',muscle:'piernas',type:'Movilidad',sets:1,reps:10,icon:'🦶',env:['corporal','casa','parque','gym'],track:'reps',desc:'Movilidad de tobillo (dorsiflexión): empuja la rodilla por delante de los dedos manteniendo el talón pegado. Mejora la sentadilla y previene molestias.',descSimple:'En medio arrodillado, lleva la rodilla adelantada por encima de los dedos sin despegar el talón.',muscleLabel:'Tobillo y pantorrilla',ytQuery:'movilidad de tobillo dorsiflexión'},
  {id:'e178',name:'Pasa-vallas de Hombro',muscle:'hombros',type:'Movilidad',sets:1,reps:10,icon:'🎏',env:['corporal','casa','parque','gym'],track:'reps',desc:'Movilidad de hombro: con un palo agarrado ancho, llévalo por encima de la cabeza de adelante hacia atrás dentro de tu rango. Abre el pecho y el hombro.',descSimple:'Con un palo o banda agarrado ancho, pásalo por encima de la cabeza de adelante hacia atrás y vuelve.',muscleLabel:'Hombros y pecho',ytQuery:'pasa vallas de hombro palo movilidad'},
  {id:'e179',name:'Estiramiento de Isquios',muscle:'piernas',type:'Movilidad',sets:1,reps:30,icon:'🦵',env:['corporal','casa','parque','gym'],track:'tiempo',desc:'Estiramiento de isquios: bisagra de cadera con la espalda plana llevando el pecho hacia los muslos. Aguanta sin rebotar ni redondear la lumbar.',descSimple:'De pie, inclínate desde la cadera con la espalda recta buscando los dedos de los pies sin redondear.',muscleLabel:'Isquios',ytQuery:'estiramiento de isquios de pie'},
  {id:'e180',name:'Movilidad de Cuello',muscle:'otro',type:'Movilidad',sets:1,reps:8,icon:'🙆',env:['corporal','casa','parque','gym'],track:'reps',desc:'Movilidad suave de cuello: rotaciones y giros lentos y controlados para liberar tensión cervical. Nunca fuerces ni hagas círculos bruscos.',descSimple:'Gira la cabeza lento de un lado a otro y arriba/abajo dentro de un rango cómodo, sin forzar.',muscleLabel:'Cuello',ytQuery:'movilidad de cuello suave'},
  {id:'e182',name:'Rodillas Altas',muscle:'cardio',type:'HIIT',sets:3,reps:30,icon:'🏃',env:['corporal','casa','parque','gym'],desc:'Cardio de alta intensidad: corre en el sitio elevando las rodillas a la altura de la cadera, brazos acompañando. Sube las pulsaciones y activa flexores de cadera.',descSimple:'Corre en el sitio subiendo las rodillas a la altura de la cadera, rápido y con el core firme.',muscleLabel:'Cardio y piernas',ytQuery:'rodillas altas high knees'},
  {id:'e183',name:'Talones al Glúteo',muscle:'cardio',type:'HIIT',sets:3,reps:30,icon:'🦵',env:['corporal','casa','parque','gym'],desc:'Cardio y activación de isquios: trote en el sitio llevando los talones al glúteo. Buen calentamiento o intervalo de acondicionamiento.',descSimple:'Trota en el sitio llevando los talones hacia los glúteos de forma rápida y alterna.',muscleLabel:'Cardio e isquios',ytQuery:'talones al glúteo butt kicks'},
  {id:'e184',name:'Sentadilla con Salto',muscle:'piernas',type:'HIIT',sets:3,reps:15,icon:'🆙',env:['corporal','casa','parque','gym'],desc:'Pliometría de piernas: explota hacia arriba desde la sentadilla y aterriza suave amortiguando con las rodillas alineadas. Desarrolla potencia y quema.',descSimple:'Baja a sentadilla y salta con fuerza extendiendo todo; aterriza suave con rodillas alineadas y repite.',muscleLabel:'Piernas y glúteo (potencia)',ytQuery:'sentadilla con salto jump squat'},
  {id:'e185',name:'Zancadas con Salto',muscle:'piernas',type:'HIIT',sets:3,reps:12,icon:'🔀',env:['corporal','casa','parque','gym'],desc:'Pliometría unilateral: alterna las piernas en el aire desde la zancada, aterrizando con control. Potencia, equilibrio y mucho cardio.',descSimple:'Desde una zancada, salta y cambia de pierna en el aire; aterriza suave y mantén el torso erguido.',muscleLabel:'Piernas y glúteo (potencia)',ytQuery:'zancadas con salto jumping lunges'},
  {id:'e186',name:'Salto del Patinador',muscle:'gluteo',type:'HIIT',sets:3,reps:16,icon:'⛸️',env:['corporal','casa','parque','gym'],desc:'Pliometría lateral: rebota de lado a lado aterrizando en una pierna, con la otra cruzando atrás. Trabaja glúteo medio, estabilidad y cardio.',descSimple:'Salta lateral de un pie al otro como patinando, llevando la pierna libre atrás y aterrizando con control.',muscleLabel:'Glúteo medio y piernas',ytQuery:'salto del patinador skater jumps'},
  {id:'e187',name:'Salto al Cajón',muscle:'piernas',type:'HIIT',sets:3,reps:10,icon:'📦',env:['parque','gym'],desc:'Pliometría de potencia: salta sobre un cajón firme aterrizando suave y completo; baja escalonando. Sube siempre con buena técnica, nunca rebotes hacia atrás.',descSimple:'Salta sobre un cajón estable aterrizando con ambos pies y rodillas suaves; baja con control, no saltes hacia atrás.',muscleLabel:'Piernas y glúteo (potencia)',ytQuery:'salto al cajón box jump técnica'},
  {id:'e188',name:'Plancha Toque de Hombro',muscle:'core',type:'Funcional',sets:3,reps:20,icon:'👆',env:['corporal','casa','parque','gym'],track:'reps',desc:'Anti-rotación de core: en plancha alta tocas el hombro opuesto alternando, evitando que la cadera baile. Estabilidad y abdomen profundo.',descSimple:'En plancha alta toca el hombro contrario con cada mano sin balancear la cadera; mantén el core firme.',muscleLabel:'Core y anti-rotación',ytQuery:'plancha toque de hombro shoulder taps'},
  {id:'e189',name:'Plancha Saltarina',muscle:'core',type:'HIIT',sets:3,reps:20,icon:'🤸',env:['corporal','casa','parque','gym'],desc:'Core con cardio: desde plancha de antebrazos, abre y cierra las piernas saltando. Mantén la cadera estable mientras subes pulsaciones.',descSimple:'En plancha de antebrazos, abre y cierra los pies saltando como tijera, sin levantar la cadera.',muscleLabel:'Core y cardio',ytQuery:'plancha saltarina plank jacks'},
  {id:'e190',name:'Balanceo con Pesa Rusa',muscle:'gluteo',type:'Funcional',sets:3,reps:15,icon:'🔔',env:['casa','gym'],desc:'Potencia de cadera: el swing nace del empuje explosivo de glúteos e isquios (bisagra), no de los brazos ni de las rodillas. La pesa flota a la altura del pecho. Espalda siempre recta.',descSimple:'Bisagra de cadera proyectando la pesa al frente con el empuje de glúteos; la espalda recta, no es sentadilla ni se levanta con los brazos.',muscleLabel:'Glúteo, isquios y potencia',ytQuery:'kettlebell swing técnica'},
  {id:'e191',name:'Thruster',muscle:'piernas',type:'Funcional',sets:3,reps:12,icon:'🚀',env:['casa','gym'],desc:'Compuesto de cuerpo entero: encadena sentadilla y press de hombro con el impulso de las piernas. Mucho músculo y mucho acondicionamiento por repetición.',descSimple:'Sentadilla frontal con mancuernas al hombro y, al subir, usa el impulso para empujarlas sobre la cabeza en un solo movimiento.',muscleLabel:'Piernas y hombros',ytQuery:'thruster mancuernas técnica'},
  {id:'e192',name:'Lanzamiento a Pared',muscle:'piernas',type:'Funcional',sets:3,reps:15,icon:'🧱',env:['gym'],desc:'Funcional explosivo: sentadilla a lanzamiento del balón a la pared, recibiendo y encadenando. Combina piernas, hombros y cardio.',descSimple:'Desde sentadilla con balón al pecho, sube y lánzalo a un punto alto de la pared; recíbelo y baja de nuevo a sentadilla.',muscleLabel:'Piernas y hombros',ytQuery:'wall ball balón medicinal técnica'},
  {id:'e193',name:'Cuerdas de Batalla',muscle:'hombros',type:'HIIT',sets:3,reps:30,icon:'🌊',env:['gym'],desc:'Acondicionamiento de tren superior: ondas continuas con las cuerdas en base atlética. Hombros, agarre y un cardio brutal de bajo impacto en articulaciones.',descSimple:'En posición atlética, genera ondas alternas (o dobles) con las cuerdas de forma rápida y continua.',muscleLabel:'Hombros, brazos y cardio',ytQuery:'battle ropes cuerdas de batalla'},
  {id:'e194',name:'Caminata del Oso',muscle:'core',type:'Funcional',sets:3,reps:30,icon:'🐻',env:['corporal','casa','parque','gym'],track:'tiempo',desc:'Estabilidad de cuerpo completo: gateas con las rodillas elevadas, coordinando brazo y pierna opuestos sin que la cadera se balancee. Core, hombros y coordinación.',descSimple:'En cuatro apoyos con las rodillas a un palmo del suelo, avanza moviendo mano y pie contrarios manteniendo la cadera baja.',muscleLabel:'Core y cuerpo completo',ytQuery:'bear crawl caminata del oso'},
  {id:'e195',name:'Caminata del Cangrejo',muscle:'core',type:'Funcional',sets:3,reps:30,icon:'🦀',env:['corporal','casa','parque','gym'],track:'tiempo',desc:'Funcional de cadena posterior: en posición de mesa invertida con la cadera arriba, desplázate sobre manos y pies. Tríceps, glúteo y estabilidad de hombro.',descSimple:'Sentado con manos y pies en el suelo y cadera elevada (mesa invertida), camina hacia atrás y adelante.',muscleLabel:'Tríceps, glúteo y core',ytQuery:'crab walk caminata del cangrejo'},
  {id:'e196',name:'Push Press',muscle:'hombros',type:'Funcional',sets:3,reps:10,icon:'⬆️',env:['gym'],desc:'Empuje vertical con potencia: una breve flexión de piernas da el impulso para empujar más peso sobre la cabeza que en el press estricto. Bloquea arriba con el core firme.',descSimple:'Con la barra en los hombros, haz una pequeña flexión de rodillas y empuja la barra sobre la cabeza usando ese impulso.',muscleLabel:'Hombros con impulso de piernas',ytQuery:'push press barra técnica'},
  {id:'e197',name:'Azote de Balón',muscle:'espalda',type:'Funcional',sets:3,reps:15,icon:'💥',env:['gym'],desc:'Descarga explosiva: lanza el balón medicinal al suelo con toda la fuerza del dorsal y el abdomen. Potencia, desfogue y cardio en uno.',descSimple:'Levanta el balón por encima de la cabeza y azótalo contra el suelo con fuerza usando dorsal y abdomen; recógelo y repite.',muscleLabel:'Dorsal, core y potencia',ytQuery:'slam ball azote de balón'},
  {id:'e198',name:'Sprint en el Sitio',muscle:'cardio',type:'HIIT',sets:3,reps:20,icon:'💨',env:['corporal','casa','parque','gym'],desc:'Intervalo de máxima intensidad: corre en el sitio a tope en ráfagas cortas, brazos bombeando. Dispara las pulsaciones sin necesidad de espacio.',descSimple:'Corre en el sitio lo más rápido posible con rodillas activas y brazos bombeando, en ráfagas cortas.',muscleLabel:'Cardio máximo',ytQuery:'sprint en el sitio alta intensidad'},
  {id:'e199',name:'Subida con Rodilla',muscle:'piernas',type:'Funcional',sets:3,reps:12,icon:'🪜',env:['casa','parque','gym'],track:'reps',desc:'Unilateral funcional: subes al cajón empujando con la pierna de apoyo y rematas elevando la rodilla contraria. Fuerza, equilibrio y un toque de cardio.',descSimple:'Sube a un cajón con una pierna y, arriba, eleva la rodilla contraria; baja con control y alterna.',muscleLabel:'Piernas y glúteo',ytQuery:'subida al cajón con rodilla step up'},
  {id:'e200',name:'Salto Agrupado',muscle:'piernas',type:'HIIT',sets:3,reps:10,icon:'⬆️',env:['corporal','casa','parque','gym'],desc:'Pliometría avanzada: salto vertical llevando las rodillas al pecho, aterrizando amortiguado. Mucha potencia y exigencia cardiovascular.',descSimple:'Salta llevando las rodillas hacia el pecho y aterriza suave, encadenando con control.',muscleLabel:'Piernas (potencia)',ytQuery:'salto agrupado tuck jump'},
  {id:'e201',name:'Plancha a Flexión',muscle:'core',type:'Funcional',sets:3,reps:12,icon:'🔃',env:['corporal','casa','parque','gym'],track:'reps',desc:'Estabilidad dinámica: alternas entre plancha de antebrazos y de manos manteniendo la cadera quieta. Core anti-rotación con trabajo de hombro y tríceps.',descSimple:'Desde plancha de antebrazos, sube a plancha de manos brazo por brazo y vuelve a bajar, sin balancear la cadera.',muscleLabel:'Core, hombro y tríceps',ytQuery:'plancha a flexión up down plank'},
  {id:'e202',name:'Burpee Completo',muscle:'piernas',type:'HIIT',sets:3,reps:12,icon:'🔥',env:['corporal','casa','parque','gym'],desc:'El acondicionador total: flexión en el suelo, recoges y saltas arriba. Trabaja todo el cuerpo y es uno de los mayores quema-calorías por minuto.',descSimple:'Baja a plancha, haz una flexión, recoge los pies y salta arriba con los brazos extendidos; repite fluido.',muscleLabel:'Cuerpo completo',ytQuery:'burpee completo técnica'},
  {id:'e203',name:'Sprawl',muscle:'core',type:'HIIT',sets:3,reps:15,icon:'⬇️',env:['corporal','casa','parque','gym'],desc:'Burpee de lucha (sin flexión): bajas, extiendes la cadera al suelo y vuelves arriba a toda velocidad. Cardio y agilidad con menos carga en hombros.',descSimple:'Como un burpee pero sin flexión: baja las manos, lanza los pies atrás extendiendo la cadera y vuelve a ponerte de pie rápido.',muscleLabel:'Core y cardio',ytQuery:'sprawl burpee sin flexión'},
  {id:'e204',name:'Man Maker',muscle:'espalda',type:'Funcional',sets:3,reps:10,icon:'🛠️',env:['casa','gym'],desc:'El más completo: combina remo en plancha, recogida y thruster en una sola repetición. Espalda, hombros, piernas y core a la vez — muy exigente.',descSimple:'En plancha con mancuernas, rema un brazo y luego el otro, recoge los pies y haz un thruster; es un encadenado de cuerpo completo.',muscleLabel:'Cuerpo completo',ytQuery:'man maker mancuernas técnica'},
  {id:'e205',name:'Zancada Lateral con Salto',muscle:'gluteo',type:'HIIT',sets:3,reps:12,icon:'↔️',env:['corporal','casa','parque','gym'],desc:'Pliometría lateral: zancada a un lado y salto explosivo al contrario, trabajando glúteo medio y aductores. Potencia en el plano lateral, poco entrenado.',descSimple:'Da una zancada amplia hacia un lado, baja la cadera y salta lateral hacia el otro lado; alterna con control.',muscleLabel:'Glúteo medio y piernas',ytQuery:'zancada lateral con salto'},
  {id:'e206',name:'Encogimientos con Barra',muscle:'espalda',type:'Aislamiento',sets:3,reps:15,icon:'🤷',env:['gym'],desc:'Aislamiento de trapecio superior: encoge los hombros llevándolos hacia las orejas con la barra colgando, aprieta arriba y baja lento. Sin rotar los hombros.',descSimple:'De pie con la barra colgando, eleva los hombros recto hacia las orejas y baja con control; no gires los hombros.',muscleLabel:'Trapecio',ytQuery:'encogimientos con barra trapecio shrug'},
  {id:'e207',name:'Encogimientos en Polea',muscle:'espalda',type:'Aislamiento',sets:3,reps:15,icon:'🪢',env:['gym'],desc:'Trapecio con tensión constante: la polea mantiene la carga en todo el rango. Encoge hacia las orejas, aprieta y controla la bajada.',descSimple:'Desde polea baja, encoge los hombros hacia arriba con tensión constante; aprieta arriba y baja controlado.',muscleLabel:'Trapecio',ytQuery:'encogimientos en polea trapecio'},
  {id:'e209',name:'Curl de Muñeca Invertido',muscle:'biceps',type:'Aislamiento',sets:3,reps:15,icon:'🔧',env:['casa','gym'],desc:'Extensores del antebrazo: con las palmas hacia abajo, elevas el dorso de la mano en un rango corto. Equilibra el antebrazo y cuida el codo.',descSimple:'Antebrazos apoyados y palmas hacia abajo, sube el dorso de la mano flexionando la muñeca; recorrido corto y controlado.',muscleLabel:'Antebrazo (extensores)',ytQuery:'curl de muñeca invertido antebrazo'},
  {id:'e210',name:'Curl de Muñeca',muscle:'biceps',type:'Aislamiento',sets:3,reps:15,icon:'✊',env:['casa','gym'],desc:'Flexores del antebrazo: con las palmas arriba, enrollas la muñeca y dejas rodar el peso a los dedos para máximo recorrido. Agarre y antebrazos más fuertes.',descSimple:'Antebrazos apoyados y palmas hacia arriba, enrolla la barra cerrando la muñeca y baja dejándola rodar a los dedos.',muscleLabel:'Antebrazo (flexores)',ytQuery:'curl de muñeca antebrazo flexores'},
  {id:'e211',name:'Colgarse de la Barra',muscle:'biceps',type:'Isométrico',sets:3,reps:30,icon:'🧗',env:['parque','gym'],desc:'Isométrico de agarre: colgarse con los brazos extendidos fortalece manos y antebrazos y descomprime hombros y columna. Aguanta respirando.',descSimple:'Cuélgate de la barra con los brazos rectos y el cuerpo relajado, aguantando el tiempo que puedas con buen agarre.',muscleLabel:'Agarre y descompresión',ytQuery:'colgarse de la barra dead hang'},
  {id:'e212',name:'Paseo del Camarero',muscle:'hombros',type:'Funcional',sets:3,reps:30,icon:'🤵',env:['casa','gym'],track:'tiempo',desc:'Estabilidad de hombro y core: caminas con una mancuerna fija sobre la cabeza, brazo recto. Refuerza el manguito, el agarre y el tronco anti-inclinación.',descSimple:'Sostén una mancuerna bloqueada arriba con el brazo recto y camina erguido manteniéndola estable; alterna brazos.',muscleLabel:'Hombro estable y agarre',ytQuery:'paseo del camarero waiter walk'},
  {id:'e213',name:'Rotaciones de Muñeca',muscle:'biceps',type:'Aislamiento',sets:3,reps:15,icon:'🍽️',env:['casa','gym'],track:'reps',desc:'Movilidad y fuerza de antebrazo: sujetando un disco, rotas la muñeca de un lado a otro. Trabaja pronadores/supinadores y mejora el agarre.',descSimple:'Sostén un disco al frente con el brazo extendido y rótalo de lado a lado controlando el movimiento desde la muñeca.',muscleLabel:'Antebrazo',ytQuery:'rotaciones de muñeca con disco antebrazo'},
  {id:'e214',name:'Curl Zottman',muscle:'biceps',type:'Aislamiento',sets:3,reps:12,icon:'🔄',env:['casa','gym'],desc:'Bíceps + antebrazo en uno: subes como curl normal y bajas con las palmas hacia abajo (invertido). El descenso castiga el antebrazo y el braquial.',descSimple:'Sube en curl con palmas arriba, gira las palmas hacia abajo en la cima y baja lento en esa posición; gira de nuevo abajo.',muscleLabel:'Bíceps y antebrazo',ytQuery:'curl zottman mancuernas técnica'},
  // ── NUEVOS 2026-07-27 (repoblado del catálogo, e215-e227) ────────────────────────
  // Nacen de MEDIR, no de una idea: en producción el coach tenía 13 de 14 ejercicios de
  // PECHO ya asignados (93% agotado) y 9 de 12 de tríceps, mientras piernas iba al 48%.
  // Contrastados contra bibliotecas reales (WorkoutLabs, Hevy) y filtrados al equipo que
  // el PO confirmó tener — nada de kettlebell ni TRX, que su gimnasio no usa. e226 es
  // literalmente el ejercicio que él tuvo que crearse a mano por no encontrarlo.
  {id:'e215',name:'Press Declinado con Barra',muscle:'pecho',type:'Compuesto',sets:4,reps:10,icon:'📉',env:['gym'],desc:'Press en banco declinado: el ángulo hacia abajo carga la porción INFERIOR del pectoral, la que el plano y el inclinado dejan a medias. Omóplatos retraídos, baja la barra a la parte baja del pecho y empuja sin bloquear de golpe. Con banco declinado la cabeza queda por debajo de la cadera: sube y baja del banco con calma.',descSimple:'Acuéstate en el banco inclinado hacia abajo, con los pies bien sujetos. Baja la barra hasta la parte de abajo del pecho y empuja hacia arriba. Vas a sentirlo en la parte baja del pecho. Levántate despacio al terminar.',muscleLabel:'Pecho inferior y tríceps',ytQuery:'press declinado con barra técnica correcta'},
  {id:'e216',name:'Press Declinado con Mancuernas',muscle:'pecho',type:'Compuesto',sets:3,reps:12,icon:'📉',env:['gym'],desc:'Versión con mancuernas del press declinado: cada lado trabaja por su cuenta, así que corrige descompensaciones y permite un recorrido más natural en el hombro que la barra. Baja hasta sentir estiramiento en el pecho bajo, sin dejar caer.',descSimple:'En el banco inclinado hacia abajo, con una mancuerna en cada mano. Baja hasta la altura del pecho y empuja arriba juntando un poco las manos. Como cada brazo va solo, notarás si uno es más fuerte.',muscleLabel:'Pecho inferior y tríceps',ytQuery:'press declinado con mancuernas tutorial'},
  {id:'e217',name:'Aperturas Declinadas con Mancuernas',muscle:'pecho',type:'Aislamiento',sets:3,reps:12,icon:'🦋',env:['gym'],desc:'Aislamiento del pectoral inferior en banco declinado: brazos casi extendidos con los codos ligeramente flexionados y FIJOS, abres en arco hasta sentir el estiramiento y cierras como si abrazaras. Peso moderado: es un ejercicio de estiramiento y contracción, no de carga.',descSimple:'En el banco inclinado hacia abajo, con una mancuerna en cada mano y los brazos casi estirados. Abre los brazos a los lados en arco y ciérralos arriba como si dieras un abrazo. Usa poco peso: aquí importa el estiramiento, no el kilo.',muscleLabel:'Pecho inferior',ytQuery:'aperturas declinadas con mancuernas'},
  {id:'e218',name:'Press de Pecho de Pie en Polea',muscle:'pecho',type:'Compuesto',sets:3,reps:12,icon:'🔗',env:['gym'],desc:'Press horizontal de pie con poleas: el core trabaja para estabilizar mientras el pectoral empuja, y la tensión es constante en todo el recorrido (a diferencia de la barra, donde arriba se descansa). Un pie adelantado, tronco firme, empuja al frente juntando las manos.',descSimple:'De pie entre las poleas, con un pie adelante para no irte hacia atrás. Toma las agarraderas a la altura del pecho y empuja al frente hasta juntar las manos. El cable jala todo el tiempo, así que el pecho nunca descansa.',muscleLabel:'Pecho y core',ytQuery:'press de pecho de pie en polea técnica'},
  {id:'e219',name:'Press de Pecho en el Suelo con Mancuernas',muscle:'pecho',type:'Compuesto',sets:3,reps:12,icon:'🛏️',env:['casa','gym'],desc:'Floor press: acostado en el SUELO, el recorrido se corta cuando el codo toca el piso. Eso protege el hombro (limita la hiperextensión) y carga más el tríceps y el bloqueo. Es la variante de press cuando no hay banco — sirve igual en casa.',descSimple:'Acuéstate en el suelo con las rodillas dobladas y una mancuerna en cada mano. Baja hasta que los codos toquen el piso, haz una pausa corta y empuja arriba. Al parar en el suelo cuidas el hombro, y no necesitas banco.',muscleLabel:'Pecho y tríceps',ytQuery:'floor press con mancuernas en el suelo'},
  {id:'e220',name:'Flexiones con Pies Elevados',muscle:'pecho',type:'Bodyweight',track:'reps',sets:3,reps:12,icon:'📐',env:['corporal','casa','parque','gym'],desc:'Flexión con los pies sobre un apoyo: al invertir el ángulo, más porcentaje del peso corporal cae sobre los brazos y el énfasis sube al pectoral superior y al hombro. Es la progresión DIFÍCIL de la flexión — el escalón siguiente cuando las normales ya salen fáciles. Cuerpo recto de cabeza a talones.',descSimple:'Pon los pies sobre un banco, silla o escalón y las manos en el suelo. Baja el pecho y empuja, con el cuerpo recto como una tabla. Es la versión difícil de la lagartija: pásate a ella cuando las normales te salgan fáciles.',muscleLabel:'Pecho superior y hombros',ytQuery:'flexiones con pies elevados decline push up'},
  {id:'e222',name:'Press de Banca Agarre Cerrado',muscle:'triceps',type:'Compuesto',sets:4,reps:10,icon:'🏋️',env:['gym'],desc:'El compuesto de tríceps por excelencia: press de banca con las manos a la anchura de los hombros. Los codos van pegados al cuerpo (no abiertos) y la barra baja a la parte baja del pecho. Permite mucha más carga que cualquier extensión, por eso es el que construye tamaño y fuerza real en el tríceps.',descSimple:'Acuéstate en el banco y toma la barra con las manos a la anchura de los hombros, no más cerradas. Baja con los codos pegados al cuerpo y empuja. Es el ejercicio con el que más peso puedes mover para el tríceps.',muscleLabel:'Tríceps y pecho',ytQuery:'press banca agarre cerrado triceps técnica'},
  {id:'e223',name:'Extensión de Tríceps sobre la Cabeza en Polea',muscle:'triceps',type:'Aislamiento',sets:3,reps:12,icon:'🔗',env:['gym'],desc:'De espaldas a la polea baja, con la cuerda por encima de la cabeza: la posición con el brazo elevado ESTIRA la cabeza larga del tríceps, que es la que el jalón normal en polea deja corta. Codos apuntando al frente y quietos; solo se mueve el antebrazo.',descSimple:'De espaldas a la polea, pasa la cuerda por encima de tu cabeza y estira los brazos hacia adelante y arriba. Los codos se quedan quietos apuntando al frente. Se siente distinto al jalón normal porque estira más la parte de atrás del brazo.',muscleLabel:'Tríceps (cabeza larga)',ytQuery:'extensión de triceps sobre la cabeza en polea cuerda'},
  {id:'e225',name:'Fondos en Máquina Asistida',muscle:'triceps',type:'Compuesto',sets:3,reps:12,icon:'⬇️',env:['gym'],desc:'Fondos con contrapeso: la máquina te ayuda con parte de tu peso corporal, así que es la PUERTA DE ENTRADA a los fondos para quien todavía no puede con su propio peso. A más contrapeso, más fácil — se va bajando conforme aparece la fuerza. Codos pegados y tronco lo más vertical posible para cargar tríceps.',descSimple:'La máquina te ayuda con una parte de tu peso, así que puedes hacer fondos aunque todavía no te salgan solo. Apóyate en las rodillas, mantén el cuerpo lo más derecho posible y baja y sube con los codos pegados. Cada semana usa un poco menos de ayuda.',muscleLabel:'Tríceps, pecho y hombros',ytQuery:'fondos en maquina asistida como usar'},
  {id:'e226',name:'Peso Muerto Rumano con Mancuernas',muscle:'gluteo',type:'Compuesto',sets:3,reps:12,icon:'🍑',env:['casa','gym'],desc:'Bisagra de cadera con mancuernas: rodillas casi rectas (solo un leve desbloqueo), cadera hacia atrás y espalda neutra, bajando hasta sentir el estiramiento en la parte de atrás del muslo. Las mancuernas permiten un recorrido más cómodo que la barra y son la opción cuando no hay barra disponible.',descSimple:'De pie con una mancuerna en cada mano frente a los muslos. Lleva la cadera hacia atrás y baja las mancuernas rozando las piernas, con la espalda recta y las rodillas casi estiradas. Sube apretando los glúteos. Debes sentir el estirón detrás del muslo, no en la espalda baja.',muscleLabel:'Glúteo e isquiotibiales',ytQuery:'peso muerto rumano con mancuernas técnica'},
];
const DB={
  clients:ld('ax_c',[]),
  exercises:ld('ax_e',defaultExercises),
  msgs:ld('ax_m',{}),
  history:ld('ax_hist',{}),
  prs:ld('ax_pr',{}),
  bodyweight:ld('ax_bw',{}),
  templates:ld('ax_tpl',[]),
  nutrition:ld('ax_nut',{}),
  medidas:ld('ax_med',{}),
  photos:ld('ax_photos',{}),
};

let CUR={clientId:null,editClientId:null,editExId:null,editRoutineIdx:null,routineExs:[],restSec:60,pkFilter:'all',exFilter:'all',loggedAs:null,activeRoutine:null};
let editTplId=null,tplExs=[],tplRestSec=60,pickerTarget='routine';

// ══════════════ ICONOS SVG DE MARCA (v303 — F1 de docs/plan-iconos-svg.md) ══════════════
// Pedido Camilo 2026-07-09: "premium desde los stickers en adelante". Los emojis se ven
// distintos en cada celular (Samsung/Xiaomi/iPhone) y a nivel sticker; estos SVG en línea
// 2px con currentColor se ven IDÉNTICOS en todos y heredan los tokens (claro/oscuro).
// Regla del plan: emojis que actúan como ICONO DE UI se migran por fases; los emojis
// dentro de TEXTOS (toasts, mensajes del coach) se quedan. Agregar íconos aquí.
const AVI_ICONS={
  sparkles:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z"/>',
  droplet:'<path d="M12 3c3.5 4.2 6 7.5 6 10.5a6 6 0 0 1-12 0C6 10.5 8.5 7.2 12 3z"/>',
  bike:'<circle cx="6" cy="17" r="3.2"/><circle cx="18" cy="17" r="3.2"/><path d="M6 17l3.6-7h5.2l3.2 7"/><path d="M9.6 10L8.2 7H6.2"/><path d="M14.8 10L13.6 7h2.6"/>',
  bolt:'<path d="M13 2L5 13.5h5L9 22l8-11.5h-5L13 2z"/>',
  wind:'<path d="M3 8h9.5A2.5 2.5 0 1 0 10.5 5.5"/><path d="M3 12h13.5A2.5 2.5 0 1 1 14 14.5"/><path d="M3 16h7.5a2.25 2.25 0 1 1-2.3 2.2"/>',
  // F2 (v306): racha/constancia, biblioteca QW, banner de descanso y nudge de push.
  flame:'<path d="M12 3c.5 2.6-2.9 4.3-4.3 7.1A7 7 0 0 0 12 21a7 7 0 0 0 6.5-9.6C17.2 8.6 13 7.2 12 3z"/><path d="M12 21c1.9 0 3.2-1.4 3.2-3.2 0-1.7-1.3-2.7-3.2-4.3-1.9 1.6-3.2 2.6-3.2 4.3C8.8 19.6 10.1 21 12 21z"/>',
  bell:'<path d="M18 16H6c1.2-1.3 1.8-2.5 1.8-5.2a4.2 4.2 0 0 1 8.4 0c0 2.7.6 3.9 1.8 5.2z"/><path d="M10.3 19a1.9 1.9 0 0 0 3.4 0"/>',
  moon:'<path d="M20 14.5A8.3 8.3 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r="1"/>',
  burst:'<path d="M12 2.5v3.6"/><path d="M12 17.9v3.6"/><path d="M2.5 12h3.6"/><path d="M17.9 12h3.6"/><path d="M5.3 5.3l2.5 2.5"/><path d="M16.2 16.2l2.5 2.5"/><path d="M18.7 5.3l-2.5 2.5"/><path d="M7.8 16.2l-2.5 2.5"/>',
  leaf:'<path d="M6 20C6 11.5 11 5.3 20 4.2c.6 9-4 15-13.4 15.8"/><path d="M6 20c2.2-5.6 5.6-9.6 10-12.2"/>',
  dumbbell:'<path d="M7.3 8.3v7.4"/><path d="M4.3 10v4"/><path d="M16.7 8.3v7.4"/><path d="M19.7 10v4"/><path d="M7.3 12h9.4"/>',
  gauge:'<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4.2-4.6"/><circle cx="12" cy="16" r="1.2"/>',
  // F3 (v307): títulos de sección (Rutinas/Mensajes/Progreso/Perfil + habitaciones) y tema.
  // chat y chart calcan el trazo de los tabs de abajo (ya eran SVG) para hablar el mismo idioma.
  clipboard:'<rect x="5" y="4.6" width="14" height="16.4" rx="2.2"/><rect x="9" y="2.8" width="6" height="3.6" rx="1.2"/><path d="M9 11.5h6"/><path d="M9 15.5h4"/>',
  chat:'<path d="M21 12a8 8 0 0 1-11.7 7.1L4 20.5l1.4-5.2A8 8 0 1 1 21 12z"/>',
  chart:'<path d="M3.5 20.5h17"/><path d="M6.5 20.5v-6"/><path d="M12 20.5v-11"/><path d="M17.5 20.5v-8"/>',
  trend:'<path d="M3.5 19.5l6-6.5 3.5 3.5 7-7.5"/><path d="M15.6 9h4.4v4.4"/>',
  trenddown:'<path d="M3.5 4.5l6 6.5 3.5-3.5 7 7.5"/><path d="M15.6 15h4.4v-4.4"/>',
  flat:'<path d="M4 12h16"/>',
  apple:'<path d="M12 7.4c-3-2-6.6-.3-6.6 3.6 0 4 2.6 8.2 4.6 8.2 1 0 1.3-.6 2-.6s1 .6 2 .6c2 0 4.6-4.2 4.6-8.2 0-3.9-3.6-5.6-6.6-3.6z"/><path d="M12 7.4c0-2.2 1.2-3.6 3.2-4.2"/>',
  trophy:'<path d="M8 4.5h8v5.5a4 4 0 0 1-8 0V4.5z"/><path d="M8 6H4.8c0 2.8 1.4 4.6 3.4 4.9"/><path d="M16 6h3.2c0 2.8-1.4 4.6-3.4 4.9"/><path d="M12 14v3"/><path d="M12 17c-2 0-3 1.4-3 3.5h6c0-2.1-1-3.5-3-3.5z"/>',
  scale:'<rect x="4" y="4" width="16" height="16" rx="3.2"/><path d="M8.4 10.2a5.2 5.2 0 0 1 7.2 0"/><path d="M12 9.2l1.4 2.2"/>',
  ruler:'<rect x="3" y="8.5" width="18" height="7" rx="1.6"/><path d="M7 8.5v3"/><path d="M10.5 8.5v3.8"/><path d="M14 8.5v3"/><path d="M17.5 8.5v3.8"/>',
  camera:'<path d="M4 8.6A2.6 2.6 0 0 1 6.6 6H8l1.5-2.2h5L16 6h1.4A2.6 2.6 0 0 1 20 8.6v7.8a2.6 2.6 0 0 1-2.6 2.6H6.6A2.6 2.6 0 0 1 4 16.4V8.6z"/><circle cx="12" cy="12.4" r="3.2"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2"/><path d="M12 19v2"/><path d="M3 12h2"/><path d="M19 12h2"/><path d="M5.6 5.6l1.4 1.4"/><path d="M17 17l1.4 1.4"/><path d="M18.4 5.6L17 7"/><path d="M7 17l-1.4 1.4"/>',
  contrast:'<circle cx="12" cy="12" r="8"/><path d="M12 4v16"/><path d="M12 7.5a4.5 4.5 0 0 1 0 9"/>',
  // F3b (v307): héroe del perfil, chips de estadísticas de las habitaciones y botones.
  calendar:'<rect x="4" y="5.5" width="16" height="15" rx="2.4"/><path d="M8 3.5v4"/><path d="M16 3.5v4"/><path d="M4 10.5h16"/>',
  repeat:'<path d="M17 3l3 3-3 3"/><path d="M20 6H8.5A4.5 4.5 0 0 0 4 10.5"/><path d="M7 21l-3-3 3-3"/><path d="M4 18h11.5a4.5 4.5 0 0 0 4.5-4.5"/>',
  utensils:'<path d="M7 3v7.5"/><path d="M4.4 3v3.8a2.6 2.6 0 0 0 5.2 0V3"/><path d="M7 13v8"/><path d="M17.5 3c-2 2.2-2.6 5.4-2.6 8.4h2.6"/><path d="M17.5 3v18"/>',
  pie:'<circle cx="12" cy="12" r="8"/><path d="M12 4v8h8"/>',
  arrowup:'<path d="M12 19.5V5"/><path d="M5.8 11.2L12 5l6.2 6.2"/>',
  timer:'<circle cx="12" cy="13.5" r="7"/><path d="M12 13.5v-4"/><path d="M10 2.5h4"/><path d="M12 2.5v2"/>',
  check:'<path d="M4.5 12.8l5 5L19.5 7"/>',
  play:'<path d="M8 5.6v12.8l10-6.4z"/>',
  barbell:'<path d="M2.5 12h19"/><path d="M6.2 8v8"/><path d="M17.8 8v8"/><path d="M3.6 9.6v4.8"/><path d="M20.4 9.6v4.8"/>',
  pencil:'<path d="M15.4 4.4l4.2 4.2L8.2 20 3 21l1-5.2L15.4 4.4z"/><path d="M13.6 6.2l4.2 4.2"/>',
  help:'<circle cx="12" cy="12" r="8"/><path d="M9.7 9.6a2.4 2.4 0 1 1 3.4 2.2c-.8.4-1.1 1-1.1 1.9"/><path d="M12 16.6h.01"/>',
  phone:'<path d="M6.2 3.5c1 0 2.4 2.6 2.4 3.5 0 .9-1.3 1.5-1.3 2.4 0 1.6 4.3 5.9 5.9 5.9.9 0 1.5-1.3 2.4-1.3.9 0 3.5 1.4 3.5 2.4 0 1.2-1.7 3.1-3.4 3.1-5.6 0-12.2-6.6-12.2-12.2 0-1.7 1.9-3.8 2.7-3.8z"/>',
  // F4 (v308): guiado — dolor, biserie y dropset. Solo superficies innerHTML; los tokens
  // de estado ✓/○/▶/⏸ (textContent que lee la lógica y el harness) NO se migran.
  alert:'<path d="M12 3.8L21.4 20H2.6L12 3.8z"/><path d="M12 10v4.4"/><path d="M12 17.2h.01"/>',
  link:'<path d="M10 13.6a4 4 0 0 0 6 .4l2.4-2.4a4 4 0 1 0-5.7-5.7L11.4 7.2"/><path d="M14 10.4a4 4 0 0 0-6-.4l-2.4 2.4a4 4 0 1 0 5.7 5.7l1.3-1.3"/>',
  tridown:'<path d="M4.8 7h14.4L12 19.2 4.8 7z"/>',
  // F5 (v310): panel del coach — configuración, borrar y bandera de "sin rutinas".
  sliders:'<path d="M4 7h9.5"/><circle cx="17" cy="7" r="2.3"/><path d="M20 12h-9.5"/><circle cx="7" cy="12" r="2.3"/><path d="M4 17h9.5"/><circle cx="17" cy="17" r="2.3"/>',
  trash:'<path d="M4.5 6.5h15"/><path d="M8.5 6.5V4.9a1.4 1.4 0 0 1 1.4-1.4h4.2a1.4 1.4 0 0 1 1.4 1.4v1.6"/><path d="M6.6 6.5l.8 12.9a1.7 1.7 0 0 0 1.7 1.6h5.8a1.7 1.7 0 0 0 1.7-1.6l.8-12.9"/><path d="M10 10.5v6"/><path d="M14 10.5v6"/>',
  flag:'<path d="M6 21V4"/><path d="M6 4.5h11.5L15 8l2.5 3.5H6"/>',
  folder:'<path d="M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8"/>',
  eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  mail:'<rect x="3" y="5.5" width="18" height="13" rx="2.2"/><path d="M3.8 7.2l8.2 6 8.2-6"/>',
  users:'<circle cx="9" cy="8.5" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16.5 5.6a3.2 3.2 0 0 1 0 5.8"/><path d="M17.5 14.4a6 6 0 0 1 3.5 5.6"/>',
  card:'<rect x="3" y="5.5" width="18" height="13" rx="2.4"/><path d="M3 9.8h18"/><path d="M6.5 14.5h4"/>',
  // Medallas del gamif (v312): el "oro" lo pone el chip .gx-bic; el glifo es de línea.
  star:'<path d="M12 3.2l2.5 5.4 5.9.6-4.4 4 1.2 5.8L12 16l-5.2 3 1.2-5.8-4.4-4 5.9-.6L12 3.2z"/>',
  crown:'<path d="M4.2 17.5L3.2 7.5l4.9 3.4L12 5l3.9 5.9 4.9-3.4-1 10H4.2z"/><path d="M4.8 20.5h14.4"/>',
  medal:'<circle cx="12" cy="9.2" r="5.6"/><path d="M9 13.8L7.2 21l4.8-2.7L16.8 21 15 13.8"/>',
  disc:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.4"/>',
  lock:'<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.2"/><path d="M8.5 10.5V7.6a3.5 3.5 0 0 1 7 0v2.9"/><path d="M12 14.3v2.2"/>',
  // Coach Inteligente Capa A (v352): bloque de bienestar del check-in de ánimo.
  heart:'<path d="M12 19s-6-4.2-8-8a3.8 3.8 0 0 1 8-1 3.8 3.8 0 0 1 8 1c-2 3.8-8 8-8 8z"/>',
  // Hábitos parte 2 (v362): pasos del día en la tarjeta #cn-habits.
  footprints:'<path d="M4 15.5v-2C4 11 2.9 10 3 8c.05-2.4 1.3-5 4-5C8.7 3 9.3 4.6 9.3 6c0 2.7-1.6 4.9-1.6 7.5v2a1.9 1.9 0 1 1-3.7 0z"/><path d="M19.7 19v-2c0-1.8.9-2.7 1-4.6.1-2.4-1.3-5-4-5-1.6 0-2.3 1.6-2.3 3 0 2.7 1.6 4.9 1.6 7.5v1.1a1.9 1.9 0 1 0 3.7 0z"/><path d="M4 13h4"/><path d="M16 17h4"/>',
};
function aviIcon(name,size){
  const p=AVI_ICONS[name]||AVI_ICONS.sparkles;
  return '<svg class="avic" width="'+(size||20)+'" height="'+(size||20)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
}
// F3 (v307): los títulos ESTÁTICOS del index llevan <span class="t-ic" data-ic="nombre">emoji</span>
// — el emoji queda como fallback en el HTML y este pase único lo cambia por el SVG de marca.
// OJO: hay t-ic ANTES de los <script> (pestañas) y DESPUÉS (modales como #m-photos) →
// el pase corre con el DOM completo (DOMContentLoaded), no al cargar este módulo.
function aviIconizeStatic(){
  document.querySelectorAll('.t-ic[data-ic]').forEach(el=>{
    el.innerHTML=aviIcon(el.getAttribute('data-ic'),parseInt(el.getAttribute('data-ic-size'))||16);
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',aviIconizeStatic);
else{try{aviIconizeStatic();}catch(_e){}}
