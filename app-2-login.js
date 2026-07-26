// ══════════════════════ LOGIN ══════════════════════
// ══════════ EXERCISE MIGRATION ══════════
// Campos de "catálogo" (presentación) cuya fuente de verdad es el código.
// Se REFRESCAN desde defaultExercises en cada arranque para que las fichas no
// queden desfasadas (texto/foto/etiqueta). Lo editable por el coach —sets, reps,
// env, track, holdSecs…— NO se toca.
const CATALOG_FIELDS=['name','muscle','type','icon','desc','descSimple','muscleLabel','ytQuery'];
function migrateExercises(){
  // (1) Agrega ejercicios nuevos sin perder datos del usuario.
  // (2) Refresca los campos de catálogo de los existentes (antes solo agregaba,
  //     por eso las bibliotecas viejas mostraban fichas sin descSimple/muscleLabel).
  let changed=false;
  const byId={}; DB.exercises.forEach(e=>{ if(e&&e.id)byId[e.id]=e; });
  defaultExercises.forEach(def=>{
    const cur=byId[def.id];
    if(!cur){ DB.exercises.push({...def}); changed=true; return; }
    CATALOG_FIELDS.forEach(f=>{
      if(def[f]!==undefined && cur[f]!==def[f]){ cur[f]=def[f]; changed=true; }
    });
  });
  if(changed){sv('ax_e',DB.exercises);log('AVI: catálogo refrescado OK');}
}

// Autolimpia la biblioteca local (ax_e) aunque la nube no sincronice. Quita:
// (1) ids RETIRADOS a propósito (REMOVED_EXERCISES, ej. e38 = duplicado de e15);
// (2) FANTASMAS: ejercicios con id NO-catálogo cuyo nombre DUPLICA a uno del catálogo
//     (ej. una "Prensa de Pierna" custom que reaparece). Remapea las rutinas al id bueno.
// Los customs legítimos (nombre único, ej. "Remo Australiano") se conservan.
const REMOVED_EXERCISES={'e38':'e15','e32':'e19'};
// Fantasmas por PATRÓN de nombre: el match exacto no caza variantes ("Prensa" a secas
// vs "Prensa de Pierna" del catálogo — por eso sobrevivió la prensa fantasma). Cualquier
// ejercicio NO-catálogo cuyo nombre matchee se elimina y sus rutinas van al id bueno.
const REMOVED_NAME_PATTERNS=[[/prensa|leg ?press/,'e36']];
function dedupeExercises(){
  const nf=s=>(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
  const catIds=new Set(defaultExercises.map(e=>e.id));
  const catName={}; defaultExercises.forEach(e=>{catName[nf(e.name)]=e.id;});
  const remap=Object.assign({},REMOVED_EXERCISES);
  (DB.exercises||[]).forEach(e=>{
    if(!e||!e.id||catIds.has(e.id))return;
    const n=nf(e.name);
    let t=catName[n];
    if(!t){ const hit=REMOVED_NAME_PATTERNS.find(([rx])=>rx.test(n)); if(hit)t=hit[1]; }
    if(t&&t!==e.id)remap[e.id]=t;
  });
  const drop=new Set(Object.keys(remap));
  // Además: entradas sin id y entradas con el MISMO id repetido (se queda la primera).
  const seen=new Set(); let extra=0;
  const clean=(DB.exercises||[]).filter(e=>{
    if(!e||!e.id){extra++;return false;}
    if(drop.has(e.id))return false;
    if(seen.has(e.id)){extra++;return false;}
    seen.add(e.id); return true;
  });
  if(!drop.size&&!extra) return;
  DB.exercises=clean;
  (DB.clients||[]).forEach(c=>(c.routines||[]).forEach(r=>(r.exercises||[]).forEach(ex=>{
    if(ex&&remap[ex.id]){
      ex.id=remap[ex.id];
      // Refresca también nombre/ícono/músculo del id bueno: dejar el nombre viejo
      // ("Fondos Gironda...") seguiría confundiendo aunque el id ya esté remapeado.
      const cat=defaultExercises.find(d=>d.id===ex.id);
      if(cat){ex.name=cat.name;ex.icon=cat.icon;ex.muscle=cat.muscle;}
    }
  })));
  try{ sv('ax_e',DB.exercises); sv('ax_c',DB.clients); }catch(e){}
  log('AVI: dedupe — '+(drop.size+extra)+' ejercicio(s) fantasma/duplicado(s) eliminados');
}

// ══════════════════════════════════════════
// SECURITY UTILS — v2.0
// ══════════════════════════════════════════

// ── XSS: sanitize before any innerHTML insertion ──
function esc(s){
  if(s==null)return '';
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#x27;');
}

// ── Password hashing (SHA-256 via Web Crypto API) ──
// Format stored: "sha256:<hex>" — distinguishable from legacy base64
async function hashPass(plain, salt){
  try{
    const enc=new TextEncoder().encode(plain+(salt||''));
    const buf=await crypto.subtle.digest('SHA-256',enc);
    const hex=Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    return 'sha256:'+hex;
  }catch(e){
    warn('hashPass: crypto.subtle unavailable, using fallback',e);
    return 'sha256:'+_b64enc(plain+(salt||'')); // safe fallback
  }
}
function isHashed(s){return typeof s==='string'&&s.startsWith('sha256:');}

// ── Legacy base64 helpers — kept ONLY for migration reads ──
function _b64enc(s){try{return btoa(unescape(encodeURIComponent(s)));}catch(e){return btoa(s);}}
function _b64dec(s){try{return decodeURIComponent(escape(atob(s)));}catch(e){try{return atob(s);}catch(e2){return s;}}}

// ── Verify a password against stored hash (supports legacy migration) ──
async function verifyPass(stored, plain, salt){
  if(!stored)return false;
  if(isHashed(stored)){
    const h=await hashPass(plain,salt||'');
    return h===stored;
  }
  // Legacy base64 (cuentas viejas pre-SHA-256): se acepta SOLO para migrar al hashear en el
  // próximo guardado. Se ELIMINÓ el "last resort" de texto plano (auditoría 2026-06-21): la
  // verificación nunca debe validar comparando contra una contraseña almacenada en claro.
  try{if(_b64dec(stored)===plain)return true;}catch(e){}
  return false;
}

// ── Coach credential accessors ──
// Coach pass is stored as SHA-256 hash; email/name remain base64 (not secret)
function getCoachEmail(){return _b64dec(ld('ax_ce',_b64enc('coach@apex.com')));}
function getCoachPassHash(){return ld('ax_cph',null);} // new SHA-256 field
function getCoachPassLegacy(){return _b64dec(ld('ax_cp',_b64enc('1234')));} // migration only
function getCoachName(){return _b64dec(ld('ax_cn',_b64enc('Mi Coach')));}
function getCoachSite(){return ld('ax_site','');}

// ── Verify coach password (SHA-256 preferred, base64 fallback) ──
async function verifyCoachPass(plain){
  const hash=getCoachPassHash();
  if(hash){return await verifyPass(hash,plain,'_coach_'+getCoachEmail());}
  // Legacy: base64
  return getCoachPassLegacy()===plain;
}

// ── Save new coach password as SHA-256 ──
async function saveCoachPass(plain){
  // En AUTH_MODE la contraseña REAL es la de Supabase Auth (con la que el coach inicia sesión):
  // sin esto el cambio era un no-op silencioso (bug #2 auditoría 2026-06-30). Lanza si la nube
  // falla → saveSettings lo reporta en vez de mostrar un "✅" falso. El hash local (ax_cph) se
  // mantiene para el camino legacy/local.
  if(AUTH_MODE){
    const {error}=await AUTH.updatePassword(plain);
    if(error)throw new Error(error.message||'No se pudo actualizar la contraseña en la nube');
  }
  const salt='_coach_'+getCoachEmail();
  const hash=await hashPass(plain,salt);
  sv('ax_cph',hash);
  localStorage.removeItem('ax_cp'); // remove legacy base64 key
}

// ── Client password verify with migration ──
// Salt = clientId (unique per user)
async function verifyClientPass(client, plain){
  return await verifyPass(client.password, plain, client.id);
}

// ── Save client password as SHA-256 ──
async function hashClientPass(plain, clientId){
  return await hashPass(plain, clientId);
}

// Mostrar/ocultar contraseña (botón 👁). Cambia el type del input y el ícono.
function togglePass(btn,id){
  const el=document.getElementById(id); if(!el)return;
  const show=el.type==='password';
  el.type=show?'text':'password';
  btn.textContent=show?'🙈':'👁';
  btn.setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña');
}

// Entrar/registrarse con Google (OAuth). signInWithOAuth redirige a Google y vuelve
// a la app; detectSessionInUrl (config del cliente) procesa la sesión al volver y el
// boot/_enterAuthSession entra solo. Cuentas nuevas → se provisiona su fila (modo libre).
async function loginWithGoogle(){
  const err=document.getElementById('lerr');
  if(!AUTH.ready()){ if(err){err.textContent='Sin conexión para entrar con Google. Revisa tu internet.';err.classList.add('on');} return; }
  try{
    const r=await AUTH.signInGoogle();
    if(r&&r.error){ if(err){err.textContent='No se pudo abrir Google: '+r.error.message;err.classList.add('on');} }
    // Sin error: el navegador ya está redirigiendo a Google.
  }catch(e){ if(err){err.textContent='No se pudo entrar con Google. Intenta de nuevo.';err.classList.add('on');} }
}

// Vincular Google a la cuenta YA logueada (linkIdentity) → luego puede entrar con Google
// sin la clave temporal. Requiere "Manual linking" habilitado en Supabase Auth.
// Traduce los errores de linkIdentity a mensajes accionables en español. El caso real
// (Claudia/Luz/Nataly, auditoría 2026-07-01): la asesorada tocó antes "Continuar con
// Google" en el login → Supabase auto-creó una cuenta vacía con su Gmail → al vincular
// aquí, GoTrue responde identity_already_exists y el toast crudo en inglés (2,5s) no
// dejaba diagnosticar nada.
function _linkGoogleErrMsg(error){
  const code=(error&&error.code)||'';
  const msg=String((error&&error.message)||'').toLowerCase();
  if(code==='identity_already_exists'||msg.indexOf('already linked')>=0)
    return 'Ese Google ya está usado por otra cuenta. Cierra sesión, toca "Continuar con Google" UNA vez (si era una cuenta vacía se limpia sola), vuelve a entrar con tu correo e intenta de nuevo. Si sigue fallando, avísale a tu coach. 🙏';
  if(code==='manual_linking_disabled'||msg.indexOf('manual linking')>=0)
    return 'Conectar Google está desactivado por ahora. Avísale a tu coach.';
  if(code==='access_denied'||msg.indexOf('denied')>=0)
    return 'Cancelaste la conexión con Google. Puedes intentarlo cuando quieras.';
  return 'No se pudo conectar Google. Revisa tu internet e intenta de nuevo.';
}
async function linkGoogle(){
  const c=AUTH.client(); if(!c){toast('Inicia sesión primero');return;}
  try{
    // Marca "vínculo en curso" ANTES de redirigir: al volver de Google el resultado
    // (éxito o #error= en el hash) llega por URL y detectSessionInUrl consume el hash,
    // así que _handleGoogleLinkReturn necesita esta miga para saber que veníamos de aquí.
    try{ localStorage.setItem('ax_glink_pending',String(Date.now())); }catch(_e){}
    const {error}=await c.auth.linkIdentity({provider:'google',options:{redirectTo:location.origin+location.pathname}});
    if(error){ try{ localStorage.removeItem('ax_glink_pending'); }catch(_e){} warn('AVI: linkIdentity falló:',error.code||'',error.message||''); toast(_linkGoogleErrMsg(error),6000); }
    // Sin error: el navegador redirige a Google para autorizar el vínculo.
  }catch(e){ try{ localStorage.removeItem('ax_glink_pending'); }catch(_e){} warn('AVI: linkGoogle lanzó:',e&&e.message); toast(_linkGoogleErrMsg(e),6000); }
}

// Al VOLVER de Google tras linkIdentity: GoTrue devuelve el resultado en la URL
// (#error=... si falló; tokens si funcionó) y supabase-js consume el hash al crear el
// cliente (detectSessionInUrl) → sin esto el error se PERDÍA en silencio (caso Luz
// 2026-07-02: el vínculo sí quedó pero nadie se lo dijo). _OAUTH_RET (app-1-infra) captura
// el hash/search en parse-time, antes de que el cliente lo consuma.
async function _handleGoogleLinkReturn(){
  // El flag lleva timestamp: si el usuario abandonó en la pantalla de Google y abre la
  // app días después, un flag viejo (>10 min) se descarta EN SILENCIO (sin toast espurio).
  let pending=false;
  try{
    const ts=parseInt(localStorage.getItem('ax_glink_pending'),10);
    localStorage.removeItem('ax_glink_pending');
    pending=!isNaN(ts)&&(Date.now()-ts)<10*60*1000;
  }catch(_e){}
  if(!pending)return;
  // Limpia el hash de la URL (tokens/error) para que un reload no lo re-procese.
  try{ if(location.hash) history.replaceState(history.state,'',location.pathname+location.search); }catch(_e){}
  if(_OAUTH_RET&&_OAUTH_RET.error){
    warn('AVI: retorno de linkIdentity con error:',_OAUTH_RET.code,_OAUTH_RET.desc||_OAUTH_RET.error);
    toast(_linkGoogleErrMsg({code:_OAUTH_RET.code,message:_OAUTH_RET.desc||_OAUTH_RET.error}),8000);
    return;
  }
  // Sin error en la URL: confirma contra el usuario real si el vínculo quedó.
  let linked=false;
  try{ const u=await AUTH.getUser(); if(u)linked=(u.identities||[]).some(i=>i.provider==='google'); }catch(_e){}
  if(linked){
    toast('✅ ¡Google conectado! Ya puedes entrar con un toque.',6000);
    // Si el retorno de Google cayó en el navegador (no en la app instalada), oriéntala.
    try{ if(!matchMedia('(display-mode: standalone)').matches) setTimeout(()=>toast('📱 Puedes volver a la app AVI desde su ícono.',6000),6500); }catch(_e){}
    try{ renderGoogleLink(); }catch(_e){}
  }else{
    toast('No se pudo confirmar la conexión con Google. Revisa en Perfil e intenta de nuevo.',6000);
  }
}

// Pinta la tarjeta de "Conectar Google" en el perfil (solo en modo auth). Muestra estado.
async function renderGoogleLink(){
  const el=document.getElementById('cn-account-card'); if(!el)return;
  if(!AUTH_MODE||!AUTH.ready()){ el.innerHTML=''; return; }
  let linked=false;
  try{ const u=await AUTH.getUser(); if(u)linked=(u.identities||[]).some(i=>i.provider==='google'); }catch(e){}
  const gsvg='<svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.5 29.3 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.5 29.3 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39 16.2 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2c3.9-3.6 6.1-8.9 6.1-15.1 0-1.2-.1-2.3-.4-3.5z"/></svg>';
  el.innerHTML = linked
    ? `<div class="card" style="margin-bottom:12px"><div class="cb" style="display:flex;align-items:center;gap:10px;font-size:13px;color:var(--t2)"><span style="font-size:18px">✅</span> Tu cuenta está conectada con Google.</div></div>`
    : `<div class="card" style="margin-bottom:12px"><div class="cb"><div style="font-size:13px;color:var(--t2);margin-bottom:10px">Conecta tu Google para entrar con un toque, sin recordar la contraseña.</div><button class="btn bg bsm" onclick="linkGoogle()" style="display:inline-flex;align-items:center;gap:8px">${gsvg} Conectar mi Google</button></div></div>`;
}

async function doLogin(){
  const u=document.getElementById('lu').value.trim().toLowerCase();
  const p=document.getElementById('lp').value;
  const err=document.getElementById('lerr');
  const btn=document.querySelector('.lbtn');

  // ── Rate limiting ──
  if(isLoginBlocked()){
    err.textContent=`Demasiados intentos. Espera ${getLoginBlockRemaining()} segundos.`;
    err.classList.add('on');
    return;
  }

  // Remember me
  const remCk=document.getElementById('l-rem');
  if(remCk&&remCk.checked){localStorage.setItem('ax_rem',u);}
  else{localStorage.removeItem('ax_rem');}
  // Disable button while verifying (prevents double-click timing attacks)
  if(btn){btn.disabled=true;btn.textContent='Verificando...';}
  try{
    // ── Auth real (Supabase) — ÚNICO camino de login (Fase 4) ──
    // Todas las cuentas viven en auth.users; entra por aquí (modo user_data + RLS).
    if(AUTH.ready()){
      try{
        const r=await AUTH.signInEmail(u,p);
        if(r&&!r.error&&r.data&&r.data.session){
          err.classList.remove('on');
          resetLoginAttempts();
          await _enterAuthSession(r.data.user);
          return;
        }
      }catch(e){ warn('AVI auth login (error de red/credenciales):',e&&e.message); }
    }
    // ── Fase 4 (v2.0): login SOLO por Supabase Auth — respaldo legacy ELIMINADO ──
    // apex_data quedó cerrado por RLS; el login client-side viejo (coach@apex.com +
    // ax_c con SHA-256) ya no aplica. Todas las cuentas reales viven en auth.users.
    // Si supabase-js no cargó (CDN caído / sin red), avisar de conexión en vez de
    // marcar "contraseña incorrecta" (sería confuso y gastaría intentos).
    if(!AUTH.ready()){
      err.textContent='No se pudo conectar para entrar. Revisa tu internet e intenta de nuevo.';
      err.classList.add('on');
      return;
    }
    // Llegar aquí = credenciales inválidas en Supabase Auth → cae a registro de intento.
    // Failed login — record attempt
    const blocked = recordLoginFail();
    if(blocked){
      err.textContent=`Demasiados intentos fallidos. Espera 30 segundos.`;
    } else {
      const rem = MAX_ATTEMPTS - parseInt(sessionStorage.getItem(LOGIN_ATTEMPTS_KEY)||'0');
      err.textContent = rem <= 2
        ? `Email o contraseña incorrectos. ${rem} intento${rem!==1?'s':''} restante${rem!==1?'s':''}.`
        : 'Email o contraseña incorrectos';
    }
    err.classList.add('on');
    document.getElementById('lp').value='';
    document.getElementById('lp').focus();
  }finally{
    if(btn){btn.disabled=false;btn.textContent='Entrar →';}
  }
}

function logout(){
  // F5b: parar los timers del GUIADO al salir (el rest-banner clásico ya no existe).
  try{
    if(typeof GM!=='undefined'){
      if(GM.restTimer){clearInterval(GM.restTimer);GM.restTimer=null;}
      if(GM.hiit){clearInterval(GM.hiit);GM.hiit=null;}
      if(GM.holding&&typeof _gmEndHoldUI==='function')_gmEndHoldUI();
    }
    if(typeof _gmRemoveRestMini==='function')_gmRemoveRestMini();
    if(typeof relWake==='function')relWake();
  }catch(_e){}
  // Limpiar el contexto de push al salir (aviso Julián v320): sin esto, en la MISMA pestaña el
  // 2º asesorado hereda _pushCtx/flags del 1º → se salta su self-heal o reintenta con id ajeno
  // (RLS lo rechaza, pero desperdicia). Mata la clase de bug de contexto stale entre cuentas.
  try{ _pushCtx=null; _clientPushHealed=false; _clientPushPending=false; _coachPushHealed=false; }catch(_e){}
  // P0 (bug reportado por el PO, 2026-07-25): MISMA clase, un módulo más. El objeto CMTY guarda
  // el perfil, el código, los amigos y la BANDEJA DE MENSAJES de quien acaba de salir, y como
  // `renderCommunity()` corta con `if(!CMTY.loaded) cmtyLoad()`, la siguiente cuenta de esta
  // pestaña NO recargaba: veía la identidad de la anterior («en el perfil de Astrid aparecía el
  // mío»). Aquí no se recarga la página, así que el estado hay que devolverlo a cero a mano.
  try{ if(typeof cmtyResetIdentity==='function') cmtyResetIdentity(); }catch(_e){}
  // El uid de la sesión también es identidad: si sobrevive, las claves namespacadas de la
  // siguiente cuenta podrían escribirse con el uid del anterior antes de que entre.
  try{ _authUid=null; }catch(_e){}
  stopMsgPolling();
  // Si estábamos en modo auth: cerrar la sesión Supabase y restaurar el estado legacy
  // en memoria (la próxima cuenta legacy necesita el DB global, no el del usuario auth).
  if(AUTH_MODE){
    try{ AUTH.signOut(); }catch(e){}
    AUTH_MODE=false; AUTH_ROLE='client';
    DB.clients=ld('ax_c',[]);DB.msgs=ld('ax_m',{});DB.history=ld('ax_hist',{});DB.prs=ld('ax_pr',{});
    DB.bodyweight=ld('ax_bw',{});DB.medidas=ld('ax_med',{});DB.nutrition=ld('ax_nut',{});DB.photos=ld('ax_photos',{});
  }
  // Borrar sesión guardada — próxima vez pedirá login
  localStorage.removeItem('ax_session');
  showScreen('s-login');
  // Volver a la pantalla de bienvenida (no al formulario abierto)
  const _cta=document.getElementById('cin-cta'),_card=document.getElementById('cin-card');
  if(_cta)_cta.style.display='flex'; if(_card)_card.style.display='none';
  const _err=document.getElementById('lerr'); if(_err)_err.classList.remove('on');
  hideClientWelcome(); // cerrar el overlay de bienvenida si seguía visible
  CUR.loggedAs=null;CUR.clientId=null;
  // Pre-fill remembered email
  const rem=localStorage.getItem('ax_rem');
  const uEl=document.getElementById('lu');
  const remCk=document.getElementById('l-rem');
  if(rem&&uEl){uEl.value=rem;if(remCk)remCk.checked=true;}
  else{if(uEl)uEl.value='';if(remCk)remCk.checked=false;}
  document.getElementById('lp').value='';
}

function openSettings(){
  document.getElementById('st-name').value=getCoachName();
  document.getElementById('st-email').value=getCoachEmail();
  if(document.getElementById('st-site'))document.getElementById('st-site').value=getCoachSite();
  if(document.getElementById('st-nequi'))document.getElementById('st-nequi').value=DB.nequi||'';
  document.getElementById('st-cur').value='';
  document.getElementById('st-new').value='';
  document.getElementById('st-rep').value='';
  document.getElementById('st-perr').style.display='none';
  closeDrawer();om('m-settings');
  setTheme(ld('ax_theme','dark'));
  _syncFsBtns(ld('ax_textsize','normal'));
}

async function saveSettings(){
  const name=document.getElementById('st-name').value.trim();
  const email=document.getElementById('st-email').value.trim().toLowerCase();
  const site=document.getElementById('st-site')?document.getElementById('st-site').value.trim():'';
  const cur=document.getElementById('st-cur').value;
  const nw=document.getElementById('st-new').value;
  const rep=document.getElementById('st-rep').value;
  const perr=document.getElementById('st-perr');
  if(!name||!email){toast('⚠️ Nombre y email son obligatorios');return;}
  // Password change requested
  if(cur||nw||rep){
    const curOk=await verifyCoachPass(cur);
    if(!curOk){perr.textContent='La contraseña actual no es correcta';perr.style.display='block';return;}
    if(nw.length<6){perr.textContent='La nueva contraseña debe tener mínimo 6 caracteres';perr.style.display='block';return;}
    if(nw!==rep){perr.textContent='Las contraseñas nuevas no coinciden';perr.style.display='block';return;}
    try{ await saveCoachPass(nw); }
    catch(e){ perr.textContent='No se pudo cambiar la contraseña: '+((e&&e.message)||'error de red')+'. Intenta de nuevo.'; perr.style.display='block'; return; }
    perr.style.display='none';
  }
  sv('ax_cn',_b64enc(name));
  sv('ax_ce',_b64enc(email));
  if(site!==undefined)sv('ax_site',site);
  const nequi=document.getElementById('st-nequi')?document.getElementById('st-nequi').value.trim().replace(/\s/g,''):'';
  DB.nequi=nequi;sv('ax_nequi',nequi);
  document.getElementById('sb-nm').textContent=name;
  cm('m-settings');toast('✅ Configuración guardada');
}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));document.getElementById(id).classList.add('on')}

