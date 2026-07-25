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
// Ata a la sección 9 «Comunidad» de legal/politica-tratamiento-datos.md (C4). Sube este valor
// si cambia ese texto. Sigue siendo BORRADOR pendiente de revisión de abogado (legal/LEEME).
const CMTY_CONSENT_V = 'comunidad-2026-07-23-borrador';

const CMTY = {
  uid: null,
  profile: null,     // mi fila community_profiles (o null si no hice opt-in)
  friends: [],       // [{fid, fr, prof}] amistades aceptadas con perfil del amigo
  gym: [],           // [perfil] compañeros de gym (mismo coach) aún NO conectados — directorio (C5)
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
  // ① CHAT EN VIVO (DMs Realtime, community_messages)
  dmThreads: [],     // bandeja: [{uid, prof, last, at, unread, lastFromMe}] orden por reciente
  dmUnread: 0,       // total de mensajes sin leer (badge de la bandeja)
  dmOpen: null,      // uid del hilo abierto (o null)
  dmMsgs: [],        // mensajes del hilo abierto (asc por fecha)
  dmSub: null,       // canal Realtime (una sola suscripción)
  activity: {},      // ② última conexión: {uid: 'ahora'|'hoy'|'esta semana'|'hace tiempo'} (etiqueta redondeada, opt-in)
  // ③c-3 descubrir + seguir
  discover: [],      // [perfil] perfiles PÚBLICOS (no amigos) para descubrir/seguir
  following: {},     // {uid: 'active'|'pending'} a quién sigo yo
  followerReqs: [],  // [uid] solicitudes de seguidores entrantes (yo privado)
  profById: {},      // uid→perfil de todo lo visible (para pintar solicitudes por handle)

  posts: [],         // ④ muro: [{id,user_id,payload,created_at}] de a quien sigo (active) + míos
  postHearts: {},    // {postId: conteo de ❤️}
  postHeartMine: {}, // {postId: true} si YO le di ❤️
  composeOpen: false,// picker de "publicar mi rutina" abierto
  postComments: {},  // v3-a #4: {postId: [{id,user_id,text,created_at}]} — la RLS ya filtra
  threadOpen: null,  // postId del hilo de comentarios abierto (uno a la vez)
  cmtDraft: {},      // {postId: borrador} — sobrevive a un repintado (un DM entrante repinta el panel)
  isModerator: false,// #6 PR piloto: ¿soy el coach moderador? (community_moderators, mod_sel_self)
  prConfirm: null,   // {key,name,val} récord a punto de publicarse (confirmación activa abierta)
  profileUid: null,  // perfil de OTRA persona abierto (tocar nombre/avatar → su perfil)
  profileFrom: 'feed',// vista a la que volver al cerrar el perfil
  profileProf: null, // perfil de esa persona (de lo ya cargado)
  profilePosts: [],  // sus publicaciones (muro/hitos/récords) visibles para mí
  profileCounts: null,// {followers, following} (RPC segura cmty_follow_counts)
  profileLoading: false,
  view: 'feed',      // R1 re-forma: 'feed' (muro, default) | 'settings' (perfil/ajustes) | 'inbox' (mensajes)
  peers: [],         // A1 adopción: perfiles ya visibles ANTES de tener perfil propio (prueba social del opt-in)
  // A2 adopción: la puerta desde «Hoy». `nudgeOn` deja que el banner «Comparte AVI» ceda el turno
  // (dos pedidos apilados en la misma pantalla se anulan entre sí); los `_probe*` son de sesión.
  nudgeOn: false,
  _probing: false,
  _probeNextTry: 0,
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
    // Columnas SEGURAS (§13-BIS.1b): share_code/consent/birth_date/last_active/trained_today/snapshot_at
    // salieron del grant general → un `select('*')` o pedirlas daría permission denied. El dueño lee sus
    // propios secretos (código/consentimiento) por la RPC dedicada cmty_my_secrets.
    const { data: prof, error: pe } = await cli.from('community_profiles')
      .select('user_id,handle,avatar_url,bio,visible,is_private,role,streak_weeks,sessions_4w,level,achievements,created_at,show_today,show_last_active,show_milestones,total_sessions,training_since')
      .eq('user_id', uid).maybeSingle();
    if(pe) throw pe;
    if(prof){
      try{ const { data: sec } = await cli.rpc('cmty_my_secrets'); if(sec && sec[0]) Object.assign(prof, sec[0]); }
      catch(e){ _cw()('cmty secrets:', e && e.message); }
    }
    // #6 PR piloto: ¿soy el coach moderador? (community_moderators, policy mod_sel_self deja leer
    // MI propia fila). Gatea la UI de publicar récords; el candado REAL es la RLS (cpost_ins).
    CMTY.isModerator = false;
    try{ const { data: md } = await cli.from('community_moderators').select('user_id').eq('user_id', uid).maybeSingle(); CMTY.isModerator = !!md; }
    catch(e){ _cw()('cmty mod:', e && e.message); }
    CMTY.offline = false;
    CMTY.profile = prof || null;
    CMTY.friends = []; CMTY.gym = []; CMTY.incoming = []; CMTY.outgoing = []; CMTY.heartsGiven = {}; CMTY.heartsRecv = 0; CMTY.activity = {};
    CMTY.discover = []; CMTY.following = {}; CMTY.followerReqs = []; CMTY.profById = {};
    CMTY.posts = []; CMTY.postHearts = {}; CMTY.postHeartMine = {}; CMTY.postComments = {};
    CMTY.peers = [];
    if(prof){
      const { data: fr, error: fe } = await cli.from('friendships').select('*').or('user_a.eq.' + uid + ',user_b.eq.' + uid);
      if(fe) throw fe;
      const rows = fr || [];
      const accepted = rows.filter(f => f.status === 'accepted');
      const friendIds = new Set(accepted.map(f => f.user_a === uid ? f.user_b : f.user_a));
      // Bloqueados: JAMÁS en el directorio (ni gym ni amigos). El bloqueo debe ocultar también
      // DENTRO del gym (reserva de Fable C5). La RLS ya excluye su perfil (_same_community mira el
      // bloqueo tras c5_block_hides_in_gym); esto es defensa en profundidad por si un perfil
      // bloqueado llegara igual (regresión de RLS o caché).
      const blockedIds = new Set(rows.filter(f => f.status === 'blocked').map(f => f.user_a === uid ? f.user_b : f.user_a));
      const pendingIds = new Set(); // solicitudes en curso → se excluyen del directorio
      rows.filter(f => f.status === 'pending').forEach(f => {
        if(f.requested_by === uid){ const other = f.user_a === uid ? f.user_b : f.user_a; CMTY.outgoing.push({ fid: other, fr: f }); pendingIds.add(other); }
        else { CMTY.incoming.push({ fid: f.requested_by, fr: f, handle: f.req_handle || '' }); pendingIds.add(f.requested_by); }
      });
      // TODOS los perfiles VISIBLES por RLS = propio (excluido con neq) + amigos + compañeros de gym.
      const { data: allp, error: ape } = await cli.from('community_profiles')
        .select('user_id,handle,avatar_url,bio,is_private,role,streak_weeks,sessions_4w,level,achievements,total_sessions,training_since')
        .neq('user_id', uid);
      if(ape) throw ape;
      const fprofiles = {};
      CMTY.profById = {}; // uid→perfil de TODO visible (para pintar solicitudes de seguidores por handle)
      (allp || []).forEach(p => {
        CMTY.profById[p.user_id] = p;
        if(blockedIds.has(p.user_id)) return; // bloqueado → invisible aunque comparta gym
        if(friendIds.has(p.user_id)) fprofiles[p.user_id] = p;
        else if(pendingIds.has(p.user_id)) return; // solicitud de AMISTAD en curso
        else if(p.is_private === false) CMTY.discover.push(p); // público (no amigo) → descubrir/seguir
        else CMTY.gym.push(p); // privado no-amigo VISIBLE = solo puede ser compañero de gym (cp_sel)
      });
      CMTY.friends = accepted
        .map(f => { const fid = f.user_a === uid ? f.user_b : f.user_a; return { fid: fid, fr: f, prof: fprofiles[fid] || null }; })
        .filter(x => x.prof); // si el perfil no vino (el amigo salió), lo omito
      const { data: rx } = await cli.from('community_reactions').select('from_user,to_user,kind').or('from_user.eq.' + uid + ',to_user.eq.' + uid);
      (rx || []).forEach(r => { if(r.from_user === uid) CMTY.heartsGiven[r.to_user] = true; if(r.to_user === uid) CMTY.heartsRecv++; });
      // ③b/③c: follows — a quién sigo (active/pending) + solicitudes de seguidores entrantes (yo privado)
      const { data: fol } = await cli.from('follows').select('follower,followee,state').or('follower.eq.' + uid + ',followee.eq.' + uid);
      (fol || []).forEach(f => {
        if(f.follower === uid) CMTY.following[f.followee] = f.state;
        else if(f.followee === uid && f.state === 'pending') CMTY.followerReqs.push(f.follower);
      });
      await _cmtyLoadDMs(cli, uid); // ① bandeja de mensajes (community_messages)
      await _cmtyLoadActivity(cli, uid); // ② etiquetas de última conexión (opt-in, redondeadas)
      await _cmtyLoadFeed(cli, uid); // ④ muro: posts de a quien sigo (active) + míos, con ❤️
    } else {
      // A1 adopción — SIN perfil propio la pantalla de bienvenida mostraba cero caras conocidas.
      // La RLS ya deja ver a los compañeros de gym aunque no hayas hecho opt-in (`_same_community`
      // mira `community_gym_members`, no exige perfil — verificado por impersonación 2026-07-25),
      // así que esto NO abre ningún dato nuevo: es el mismo `cp_sel` que ya rige todo lo demás.
      // Falla en silencio a propósito: sin prueba social el opt-in sigue funcionando igual.
      try{
        const { data: peers } = await cli.from('community_profiles')
          .select('user_id,handle,avatar_url,is_private').neq('user_id', uid).limit(24);
        CMTY.peers = peers || [];
      }catch(e){ _cw()('cmty peers:', e && e.message); }
    }
    CMTY.loaded = true;
    _cmtySaveCache();
    _cmtyProbeSync(); // A2: esta carga es la VERDAD → refresca la sonda que decide la tarjeta de «Hoy»
  }catch(e){ _cw()('cmtyLoad:', e && e.message); CMTY.offline = true; _cmtyLoadCache(); }
  finally{
    CMTY.busy = false; CMTY.loading = false; _cmtyPaint();
    if(CMTY.profile && !CMTY.offline){ cmtyMaybeRefresh(); cmtyDmSubscribe(); }
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
  CMTY.view = 'feed'; // al ENTRAR a la pestaña siempre aterriza en el muro (los polls repintan con _cmtyPaint, no aquí)
  if(!CMTY.loaded && !CMTY.loading && !CMTY.busy){ cmtyLoad(); return; } // primera vez: carga y repinta
  _cmtyPaint();
}

// Encabezado simple (sin perfil todavía: carga / offline / opt-in).
function _cmtyHead(){
  return '<div class="ph"><div class="ptitle">' + (typeof aviIcon === 'function' ? aviIcon('users', 20) : '👥') +
    ' Comunidad</div><div class="psub">Tu constancia con tu gente. Nunca tu peso, tus fotos ni tus kilos.</div></div>';
}
// Encabezado de la vista MURO: título + bandeja (✉️, badge no-leídos) + ajustes (⚙️).
// Flex explícito y auto-contenido (no reusa .ph/.ptitle, que en esta zona no dan la fila horizontal).
function _cmtyHeadMain(){
  const unread = CMTY.dmUnread || 0;
  return '<div style="display:flex;align-items:center;gap:8px;margin:4px 0 14px">' +
    '<div style="flex:1;min-width:0;font-size:20px;font-weight:800;color:var(--t1);display:flex;align-items:center;gap:7px">' +
      (typeof aviIcon === 'function' ? aviIcon('users', 20) : '👥') + '<span>Comunidad</span></div>' +
    '<button class="btn bg bsm" aria-label="Mensajes" title="Mensajes" style="min-height:40px;flex:0 0 auto;position:relative" onclick="cmtyGoView(\'inbox\')">' +
      (typeof aviIcon === 'function' ? aviIcon('chat', 18) : '💬') +
      (unread ? '<span style="position:absolute;top:-5px;right:-5px;background:var(--g);color:#fff;font-size:10px;font-weight:800;border-radius:10px;min-width:16px;height:16px;line-height:16px;text-align:center;padding:0 4px">' + (unread > 9 ? '9+' : unread) + '</span>' : '') +
    '</button>' +
    '<button class="btn bg bsm" aria-label="Ajustes de la comunidad" title="Ajustes" style="min-height:40px;flex:0 0 auto;font-size:17px" onclick="cmtyGoView(\'settings\')">⚙️</button>' +
  '</div>';
}
// Encabezado de una sub-vista (ajustes / bandeja): volver + título.
function _cmtyHeadSub(title){
  return '<div style="display:flex;align-items:center;gap:10px;margin:4px 0 14px">' +
    '<button class="btn bg bsm" aria-label="Volver al muro" style="min-height:40px;flex:0 0 auto" onclick="cmtyGoView(\'feed\')">‹ Volver</button>' +
    '<div style="flex:1;min-width:0;font-size:19px;font-weight:800;color:var(--t1)">' + esc(title) + '</div></div>';
}
// Cambia de vista dentro de la pestaña (no toca la nav global). Sube el scroll para no quedar a mitad.
function cmtyGoView(v){
  CMTY.view = v; _cmtyPaint();
  const h = document.getElementById('cn-community'); if(h && h.scrollTo){ try{ h.scrollTo(0, 0); }catch(e){} }
  try{ window.scrollTo(0, 0); }catch(e){}
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
  const view = CMTY.view || 'feed';
  // AJUSTES: todo lo de configuración (perfil, código, toggles, editar, salir) + agregar por código.
  if(view === 'settings'){
    host.innerHTML = _cmtyHeadSub('Tu perfil y ajustes') + _cmtyMyProfileHtml() + _cmtyAddHtml();
    return;
  }
  // BANDEJA: los mensajes directos.
  if(view === 'inbox'){
    host.innerHTML = _cmtyHeadSub('Mensajes') + _cmtyInboxHtml();
    return;
  }
  // PERFIL de otra persona (tocar su nombre/avatar).
  if(view === 'profile'){
    host.innerHTML = '<div style="display:flex;align-items:center;gap:10px;margin:4px 0 14px">' +
        '<button class="btn bg bsm" aria-label="Volver" style="min-height:40px;flex:0 0 auto" onclick="cmtyProfileBack()">‹ Volver</button>' +
        '<div style="flex:1;min-width:0;font-size:19px;font-weight:800;color:var(--t1)">Perfil</div></div>' +
      _cmtyProfileHtml();
    return;
  }
  // MURO (default): contenido primero. Solicitudes arriba (ya son condicionales), luego el muro, tu gente y descubrir.
  host.innerHTML = _cmtyHeadMain() +
    (CMTY.offline ? _cmtyStaleBanner() : '') +
    _cmtyRequestsHtml() +
    _cmtyFollowReqsHtml() +
    _cmtyFeedHtml() +
    _cmtyGymHtml() +
    _cmtyFriendsHtml() +
    _cmtyDiscoverHtml();
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
// A1 adopción: prueba social ARRIBA de todo. Caras conocidas primero, política después (patrón
// Strava/Hevy del informe de benchmark). Sin nadie a quién nombrar devuelve '' y la pantalla
// queda EXACTAMENTE como estaba — nunca un hueco ni un «0 personas».
function _cmtyPeersHtml(){
  const line = (typeof communityPeersLine === 'function') ? communityPeersLine(CMTY.peers) : null;
  if(!line) return '';
  const avatars = line.picked.map((p, i) =>
    '<span style="display:inline-flex;border-radius:50%;box-shadow:0 0 0 2px var(--w)' + (i ? ';margin-left:-9px' : '') + '">' +
      _cmtyAvatarHtml(p, 30) + '</span>').join('');
  return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--rsm);background:var(--gl);margin-bottom:13px">' +
    '<span style="display:flex;flex:0 0 auto">' + avatars + '</span>' +
    '<span style="flex:1;min-width:0;font-size:12.5px;font-weight:700;color:var(--gt);line-height:1.4">' + esc(line.text) + '</span>' +
  '</div>';
}

