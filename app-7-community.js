// ══════════════════════════════════════════════════════════════════════
// COMUNIDAD — idea #5, Fase 1 (C3). UI del asesorado.
// ──────────────────────────────────────────────────────────────────────
// Perfil público opt-in (apodo/avatar/código) + amigos por código + ❤️. ONLINE-only:
// degrada con gracia sin red y JAMÁS bloquea entrenar (§3.2 del plan). Gratis para TODOS
// los tiers (§4.6). Los datos SENSIBLES (peso/fotos/salud/kilos) NUNCA salen de user_data
// — la comunidad vive en sus propias tablas (community_*) con RLS estricta (C1).
//
// SEGURIDAD:
//  • Todas las ESCRITURAS pasan por AUTH.client() (RLS con el JWT real, se refresca solo) —
//    jamás fetch crudo con Bearer manual (gotcha v323). Y quedan SELLADAS en localhost
//    (_cmtySealed → cloudWriteSealed) para que ningún harness toque la nube (lección Samuel).
//  • esc() en TODO innerHTML con handle/bio (texto de OTROS usuarios).
//  • Avatares solo se pintan si cmtyAvatarOk(url) (prefijo del bucket propio; defensa doble
//    del CHECK cp_avatar_url_bucket) → un amigo no puede apuntar el <img> a una URL externa.
//  • El SNAPSHOT (racha/nivel/hoy) lo calcula el SERVIDOR (edge refresh_snapshot, decisión #7):
//    el cliente solo lo LEE y dispara el refresh con debounce (cmtyShouldRefresh, 30 min).
//  • NADA de comunidad entra a SB_KEYS (no es el sync offline-first). Caché de lectura en
//    ax_cmty_cache (LOCAL, por dispositivo) solo para el estado offline.
// ══════════════════════════════════════════════════════════════════════

// Versión del consentimiento ESPECÍFICO de la comunidad (evidencia Habeas Data del opt-in).
// Distinta del LEGAL_V general del registro; C4 formaliza el texto legal + esta versión.
const CMTY_CONSENT_V = 'comunidad-2026-07-19-borrador';

const CMTY = {
  uid: null,
  profile: null,     // mi fila community_profiles (o null si no hice opt-in)
  friends: [],       // [{fid, fr, prof}] amistades aceptadas con perfil del amigo
  incoming: [],      // [{fid, fr, handle}] solicitudes recibidas (pendientes)
  outgoing: [],      // [{fid, fr}] solicitudes que envié (pendientes)
  heartsGiven: {},   // {toUserId: true} ❤️ que YO di
  heartsRecv: 0,     // ❤️ que recibí (conteo)
  loaded: false,
  loading: false,
  busy: false,
  offline: false,
  _resolved: null,   // perfil resuelto por código, a la espera de "enviar solicitud"
  _confirmLeave: false,
};

function _cw(){ return (typeof warn === 'function') ? warn : function(){}; }
function _cmtyClient(){ return (typeof AUTH !== 'undefined' && AUTH.client) ? AUTH.client() : null; }
async function _cmtyUid(){ try{ const u = await AUTH.getUser(); return (u && u.id) || null; }catch(e){ return null; } }
// Sello anti-harness: en localhost NINGUNA escritura de comunidad toca la nube (lección Samuel).
function _cmtySealed(){ return typeof cloudWriteSealed === 'function' && cloudWriteSealed(location.hostname, window.AVI_ALLOW_CLOUD_WRITE); }

function _cmtyErr(e){
  const m = (e && (e.message || e.error_description || e.msg)) || '';
  if(/rate limit/i.test(m)) return 'Demasiados intentos por hoy. Prueba de nuevo mañana.';
  if(/duplicate|unique|already exists/i.test(m)) return 'Ya existe esa conexión.';
  if(/auth/i.test(m)) return 'Conéctate para continuar.';
  return 'Algo salió mal. Intenta de nuevo en un momento.';
}

// ── Caché de lectura (solo para el estado offline; marcada "puede estar desactualizada") ──
function _cmtySaveCache(){
  try{
    localStorage.setItem('ax_cmty_cache', JSON.stringify({
      profile: CMTY.profile, friends: CMTY.friends, heartsRecv: CMTY.heartsRecv, at: Date.now()
    }));
  }catch(e){}
}
function _cmtyLoadCache(){
  try{
    const c = JSON.parse(localStorage.getItem('ax_cmty_cache') || 'null');
    if(c){ CMTY.profile = c.profile || null; CMTY.friends = c.friends || []; CMTY.heartsRecv = c.heartsRecv || 0; }
  }catch(e){}
}