// ══════════ TEMPLATES + EXERCISE PROGRESS ══════════
function renderTemplates(){
  const con=document.getElementById('tpl-list');if(!con)return;
  const tpls=DB.templates||[];
  document.getElementById('tpl-lbl').textContent=tpls.length?`${tpls.length} plantilla${tpls.length!==1?'s':''} guardada${tpls.length!==1?'s':''}` :'Rutinas reutilizables para tus asesorados';
  if(!tpls.length){
    con.innerHTML=`<div class="empty" style="padding:50px">
      <div class="eico" style="color:var(--g2)">${typeof aviIcon==='function'?aviIcon('folder',34):'📂'}</div>
      <div class="etxt">Sin plantillas todavía</div>
      <div class="esub" style="margin-bottom:13px">Crea una rutina base y aplícala a cualquier asesorado en segundos</div>
      <button class="btn bp" onclick="openNewTemplate()">+ Nueva plantilla</button>
    </div>`;
    return;
  }
  con.innerHTML='';
  tpls.forEach(tpl=>{
    const exN=(tpl.exercises||[]).length;
    const totS=(tpl.exercises||[]).reduce((s,e)=>s+(parseInt(e.sets)||0),0);
    const div=document.createElement('div');div.className='rc';
    const tagHtml=tpl.tag?`<span class="tag tb" style="font-size:10px">${tpl.tag}</span>`:'';
    div.innerHTML=`
      <div class="rch" onclick="this.closest('.rc').classList.toggle('open')">
        <div class="rcnum" style="background:var(--bll);color:var(--bl)">${typeof aviIcon==='function'?aviIcon('folder',16):'📂'}</div>
        <div class="rci">
          <div class="rcname">${esc(tpl.name)} ${tagHtml}</div>
          <div class="rcmeta">${exN} ejercicio${exN!==1?'s':''} · ${totS} series · ${typeof aviIcon==='function'?aviIcon('timer',11):'⏱'}${tpl.restSec||60}s</div>
        </div>
        <div style="display:flex;gap:4px;margin-right:4px">
          <button class="btn bp bsm" style="padding:0 12px;min-height:36px;font-size:11px" onclick="event.stopPropagation();applyTemplateToClient('${tpl.id}')">Aplicar →</button>
          <button class="btn bg bsm" style="padding:0 9px;min-height:36px;justify-content:center" title="Editar plantilla" aria-label="Editar plantilla" onclick="event.stopPropagation();openEditTemplate('${tpl.id}')">${typeof aviIcon==='function'?aviIcon('pencil',14):'✏️'}</button>
          <button class="btn bd bsm" style="padding:0 9px;min-height:36px;justify-content:center" title="Eliminar plantilla" aria-label="Eliminar plantilla" onclick="event.stopPropagation();delTemplate('${tpl.id}')">${typeof aviIcon==='function'?aviIcon('trash',14):'🗑️'}</button>
        </div>
        <div class="rcchev">▼</div>
      </div>
      <div class="rcbody">
        ${tpl.note?`<div style="background:var(--yll);border-radius:var(--rsm);padding:8px 12px;font-size:12px;color:#7a5c00;margin-bottom:9px">💡 ${esc(tpl.note)}</div>`:''}
        ${!(tpl.exercises||[]).length?'<div style="color:var(--t3);font-size:13px">Sin ejercicios</div>':
          (tpl.exercises||[]).map(e=>`
            <div class="exrow">
              <div class="exicon" style="background:${MC[e.muscle]||'#ccc'}18;border:1px solid ${MC[e.muscle]||'#ccc'}30">${exIcon(e)}</div>
              <div><div class="exname">${esc(e.name)}</div><div class="exmet">${esc(e.muscle)} · ${esc(e.type)}</div></div>
              <div class="exsets">${exSetsCellHTML(e)}</div>
            </div>`).join('')}
        <div style="padding-top:10px;border-top:1px solid var(--br);margin-top:4px">
          <button class="btn bp bsm bfull" onclick="applyTemplateToClient('${tpl.id}')">${typeof aviIcon==='function'?aviIcon('clipboard',13):'📋'} Aplicar a un asesorado →</button>
        </div>
      </div>`;
    con.appendChild(div);
  });
}