function _cmtyOptInHtml(){
  const me = (typeof DB !== 'undefined' && DB.clients) ? DB.clients.find(x => x.id === (typeof CUR !== 'undefined' && CUR.clientId)) : null;
  const defName = me ? esc((me.name || '').slice(0, 30)) : '';
  return '<div class="card" style="padding:16px">' +
    _cmtyPeersHtml() +
    '<div style="font-size:15px;font-weight:800;color:var(--t1);margin-bottom:6px">Únete a la comunidad 💚</div>' +
    // Honestidad del consentimiento (A1): decía «te conectas solo por código» y desde el directorio
    // del gym (C5) eso ya NO es cierto — tus compañeros de gym te ven apenas creas el perfil.
    '<div style="font-size:13px;color:var(--t2);line-height:1.55;margin-bottom:12px">Comparte tu <b>constancia</b> con tu gente y motívense juntos. ' +
    'Es <b>opcional</b>: te ven las personas de tu gimnasio y quien tú aceptes por código.</div>' +
    '<div class="card" style="padding:11px 13px;margin-bottom:13px;background:var(--surface)">' +
      '<div style="font-size:12px;font-weight:700;color:var(--t1);margin-bottom:5px">Tu gente verá:</div>' +
      '<div style="font-size:12px;color:var(--t2);line-height:1.6">✓ Tu apodo y avatar (los que elijas)<br>✓ Tu racha, tu nivel y tus logros<br>✓ Si entrenaste hoy (lo puedes ocultar)</div>' +
      '<div style="font-size:12px;font-weight:700;color:var(--t1);margin:8px 0 5px">Nunca verán:</div>' +
      '<div style="font-size:12px;color:var(--t2);line-height:1.6">✗ Tu peso, fotos, medidas ni notas de salud<br>✗ Tus kilos ni tus mensajes con el coach</div>' +
    '</div>' +
    '<label class="ilbl">Tu apodo (así te verán)</label>' +
    '<input class="inp" id="cmty-handle" maxlength="30" placeholder="Ej: Cami" value="' + defName + '" style="margin-bottom:12px">' +
    '<label style="display:flex;gap:9px;align-items:flex-start;font-size:12.5px;color:var(--t2);line-height:1.5;margin-bottom:9px;cursor:pointer">' +
      '<input type="checkbox" id="cmty-ck-consent" style="margin-top:2px;flex:0 0 auto;width:17px;height:17px">' +
      '<span>Autorizo compartir mi apodo, avatar y estadísticas de constancia con los amigos que yo acepte, según la <a href="#" onclick="showLegalDoc(\'politica\');return false" style="color:var(--g);font-weight:700;text-decoration:underline">política de tratamiento de datos</a>.</span></label>' +
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
// `opts.zoom`=true → si hay foto, tocarla la abre en grande (visor). `opts.open`=uid → tocar el
// avatar abre el perfil de esa persona. Solo uno de los dos por avatar.
function _cmtyAvatarHtml(prof, size, opts){
  size = size || 46; opts = opts || {};
  const url = prof && prof.avatar_url;
  const hasPhoto = typeof cmtyAvatarOk === 'function' && cmtyAvatarOk(url);
  let click = '', cursor = '';
  if(opts.zoom && hasPhoto){ click = ' onclick="event.stopPropagation();cmtyZoomAvatar(\'' + esc(url) + '\')"'; cursor = 'cursor:zoom-in;'; }
  else if(opts.open){ click = ' onclick="event.stopPropagation();cmtyOpenProfile(\'' + esc(opts.open) + '\')"'; cursor = 'cursor:pointer;'; }
  if(hasPhoto){
    return '<img src="' + esc(url) + '" alt=""' + click + ' style="' + cursor + 'width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;flex:0 0 auto;background:var(--gl)" onerror="this.style.visibility=\'hidden\'">';
  }
  const ini = esc(typeof cmtyInitials === 'function' ? cmtyInitials(prof && prof.handle) : '?');
  return '<div' + (opts.open ? ' onclick="event.stopPropagation();cmtyOpenProfile(\'' + esc(opts.open) + '\')" style="cursor:pointer;' : ' style="') + 'width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:var(--gl);color:var(--gt);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:' + Math.round(size * 0.36) + 'px;flex:0 0 auto">' + ini + '</div>';
}

// Nombre clicable que abre el perfil de esa persona (tocar el nombre → su perfil).
function _cmtyNameLink(uid, inner){
  return '<span onclick="event.stopPropagation();cmtyOpenProfile(\'' + esc(uid) + '\')" style="cursor:pointer">' + inner + '</span>';
}

function _cmtyMyProfileHtml(){
  const p = CMTY.profile;
  const code = esc(p.share_code || '');
  const bio = p.bio ? esc(p.bio) : '';
  const recv = CMTY.heartsRecv;
  const paused = p.visible === false;
  return '<div class="card" style="padding:14px;margin-bottom:12px">' +
    '<div style="display:flex;gap:12px;align-items:center">' +
      _cmtyAvatarHtml(p, 54, { zoom: true }) +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:15px;font-weight:800;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.handle) + '</div>' +
        '<div style="font-size:12px;color:var(--t2)">Racha ' + (p.streak_weeks || 0) + ' sem · Nivel ' + (p.level || 1) +
          (recv ? ' · ' + recv + ' ❤️' : '') + '</div>' +
      '</div>' +
      '<button class="btn bg bsm" style="min-height:36px;flex:0 0 auto" onclick="cmtyPickAvatar()">' + (typeof aviIcon === 'function' ? aviIcon('pencil', 15) : '✏️') + '</button>' +
    '</div>' +
    '<input type="file" id="cmty-avatar-input" accept="image/*" style="display:none" onchange="cmtyAvatarChosen(this)">' +
    (bio ? '<div style="font-size:12.5px;color:var(--t2);margin-top:9px;line-height:1.5">' + bio + '</div>' : '') +
    // #5 perfil rico — antigüedad (mes+año, nunca el día); se omite si aún no hay historial (fail-visible-nada)
    (function(){ var t = (typeof communityTrainingSinceText === 'function') ? communityTrainingSinceText(p.training_since) : null;
      var n = Number(p.total_sessions) || 0;
      var frag = t || (n > 0 ? (n + ' entreno' + (n === 1 ? '' : 's')) : '');
      return frag ? '<div style="font-size:11.5px;color:var(--t3);margin-top:7px">' + esc(frag) + (t && n > 0 ? ' · ' + n + ' entreno' + (n === 1 ? '' : 's') : '') + '</div>' : ''; })() +
    // Código para compartir
    '<div class="card" style="margin-top:12px;padding:11px 13px;background:var(--surface);display:flex;align-items:center;gap:10px">' +
      '<div style="flex:1;min-width:0"><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.5px">Tu código</div>' +
        '<div style="font-size:19px;font-weight:800;color:var(--g);letter-spacing:2px;font-family:monospace">' + code + '</div></div>' +
      '<button class="btn bg bsm" style="min-height:36px" onclick="cmtyCopyCode()">Copiar</button>' +
      '<button class="btn bp bsm" style="min-height:36px" onclick="cmtyShareCode()">Compartir</button>' +
    '</div>' +
    // Cuenta pública / privada (③c-2)
    _cmtyPublicBlockHtml(p) +
    // Toggles
    '<div style="margin-top:12px;display:flex;flex-direction:column;gap:9px">' +
      _cmtyToggleRow('cmty-tg-visible', 'Perfil activo', 'Si lo pausas, tus amigos no te ven.', !paused, 'cmtyToggleVisible()') +
      _cmtyToggleRow('cmty-tg-today', 'Mostrar si entrené hoy', 'Apágalo si prefieres no compartir tu actividad diaria.', p.show_today !== false, 'cmtyToggleToday()') +
      _cmtyToggleRow('cmty-tg-lastactive', 'Mostrar mi última conexión', 'Verán «en línea» o «activo hoy», nunca la hora exacta.', p.show_last_active === true, 'cmtyToggleLastActive()') +
      _cmtyToggleRow('cmty-tg-milestones', 'Celebrar mis logros en el muro', 'Cuando cumplas semanas seguidas o subas de nivel, aparece en el muro de tu gente.', p.show_milestones === true, 'cmtyToggleMilestones()') +
    '</div>' +
    // #6 PR piloto: «Comparte un récord» — SOLO el coach moderador (piloto). El candado real es la RLS.
    _cmtyPrShareHtml() +
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
    cmtyDmUnsubscribe();
    CMTY.dmThreads = []; CMTY.dmUnread = 0; CMTY.dmOpen = null; CMTY.dmMsgs = [];
    toast('Saliste de la comunidad.');
    await cmtyLoad();
  }catch(e){ toast('No se pudo salir. Intenta de nuevo.'); }
}