// ── Carga (perfil + amistades + perfiles de amigos + ❤️) ──
async function cmtyLoad(opts){
  opts = opts || {};
  if(CMTY.busy) return;
  CMTY.busy = true;
  if(!opts.silent){ CMTY.loading = true; _cmtyPaint(); }
  try{
    const cli = _cmtyClient(); const uid = await _cmtyUid();
    if(!cli || !uid){ CMTY.offline = true; _cmtyLoadCache(); return; }
    CMTY.uid = uid;
    const { data: prof, error: pe } = await cli.from('community_profiles').select('*').eq('user_id', uid).maybeSingle();
    if(pe) throw pe;
    CMTY.offline = false;
    CMTY.profile = prof || null;
    CMTY.friends = []; CMTY.incoming = []; CMTY.outgoing = []; CMTY.heartsGiven = {}; CMTY.heartsRecv = 0;
    if(prof){
      const { data: fr, error: fe } = await cli.from('friendships').select('*').or('user_a.eq.' + uid + ',user_b.eq.' + uid);
      if(fe) throw fe;
      const rows = fr || [];
      const accepted = rows.filter(f => f.status === 'accepted');
      const friendIds = accepted.map(f => f.user_a === uid ? f.user_b : f.user_a);
      const fprofiles = {};
      if(friendIds.length){
        const { data: fps, error: fpe } = await cli.from('community_profiles')
          .select('user_id,handle,avatar_url,bio,streak_weeks,sessions_4w,level,achievements,trained_today,snapshot_at')
          .in('user_id', friendIds);
        if(fpe) throw fpe;
        (fps || []).forEach(p => { fprofiles[p.user_id] = p; });
      }
      CMTY.friends = accepted
        .map(f => { const fid = f.user_a === uid ? f.user_b : f.user_a; return { fid: fid, fr: f, prof: fprofiles[fid] || null }; })
        .filter(x => x.prof); // si el perfil no vino (el amigo salió), lo omito
      rows.filter(f => f.status === 'pending').forEach(f => {
        if(f.requested_by === uid){ const other = f.user_a === uid ? f.user_b : f.user_a; CMTY.outgoing.push({ fid: other, fr: f }); }
        else { CMTY.incoming.push({ fid: f.requested_by, fr: f, handle: f.req_handle || '' }); }
      });
      const { data: rx } = await cli.from('community_reactions').select('from_user,to_user,kind').or('from_user.eq.' + uid + ',to_user.eq.' + uid);
      (rx || []).forEach(r => { if(r.from_user === uid) CMTY.heartsGiven[r.to_user] = true; if(r.to_user === uid) CMTY.heartsRecv++; });
    }
    CMTY.loaded = true;
    _cmtySaveCache();
  }catch(e){ _cw()('cmtyLoad:', e && e.message); CMTY.offline = true; _cmtyLoadCache(); }
  finally{
    CMTY.busy = false; CMTY.loading = false; _cmtyPaint();
    if(CMTY.profile && !CMTY.offline) cmtyMaybeRefresh();
  }
}

// ── Refresh del snapshot server-side, con debounce (la edge no tiene rate-limit propio) ──
async function cmtyMaybeRefresh(force){
  if(_cmtySealed()) return;
  let last = 0; try{ last = parseInt(localStorage.getItem('ax_cmty_refresh')) || 0; }catch(e){}
  if(!force && typeof cmtyShouldRefresh === 'function' && !cmtyShouldRefresh(last, Date.now())) return;
  try{
    const cli = _cmtyClient(); if(!cli) return;
    await cli.functions.invoke('refresh_snapshot', { body: {} });
    try{ localStorage.setItem('ax_cmty_refresh', String(Date.now())); }catch(e){}
  }catch(e){ _cw()('cmty refresh:', e && e.message); }
}

// El corazón del ciclo: refrescar el snapshot al TERMINAR un entreno (lo llama el flujo de fin).
function cmtyOnWorkoutFinished(){
  // Solo si el usuario está en la comunidad; fuerza (el debounce evita spam de todas formas).
  try{ if(CMTY.profile) cmtyMaybeRefresh(true); }catch(e){}
}

// ══════════ RENDER ══════════
function renderCommunity(){
  const host = document.getElementById('cn-community'); if(!host) return;
  if(!CMTY.loaded && !CMTY.loading && !CMTY.busy){ cmtyLoad(); return; } // primera vez: carga y repinta
  _cmtyPaint();
}

function _cmtyHead(){
  return '<div class="ph"><div class="ptitle">' + (typeof aviIcon === 'function' ? aviIcon('users', 20) : '👥') +
    ' Comunidad</div><div class="psub">Tu gente, tu constancia. Solo tus amigos te ven.</div></div>';
}