function openNewTemplate(){
  editTplId=null;tplExs=[];tplRestSec=60;pickerTarget='template';
  document.getElementById('mt-title').textContent='Nueva plantilla';
  document.getElementById('save-tpl-btn').textContent='Guardar plantilla';
  ['tf-name','tf-tag','tf-note'].forEach(id=>document.getElementById(id).value='');
  document.querySelectorAll('#tf-rp .rp').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('#tf-rp .rp')[1].classList.add('on');
  renderTfExList();om('m-template');
}

function openEditTemplate(id){
  const tpl=DB.templates.find(t=>t.id===id);if(!tpl)return;
  editTplId=id;tplExs=(tpl.exercises||[]).map(e=>({...e}));tplRestSec=tpl.restSec||60;pickerTarget='template';
  document.getElementById('mt-title').textContent='Editar plantilla';
  document.getElementById('save-tpl-btn').textContent='Guardar cambios';
  document.getElementById('tf-name').value=tpl.name;
  document.getElementById('tf-tag').value=tpl.tag||'';
  document.getElementById('tf-note').value=tpl.note||'';
  const restMap={45:0,60:1,90:2,120:3,180:4};
  document.querySelectorAll('#tf-rp .rp').forEach(b=>b.classList.remove('on'));
  const idx=restMap[tplRestSec];
  if(idx!==undefined)document.querySelectorAll('#tf-rp .rp')[idx].classList.add('on');
  renderTfExList();om('m-template');
}

function selTR(sec,el){tplRestSec=sec;document.querySelectorAll('#tf-rp .rp').forEach(b=>b.classList.remove('on'));el.classList.add('on')}

function renderTfExList(){
  const con=document.getElementById('tf-exlist');
  if(!tplExs.length){
    con.innerHTML='<div style="color:var(--t3);font-size:13px;padding:14px 0;text-align:center;border:1.5px dashed var(--br2);border-radius:var(--rsm)">Toca "+ Añadir ejercicios" para comenzar</div>';
    return;
  }
  let html=`<div style="display:flex;align-items:center;padding:0 11px 4px;gap:9px">
    <div style="flex:1;font-size:10px;font-weight:700;color:var(--t3);letter-spacing:.5px">EJERCICIO</div>
    <div style="display:flex;gap:5px;align-items:center">
      <div style="width:52px;text-align:center;font-size:10px;font-weight:700;color:var(--bl);letter-spacing:.4px">SERIES</div>
      <div style="width:8px"></div>
      <div style="width:52px;text-align:center;font-size:10px;font-weight:700;color:var(--bl);letter-spacing:.4px">REPS</div>
      <div style="width:28px"></div>
    </div>
  </div>`;
  const inpSt=`width:52px;padding:6px 4px;border:1.5px solid var(--bl);border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;text-align:center;background:white;outline:none;color:var(--bl)`;
  tplExs.forEach((e,i)=>{
    html+=`<div style="display:flex;align-items:center;gap:9px;padding:9px 11px;background:var(--w);border:1px solid var(--br);border-left:3px solid ${MC[e.muscle]||'var(--bl)'};border-radius:var(--rsm);margin-bottom:6px">
      ${muscleIcon(e.muscle,20)}
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.name)}</div>
        <div style="font-size:11px;color:var(--t2)">${esc(e.muscle)} · ${esc(e.type)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
        <input type="number" inputmode="numeric" style="${inpSt}" value="${e.sets}" min="1" max="20"
          onchange="tplExs[${i}].sets=Math.max(1,parseInt(this.value)||1);this.value=tplExs[${i}].sets" onfocus="this.select()">
        <span style="color:var(--t3);font-size:14px;font-weight:700">×</span>
        <input type="number" inputmode="numeric" style="${inpSt}" value="${e.reps}" min="1" max="999"
          onchange="tplExs[${i}].reps=Math.max(1,parseInt(this.value)||1);this.value=tplExs[${i}].reps" onfocus="this.select()">
        <button onclick="tplExs.splice(${i},1);renderTfExList()"
          style="width:26px;height:26px;border-radius:50%;border:none;background:var(--rdl);color:var(--rd);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>
      </div>
    </div>`;
  });
  con.innerHTML=html;
}

function openPickerForTemplate(){pickerTarget='template';CUR.pkFilter='all';CUR.pkEnv='all';const es=document.getElementById('pk-env');if(es)es.value='all';buildFilterBtns('pk-f',pkFilter);renderPickerForTarget();om('m-picker')}

function renderPickerForTarget(){
  const list=document.getElementById('pk-list');
  const env=CUR.pkEnv||'all';
  const filtered=DB.exercises.filter(e=>(CUR.pkFilter==='all'||e.muscle===CUR.pkFilter)&&(env==='all'||(e.env||['gym']).includes(env)));
  const titleEl=document.getElementById('pk-title');
  // Fase C: modos "excluir 🚫" / "priorizar ⭐" → togglean la lista en c.genPrefs.
  if(pickerTarget==='exclude'||pickerTarget==='prefer'){
    const c=DB.clients.find(x=>x.id===CUR.clientId); if(!c){list.innerHTML='';return;}
    const p=genPrefs(c); const arr=p[pickerTarget];
    if(titleEl)titleEl.textContent=pickerTarget==='exclude'?'🚫 Excluir del generador':'⭐ Priorizar al generar';
    list.innerHTML='';
    filtered.forEach(ex=>{
      const on=arr.includes(ex.id);
      const col=pickerTarget==='exclude'?'var(--rd)':'var(--g)';
      const div=document.createElement('div');
      div.style.cssText=`display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--rsm);cursor:pointer;border:1.5px solid ${on?col:'var(--br)'};background:${on?col+'14':'var(--w)'};margin-bottom:3px;transition:background var(--dur-fast) var(--ease-out),border-color var(--dur-fast) var(--ease-out)`;
      div.innerHTML=`${muscleIcon(ex.muscle,20)}<div style="flex:1"><div style="font-size:13px;font-weight:600">${esc(ex.name)} ${envChips(ex.env)}</div><div style="font-size:11px;color:var(--t2)">${esc(ex.muscle)} · ${esc(ex.type)}</div></div><span style="font-size:17px;color:${on?col:'var(--t3)'}">${on?(pickerTarget==='exclude'?'🚫':'⭐'):'+'}</span>`;
      div.onclick=()=>{
        const i=arr.indexOf(ex.id);
        if(i>=0)arr.splice(i,1); else arr.push(ex.id);
        sv('ax_c',DB.clients);
        renderPickerForTarget(); _updateGenPrefBtns(c);
        if(CUR.genStyleId)genWithStyle(CUR.genStyleId); // refresca el borrador detrás
      };
      list.appendChild(div);
    });
    if(!filtered.length)list.innerHTML='<div style="text-align:center;padding:18px;color:var(--t3);font-size:13px">Sin ejercicios en esta categoría</div>';
    return;
  }
  // Sustituir (usuario en "Hoy"): elegir el reemplazo → _applySubstitute.
  if(pickerTarget==='substitute'){
    if(titleEl)titleEl.textContent='🔄 Cambiar ejercicio';
    list.innerHTML='';
    filtered.forEach(ex=>{
      const div=document.createElement('div');
      div.style.cssText='display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--rsm);cursor:pointer;border:1.5px solid var(--br);background:var(--w);margin-bottom:3px;transition:background var(--dur-fast) var(--ease-out),border-color var(--dur-fast) var(--ease-out)';
      div.innerHTML=`${muscleIcon(ex.muscle,20)}<div style="flex:1"><div style="font-size:13px;font-weight:600">${esc(ex.name)} ${envChips(ex.env)}</div><div style="font-size:11px;color:var(--t2)">${esc(ex.muscle)} · ${esc(ex.type)}</div></div><span style="font-size:17px;color:var(--g)">→</span>`;
      div.onclick=()=>_applySubstitute(ex);
      list.appendChild(div);
    });
    if(!filtered.length)list.innerHTML='<div style="text-align:center;padding:18px;color:var(--t3);font-size:13px">Sin ejercicios en esta categoría</div>';
    return;
  }
  if(titleEl)titleEl.textContent='Seleccionar ejercicio';
  const currentExs=pickerTarget==='template'?tplExs:CUR.routineExs;
  list.innerHTML='';
  filtered.forEach(ex=>{
    const already=currentExs.some(e=>e.id===ex.id);
    const div=document.createElement('div');
    div.style.cssText=`display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--rsm);cursor:pointer;border:1.5px solid ${already?'var(--g2)':'var(--br)'};background:${already?'var(--gl)':'var(--w)'};margin-bottom:3px;transition:background var(--dur-fast) var(--ease-out),border-color var(--dur-fast) var(--ease-out)`;
    div.innerHTML=`${muscleIcon(ex.muscle,20)}<div style="flex:1"><div style="font-size:13px;font-weight:600">${esc(ex.name)} ${envChips(ex.env)}</div><div style="font-size:11px;color:var(--t2)">${esc(ex.muscle)} · ${esc(ex.type)} · ${ex.sets}×${ex.reps}</div></div><span style="font-size:17px;color:${already?'var(--g)':'var(--t3)'}">${already?'✓':'+'}</span>`;
    div.onclick=()=>{
      if(already){toast('Ya está en la lista');return}
      if(pickerTarget==='template'){tplExs.push({...ex});renderTfExList();}
      else{CUR.routineExs.push({...ex});renderRfExList();}
      renderPickerForTarget();toast(`+ ${ex.name}`);
    };
    list.appendChild(div);
  });
  if(!filtered.length)list.innerHTML='<div style="text-align:center;padding:18px;color:var(--t3);font-size:13px">Sin ejercicios en esta categoría</div>';
}

function saveTemplate(){
  const name=document.getElementById('tf-name').value.trim();
  if(!name){toast('⚠️ Escribe un nombre para la plantilla');return}
  if(!tplExs.length){toast('⚠️ Añade al menos un ejercicio');return}
  const data={name,tag:document.getElementById('tf-tag').value.trim(),note:document.getElementById('tf-note').value.trim(),restSec:tplRestSec,exercises:tplExs.map(e=>({...e}))};
  if(editTplId){
    const i=DB.templates.findIndex(t=>t.id===editTplId);
    if(i!==-1)DB.templates[i]={...DB.templates[i],...data};
    toast(`✅ Plantilla "${name}" actualizada`);
  } else {
    DB.templates.push({id:uid(),...data,createdAt:new Date().toISOString()});
    toast(`✅ Plantilla "${name}" guardada`);
  }
  sv('ax_tpl',DB.templates);cm('m-template');renderTemplates();
}

function delTemplate(id){
  const tpl=DB.templates.find(t=>t.id===id);if(!tpl||!confirm(`¿Eliminar la plantilla "${tpl.name}"?`))return;
  DB.templates=DB.templates.filter(t=>t.id!==id);
  sv('ax_tpl',DB.templates);renderTemplates();toast('🗑️ Plantilla eliminada');
}

// Save existing routine as template from client detail
function saveRoutineAsTemplate(cid,ri){
  const c=DB.clients.find(x=>x.id===cid);if(!c)return;
  const r=c.routines[ri];if(!r)return;
  const name=r.name+' (plantilla)';
  DB.templates.push({id:uid(),name,tag:'',note:r.note||'',restSec:r.restSec||60,exercises:(r.exercises||[]).map((e,_ei,_arr)=>({...e})),createdAt:new Date().toISOString()});
  sv('ax_tpl',DB.templates);
  toast(`📂 "${r.name}" guardada como plantilla`);
}

// Apply template: opens client selector if needed
function applyTemplateToClient(tplId){
  const tpl=DB.templates.find(t=>t.id===tplId);if(!tpl)return;
  if(!DB.clients.length){toast('⚠️ Primero añade un asesorado');return}
  // If already in client detail, apply directly
  if(CUR.clientId){
    const c=DB.clients.find(x=>x.id===CUR.clientId);if(!c)return;
    openNewRoutineFromTemplate(tpl);
    cm('m-tpl-picker');
  } else {
    // Show client selector
    openTemplateClientSelector(tplId);
  }
}

function openTemplateClientSelector(tplId){
  const tpl=DB.templates.find(t=>t.id===tplId);if(!tpl)return;
  const list=document.getElementById('tpl-picker-list');
  list.innerHTML=`<div style="font-size:13px;color:var(--t2);margin-bottom:10px">¿A qué asesorado quieres aplicar <strong>"${esc(tpl.name)}"</strong>?</div>`;
  DB.clients.forEach(c=>{
    const div=document.createElement('div');
    div.style.cssText='display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--rsm);cursor:pointer;border:1.5px solid var(--br);background:var(--w);transition:background var(--dur-fast) var(--ease-out),border-color var(--dur-fast) var(--ease-out)';
    div.innerHTML=`<div class="cav" style="width:36px;height:36px;font-size:13px;background:${avc(c.name)}">${esc(ini(c.name))}</div><div style="flex:1"><div style="font-size:13px;font-weight:600">${esc(c.name)}</div><div style="font-size:11px;color:var(--t2)">${(c.routines||[]).length} rutina${(c.routines||[]).length!==1?'s':''}</div></div><span style="color:var(--g);font-size:13px;font-weight:700">Aplicar →</span>`;
    div.onmouseover=()=>{div.style.borderColor='var(--g2)';div.style.background='var(--gl)'};
    div.onmouseout=()=>{div.style.borderColor='var(--br)';div.style.background='var(--w)'};
    div.onclick=()=>{
      CUR.clientId=c.id;
      cm('m-tpl-picker');
      openNewRoutineFromTemplate(tpl);
    };
    list.appendChild(div);
  });
  om('m-tpl-picker');
}