// ── Agregar por código ──
function _cmtyAddHtml(){
  return '<div class="card" style="padding:14px;margin-bottom:12px">' +
    '<div style="font-size:13px;font-weight:700;color:var(--t1);margin-bottom:3px">Conectar por código</div>' +
    '<div style="font-size:11.5px;color:var(--t3);margin-bottom:9px">Se conectan los dos: cuando acepte, podrán escribirse y verse.</div>' +
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

// ── Directorio del gimnasio (C5) — compañeros de gym aún no conectados ──
function _cmtyGymHtml(){
  if(!CMTY.gym.length) return '';
  let h = '<div class="card" style="padding:14px;margin-bottom:12px">' +
    '<div style="font-size:13px;font-weight:700;color:var(--t1);margin-bottom:3px">Tu gimnasio</div>' +
    '<div style="font-size:11.5px;color:var(--t3);margin-bottom:10px">Personas de tu gym en AVI. Conéctate con quien quieras.</div>';
  CMTY.gym.forEach(p => {
    h += '<div style="display:flex;align-items:center;gap:11px;padding:7px 0">' +
      _cmtyAvatarHtml(p, 42, { open: p.user_id }) +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:14px;font-weight:700;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _cmtyNameLink(p.user_id, esc(p.handle)) + '</div>' +
        '<div style="font-size:11.5px;color:var(--t2)">Racha ' + (p.streak_weeks || 0) + ' sem · Nivel ' + (p.level || 1) + _cmtyStatsSuffix(p) +
          (_cmtyActivityHtml(p.user_id) ? ' · ' + _cmtyActivityHtml(p.user_id) : '') + '</div>' +
      '</div>' +
      '<button class="btn bg bsm" style="min-height:36px;flex:0 0 auto" onclick="cmtyChatOpen(\'' + p.user_id + '\')" title="Chatear" aria-label="Chatear">' +
        (typeof aviIcon === 'function' ? aviIcon('chat', 15) : '💬') + '</button>' +
      '<button class="btn bp bsm" style="min-height:36px;flex:0 0 auto" onclick="cmtyGymAdd(\'' + p.user_id + '\')">Conectar</button>' +
    '</div>';
  });
  return h + '</div>';
}
async function cmtyGymAdd(userId){
  if(_cmtySealed()){ toast('🔒 (dev) solicitud sellada'); return; }
  try{
    const cli = _cmtyClient(); const uid = CMTY.uid || await _cmtyUid(); if(!cli || !uid) return;
    const lo = uid < userId ? uid : userId, hi = uid < userId ? userId : uid;
    const { error } = await cli.from('friendships').insert({ user_a: lo, user_b: hi, requested_by: uid, status: 'pending' });
    if(error) throw error;
    toast('✅ Solicitud enviada');
    await cmtyLoad();
  }catch(e){ toast(_cmtyErr(e)); }
}

// ── Amigos ──
function _cmtyFriendsHtml(){
  // Sin amigos NO se pinta un vacío propio: el muro ya muestra el estado vacío ÚNICO (R3,
  // `communityEmptyState`) y apilar dos mensajes que dicen lo mismo era ruido, no ayuda.
  if(!CMTY.friends.length) return '';
  let h = '<div style="font-size:13px;font-weight:700;color:var(--t1);margin:4px 2px 9px">Mis amigos (' + CMTY.friends.length + ')</div>';
  CMTY.friends.forEach(f => { h += _cmtyFriendCard(f); });
  return h;
}
function _cmtyFriendCard(f){
  const p = f.prof;
  const given = !!CMTY.heartsGiven[f.fid];
  // trained_today/snapshot_at salieron del grant (§13-BIS.1b, §13.0 «no me gusta ver si entrenó») → la
  // «última conexión» (②, opt-in) reemplaza el «entrenó hoy» en la cara pública.
  return '<div class="card" style="padding:12px;margin-bottom:9px">' +
    '<div style="display:flex;align-items:center;gap:11px">' +
      _cmtyAvatarHtml(p, 46, { open: f.fid }) +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:14px;font-weight:800;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _cmtyNameLink(f.fid, esc(p.handle)) + (p.role === 'coach' ? ' <span style="font-size:10px;font-weight:700;color:var(--g);background:var(--gl);border-radius:6px;padding:1px 6px;vertical-align:middle">COACH</span>' : '') + '</div>' +
        '<div style="font-size:12px;color:var(--t2)">Racha ' + (p.streak_weeks || 0) + ' sem · Nivel ' + (p.level || 1) + ' · ' + (p.sessions_4w || 0) + ' días/4sem' + _cmtyStatsSuffix(p) + '</div>' +
        (_cmtyActivityHtml(f.fid) ? '<div style="font-size:11px;margin-top:1px">' + _cmtyActivityHtml(f.fid) + '</div>' : '') +
      '</div>' +
      '<button class="btn bg bsm" style="min-height:38px;flex:0 0 auto" onclick="cmtyChatOpen(\'' + f.fid + '\')" title="Chatear" aria-label="Chatear">' +
        (typeof aviIcon === 'function' ? aviIcon('chat', 16) : '💬') + '</button>' +
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

// ══════════ ① CHAT EN VIVO (DMs Realtime) ══════════
// Backend: community_messages. La RLS (cm_sel) solo deja ver/recibir hilos donde soy from/to;
// cm_ins exige _can_dm (amistad 'accepted' O mismo gym). Realtime evalúa cm_sel POR suscriptor
// → un extraño no recibe eventos de hilos ajenos (probado a nivel DB, §13-BIS.8 #8/#9). Toda
// escritura por AUTH.client() (JWT real, se refresca solo) y SELLADA en localhost (_cmtySealed).

// Universo de DM (amigos + compañeros de gym) → lookup uid→perfil para pintar hilos.
function _cmtyProfById(){
  const m = {};
  CMTY.friends.forEach(f => { if(f.prof) m[f.fid] = f.prof; });
  CMTY.gym.forEach(p => { if(p && p.user_id) m[p.user_id] = p; });
  if(CMTY.profile && CMTY.uid) m[CMTY.uid] = CMTY.profile;
  return m;
}

// Carga la BANDEJA: agrupa mis mensajes por interlocutor (último + no leídos). Determinista.
async function _cmtyLoadDMs(cli, uid){
  CMTY.dmThreads = []; CMTY.dmUnread = 0;
  const { data, error } = await cli.from('community_messages')
    .select('id,from_user,to_user,text,created_at,read_at')
    .or('from_user.eq.' + uid + ',to_user.eq.' + uid)
    .order('created_at', { ascending: false }).limit(300);
  if(error){ _cw()('cmty dm load:', error && error.message); return; }
  const byPeer = {};
  (data || []).forEach(m => {
    const peer = m.from_user === uid ? m.to_user : m.from_user;
    if(!byPeer[peer]) byPeer[peer] = { uid: peer, last: m.text, at: m.created_at, unread: 0, lastFromMe: m.from_user === uid };
    if(m.to_user === uid && !m.read_at) byPeer[peer].unread++;
  });
  const prof = _cmtyProfById();
  CMTY.dmThreads = Object.keys(byPeer).map(p => Object.assign(byPeer[p], { prof: prof[p] || null }))
    .sort((a, b) => (a.at < b.at ? 1 : -1));
  CMTY.dmUnread = CMTY.dmThreads.reduce((s, t) => s + t.unread, 0);
}

// Bandeja (card en la pestaña Comunidad, tras mi perfil).
function _cmtyInboxHtml(){
  const n = CMTY.dmThreads.length;
  let h = '<div class="card" style="padding:14px;margin-bottom:12px">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:' + (n ? '10px' : '3px') + '">' +
      '<div style="font-size:13px;font-weight:700;color:var(--t1);display:flex;align-items:center;gap:6px">' +
        (typeof aviIcon === 'function' ? aviIcon('chat', 16) : '💬') + ' Mensajes</div>' +
      (CMTY.dmUnread ? '<span style="background:var(--g);color:#fff;font-size:11px;font-weight:800;border-radius:10px;padding:1px 8px">' + CMTY.dmUnread + ' sin leer</span>' : '') +
    '</div>';
  if(!n){
    return h + '<div style="font-size:12px;color:var(--t3);line-height:1.5">Aún no tienes conversaciones. Toca a un amigo o a alguien de tu gym para escribirle.</div></div>';
  }
  CMTY.dmThreads.forEach(t => {
    const name = esc((t.prof && t.prof.handle) || 'Alguien');
    const prev = esc((t.lastFromMe ? 'Tú: ' : '') + (t.last || '').slice(0, 46));
    h += '<div class="tap" style="display:flex;align-items:center;gap:11px;padding:8px 0;cursor:pointer" onclick="cmtyChatOpen(\'' + t.uid + '\')">' +
      _cmtyAvatarHtml(t.prof || {}, 42) +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:14px;font-weight:' + (t.unread ? '800' : '700') + ';color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + name + '</div>' +
        '<div style="font-size:12px;color:' + (t.unread ? 'var(--t1)' : 'var(--t2)') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + prev + '</div>' +
      '</div>' +
      (t.unread ? '<span style="background:var(--g);width:9px;height:9px;border-radius:50%;flex:0 0 auto"></span>' : '<span style="color:var(--t3);flex:0 0 auto">›</span>') +
    '</div>';
  });
  return h + '</div>';
}

// Avatar del encabezado del chat (div .cchat-av): imagen si hay, si no iniciales.
function _cmtyChatBarAvatar(el, prof){
  if(!el) return;
  const url = prof && prof.avatar_url;
  if(typeof cmtyAvatarOk === 'function' && cmtyAvatarOk(url)){
    el.style.backgroundImage = 'url("' + encodeURI(url) + '")';
    el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center'; el.textContent = '';
  }else{
    el.style.backgroundImage = 'none';
    el.textContent = (typeof cmtyInitials === 'function' ? cmtyInitials(prof && prof.handle) : '?');
  }
}

// Abre el hilo con un interlocutor (amigo o compañero de gym).
async function cmtyChatOpen(peerUid){
  if(!peerUid) return;
  const prof = _cmtyProfById()[peerUid] || null;
  CMTY.dmOpen = peerUid;
  _cmtyChatBarAvatar(document.getElementById('cmtychat-av'), prof);
  const nm = document.getElementById('cmtychat-name'); if(nm) nm.textContent = (prof && prof.handle) || 'Chat'; // textContent → sin XSS
  const actTxt = _cmtyActivityText(CMTY.activity && CMTY.activity[peerUid]);
  const sub = document.getElementById('cmtychat-sub');
  if(sub) sub.textContent = (prof ? ('Racha ' + (prof.streak_weeks || 0) + ' sem · Nivel ' + (prof.level || 1)) : '') + (actTxt ? ' · ' + actTxt : '');
  const con = document.getElementById('cmtychat-thread'); if(con) con.innerHTML = '<div class="cchat-empty">Cargando…</div>';
  const el = document.getElementById('cmty-chat');
  if(el){ if(!el.classList.contains('on')) navOpenLayer(); el.classList.add('on'); }
  const ta = document.getElementById('cmtychat-in'); if(ta){ ta.value = ''; ta.style.height = 'auto'; }
  await _cmtyChatLoadThread(peerUid, true);
}

async function _cmtyChatLoadThread(peerUid, toBottom){
  const cli = _cmtyClient(); const uid = CMTY.uid || await _cmtyUid();
  if(!cli || !uid){ const con = document.getElementById('cmtychat-thread'); if(con) con.innerHTML = '<div class="cchat-empty">Conéctate para ver este chat.</div>'; return; }
  const { data, error } = await cli.from('community_messages')
    .select('id,from_user,to_user,text,created_at,read_at')
    .or('and(from_user.eq.' + uid + ',to_user.eq.' + peerUid + '),and(from_user.eq.' + peerUid + ',to_user.eq.' + uid + ')')
    .order('created_at', { ascending: true }).limit(500);
  if(error){ _cw()('cmty thread:', error && error.message); }
  CMTY.dmMsgs = data || [];
  _cmtyChatRender(toBottom);
  _cmtyChatMarkRead();
}

function _cmtyChatRender(toBottom){
  const con = document.getElementById('cmtychat-thread'); if(!con) return;
  const uid = CMTY.uid;
  const nearBottom = toBottom || con.scrollHeight <= con.clientHeight || (con.scrollHeight - con.clientHeight - con.scrollTop) <= 48;
  const prevTop = con.scrollTop;
  if(!CMTY.dmMsgs.length){ con.innerHTML = '<div class="cchat-empty">Aún no hay mensajes.<br>Escríbele el primero 👇</div>'; return; }
  con.innerHTML = '';
  CMTY.dmMsgs.forEach(m => {
    const mine = m.from_user === uid;
    const b = document.createElement('div'); b.className = 'mb ' + (mine ? 'cs' : 'cl'); b.textContent = m.text || ''; con.appendChild(b); // textContent → sin XSS
    const t = document.createElement('div'); t.className = 'mt' + (mine ? ' r' : '');
    let meta = (typeof fmtD === 'function' ? fmtD(m.created_at) : '') + ' ' + (typeof fmtT === 'function' ? fmtT(m.created_at) : '');
    if(mine && m.read_at) meta += ' · leído';
    t.textContent = meta; con.appendChild(t);
  });
  con.scrollTop = nearBottom ? con.scrollHeight : prevTop;
}

// Marca como leídos los mensajes entrantes del hilo abierto (única columna client-writable: read_at).
async function _cmtyChatMarkRead(){
  const uid = CMTY.uid; const peer = CMTY.dmOpen; if(!peer || !uid) return;
  const unreadIds = CMTY.dmMsgs.filter(m => m.to_user === uid && !m.read_at).map(m => m.id);
  if(!unreadIds.length) return;
  if(_cmtySealed()) return;
  try{
    const cli = _cmtyClient(); if(!cli) return;
    const now = new Date().toISOString();
    const { error } = await cli.from('community_messages').update({ read_at: now }).in('id', unreadIds);
    if(error) throw error;
    CMTY.dmMsgs.forEach(m => { if(unreadIds.indexOf(m.id) >= 0) m.read_at = now; });
    const th = CMTY.dmThreads.find(t => t.uid === peer);
    if(th){ CMTY.dmUnread -= th.unread; if(CMTY.dmUnread < 0) CMTY.dmUnread = 0; th.unread = 0; }
  }catch(e){ _cw()('cmty markread:', e && e.message); }
}

async function cmtyChatSend(){
  const ta = document.getElementById('cmtychat-in'); const text = (ta && ta.value || '').trim();
  const peer = CMTY.dmOpen; if(!text || !peer) return;
  if(text.length > 2000){ toast('Mensaje muy largo (máx. 2000 caracteres).'); return; }
  if(_cmtySealed()){ toast('🔒 (dev) chat sellado en localhost'); return; }
  const cli = _cmtyClient(); const uid = CMTY.uid || await _cmtyUid(); if(!cli || !uid) return;
  if(ta) ta.disabled = true;
  try{
    const { data, error } = await cli.from('community_messages').insert({ from_user: uid, to_user: peer, text: text }).select().single();
    if(error) throw error;
    if(ta){ ta.value = ''; ta.style.height = 'auto'; }
    if(data){ CMTY.dmMsgs.push(data); _cmtyChatRender(true); _cmtyDmBumpInbox(data); }
  }catch(e){ toast(_cmtyErr(e)); }
  finally{ if(ta){ ta.disabled = false; ta.focus(); } }
}

function cmtyChatClose(){ navCloseLayer(_cmtyChatClose); }
function _cmtyChatClose(){
  const el = document.getElementById('cmty-chat'); if(el) el.classList.remove('on');
  CMTY.dmOpen = null; CMTY.dmMsgs = [];
  _cmtyPaint(); // refresca la bandeja (no leídos actualizados)
}

// ── Realtime ──────────────────────────────────────────────────────────────
// Actualiza estado/UI con un evento. Puro sobre CMTY + repinta lo visible. La RLS ya filtró
// (solo llegan filas donde soy from/to); el guard de uid es defensa en profundidad.
function cmtyDmRealtime(payload){
  try{
    const uid = CMTY.uid; if(!uid || !payload) return;
    const ev = payload.eventType || payload.type;
    const row = payload.new || payload.old; if(!row) return;
    if(row.from_user !== uid && row.to_user !== uid) return;
    const peer = row.from_user === uid ? row.to_user : row.from_user;
    if(ev === 'INSERT'){
      if(CMTY.dmOpen === peer){
        if(!CMTY.dmMsgs.some(m => m.id === row.id)){ CMTY.dmMsgs.push(row); _cmtyChatRender(); }
        if(row.to_user === uid) _cmtyChatMarkRead();
      }else{
        _cmtyDmBumpInbox(row);
      }
      if(!CMTY.dmOpen) _cmtyPaint(); // en la lista: refresca bandeja + badge
    }else if(ev === 'UPDATE'){
      // acuse de leído de un mensaje MÍO
      if(CMTY.dmOpen === peer){
        const m = CMTY.dmMsgs.find(x => x.id === row.id);
        if(m){ m.read_at = row.read_at; _cmtyChatRender(); }
      }
    }
  }catch(e){ _cw()('cmty rt:', e && e.message); }
}

// Sube un mensaje a la parte alta de la bandeja (sin re-consultar la nube).
function _cmtyDmBumpInbox(row){
  const uid = CMTY.uid; const peer = row.from_user === uid ? row.to_user : row.from_user;
  let th = CMTY.dmThreads.find(t => t.uid === peer);
  if(!th){ th = { uid: peer, prof: _cmtyProfById()[peer] || null, last: '', at: row.created_at, unread: 0, lastFromMe: false }; CMTY.dmThreads.push(th); }
  th.last = row.text; th.at = row.created_at; th.lastFromMe = row.from_user === uid;
  if(!th.prof) th.prof = _cmtyProfById()[peer] || null;
  if(row.to_user === uid && CMTY.dmOpen !== peer){ th.unread++; CMTY.dmUnread++; }
  CMTY.dmThreads.sort((a, b) => (a.at < b.at ? 1 : -1));
}

function cmtyDmSubscribe(){
  if(CMTY.dmSub || !CMTY.profile) return;
  const cli = _cmtyClient(); if(!cli || !cli.channel) return;
  try{
    CMTY.dmSub = cli.channel('cmty-dm-' + (CMTY.uid || 'me'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages' }, cmtyDmRealtime)
      .subscribe();
  }catch(e){ _cw()('cmty subscribe:', e && e.message); }
}
function cmtyDmUnsubscribe(){
  try{ if(CMTY.dmSub){ const cli = _cmtyClient(); if(cli && cli.removeChannel) cli.removeChannel(CMTY.dmSub); CMTY.dmSub = null; } }catch(e){}
}

// ══════════ ② ÚLTIMA CONEXIÓN (etiqueta redondeada, opt-in) ══════════
// El servidor estampa last_active (edge refresh_snapshot); el cliente NUNCA lo ve crudo. La RPC
// cmty_activity_labels (DEFINER, chequeo de visibilidad propio) devuelve solo la etiqueta y solo si
// el dueño hizo opt-in (show_last_active). Ver supabase/community/c7_last_active.sql.

function _cmtyActivityText(bucket){
  return bucket === 'ahora' ? 'En línea'
    : bucket === 'hoy' ? 'Activo hoy'
    : bucket === 'esta semana' ? 'Activo esta semana'
    : bucket === 'hace tiempo' ? 'Hace tiempo' : '';
}
function _cmtyActivityHtml(uid){
  const b = CMTY.activity && CMTY.activity[uid]; if(!b) return '';
  const txt = esc(_cmtyActivityText(b));
  if(b === 'ahora') return '<span style="color:var(--g);font-weight:700">● ' + txt + '</span>';
  return '<span style="color:var(--t3)">' + txt + '</span>';
}

// Carga las etiquetas de última conexión de mis amigos + compañeros de gym en UNA llamada.
async function _cmtyLoadActivity(cli, uid){
  CMTY.activity = {};
  const ids = [];
  CMTY.friends.forEach(f => { if(f.fid) ids.push(f.fid); });
  CMTY.gym.forEach(p => { if(p && p.user_id) ids.push(p.user_id); });
  if(!ids.length) return;
  try{
    const { data, error } = await cli.rpc('cmty_activity_labels', { targets: ids });
    if(error){ _cw()('cmty activity:', error.message); return; }
    (data || []).forEach(r => { if(r && r.label) CMTY.activity[r.uid] = r.label; });
  }catch(e){ _cw()('cmty activity:', e && e.message); }
}

async function cmtyToggleLastActive(){
  const next = !(CMTY.profile.show_last_active === true);
  await _cmtyPatch({ show_last_active: next });
}

// R2 — opt-in de HITOS (default false). Solo habilita/deshabilita la PUBLICACIÓN: el hito lo
// emite la edge `refresh_snapshot` con service_role (el cliente no puede insertar kind≠'routine',
// candado `cpost_ins`). Encenderlo NO publica retroactivamente: solo el próximo umbral que cruce.
async function cmtyToggleMilestones(){
  const next = !(CMTY.profile.show_milestones === true);
  await _cmtyPatch({ show_milestones: next });
  if(next) toast('🎉 Tus logros aparecerán en el muro');
}

// ══════════ ③c-2 CUENTA PÚBLICA / PRIVADA + activación (fecha de nacimiento, menores) ══════════
// El cliente alterna is_private (el trigger de menor es la autoridad final, §13-BIS.3). Hacerse público
// como ADULTO exige que la edge activate_public_profile fije birth_date (server-side, write-once) — sin
// fecha = fail-safe menor = privado forzado. `role` (insignia coach) lo fija la edge verificando que
// POSEE asesorados (NO user_data.role, client-writable, F7). La UI RELEE el valor real tras cada cambio.

function _cmtyMinorFlag(){ try{ return localStorage.getItem('ax_cmty_minor_' + (CMTY.uid || '')) === '1'; }catch(e){ return false; } }
function _cmtySetMinorFlag(){ try{ localStorage.setItem('ax_cmty_minor_' + (CMTY.uid || ''), '1'); }catch(e){} }

function _cmtyPublicBlockHtml(p){
  const isPublic = p.is_private === false;
  const coachTag = p.role === 'coach'
    ? '<div style="font-size:11px;font-weight:800;color:var(--gt);margin-bottom:7px;display:flex;align-items:center;gap:5px">' + (typeof aviIcon === 'function' ? aviIcon('crown', 13) : '👑') + ' Perfil de coach</div>'
    : '';
  if(_cmtyMinorFlag() && !isPublic){
    return '<div class="card" style="margin-top:12px;padding:11px 13px;background:var(--surface)">' + coachTag +
      '<div><div style="font-size:13px;font-weight:600;color:var(--t1)">Perfil privado 🔒</div>' +
      '<div style="font-size:11.5px;color:var(--t3);line-height:1.4">Las cuentas de menores de 18 años son privadas por tu seguridad.</div></div></div>';
  }
  const sub = isPublic ? 'Cualquiera en AVI puede encontrarte y seguirte.' : 'Solo tus amigos y tu gym te ven. Ábrelo para que te descubran.';
  return '<div class="card" style="margin-top:12px;padding:11px 13px;background:var(--surface)">' + coachTag +
    _cmtyToggleRow('cmty-tg-public', 'Perfil público', sub, isPublic, 'cmtyTogglePublic()') +
    '<div id="cmty-bd-box" style="display:none;margin-top:10px"></div>' +
    '</div>';
}

async function _cmtySetPrivate(val){
  const cli = _cmtyClient(); const uid = CMTY.uid || await _cmtyUid(); if(!cli || !uid) return;
  const { error } = await cli.from('community_profiles').update({ is_private: val }).eq('user_id', uid);
  if(error) throw error;
  await cmtyLoad(); // RELEE el valor REAL (el trigger de menor pudo forzarlo, §13-BIS.3)
}

async function cmtyTogglePublic(){
  if(_cmtySealed()){ toast('🔒 (dev) sellado en localhost'); return; }
  if(CMTY.profile.is_private === false){
    try{ await _cmtySetPrivate(true); toast('🔒 Tu perfil ahora es privado'); }catch(e){ toast(_cmtyErr(e)); }
    return;
  }
  const cli = _cmtyClient(); if(!cli) return;
  try{
    const { data, error } = await cli.functions.invoke('activate_public_profile', { body: {} });
    if(error) throw error;
    if(data && data.needs_birthdate){ _cmtyShowBdBox(); return; }
    if(data && data.is_minor){ _cmtySetMinorFlag(); toast('Tu cuenta queda privada por tu seguridad (menor de 18).'); await cmtyLoad(); return; }
    await _cmtySetPrivate(false); toast('🌎 Tu perfil ahora es público');
  }catch(e){ toast(_cmtyErr(e)); _cmtyPaint(); }
}

function _cmtyShowBdBox(){
  const box = document.getElementById('cmty-bd-box'); if(!box) return;
  box.style.display = 'block';
  box.innerHTML = '<div style="font-size:12px;color:var(--t2);line-height:1.5;margin-bottom:7px">Para proteger a los menores, confirma tu fecha de nacimiento. Es <b>solo una vez</b> y <b>nadie</b> la ve.</div>' +
    '<input class="inp" id="cmty-bd-input" type="date" style="margin-bottom:8px">' +
    '<div style="display:flex;gap:8px"><button class="btn bg bsm" style="flex:1;min-height:38px" onclick="_cmtyHideBdBox()">Cancelar</button>' +
    '<button class="btn bp bsm" style="flex:1;min-height:38px" onclick="cmtySubmitBirthdate()">Confirmar</button></div>';
}
function _cmtyHideBdBox(){ const box = document.getElementById('cmty-bd-box'); if(box){ box.style.display = 'none'; box.innerHTML = ''; } _cmtyPaint(); }

async function cmtySubmitBirthdate(){
  const el = document.getElementById('cmty-bd-input'); const bd = el ? el.value : '';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(bd)){ toast('Elige una fecha válida.'); return; }
  if(_cmtySealed()){ toast('🔒 (dev) sellado en localhost'); return; }
  const cli = _cmtyClient(); if(!cli) return;
  try{
    const { data, error } = await cli.functions.invoke('activate_public_profile', { body: { birth_date: bd } });
    if(error) throw error;
    if(data && data.is_minor){ _cmtySetMinorFlag(); toast('Gracias. Por tu seguridad, tu cuenta de menor queda privada.'); await cmtyLoad(); return; }
    await _cmtySetPrivate(false); toast('🌎 ¡Listo! Tu perfil ahora es público');
  }catch(e){ toast(_cmtyErr(e)); }
}

// ══════════ ③c-3 DESCUBRIR + SEGUIR ══════════
// La rama pública de cp_sel (③a) hace que la carga «todos los visibles» traiga también perfiles
// PÚBLICOS. Se reparten con is_private: privado-no-amigo = compañero de gym (única vía de visibilidad
// privada); público-no-amigo = descubrir. Seguir usa `follows` (③b): a un público = active al instante;
// a un privado = pending hasta que apruebe. Un bloqueo corta (trigger). NO abre DM.

function _cmtyFollowBtn(uid){
  const s = CMTY.following[uid];
  if(s === 'active') return '<button class="btn bg bsm" style="min-height:36px;flex:0 0 auto" onclick="cmtyUnfollow(\'' + uid + '\')">Siguiendo ✓</button>';
  if(s === 'pending') return '<button class="btn bg bsm" style="min-height:36px;flex:0 0 auto" onclick="cmtyUnfollow(\'' + uid + '\')">Pendiente</button>';
  return '<button class="btn bp bsm" style="min-height:36px;flex:0 0 auto" onclick="cmtyFollow(\'' + uid + '\')">Seguir</button>';
}
function _cmtyCoachTag(p){
  return p && p.role === 'coach' ? ' <span style="font-size:10px;font-weight:700;color:var(--gt);background:var(--gl);border-radius:6px;padding:1px 6px;vertical-align:middle">COACH</span>' : '';
}

function _cmtyDiscoverHtml(){
  if(!CMTY.discover.length) return '';
  let h = '<div class="card" style="padding:14px;margin-bottom:12px">' +
    '<div style="font-size:13px;font-weight:700;color:var(--t1);margin-bottom:3px">Descubrir</div>' +
    '<div style="font-size:11.5px;color:var(--t3);margin-bottom:10px">Perfiles públicos en AVI. Sigue a quien te inspire.</div>';
  CMTY.discover.forEach(p => {
    h += '<div style="display:flex;align-items:center;gap:11px;padding:7px 0">' +
      _cmtyAvatarHtml(p, 42, { open: p.user_id }) +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:14px;font-weight:700;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _cmtyNameLink(p.user_id, esc(p.handle)) + _cmtyCoachTag(p) + '</div>' +
        '<div style="font-size:11.5px;color:var(--t2)">Racha ' + (p.streak_weeks || 0) + ' sem · Nivel ' + (p.level || 1) + _cmtyStatsSuffix(p) +
          (_cmtyActivityHtml(p.user_id) ? ' · ' + _cmtyActivityHtml(p.user_id) : '') + '</div>' +
      '</div>' +
      _cmtyFollowBtn(p.user_id) +
    '</div>';
  });
  return h + '</div>';
}

function _cmtyFollowReqsHtml(){
  if(!CMTY.followerReqs.length) return '';
  let h = '<div class="card" style="padding:14px;margin-bottom:12px"><div style="font-size:13px;font-weight:700;color:var(--t1);margin-bottom:9px">Solicitudes para seguirte</div>';
  CMTY.followerReqs.forEach(uid => {
    const p = CMTY.profById[uid];
    const name = p ? esc(p.handle) : 'Alguien';
    h += '<div style="display:flex;align-items:center;gap:10px;padding:7px 0">' +
      _cmtyAvatarHtml(p || {}, 38) +
      '<div style="flex:1;min-width:0;font-size:13.5px;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><b>' + name + '</b>' + _cmtyCoachTag(p) + ' quiere seguirte</div>' +
      '<button class="btn bp bsm" style="min-height:36px" onclick="cmtyApproveFollow(\'' + uid + '\')">Aceptar</button>' +
      '<button class="btn bg bsm" style="min-height:36px;padding:0 10px" onclick="cmtyRejectFollow(\'' + uid + '\')">✕</button></div>';
  });
  return h + '</div>';
}

async function cmtyFollow(uid){
  if(_cmtySealed()){ toast('🔒 (dev) sellado en localhost'); return; }
  try{
    const cli = _cmtyClient(); const me = CMTY.uid || await _cmtyUid(); if(!cli || !me) return;
    const { error } = await cli.from('follows').insert({ follower: me, followee: uid });
    if(error) throw error;
    toast('✅ Siguiendo'); await cmtyLoad();
  }catch(e){ toast(_cmtyErr(e)); }
}
async function cmtyUnfollow(uid){
  if(_cmtySealed()){ toast('🔒 (dev)'); return; }
  try{
    const cli = _cmtyClient(); const me = CMTY.uid || await _cmtyUid(); if(!cli || !me) return;
    const { error } = await cli.from('follows').delete().eq('follower', me).eq('followee', uid);
    if(error) throw error;
    await cmtyLoad();
  }catch(e){ toast(_cmtyErr(e)); }
}
async function cmtyApproveFollow(uid){
  if(_cmtySealed()){ toast('🔒 (dev)'); return; }
  try{
    const cli = _cmtyClient(); const me = CMTY.uid || await _cmtyUid(); if(!cli || !me) return;
    const { error } = await cli.from('follows').update({ state: 'active' }).eq('follower', uid).eq('followee', me);
    if(error) throw error;
    toast('🤝 Aceptaste el seguidor'); await cmtyLoad();
  }catch(e){ toast(_cmtyErr(e)); }
}
async function cmtyRejectFollow(uid){
  if(_cmtySealed()){ toast('🔒 (dev)'); return; }
  try{
    const cli = _cmtyClient(); const me = CMTY.uid || await _cmtyUid(); if(!cli || !me) return;
    const { error } = await cli.from('follows').delete().eq('follower', uid).eq('followee', me);
    if(error) throw error;
    await cmtyLoad();
  }catch(e){ toast(_cmtyErr(e)); }
}

// ══════════ ④ MURO (FEED) — publicar rutinas + ver las de a quien sigo ══════════
// La RLS (cpost_sel + _profile_visible) es el candado real; esto solo pinta lo que el servidor
// deja ver. Cargo posts de a quien sigo ACTIVO + los míos (defensa en profundidad: la RLS igual
// filtra). Nada de datos sensibles: el payload ya viene acotado por el trigger (solo rutina).
async function _cmtyLoadFeed(cli, uid){
  const authors = Object.keys(CMTY.following).filter(u => CMTY.following[u] === 'active');
  authors.push(uid); // mis propias publicaciones también salen en el muro
  const { data: posts, error } = await cli.from('community_posts')
    .select('id,user_id,kind,payload,created_at')
    .in('user_id', authors)
    .eq('visible', true)
    .order('created_at', { ascending: false })
    .limit(40);
  if(error){ _cw()('cmty feed:', error.message); return; }
  CMTY.posts = posts || [];
  const ids = CMTY.posts.map(p => p.id);
  if(ids.length){
    // ❤️ de estos posts (RLS re_sel: solo los que puedo ver = estos). context = post.id.
    const { data: rx } = await cli.from('community_reactions').select('from_user,context').in('context', ids);
    (rx || []).forEach(r => {
      if(!r.context) return;
      CMTY.postHearts[r.context] = (CMTY.postHearts[r.context] || 0) + 1;
      if(r.from_user === uid) CMTY.postHeartMine[r.context] = true;
    });
    await _cmtyLoadComments(cli, ids); // #4 comentarios de esos mismos posts
  }
}

// v3-a #4 — comentarios de los posts del muro. El `.in(post_id)` es ALCANCE, no seguridad: la RLS
// (cc_sel → _can_see_post) ya decide qué puede leer este usuario. Mismo patrón que las reacciones.
async function _cmtyLoadComments(cli, ids){
  const { data, error } = await cli.from('community_comments')
    .select('id,post_id,user_id,text,created_at')
    .in('post_id', ids)
    .order('created_at', { ascending: true })
    .limit(400);
  if(error){ _cw()('cmty comments:', error.message); return; }
  CMTY.postComments = {};
  (data || []).forEach(c => { (CMTY.postComments[c.post_id] = CMTY.postComments[c.post_id] || []).push(c); });
}

// Recarga SOLO un hilo (tras comentar/borrar): no repinta media pestaña ni redescarga el muro.
async function _cmtyReloadThread(cli, postId){
  const { data, error } = await cli.from('community_comments')
    .select('id,post_id,user_id,text,created_at')
    .eq('post_id', postId).order('created_at', { ascending: true }).limit(200);
  if(error){ _cw()('cmty thread:', error.message); return; }
  CMTY.postComments[postId] = data || [];
}

// Perfil del autor de un post (para avatar/handle): reusa lo ya cargado (amigos/gym/discover/profById/propio).
function _cmtyAuthorProf(userId){
  if(userId === CMTY.uid) return CMTY.profile;
  const f = CMTY.friends.find(x => x.fid === userId); if(f && f.prof) return f.prof;
  return CMTY.profById[userId] || null;
}

// #5 perfil rico — sufijo « · N entrenos» para la línea de stats de una tarjeta (amigo/gym/descubrir).
// Solo si N>0 (perfil sin snapshot todavía → nada, jamás « · 0 entrenos»). Server-side, no inflable.
function _cmtyStatsSuffix(p){
  const n = p && Number(p.total_sessions);
  return (n > 0) ? ' · ' + n + ' entreno' + (n === 1 ? '' : 's') : '';
}

// ══════════ #6 · PR PILOTO — compartir un récord de PESO (SOLO el coach moderador) ══════════
// Piloto solo-coach (§6-BIS.3). El candado REAL es la RLS (cpost_ins → _is_moderator + no menor);
// esta UI solo se ofrece si CMTY.isModerator. El valor NO se teclea: se LEE de un PR ya registrado
// (anti-cheat de UX, communityPrPayload). Opt-in ACTIVO por publicación: cada récord pasa por una
// confirmación explícita que dice que ESTO SÍ muestra un número de peso a quien vea tu perfil.

// Mis récords de PESO (unit kg) del perfil que estoy usando (COACH_SELF → DB.prs[CUR.clientId]).
function _cmtyMyKgPrs(){
  try{
    const cid = (typeof CUR !== 'undefined' && CUR.clientId) ? CUR.clientId : null;
    const map = (cid && DB.prs && DB.prs[cid]) ? DB.prs[cid] : {};
    const out = [];
    Object.keys(map).forEach(key => {
      const pr = map[key];
      const payload = (typeof communityPrPayload === 'function') ? communityPrPayload(pr) : null;
      if(payload) out.push({ key: key, name: payload.exercise_name, val: payload.value_kg });
    });
    return out.sort((a, b) => b.val - a.val); // el más pesado primero
  }catch(e){ return []; }
}

function _cmtyPrShareHtml(){
  if(!CMTY.isModerator) return ''; // piloto: la opción ni aparece si no eres el coach
  const prs = _cmtyMyKgPrs();
  let h = '<div class="card" style="margin-top:12px;padding:12px 13px;background:var(--surface)">' +
    '<div style="font-size:13px;font-weight:800;color:var(--t1);display:flex;align-items:center;gap:6px">' +
      (typeof aviIcon === 'function' ? aviIcon('trophy', 15) : '🏆') + 'Comparte un récord</div>' +
    '<div style="font-size:11.5px;color:var(--t2);margin:5px 0 4px;line-height:1.5">Elige un récord de peso para mostrarlo en tu muro. Es una acción tuya: se publica solo cuando tú lo confirmas, y muestra ese número a quien vea tu perfil.</div>';
  if(CMTY.prConfirm){
    const c = CMTY.prConfirm;
    h += '<div class="card" style="margin-top:8px;padding:11px;border-color:var(--g2)">' +
      '<div style="font-size:13px;color:var(--t1);line-height:1.5">Vas a mostrar <b>' + esc(c.name) + ' — ' + esc(String(c.val)) + ' kg</b> a quien vea tu perfil. ¿Publicarlo?</div>' +
      '<div style="display:flex;gap:8px;margin-top:9px">' +
        '<button class="btn bg bsm" style="flex:1;min-height:38px" onclick="cmtyPrCancel()">Cancelar</button>' +
        '<button class="btn bp bsm" style="flex:1;min-height:38px" onclick="cmtyPublishPr()">Sí, publicar</button>' +
      '</div></div>';
    return h + '</div>';
  }
  if(!prs.length){
    h += '<div style="font-size:12px;color:var(--t3);margin-top:6px">Aún no tienes récords de peso registrados. Entrena y quedarán aquí.</div>';
    return h + '</div>';
  }
  prs.slice(0, 12).forEach((pr, i) => {
    h += '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--br)">' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13.5px;font-weight:700;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(pr.name) + '</div>' +
        '<div style="font-size:12px;color:var(--g);font-weight:700">' + esc(String(pr.val)) + ' kg</div>' +
      '</div>' +
      '<button class="btn bg bsm" style="min-height:36px;flex:0 0 auto" onclick="cmtyPrAsk(' + i + ')">Compartir</button>' +
    '</div>';
  });
  return h + '</div>';
}

// Abre la confirmación para el récord #i (por índice → ningún dato de usuario entra a un atributo).
function cmtyPrAsk(i){
  const prs = _cmtyMyKgPrs();
  const pr = prs[i]; if(!pr) return;
  CMTY.prConfirm = { key: pr.key, name: pr.name, val: pr.val };
  _cmtyPaint();
}
function cmtyPrCancel(){ CMTY.prConfirm = null; _cmtyPaint(); }

async function cmtyPublishPr(){
  const c = CMTY.prConfirm; if(!c) return;
  // Re-derivo el payload del PR REAL (no del estado de confirmación) → el valor sale de ax_pr, no
  // de nada editable. communityPrPayload vuelve a validar unit/rango (espejo del trigger).
  const cid = (typeof CUR !== 'undefined' && CUR.clientId) ? CUR.clientId : null;
  const pr = (cid && DB.prs && DB.prs[cid]) ? DB.prs[cid][c.key] : null;
  const payload = (typeof communityPrPayload === 'function') ? communityPrPayload(pr) : null;
  if(!payload){ toast('No pude preparar ese récord.'); CMTY.prConfirm = null; _cmtyPaint(); return; }
  if(_cmtySealed()){ toast('🔒 (dev) publicar récord sellado en localhost'); return; }
  try{
    const cli = _cmtyClient(); const uid = CMTY.uid || await _cmtyUid(); if(!cli || !uid) return;
    const { error } = await cli.from('community_posts').insert({ user_id: uid, kind: 'pr', payload: payload });
    if(error) throw error;
    CMTY.prConfirm = null;
    toast('🏆 Récord publicado en tu muro');
    await cmtyLoad();
  }catch(e){ toast(_cmtyErr(e)); }
}

// Tarjeta del muro para un récord (kind='pr'): «Ejercicio — N kg» + felicitar/comentar. JAMÁS más
// que el número que el dueño eligió publicar (allow-list del trigger: solo exercise_name/value_kg).
function _cmtyPrCard(post){
  const pl = post.payload || {};
  const prof = _cmtyAuthorProf(post.user_id);
  const mine = post.user_id === CMTY.uid;
  const who = mine ? (prof ? esc(prof.handle) : 'Tú') : _cmtyNameLink(post.user_id, prof ? esc(prof.handle) : 'Alguien');
  const name = esc(pl.exercise_name || 'Ejercicio');
  const val = (pl.value_kg != null && !isNaN(pl.value_kg)) ? esc(String(pl.value_kg)) : '';
  return '<div class="card" style="padding:13px;margin-bottom:10px;border-color:var(--g2)">' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">' +
      _cmtyAvatarHtml(prof || {}, 40, mine ? {} : { open: post.user_id }) +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13.5px;font-weight:800;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + who + _cmtyCoachTag(prof) + '</div>' +
        '<div style="font-size:11.5px;color:var(--t3)">marcó un récord</div>' +
      '</div>' +
      '<div style="flex:0 0 auto">' + (typeof aviIcon === 'function' ? aviIcon('trophy', 22) : '🏆') + '</div>' +
    '</div>' +
    '<div style="font-size:16px;font-weight:800;color:var(--t1)">' + name + (val ? ' — <span style="color:var(--g)">' + val + ' kg</span>' : '') + '</div>' +
    _cmtyActionsHtml(post, { canDelete: mine, heartTitle: 'Felicitar' }) +
  '</div>';
}

// ══════════ PERFIL DE OTRA PERSONA (tocar nombre/avatar → su perfil) ══════════
// Reusa TODO lo ya cargado: el perfil del amigo/gym/descubrir (con su avatar/racha/nivel/entrenos/
// antigüedad) + sus publicaciones (community_posts, la RLS filtra) + conteo de seguidores (RPC
// segura c19). NO expone nada que la RLS no deje ver. La foto se puede tocar para verla en grande.

async function cmtyOpenProfile(uid){
  if(!uid || uid === CMTY.uid){ return; } // el propio perfil vive en Ajustes
  CMTY.profileFrom = (CMTY.view === 'profile') ? CMTY.profileFrom : (CMTY.view || 'feed');
  CMTY.profileUid = uid;
  CMTY.profileProf = _cmtyAuthorProf(uid) || CMTY.profById[uid] || null;
  CMTY.profilePosts = []; CMTY.profileCounts = null; CMTY.profileLoading = true;
  CMTY.view = 'profile';
  _cmtyPaint();
  const h = document.getElementById('cn-community'); if(h){ try{ window.scrollTo(0, 0); }catch(e){} }
  await _cmtyLoadProfile(uid);
  CMTY.profileLoading = false;
  if(CMTY.view === 'profile' && CMTY.profileUid === uid) _cmtyPaint();
}

function cmtyProfileBack(){
  const to = CMTY.profileFrom || 'feed';
  CMTY.profileUid = null; CMTY.profileProf = null; CMTY.profilePosts = []; CMTY.profileCounts = null;
  cmtyGoView(to);
}

async function _cmtyLoadProfile(uid){
  try{
    const cli = _cmtyClient(); if(!cli) return;
    // sus publicaciones visibles para mí (la RLS cpost_sel decide; el .eq es alcance, no seguridad)
    const { data: posts } = await cli.from('community_posts')
      .select('id,user_id,kind,payload,created_at').eq('user_id', uid).eq('visible', true)
      .order('created_at', { ascending: false }).limit(40);
    if(CMTY.profileUid !== uid) return; // el usuario ya navegó a otro lado
    CMTY.profilePosts = posts || [];
    // ❤️ de esos posts (para pintar el estado del corazón como en el muro)
    const ids = CMTY.profilePosts.map(p => p.id);
    if(ids.length){
      const { data: rx } = await cli.from('community_reactions').select('from_user,context').in('context', ids);
      (rx || []).forEach(r => { if(!r.context) return; CMTY.postHearts[r.context] = (CMTY.postHearts[r.context] || 0) + 1; if(r.from_user === CMTY.uid) CMTY.postHeartMine[r.context] = true; });
      await _cmtyLoadComments(cli, ids); // que el contador 💬 salga bien también aquí
    }
    // conteo de seguidores (RPC segura; 0 filas si no puedo ver ese perfil)
    try{ const { data: fc } = await cli.rpc('cmty_follow_counts', { target: uid }); if(fc && fc[0]) CMTY.profileCounts = fc[0]; }
    catch(e){ _cw()('cmty follow counts:', e && e.message); }
  }catch(e){ _cw()('cmty profile:', e && e.message); }
}

function _cmtyProfileHtml(){
  const p = CMTY.profileProf;
  if(!p){
    return '<div class="empty"><div class="eico">' + (typeof aviIcon === 'function' ? aviIcon('users', 30) : '👥') + '</div>' +
      '<div class="etxt">No pudimos abrir este perfil</div>' +
      '<div class="esub">Puede que esta persona ya no esté en tu comunidad.</div></div>';
  }
  const isCoach = p.role === 'coach';
  const act = (typeof _cmtyActivityHtml === 'function') ? _cmtyActivityHtml(CMTY.profileUid) : '';
  const since = (typeof communityTrainingSinceText === 'function') ? communityTrainingSinceText(p.training_since) : null;
  // Encabezado: avatar grande (tocar = ver en grande si hay foto) + nombre + insignia coach + bio
  let h = '<div class="card" style="padding:16px;margin-bottom:12px;text-align:center">' +
    '<div style="display:flex;justify-content:center;margin-bottom:10px">' + _cmtyAvatarHtml(p, 92, { zoom: true }) + '</div>' +
    '<div style="font-size:19px;font-weight:800;color:var(--t1)">' + esc(p.handle || 'Alguien') + '</div>' +
    (isCoach ? '<div style="font-size:11px;font-weight:800;color:var(--gt);margin-top:3px;display:inline-flex;align-items:center;gap:4px">' + (typeof aviIcon === 'function' ? aviIcon('crown', 13) : '👑') + ' Perfil de coach</div>' : '') +
    (p.bio ? '<div style="font-size:13px;color:var(--t2);margin-top:8px;line-height:1.5">' + esc(p.bio) + '</div>' : '') +
    (act ? '<div style="font-size:11.5px;margin-top:7px">' + act + '</div>' : '') +
  '</div>';
  // Rejilla de cifras (server-side, no inflables)
  const cells = [];
  cells.push(['Racha', (p.streak_weeks || 0) + ' sem']);
  cells.push(['Nivel', String(p.level || 1)]);
  if(Number(p.total_sessions) > 0) cells.push(['Entrenos', String(p.total_sessions)]);
  if(Number(p.achievements) > 0) cells.push(['Logros', String(p.achievements)]);
  if(CMTY.profileCounts){
    cells.push(['Seguidores', String(CMTY.profileCounts.followers || 0)]);
    cells.push(['Sigue a', String(CMTY.profileCounts.following || 0)]);
  }
  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">';
  cells.forEach(c => {
    h += '<div class="card" style="padding:11px 6px;text-align:center;margin:0">' +
      '<div style="font-size:17px;font-weight:800;color:var(--t1)">' + esc(c[1]) + '</div>' +
      '<div style="font-size:10.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-top:2px">' + esc(c[0]) + '</div>' +
    '</div>';
  });
  h += '</div>';
  if(since) h += '<div style="font-size:12px;color:var(--t3);text-align:center;margin-bottom:12px">' + esc(since) + '</div>';
  // Sus publicaciones
  h += '<div style="font-size:13px;font-weight:700;color:var(--t1);margin:6px 2px 9px">Sus publicaciones</div>';
  if(CMTY.profileLoading){
    h += '<div class="card" style="padding:16px;text-align:center;color:var(--t2)">Cargando…</div>';
  }else if(!CMTY.profilePosts.length){
    h += '<div class="empty"><div class="etxt">Aún no ha publicado nada</div>' +
      '<div class="esub">Cuando comparta una rutina, un entreno o un logro, aparecerá aquí.</div></div>';
  }else{
    CMTY.profilePosts.forEach(post => { h += _cmtyPostCard(post); });
  }
  return h;
}

// Visor de foto en grande (tocar el avatar con foto). Overlay a pantalla completa; toca para cerrar.
function cmtyZoomAvatar(url){
  if(typeof cmtyAvatarOk === 'function' && !cmtyAvatarOk(url)) return; // solo fotos del bucket propio
  let ov = document.getElementById('cmty-avatar-zoom');
  if(!ov){ ov = document.createElement('div'); ov.id = 'cmty-avatar-zoom'; document.body.appendChild(ov); }
  ov.setAttribute('style', 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;padding:20px');
  ov.innerHTML = '<img src="' + esc(url) + '" alt="" style="max-width:94vw;max-height:88vh;border-radius:14px;object-fit:contain" onerror="cmtyCloseZoom()">' +
    '<button aria-label="Cerrar" onclick="cmtyCloseZoom()" style="position:absolute;top:16px;right:16px;width:42px;height:42px;border-radius:50%;border:none;background:rgba(255,255,255,.15);color:#fff;font-size:22px;cursor:pointer">✕</button>';
  ov.onclick = function(e){ if(e.target === ov) cmtyCloseZoom(); };
}
function cmtyCloseZoom(){ const ov = document.getElementById('cmty-avatar-zoom'); if(ov){ ov.remove(); } }

// Mis rutinas propias (el asesorado logueado) para el picker de publicar.
function _cmtyMyRoutines(){
  try{
    const cid = (typeof CUR !== 'undefined' && CUR.clientId) ? CUR.clientId : null;
    const me = cid && Array.isArray(DB.clients) ? DB.clients.find(c => c.id === cid) : null;
    return (me && Array.isArray(me.routines)) ? me.routines : [];
  }catch(e){ return []; }
}

// Conteos que alimentan el estado vacío ÚNICO (la decisión vive pura en avi-core).
function _cmtyCounts(){
  return {
    posts: CMTY.posts.length, friends: CMTY.friends.length, gym: CMTY.gym.length,
    discover: CMTY.discover.length, following: Object.keys(CMTY.following || {}).length,
    incoming: CMTY.incoming.length, outgoing: CMTY.outgoing.length, followerReqs: CMTY.followerReqs.length
  };
}
// R3 — UN SOLO vacío accionable. Antes se apilaban dos («muro tranquilo» + «no tienes amigos»)
// que repetían el mismo mensaje sin resolver el caso real: no tener a nadie todavía.
function _cmtyEmptyHtml(state){
  if(state === 'lonely'){
    return '<div class="empty"><div class="eico">' + (typeof aviIcon === 'function' ? aviIcon('users', 30) : '👥') + '</div>' +
      '<div class="etxt">Aquí verás a tu gente</div>' +
      '<div class="esub">Conéctate con alguien y sus rutinas aparecerán en este muro. Comparte tu código o pega el de un amigo.</div>' +
      '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px">' +
        '<button class="btn bp" style="min-height:40px" onclick="cmtyShareCode()">Compartir mi código</button>' +
        '<button class="btn bg" style="min-height:40px" onclick="cmtyGoView(\'settings\')">Pegar un código</button>' +
      '</div></div>';
  }
  return '<div class="empty"><div class="eico">' + (typeof aviIcon === 'function' ? aviIcon('clipboard', 30) : '📋') + '</div>' +
    '<div class="etxt">Todavía nadie ha publicado</div>' +
    '<div class="esub">Publica una de tus rutinas y anima a los demás a mostrar la suya.</div></div>';
}

function _cmtyFeedHtml(){
  let h = '<div style="font-size:13px;font-weight:700;color:var(--t1);margin:14px 2px 9px">El muro</div>'; // R2: ya no es «de rutinas» — también trae hitos
  h += _cmtyComposeHtml();
  if(!CMTY.posts.length){
    const st = (typeof communityEmptyState === 'function') ? communityEmptyState(_cmtyCounts()) : 'quiet';
    return h + _cmtyEmptyHtml(st);
  }
  CMTY.posts.forEach(p => { h += _cmtyPostCard(p); });
  return h;
}

function _cmtyComposeHtml(){
  const routines = _cmtyMyRoutines();
  let h = '<div class="card" style="padding:12px;margin-bottom:10px">';
  h += '<button class="btn bp" style="width:100%;min-height:44px" onclick="cmtyComposeToggle()">' +
    (typeof aviIcon === 'function' ? aviIcon('clipboard', 16) : '📋') + ' Publicar una de mis rutinas</button>';
  if(CMTY.composeOpen){
    if(!routines.length){
      h += '<div style="font-size:12.5px;color:var(--t2);margin-top:10px;text-align:center">Aún no tienes rutinas para compartir. Crea una en «Rutinas».</div>';
    }else{
      h += '<div style="font-size:11.5px;color:var(--t3);margin:10px 2px 8px">Se comparten solo el nombre, el día y los ejercicios (series y reps). Nunca tus pesos ni datos de salud.</div>';
      routines.forEach((r, i) => {
        const nex = Array.isArray(r.exercises) ? r.exercises.length : 0;
        h += '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--br)">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:13.5px;font-weight:700;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(r.name || 'Rutina') + '</div>' +
            '<div style="font-size:11.5px;color:var(--t2)">' + esc(r.day || 'Sin día') + ' · ' + nex + ' ejercicio' + (nex === 1 ? '' : 's') + '</div>' +
          '</div>' +
          '<button class="btn bg bsm" style="min-height:36px;flex:0 0 auto"' + (nex ? '' : ' disabled') + ' onclick="cmtyPublish(' + i + ')">Publicar</button>' +
        '</div>';
      });
    }
  }
  return h + '</div>';
}

// ══════════ v3-a #4 · COMENTARIOS ══════════
// Regla del PO: comenta CUALQUIERA QUE VE la publicación. El candado real vive en la RLS
// (`_can_comment`, c16) con los dos candados de menores; aquí solo se pinta y se delega.
// El input se muestra SIEMPRE que se ve el post: el cliente no puede saber si el otro es menor
// (la fecha vive server-side) → si el insert rebota, se maneja con un mensaje honesto en vez de
// adivinar (fail-visible, no fail-broken). Nadie EDITA: se borra y se reescribe.

// Fila de acciones común a las 3 tarjetas del muro (rutina, entreno, hito): ❤️ + 💬 + eliminar.
// Antes vivía copiada en cada tarjeta; el contador de comentarios habría sido la tercera copia.
function _cmtyActionsHtml(post, opts){
  opts = opts || {};
  const hearts = CMTY.postHearts[post.id] || 0;
  const given = !!CMTY.postHeartMine[post.id];
  const n = (CMTY.postComments[post.id] || []).length;
  const open = CMTY.threadOpen === post.id;
  return '<div style="display:flex;align-items:center;gap:8px;margin-top:10px">' +
    '<button class="btn ' + (given ? 'bp' : 'bg') + ' bsm" style="min-height:36px;flex:0 0 auto" aria-pressed="' + (given ? 'true' : 'false') + '" onclick="cmtyPostHeart(\'' + post.id + '\',\'' + post.user_id + '\')" title="' + (opts.heartTitle || 'Me gusta') + '">' +
      (typeof aviIcon === 'function' ? aviIcon('heart', 15) : '❤️') + (hearts ? ' <span style="font-size:12px;font-weight:700">' + hearts + '</span>' : '') + '</button>' +
    '<button class="btn bg bsm" style="min-height:36px;flex:0 0 auto" aria-expanded="' + (open ? 'true' : 'false') + '" onclick="cmtyToggleThread(\'' + post.id + '\')" title="Comentarios">' +
      (typeof aviIcon === 'function' ? aviIcon('chat', 15) : '💬') + (n ? ' <span style="font-size:12px;font-weight:700">' + n + '</span>' : '') + '</button>' +
    (opts.canDelete ? '<button class="btn bg bsm" style="min-height:36px;margin-left:auto;color:var(--t2)" onclick="cmtyDeletePost(\'' + post.id + '\')">Eliminar</button>' : '') +
  '</div>' + _cmtyThreadHtml(post);
}

// Hilo expandido bajo la tarjeta. Handle y texto SIEMPRE por esc() (texto de otra persona).
// Si el autor de un comentario no es visible para mí (por ejemplo, una cuenta privada que comenta
// el post público de un tercero), su handle NO se inventa: sale «Alguien» — la RLS de perfiles
// manda, y aquí no se filtra por la puerta de atrás.
function _cmtyThreadHtml(post){
  if(CMTY.threadOpen !== post.id) return '';
  const list = CMTY.postComments[post.id] || [];
  const uid = CMTY.uid;
  const iOwnPost = post.user_id === uid;
  let h = '<div style="border-top:1px solid var(--br);margin-top:10px;padding-top:9px">';
  if(!list.length){
    h += '<div style="font-size:12.5px;color:var(--t3);padding:2px 0 8px">Todavía nadie ha comentado. Anímalo tú.</div>';
  }
  list.forEach(c => {
    const prof = _cmtyAuthorProf(c.user_id);
    const mine = c.user_id === uid;
    const who = mine ? (prof ? esc(prof.handle) : 'Tú') : _cmtyNameLink(post.user_id, prof ? esc(prof.handle) : 'Alguien');
    const when = (typeof fmtD === 'function' && c.created_at) ? fmtD(c.created_at) : '';
    h += '<div style="padding:6px 0;border-top:1px solid var(--br)">' +
      '<div style="display:flex;align-items:baseline;gap:7px">' +
        '<span style="font-size:12.5px;font-weight:800;color:var(--t1)">' + who + '</span>' +
        (when ? '<span style="font-size:11px;color:var(--t3)">' + esc(when) + '</span>' : '') +
        '<span style="flex:1"></span>' +
        ((mine || iOwnPost) ? '<button class="btn bg bsm" style="min-height:36px;font-size:11.5px;padding:0 9px;color:var(--t2)" onclick="cmtyDeleteComment(\'' + c.id + '\',\'' + post.id + '\')">Borrar</button>' : '') +
        (!mine ? '<button class="btn bg bsm" style="min-height:36px;font-size:11.5px;padding:0 9px;color:var(--t2)" onclick="cmtyReportComment(\'' + c.id + '\',\'' + c.user_id + '\')">Reportar</button>' : '') +
      '</div>' +
      '<div style="font-size:13px;color:var(--t1);line-height:1.45;margin-top:2px;white-space:pre-wrap;word-break:break-word">' + esc(c.text || '') + '</div>' +
    '</div>';
  });
  const draft = CMTY.cmtDraft[post.id] || '';
  h += '<div style="display:flex;gap:7px;margin-top:9px">' +
    '<input class="inp" id="cmt-in-' + post.id + '" maxlength="280" placeholder="Escribe un comentario…" value="' + esc(draft) + '" ' +
      'style="flex:1;min-width:0;min-height:40px;font-size:13px" oninput="cmtyCommentDraft(\'' + post.id + '\',this.value)" ' +
      'onkeydown="if(event.key===\'Enter\'){event.preventDefault();cmtyComment(\'' + post.id + '\')}">' +
    '<button class="btn bp bsm" style="min-height:40px;flex:0 0 auto" onclick="cmtyComment(\'' + post.id + '\')">Enviar</button>' +
  '</div>';
  return h + '</div>';
}

function cmtyCommentDraft(postId, v){ CMTY.cmtDraft[postId] = v; }

function cmtyToggleThread(postId){
  CMTY.threadOpen = (CMTY.threadOpen === postId) ? null : postId;
  _cmtyPaint();
  if(CMTY.threadOpen === postId){
    const el = document.getElementById('cmt-in-' + postId);
    if(el && el.scrollIntoView){ try{ el.scrollIntoView({ block: 'nearest' }); }catch(e){} }
  }
}

async function cmtyComment(postId){
  const el = document.getElementById('cmt-in-' + postId);
  const raw = el ? el.value : (CMTY.cmtDraft[postId] || '');
  const text = (typeof communityCommentText === 'function') ? communityCommentText(raw) : String(raw || '').trim();
  if(!text){ toast('Escribe algo primero.'); return; }
  if(_cmtySealed()){ toast('🔒 (dev) comentar sellado en localhost'); return; }
  try{
    const cli = _cmtyClient(); const uid = CMTY.uid || await _cmtyUid(); if(!cli || !uid) return;
    if(el) el.disabled = true;
    const { error } = await cli.from('community_comments').insert({ post_id: postId, user_id: uid, text: text });
    if(el) el.disabled = false;
    if(error){
      // El rebote esperable es el candado de menores (yo o el autor): la RLS es la autoridad y el
      // cliente no adivina la edad de nadie. Mensaje honesto, sin culpar al usuario ni mentirle.
      if(/row-level security|violates/i.test(error.message || '')){ toast('Esta publicación no acepta tus comentarios.'); return; }
      throw error;
    }
    CMTY.cmtDraft[postId] = '';
    await _cmtyReloadThread(cli, postId);
    _cmtyPaint();
  }catch(e){ const el2 = document.getElementById('cmt-in-' + postId); if(el2) el2.disabled = false; toast(_cmtyErr(e)); }
}

// Borra el mío o, si el post es mío, el de otro (mi espacio). El moderador borra desde su bandeja
// (RPC `cmty_mod_delete_comment`) — un DELETE de cliente NO le sirve: no ve el post ajeno (c16 D1).
async function cmtyDeleteComment(commentId, postId){
  if(_cmtySealed()){ toast('🔒 (dev)'); return; }
  try{
    const cli = _cmtyClient(); if(!cli) return;
    const { error } = await cli.from('community_comments').delete().eq('id', commentId);
    if(error) throw error;
    await _cmtyReloadThread(cli, postId);
    _cmtyPaint();
  }catch(e){ toast(_cmtyErr(e)); }
}

// Reportar un comentario NO bloquea automáticamente a su autor (a diferencia del reporte de perfil):
// un comentario puede ser un malentendido. Queda en la bandeja del moderador; bloquear es aparte.
async function cmtyReportComment(commentId, authorId){
  if(_cmtySealed()){ toast('🔒 (dev)'); return; }
  try{
    const cli = _cmtyClient(); if(!cli) return;
    const { error } = await cli.from('community_reports')
      .insert({ reported: authorId, reason: 'comentario reportado desde la app', context: 'comment:' + commentId });
    if(error) throw error;
    toast('Gracias. Lo revisaremos.');
  }catch(e){ toast(_cmtyErr(e)); }
}

// R2 — tarjeta de HITO (racha / nivel). El texto lo arma `communityMilestoneText` (puro, avi-core);
// el número viene del servidor (no inflable) y JAMÁS trae pesos ni datos de salud (allow-list del
// trigger: solo {weeks} o {level}). Misma fila de ❤️ que una rutina — se celebra igual.
function _cmtyMilestoneCard(post){
  const prof = _cmtyAuthorProf(post.user_id);
  const mine = post.user_id === CMTY.uid;
  const who = mine ? (prof ? esc(prof.handle) : 'Tú') : _cmtyNameLink(post.user_id, prof ? esc(prof.handle) : 'Alguien');
  const m = (typeof communityMilestoneText === 'function')
    ? communityMilestoneText(post.kind, post.payload, mine) : null;
  if(!m) return ''; // hito desconocido/corrupto → no se pinta (nunca una tarjeta rota)
  return '<div class="card" style="padding:13px;margin-bottom:10px;border-color:var(--g2)">' +
    '<div style="display:flex;align-items:center;gap:10px">' +
      _cmtyAvatarHtml(prof || {}, 40, mine ? {} : { open: post.user_id }) +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13.5px;font-weight:800;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + who + _cmtyCoachTag(prof) + '</div>' +
        '<div style="font-size:13px;color:var(--gt);font-weight:700;margin-top:1px">' + esc(m.text) + ' ' + m.emoji + '</div>' +
      '</div>' +
    '</div>' +
    _cmtyActionsHtml(post, { heartTitle: 'Felicitar' }) +  // el hito lo emite el servidor: nadie lo borra
  '</div>';
}

// v3-a — tarjeta de ENTRENO TERMINADO (kind='workout'). Chips duración/ejercicios (omite el que
// falte), racha leída del PERFIL server-side del autor (NO del payload, cero falsificación), nota
// en esc(). Misma fila de ❤️ que las demás. JAMÁS kilos (el payload ni los trae — allow-list del trigger).
function _cmtyWorkoutCard(post){
  const pl = post.payload || {};
  const prof = _cmtyAuthorProf(post.user_id);
  const mine = post.user_id === CMTY.uid;
  const who = mine ? (prof ? esc(prof.handle) : 'Tú') : _cmtyNameLink(post.user_id, prof ? esc(prof.handle) : 'Alguien');
  const name = esc(pl.name || 'Entreno');
  const streak = prof && prof.streak_weeks > 0 ? prof.streak_weeks : 0;
  const chips = [];
  if(pl.duration_min != null && !isNaN(pl.duration_min)) chips.push(esc(String(pl.duration_min)) + ' min');
  const nex = Number(pl.exercises_count) || 0;
  if(nex) chips.push(nex + ' ejercicio' + (nex === 1 ? '' : 's'));
  if(streak) chips.push(streak + ' sem 🔥');
  const chipHtml = chips.length ? '<div style="display:flex;gap:14px;margin:8px 0 2px">' + chips.map(function(c){
    return '<span style="font-size:12px;color:var(--t2);font-weight:600">' + c + '</span>'; }).join('') + '</div>' : '';
  const note = pl.note ? '<div style="font-size:13px;color:var(--t1);margin-top:7px">' + esc(pl.note) + '</div>' : '';
  return '<div class="card" style="padding:13px;margin-bottom:10px">' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">' +
      _cmtyAvatarHtml(prof || {}, 40, mine ? {} : { open: post.user_id }) +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13.5px;font-weight:800;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + who + _cmtyCoachTag(prof) + '</div>' +
        '<div style="font-size:11.5px;color:var(--t3)">terminó su entreno</div>' +
      '</div>' +
    '</div>' +
    '<div style="font-size:15px;font-weight:800;color:var(--t1)">' + name + '</div>' +
    chipHtml + note +
    _cmtyActionsHtml(post, { canDelete: mine }) +
  '</div>';
}

function _cmtyPostCard(post){
  if(post.kind === 'streak' || post.kind === 'level') return _cmtyMilestoneCard(post);
  if(post.kind === 'workout') return _cmtyWorkoutCard(post);
  if(post.kind === 'pr') return _cmtyPrCard(post);
  const pl = post.payload || {};
  const prof = _cmtyAuthorProf(post.user_id);
  const mine = post.user_id === CMTY.uid;
  const name = esc(pl.name || 'Rutina');
  const days = pl.days ? esc(Array.isArray(pl.days) ? pl.days.join(', ') : pl.days) : '';
  const exs = Array.isArray(pl.exercises) ? pl.exercises : [];
  let exHtml = exs.slice(0, 8).map(e => {
    const sr = [e.sets, e.reps].filter(x => x != null && x !== '').join('×');
    return '<div style="font-size:12px;color:var(--t2);padding:2px 0;display:flex;justify-content:space-between;gap:10px">' +
      '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(e.name || 'Ejercicio') + '</span>' +
      (sr ? '<span style="color:var(--t3);flex:0 0 auto">' + esc(sr) + '</span>' : '') + '</div>';
  }).join('');
  if(exs.length > 8) exHtml += '<div style="font-size:11px;color:var(--t3);padding-top:2px">y ' + (exs.length - 8) + ' más…</div>';
  const who = mine ? (prof ? esc(prof.handle) : 'Tú') : _cmtyNameLink(post.user_id, prof ? esc(prof.handle) : 'Alguien');
  return '<div class="card" style="padding:13px;margin-bottom:10px">' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">' +
      _cmtyAvatarHtml(prof || {}, 40, mine ? {} : { open: post.user_id }) +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13.5px;font-weight:800;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + who + _cmtyCoachTag(prof) + '</div>' +
        '<div style="font-size:11.5px;color:var(--t3)">compartió una rutina</div>' +
      '</div>' +
    '</div>' +
    '<div style="font-size:14px;font-weight:800;color:var(--t1)">' + name + '</div>' +
    (days ? '<div style="font-size:11.5px;color:var(--g);font-weight:700;margin-bottom:6px">' + days + '</div>' : '<div style="height:4px"></div>') +
    exHtml +
    _cmtyActionsHtml(post, { canDelete: mine }) +
  '</div>';
}

function cmtyComposeToggle(){ CMTY.composeOpen = !CMTY.composeOpen; _cmtyPaint(); }

async function cmtyPublish(idx){
  if(_cmtySealed()){ toast('🔒 (dev) publicar sellado en localhost'); return; }
  const routines = _cmtyMyRoutines();
  const r = routines[idx];
  if(!r){ toast('No encontré esa rutina.'); return; }
  if(!Array.isArray(r.exercises) || !r.exercises.length){ toast('Esa rutina no tiene ejercicios.'); return; }
  try{
    const cli = _cmtyClient(); const uid = CMTY.uid || await _cmtyUid(); if(!cli || !uid) return;
    const payload = (typeof communityPostPayload === 'function') ? communityPostPayload(r) : null;
    if(!payload){ toast('No pude preparar la rutina.'); return; }
    const { error } = await cli.from('community_posts').insert({ user_id: uid, kind: 'routine', payload: payload });
    if(error) throw error;
    CMTY.composeOpen = false;
    toast('✅ Rutina publicada en tu muro');
    await cmtyLoad();
  }catch(e){ toast(_cmtyErr(e)); }
}

// v3-a #2+#3 — publica una SESIÓN TERMINADA como post `kind='workout'`. La llama la pantalla de fin
// (app-4). `session` = la entrada de historial recién finalizada; `note` = texto opcional del usuario.
// El payload lo arma el mapeador PURO `communityWorkoutPayload` (allow-list, jamás kilos). Devuelve
// true si publicó (para que la UI muestre «✓ Compartido»). Sellado en localhost. Solo si es miembro.
async function cmtyShareWorkout(session, routineName, note){
  if(!CMTY.profile){ toast('Únete a la comunidad para compartir.'); return false; }
  const payload = (typeof communityWorkoutPayload === 'function') ? communityWorkoutPayload(session, routineName, note) : null;
  if(!payload){ toast('Este entreno aún no se puede compartir.'); return false; }
  if(_cmtySealed()){ toast('🔒 (dev) compartir sellado en localhost'); return false; }
  try{
    const cli = _cmtyClient(); const uid = CMTY.uid || await _cmtyUid(); if(!cli || !uid) return false;
    const { error } = await cli.from('community_posts').insert({ user_id: uid, kind: 'workout', payload: payload });
    if(error) throw error;
    toast('✅ Compartiste tu entreno');
    try{ if(CMTY.loaded) await cmtyLoad({ silent: true }); }catch(e){}
    return true;
  }catch(e){ toast(_cmtyErr(e)); return false; }
}

async function cmtyPostHeart(postId, authorId){
  if(_cmtySealed()){ toast('🔒 (dev)'); return; }
  if(authorId === CMTY.uid){ toast('No puedes reaccionar a tu propia rutina.'); return; }
  const given = !!CMTY.postHeartMine[postId];
  try{
    const cli = _cmtyClient(); const uid = CMTY.uid || await _cmtyUid(); if(!cli || !uid) return;
    if(given){
      const { error } = await cli.from('community_reactions').delete().eq('from_user', uid).eq('context', postId).eq('kind', 'heart');
      if(error) throw error;
      CMTY.postHeartMine[postId] = false;
      CMTY.postHearts[postId] = Math.max(0, (CMTY.postHearts[postId] || 1) - 1);
    }else{
      const { error } = await cli.from('community_reactions').insert({ from_user: uid, to_user: authorId, kind: 'heart', context: postId });
      if(error) throw error;
      CMTY.postHeartMine[postId] = true;
      CMTY.postHearts[postId] = (CMTY.postHearts[postId] || 0) + 1;
    }
    _cmtyPaint();
  }catch(e){ toast(_cmtyErr(e)); }
}

async function cmtyDeletePost(postId){
  if(_cmtySealed()){ toast('🔒 (dev)'); return; }
  try{
    const cli = _cmtyClient(); if(!cli) return;
    const { error } = await cli.from('community_posts').delete().eq('id', postId);
    if(error) throw error;
    toast('Rutina retirada del muro');
    await cmtyLoad();
  }catch(e){ toast(_cmtyErr(e)); }
}

// Exports para el harness (Node no carga este archivo, pero CDP evalúa contra window).
if(typeof window !== 'undefined'){
  window.cmtyFollow = cmtyFollow; window.cmtyUnfollow = cmtyUnfollow;
  window.cmtyApproveFollow = cmtyApproveFollow; window.cmtyRejectFollow = cmtyRejectFollow;
  window._cmtyDiscoverHtml = _cmtyDiscoverHtml; window._cmtyFollowReqsHtml = _cmtyFollowReqsHtml;
  window.cmtyTogglePublic = cmtyTogglePublic; window.cmtySubmitBirthdate = cmtySubmitBirthdate;
  window._cmtyPublicBlockHtml = _cmtyPublicBlockHtml; window._cmtyShowBdBox = _cmtyShowBdBox;
  window.cmtyChatOpen = cmtyChatOpen; window.cmtyChatSend = cmtyChatSend;
  window.cmtyChatClose = cmtyChatClose; window._cmtyChatClose = _cmtyChatClose;
  window.cmtyDmRealtime = cmtyDmRealtime; window._cmtyLoadDMs = _cmtyLoadDMs;
  window._cmtyInboxHtml = _cmtyInboxHtml; window._cmtyDmBumpInbox = _cmtyDmBumpInbox;
  window.cmtyToggleLastActive = cmtyToggleLastActive; window._cmtyLoadActivity = _cmtyLoadActivity;
  window._cmtyActivityHtml = _cmtyActivityHtml; window._cmtyActivityText = _cmtyActivityText;
  window._cmtyLoadFeed = _cmtyLoadFeed; window._cmtyFeedHtml = _cmtyFeedHtml;
  window._cmtyComposeHtml = _cmtyComposeHtml; window._cmtyPostCard = _cmtyPostCard;
  window.cmtyComposeToggle = cmtyComposeToggle; window.cmtyPublish = cmtyPublish;
  window.cmtyPostHeart = cmtyPostHeart; window.cmtyDeletePost = cmtyDeletePost;
  window._cmtyMyRoutines = _cmtyMyRoutines; window._cmtyAuthorProf = _cmtyAuthorProf;
  window.cmtyGoView = cmtyGoView; window._cmtyHeadMain = _cmtyHeadMain; window._cmtyHeadSub = _cmtyHeadSub;
  window._cmtyCounts = _cmtyCounts; window._cmtyEmptyHtml = _cmtyEmptyHtml; window._cmtyFriendsHtml = _cmtyFriendsHtml;
  window.cmtyToggleMilestones = cmtyToggleMilestones; window._cmtyMilestoneCard = _cmtyMilestoneCard;
  window._cmtyWorkoutCard = _cmtyWorkoutCard; window.cmtyShareWorkout = cmtyShareWorkout;
  window._cmtyActionsHtml = _cmtyActionsHtml; window._cmtyThreadHtml = _cmtyThreadHtml;
  window._cmtyLoadComments = _cmtyLoadComments; window._cmtyReloadThread = _cmtyReloadThread;
  window.cmtyToggleThread = cmtyToggleThread; window.cmtyComment = cmtyComment;
  window.cmtyCommentDraft = cmtyCommentDraft; window.cmtyDeleteComment = cmtyDeleteComment;
  window.cmtyReportComment = cmtyReportComment;
  window._cmtyStatsSuffix = _cmtyStatsSuffix;
  window._cmtyMyKgPrs = _cmtyMyKgPrs; window._cmtyPrShareHtml = _cmtyPrShareHtml;
  window.cmtyPrAsk = cmtyPrAsk; window.cmtyPrCancel = cmtyPrCancel;
  window.cmtyPublishPr = cmtyPublishPr; window._cmtyPrCard = _cmtyPrCard;
  window.cmtyOpenProfile = cmtyOpenProfile; window.cmtyProfileBack = cmtyProfileBack;
  window._cmtyProfileHtml = _cmtyProfileHtml; window._cmtyLoadProfile = _cmtyLoadProfile;
  window.cmtyZoomAvatar = cmtyZoomAvatar; window.cmtyCloseZoom = cmtyCloseZoom;
  window._cmtyNameLink = _cmtyNameLink;
  window.cmtyAdoptionProbe = cmtyAdoptionProbe; window._cmtyProbeRead = _cmtyProbeRead;
  window._cmtyProbeWrite = _cmtyProbeWrite; window.renderCommunityNudge = renderCommunityNudge;
  window.cmtyNudgeGo = cmtyNudgeGo; window.dismissCmtyNudge = dismissCmtyNudge;
  window._cmtyNudgeHtml = _cmtyNudgeHtml;
}

// ══════════════ ADOPCIÓN A2 — LA PUERTA desde «Hoy» ══════════════
// La prueba social de A1 solo la ve quien YA abrió esta pestaña; las 17 personas sin perfil no
// tienen por qué abrirla. Esta tarjeta las invita desde «Hoy», que sí visitan a diario.
// La decisión de mostrarla es del motor PURO `communityNudgeEligible` (avi-core); aquí solo vive
// la SONDA (una consulta al día: ¿ya tengo perfil? ¿a cuánta gente vería?) y el pintado.
// Nada de esto entra a SB_KEYS: la sonda y el silencio son LOCALES por dispositivo.
const CMTY_PROBE_KEY = 'ax_cmty_probe';
const CMTY_NUDGE_SNOOZE_KEY = 'ax_cmtynudge';

function _cmtyProbeRead(){ try{ return JSON.parse(localStorage.getItem(CMTY_PROBE_KEY) || 'null'); }catch(e){ return null; } }
function _cmtyProbeWrite(p){ try{ localStorage.setItem(CMTY_PROBE_KEY, JSON.stringify(p)); }catch(e){} }
// La sonda se REESCRIBE cada vez que `cmtyLoad` averigua la verdad (abrir la pestaña, hacer opt-in,
// salirse). Sin esto, alguien que acaba de crear su perfil seguiría viendo «únete» hasta 24h.
function _cmtyProbeSync(){
  const prof = CMTY.profile;
  if(prof){ _cmtyProbeWrite({ hasProfile: true, peers: 0, list: [], at: Date.now() }); return; }
  _cmtyProbeWrite(_cmtyProbeFrom(CMTY.peers));
}
function _cmtyProbeFrom(peers){
  const list = (peers || []).map(p => ({ handle: p.handle, avatar_url: p.avatar_url, is_private: p.is_private }));
  return { hasProfile: false, peers: list.length, list: list, at: Date.now() };
}

// Consulta ligera para quien NUNCA abre la pestaña (justo el público de A2). Dos SELECT como
// máximo, 1×/día (TTL de `communityProbeStale`). Si falla (sin red, sin sesión) NO escribe nada y
// se reintenta más tarde con un respiro en memoria — un «Hoy» offline no puede pegarle a la red
// en cada repintado (el poll del coach re-renderiza cada 15s).
async function cmtyAdoptionProbe(client){
  if(CMTY._probing) return;
  if(CMTY._probeNextTry && Date.now() < CMTY._probeNextTry) return;
  CMTY._probing = true;
  try{
    const cli = _cmtyClient(); const uid = await _cmtyUid();
    if(!cli || !uid){ CMTY._probeNextTry = Date.now() + 1800000; return; }
    const { data: mine, error: me } = await cli.from('community_profiles').select('user_id').eq('user_id', uid).maybeSingle();
    if(me) throw me;
    if(mine){ _cmtyProbeWrite({ hasProfile: true, peers: 0, list: [], at: Date.now() }); }
    else{
      // Mismo `cp_sel` de siempre: sin perfil propio esto es el directorio del gym + los públicos.
      const { data: peers, error: pe } = await cli.from('community_profiles')
        .select('handle,avatar_url,is_private').neq('user_id', uid).limit(24);
      if(pe) throw pe;
      _cmtyProbeWrite(_cmtyProbeFrom(peers));
    }
    CMTY._probeNextTry = 0;
    // Ya con la verdad en mano, repintar «Hoy» (la tarjeta puede aparecer o desaparecer).
    if(client){
      if(typeof renderCommunityNudge === 'function') renderCommunityNudge(client);
      if(typeof renderShareBanner === 'function') renderShareBanner(client);
    }
  }catch(e){ CMTY._probeNextTry = Date.now() + 1800000; _cw()('cmty probe:', e && e.message); }
  finally{ CMTY._probing = false; }
}

function _cmtyNudgeHtml(line){
  const avatars = line.picked.map((p, i) =>
    '<span style="display:inline-flex;border-radius:50%;box-shadow:0 0 0 2px var(--w)' + (i ? ';margin-left:-9px' : '') + '">' +
      _cmtyAvatarHtml(p, 28) + '</span>').join('');
  return '<div class="card" style="padding:12px 14px">' +
    '<div style="display:flex;align-items:center;gap:10px">' +
      '<span style="display:flex;flex:0 0 auto">' + avatars + '</span>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13px;font-weight:800;color:var(--t1)">Tu gente ya está en la Comunidad</div>' +
        '<div style="font-size:12px;color:var(--t2);line-height:1.45">' + esc(line.text) + '.</div>' +
      '</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:10px">' +
      '<button class="btn bp bsm" style="flex:1;min-height:36px" onclick="cmtyNudgeGo()">Ver a mi gente</button>' +
      '<button class="btn bg bsm" style="flex:0 0 auto;min-height:36px;padding:0 12px" aria-label="Ahora no" onclick="dismissCmtyNudge()">Ahora no</button>' +
    '</div>' +
  '</div>';
}

// Pinta (o borra) la tarjeta. SÍNCRONA a propósito: decide con la sonda ya cacheada, para que
// `renderShareBanner` — que corre después — sepa si esta ya ocupó el turno del día. El refresco
// de la sonda va aparte, en segundo plano.
function renderCommunityNudge(client){
  const el = document.getElementById('cn-cmty-nudge'); if(!el) return;
  el.innerHTML = ''; el.style.display = 'none'; CMTY.nudgeOn = false;
  if(!client || typeof communityNudgeEligible !== 'function') return;
  const probe = _cmtyProbeRead();
  if(typeof communityProbeStale !== 'function' || communityProbeStale(probe, Date.now())) cmtyAdoptionProbe(client);
  let snooze = 0; try{ snooze = parseInt(localStorage.getItem(CMTY_NUDGE_SNOOZE_KEY)) || 0; }catch(e){}
  const sess = (typeof DB !== 'undefined' && DB.history && DB.history[client.id]) || [];
  if(!communityNudgeEligible(sess, Date.now(), snooze, probe)) return;
  const line = (typeof communityPeersLine === 'function') ? communityPeersLine(probe.list) : null;
  if(!line) return;  // sin nadie a quien nombrar no hay invitación honesta que hacer
  el.style.display = 'block';
  el.innerHTML = _cmtyNudgeHtml(line);
  CMTY.nudgeOn = true;
}

function cmtyNudgeGo(){
  const tab = document.querySelector('.cntab[onclick*="cn-community"]');
  if(typeof cnTab === 'function') cnTab('cn-community', tab || null);
}
function dismissCmtyNudge(){
  const days = (typeof CMTY_NUDGE_SNOOZE_DAYS !== 'undefined') ? CMTY_NUDGE_SNOOZE_DAYS : 30;
  try{ localStorage.setItem(CMTY_NUDGE_SNOOZE_KEY, String(Date.now() + days * 86400000)); }catch(e){}
  const el = document.getElementById('cn-cmty-nudge'); if(el){ el.style.display = 'none'; el.innerHTML = ''; }
  CMTY.nudgeOn = false;
}