function _cmtyPaint(){
  const host = document.getElementById('cn-community'); if(!host) return;
  if(CMTY.loading && !CMTY.loaded){
    host.innerHTML = _cmtyHead() + '<div class="card" style="padding:20px;text-align:center;color:var(--t2)">Cargando tu comunidad…</div>';
    return;
  }
  if(CMTY.offline && !CMTY.profile){
    host.innerHTML = _cmtyHead() + _cmtyOfflineCard();
    return;
  }
  if(!CMTY.profile){ host.innerHTML = _cmtyHead() + _cmtyOptInHtml(); _cmtyBindOptIn(); return; }
  host.innerHTML = _cmtyHead() +
    (CMTY.offline ? _cmtyStaleBanner() : '') +
    _cmtyMyProfileHtml() +
    _cmtyAddHtml() +
    _cmtyRequestsHtml() +
    _cmtyFriendsHtml();
}

function _cmtyOfflineCard(){
  return '<div class="empty"><div class="eico">' + (typeof aviIcon === 'function' ? aviIcon('users', 30) : '👥') +
    '</div><div class="etxt">Conéctate para ver a tu gente</div>' +
    '<div class="esub">La comunidad necesita internet. Tu entrenamiento sigue funcionando sin conexión.</div>' +
    '<button class="btn bp" style="margin-top:12px" onclick="cmtyLoad()">Reintentar</button></div>';
}
function _cmtyStaleBanner(){
  return '<div class="card" style="padding:10px 12px;margin-bottom:10px;font-size:12px;color:var(--t2);background:var(--yll);border-color:var(--yl)">📡 Sin conexión — esto puede estar desactualizado.</div>';
}

// ── Opt-in (bienvenida + consentimiento) ──
function _cmtyOptInHtml(){
  const me = (typeof DB !== 'undefined' && DB.clients) ? DB.clients.find(x => x.id === (typeof CUR !== 'undefined' && CUR.clientId)) : null;
  const defName = me ? esc((me.name || '').slice(0, 30)) : '';
  return '<div class="card" style="padding:16px">' +
    '<div style="font-size:15px;font-weight:800;color:var(--t1);margin-bottom:6px">Únete a la comunidad 💚</div>' +
    '<div style="font-size:13px;color:var(--t2);line-height:1.55;margin-bottom:12px">Comparte tu <b>constancia</b> con amigos que tú elijas y motívense juntos. ' +
    'Es <b>opcional</b> y privado: te conectas solo por código, y ambos aceptan.</div>' +
    '<div class="card" style="padding:11px 13px;margin-bottom:13px;background:var(--surface)">' +
      '<div style="font-size:12px;font-weight:700;color:var(--t1);margin-bottom:5px">Tus amigos verán:</div>' +
      '<div style="font-size:12px;color:var(--t2);line-height:1.6">✓ Tu apodo y avatar (los que elijas)<br>✓ Tu racha, tu nivel y tus logros<br>✓ Si entrenaste hoy (lo puedes ocultar)</div>' +
      '<div style="font-size:12px;font-weight:700;color:var(--t1);margin:8px 0 5px">Nunca verán:</div>' +
      '<div style="font-size:12px;color:var(--t2);line-height:1.6">✗ Tu peso, fotos, medidas ni notas de salud<br>✗ Tus kilos ni tus mensajes con el coach</div>' +
    '</div>' +
    '<label class="ilbl">Tu apodo (así te verán)</label>' +
    '<input class="inp" id="cmty-handle" maxlength="30" placeholder="Ej: Cami" value="' + defName + '" style="margin-bottom:12px">' +
    '<label style="display:flex;gap:9px;align-items:flex-start;font-size:12.5px;color:var(--t2);line-height:1.5;margin-bottom:9px;cursor:pointer">' +
      '<input type="checkbox" id="cmty-ck-consent" style="margin-top:2px;flex:0 0 auto;width:17px;height:17px">' +
      '<span>Autorizo compartir mi apodo, avatar y estadísticas de constancia con los amigos que yo acepte, según la <b>política de tratamiento de datos</b>.</span></label>' +
    '<label style="display:flex;gap:9px;align-items:flex-start;font-size:12.5px;color:var(--t2);line-height:1.5;margin-bottom:12px;cursor:pointer">' +
      '<input type="checkbox" id="cmty-ck-age" style="margin-top:2px;flex:0 0 auto;width:17px;height:17px">' +
      '<span>Soy mayor de 18 años, o cuento con la autorización de mi representante.</span></label>' +
    '<div id="cmty-optin-err" style="display:none;font-size:12px;color:var(--rd);margin-bottom:9px"></div>' +
    '<button class="btn bp" id="cmty-optin-btn" style="width:100%;min-height:44px" onclick="cmtyCreateProfile()">Crear mi perfil</button>' +
    '</div>';
}
function _cmtyBindOptIn(){ /* placeholder para foco futuro; nada por ahora */ }