function openNewRoutineFromTemplate(tpl){
  const c=DB.clients.find(x=>x.id===CUR.clientId);if(!c)return;
  CUR.editRoutineIdx=null;
  document.getElementById('mr-title').innerHTML=`Nueva rutina — <span style="color:var(--g)">${esc(c.name)}</span>`;
  document.getElementById('save-rut-btn').textContent='Guardar rutina';
  document.getElementById('rf-name').value=tpl.name.replace(' (plantilla)','');
  document.getElementById('rf-note').value=tpl.note||'';
  document.getElementById('rf-day').value='Lunes';
  document.getElementById('rf-shift').value='';
  CUR.routineExs=(tpl.exercises||[]).map(e=>({...e}));
  CUR.restSec=tpl.restSec||60;
  const restMap={45:0,60:1,90:2,120:3,180:4};
  document.querySelectorAll('#rf-rp .rp').forEach(b=>b.classList.remove('on'));
  const idx=restMap[CUR.restSec];
  if(idx!==undefined)document.querySelectorAll('#rf-rp .rp')[idx].classList.add('on');
  renderRfExList();
  // Go to client detail first
  openDetail(CUR.clientId);
  setTimeout(()=>om('m-routine'),50);
  toast(`📂 Plantilla "${tpl.name}" cargada`);
}

function openTemplatePicker(){
  if(!DB.templates.length){toast('⚠️ No tienes plantillas guardadas aún');return}
  const list=document.getElementById('tpl-picker-list');
  list.innerHTML='<div style="font-size:13px;color:var(--t2);margin-bottom:10px">Elige una plantilla para cargar:</div>';
  DB.templates.forEach(tpl=>{
    const exN=(tpl.exercises||[]).length;
    const div=document.createElement('div');
    div.style.cssText='display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--rsm);cursor:pointer;border:1.5px solid var(--br);background:var(--w);transition:background var(--dur-fast) var(--ease-out),border-color var(--dur-fast) var(--ease-out);margin-bottom:4px';
    div.innerHTML=`<span style="font-size:22px">📂</span><div style="flex:1"><div style="font-size:13px;font-weight:700">${esc(tpl.name)}</div><div style="font-size:11px;color:var(--t2)">${exN} ejercicio${exN!==1?'s':''} · ⏱${tpl.restSec||60}s${tpl.tag?` · <span style="color:var(--bl)">${esc(tpl.tag)}</span>`:''}</div></div><span style="color:var(--g);font-size:13px;font-weight:700">Usar →</span>`;
    div.onmouseover=()=>{div.style.borderColor='var(--g2)';div.style.background='var(--gl)'};
    div.onmouseout=()=>{div.style.borderColor='var(--br)';div.style.background='var(--w)'};
    div.onclick=()=>{
      cm('m-tpl-picker');
      // Populate routine modal with template data
      document.getElementById('rf-name').value=tpl.name.replace(' (plantilla)','');
      document.getElementById('rf-note').value=tpl.note||'';
      CUR.routineExs=(tpl.exercises||[]).map(e=>({...e}));
      CUR.restSec=tpl.restSec||60;
      const restMap={45:0,60:1,90:2,120:3,180:4};
      document.querySelectorAll('#rf-rp .rp').forEach(b=>b.classList.remove('on'));
      const idx=restMap[CUR.restSec];
      if(idx!==undefined)document.querySelectorAll('#rf-rp .rp')[idx].classList.add('on');
      renderRfExList();
      toast(`📂 "${tpl.name}" cargada`);
    };
    list.appendChild(div);
  });
  om('m-tpl-picker');
}

// ══════════════════════ EXERCISE PROGRESS ══════════════════════

// Build a map: { exName → [{date, maxKg, totalVol, sessions}] } from history
function buildExerciseProgress(clientId){
  if(!DB.history)DB.history=ld('ax_hist',{});
  // Agregación pura → avi-core.js (computeExerciseProgress); aquí solo el acceso a DB.
  return computeExerciseProgress(DB.history[clientId]||[]);
}

// Draw inline SVG line chart for kg progression
function drawExProgChart(container, points, color, unit){
  if(!points.length)return;
  unit=unit||'kg';
  const W=Math.max(container.offsetWidth||window.innerWidth-80||260,200);
  const H=72;const pad=8;const chartW=W-pad*2;const chartH=H-18;
  const vals=points.map(p=>p.maxKg);
  const maxV=Math.max(...vals)||1;const minV=Math.min(...vals);
  const span=maxV-minV||1;
  const pts=points.map((p,i)=>({
    x:pad+i*(chartW/Math.max(points.length-1,1)),
    y:6+chartH-((p.maxKg-minV)/span)*chartH,
    p
  }));
  const pathD=pts.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD=`${pathD} L${pts[pts.length-1].x.toFixed(1)},${H} L${pts[0].x.toFixed(1)},${H} Z`;
  const trend=points[points.length-1].maxKg-points[0].maxKg;
  // Tokens de gráfica (C6): claro = verde/coral de siempre, oscuro = menta/coral del tema.
  // var() NO vale en atributos SVG → todos los colores van en style= (gotcha en styles.css).
  const lineColor=color||(trend>=0?'var(--chart-g)':'var(--chart-or)');
  container.innerHTML=`<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <defs><linearGradient id="epg${Math.random().toString(36).slice(2)}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" style="stop-color:${lineColor}" stop-opacity="0.15"/>
      <stop offset="100%" style="stop-color:${lineColor}" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${areaD}" style="fill:${lineColor}" fill-opacity="0.12"/>
    <path d="${pathD}" fill="none" style="stroke:${lineColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${pts.map((p,i)=>{
      // extremos anclados start/end para que la etiqueta no se salga del borde (patrón v336)
      const anc=i===0?'start':i===pts.length-1?'end':'middle';
      const lx=i===0?pad:i===pts.length-1?(W-pad):p.x;
      return `
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${points.length>12?2:3}" style="fill:${lineColor}"/>
      ${points.length<=8?`<text x="${lx.toFixed(1)}" y="${H-2}" text-anchor="${anc}" font-family="Plus Jakarta Sans,sans-serif" font-size="8.5" style="fill:var(--t3)">${p.p.dateStr}</text>`:''}`;
    }).join('')}
    ${pts.map((p,i)=>{
      const anc=i===0?'start':i===pts.length-1?'end':'middle';
      const lx=i===0?pad:i===pts.length-1?(W-pad):p.x;
      const ly=p.y<16?(p.y+12):(p.y-5); // el punto más alto voltea su etiqueta hacia abajo (no se recorta arriba)
      return `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anc}" font-family="JetBrains Mono,monospace" font-size="8" style="fill:${lineColor}" font-weight="600">${fmtMetric(p.p.maxKg,unit)}</text>`;
    }).join('')}
  </svg>`;
}

// Render exercise progress list into a container element
let _exProgOpen={}; // clientId -> mostrar TODOS los ejercicios (colapsado por defecto)
function renderExerciseProgressInto(con, clientId){
  if(!con)return;
  const exList=buildExerciseProgress(clientId);
  if(!exList.length){
    con.innerHTML='<div style="color:var(--t3);font-size:13px;text-align:center;padding:12px 0">Completa sesiones para ver tu progreso 💪</div>';
    return;
  }
  con.innerHTML='';
  const _open=_exProgOpen[clientId];
  const _shown=(exList.length>3 && !_open)?exList.slice(0,3):exList;
  _shown.forEach((ex,idx)=>{
    const pts=ex.points;
    const unit=ex.unit||'kg';
    const pr=Math.max(...pts.map(p=>p.maxKg));
    const first=pts[0].maxKg;const last=pts[pts.length-1].maxKg;
    const trend=last-first;
    const trendColor=trend>0?'var(--g)':trend<0?'var(--or)':'var(--t3)';
    const trendStr=trend===0?'estable':(trend>0?'+':'')+fmtMetric(trend,unit);
    const color=MC[ex.muscle]||'#0A7C5B';
    const cardId=`epc_${clientId}_${idx}`;

    const card=document.createElement('div');
    card.className='exprog-card';
    card.id=cardId;
    card.innerHTML=`
      <div class="exprog-header" onclick="document.getElementById('${cardId}').classList.toggle('open');
        if(document.getElementById('${cardId}').classList.contains('open')){
          const wrap=document.getElementById('${cardId}_chart');
          if(wrap&&!wrap.dataset.drawn){wrap.dataset.drawn='1';drawExProgChart(wrap,${JSON.stringify(pts)},'${color}','${unit}');}
        }">
        <div class="exprog-icon" style="background:${color}18;border:1px solid ${color}30">${muscleIcon(ex.muscle,20)}</div>
        <div style="flex:1;min-width:0">
          <div class="exprog-name">${esc(ex.name)}</div>
          <div style="font-size:11px;color:var(--t2);margin-top:1px">${pts.length} sesión${pts.length!==1?'es':''} · <span style="color:${trendColor};font-weight:600">${trendStr}</span></div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div class="exprog-pr">${fmtMetric(pr,unit)}</div>
          <div style="font-size:10px;color:var(--t3)">récord</div>
        </div>
        <div class="exprog-chev">▼</div>
      </div>
      <div class="exprog-body">
        <div class="exprog-sessions">${pts[0].dateStr} → ${pts[pts.length-1].dateStr}</div>
        <div id="${cardId}_chart" style="width:100%;min-height:72px"></div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:var(--t2)">
          <span>Inicio: <strong>${fmtMetric(first,unit)}</strong></span>
          <span>Actual: <strong style="color:${color}">${fmtMetric(last,unit)}</strong></span>
          <span>Récord: <strong style="color:var(--g)">${fmtMetric(pr,unit)}</strong></span>
        </div>
      </div>`;
    con.appendChild(card);
  });
  if(exList.length>3){
    const mb=document.createElement('button');
    mb.className='collapse-more';
    mb.textContent=_open?'Ver menos ▴':`Ver los ${exList.length} ejercicios ▾`;
    mb.onclick=()=>{_exProgOpen[clientId]=!_open;renderExerciseProgressInto(con,clientId);};
    con.appendChild(mb);
  }
}

// Client-side: render into profile tab
function renderClientExProgress(clientId){
  const con=document.getElementById('cn-exprog-list');
  if(con&&isFreeClient(DB.clients.find(x=>x.id===clientId))){con.innerHTML=premiumLockHTML('Progreso por ejercicio','Mira con gráficas cómo evoluciona cada ejercicio.');return;}
  renderExerciseProgressInto(con,clientId);
}

// Coach-side: render into detail panel
function renderCoachExProgress(clientId){
  const wrap=document.getElementById('d-exprog-wrap');
  const con=document.getElementById('d-exprog');
  if(!wrap||!con)return;
  const exList=buildExerciseProgress(clientId);
  wrap.style.display=exList.length?'block':'none';
  renderExerciseProgressInto(con,clientId);
}

// ── PANEL CARGAS ────────────────────────────────────────────
let _progFilter='all';
const _progMatches={};

function setProgFilter(f,el){
  _progFilter=f;
  document.querySelectorAll('#prog-filters .btn').forEach(b=>b.className='btn bg bsm');
  if(el)el.className='btn bp bsm';
  renderProgressPanel();
}

function renderProgressPanel(){
  const con=document.getElementById('prog-list');
  if(!con)return;
  if(!DB.history)DB.history=ld('ax_hist',{});
  const clients=DB.clients||[];
  if(!clients.length){
    con.innerHTML='<div class="empty" style="padding:36px"><div class="eico" style="color:var(--t3)">'+(typeof aviIcon==='function'?aviIcon('users',34):'👥')+'</div><div class="etxt">Sin asesorados todavía</div></div>';
    return;
  }
  con.innerHTML='';
  let anyShown=false;
  clients.forEach(c=>{
    const exList=buildExerciseProgress(c.id);
    if(!exList.length)return;
    const filtered=_progFilter==='up'
      ?exList.filter(e=>e.points.length>=2&&e.points[e.points.length-1].maxKg>e.points[0].maxKg)
      :_progFilter==='down'
      ?exList.filter(e=>e.points.length>=2&&e.points[e.points.length-1].maxKg<e.points[0].maxKg)
      :exList;
    if(!filtered.length)return;
    anyShown=true;
    const upCount=filtered.filter(e=>e.points.length>=2&&e.points[e.points.length-1].maxKg>e.points[0].maxKg).length;
    const dnCount=filtered.filter(e=>e.points.length>=2&&e.points[e.points.length-1].maxKg<e.points[0].maxKg).length;
    const card=document.createElement('div');
    card.className='pload-card';
    const bodyId=`plb_${c.id}`;
    card.innerHTML=`<div class="pload-hd" onclick="this.closest('.pload-card').classList.toggle('open')">
      <div class="cav" style="width:36px;height:36px;font-size:13px;flex-shrink:0">${esc(ini(c.name))}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:700">${esc(c.name)}</div>
        <div style="font-size:11px;color:var(--t2);margin-top:1px">${filtered.length} ejercicio${filtered.length!==1?'s':''} con historial</div>
      </div>
      <div style="display:flex;gap:4px;margin-right:6px">
        ${upCount?`<span class="tag tg" style="font-size:10px">↑ ${upCount}</span>`:''}
        ${dnCount?`<span class="tag tr" style="font-size:10px">↓ ${dnCount}</span>`:''}
      </div>
      <div class="pload-chev">▼</div>
    </div>
    <div class="pload-body" id="${bodyId}"></div>`;
    const body=card.querySelector(`#${bodyId}`);
    filtered.forEach((ex,idx)=>{
      const pts=ex.points;
      const unit=ex.unit||'kg';
      const lastKg=pts[pts.length-1].maxKg;
      const firstKg=pts[0].maxKg;
      const trend=lastKg-firstKg;
      const trendColor=trend>0?'var(--g)':trend<0?'var(--rd)':'var(--t3)';
      const trendStr=trend===0?'↔ estable':trend>0?`↑ +${fmtMetric(trend,unit)}`:`↓ ${fmtMetric(trend,unit)}`;
      const color=MC[ex.muscle]||'#0A7C5B';
      const chartId=`plch_${c.id}_${idx}`;
      const adjId=`plad_${c.id}_${idx}`;
      const matches=[];
      (c.routines||[]).forEach((r,ri)=>{
        (r.exercises||[]).forEach((e,ei)=>{
          if(e.name===ex.name)matches.push({ri,ei,rName:r.name,eSets:e.sets,eReps:e.reps});
        });
      });
      _progMatches[adjId]=matches;
      const wrap=document.createElement('div');
      wrap.innerHTML=`<div class="pex-row" onclick="togglePexRow('${chartId}')">
        <div style="width:28px;height:28px;border-radius:6px;background:${color}18;border:1px solid ${color}30;display:flex;align-items:center;justify-content:center;flex-shrink:0">${muscleIcon(ex.muscle,16)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(ex.name)}</div>
          <div style="font-size:10px;color:var(--t2)">${pts.length} sesión${pts.length!==1?'es':''}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-right:8px">
          <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700">${fmtMetric(lastKg,unit)}</div>
          <div style="font-size:10px;font-weight:600;color:${trendColor}">${trendStr}</div>
        </div>
        ${matches.length?`<button class="btn bg bsm" style="padding:4px 8px;font-size:11px;flex-shrink:0" onclick="event.stopPropagation();toggleAdjForm('${adjId}','${c.id}')">✏️ Ajustar</button>`:''}
        <span style="font-size:10px;color:var(--t3);flex-shrink:0;margin-left:2px">▾</span>
      </div>
      <div class="pex-chart-wrap" id="${chartId}" data-color="${color}" data-unit="${unit}"></div>
      <div class="pex-adj-form" id="${adjId}"></div>`;
      const chartEl=wrap.querySelector(`#${chartId}`);
      if(chartEl)chartEl.dataset.pts=JSON.stringify(pts);
      body.appendChild(wrap);
    });
    con.appendChild(card);
  });
  if(!anyShown){
    con.innerHTML='<div style="color:var(--t3);font-size:13px;text-align:center;padding:24px 0">Sin datos de progreso todavía. Los asesorados deben completar sesiones registradas.</div>';
  }
}

function togglePexRow(chartId){
  const chart=document.getElementById(chartId);if(!chart)return;
  chart.classList.toggle('show');
  if(chart.classList.contains('show')&&!chart.dataset.drawn){
    chart.dataset.drawn='1';
    drawExProgChart(chart,JSON.parse(chart.dataset.pts||'[]'),chart.dataset.color,chart.dataset.unit);
  }
}

function toggleAdjForm(adjId,cid){
  const form=document.getElementById(adjId);if(!form)return;
  if(form.classList.contains('show')){form.classList.remove('show');return;}
  const matches=_progMatches[adjId]||[];
  if(!matches.length){toast('Este ejercicio no está en ninguna rutina activa');return;}
  let html='';
  matches.forEach((m,mi)=>{
    html+=`<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
      <span style="font-size:11px;font-weight:600;color:var(--gt);min-width:80px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(m.rName)}">${esc(m.rName)}</span>
      <span style="font-size:11px;color:var(--t3)">Series</span>
      <input type="number" inputmode="numeric" id="ads_${adjId}_${mi}" value="${m.eSets}" min="1" max="20"
        style="width:46px;padding:5px 3px;border:1.5px solid var(--g);border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;text-align:center;background:white;outline:none;color:var(--g)">
      <span style="font-size:11px;color:var(--t3)">× Reps</span>
      <input type="number" inputmode="numeric" id="adr_${adjId}_${mi}" value="${m.eReps}" min="1" max="999"
        style="width:46px;padding:5px 3px;border:1.5px solid var(--g);border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;text-align:center;background:white;outline:none;color:var(--g)">
      <button class="btn bp bsm" style="padding:5px 10px;font-size:11px" onclick="saveAdjLoad('${adjId}','${cid}',${m.ri},${m.ei},${mi})">Guardar</button>
    </div>`;
  });
  form.innerHTML=html;
  form.classList.add('show');
}

function saveAdjLoad(adjId,cid,ri,ei,mi){
  const c=DB.clients.find(x=>x.id===cid);if(!c)return;
  const ex=(c.routines[ri]||{}).exercises?.[ei];if(!ex)return;
  const newSets=parseInt(document.getElementById(`ads_${adjId}_${mi}`)?.value)||ex.sets;
  const newReps=parseInt(document.getElementById(`adr_${adjId}_${mi}`)?.value)||ex.reps;
  ex.sets=Math.max(1,newSets);
  ex.reps=Math.max(1,newReps);
  sv('ax_c',DB.clients);
  document.getElementById(adjId)?.classList.remove('show');
  toast(`✅ ${esc(ex.name)} — ${ex.sets}×${ex.reps} guardado`);
  const matches=_progMatches[adjId]||[];
  if(matches[mi]){matches[mi].eSets=ex.sets;matches[mi].eReps=ex.reps;}
}

// ══════════ APP INIT ══════════
function initRememberMe(){
  const rem=localStorage.getItem('ax_rem');
  const uEl=document.getElementById('lu');
  const remCk=document.getElementById('l-rem');
  if(rem&&uEl){uEl.value=rem;if(remCk)remCk.checked=true;}
}

// ── Botón ATRÁS (Android/TWA): guard + handler. Registrados ANTES de la entrada de sesión
// (bug Camilo 2026-06-28: el `await _enterAuthSession` puede NO resolver; si este setup iba
// después, quedaba sin ejecutar y el atrás se salía a la primera). Función con guarda de una
// sola ejecución porque se llama TAMBIÉN en la rama catch del boot (latente auditoría
// 2026-06-30: si syncFromCloud lanzaba, la app mostraba el login pero el atrás salía en seco).
let _aviBackInstalled=false;
function _aviInstallBack(){
  if(_aviBackInstalled)return; _aviBackInstalled=true;
  history.pushState({aviGuard:1},'');
  window.addEventListener('popstate',_aviHandleBack);
}

// Boot: sync from cloud then show login
syncFromCloud().then(async ()=>{
  initTheme();
  initTextSize();
  initRememberMe();
  initPWA();
  _aviInstallBack();
  // ── Sesión Supabase Auth (cuentas nuevas): si existe, entrar en modo auth ──
  let authEntered=false;
  try{
    if(AUTH.ready()){
      const session=await AUTH.getSession();
      // Guard anti doble-entrada (regresión cazada 2026-07-06 con _test-coach-back):
      // si el usuario alcanzó a hacer login MIENTRAS esta cadena async del boot seguía
      // pendiente (red lenta + autofill; el harness E2E lo dispara siempre), getSession
      // devuelve la sesión recién creada por doLogin y el boot RE-ENTRABA completo:
      // segunda carga + segundo initClientView cuyo navReset tardío arrasaba el stack
      // del botón atrás (2 entradas → 0). Si ya estamos en modo auth, no re-entrar.
      if(session&&session.user&&!AUTH_MODE){
        // Retorno de "Conectar mi Google": programado ANTES del await (que puede quedar
        // pendiente, gotcha v216) y con settle para que el splash no tape el toast.
        setTimeout(()=>{ try{ _handleGoogleLinkReturn().catch(()=>{}); }catch(_e){} },1500);
        await _enterAuthSession(session.user); authEntered=true;
      } else if(session&&session.user&&AUTH_MODE){
        authEntered=true; // el login manual ya entró — no pisar su sesión ni su navegación
      }
    }
  }catch(e){ warn('AVI boot auth (cae a legacy):',e&&e.message); }
  // ── Auto-login legacy: restaurar sesión guardada (solo si no entró por auth) ──
  if(!authEntered) tryAutoLogin();
}).catch(e=>{
  // Red de seguridad del arranque: si algo en el boot lanza (migración, auth, DOM), NUNCA
  // dejar la app colgada en el splash ni en blanco — quitar el overlay y mostrar el login.
  // Auditoría 2026-06-21.
  warn('AVI: el arranque falló, cayendo al login:', e&&e.message);
  const ov=document.getElementById('avi-loading');
  if(ov){ ov.classList.add('fade'); setTimeout(()=>ov.remove(),300); }
  try{ _aviInstallBack(); }catch(_e){}
  try{ showScreen('s-login'); }catch(_e){}
});

async function tryAutoLogin(){
  try{
    const session = ld('ax_session', null);
    if(!session || (session.expiresAt && Date.now() > session.expiresAt)){
      localStorage.removeItem('ax_session');
      document.getElementById('lu')&&document.getElementById('lu').focus();
      return;
    }
    const _aviChat=new URLSearchParams(location.search).get('avi-chat');
    if(session.role === 'coach'){
      showScreen('s-coach');
      CUR.loggedAs = 'coach';
      initCoach();
      startMsgPolling();
      resetLoginAttempts();
      if(_aviChat)setTimeout(()=>openChatFor(_aviChat),600);
      if(Notification.permission==='granted') setTimeout(()=>{subscribePush('_coach');restoreNotifications();},3000);
    } else if(session.role === 'client'){
      const client = DB.clients.find(c => c.id === session.clientId);
      if(client){
        // Bloquear auto-login si suspendido o vencido
        if(!MS.canLogin(client)){
          localStorage.removeItem('ax_session');
          const st=MS.getStatus(client);
          const errEl=document.getElementById('lerr');
          // Revelar el formulario (la bienvenida lo oculta) para que se vea el mensaje
          const cta=document.getElementById('cin-cta'),card=document.getElementById('cin-card');
          if(cta)cta.style.display='none'; if(card)card.style.display='block';
          if(errEl){errEl.textContent=st==='inactive'?'Tu acceso está pausado. Escríbele a tu coach para reactivarlo 🟡':'Tu plan venció. Habla con tu coach para continuar entrenando 💪';errEl.classList.add('on');}
          const uEl=document.getElementById('lu');if(uEl)uEl.focus();
          return;
        }
        showScreen('s-client');
        CUR.loggedAs = 'client';
        CUR.clientId = client.id;
        initClientView(client);
        startMsgPolling();
        resetLoginAttempts();
        if(_aviChat)setTimeout(()=>openChatFor(_aviChat),600);
        if(Notification.permission==='granted') setTimeout(()=>{
          const trainingDays=(client.routines||[]).map(r=>r.day).filter(d=>d&&d!=='Libre');
          const shiftMap={};(client.routines||[]).forEach(r=>{if(r.day&&r.day!=='Libre'&&r.shift)shiftMap[r.day]=r.shift;});
          subscribePush(client.id,trainingDays,Object.keys(shiftMap).length?shiftMap:null);
        },4000);
      } else {
        localStorage.removeItem('ax_session');
        document.getElementById('lu')&&document.getElementById('lu').focus();
      }
    }
  }catch(e){
    warn('tryAutoLogin error:',e);
    localStorage.removeItem('ax_session');
    document.getElementById('lu')&&document.getElementById('lu').focus();
  }
}

// ══════════════════════ COACH INIT ══════════════════════
function initCoach(){migrateExercises();dedupeExercises();
  navReset(null); // botón atrás: limpia el stack del cliente al entrar como coach
  // curTab = el panel que queda visible (Inicio en login fresco, o el último al volver de
  // "Mi entrenamiento") → desde ahí el atrás recorre los paneles del coach paso a paso.
  const _onP=document.querySelector('#s-coach .panel.on'); AVINAV.curTab=(_onP&&_onP.id)||'p-home';
  const h=new Date().getHours();
  document.getElementById('greeting').textContent=(h<13?'Buenos días':h<20?'Buenas tardes':'Buenas noches')+' 👋';
  document.getElementById('sb-nm').textContent=getCoachName();
  document.getElementById('sb-av').textContent='C';
  renderAll();
  // Push del coach: self-heal + tarjeta AQUÍ (no solo dentro de renderHome, que hace
  // early-return con 0 asesorados y se saltaría el fix crítico; aviso Lucas v318).
  if(typeof ensureCoachPush==='function')ensureCoachPush();
}
function renderAll(){renderHome();renderClients();renderExercises();renderMsgs();renderTemplates();document.getElementById('bdg').textContent=DB.clients.length}