async function cmtyCreateProfile(){
  const hEl = document.getElementById('cmty-handle');
  const ck1 = document.getElementById('cmty-ck-consent');
  const ck2 = document.getElementById('cmty-ck-age');
  const errEl = document.getElementById('cmty-optin-err');
  const handle = hEl ? hEl.value.trim() : '';
  const showErr = m => { if(errEl){ errEl.textContent = m; errEl.style.display = 'block'; } };
  if(typeof cmtyHandleValid === 'function' && !cmtyHandleValid(handle)){ showErr('Elige un apodo de 1 a 30 caracteres.'); return; }
  if(!ck1 || !ck1.checked){ showErr('Marca la casilla de autorización para unirte a la comunidad.'); return; }
  if(!ck2 || !ck2.checked){ showErr('Confirma que eres mayor de edad o cuentas con autorización de tu representante.'); return; }
  if(_cmtySealed()){ toast('🔒 (dev) opt-in sellado en localhost'); return; }
  try{
    const cli = _cmtyClient(); const uid = await _cmtyUid();
    if(!cli || !uid){ showErr('Conéctate para unirte a la comunidad.'); return; }
    const { error } = await cli.from('community_profiles').insert({ user_id: uid, handle: handle, consent_v: CMTY_CONSENT_V, show_today: true });
    if(error) throw error;
    try{ localStorage.removeItem('ax_cmty_refresh'); }catch(e){} // fuerza el primer cálculo del snapshot
    toast('🎉 ¡Ya eres parte de la comunidad!');
    await cmtyLoad();
  }catch(e){ showErr(_cmtyErr(e)); }
}

// ── Mi perfil (con código, avatar, toggles, salir) ──
function _cmtyAvatarHtml(prof, size){
  size = size || 46;
  const url = prof && prof.avatar_url;
  if(typeof cmtyAvatarOk === 'function' && cmtyAvatarOk(url)){
    return '<img src="' + esc(url) + '" alt="" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;flex:0 0 auto;background:var(--gl)" onerror="this.style.visibility=\'hidden\'">';
  }
  const ini = esc(typeof cmtyInitials === 'function' ? cmtyInitials(prof && prof.handle) : '?');
  return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:var(--gl);color:var(--gt);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:' + Math.round(size * 0.36) + 'px;flex:0 0 auto">' + ini + '</div>';
}

function _cmtyMyProfileHtml(){
  const p = CMTY.profile;
  const code = esc(p.share_code || '');
  const bio = p.bio ? esc(p.bio) : '';
  const recv = CMTY.heartsRecv;
  const paused = p.visible === false;
  return '<div class="card" style="padding:14px;margin-bottom:12px">' +
    '<div style="display:flex;gap:12px;align-items:center">' +
      _cmtyAvatarHtml(p, 54) +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:15px;font-weight:800;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.handle) + '</div>' +
        '<div style="font-size:12px;color:var(--t2)">Racha ' + (p.streak_weeks || 0) + ' sem · Nivel ' + (p.level || 1) +
          (recv ? ' · ' + recv + ' ❤️' : '') + '</div>' +
      '</div>' +
      '<button class="btn bg bsm" style="min-height:36px;flex:0 0 auto" onclick="cmtyPickAvatar()">' + (typeof aviIcon === 'function' ? aviIcon('pencil', 15) : '✏️') + '</button>' +
    '</div>' +
    '<input type="file" id="cmty-avatar-input" accept="image/*" style="display:none" onchange="cmtyAvatarChosen(this)">' +
    (bio ? '<div style="font-size:12.5px;color:var(--t2);margin-top:9px;line-height:1.5">' + bio + '</div>' : '') +
    // Código para compartir
    '<div class="card" style="margin-top:12px;padding:11px 13px;background:var(--surface);display:flex;align-items:center;gap:10px">' +
      '<div style="flex:1;min-width:0"><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.5px">Tu código</div>' +
        '<div style="font-size:19px;font-weight:800;color:var(--g);letter-spacing:2px;font-family:monospace">' + code + '</div></div>' +
      '<button class="btn bg bsm" style="min-height:36px" onclick="cmtyCopyCode()">Copiar</button>' +
      '<button class="btn bp bsm" style="min-height:36px" onclick="cmtyShareCode()">Compartir</button>' +
    '</div>' +
    // Toggles
    '<div style="margin-top:12px;display:flex;flex-direction:column;gap:9px">' +
      _cmtyToggleRow('cmty-tg-visible', 'Perfil activo', 'Si lo pausas, tus amigos no te ven.', !paused, 'cmtyToggleVisible()') +
      _cmtyToggleRow('cmty-tg-today', 'Mostrar si entrené hoy', 'Apágalo si prefieres no compartir tu actividad diaria.', p.show_today !== false, 'cmtyToggleToday()') +
    '</div>' +
    // Editar apodo/bio + salir
    '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn bg bsm" style="min-height:36px;flex:1" onclick="cmtyEditOpen()">Editar apodo / bio</button>' +
    '</div>' +
    '<div id="cmty-edit-box" style="display:none;margin-top:10px"></div>' +
    '<div id="cmty-leave-box" style="margin-top:10px">' +
      '<button class="btn bd bsm" style="min-height:36px;width:100%" onclick="cmtyConfirmLeave()">Salir de la comunidad</button>' +
    '</div>' +
    '</div>';
}