// ── NAVIGATION ──
// Manejador del botón ATRÁS. Un solo "guard" en el historial que se RE-EMPUJA en cada atrás
// manejado, para no agotar el historial nunca. Orden: 1) overlay/habitación de arriba →
// cerrar; 2) un paso del stack de pestañas → deshacer; 3) coach en detalle → lista;
// 3b) cliente fuera de Inicio con stack vacío → ir a Inicio; 4) en Inicio → doble-atrás.
function _aviHandleBack(){
  // 0) Overlay con su propia capa de historial (navOpenLayer): habitaciones .sroom Y TAMBIÉN
  // la ficha de ejercicio (#exdetail-bg) y el lightbox (#ex-lightbox) desde v243 — se abren
  // sobre las salas y sin capa propia le "robaban" el descuento a la sala de abajo (#7
  // auditoría 2026-06-30). El atrás físico YA consumió su entrada al disparar este popstate:
  // cerrar lo de más arriba y DESCONTAR la capa, SIN re-empujar — eso arregla el bug del TWA
  // (ver nota en app-1-infra.js).
  if(AVINAV.layers>0){ _aviCloseTopOverlay(); AVINAV.layers--; return; }
  // 1) Overlays/modales legacy (no empujan capa propia) → cerrar con re-empuje del guard único.
  if(_aviCloseTopOverlay()){ history.pushState({aviGuard:1},''); return; }
  // 2) Stack de navegación (pestañas del cliente) → retroceder un paso.
  if(AVINAV.stack.length){ const s=AVINAV.stack.pop(); try{ s.undo&&s.undo(); }catch(e){} history.pushState({aviGuard:1},''); return; }
  // 3) Coach en detalle de un asesorado → volver a la lista.
  const detail=document.getElementById('p-detail');
  if(detail&&detail.classList.contains('on')){
    gp('p-clients',document.getElementById('sbi-clients'),'Asesorados',true);
    const navItems=document.querySelectorAll('.cbnav-item'); if(navItems[1])setBottomNav(navItems[1]);
    history.pushState({aviGuard:1},''); return;
  }
  // 3b) Cliente fuera de Inicio con el stack ya vacío → ir a Inicio (último colchón).
  const sc=document.getElementById('s-client');
  if(sc&&getComputedStyle(sc).display!=='none'){
    const cur=document.querySelector('#s-client .cnp.on');
    if(cur&&cur.id!=='cn-today'){ cnTab('cn-today',_cnTabEl('cn-today'),true); AVINAV.stack.length=0; history.pushState({aviGuard:1},''); return; }
  }
  // 4) En el INICIO → doble atrás para salir.
  if(AVINAV.exitArmed){ AVINAV.exitArmed=false; history.go(-1); return; }
  AVINAV.exitArmed=true; if(typeof toast==='function')toast('Presiona atrás otra vez para salir 👋');
  history.pushState({aviGuard:1},''); setTimeout(function(){ AVINAV.exitArmed=false; }, 2000);
}
// Cierra el overlay/habitación/modal de más arriba si hay uno abierto. true si cerró algo.
function _aviCloseTopOverlay(){
  // Chat de pantalla completa del coach (v321): overlay de tope del lado coach → se cierra primero.
  const cch=document.getElementById('coach-chat');
  if(cch&&cch.classList.contains('on')){ if(typeof _closeCoachChat==='function')_closeCoachChat(); else cch.classList.remove('on'); return true; }
  // Chat en vivo de comunidad (① DMs, lado asesorado) — overlay de tope, se cierra primero.
  const cmc=document.getElementById('cmty-chat');
  if(cmc&&cmc.classList.contains('on')){ if(typeof _cmtyChatClose==='function')_cmtyChatClose(); else cmc.classList.remove('on'); return true; }
  // El lightbox (foto/video ampliado) se abre ENCIMA de la ficha de ejercicio → se cierra
  // PRIMERO. Regresión cazada en la auditoría 2026-07-01: al mover la ficha al tope
  // (caso ficha-sobre-habitación) el atrás cerraba la ficha POR DEBAJO del lightbox y
  // dejaba la imagen ampliada huérfana (el fix original era de apex-v105).
  const lb=document.getElementById('ex-lightbox');
  if(lb&&lb.classList.contains('on')){closeExImg();return true;}
  // La ficha de ejercicio (técnica/video) puede abrirse ENCIMA de una habitación (su z se
  // sube por encima de la habitación al abrirla), así que se cierra ANTES que las habitaciones.
  const exdTop=document.getElementById('exdetail-bg');
  if(exdTop&&exdTop.classList.contains('on')){_closeExDetail();return true;}
  // Orden = de la más "encima" a la más "abajo" en la pila de habitaciones:
  // ejercicio (puede ir sobre sesión o mes) → sesión (puede ir sobre rutina) →
  // récord/mes (hojas) → rutina (base).
  const exr=document.getElementById('exercise-room');
  if(exr&&exr.classList.contains('on')){closeExerciseRoom();return true;}
  const sr=document.getElementById('session-room');
  if(sr&&sr.classList.contains('on')){closeSessionRoom();return true;}
  const rr=document.getElementById('record-room');
  if(rr&&rr.classList.contains('on')){closeRecordRoom();return true;}
  const mr=document.getElementById('month-room');
  if(mr&&mr.classList.contains('on')){closeMonthRoom();return true;}
  const rtr=document.getElementById('routine-room');
  if(rtr&&rtr.classList.contains('on')){closeRoutineRoom();return true;}
  const mscr=document.getElementById('muscle-room');
  if(mscr&&mscr.classList.contains('on')){closeMuscleRoom();return true;}
  const nutr=document.getElementById('nutrition-room');
  if(nutr&&nutr.classList.contains('on')){closeNutritionRoom();return true;}
  const csr=document.getElementById('coach-stat-room');
  if(csr&&csr.classList.contains('on')){closeCoachStat();return true;}
  // El mini-modal de config HIIT (v301) se abre ENCIMA de la biblioteca de rápidos → el
  // atrás lo cierra a ÉL primero (si no, cerraría la sala por debajo y lo dejaría huérfano
  // — misma clase de bug que el lightbox sobre la ficha, auditoría 2026-07-01).
  const qwc=document.getElementById('m-qwcfg');
  if(qwc&&qwc.classList.contains('on')){_qwCfgSpec=null;qwc.classList.remove('on');return true;}
  const qwr=document.getElementById('quickwo-room');
  if(qwr&&qwr.classList.contains('on')){closeQuickRoom();return true;}
  const pu=document.getElementById('premium-upsell');
  if(pu&&pu.classList.contains('on')){closePremiumUpsell();return true;}
  const luo=document.getElementById('level-up');
  if(luo&&luo.classList.contains('on')){closeLevelUp();return true;}
  const wfo=document.getElementById('workout-finish');
  if(wfo&&wfo.classList.contains('on')){closeWorkoutFinish();return true;}
  // Tour de novedades (v304): el atrás lo cierra y marca visto (como "Saltar").
  const ntw=document.getElementById('news-tour');
  if(ntw&&!ntw.classList.contains('hidden')){if(typeof ntClose==='function')ntClose(false);else ntw.classList.add('hidden');return true;}
  // (el chequeo duplicado de #exdetail-bg que vivía aquí era código muerto — la ficha
  // ya se atiende arriba, tras el lightbox)
  // Descanso del guiado (overlay a pantalla completa, sin capa propia): el atrás lo
  // MINIMIZA a banner (pedido Camilo 2026-07-06 — el conteo sigue y el usuario puede ver
  // el siguiente ejercicio). En isométrico (GM.holding) el atrás sí CANCELA el crono
  // (acción explícita, v245). Antes el atrás saltaba el descanso completo.
  const gmRestOv=document.getElementById('gm-rest-overlay');
  if(gmRestOv&&!gmRestOv.classList.contains('hidden')){
    // Plancha (hold sin cardio): el atrás CANCELA el crono (v245). Descanso y CARDIO
    // (largo, ej. 20 min): el atrás MINIMIZA al banner — el conteo sigue.
    if(typeof GM!=='undefined'&&GM.holding&&!GM.holding.cardio){ if(typeof gmSkipRest==='function')gmSkipRest(); }
    else if(typeof gmMinimizeRest==='function'){ gmMinimizeRest(); }
    return true;
  }
  // (El guiado EMBEBIDO (F2, clase gm-embedded) es un TAB, no un overlay → el atrás sigue el
  // flujo de pestañas, no se cierra aquí. El viejo guiado como OVERLAY, que sí se cerraba aquí,
  // murió con la clásica (avi-v291) y su rama se borró en la auditoría 2026-07-13 — era
  // inalcanzable: nada más produce #guided-mode visible-sin-gm-embedded tras borrar openGuidedMode.)
  const modal=document.querySelector('.mdbg.on');
  if(modal){modal.classList.remove('on');return true;}
  return false;
}

// Botón atrás (coach): metadata de cada panel para reconstruir la navegación al retroceder.
// nav = índice en la barra inferior móvil (.cbnav-item); -1 = sin entrada en esa barra.
const _COACH_PANELS={
  'p-home':{sbi:'sbi-home',title:'Inicio',nav:0},
  'p-clients':{sbi:'sbi-clients',title:'Asesorados',nav:1},
  'p-progress':{sbi:'sbi-progress',title:'Cargas',nav:2},
  'p-exercises':{sbi:'sbi-exercises',title:'Ejercicios',nav:3},
  'p-templates':{sbi:'sbi-templates',title:'Plantillas',nav:-1},
  'p-msgs':{sbi:'sbi-msgs',title:'Mensajes',nav:4},
  'p-detail':{sbi:'sbi-clients',title:'Detalle',nav:1},
};
// Restaura un panel previo del coach SIN registrar (lo usa el "undo" del stack del botón atrás).
// p-detail recrea el detalle del asesorado que estaba abierto; si ya no existe (borrado) cae a la lista.
function _coachRestore(snap){
  if(snap.id==='p-detail'){
    const exists=snap.cid&&(DB.clients||[]).some(x=>x.id===snap.cid);
    if(exists&&typeof openDetail==='function'){ openDetail(snap.cid,true); return; }
    gp('p-clients',document.getElementById('sbi-clients'),'Asesorados',true);
    const it=document.querySelectorAll('.cbnav-item'); if(it[1])setBottomNav(it[1]);
    return;
  }
  const m=_COACH_PANELS[snap.id]; if(!m)return;
  gp(snap.id,document.getElementById(m.sbi),m.title,true);
  const items=document.querySelectorAll('.cbnav-item'); if(m.nav>=0&&items[m.nav])setBottomNav(items[m.nav]);
  if(snap.id==='p-progress'&&typeof renderProgressPanel==='function')renderProgressPanel();
}
function gp(id,sidebarEl,pageTitle,_silent){
  // Botón atrás (coach): registrar el salto de panel SOLO en navegación REAL hacia adelante.
  // _silent (undo del stack + navegaciones "hacia atrás") solo sincroniza la pestaña sin registrar.
  if(_silent){ AVINAV.curTab=id; }
  else if(id!==AVINAV.curTab){
    const prev=AVINAV.curTab;
    if(prev&&_COACH_PANELS[prev]){ const snap={id:prev,cid:CUR.clientId}; navRecord(function(){ _coachRestore(snap); }); }
    AVINAV.curTab=id;
  }
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.sbi').forEach(s=>s.classList.remove('on'));
  document.getElementById(id).classList.add('on');
  if(sidebarEl) sidebarEl.classList.add('on');
  // Update topbar title
  const tp=document.getElementById('topbar-page');
  if(tp&&pageTitle) tp.textContent=pageTitle;
  // Show/hide topbar action button
  const ab=document.getElementById('topbar-action-btn');
  if(ab) ab.style.display=(id==='p-clients'||id==='p-home')?'flex':'none';
  // Navegar a Asesorados = lista fresca: limpiar el buscador y mostrar a todos (C2 auditoría
  // 2026-07-13). El poll de 15s conserva el filtro (renderClients lo re-aplica); SÓLO navegar
  // lo resetea. filterClients('') quita el display:none heredado de un filtro anterior en el DOM.
  if(id==='p-clients'){ const _s=document.getElementById('cli-search'); if(_s&&_s.value){ _s.value=''; if(typeof filterClients==='function')filterClients(''); } }
  closeDrawer();
}

function openDrawer(){
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('drawer-overlay').classList.add('on');
}
function closeDrawer(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('on');
}
function setBottomNav(el){
  document.querySelectorAll('.cbnav-item').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');
}

// ══════════════════════ MEMBRESÍA ══════════════════════
// MS (membresía: getStatus/canLogin/badge) → avi-core.js (fuente única, testeada)

function renderPaymentCard(client){
  const con=document.getElementById('cn-payment-card');
  if(!con)return;
  const nequi=DB.nequi||ld('ax_nequi','');
  const st=MS.getStatus(client);
  if(!nequi||st!=='expiring'){con.innerHTML='';return;}
  const pays=(client.payments||[]).slice().sort((a,b)=>new Date(b.dueDate)-new Date(a.dueDate));
  const last=pays[0];
  const dueStr=last?new Date(last.dueDate).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}):'';
  const amount=last&&last.amount?'$'+Number(last.amount).toLocaleString('es-CO')+' COP':'';
  con.innerHTML=`<div style="background:var(--yll);border:1.5px solid var(--yl);border-radius:var(--r);padding:14px 16px">
    <div style="font-size:13px;font-weight:800;color:var(--t1);margin-bottom:4px">💳 Tu plan vence pronto</div>
    ${dueStr?`<div style="font-size:12px;color:var(--t2);opacity:.85;margin-bottom:10px">Vence: ${dueStr}${amount?' · '+amount:''}</div>`:''}
    <div style="font-size:12px;color:var(--t2);margin-bottom:6px">Paga por <strong>Nequi</strong> al número de tu coach:</div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <div style="font-size:20px;font-weight:800;letter-spacing:1px;color:var(--t1);font-family:'JetBrains Mono',monospace">${esc(nequi)}</div>
      <button onclick="copyNequi('${esc(nequi)}')" style="font-size:11px;padding:5px 12px;border-radius:20px;border:1px solid var(--br2);background:var(--bg);color:var(--t2);cursor:pointer;font-family:inherit;font-weight:600">Copiar</button>
    </div>
    <button onclick="notifyPaid()" style="width:100%;padding:11px;background:var(--g);color:white;border:none;border-radius:var(--rsm);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">✅ Ya pagué — Notificar al coach</button>
  </div>`;
}

function copyNequi(num){
  navigator.clipboard.writeText(num).then(()=>toast('📋 Número copiado')).catch(()=>toast('Número: '+num));
}

async function notifyPaid(){
  const clientId=CUR.clientId;
  const client=DB.clients.find(c=>c.id===clientId);
  if(!client)return;
  const text='✅ Ya realicé mi pago — por favor confírmame cuando lo veas 🙏';
  if(!DB.msgs[clientId])DB.msgs[clientId]=[];
  DB.msgs[clientId].push({from:'client',text,date:new Date().toISOString()});
  svNow('ax_m',DB.msgs);
  renderClientMsgs(clientId);
  pushToClient('_coach','💳 '+client.name+' notificó su pago','Revisa y confirma el pago en AVI',{type:'payment',tag:'avi-payment-'+clientId});
  toast('✅ Notificación enviada a tu coach');
}


// ══════════════════════ HOME ══════════════════════
function renderHome(){
  const now=new Date();
  const y=now.getFullYear(), mo=now.getMonth();
  const weekAgo=new Date(Date.now()-7*24*60*60*1000);

  // ── Ingresos del mes ──
  let ingr=0;
  DB.clients.forEach(c=>{
    (c.payments||[]).forEach(p=>{
      const d=new Date(p.date);
      if(d.getFullYear()===y&&d.getMonth()===mo) ingr+=(parseFloat(p.amount)||0);
    });
  });
  const elIngr=document.getElementById('h-ingr');if(elIngr)elIngr.textContent='$'+ingr.toLocaleString('es-CO');

  // ── Activos ──
  const activos=DB.clients.filter(c=>{ const s=MS.getStatus(c); return s==='active'||s==='expiring'; }).length;
  const elActv=document.getElementById('h-actv');if(elActv)elActv.textContent=activos;

  // ── Sesiones esta semana ──
  let sesiones=0;
  Object.values(DB.history||{}).forEach(arr=>{
    (arr||[]).forEach(s=>{ if(new Date(s.date)>=weekAgo) sesiones++; });
  });
  const elSess=document.getElementById('h-sess');if(elSess)elSess.textContent=sesiones;

  // ── Entrenaron HOY (quién, con nombre + rutina + hora) ──
  const todayBanner=document.getElementById('h-today-banner');
  if(todayBanner){
    const hoy=clientsTrainedToday(DB.clients,DB.history,now);
    if(hoy.length){
      todayBanner.style.display='block';
      todayBanner.innerHTML=`<div class="card" style="border-left:3px solid var(--g);padding:10px 14px">
        <div style="font-size:12px;font-weight:700;color:var(--g);margin-bottom:6px">${typeof aviIcon==='function'?aviIcon('check',13):'✅'} ${hoy.length} ${hoy.length>1?'asesorados entrenaron':'asesorado entrenó'} hoy</div>
        ${hoy.map(({client:c,sessions:sess})=>{
          const rutinas=[...new Set(sess.map(s=>s.routineName).filter(Boolean))].join(', ');
          const hora=new Date(sess[0].date).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-top:1px solid var(--br);cursor:pointer" onclick="openDetail('${esc(c.id)}')">
            <div style="min-width:0;flex:1">
              <div style="font-size:13px;font-weight:600">${esc(c.name)}</div>
              <div style="font-size:11px;color:var(--t2)">${typeof aviIcon==='function'?aviIcon('dumbbell',12):'🏋️'} ${esc(rutinas||'Entrenó')}${sess.length>1?` · ${sess.length} sesiones`:''}</div>
            </div>
            <span style="font-size:11px;color:var(--t3);flex-shrink:0">${esc(hora)}</span>
          </div>`;
        }).join('')}
      </div>`;
    } else {
      todayBanner.style.display='none';
    }
  }

  // ── Sin entrenar 4+ días (con membresía activa) ──
  const inactivos=DB.clients.filter(c=>{
    const st=MS.getStatus(c);
    if(st==='inactive'||st==='overdue'||st==='suspended')return false;
    return daysSinceLastSession(DB.history[c.id]||[],now)>=4;
  }).length;
  const vencEl=document.getElementById('h-venc');
  if(vencEl){
    vencEl.textContent=inactivos;
    vencEl.style.color=inactivos>0?'var(--rd)':'var(--g)';
  }

  // ── Retención semanal (barras SVG por día) ──
  const retCard=document.getElementById('h-retention-card');
  const retBars=document.getElementById('h-ret-bars');
  const retLbl=document.getElementById('h-ret-label');
  if(retCard&&retBars){
    // Lógica de fechas extraída a avi-core.js (testeada): agrupa por día de
    // calendario real, no por día de la semana.
    const ordered=retentionByDay(DB.history,now);
    const maxC=Math.max(...ordered.map(o=>o.count),1);
    const totalEnt=weeklyActiveCount(DB.history,now,DB.clients.map(c=>c.id));
    const ret=DB.clients.length?Math.round(totalEnt/DB.clients.length*100):0;
    if(retLbl) retLbl.textContent=`${ret}% entrenaron esta semana`;
    retBars.innerHTML=`<div style="display:flex;align-items:flex-end;gap:6px;height:60px">${
      ordered.map(o=>{
        const h=Math.max(4,Math.round(o.count/maxC*52));
        const col=o.count===0?'var(--br2)':o.count<2?'var(--bll)':o.count<4?'var(--bl)':'var(--g)';
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
          <div style="font-size:9px;color:var(--t2)">${o.count||''}</div>
          <div style="height:${h}px;width:100%;background:${col};border-radius:4px 4px 0 0;transition:height .3s"></div>
          <div style="font-size:9px;color:var(--t3)">${o.label}</div>
        </div>`;
      }).join('')
    }</div>`;
    retCard.style.display=DB.clients.length?'':'none';
  }

  // ── Banner de vencimientos próximos ──
  const banner=document.getElementById('h-expiry-banner');
  if(banner){
    const in5days=new Date(Date.now()+5*24*60*60*1000);
    const expiring=DB.clients.filter(c=>{
      const pays=(c.payments||[]).slice().sort((a,b)=>new Date(b.dueDate)-new Date(a.dueDate));
      if(!pays.length)return false;
      const due=new Date(pays[0].dueDate);
      const st=MS.getStatus(c);
      return (st==='expiring'||st==='overdue')&&due<=in5days;
    });
    if(expiring.length){
      banner.style.display='block';
      banner.innerHTML=`<div class="card" style="border-left:3px solid var(--or);padding:10px 14px">
        <div style="font-size:12px;font-weight:700;color:var(--or);margin-bottom:6px">${typeof aviIcon==='function'?aviIcon('alert',13):'⚠️'} ${expiring.length} plan${expiring.length>1?'es':''} vence${expiring.length>1?'n':''} en 5 días</div>
        ${expiring.map(c=>{
          const pays=(c.payments||[]).slice().sort((a,b)=>new Date(b.dueDate)-new Date(a.dueDate));
          const dStr=new Date(pays[0].dueDate).toLocaleDateString('es-CO',{day:'2-digit',month:'short'});
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-top:1px solid var(--br)">
            <span style="font-size:13px;font-weight:600">${esc(c.name.split(' ')[0])} ${esc(c.name.split(' ')[1]||'')}</span>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:11px;color:var(--t2)">${dStr}</span>
              <button class="btn bo bsm" style="font-size:11px;padding:3px 8px" onclick="whatsappReminder('${esc(c.id)}')">WhatsApp</button>
            </div>
          </div>`;
        }).join('')}
      </div>`;
    } else {
      banner.style.display='none';
    }
  }

  // ── Banner de adherencia: quién dejó de entrenar (accionable) ──
  // Umbral adaptado a la frecuencia de cada quien: si entrena `days`/sem, su hueco
  // normal es ~7/days; lo marcamos si lleva 2+ días por encima de su ritmo. Nunca
  // entrenado (con plan vigente) = urgente. Solo membresías vigentes (lo vencido lo
  // cubre el banner de pagos).
  const adhBanner=document.getElementById('h-adherence-banner');
  if(adhBanner){
    const dormidos=DB.clients.filter(c=>{
      const st=MS.getStatus(c);
      if(st==='inactive'||st==='overdue'||st==='suspended')return false;
      const last=(DB.history[c.id]||[])[0];
      if(!last)return true; // vigente y nunca entrenó
      const dd=Math.floor((Date.now()-new Date(last.date))/86400000);
      const expectedGap=Math.ceil(7/(parseInt(c.days)||3));
      return dd>=expectedGap+2;
    }).map(c=>{
      const last=(DB.history[c.id]||[])[0];
      return {c,dd:last?Math.floor((Date.now()-new Date(last.date))/86400000):null};
    }).sort((a,b)=>{
      if(a.dd===null&&b.dd!==null)return -1;
      if(b.dd===null&&a.dd!==null)return 1;
      return (b.dd||0)-(a.dd||0);
    });
    if(dormidos.length){
      const shown=dormidos.slice(0,6), extra=dormidos.length-shown.length;
      adhBanner.style.display='block';
      adhBanner.innerHTML=`<div class="card" style="border-left:3px solid var(--rd);padding:10px 14px">
        <div style="font-size:12px;font-weight:700;color:var(--rd);margin-bottom:6px">💤 ${dormidos.length} ${dormidos.length>1?'asesorados necesitan':'asesorado necesita'} un empujón</div>
        ${shown.map(({c,dd})=>{
          const estado=dd===null?'Aún no empieza':dd===1?'Hace 1 día':'Hace '+dd+' días';
          const col=dd===null||dd>=7?'var(--rd)':'var(--or)';
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-top:1px solid var(--br)">
            <div style="min-width:0;flex:1;cursor:pointer" onclick="openDetail('${esc(c.id)}')">
              <div style="font-size:13px;font-weight:600">${esc(c.name)}</div>
              <div style="font-size:11px;color:${col}">🏋️ ${estado} · ${esc(String(c.days||3))}x/sem</div>
            </div>
            <button class="btn bo bsm" style="font-size:11px;padding:3px 8px;flex-shrink:0" onclick="event.stopPropagation();whatsappNudge('${esc(c.id)}')">Empujar 💪</button>
          </div>`;
        }).join('')}
        ${extra>0?`<div style="font-size:11px;color:var(--t3);padding-top:6px;border-top:1px solid var(--br)">y ${extra} más…</div>`:''}
      </div>`;
    } else {
      adhBanner.style.display='none';
    }
  }

  // ── Prioritarios: vencidos y por vencer primero ──
  const list=document.getElementById('h-list');
  if(!DB.clients.length){
    list.innerHTML='<div class="empty"><div class="eico" style="color:var(--t3)">'+(typeof aviIcon==='function'?aviIcon('users',34):'👥')+'</div><div class="etxt">Sin asesorados todavía</div><div class="esub">Añade el primero con el botón de arriba</div></div>';
    return;
  }
  const sorted=[...DB.clients].sort((a,b)=>{
    const order={'overdue':0,'expiring':1,'pending':2,'active':3,'inactive':4,'suspended':5};
    return (order[MS.getStatus(a)]??9)-(order[MS.getStatus(b)]??9);
  });
  list.innerHTML='';
  sorted.slice(0,5).forEach(c=>{
    const st=MS.getStatus(c);
    const badge=MS.badge(st);
    const sessions=(DB.history&&DB.history[c.id])||[];
    const lastS=sessions[0];
    let trainStr='';
    if(lastS){
      const dd=Math.floor((Date.now()-new Date(lastS.date))/(86400000));
      const col=dd<=0?'var(--g)':dd<=2?'var(--bl)':dd<=5?'var(--or)':'var(--rd)';
      trainStr=`<span style="color:${col};font-size:11px">${typeof aviIcon==='function'?aviIcon('dumbbell',12):'🏋️'} ${dd<=0?'Hoy':dd===1?'Ayer':'Hace '+dd+'d'}</span>`;
    }
    const d=document.createElement('div');d.className='cli';
    d.innerHTML=`<div class="cav" style="width:38px;height:38px;font-size:14px;background:${avc(c.name)}">${esc(ini(c.name))}</div>
      <div style="flex:1;min-width:0">
        <div class="cn">${esc(c.name)}</div>
        <div class="cm">${esc(c.goal||'')} · ${trainStr||'<span style="color:var(--t3);font-size:11px">Sin sesiones</span>'}</div>
      </div>
      <span style="background:${badge.bg};color:${badge.color};font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;white-space:nowrap">${badge.label}</span>`;
    d.onclick=()=>openDetail(c.id);
    list.appendChild(d);
  });
  // 🫀 El pulso de tus asesorados (v353): motivos POSITIVOS para escribirles. Al final para no
  // competir con los banners de urgencia (vencimientos/adherencia). Guard por caché vieja de core.
  if(typeof renderMyTrainingCard==='function')renderMyTrainingCard();
  if(typeof renderPulse==='function')renderPulse();
  // Notificaciones del coach (2026-07-11): self-heal 1×/sesión + tarjeta si falta permiso.
  if(typeof ensureCoachPush==='function')ensureCoachPush();
  // 🛡️ Reportes de comunidad (lote v3-a #1): async, se pinta sola solo si hay reportes abiertos.
  if(typeof renderReportsCard==='function')renderReportsCard();
}

// ── El pulso del coach (v353): tarjeta en Inicio con los motivos positivos/técnicos para
// escribirle a cada asesorado (récord/estancamiento/deload/racha). La lógica vive en
// avi-core.coachPulse (pura, determinista); aquí solo UI + estado. El ✕ silencia esa fila
// por 3 días (localStorage coachpulse_<cid>_<type>, LOCAL — preferencia de UI del coach).
// Mi entrenamiento (v369, fix v371, idea Camilo 2026-07-18): tarjeta en el Inicio del coach con las
// cifras de SU propio entreno. Camilo entrena con "Mi entrenamiento" (COACH_SELF), que se guarda en
// SU PROPIA fila (no en un cliente). Por eso leemos de COACH_OWN_ROW — la MISMA fuente que
// openMyTraining — sin marcar nada. Toca → abre "Mi entrenamiento". Se oculta sola si no hay
// historial propio. (v369 leía de un cliente marcado; Camilo no entrena en un cliente → nunca salía.)
function renderMyTrainingCard(){
  const el=document.getElementById('h-mytraining'); if(!el)return;
  if(typeof myTrainingSummary!=='function'){ el.style.display='none'; el.innerHTML=''; return; }
  const row=(typeof COACH_OWN_ROW!=='undefined'&&COACH_OWN_ROW)
    || (typeof _readAuthRow==='function'&&typeof _authUid!=='undefined'&&_authUid?_readAuthRow(_authUid):null);
  const hist=(row&&row.history)||[];
  const planClient={routines:(row&&row.routines)||[],days:(row&&row.profile&&row.profile.days)};
  const s=myTrainingSummary(planClient,hist,Date.now());
  // v372 (reserva Fable): guard por s.hasData, NO por hist.length — un historial con TODAS las
  // fechas inválidas tiene length>0 pero daysSince=Infinity → pintaba "Hace Infinity días". hasData
  // ya filtra fechas válidas (y cubre el historial vacío). Nota: la tarjeta se refresca al entrar/
  // volver de "Mi entrenamiento", no en el poll de 15s (COACH_OWN_ROW se re-snapshotea en backToCoachPanel).
  if(!s.hasData){ el.style.display='none'; el.innerHTML=''; return; }
  const ic=(nm,sz)=>(typeof aviIcon==='function'?aviIcon(nm,sz):'');
  const lastTxt=s.daysSince<=0?'Hoy':s.daysSince===1?'Ayer':('Hace '+s.daysSince+' días');
  const stat=(v,l)=>`<div style="flex:1;text-align:center;min-width:0"><div style="font-size:17px;font-weight:800;color:var(--t1);font-variant-numeric:tabular-nums">${v}</div><div style="font-size:10.5px;color:var(--t2);margin-top:2px">${l}</div></div>`;
  el.style.display='block';
  el.innerHTML=`<div class="card" style="padding:12px 14px;cursor:pointer" onclick="openMyTraining()">
    <div style="font-size:12px;font-weight:700;color:var(--g);display:flex;align-items:center;gap:6px;margin-bottom:8px">${ic('dumbbell',14)} Mi entrenamiento</div>
    <div style="display:flex;gap:6px">
      ${stat(s.streakWeeks+' sem','Racha')}
      ${stat(s.thisWeekDays+'/'+s.target,'Esta semana')}
      ${stat(lastTxt,'Último')}
    </div>
    <div style="margin-top:10px"><button class="btn bg bsm" style="width:100%;min-height:36px" onclick="event.stopPropagation();openMyTraining()">Ver mi entrenamiento →</button></div>
  </div>`;
}
function renderPulse(){
  const el=document.getElementById('h-pulse'); if(!el)return;
  if(typeof coachPulse!=='function'){el.style.display='none';return;}
  // Junta los mutes vigentes por fila (prefijo coachpulse_) → clave '<cid>_<type>' para coachPulse.
  const muted={};
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);
    if(k&&k.indexOf('coachpulse_')===0){const v=parseInt(localStorage.getItem(k));if(v)muted[k.slice(11)]=v;}}
  const rows=coachPulse(DB.clients,DB.history,DB.prs,Date.now(),{muted});
  if(!rows.length){el.style.display='none';el.innerHTML='';return;}
  el.style.display='block';
  el.innerHTML=`<div class="card" style="padding:10px 14px">
    <div style="font-size:12px;font-weight:700;color:var(--g);margin-bottom:6px">${typeof aviIcon==='function'?aviIcon('bolt',13):'⚡'} El pulso de tus asesorados</div>
    ${rows.map(r=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-top:1px solid var(--br)">
      <div style="min-width:0;flex:1;cursor:pointer" onclick="_pulseGo('${esc(r.id)}','${esc(r.type)}')">
        <div style="font-size:13px;font-weight:600">${esc(r.name)}</div>
        <div style="font-size:11px;color:var(--t2)">${esc(r.label)}</div>
      </div>
      <button class="btn bg bsm" style="min-height:36px;padding:0 11px;flex-shrink:0" aria-label="Descartar aviso" onclick="event.stopPropagation();dismissPulse('${esc(r.id)}','${esc(r.type)}')">✕</button>
    </div>`).join('')}
  </div>`;
}
// Tap en una fila del pulso → la ficha. Si la fila es un estancamiento, el coach viene a HACER
// algo: lo aterrizamos en el plan de choque (#d-shock), no en el tope de la ficha (v354).
function _pulseGo(id,type){
  if(typeof openDetail!=='function')return;
  openDetail(id);
  if(type!=='estancado')return;
  setTimeout(()=>{
    const el=document.getElementById('d-shock');
    if(el&&el.style.display!=='none')el.scrollIntoView({behavior:'smooth',block:'center'});
  },120);
}
function dismissPulse(id,type){
  if(!id||!type)return;
  localStorage.setItem('coachpulse_'+id+'_'+type,String(Date.now()+3*86400000));
  renderPulse();
}

// ══════════════════════ HABITACIONES-REPORTE DEL PANEL ══════════════════════
// Cada tarjeta de stat del panel (ingresos/activos/sesiones/sin entrenar) abre una
// habitación .sroom con su desglose: de dónde sale el número y de qué asesorados.
// Toda fila es tocable → salta a la ficha del asesorado (openDetail).
function _crepAv(name){ return `<div class="crep-av" style="background:${avc(name)}">${esc(ini(name))}</div>`; }
// La habitación es un overlay .sroom; abrir la ficha directamente la dejaría DEBAJO.
// history.back() dispara el manejador que cierra la sala y descuenta su capa; abrimos
// la ficha en el siguiente tick, ya sin el overlay encima.
function _crepGoDetail(id){
  const room=document.getElementById('coach-stat-room');
  if(room&&room.classList.contains('on')){ history.back(); setTimeout(()=>openDetail(id),60); }
  else openDetail(id);
}
function _crepRow(cid,name,meta,rightHTML){
  return `<div class="crep-row" onclick="_crepGoDetail('${esc(String(cid))}')">
    ${_crepAv(name)}
    <div class="crep-mid"><div class="crep-nm">${esc(name)}</div><div class="crep-meta">${meta}</div></div>
    <div class="crep-right">${rightHTML}</div>
  </div>`;
}
function _crepHero(ic,hex,val,label){
  return `<div class="sroom-hero exroom-hero">
    <div class="exroom-hero-ic" style="background:${hex}22;border:1px solid ${hex}55">${ic}</div>
    <div class="sroom-hero-txt"><div class="sroom-title" style="margin-top:0">${esc(val)}</div>
      <div class="exroom-tags"><span>${esc(label)}</span></div></div>
  </div>`;
}
// dueDate del pago más reciente (ms) o Infinity si no hay pagos.
function _dueMs(c){ const p=(c.payments||[]); if(!p.length)return Infinity; const last=p.reduce((a,b)=>new Date(a.dueDate)>new Date(b.dueDate)?a:b); return new Date(last.dueDate).getTime(); }
function closeCoachStat(){ const r=document.getElementById('coach-stat-room'); if(r)r.classList.remove('on'); _syncRoomBodyClass(); }
function openCoachStat(kind){
  const room=document.getElementById('coach-stat-room'), body=document.getElementById('coach-stat-body'), titleEl=document.getElementById('coach-stat-title');
  if(!room||!body)return;
  const now=new Date(), y=now.getFullYear(), mo=now.getMonth();
  const weekAgo=new Date(Date.now()-7*24*60*60*1000);
  const stat=(ic,l,v,c)=>`<div class="sroom-stat" style="--sc:${c}"><div class="sroom-stat-ic">${ic}</div><div class="sroom-stat-v">${esc(String(v))}</div><div class="sroom-stat-l">${esc(l)}</div></div>`;
  const empty=(ic,txt)=>`<div class="crep-empty"><div class="crep-empty-ic">${ic}</div>${txt}</div>`;
  let title='Reporte', html='';

  if(kind==='ingresos'){
    const mesName=now.toLocaleDateString('es-ES',{month:'long',year:'numeric'});
    const cap=mesName.charAt(0).toUpperCase()+mesName.slice(1);
    title='Ingresos de '+cap;
    const rows=[]; let total=0, nPagos=0;
    DB.clients.forEach(c=>{
      const pm=(c.payments||[]).filter(p=>{const d=new Date(p.date);return d.getFullYear()===y&&d.getMonth()===mo;});
      if(!pm.length)return;
      const sub=pm.reduce((t,p)=>t+(parseFloat(p.amount)||0),0);
      total+=sub; nPagos+=pm.length; rows.push({c,sub,pm});
    });
    rows.sort((a,b)=>b.sub-a.sub);
    html=_crepHero('💰','#10b981','$'+total.toLocaleString('es-CO'),`${nPagos} ${nPagos===1?'pago':'pagos'} · ${rows.length} ${rows.length===1?'asesorado':'asesorados'} · ${cap}`);
    if(rows.length){
      const prom=Math.round(total/rows.length);
      html+=`<div class="sroom-stats">${stat('💵','Total','$'+total.toLocaleString('es-CO'),'#10b981')}${stat('👥','Pagaron',rows.length,'#3a86c8')}${stat('📊','Promedio','$'+prom.toLocaleString('es-CO'),'#9b6dd6')}</div>`;
      html+=`<div class="sroom-sec">De dónde salen</div>`;
      html+=rows.map(({c,sub,pm})=>{
        const fechas=pm.map(p=>new Date(p.date).toLocaleDateString('es-CO',{day:'2-digit',month:'short'})).join(', ');
        const nota=pm.map(p=>p.note).filter(Boolean)[0]||'';
        const meta=`${pm.length>1?pm.length+' pagos: ':''}${fechas}${nota?' · '+esc(nota):''}`;
        return _crepRow(c.id,c.name,meta,`<span class="crep-amt" style="color:var(--g)">$${sub.toLocaleString('es-CO')}</span>`);
      }).join('');
    } else html+=empty('🧾',`Aún no hay pagos registrados en ${esc(cap)}.<br>Regístralos desde la ficha de cada asesorado.`);
  }

  else if(kind==='activos'){
    title='Asesorados activos';
    const act=DB.clients.map(c=>({c,st:MS.getStatus(c)})).filter(x=>x.st==='active'||x.st==='expiring');
    act.sort((a,b)=>{ if(a.st!==b.st)return a.st==='expiring'?-1:1; return _dueMs(a.c)-_dueMs(b.c); });
    const nAl=act.filter(x=>x.st==='active').length, nPv=act.filter(x=>x.st==='expiring').length;
    html=_crepHero('🟢','#3a86c8',String(act.length),`${act.length===1?'asesorado':'asesorados'} al día o por vencer`);
    if(act.length){
      html+=`<div class="sroom-stats">${stat('✅','Al día',nAl,'#10b981')}${stat('⏳','Por vencer',nPv,'#e0a72e')}</div>`;
      html+=`<div class="sroom-sec">Tus asesorados vigentes</div>`;
      html+=act.map(({c,st})=>{
        const b=MS.badge(st), d=_dueMs(c);
        const dueStr=isFinite(d)?new Date(d).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}):'—';
        return _crepRow(c.id,c.name,`Vence: ${dueStr} · ${esc(c.level||'—')}`,`<span class="crep-badge" style="background:${b.bg};color:${b.color}">${esc(b.label)}</span>`);
      }).join('');
    } else html+=empty('🟢','No hay asesorados activos ahora mismo.');
  }

  else if(kind==='sesiones'){
    title='Sesiones de la semana';
    const byClient=[];
    DB.clients.forEach(c=>{
      const sess=((DB.history&&DB.history[c.id])||[]).filter(s=>new Date(s.date)>=weekAgo);
      if(sess.length)byClient.push({c,sess});
    });
    const totalSess=byClient.reduce((t,x)=>t+x.sess.length,0);
    byClient.sort((a,b)=>b.sess.length-a.sess.length);
    html=_crepHero('🏋️','#e0772e',String(totalSess),`en los últimos 7 días · ${byClient.length} ${byClient.length===1?'asesorado':'asesorados'}`);
    if(byClient.length){
      const prom=(totalSess/byClient.length).toFixed(1).replace('.0','');
      html+=`<div class="sroom-stats">${stat('🔥','Sesiones',totalSess,'#e0772e')}${stat('👥','Entrenaron',byClient.length,'#3a86c8')}${stat('📊','Promedio',prom,'#9b6dd6')}</div>`;
      html+=`<div class="sroom-sec">Quién entrenó</div>`;
      html+=byClient.map(({c,sess})=>{
        const rutinas=[...new Set(sess.map(s=>s.routineName).filter(Boolean))].join(', ')||'Entrenó';
        const last=sess.reduce((a,b)=>new Date(a.date)>new Date(b.date)?a:b);
        const lastStr=new Date(last.date).toLocaleDateString('es-CO',{weekday:'short',day:'2-digit',month:'short'});
        return _crepRow(c.id,c.name,`${esc(rutinas)} · última: ${lastStr}`,`<span class="crep-amt" style="color:var(--or)">${sess.length}</span><span style="font-size:10px;color:var(--t3)">ses.</span>`);
      }).join('');
    } else html+=empty('🏋️','Nadie ha entrenado esta semana todavía.');
  }

  else if(kind==='sinentrenar'){
    title='Sin entrenar (4+ días)';
    const dorm=DB.clients.filter(c=>{const st=MS.getStatus(c);if(st==='inactive'||st==='overdue'||st==='suspended')return false;return daysSinceLastSession((DB.history&&DB.history[c.id])||[],now)>=4;})
      .map(c=>({c,dd:daysSinceLastSession((DB.history&&DB.history[c.id])||[],now)}))
      .sort((a,b)=>b.dd-a.dd);
    html=_crepHero('😴','#e5484d',String(dorm.length),`${dorm.length===1?'asesorado':'asesorados'} con membresía activa`);
    if(dorm.length){
      html+=`<div class="sroom-sec">Necesitan un empujón 💪</div>`;
      html+=dorm.map(({c,dd})=>{
        const estado=!isFinite(dd)?'Sin registro de entrenos':dd===1?'última vez: ayer':`última vez: hace ${dd} días`;
        const col=(!isFinite(dd)||dd>=7)?'var(--rd)':'var(--or)';
        const right=`<span class="crep-amt" style="color:${col}">${isFinite(dd)?dd:'∞'}</span><span style="font-size:10px;color:var(--t3)">días</span>`;
        return _crepRow(c.id,c.name,`${esc(String(c.days||3))}x/sem · ${estado}`,right);
      }).join('');
    } else html+=empty('💪','¡Todos tus asesorados activos entrenaron hace poco!');
  }

  titleEl.textContent=title;
  body.innerHTML=html+'<div style="height:30px"></div>';
  body.scrollTop=0; _roomFront(room); _syncRoomBodyClass();
}