function _cmtyToggleRow(id, title, sub, on, handler){
  return '<div style="display:flex;align-items:center;gap:10px">' +
    '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--t1)">' + esc(title) + '</div>' +
      '<div style="font-size:11.5px;color:var(--t3);line-height:1.4">' + esc(sub) + '</div></div>' +
    '<button class="cmty-sw' + (on ? ' on' : '') + '" id="' + id + '" role="switch" aria-checked="' + (on ? 'true' : 'false') + '" onclick="' + handler + '" style="flex:0 0 auto;width:46px;height:28px;border-radius:14px;border:none;cursor:pointer;position:relative;background:' + (on ? 'var(--g2)' : 'var(--br2)') + ';transition:background var(--dur,220ms) var(--ease-out,ease)">' +
    '<span style="position:absolute;top:3px;left:' + (on ? '21px' : '3px') + ';width:22px;height:22px;border-radius:50%;background:#fff;transition:left var(--dur,220ms) var(--ease-out,ease)"></span></button></div>';
}

async function cmtyCopyCode(){
  const code = (CMTY.profile && CMTY.profile.share_code) || '';
  try{ await navigator.clipboard.writeText(code); toast('📋 Código copiado'); }
  catch(e){ toast('Tu código es: ' + code); }
}
async function cmtyShareCode(){
  const code = (CMTY.profile && CMTY.profile.share_code) || '';
  const url = (typeof AVI_SHARE_URL !== 'undefined') ? AVI_SHARE_URL : 'https://kronos-apex.github.io/apex-app/';
  const msg = 'Agrégame en AVI 💪 Mi código es ' + code + '. Descarga la app: ' + url;
  try{
    if(navigator.share){ await navigator.share({ title: 'AVI', text: msg }); return; }
  }catch(e){ if(e && e.name === 'AbortError') return; }
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

function cmtyPickAvatar(){ const el = document.getElementById('cmty-avatar-input'); if(el) el.click(); }
async function cmtyAvatarChosen(input){
  const f = input && input.files && input.files[0]; if(!f) return;
  if(_cmtySealed()){ toast('🔒 (dev) avatar sellado en localhost'); input.value = ''; return; }
  const reader = new FileReader();
  reader.onload = async e => {
    try{
      toast('⏳ Subiendo avatar…');
      const b64 = (typeof compressImage === 'function') ? await compressImage(e.target.result, 120000) : e.target.result;
      const cli = _cmtyClient(); const uid = await _cmtyUid(); if(!cli || !uid) return;
      const res = await fetch(b64); const blob = await res.blob();
      const path = uid + '/avatar.jpg';
      const up = await cli.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if(up.error) throw up.error;
      const pub = cli.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      const { error } = await cli.from('community_profiles').update({ avatar_url: pub + '?t=' + Date.now() }).eq('user_id', uid);
      if(error) throw error;
      toast('📸 Avatar actualizado');
      await cmtyLoad();
    }catch(err){ _cw()('cmty avatar:', err && err.message); toast('No se pudo subir el avatar.'); }
  };
  reader.readAsDataURL(f);
}

async function cmtyToggleVisible(){ await _cmtyPatch({ visible: !(CMTY.profile.visible !== false) }); }
async function cmtyToggleToday(){
  const next = !(CMTY.profile.show_today !== false);
  await _cmtyPatch({ show_today: next });
  if(next) cmtyMaybeRefresh(true); // volver a mostrar hoy → recalcular en servidor
}
async function _cmtyPatch(patch){
  if(_cmtySealed()){ toast('🔒 (dev)'); Object.assign(CMTY.profile, patch); _cmtyPaint(); return; }
  try{
    const cli = _cmtyClient(); const uid = await _cmtyUid(); if(!cli || !uid) return;
    const { error } = await cli.from('community_profiles').update(patch).eq('user_id', uid);
    if(error) throw error;
    Object.assign(CMTY.profile, patch);
    _cmtySaveCache(); _cmtyPaint();
  }catch(e){ toast(_cmtyErr(e)); }
}

function cmtyEditOpen(){
  const box = document.getElementById('cmty-edit-box'); if(!box) return;
  if(box.style.display === 'block'){ box.style.display = 'none'; return; }
  const p = CMTY.profile;
  box.style.display = 'block';
  box.innerHTML = '<label class="ilbl">Apodo</label><input class="inp" id="cmty-edit-handle" maxlength="30" value="' + esc(p.handle || '') + '" style="margin-bottom:8px">' +
    '<label class="ilbl">Bio (opcional)</label><textarea class="tarea" id="cmty-edit-bio" maxlength="160" placeholder="Cuenta algo tuyo…" style="margin-bottom:8px">' + esc(p.bio || '') + '</textarea>' +
    '<div style="display:flex;gap:8px"><button class="btn bg bsm" style="flex:1;min-height:36px" onclick="cmtyEditOpen()">Cancelar</button>' +
    '<button class="btn bp bsm" style="flex:1;min-height:36px" onclick="cmtyEditSave()">Guardar</button></div>';
}
async function cmtyEditSave(){
  const h = document.getElementById('cmty-edit-handle'); const b = document.getElementById('cmty-edit-bio');
  const handle = h ? h.value.trim() : '';
  const bio = b ? b.value.trim() : '';
  if(typeof cmtyHandleValid === 'function' && !cmtyHandleValid(handle)){ toast('El apodo debe tener de 1 a 30 caracteres.'); return; }
  await _cmtyPatch({ handle: handle, bio: bio || null });
  toast('✅ Perfil actualizado');
}

function cmtyConfirmLeave(){
  const box = document.getElementById('cmty-leave-box'); if(!box) return;
  box.innerHTML = '<div class="card" style="padding:11px 13px;background:var(--rdl);border-color:var(--rd)">' +
    '<div style="font-size:12.5px;color:var(--t1);line-height:1.5;margin-bottom:9px">Esto borra tu perfil público y todas tus amistades. Tu entrenamiento y tus datos NO se tocan. ¿Seguro?</div>' +
    '<div style="display:flex;gap:8px"><button class="btn bg bsm" style="flex:1;min-height:36px" onclick="_cmtyPaint()">Cancelar</button>' +
    '<button class="btn bd bsm" style="flex:1;min-height:36px" onclick="cmtyLeave()">Sí, salir</button></div></div>';
}
async function cmtyLeave(){
  if(_cmtySealed()){ toast('🔒 (dev) salida sellada'); return; }
  try{
    const cli = _cmtyClient(); const uid = await _cmtyUid(); if(!cli || !uid) return;
    const { error } = await cli.from('community_profiles').delete().eq('user_id', uid);
    if(error) throw error;
    try{ localStorage.removeItem('ax_cmty_cache'); }catch(e){}
    toast('Saliste de la comunidad.');
    await cmtyLoad();
  }catch(e){ toast('No se pudo salir. Intenta de nuevo.'); }
}

// ── Agregar por código ──
function _cmtyAddHtml(){
  return '<div class="card" style="padding:14px;margin-bottom:12px">' +
    '<div style="font-size:13px;font-weight:700;color:var(--t1);margin-bottom:9px">Agregar un amigo</div>' +
    '<div style="display:flex;gap:8px">' +
      '<input class="inp" id="cmty-code-in" maxlength="20" placeholder="Pega su código" style="flex:1;text-transform:uppercase;font-family:monospace;letter-spacing:1px">' +
      '<button class="btn bp bsm" style="min-height:40px;flex:0 0 auto" onclick="cmtyResolve()">Buscar</button>' +
    '</div>' +
    '<div id="cmty-resolve-box" style="margin-top:10px"></div>' +
    '</div>';
}
async function cmtyResolve(){
  const el = document.getElementById('cmty-code-in');
  const box = document.getElementById('cmty-resolve-box');
  const code = (typeof cmtyCodeNormalize === 'function') ? cmtyCodeNormalize(el ? el.value : '') : (el ? el.value : '');
  const hint = m => { if(box) box.innerHTML = '<div style="font-size:12px;color:var(--t2)">' + esc(m) + '</div>'; };
  if(code.length < 8){ hint('Pega un código válido (8 o más caracteres).'); return; }
  if(_cmtySealed()){ toast('🔒 (dev) búsqueda sellada'); return; }
  try{
    const cli = _cmtyClient(); if(!cli){ toast('Conéctate para agregar amigos.'); return; }
    const { data, error } = await cli.rpc('resolve_share_code', { p_code: code });
    if(error) throw error;
    const row = (data && data[0]) || null;
    if(!row){ hint('No encontramos a nadie con ese código.'); return; }
    if(row.user_id === CMTY.uid){ hint('Ese es tu propio código 🙂'); return; }
    if(CMTY.friends.some(f => f.fid === row.user_id)){ hint('Ya son amigos ✓'); return; }
    if(CMTY.outgoing.some(o => o.fid === row.user_id)){ hint('Ya le enviaste una solicitud.'); return; }
    CMTY._resolved = row;
    if(box) box.innerHTML = '<div class="card" style="padding:10px 12px;display:flex;align-items:center;gap:10px;background:var(--surface)">' +
      _cmtyAvatarHtml(row, 40) +
      '<div style="flex:1;min-width:0;font-size:14px;font-weight:700;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(row.handle) + '</div>' +
      '<button class="btn bp bsm" style="min-height:36px;flex:0 0 auto" onclick="cmtyAddFriend()">Enviar solicitud</button></div>';
  }catch(e){ hint(_cmtyErr(e)); }
}
async function cmtyAddFriend(){
  const row = CMTY._resolved; if(!row) return;
  if(_cmtySealed()){ toast('🔒 (dev) solicitud sellada'); return; }
  try{
    const cli = _cmtyClient(); const uid = CMTY.uid || await _cmtyUid(); if(!cli || !uid) return;
    const lo = uid < row.user_id ? uid : row.user_id;
    const hi = uid < row.user_id ? row.user_id : uid;
    const { error } = await cli.from('friendships').insert({ user_a: lo, user_b: hi, requested_by: uid, status: 'pending' });
    if(error) throw error;
    CMTY._resolved = null;
    const el = document.getElementById('cmty-code-in'); if(el) el.value = '';
    toast('✅ Solicitud enviada');
    await cmtyLoad();
  }catch(e){ toast(_cmtyErr(e)); }
}

// ── Solicitudes ──
function _cmtyRequestsHtml(){
  if(!CMTY.incoming.length && !CMTY.outgoing.length) return '';
  let h = '<div class="card" style="padding:14px;margin-bottom:12px"><div style="font-size:13px;font-weight:700;color:var(--t1);margin-bottom:9px">Solicitudes</div>';
  CMTY.incoming.forEach(r => {
    const name = r.handle ? esc(r.handle) : 'Alguien';
    h += '<div style="display:flex;align-items:center;gap:10px;padding:7px 0">' +
      _cmtyAvatarHtml({ handle: r.handle }, 38) +
      '<div style="flex:1;min-width:0;font-size:13.5px;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><b>' + name + '</b> quiere ser tu amigo</div>' +
      '<button class="btn bp bsm" style="min-height:36px" onclick="cmtyAccept(\'' + r.fr.id + '\')">Aceptar</button>' +
      '<button class="btn bg bsm" style="min-height:36px;padding:0 10px" onclick="cmtyReject(\'' + r.fr.id + '\')">✕</button></div>';
  });
  CMTY.outgoing.forEach(() => {
    h += '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;color:var(--t2);font-size:12.5px">' +
      '<div style="width:38px;height:38px;border-radius:50%;background:var(--surface);flex:0 0 auto"></div>' +
      '<div style="flex:1">Solicitud enviada · esperando respuesta</div></div>';
  });
  return h + '</div>';
}
async function cmtyAccept(id){
  if(_cmtySealed()){ toast('🔒 (dev)'); return; }
  try{
    const cli = _cmtyClient(); if(!cli) return;
    const { error } = await cli.from('friendships').update({ status: 'accepted' }).eq('id', id);
    if(error) throw error;
    toast('🤝 ¡Ya son amigos!');
    await cmtyLoad();
  }catch(e){ toast(_cmtyErr(e)); }
}
async function cmtyReject(id){
  if(_cmtySealed()){ toast('🔒 (dev)'); return; }
  try{
    const cli = _cmtyClient(); if(!cli) return;
    const { error } = await cli.from('friendships').delete().eq('id', id);
    if(error) throw error;
    await cmtyLoad();
  }catch(e){ toast(_cmtyErr(e)); }
}

// ── Amigos ──
function _cmtyFriendsHtml(){
  if(!CMTY.friends.length){
    return '<div class="empty"><div class="eico">' + (typeof aviIcon === 'function' ? aviIcon('users', 30) : '👥') + '</div>' +
      '<div class="etxt">Aún no tienes amigos aquí</div>' +
      '<div class="esub">Comparte tu código o pega el de alguien para conectarse.</div></div>';
  }
  let h = '<div style="font-size:13px;font-weight:700;color:var(--t1);margin:4px 2px 9px">Mis amigos (' + CMTY.friends.length + ')</div>';
  CMTY.friends.forEach(f => { h += _cmtyFriendCard(f); });
  return h;
}
function _cmtyFriendCard(f){
  const p = f.prof;
  const given = !!CMTY.heartsGiven[f.fid];
  const fresh = (typeof cmtyFreshness === 'function') ? cmtyFreshness(p.snapshot_at, Date.now()) : { fresh: true };
  const today = p.trained_today
    ? '<span style="color:var(--g);font-weight:700">● Entrenó hoy</span>'
    : '<span style="color:var(--t3)">○ Hoy no ha entrenado</span>';
  return '<div class="card" style="padding:12px;margin-bottom:9px">' +
    '<div style="display:flex;align-items:center;gap:11px">' +
      _cmtyAvatarHtml(p, 46) +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:14px;font-weight:800;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.handle) + '</div>' +
        '<div style="font-size:12px;color:var(--t2)">Racha ' + (p.streak_weeks || 0) + ' sem · Nivel ' + (p.level || 1) + ' · ' + (p.sessions_4w || 0) + ' días/4sem</div>' +
        '<div style="font-size:11.5px;margin-top:1px">' + today + (fresh.fresh ? '' : ' <span style="color:var(--t3)">· dato viejo</span>') + '</div>' +
      '</div>' +
      '<button class="btn ' + (given ? 'bp' : 'bg') + ' bsm" style="min-height:38px;flex:0 0 auto" aria-pressed="' + (given ? 'true' : 'false') + '" onclick="cmtyHeart(\'' + f.fid + '\')" title="Enviar ❤️">' +
        (typeof aviIcon === 'function' ? aviIcon('heart', 16) : '❤️') + '</button>' +
    '</div>' +
    '<details style="margin-top:8px"><summary style="font-size:12px;color:var(--t3);cursor:pointer;list-style:none">Gestionar</summary>' +
      '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
        '<button class="btn bg bsm" style="min-height:36px;flex:1" onclick="cmtyRemove(\'' + f.fr.id + '\')">Eliminar</button>' +
        '<button class="btn bg bsm" style="min-height:36px;flex:1" onclick="cmtyReport(\'' + f.fid + '\',\'' + f.fr.id + '\')">Reportar</button>' +
        '<button class="btn bd bsm" style="min-height:36px;flex:1" onclick="cmtyBlock(\'' + f.fr.id + '\')">Bloquear</button>' +
      '</div></details>' +
    '</div>';
}
async function cmtyHeart(toUser){
  if(_cmtySealed()){ toast('🔒 (dev)'); return; }
  const given = !!CMTY.heartsGiven[toUser];
  try{
    const cli = _cmtyClient(); const uid = CMTY.uid || await _cmtyUid(); if(!cli || !uid) return;
    if(given){
      const { error } = await cli.from('community_reactions').delete().eq('from_user', uid).eq('to_user', toUser).eq('kind', 'heart');
      if(error) throw error;
      delete CMTY.heartsGiven[toUser];
    }else{
      const { error } = await cli.from('community_reactions').insert({ from_user: uid, to_user: toUser, kind: 'heart' });
      if(error) throw error;
      CMTY.heartsGiven[toUser] = true;
    }
    _cmtyPaint();
  }catch(e){ toast(_cmtyErr(e)); }
}
async function cmtyRemove(id){
  if(_cmtySealed()){ toast('🔒 (dev)'); return; }
  try{
    const cli = _cmtyClient(); if(!cli) return;
    const { error } = await cli.from('friendships').delete().eq('id', id);
    if(error) throw error;
    toast('Amistad eliminada');
    await cmtyLoad();
  }catch(e){ toast(_cmtyErr(e)); }
}
async function cmtyBlock(id){
  if(_cmtySealed()){ toast('🔒 (dev)'); return; }
  try{
    const cli = _cmtyClient(); if(!cli) return;
    const { error } = await cli.from('friendships').update({ status: 'blocked' }).eq('id', id);
    if(error) throw error;
    toast('Usuario bloqueado');
    await cmtyLoad();
  }catch(e){ toast(_cmtyErr(e)); }
}
async function cmtyReport(userId, frId){
  if(_cmtySealed()){ toast('🔒 (dev)'); return; }
  try{
    const cli = _cmtyClient(); if(!cli) return;
    const { error } = await cli.from('community_reports').insert({ reported: userId, reason: 'reporte desde la app' });
    if(error) throw error;
    // Reportar + bloquear van juntos (§5.4): tras reportar, bloqueamos también.
    if(frId){ try{ await cli.from('friendships').update({ status: 'blocked' }).eq('id', frId); }catch(e){} }
    toast('Gracias. Lo revisaremos y bloqueamos a esta persona.');
    await cmtyLoad();
  }catch(e){ toast(_cmtyErr(e)); }
}
