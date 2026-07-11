// F5 (v310): iconos de marca en el panel del coach — solo presentacion (innerHTML).
const _coIco=(n,sz,fb)=>typeof aviIcon==='function'?aviIcon(n,sz):fb;
// ══════════════════════ CLIENTS ══════════════════════
function filterClients(q){
  const term=(q||'').toLowerCase().trim();
  const list=document.getElementById('cli-list');
  if(!list)return;
  list.querySelectorAll('.cli').forEach(el=>{
    const name=(el.querySelector('.cn')||{}).textContent||'';
    const meta=(el.querySelector('.cm')||{}).textContent||'';
    el.style.display=(!term||name.toLowerCase().includes(term)||meta.toLowerCase().includes(term))?'':'none';
  });
  const visible=list.querySelectorAll('.cli[style*="display: "]:not([style*="none"]),.cli:not([style])').length;
  document.getElementById('cli-lbl').textContent=term?`${list.querySelectorAll('.cli:not([style*="none"])').length} resultado${list.querySelectorAll('.cli:not([style*="none"])').length!==1?'s':''} de ${DB.clients.length}`:`${DB.clients.length} asesorado${DB.clients.length!==1?'s':''} registrado${DB.clients.length!==1?'s':''}`;
}

function miniSparkline(clientId){
  const entries=(DB.bodyweight[clientId]||[]).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  if(entries.length<2)return '';
  const vals=entries.map(e=>e.kg);
  const maxV=Math.max(...vals),minV=Math.min(...vals);
  const W=40,H=18,pad=1;
  const pts=entries.map((e,i)=>({x:pad+i*((W-pad*2)/(entries.length-1)),y:pad+(H-pad*2)*(1-(e.kg-minV)/(maxV-minV||1))}));
  const d=pts.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const col=entries[entries.length-1].kg<=entries[0].kg?'#0A7C5B':'#E76F51';
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto 2px"><path d="${d}" fill="none" stroke="${col}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function renderClients(){
  const list=document.getElementById('cli-list');
  const searchEl=document.getElementById('cli-search');if(searchEl)searchEl.value='';
  document.getElementById('cli-lbl').textContent=`${DB.clients.length} asesorado${DB.clients.length!==1?'s':''} registrado${DB.clients.length!==1?'s':''}`;
  if(!DB.clients.length){list.innerHTML=`<div style="padding:20px 0"><div style="text-align:center;padding:8px 0 20px"><div style="width:56px;height:56px;border-radius:50%;background:var(--gl);display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto 12px">👥</div><div style="font-size:17px;font-weight:800;color:var(--t1);margin-bottom:6px">Aún no hay asesorados</div><div style="font-size:13px;color:var(--t2);margin-bottom:18px;line-height:1.5">Crea tu primer cliente para comenzar<br>a gestionar rutinas y progreso.</div><button class="btn bp" onclick="openAddClient()" style="padding:12px 28px;font-size:14px">+ Nuevo asesorado</button></div>${[0,1,2].map(()=>`<div class="cli" style="pointer-events:none;opacity:.3"><div style="width:42px;height:42px;border-radius:50%;background:var(--br2);flex-shrink:0"></div><div style="flex:1;min-width:0"><div style="height:13px;width:55%;background:var(--br2);border-radius:6px;margin-bottom:7px"></div><div style="height:11px;width:80%;background:var(--br);border-radius:6px"></div></div><div style="width:54px;height:22px;background:var(--br2);border-radius:20px;flex-shrink:0"></div></div>`).join('')}</div>`;return}
  list.innerHTML='';
  // Orden inteligente (mejora 7): quién necesita atención primero. sortClientsByAttention
  // (avi-core, puro/testeado) NO muta DB.clients — home y otras vistas conservan su orden.
  // Determinista (desempata por nombre) → el poll de 15s no reordena la lista en vivo.
  sortClientsByAttention(DB.clients,DB.history).forEach(({c,r})=>{
    const ms=DB.msgs[c.id]||[];const last=ms[ms.length-1];
    // Rutina del día o mañana
    const _days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const _todayName=_days[new Date().getDay()];
    const _tomorrowName=_days[(new Date().getDay()+1)%7];
    const _ruts=c.routines||[];
    const _todayR=_ruts.find(r=>r.day===_todayName);
    const _tomorrowR=!_todayR?_ruts.find(r=>r.day===_tomorrowName):null;
    const _todayStr=new Date().toISOString().split('T')[0];
    const _trained=(DB.history&&DB.history[c.id]||[]).some(s=>s.date&&s.date.startsWith(_todayStr));
    // Estado del día → color (verde entrenó · coral pendiente · rojo sin rutinas · azul mañana · gris descanso)
    let st;
    if(_trained){
      st={ring:'var(--g2)',bg:'var(--gl)',col:'var(--g)',ico:'✓',txt:'Entrenó hoy'};
    } else if(_todayR){
      st={ring:'var(--or)',bg:'var(--orl)',col:'var(--or)',ico:_coIco('timer',12,'⏳'),txt:`${esc(_todayR.name)} · hoy`};
    } else if(_tomorrowR){
      st={ring:'var(--bl)',bg:'var(--bll)',col:'var(--bl)',ico:_coIco('calendar',12,'📅'),txt:`${esc(_tomorrowR.name)} · mañana`};
    } else if(_ruts.length){
      st={ring:'var(--br2)',bg:'var(--bg)',col:'var(--t3)',ico:_coIco('moon',12,'💤'),txt:'Descanso hoy'};
    } else {
      st={ring:'var(--rd)',bg:'var(--rdl)',col:'var(--rd)',ico:_coIco('flag',12,'🚩'),txt:'Sin rutinas asignadas'};
    }
    const lvlCls=c.level==='Principiante'?'tg':c.level==='Intermedio'?'tb':'to';
    const spark=miniSparkline(c.id);
    const selfBadge=c.selfReg?(c.wantsCoach?'<span class="tag" style="background:var(--orl);color:var(--or)">🙋 Quiere coach</span>':'<span class="tag" style="background:var(--bll);color:var(--bl)">🆓 Libre</span>'):'';
    // Chip de ATENCIÓN (mejora 7): la RAZÓN por la que este asesorado sube en la lista.
    // r.label es texto fijo + un entero (días) → sin datos de usuario, seguro sin esc.
    const _ATN={pain:['--rdl','--rd'],overdue:['--rdl','--rd'],expiring:['--orl','--or'],idle:['--br','--t2'],nostart:['--br','--t2']};
    const _ac=_ATN[r.reason];
    const atn=(r.label&&_ac)?`<span class="cli-pill" style="background:var(${_ac[0]});color:var(${_ac[1]})">${r.label}</span>`:'';
    const d=document.createElement('div');d.className='cli';
    d.innerHTML=`<div class="cav ring" style="background:${avc(c.name)};--cring:${st.ring}">${esc(ini(c.name))}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:7px;min-width:0">
          <span class="cn">${esc(c.name)}</span>
          <span class="tag ${lvlCls}" style="flex-shrink:0">${c.level||'—'}</span>
          ${selfBadge}
        </div>
        <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><span class="cli-pill" style="background:${st.bg};color:${st.col}">${st.ico} ${esc(st.txt)}</span>${atn}</div>
        <div class="cm" style="margin-top:6px">${esc(c.goal||'—')} · ${esc(String(c.days||3))} días/sem · ${(c.routines||[]).length} rutina${(c.routines||[]).length!==1?'s':''}</div>
        ${last?`<div style="font-size:11px;color:var(--t3);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_coIco('chat',11,'💬')} "${esc(last.text.slice(0,45))}${last.text.length>45?'…':''}"</div>`:''}
      </div>
      <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:8px;align-self:stretch;justify-content:center">
        ${spark||''}
        <button class="btn bg bsm" onclick="event.stopPropagation();openDetail('${c.id}')">Ver →</button>
      </div>`;
    d.onclick=()=>openDetail(c.id);list.appendChild(d);
  });
}

function openAddClient(){CUR.editClientId=null;document.getElementById('mc-title').textContent='Nuevo asesorado';document.getElementById('save-cli-btn').textContent='Guardar';['cf-name','cf-last','cf-email','cf-pass','cf-weight','cf-height','cf-age','cf-phone','cf-notes'].forEach(id=>document.getElementById(id).value='');document.getElementById('cf-goal').value='Perder grasa';document.getElementById('cf-level').value='Principiante';document.getElementById('cf-days').value='3';document.getElementById('cf-place').value='gym';document.getElementById('cf-sex').value='';document.getElementById('cf-activity').value='1.55';om('m-client')}

function openEditClient(){
  const c=DB.clients.find(x=>x.id===CUR.clientId);if(!c)return;
  CUR.editClientId=c.id;document.getElementById('mc-title').textContent='Editar asesorado';document.getElementById('save-cli-btn').textContent='Guardar cambios';
  const ps=c.name.split(' ');document.getElementById('cf-name').value=ps[0]||'';document.getElementById('cf-last').value=ps.slice(1).join(' ')||'';
  document.getElementById('cf-email').value=c.email||'';
  const passEl=document.getElementById('cf-pass');
  passEl.value='';passEl.placeholder='••••••• (dejar en blanco para no cambiar)';
  passEl.dataset.unchanged='1';
  passEl.oninput=()=>{passEl.dataset.unchanged='0';};
  document.getElementById('cf-goal').value=c.goal||'Perder grasa';
  document.getElementById('cf-level').value=c.level||'Principiante';
  document.getElementById('cf-weight').value=c.weight||'';
  document.getElementById('cf-height').value=c.height||'';
  document.getElementById('cf-age').value=c.age||'';
  document.getElementById('cf-sex').value=c.sex||'';
  document.getElementById('cf-activity').value=c.activityFactor||'1.55';
  document.getElementById('cf-days').value=c.days||'3';
  document.getElementById('cf-place').value=c.place||'gym';
  document.getElementById('cf-phone').value=c.phone||'';
  document.getElementById('cf-notes').value=c.notes||'';
  om('m-client');
}

// ¿El id ya es de una cuenta auth real (uuid)? Los clientes creados localmente por el coach
// tienen id de uid() (base36, no-uuid) → aún sin cuenta de acceso.
function _isAuthId(id){ return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id||'')); }
// Crea la CUENTA DE ACCESO real (Supabase Auth, pre-confirmada) del asesorado vía la Edge
// Function coach-create-client, para que pueda ingresar con su correo+clave (ficticio sirve).
// Sube su perfil + rutina ACTUAL tal cual (no regenera). Re-vincula el cliente local a su
// user_id (así coincide con su fila en la nube y futuras ediciones van por updateClientRow).
// Devuelve el nuevo user_id o null si no se provisionó. Camilo 2026-06-29.
// Devuelve: user_id (string) si se provisionó · null si falló de forma TRANSITORIA (sin red /
// auth no lista / 5xx) → la cola lo reintenta · false si el rechazo es PERMANENTE (correo en uso,
// datos inválidos, no-coach) → NO reintentar. Ver _addPending/_flushPendingClients (#8/#D3).
async function _provisionClientAccount(client, rawPass){
  if(!AUTH_MODE || !AUTH.ready()) return null;   // transitorio: auth aún no lista
  if(!client || !client.email || !rawPass) return false; // permanente: faltan credenciales
  if(_isAuthId(client.id)) return false;         // permanente: ya vinculado a una cuenta
  const c=AUTH.client(); if(!c) return null;
  const row=clientToRow(client,{});              // profile (escalares) + routines (sin id/password)
  let data,error;
  try{ ({data,error}=await c.functions.invoke('coach-create-client',{body:{
    email:client.email, password:rawPass, profile:row.profile, routines:row.routines
  }})); }catch(e){ error=e; }
  if(data && data.ok && data.user_id){
    const i=DB.clients.findIndex(x=>x.id===client.id);
    if(i!==-1){ DB.clients[i].id=data.user_id; sv('ax_c',DB.clients); }
    return data.user_id;
  }
  // Rechazo PERMANENTE (la edge respondió con un motivo de negocio) → no reintentar.
  const code=(data&&data.error)||'';
  const PERMA={email_taken:'ese correo ya pertenece a otra cuenta',forbidden_not_coach:'no autorizado',invalid_email:'correo inválido',weak_password:'contraseña muy corta'};
  if(PERMA[code]){ toast('⚠️ No se pudo crear el acceso: '+PERMA[code]); return false; }
  // Transitorio (sin red / 5xx / función caída) → se reintenta al reconectar.
  toast('⚠️ No se pudo crear el acceso ahora: '+((error&&error.message)||code||'error de red'));
  return null;
}
// Edición de un asesorado YA provisionado (su id es uuid): cambiar su CLAVE y/o CORREO de
// acceso real (Supabase Auth) vía la edge admin en modo update (por user_id). Sin esto era un
// no-op silencioso: clientToRow descarta `password` y updateClientRow nunca toca auth.users
// (bug #3 auditoría 2026-06-30). Devuelve true si la nube confirmó el cambio.
async function _updateClientAccount(client, changes){
  if(!AUTH_MODE || !AUTH.ready()) return false;
  if(!client || !_isAuthId(client.id)) return false;   // sin cuenta real → nada que actualizar
  const email=(changes&&changes.email)||'', password=(changes&&changes.password)||'';
  if(!email && !password) return false;
  const c=AUTH.client(); if(!c) return false;
  let data,error;
  try{ ({data,error}=await c.functions.invoke('coach-create-client',{body:{
    user_id:client.id, email:email||undefined, password:password||undefined
  }})); }catch(e){ error=e; }
  if(error || !data || !data.ok){
    toast('⚠️ No se pudo actualizar el acceso: '+((data&&data.error)||(error&&error.message)||'error de red'));
    return false;
  }
  return true;
}
async function saveClient(){
  const fn=document.getElementById('cf-name').value.trim();
  const ln=document.getElementById('cf-last').value.trim();
  const email=document.getElementById('cf-email').value.trim().toLowerCase();
  const pass=document.getElementById('cf-pass').value.trim();
  if(!fn){toast('⚠️ El nombre es obligatorio');return}
  if(!CUR.editClientId&&(!email||!pass)){toast('⚠️ Email y contraseña son obligatorios');return}
  const _pp=pass?passwordProblem(pass):null; if(_pp){toast('⚠️ '+_pp);return}
  const dup=DB.clients.find(c=>c.email&&c.email.toLowerCase()===email&&c.id!==CUR.editClientId);
  if(dup){toast('⚠️ Ya existe un asesorado con ese email');return}
  const clientId=CUR.editClientId||uid();
  const hashedPass=pass?await hashClientPass(pass,clientId):null;
  const data={
    name:ln?`${fn} ${ln}`:fn,
    email,
    goal:document.getElementById('cf-goal').value,
    level:document.getElementById('cf-level').value,
    weight:parseFloat(document.getElementById('cf-weight').value)||null,
    height:parseFloat(document.getElementById('cf-height').value)||null,
    age:parseInt(document.getElementById('cf-age').value)||null,
    sex:document.getElementById('cf-sex').value||null,
    activityFactor:parseFloat(document.getElementById('cf-activity').value)||1.55,
    days:parseInt(document.getElementById('cf-days').value)||3,
    place:document.getElementById('cf-place').value||'gym',
    notes:document.getElementById('cf-notes').value.trim(),
    phone:document.getElementById('cf-phone').value.trim(),
    updatedAt:new Date().toISOString()
  };
  if(hashedPass) data.password=hashedPass;
  let _oldEmail=null; // correo previo, para detectar cambio de correo de acceso (bug #3)
  if(CUR.editClientId){
    const i=DB.clients.findIndex(c=>c.id===CUR.editClientId);
    if(i!==-1){
      const existing=DB.clients[i];
      _oldEmail=(existing.email||'').toLowerCase();
      if(document.getElementById('cf-pass').dataset.unchanged==='1') data.password=existing.password;
      // ¿Cambiaron datos que afectan la rutina de un usuario LIBRE (auto-generada)?
      const trainingChanged=isFreeClient(existing)&&(existing.place!==data.place||existing.goal!==data.goal||existing.level!==data.level||existing.days!==data.days);
      DB.clients[i]={...existing,...data};
      if(trainingChanged&&confirm('Corregiste datos de entrenamiento de un usuario en modo libre. ¿Regenerar su rutina automática para que coincida?')){
        try{ _autoGenerateWeek(DB.clients[i]); toast('✨ Rutina regenerada con los nuevos datos'); }catch(e){ warn('AVI: regen tras editar falló:',e&&e.message); }
      }
    }
    toast(`✅ ${data.name} actualizado`);
  } else {
    data.password=hashedPass;
    DB.clients.push({id:clientId,routines:[],...data,createdAt:new Date().toISOString()});
    toast(`✅ ${data.name} añadido`);
  }
  sv('ax_c',DB.clients);
  // ── Crear/asegurar la CUENTA DE ACCESO real del asesorado (Supabase Auth, pre-confirmada),
  // para que pueda ingresar con su correo+clave. Solo si hay credenciales y aún no está
  // vinculado. Re-vincula su id al de la cuenta. Camilo 2026-06-29 (Claudia no podía entrar
  // porque el form creaba un cliente LOCAL sin cuenta de acceso).
  const _target=DB.clients.find(x=>x.id===(CUR.editClientId||clientId));
  if(_target && AUTH_MODE && _target.email && pass && !_isAuthId(_target.id)){
    const _pr=await _provisionClientAccount(_target,pass);
    if(_pr){ toast(`🔑 ${_target.name} ya puede ingresar con ${_target.email}`); if(CUR.editClientId)CUR.editClientId=_pr; _removePending(_target); }
    else if(_pr===null){ _addPending(_target,pass); toast('📴 Guardé el alta; crearé el acceso de '+_target.name+' al reconectar'); } // #8: transitorio, no se pierde
    // _pr===false: rechazo permanente (correo en uso, etc.), el error ya se avisó; no encolar
  }
  // Asesorado YA con cuenta de acceso (uuid): aplicar a Supabase Auth los cambios de CLAVE
  // y/o CORREO. Antes no surtían efecto (bug #3 auditoría 2026-06-30).
  else if(_target && AUTH_MODE && _isAuthId(_target.id)){
    const _passChanged = !!pass && document.getElementById('cf-pass').dataset.unchanged!=='1';
    const _emailChanged = _oldEmail!=null && !!email && email!==_oldEmail;
    if(_passChanged || _emailChanged){
      const ok=await _updateClientAccount(_target,{ email:_emailChanged?email:'', password:_passChanged?pass:'' });
      if(ok) toast('🔑 Acceso de '+_target.name+' actualizado');
    }
  }
  cm('m-client');renderAll();if(CUR.editClientId)openDetail(CUR.editClientId);
}

// ── Auto-registro (modo libre) ──────────────────────────────────────────
// Genera y APLICA una semana al cliente `c` reusando el motor del coach (adaptación +
// perfil de carga). Para modo libre no hay coach que revise → se aplica directo.
function _autoGenerateWeek(c){
  const styleId=PLACE_DEFAULT_STYLE[c.place]||'gym_hipertrofia';
  const style=TRAINING_STYLES.find(s=>s.id===styleId)||TRAINING_STYLES[0];
  const inAdapt=isInAdaptation(c,DB.history,new Date());
  const _med=(DB.medidas&&DB.medidas[c.id])||[];
  const _waist=_med.length?_med[0].cintura:null;
  const loadProfile=bodyLoadProfile(c,_waist);
  const _p=genPrefs(c);
  const res=generarRutinas(c,DB.exercises,{idFn:uid,seed:_genSeed(c.id),place:style.env,methodBias:style.methodBias,adaptation:inAdapt,loadProfile,excludeIds:_p.exclude,preferIds:_p.prefer});
  if(res.routines&&res.routines.length){
    c.routines=sortRoutinesByDay(res.routines.map(r=>({...r,reviewed:true})));
  }
  return res;
}

// ── Modo auth: poblar DB SOLO con el usuario logueado (aislado del blob global) ──
// coll = colecciones de SU fila user_data {history,prs,bodyweight,medidas,nutrition,photos,msgs}.
// La app indexa por clientId, así que envolvemos cada colección en {[id]: …}.
function _applyAuthClientDB(client, coll){
  coll=coll||{};
  const id=client.id;
  DB.clients=[client];
  // 🧹 Auto-cura (v298): barre sesiones-fixture (rTest/rVis/rf5) que un harness pudo
  // inyectar en el historial real antes del sello. Si limpió algo, lo persiste a la nube
  // (svNow, ya con sesión y en https) para que no vuelva a re-empujarse al entrenar.
  const _hclean=(typeof stripFixtureSessions==='function')?stripFixtureSessions(coll.history):{history:coll.history||[],removed:0};
  DB.history   ={[id]: _hclean.history};
  if(_hclean.removed>0){ try{ svNow('ax_hist',DB.history); log&&log('AVI: purgadas '+_hclean.removed+' sesiones-fixture del historial'); }catch(_e){} }
  DB.prs       ={[id]: coll.prs       ||{}};
  DB.bodyweight={[id]: coll.bodyweight||[]};
  DB.medidas   ={[id]: coll.medidas   ||[]};
  DB.nutrition ={[id]: coll.nutrition ||{}};
  DB.photos    ={[id]: coll.photos    ||[]};
  DB.msgs      ={[id]: coll.msgs      ||[]};
}

// ── OFFLINE para clientes auth (entrenar en el parque sin señal) ──────────
// En modo auth los datos del cliente NO van a localStorage (van a su fila
// user_data en la nube). Sin red, el arranque no tenía de dónde leer y expulsaba
// al login. Solución: respaldo local de SU fila, keyed por uid (no cruza cuentas
// en un mismo dispositivo). Se refresca al cargar online y en cada guardado; el
// arranque cae a él cuando no hay red. Guarda SOLO columnas de datos — nunca
// coach_id/role (esos viven en la nube y no se deben pisar desde el cliente).
let _authUid=null;       // uid del usuario auth en sesión (de getSession, offline-safe)
// _authDirty = hubo cambios que la nube no confirmó (reintentar al reconectar).
// PERSISTE en localStorage (ax_udirty_{uid}): si Android mata la app antes de
// reconectar, el próximo arranque sabe que el respaldo local trae datos que la
// nube no tiene y los FUSIONA en vez de pisarlos (P0-2 auditoría 2026-07-01).
let _authDirty=false;
function _dirtyKey(uid){ return 'ax_udirty_'+uid; }
function _setAuthDirty(v){
  _authDirty=!!v;
  if(!_authUid)return;
  try{ if(v)localStorage.setItem(_dirtyKey(_authUid),'1'); else localStorage.removeItem(_dirtyKey(_authUid)); }catch(e){}
}
function _readAuthDirty(uid){ try{ return localStorage.getItem(_dirtyKey(uid))==='1'; }catch(e){ return false; } }
function _authRowKey(uid){ return 'ax_udcache_'+uid; }
function _cacheAuthRow(uid,row){ if(!uid||!row)return; try{ localStorage.setItem(_authRowKey(uid),JSON.stringify(row)); }catch(e){} }
function _readAuthRow(uid){ try{ const r=uid&&localStorage.getItem(_authRowKey(uid)); return r?JSON.parse(r):null; }catch(e){ return null; } }
// Reconstruye la fila del usuario desde el estado en memoria (DB.*). role explícito
// (rowToClient no conserva coach_id/role); las columnas de datos salen de DB.
function _snapshotAuthRow(){
  const client=(DB.clients&&DB.clients[0]); if(!client)return null;
  const id=client.id;
  const base=clientToRow(client,{}); // user_id + profile + routines
  return Object.assign(base,{
    role:AUTH_ROLE,
    history:(DB.history&&DB.history[id])||[], prs:(DB.prs&&DB.prs[id])||{},
    bodyweight:(DB.bodyweight&&DB.bodyweight[id])||[], medidas:(DB.medidas&&DB.medidas[id])||[],
    nutrition:(DB.nutrition&&DB.nutrition[id])||{}, photos:(DB.photos&&DB.photos[id])||[],
    msgs:(DB.msgs&&DB.msgs[id])||[],
  });
}
// Refresca el respaldo local con el estado actual (tras cualquier guardado).
function _refreshAuthCache(){ if(AUTH_MODE&&AUTH_ROLE!=='coach'&&_authUid){ _cacheAuthRow(_authUid,_snapshotAuthRow()); } }
// Al reconectar: si quedaron cambios sin confirmar, sube la fila completa de datos
// (sin coach_id/role → upsert deja esas columnas intactas). Idempotente.
async function _flushAuthOnline(){
  if(!AUTH_MODE||AUTH_ROLE==='coach'||!_authDirty)return;
  const row=_snapshotAuthRow(); if(!row)return;
  const patch={profile:row.profile,routines:row.routines,history:row.history,prs:row.prs,
    bodyweight:row.bodyweight,medidas:row.medidas,nutrition:row.nutrition,photos:row.photos,msgs:row.msgs};
  try{
    await UD.upsertOwn(patch);
    // Subió la fila COMPLETA de datos → todo confirmado: limpia claves fallidas y el flag.
    Object.keys(_udFailedKeys).forEach(k=>{delete _udFailedKeys[k];});
    _setAuthDirty(false);
    log('AVI: cambios offline sincronizados con la nube');
  }
  catch(e){ warn('AVI: reintento de sync al reconectar falló:',e&&e.message); }
}
window.addEventListener('online',_flushAuthOnline);

// Lee las respuestas que el wizard guardó ANTES de redirigir a Google (wzGoogle). Google
// no devuelve goal/level en su metadata, así que sin esto el usuario perdía lo que ya había
// contestado y caía al formulario viejo. Caduca a los 30 min para no contaminar logins futuros.
function _pendingWizard(){
  try{
    const raw=localStorage.getItem('ax_wz_pending'); if(!raw)return{};
    const p=JSON.parse(raw); if(p&&p.ts&&(Date.now()-p.ts)<1800000)return p;
  }catch(e){}
  return {};
}

// Perfil mínimo desde la metadata del usuario Auth (lo que se guardó en signUp). Para el
// registro por Google completa los huecos con lo que el wizard dejó en ax_wz_pending.
function _profileFromMeta(authUser){
  const m=(authUser&&authUser.user_metadata)||{};
  const w=_pendingWizard();
  const goal=m.goal||w.goal, level=m.level||w.level;
  return {
    name:m.name||m.full_name||w.name||((authUser&&authUser.email)||'').split('@')[0]||'Crack',
    email:authUser&&authUser.email,
    goal:goal||'Salud general', level:level||'Principiante', days:parseInt(m.days||w.days)||3,
    sex:m.sex||w.sex||null, age:m.age||w.age||null, weight:m.weight||w.weight||null, height:m.height||w.height||null, place:m.place||w.place||'gym',
    consent:m.consent||w.consent||null, // evidencia Habeas Data (email: metadata; Google: ax_wz_pending)
    _complete:!!(goal&&level), // email trae estos del form; Google los toma del wizard guardado
  };
}

// Provisiona la fila de un asesorado libre nuevo: arma el cliente, genera su semana y
// crea su fila en user_data. Se usa en el 1er ingreso (registro o primer login tras confirmar).
async function _provisionFreeClient(authUser, p){
  const complete = !!(p && p._complete); // ¿el usuario YA eligió objetivo/nivel? (registro por correo)
  const rec={
    id:authUser.id, name:p.name, email:authUser.email||p.email,
    goal:p.goal, level:p.level, weight:p.weight, height:p.height,
    age:p.age, sex:p.sex, activityFactor:1.55, days:p.days, place:p.place,
    notes:'', phone:'', selfReg:true, tier:'libre', routines:[],
    consent:p.consent||null, // prueba de autorización (fecha + versión de los textos legales)
    needsProfile:false, // (vestigial) la pantalla vieja "Cuéntanos de ti" fue eliminada 2026-06-09
    createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
  };
  rec.coach_id=COACH_UID; // modelo de un solo coach: todo self-registro entra al pipeline del coach
  _applyAuthClientDB(rec,{}); // colecciones vacías (usuario nuevo)
  // Siempre auto-generamos la semana (con defaults si faltara algún dato) — ya no hay 2ª pantalla
  // "Cuéntanos de ti". El wizard premium ya recoge el perfil; el usuario puede regenerar desde Rutinas.
  try{ _autoGenerateWeek(rec); }catch(e){ warn('AVI: auto-generación falló (no bloquea):',e&&e.message); }
  // coachId=COACH_UID → la fila es visible para el coach por RLS (ve TODOS los registros como leads,
  // con tag 🆓 Libre o 🙋 Quiere coach). El usuario sigue tier:'libre' (premium bloqueado hasta convertir).
  try{ await UD.createFromClient(rec,{role:'client',coachId:COACH_UID}); }
  catch(e){ warn('AVI: crear fila user_data falló:',e&&e.message); }
  return rec;
}


// Reveal del plan — pantalla cumbre tras el registro. Construye la semana REAL desde
// client.routines + el resumen del wizard. onContinue (opcional) corre al tocar "Ver mi plan".
const _RV_DAY={'Lunes':'LUN','Martes':'MAR','Miércoles':'MIÉ','Miercoles':'MIÉ','Jueves':'JUE','Viernes':'VIE','Sábado':'SÁB','Sabado':'SÁB','Domingo':'DOM'};
const _RV_PAL=['#10E0A0','#F2C94C','#5FE3D0','#FF8A5B','#A8E060','#7FD1A8'];
function showPlanReveal(client, onContinue){
  try{
    const g=id=>document.getElementById(id);
    const first=esc(((client.name||'Crack').trim().split(/\s+/)[0])||'Crack');
    g('rv-title').innerHTML=first+', ya armamos tu <b>semana</b>.';
    const placeLbl={gym:'Gym',casa:'Casa',corporal:'Peso corporal',parque:'Parque'}[client.place]||'Gym';
    const placeIc={gym:'i-dumbbell',casa:'i-home',corporal:'i-body',parque:'i-tree'}[client.place]||'i-dumbbell';
    const goalIc={'Perder grasa':'i-fire','Ganar músculo':'i-muscle','Recomposición':'i-recomp','Fuerza':'i-barbell','Resistencia':'i-pulse','Salud general':'i-leaf'}[client.goal]||'i-muscle';
    const stats=[['i-cal',(client.days||3)+' días'],[placeIc,placeLbl],[goalIc,client.goal||'']];
    g('rv-stats').innerHTML=stats.map(s=>`<span class="rv-stat"><svg class="ic"><use href="#${s[0]}"/></svg>${esc(String(s[1]))}</span>`).join('');
    const rts=client.routines||[];
    g('rv-days').innerHTML=rts.map((r,i)=>{
      const c=_RV_PAL[i%_RV_PAL.length];
      const dd=_RV_DAY[r.day]||String(r.day||'').slice(0,3).toUpperCase()||('D'+(i+1));
      const mus=[];(r.exercises||[]).forEach(e=>{if(e.muscle&&mus.indexOf(e.muscle)<0)mus.push(e.muscle);});
      const musTxt=mus.slice(0,3).join(' · ')||'Entrenamiento';
      return `<div class="rv-day" style="--c:${c};animation-delay:${(0.6+i*0.1).toFixed(2)}s"><span class="dchip">${esc(dd)}</span><span class="info"><div class="nm">${esc(r.name||('Día '+(i+1)))}</div><div class="mu">${esc(musTxt)}</div></span><span class="go">→</span></div>`;
    }).join('');
    // Foto de marca de fondo: foto AVI (Camilo) con grade Noir Esmeralda; override con window.AVI_REVEAL_PHOTO.
    const ph=g('rv-photo'); const _revPhoto=window.AVI_REVEAL_PHOTO||'media/brand/reveal.jpg';
    if(ph){ if(_revPhoto){ ph.style.backgroundImage='url('+_revPhoto+')'; ph.classList.add('on'); } else { ph.classList.remove('on'); } }
    const ov=g('plan-reveal');
    g('rv-btn').onclick=()=>{ ov.classList.remove('on'); if(typeof onContinue==='function'){try{onContinue();}catch(e){}} };
    ov.classList.add('on'); ov.scrollTop=0;
  }catch(e){ warn('AVI: showPlanReveal falló:',e&&e.message); if(typeof onContinue==='function'){try{onContinue();}catch(_){}} }
}

// Entra a la app en modo auth para un usuario con sesión Supabase. Carga su fila (o la
// provisiona si es su 1er ingreso). Por ahora todos los auth users son asesorados libres;
// el rol coach se conecta en 2.2e.
async function _enterAuthSession(authUser){
  AUTH_MODE=true;
  _authUid=(authUser&&authUser.id)||null;
  // Hidrata el flag dirty persistido: si la sesión anterior dejó cambios sin confirmar,
  // el reintento al reconectar (_flushAuthOnline) debe saberlo aunque arranquemos offline.
  _authDirty=_readAuthDirty(_authUid);
  let row=await UD.loadOwn();   // null si no hay red (loadOwn ya no lanza)
  const online=!!row;
  // Sin fila desde la nube: ¿es porque no hay red? → cae al respaldo local para
  // poder entrenar offline. Si no hay respaldo tampoco, sigue el flujo normal
  // (usuario realmente nuevo → onboarding / pedir crear cuenta).
  if(!row){ const cached=_readAuthRow(_authUid); if(cached){ row=cached; log('AVI: sin red — usando respaldo local de tu fila'); } }
  // Rol coach: carga SOLO sus clientes (filas con coach_id = su uid) y abre el panel.
  if(row&&row.role==='coach'){ AUTH_ROLE='coach'; return await _enterCoachAuth(authUser,row); }
  AUTH_ROLE='client';
  let client;
  // P0-2 (auditoría 2026-07-01): si el arranque anterior dejó cambios SIN confirmar
  // (flag dirty persistido — p.ej. entrenó offline y Android mató la app antes de
  // reconectar), la fila de la nube NO trae esa sesión. Antes se aplicaba tal cual
  // y en la línea de abajo PISABA el respaldo local (pérdida silenciosa). Ahora se
  // FUSIONA respaldo local + nube (mergeAuthRow, pura y testeada: une historial/PRs/
  // mensajes/peso/medidas/fotos sin perder nada; perfil/rutinas los manda la nube)
  // y se re-sube la fila fusionada.
  let _mergedOffline=false;
  if(online && row && _readAuthDirty(_authUid)){
    const cached=_readAuthRow(_authUid);
    if(cached){
      try{ row=mergeAuthRow(cached,row); _mergedOffline=true; log('AVI: fusionando datos offline pendientes con la nube'); }
      catch(e){ warn('AVI: merge offline falló, se usa la nube tal cual:',e&&e.message); }
    }
  }
  if(row){
    client=rowToClient(row);
    // P1-1 (auditoría 2026-07-01): el gate de membresía murió con el cutover a Auth —
    // un asesorado suspendido o con plan vencido entraba normal. Mismo criterio y
    // mensajes del camino legacy (tryAutoLogin): pending/active/expiring SÍ entran.
    if(!MS.canLogin(client)){
      try{ await AUTH.signOut(); }catch(e){}
      AUTH_MODE=false; _authUid=null;
      const st=MS.getStatus(client);
      showScreen('s-login');
      const cta=document.getElementById('cin-cta'),card=document.getElementById('cin-card');
      if(cta)cta.style.display='none'; if(card)card.style.display='block';
      const er=document.getElementById('lerr');
      if(er){ er.textContent = st==='inactive' ? 'Tu acceso está pausado. Escríbele a tu coach para reactivarlo 🟡' : 'Tu plan venció. Habla con tu coach para continuar entrenando 💪'; er.classList.add('on'); }
      return;
    }
    _applyAuthClientDB(client,{
      history:row.history, prs:row.prs, bodyweight:row.bodyweight,
      medidas:row.medidas, nutrition:row.nutrition, photos:row.photos, msgs:row.msgs,
    });
    if(online) _cacheAuthRow(_authUid,row); // refresca el respaldo con lo recién bajado (ya fusionado)
    if(_mergedOffline){ _setAuthDirty(true); _flushAuthOnline(); } // sube la fila fusionada; al confirmar limpia el flag
  } else {
    const prof=_profileFromMeta(authUser);
    if(!prof._complete){
      // Usuario NUEVO sin perfil = entró por "Iniciar sesión con Google" SIN haberse registrado
      // antes (los registros por email o por "Crear cuenta con Google" sí traen perfil/pending).
      // No creamos cuenta a la fuerza con datos por defecto: cerramos sesión y le pedimos crear
      // cuenta primero (así su rutina se arma con su objetivo/nivel/sexo/edad reales).
      // MATA AL FANTASMA AL NACER (auditoría 2026-07-01): este "Continuar con Google"
      // ya AUTO-CREÓ una cuenta auth vacía con su Gmail; si queda viva, bloquea para
      // siempre el "Conectar mi Google" de su cuenta real (identity_already_exists —
      // caso Luz/Nataly). La edge delete-account en modo ghost la borra SOLO si no
      // tiene fila de datos (candado en el SERVIDOR — una cuenta con datos es intocable
      // por esta vía). Si falla (red caída), no bloquea: el mensaje de abajo guía y el
      // próximo intento con Google vuelve a pasar por aquí y la limpia (self-healing).
      try{
        const c=AUTH.client();
        if(c){ const r=await c.functions.invoke('delete-account',{body:{ghost:true}});
               if(r&&r.data&&r.data.ok) log('AVI: cuenta fantasma de Google limpiada');
               else warn('AVI: limpieza de fantasma no aplicó:',JSON.stringify((r&&r.data)||(r&&r.error&&r.error.message)||'')); }
      }catch(e){ warn('AVI: limpieza de cuenta fantasma falló (self-healing al próximo intento):',e&&e.message); }
      try{ await AUTH.signOut(); }catch(e){}
      AUTH_MODE=false;
      try{localStorage.removeItem('ax_wz_pending');}catch(e){}
      showScreen('s-login');
      const er=document.getElementById('lerr');
      // OJO (auditoría 2026-07-01): a este punto llegan también asesoradas a las que el
      // coach YA les creó cuenta (correo+clave) pero que tocaron "Continuar con Google".
      // Ese toque auto-crea una cuenta vacía con su Gmail que luego BLOQUEA el
      // "Conectar mi Google" del Perfil (identity_already_exists). El mensaje las
      // redirige al camino correcto: entrar con correo y clave.
      if(er){ er.textContent='Ese Google no tiene cuenta en AVI. Si tu coach ya te creó una, entra con tu correo y clave (Google se conecta después, desde tu Perfil). Si eres nuevo, toca “Crear cuenta”.'; er.classList.add('on'); }
      toast('Entra con tu correo y clave, o crea tu cuenta. 👇');
      return;
    }
    client=await _provisionFreeClient(authUser,prof);
  }
  try{localStorage.removeItem('ax_wz_pending');}catch(e){} // ya consumido (o usuario existente)
  CUR.loggedAs='client'; CUR.clientId=client.id;
  showScreen('s-client');
  initClientView(client);
  startMsgPolling();
  // Push: el registro vivía SOLO en tryAutoLogin (camino legacy) → desde el cutover a auth
  // NINGÚN dispositivo se re-registraba y los envíos dirigidos (chat) no encontraban
  // suscripción (última fila: 2026-06-02, cazado en auditoría 2026-07-06). Mismo patrón
  // que el camino legacy: espera 4s para no competir con el arranque.
  setTimeout(()=>{
    try{
      const trainingDays=(client.routines||[]).map(r=>r.day).filter(d=>d&&d!=='Libre');
      const shiftMap={};(client.routines||[]).forEach(r=>{if(r.day&&r.day!=='Libre'&&r.shift)shiftMap[r.day]=r.shift;});
      _pushCtx={clientId:client.id,days:trainingDays,shifts:Object.keys(shiftMap).length?shiftMap:null};
      // Con permiso ya dado: re-registra (endpoint puede rotar). Sin pedir aún ('default'):
      // tarjeta amable en "Hoy" — auditoría 2026-07-07: nadie le pedía el permiso al
      // asesorado y NINGUNO estaba suscrito (las notifs diarias solo llegaban al coach).
      if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
        subscribePush(client.id,_pushCtx.days,_pushCtx.shifts);
      } else { renderPushNudge(); }
    }catch(_e){}
  },4000);
  // Registro nuevo con semana ya generada → Reveal del plan (la app queda lista detrás).
  if(!row && client.selfReg && client.routines && client.routines.length){ showPlanReveal(client); }
  return client;
}

// Coach en modo auth: trae sus clientes (RLS filtra por coach_id) y los carga al DB.
// 2.2e-1 = solo lectura/visualización; la escritura del coach (convertir/editar/chat)
// se conecta en 2.2e-2 (por ahora _persistAuthUser la difiere en rol coach).
// Carga las filas de los clientes del coach al DB (reusado al entrar y al volver de "Mi entrenamiento").
// Clientes cuyas colecciones pesadas ya se trajeron en esta sesión (cache del lazy-load).
let _heavyLoaded={};
// Caché local de la lista de asesorados del coach (sin colecciones pesadas) → para que el
// panel no aparezca VACÍO si el coach lo abre sin red. Auditoría 2026-06-21.
function _coachCacheKey(){ return 'ax_coachcache_'+(_authUid||'x'); }
function _cacheCoachClients(rows){ try{ localStorage.setItem(_coachCacheKey(),JSON.stringify(rows)); }catch(e){} }
function _readCoachCache(){ try{ const r=localStorage.getItem(_coachCacheKey()); return r?JSON.parse(r):null; }catch(e){ return null; } }

// ── Cola de ALTAS PENDIENTES (#8 auditoría 2026-06-30) ──────────────────────────────────────
// Si el coach crea un asesorado SIN conexión (o la edge coach-create-client falla), su cuenta
// de acceso no se provisiona y antes el cliente quedaba SOLO en memoria → al recargar
// _hydrateCoachFromRows (que reemplaza DB.clients con las filas de la nube) lo borraba. Lo
// guardamos en una cola local por coach y: (1) lo re-inyectamos en DB.clients al hidratar (no se
// pierde), (2) reintentamos provisionar al reconectar y al cargar el panel. Guarda la clave en
// claro porque la edge la necesita para crear la cuenta; es el dispositivo del coach y la entrada
// se BORRA en cuanto se provisiona (self-healing por email si quedó alguna huérfana).
function _pendingKey(){ return 'ax_coachpending_'+(_authUid||'x'); }
function _readPending(){ try{ const r=localStorage.getItem(_pendingKey()); return r?JSON.parse(r):[]; }catch(e){ return []; } }
function _writePending(list){ try{ localStorage.setItem(_pendingKey(),JSON.stringify(list||[])); }catch(e){} }
function _addPending(client,rawPass){
  if(!client)return;
  const em=(client.email||'').toLowerCase();
  const list=_readPending().filter(p=>p.client.id!==client.id && (p.client.email||'').toLowerCase()!==em);
  list.push({client:{...client}, pass:rawPass, ts:Date.now()});
  _writePending(list);
}
function _removePending(client){
  if(!client)return;
  const id=client.id, em=(client.email||'').toLowerCase();
  _writePending(_readPending().filter(p=> p.client.id!==id && (p.client.email||'').toLowerCase()!==em));
}
// Re-inyecta en DB.clients las altas pendientes que aún no están (por id o email) → sobreviven
// a la recarga aunque la nube todavía no las tenga. Llamado dentro de _hydrateCoachFromRows.
function _mergePendingIntoDB(){
  const pend=_readPending(); if(!pend.length)return;
  pend.forEach(p=>{
    const c=p.client; if(!c)return;
    const em=(c.email||'').toLowerCase();
    const exists=(DB.clients||[]).some(x=>x.id===c.id||(em&&(x.email||'').toLowerCase()===em));
    if(exists)return;
    DB.clients.push(c);
    const id=c.id;
    DB.history[id]=DB.history[id]||[]; DB.msgs[id]=DB.msgs[id]||[];
    DB.bodyweight[id]=DB.bodyweight[id]||[]; DB.prs[id]=DB.prs[id]||{};
    DB.medidas[id]=DB.medidas[id]||[]; DB.nutrition[id]=DB.nutrition[id]||{}; DB.photos[id]=DB.photos[id]||[];
  });
}
// Reintenta provisionar las altas pendientes (al reconectar / al cargar el panel). Idempotente:
// si una ya quedó con cuenta real (uuid), solo limpia la cola.
async function _flushPendingClients(){
  if(!AUTH_MODE||AUTH_ROLE!=='coach'||!AUTH.ready())return;
  const list=_readPending(); if(!list.length)return;
  for(const p of list){
    const em=(p.client.email||'').toLowerCase();
    const inDb=(DB.clients||[]).find(c=>c.id===p.client.id||(em&&(c.email||'').toLowerCase()===em));
    if(inDb && _isAuthId(inDb.id)){ _removePending(p.client); continue; } // ya provisionado
    const target=inDb||p.client;
    // r=string → provisionado; r=false → rechazo permanente (correo en uso): se saca de la cola
    // para no reintentar en vano; r=null → transitorio: sigue en cola.
    try{ const r=await _provisionClientAccount(target,p.pass); if(r||r===false) _removePending(p.client); }
    catch(e){ warn('AVI: reintento de alta pendiente falló (sigue en cola):',e&&e.message); }
  }
}
window.addEventListener('online',()=>{ _flushPendingClients(); });
function _hydrateCoachFromRows(rows){
  DB.clients=rows.map(rowToClient);
  DB.history={};DB.msgs={};DB.prs={};DB.bodyweight={};DB.medidas={};DB.nutrition={};DB.photos={};
  _heavyLoaded={};
  rows.forEach(r=>{
    const id=r.user_id;
    // Lo que la lista del coach SÍ usa (viene en loadCoachClients):
    DB.history[id]   =r.history   ||[];
    DB.msgs[id]      =r.msgs      ||[];
    DB.bodyweight[id]=r.bodyweight||[];
    // Pesadas: vacías hasta abrir el cliente (_ensureClientHeavy las llena).
    DB.prs[id]={};DB.medidas[id]=[];DB.nutrition[id]={};DB.photos[id]=[];
  });
  _mergePendingIntoDB(); // #8: no perder altas offline aún no provisionadas
  _primeCoachSnap(); // foto base: solo se escribirá lo que el coach cambie de aquí en más
}
async function _loadCoachClientsIntoDB(){
  const rows=await UD.loadCoachClients();
  if(!rows){
    // Falló la carga (sin red/auth) → NO pisar la lista; caer al caché si lo hay.
    const cached=_readCoachCache();
    if(cached&&cached.length){ _hydrateCoachFromRows(cached); toast('📴 Sin conexión — mostrando tus asesorados guardados'); }
    else if(!(DB.clients&&DB.clients.length)){ DB.clients=DB.clients||[]; }
    return;
  }
  _cacheCoachClients(rows); // refresca el respaldo local de la lista
  _hydrateCoachFromRows(rows);
  _flushPendingClients(); // #8: ya hay red → reintenta provisionar altas que quedaron en cola
}
// Trae las colecciones pesadas de un cliente la primera vez que el coach abre su detalle.
// No-op en modo legacy (blob): allí DB ya tiene todo. Idempotente por _heavyLoaded.
async function _ensureClientHeavy(id){
  if(!AUTH_MODE)return;
  if(_heavyLoaded[id])return;
  const h=await UD.loadClientHeavy(id);
  if(h){
    DB.prs[id]      =h.prs      ||{};
    DB.medidas[id]  =h.medidas  ||[];
    DB.nutrition[id]=h.nutrition||{};
    DB.photos[id]   =h.photos   ||[];
  }
  _heavyLoaded[id]=true;
}

async function _enterCoachAuth(authUser, ownRow){
  COACH_OWN_ROW=ownRow||null;                    // ya la cargamos aquí → "Mi entrenamiento" no re-pide red
  if(ownRow&&_authUid) _cacheAuthRow(_authUid,ownRow); // respaldo local (también sirve offline)
  // Plantillas del coach: viven en SU fila (columna `templates`). Cargarlas a DB para que el
  // cargador de plantillas las muestre. Antes no se guardaban en modo auth → se perdían al recargar.
  DB.templates = Array.isArray(ownRow&&ownRow.templates) ? ownRow.templates : (DB.templates||[]);
  // Ajustes globales del coach (ejercicios custom, Nequi, nombre/email/sitio): viven en SU fila
  // (columna `coach_settings`). Reflejarlos a localStorage para que los lectores ld()-based
  // (getCoachName/Email/Site, DB.nequi/exercises) los vean. Antes se perdían al recargar en
  // AUTH_MODE (bug #1 auditoría 2026-06-30). Guardas anti-vacío: no pisar defaults con nada.
  const _cs = ownRow && ownRow.coach_settings;
  if(_cs && typeof _cs==='object'){
    try{
      if(Array.isArray(_cs.e) && _cs.e.length){ localStorage.setItem('ax_e',JSON.stringify(_cs.e)); DB.exercises=_cs.e; }
      if(_cs.nequi!=null){ localStorage.setItem('ax_nequi',JSON.stringify(_cs.nequi)); DB.nequi=_cs.nequi; }
      if(_cs.cn)        localStorage.setItem('ax_cn',  JSON.stringify(_cs.cn));
      if(_cs.ce)        localStorage.setItem('ax_ce',  JSON.stringify(_cs.ce));
      if(_cs.site!=null)localStorage.setItem('ax_site',JSON.stringify(_cs.site));
    }catch(e){ warn('AVI: hidratar coach_settings falló (no bloquea):',e&&e.message); }
  }
  await _loadCoachClientsIntoDB();
  CUR.loggedAs='coach'; CUR.clientId=null; COACH_SELF=false;
  showScreen('s-coach');
  initCoach();
  // Push del coach ('_coach'): igual que el cliente, el registro se perdió con el cutover
  // a auth (vivía solo en tryAutoLogin). Ver nota en el camino del cliente (2026-07-06).
  if(typeof Notification!=='undefined'&&Notification.permission==='granted') setTimeout(()=>{
    try{ subscribePush('_coach'); if(typeof restoreNotifications==='function')restoreNotifications(); }catch(_e){}
  },3000);
  return null;
}

// "Mi entrenamiento": el coach ve/entrena su PROPIA rutina (su fila user_data) reusando la
// vista del asesorado. COACH_SELF enruta el guardado a SU fila (no a la de un cliente).
async function openMyTraining(){
  closeDrawer(); // feedback INMEDIATO: el panel se cierra al toque, no después de la red
  // Fuente instantánea: tu fila propia ya se cargó al entrar al panel (COACH_OWN_ROW) o
  // quedó en el respaldo local. Evita el await de red que dejaba el panel "congelado".
  // Solo si no hay ninguna (caso raro) se pide a la nube, con aviso de carga.
  let row=COACH_OWN_ROW||_readAuthRow(_authUid);
  if(!row){
    toast('Cargando tu entrenamiento…');
    try{ row=await UD.loadOwn(); }catch(e){ row=null; }
  }
  if(!row){ toast('No se pudo cargar tu entrenamiento'); return; }
  COACH_OWN_ROW=row;
  COACH_SELF=true;
  const me=rowToClient(row);
  me.tier='premium'; // el coach tiene acceso completo en su propio entrenamiento (sin candados)
  _applyAuthClientDB(me,{history:row.history,prs:row.prs,bodyweight:row.bodyweight,medidas:row.medidas,nutrition:row.nutrition,photos:row.photos,msgs:row.msgs});
  CUR.loggedAs='client'; CUR.clientId=me.id; // vista de asesorado, pero sigue siendo el coach
  const bk=document.getElementById('coach-self-topbar-btn'); if(bk)bk.style.display='';
  showScreen('s-client');
  initClientView(me);
}
async function backToCoachPanel(){
  // Conserva las ediciones de esta sesión: re-snapshot de tu fila ANTES de recargar clientes,
  // así reabrir "Mi entrenamiento" sigue siendo instantáneo Y refleja lo recién cambiado.
  try{ const s=_snapshotAuthRow(); if(s) COACH_OWN_ROW=s; }catch(e){}
  COACH_SELF=false; CUR.clientId=null;
  const bk=document.getElementById('coach-self-topbar-btn'); if(bk)bk.style.display='none';
  await _loadCoachClientsIntoDB();
  CUR.loggedAs='coach';
  showScreen('s-coach');
  initCoach();
}

// ══════════════════════════════════════════
// WIZARD DE REGISTRO PREMIUM (modo libre)
// Maneja los 7 pasos del auto-registro. Los chips/steppers escriben en los
// controles ocultos su-* (fuente de verdad de signupClient) — la lógica de
// creación de cuenta NO cambia.
// ══════════════════════════════════════════
// ── Consentimiento Habeas Data en el registro (Ley 1581/2012) ──
// Versión de los textos legales que el usuario acepta — súbela cuando cambien los
// documentos de legal/ para que la evidencia guardada diga QUÉ versión se aceptó.
// Los textos son BORRADORES pendientes de revisión de abogado (legal/LEEME-IMPORTANTE.md);
// Camilo decidió conectarlos tal cual mientras tanto (2026-07-06).
const LEGAL_V='2026-07-07-borrador';
const LEGAL_DOCS={
  politica:{file:'politica-tratamiento-datos.md',title:'Política de Tratamiento de Datos'},
  terminos:{file:'terminos-y-condiciones.md',title:'Términos y Condiciones'},
};

// Render mínimo de los .md legales (títulos, negrita, listas, citas). No es un parser
// markdown general: cubre exactamente lo que usan los documentos de legal/.
function _legalMdToHtml(md){
  const inline=s=>esc(s)
    .replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')
    .replace(/\*(.+?)\*/g,'<i>$1</i>')
    .replace(/\[(.+?)\]/g,'$1'); // enlaces placeholder [Doc] → texto plano
  const out=[]; let list=false;
  const closeList=()=>{ if(list){out.push('</ul>');list=false;} };
  String(md||'').split(/\r?\n/).forEach(ln=>{
    const t=ln.trim();
    if(/^- /.test(t)){ if(!list){out.push('<ul>');list=true;} out.push('<li>'+inline(t.slice(2))+'</li>'); return; }
    closeList();
    if(!t){ return; }
    if(/^### /.test(t)){ out.push('<h4>'+inline(t.slice(4))+'</h4>'); return; }
    if(/^## /.test(t)){ out.push('<h4>'+inline(t.slice(3))+'</h4>'); return; }
    if(/^# /.test(t)){ out.push('<h3>'+inline(t.slice(2))+'</h3>'); return; }
    if(/^> /.test(t)){ out.push('<p class="lg-quote">'+inline(t.slice(2))+'</p>'); return; }
    if(/^---+$/.test(t)){ return; }
    out.push('<p>'+inline(t)+'</p>');
  });
  closeList();
  return out.join('');
}

// Abre el visor con un documento de legal/ (links de las casillas del registro).
async function showLegalDoc(which){
  const doc=LEGAL_DOCS[which]; if(!doc)return;
  const tt=document.getElementById('legal-title'), bd=document.getElementById('legal-body');
  if(tt)tt.textContent=doc.title;
  if(bd)bd.innerHTML='Cargando…';
  om('m-legal');
  try{
    const r=await fetch('legal/'+doc.file);
    if(!r.ok)throw new Error('HTTP '+r.status);
    if(bd)bd.innerHTML=_legalMdToHtml(await r.text());
  }catch(e){
    if(bd)bd.innerHTML='<p>No se pudo cargar el documento. Revisa tu conexión e intenta de nuevo.</p>';
  }
}

// Lee las 3 casillas y arma la evidencia (o null si falta alguna). La usan los DOS
// caminos de registro: email (signupClient) y Google (wzGoogle).
function _wzConsent(){
  const ck=id=>{const e=document.getElementById(id);return !!(e&&e.checked);};
  return consentEvidence({general:ck('su-ck-general'),salud:ck('su-ck-salud'),adulto:ck('su-ck-adulto')},LEGAL_V);
}

const WZ={
  steps:['wz-s-name','wz-s-goal','wz-s-place','wz-s-level','wz-s-when','wz-s-body','wz-s-account'],
  cur:0,
  open(){
    this.cur=0;
    // limpia selecciones previas y re-aplica el día por defecto (3)
    document.querySelectorAll('#cin-signup .wz-chip.on,#cin-signup .wz-gchip.on').forEach(c=>c.classList.remove('on'));
    const d3=document.getElementById('wz-day3'); if(d3)d3.classList.add('on');
    const sd=document.getElementById('su-days'); if(sd)sd.value='3';
    this._sync();
  },
  _sync(){
    this.steps.forEach((id,i)=>{const el=document.getElementById(id);if(el)el.classList.toggle('on',i===this.cur);});
    const pct=Math.round((this.cur+1)/this.steps.length*100);
    const f=document.getElementById('wz-fill'); if(f)f.style.width=pct+'%';
    const c=document.getElementById('wz-count'); if(c)c.textContent='0'+(this.cur+1)+'/0'+this.steps.length;
    const e=document.getElementById('su-err'); if(e)e.classList.remove('on');
    const sg=document.getElementById('cin-signup'); if(sg)sg.scrollTop=0;
  },
  next(){
    if(!this._valid())return;
    if(this.cur<this.steps.length-1){this.cur++;this._sync();}
  },
  back(){
    if(this.cur===0){ // volver a la bienvenida (CTA)
      document.getElementById('cin-signup').style.display='none';
      document.getElementById('cin-cta').style.display='flex';
      return;
    }
    this.cur--; this._sync();
  },
  pick(field,val,btn){
    const el=document.getElementById(field); if(el)el.value=val;
    const grp=btn.closest('[data-wzgroup]');
    if(grp)grp.querySelectorAll('.wz-chip,.wz-gchip').forEach(c=>c.classList.remove('on'));
    btn.classList.add('on');
    if(btn.dataset.adv!=='0'){ setTimeout(()=>WZ.next(),230); } // auto-avanza en selección simple
  },
  step(field,delta,min,max){
    const el=document.getElementById(field); if(!el)return;
    let v=parseFloat(el.value);
    if(isNaN(v))v=({'su-age':25,'su-weight':70,'su-height':168}[field])||min;
    v=Math.min(max,Math.max(min,v+delta));
    el.value=(field==='su-weight')?(Math.round(v*10)/10):Math.round(v);
  },
  _err(msg){ const e=document.getElementById('su-err'); if(e){e.textContent=msg;e.classList.add('on');} },
  _valid(){
    if(this.steps[this.cur]==='wz-s-name'){
      const n=document.getElementById('su-name');
      if(!n||!n.value.trim()){ this._err('Escribe tu nombre para continuar'); return false; }
    }
    return true;
  }
};

async function signupClient(){
  const err=document.getElementById('su-err');
  const btn=document.querySelector('#cin-signup button[onclick*="signupClient"], #cin-card button[onclick*="signupClient"]');
  const g=id=>document.getElementById(id);
  const data={
    name:g('su-name').value.trim(),
    email:g('su-email').value.trim().toLowerCase(),
    password:g('su-pass').value,
    goal:g('su-goal').value,
    place:g('su-place').value||'gym',
    level:g('su-level').value||'Principiante',
    days:parseInt(g('su-days').value)||3,
    sex:g('su-sex').value||null,
    age:parseInt(g('su-age').value)||null,
    weight:parseFloat(g('su-weight').value)||null,
    height:parseFloat(g('su-height').value)||null,
  };
  const v=validateSignup(data,[],getCoachEmail()); // unicidad la valida Supabase Auth
  if(!v.ok){err.textContent=v.error;err.classList.add('on');return;}
  const consent=_wzConsent();
  if(!consent){err.textContent='Para crear tu cuenta marca las 3 casillas de autorización (incluida la de datos de salud: sin ella no podemos armar tu rutina).';err.classList.add('on');return;}
  if(!AUTH.ready()){err.textContent='Sin conexión para crear la cuenta. Revisa tu internet.';err.classList.add('on');return;}
  err.classList.remove('on');
  if(btn){btn.disabled=true;}
  try{
    // 1. Crear cuenta en Supabase Auth (la contraseña la maneja Auth; el perfil va en metadata)
    const meta={name:data.name,goal:data.goal,level:data.level,days:data.days,sex:data.sex,age:data.age,weight:data.weight,height:data.height,place:data.place,selfReg:true,consent};
    let res;
    try{ res=await AUTH.signUpEmail(data.email,data.password,meta); }
    catch(e){ err.textContent='No se pudo crear la cuenta. Intenta de nuevo.';err.classList.add('on');return; }
    if(res.error){
      const m=res.error.message||'';
      err.textContent=/registered|already|exists/i.test(m)?'Ya existe una cuenta con ese email. Inicia sesión.':('No se pudo crear: '+m);
      err.classList.add('on');return;
    }
    const session=res.data&&res.data.session;
    const user=res.data&&res.data.user;
    // 2. Si Supabase exige confirmar correo, no hay sesión aún → provisionará en el 1er login.
    if(!session){
      err.classList.remove('on');
      toast('📧 Te enviamos un correo para confirmar tu cuenta. Confírmalo e inicia sesión.');
      return;
    }
    // 3. Hay sesión → provisionar (rutina auto-generada + fila) y entrar.
    await _enterAuthSession(user);
    toast('🎉 ¡Bienvenido a AVI! Tu rutina ya está lista.');
  } finally {
    if(btn){btn.disabled=false;}
  }
}

// El usuario llegó al paso 7 del wizard y eligió Google. signInWithOAuth nos saca de la
// página y se perderían sus respuestas, así que las guardamos primero; al volver,
// _profileFromMeta las recupera → genera su semana → Reveal nuevo (no el formulario viejo).
function wzGoogle(){
  const g=id=>{const e=document.getElementById(id);return e?e.value:'';};
  const name=(g('su-name')||'').trim();
  if(!name){ const e=document.getElementById('su-err'); if(e){e.textContent='Escribe tu nombre antes de continuar con Google';e.classList.add('on');} WZ.cur=0; WZ._sync(); return; }
  // Mismo gate de consentimiento que el registro por email: sin las 3 casillas no se
  // redirige a Google (la evidencia viaja en ax_wz_pending porque OAuth nos saca de la página).
  const consent=_wzConsent();
  if(!consent){ const e=document.getElementById('su-err'); if(e){e.textContent='Para crear tu cuenta marca las 3 casillas de autorización (incluida la de datos de salud: sin ella no podemos armar tu rutina).';e.classList.add('on');} return; }
  try{
    localStorage.setItem('ax_wz_pending', JSON.stringify({
      name, goal:g('su-goal')||null, place:g('su-place')||'gym', level:g('su-level')||'Principiante',
      days:parseInt(g('su-days'))||3, sex:g('su-sex')||null,
      age:parseInt(g('su-age'))||null, weight:parseFloat(g('su-weight'))||null, height:parseFloat(g('su-height'))||null,
      consent,
      ts:Date.now()
    }));
  }catch(e){}
  loginWithGoogle();
}

// Regenerar la semana desde la vista del asesorado (solo modo libre).
function clientSelfGenerate(){
  const c=DB.clients.find(x=>x.id===CUR.clientId);if(!c)return;
  try{
    const res=_autoGenerateWeek(c);
    svNow('ax_c',DB.clients);
    renderClientAllRoutines(c);
    toast(res.routines&&res.routines.length?'✨ ¡Tu nueva semana está lista!':'No se pudo generar, intenta de nuevo');
  }catch(e){ warn('AVI: regenerar libre falló:',e&&e.message); toast('No se pudo generar, intenta de nuevo'); }
}

// ── Invitación a Premium / coach real (solo modo libre) ──
function coachUpsellHTML(c){
  // Solo a usuarios LIBRES (tier='libre'). Antes gateaba por selfReg, así que un auto-registrado
  // YA convertido a Premium (selfReg + tier='premium') seguía viendo "Pásate a Premium" — se le
  // ofrecía algo que ya tiene. Premium/gestionados no llevan upsell. (Auditoría Camilo 2026-06-25)
  if(!c||!isFreeClient(c))return '';
  if(c.wantsCoach){
    return `<div style="background:var(--gl);border:1px solid var(--g2);border-radius:var(--r);padding:12px 14px;margin-bottom:12px;font-size:13px;color:var(--gt);line-height:1.5">✅ <b>¡Solicitud enviada!</b> Tu coach te contactará pronto para guiarte de cerca. 💪</div>`;
  }
  return `<div style="background:linear-gradient(135deg,#06402E,#0A7C5B);border-radius:var(--r);padding:14px 16px;margin-bottom:12px;color:#fff;box-shadow:0 6px 18px rgba(27,67,50,.25)">
    <div style="font-size:14px;font-weight:800;margin-bottom:4px">🌟 ¿Quieres un coach real que te guíe?</div>
    <div style="font-size:12px;opacity:.92;line-height:1.55;margin-bottom:11px">Pásate a <b>Premium</b>: un entrenador ajusta tu plan a ti, corrige tu técnica y te acompaña semana a semana. Aquí no entrenas solo.</div>
    <button onclick="showPremiumUpsell()" style="width:100%;padding:11px;background:#10E0A0;color:#06231a;border:none;border-radius:10px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer">Quiero un coach →</button>
  </div>`;
}
function renderCoachUpsell(c){
  ['cn-today-upsell','cn-profile-upsell'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=coachUpsellHTML(c);});
}
// Candado para funciones Premium (modo libre): atenuado + invitación a coach.
function premiumLockHTML(title,desc){
  return `<div style="background:var(--w);border:1px dashed var(--br2);border-radius:var(--r);padding:18px 16px;text-align:center">
    <div style="font-size:26px;margin-bottom:6px">🔒</div>
    <div style="font-size:14px;font-weight:800;color:var(--t1);margin-bottom:4px">${esc(title)}</div>
    <div style="font-size:12px;color:var(--t2);line-height:1.5;margin-bottom:12px">${esc(desc)} Disponible con un <b>coach (Premium)</b>.</div>
    <button onclick="showPremiumUpsell()" style="padding:10px 18px;background:#10E0A0;color:#06231a;border:none;border-radius:10px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer">Quiero un coach →</button>
  </div>`;
}
// Cliente actual (para gating en vistas del asesorado).
function _curClient(){ return DB.clients.find(x=>x.id===CUR.clientId); }
async function requestCoach(){
  const c=DB.clients.find(x=>x.id===CUR.clientId);if(!c)return;
  c.wantsCoach=true;c.wantsCoachAt=new Date().toISOString();c.coach_id=COACH_UID;
  svNow('ax_c',DB.clients);
  // Avisar al coach por el chat: le llega a su bandeja + notificación vía su sondeo.
  if(!DB.msgs[c.id])DB.msgs[c.id]=[];
  DB.msgs[c.id].push({from:'client',text:'🙋 ¡Hola! Me gustaría pasar a Premium y tener un coach que me guíe. ¿Me cuentas cómo seguir?',date:new Date().toISOString()});
  svNow('ax_m',DB.msgs);
  // CLAVE: asignar coach_id en la fila (columna, no profile) para que el coach pueda LEERLA
  // por RLS (select: coach_id = auth.uid()). Sin esto, la solicitud y el mensaje quedaban
  // atrapados en una fila con coach_id=null que el coach nunca cargaba. upsert parcial
  // preserva las demás columnas. Ver fix bug "solicitudes de coach invisibles" 2026-06-07.
  try{ if(AUTH_MODE) await UD.upsertOwn({coach_id:COACH_UID}); }
  catch(e){ warn('AVI: no se pudo asignar coach_id en requestCoach:',e&&e.message); }
  renderCoachUpsell(c);
  toast('🎉 ¡Listo! Tu coach te contactará pronto.');
}

// Selector de nivel del cliente (3): Libre / Premium app / Premium + Coach.
// El coach elige el nivel; el actual va resaltado. Cambiar pide confirmación.
function planControlHTML(c){
  if(!c)return '';
  const cur=clientPlan(c);
  const opts=[
    ['libre','🆓 Libre','Gratis · app auto-generada'],
    ['app','⭐ Premium app','$19.900 · toda la app, sin coach'],
    ['coach','👑 Premium + Coach','$100.000 · todo + chat y ajustes'],
  ];
  const btns=opts.map(([k,lbl,sub])=>{
    const on=k===cur;
    return `<button class="planopt${on?' on':''}"${on?' disabled':''} onclick="setClientPlan('${esc(c.id)}','${k}')">
      <div class="planopt-lbl">${lbl}${on?' ✓':''}</div>
      <div class="planopt-sub">${sub}</div>
    </button>`;
  }).join('');
  const wants=(cur!=='coach'&&c.wantsCoach)?`<div class="plan-wants">🙋 <b>Pidió un coach.</b> Súbelo a <b>Premium + Coach</b> cuando confirmes el pago.</div>`:'';
  return `<div class="plan-control"><div class="plan-control-h">Nivel de acceso</div>${wants}<div class="planopts">${btns}</div></div>`;
}
// Cambia el nivel del cliente. 'coach' se persiste como tier='premium' (compatibilidad
// con datos existentes; clientHasCoach lo trata como coacheado).
function setClientPlan(cid,plan){
  const c=DB.clients.find(x=>x.id===cid);if(!c)return;
  if(clientPlan(c)===plan)return;
  const labels={libre:'Libre (gratis)',app:'Premium app (sin coach)',coach:'Premium + Coach'};
  if(!confirm(`¿Cambiar a ${c.name.split(' ')[0]} al nivel "${labels[plan]}"?`))return;
  c.tier = plan==='coach' ? 'premium' : plan;
  if(plan==='coach'){ c.wantsCoach=false; if(!c.coach_id)c.coach_id=COACH_UID; }
  c.updatedAt=new Date().toISOString();
  svNow('ax_c',DB.clients);
  toast(`✅ ${c.name.split(' ')[0]}: ${labels[plan]}`);
  openDetail(cid);renderClients();renderHome();
}
// Compat: alias del botón anterior (Premium = con coach).
function convertToPremium(cid){ setClientPlan(cid,'coach'); }

async function openDetail(id,_silent){
  const c=DB.clients.find(x=>x.id===id);if(!c)return;CUR.clientId=id;
  const av=document.getElementById('d-av');
  if(c.avatar){av.textContent='';av.style.background=`#ccc center/cover url("${c.avatar}")`;}
  else{av.textContent=ini(c.name);av.style.background=avc(c.name);av.style.backgroundImage='';}
  document.getElementById('d-name').textContent=c.name;
  // Meta: sex, age, height, weight, email
  const metaParts=[];
  if(c.sex) metaParts.push(c.sex==='M'?'♂ Masculino':'♀ Femenino');
  if(c.age) metaParts.push(c.age+' años');
  if(c.height) metaParts.push(c.height+' cm');
  if(c.weight) metaParts.push(c.weight+' kg');
  if(c.email) metaParts.push(c.email);
  document.getElementById('d-meta').textContent=metaParts.join(' · ')||'Sin datos';
  const _plan=clientPlan(c);
  const _planStyle={libre:'background:var(--bll);color:#1a4a7a',app:'background:var(--gl);color:var(--gt)',coach:'background:#FBF4DC;color:#9A7B16'}[_plan];
  const _planIco={libre:'🆓',app:'⭐',coach:'👑'}[_plan];
  const _wantsTag=(_plan!=='coach'&&c.wantsCoach)?`<span class="tag" style="background:var(--orl);color:var(--or)">🙋 Quiere coach</span>`:'';
  document.getElementById('d-tags').innerHTML=`<span class="tag ${c.level==='Principiante'?'tg':c.level==='Intermedio'?'tb':'to'}">${esc(c.level)}</span><span class="tag ty">${_coIco('target',12,'🎯')} ${esc(c.goal)}</span><span class="tag tg">${_coIco('calendar',12,'📅')} ${esc(String(c.days))} días/sem</span><span class="tag" style="${_planStyle}">${_planIco} ${PLAN_LABEL[_plan]}</span>${_wantsTag}`;
  const freeLead=document.getElementById('d-freelead');
  if(freeLead) freeLead.innerHTML=planControlHTML(c);
  const dn=document.getElementById('d-notes');
  // Dolor vigente reportado por el asesorado (feature 2026-07-07): el coach lo ve de
  // frente en la ficha, con qué ejercicio y hace cuánto — para ajustar la rutina.
  let _painHTML='';
  try{
    const _act=(typeof painCareActive==='function')?painCareActive(c.painCare):[];
    if(_act.length){
      const _lv={1:'🟡 leve',2:'🟠 molesto',3:'🔴 no pudo hacerlo'};
      _painHTML='<div style="background:var(--orl);border:1px solid var(--or);border-radius:var(--rsm);padding:8px 10px;margin-bottom:8px;line-height:1.6">🩹 <strong>Dolor reportado:</strong> '+
        _act.slice(-3).map(p=>`${esc(p.area)} (${_lv[p.level]||p.level}) con ${esc(p.exName||'—')} · ${fmtD(p.at)}${p.note?` — “${esc(p.note)}”`:''}`).join('<br>')+
        '</div>';
    }
  }catch(_e){}
  dn.style.display=(c.notes||_painHTML)?'block':'none';
  dn.innerHTML=_painHTML+(c.notes?`${_coIco('pencil',12,'📝')} <strong>Notas:</strong> ${esc(c.notes)}`:'');
  renderValoracion(c);
  renderDetailRoutines(c);renderDetailMsgs(id);renderCoachClientHistory(id);renderCoachExProgress(id);renderNutritionCoach(id);renderMedidasCoach(id);
  renderDetailMembership(id);
  gp('p-detail',null,'Detalle',_silent);document.querySelectorAll('.sbi').forEach(s=>s.classList.remove('on'));document.getElementById('sbi-clients').classList.add('on');
  document.querySelectorAll('.cbnav-item').forEach(b=>b.classList.remove('on'));document.querySelectorAll('.cbnav-item')[1].classList.add('on');
  // El panel YA se mostró con lo que había en memoria (perfil/rutinas/historial/mensajes).
  // Las colecciones pesadas (PRs/medidas/nutrición/fotos) se cargan DESPUÉS, sin congelar la
  // pantalla, y se re-renderiza SOLO esas secciones. Re-open de un cliente ya cargado = instantáneo.
  if(!_heavyLoaded[id]){
    await _ensureClientHeavy(id);
    if(CUR.clientId!==id) return; // el coach abrió otro cliente mientras cargaba → no pisar
    renderValoracion(c);renderCoachExProgress(id);renderNutritionCoach(id);renderMedidasCoach(id);
  }
}

// ══════════════════════════════════════════
// VALORACIÓN FÍSICA AUTOMÁTICA
// ══════════════════════════════════════════
function renderValoracion(c){
  const con = document.getElementById('d-valoracion-body');
  if(!con) return;

  const w = parseFloat(c.weight);
  const h = parseFloat(c.height);
  const age = parseInt(c.age);
  const sex = c.sex;
  const af = parseFloat(c.activityFactor)||1.55;
  const goal = c.goal||'Salud general';

  // Need at least weight + height for basic calculations
  if(!w || !h){
    con.innerHTML=`<div style="font-size:13px;color:var(--t3);text-align:center;padding:12px 0">
      Completa peso y altura del asesorado para ver la valoración 📊
    </div>`;
    return;
  }


  // ── TMB (Mifflin-St Jeor) y TDEE → avi-core.js ──
  const tmb = calcTMB(w, h, age, sex);
  const tdee = calcTDEE(tmb, af);

  // ── RCT e ICC (reemplaza peso ideal y BMI) ──
  // Las medidas se guardan con unshift (la más NUEVA en índice 0). Antes se leía [length-1]
  // = la más VIEJA → RCT/ICC/getRctLabel/getGoalMsg invertidos (podía decir "riesgo elevado"
  // cuando el asesorado mejoró). Bug #4 auditoría 2026-06-30.
  const latestMed = (DB.medidas && DB.medidas[c.id] && DB.medidas[c.id].length)
    ? DB.medidas[c.id][0]
    : {};
  const cinturaCm = latestMed.cintura ? parseFloat(latestMed.cintura) : null;
  const caderaCm  = latestMed.cadera  ? parseFloat(latestMed.cadera)  : null;
  const sexCode   = getSexCode(c.sex);

  let rct = null, icc = null;
  if(cinturaCm && h) rct = cinturaCm / parseFloat(h);
  if(cinturaCm && caderaCm) icc = cinturaCm / caderaCm;

  // getRctLabel / getIccLabel → avi-core.js (fuente única de verdad)
  const rctInfo = rct ? getRctLabel(rct) : null;
  const iccInfo = icc ? getIccLabel(icc, sexCode) : null;

  // getGoalMsg → avi-core.js (fuente única de verdad)

  // ── Calorías objetivo y macros sugeridos → avi-core.js ──
  const _kcalT = kcalTargetFor(goal, tdee);
  const kcalObj = _kcalT.kcalObj, kcalLabel = _kcalT.label;
  const macros = calcMacrosFromKcal(kcalObj, w, goal);

  // ── Render ──
  const statBox = (icon, label, val, sub, color) =>
    `<div style="background:var(--bg);border:1px solid var(--br);border-radius:10px;padding:12px 14px;text-align:center">
      <div style="font-size:11px;color:var(--t3);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">${icon} ${label}</div>
      <div style="font-size:22px;font-weight:900;color:${color||'var(--t1)'};font-family:var(--mono,'JetBrains Mono',monospace)">${val}</div>
      ${sub?`<div style="font-size:11px;color:${color||'var(--t3)'};margin-top:2px">${sub}</div>`:''}
    </div>`;

  const row = (label, val, note) =>
    `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--br)">
      <span style="font-size:13px;color:var(--t2)">${label}</span>
      <span style="font-size:13px;font-weight:700;text-align:right;max-width:55%">${val}${note?`<span style="font-size:11px;font-weight:400;color:var(--t3);display:block">${note}</span>`:''}
      </span>
    </div>`;

  let html = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:14px">`;
  if(rct && rctInfo){
    html += statBox(_coIco('ruler',12,'📐'),'Cintura/Talla', rct.toFixed(2), rctInfo.label, rctInfo.color);
  } else if(h) {
    html += statBox(_coIco('ruler',12,'📐'),'Cintura/Talla','—','Registra tu cintura','var(--t3)');
  }
  if(icc && iccInfo){
    html += statBox(_coIco('scale',12,'⚖️'),'Cintura/Cadera', icc.toFixed(2), iccInfo.label, iccInfo.color);
  }
  if(tmb)  html += statBox(_coIco('flame',12,'🔥'),'TMB',tmb+' kcal','En reposo','var(--or)');
  if(tdee) html += statBox(_coIco('bolt',12,'⚡'),'TDEE',tdee+' kcal','Con actividad','var(--g)');
  html += `</div>`;

  if(kcalObj){
    html += `<div style="background:linear-gradient(135deg,rgba(45,106,79,.15),rgba(82,183,136,.08));border:1.5px solid rgba(82,183,136,.3);border-radius:12px;padding:13px 14px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:800;color:var(--g2);margin-bottom:8px">${_coIco('target',12,'🎯')} OBJETIVO: ${esc(goal).toUpperCase()}</div>
      <div style="font-size:24px;font-weight:900;color:white;margin-bottom:4px">${kcalObj.toLocaleString()} kcal/día</div>
      <div style="font-size:12px;color:var(--accent3,#5FE3B0)">${kcalLabel}</div>
    </div>`;
  }

  if(macros){
    html += `<div style="font-size:11px;font-weight:800;color:var(--t3);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Distribución de macronutrientes</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
      <div style="background:rgba(255,71,87,.1);border:1px solid rgba(255,71,87,.3);border-radius:10px;padding:10px;text-align:center">
        <div style="font-size:10px;color:#FF4757;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Proteína</div>
        <div style="font-size:20px;font-weight:900;color:white">${macros.prot_g}g</div>
        <div style="font-size:10px;color:var(--t3)">${macros.prot_g*4} kcal</div>
      </div>
      <div style="background:rgba(255,214,10,.1);border:1px solid rgba(255,214,10,.3);border-radius:10px;padding:10px;text-align:center">
        <div style="font-size:10px;color:#FFD60A;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Carbos</div>
        <div style="font-size:20px;font-weight:900;color:white">${macros.carb_g}g</div>
        <div style="font-size:10px;color:var(--t3)">${macros.carb_g*4} kcal</div>
      </div>
      <div style="background:rgba(74,158,255,.1);border:1px solid rgba(74,158,255,.3);border-radius:10px;padding:10px;text-align:center">
        <div style="font-size:10px;color:#4A9EFF;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Grasas</div>
        <div style="font-size:20px;font-weight:900;color:white">${macros.fat_g}g</div>
        <div style="font-size:10px;color:var(--t3)">${macros.fat_g*9} kcal</div>
      </div>
    </div>`;
  }

  // Additional data rows
  html += `<div style="margin-top:4px">`;
  if(w && h) html += row('Peso actual / Altura', `${w} kg / ${h} cm`);
  if(age)    html += row('Edad', `${age} años`);
  if(sex)    html += row('Sexo biológico', sex==='M'?'Masculino':'Femenino');
  const actLabels={1.2:'Sedentario',1.375:'Ligera',1.55:'Moderada',1.725:'Alta',1.9:'Muy alta'};
  html += row('Actividad diaria', actLabels[af]||'Moderada');
  const goalMsg = getGoalMsg(goal, rct);
  html += `<div style="background:var(--gl);border-radius:var(--rsm);padding:10px 14px;font-size:13px;color:var(--gt);margin-top:4px;line-height:1.5">${goalMsg}</div>`;
  html += `</div>`;

  html += `<div style="font-size:10px;color:var(--t3);margin-top:10px;line-height:1.5;border-top:1px solid var(--br);padding-top:8px">
    ⚕️ <strong>Nota clínica:</strong> Estos cálculos son estimaciones de referencia basadas en fórmulas estándar (Mifflin-St Jeor).
    Ajusta las calorías y macros según la respuesta individual del asesorado.
  </div>`;

  con.innerHTML = html;
}

function delClient(){
  const c=DB.clients.find(x=>x.id===CUR.clientId);
  if(!delClientGuard(c,()=>confirm(`¿Eliminar a ${c.name}? Se borrarán sus rutinas, historial, fotos y todos sus datos. Esta acción no se puede deshacer.`)))return;
  const delId=CUR.clientId;
  // Modo auth: borrar la fila del cliente en la nube (si no, reaparece al volver a entrar).
  if(AUTH_MODE){ UD.deleteClientRow(delId).catch(e=>warn('AVI: borrar fila cliente en nube falló:',e&&e.message)); }
  DB.clients=DB.clients.filter(x=>x.id!==CUR.clientId);delete DB.msgs[CUR.clientId];
  if(DB.history)delete DB.history[CUR.clientId];
  if(DB.prs)delete DB.prs[CUR.clientId];
  if(DB.bodyweight)delete DB.bodyweight[CUR.clientId];
  if(DB.nutrition)delete DB.nutrition[CUR.clientId];
  if(DB.medidas)delete DB.medidas[CUR.clientId];
  if(DB.photos)delete DB.photos[CUR.clientId];
  sv('ax_c',DB.clients);sv('ax_m',DB.msgs);sv('ax_hist',DB.history||{});sv('ax_pr',DB.prs||{});sv('ax_bw',DB.bodyweight||{});sv('ax_nut',DB.nutrition||{});sv('ax_med',DB.medidas||{});sv('ax_photos',DB.photos||{});renderAll();gp('p-clients',document.getElementById('sbi-clients'),'Asesorados',true);toast(`🗑️ ${c.name} eliminado`);
}

// ══════════════════════ ROUTINES ══════════════════════

function renderDetailRoutines(c){
  const con=document.getElementById('d-routines');
  if(!(c.routines||[]).length){con.innerHTML='<div class="empty" style="padding:18px 0"><div class="eico" style="color:var(--g2)">'+_coIco('clipboard',34,'📋')+'</div><div class="etxt">Sin rutinas todavía</div><div class="esub">Crea la primera para este asesorado</div></div>';return}
  con.innerHTML='';
  c.routines.forEach((r,ri)=>{
    const exN=(r.exercises||[]).length;
    const totS=(r.exercises||[]).reduce((s,e)=>s+(parseInt(e.sets)||0),0);
    const div=document.createElement('div');div.className='rc';

    // Build warmup preview for coach
    const wu = exN ? buildWarmup(r.exercises) : null;
    const wuPreview = wu ? `
      <div style="margin-top:10px;background:var(--bg);border:1px solid var(--br);border-radius:var(--rsm);overflow:hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--br);cursor:pointer" onclick="this.nextElementSibling.classList.toggle('open');this.querySelector('.wupchev').style.transform=this.nextElementSibling.classList.contains('open')?'rotate(180deg)':'rotate(0deg)'">
          <div style="font-size:12px;font-weight:700;color:var(--t2)">${wu.sessionEmoji} Calentamiento — ${esc(wu.sessionLabel)}</div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:11px;color:var(--t3)">${wu.articulares.length + wu.activaciones.length} ejercicios</span>
            <span class="wupchev" style="font-size:10px;color:var(--t3);transition:transform .2s">▼</span>
          </div>
        </div>
        <div style="display:none;padding:10px 12px">
          <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--t3);margin-bottom:6px">🦴 Movilidad articular</div>
          ${wu.articulares.map(e=>`<div style="font-size:12px;color:var(--t2);padding:4px 0;border-bottom:1px solid var(--br)">${e.icon} ${esc(e.name)} <span style="color:var(--t3)">· ${esc(e.reps)}</span></div>`).join('')}
          <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--t3);margin:8px 0 6px">⚡ Activación</div>
          ${wu.activaciones.map(e=>`<div style="font-size:12px;color:var(--t2);padding:4px 0;border-bottom:1px solid var(--br)">${e.icon} ${esc(e.name)} <span style="color:var(--t3)">· ${esc(e.reps)}</span></div>`).join('')}
        </div>
      </div>` : '';

    div.innerHTML=`<div class="rch" onclick="this.closest('.rc').classList.toggle('open')"><div class="rcnum">${ri+1}</div><div class="rci"><div class="rcname">${esc(r.name)}</div><div class="rcmeta">${esc(r.day)} · ${exN} ejercicio${exN!==1?'s':''} · ${totS} series · ⏱${r.restSec||60}s</div></div><div style="display:flex;gap:4px;margin-right:4px"><button class="btn bg bsm" style="padding:3px 8px;font-size:11px" title="Guardar como plantilla" onclick="event.stopPropagation();saveRoutineAsTemplate('${c.id}',${ri})">📂</button><button class="btn bg bsm" style="padding:3px 8px;font-size:11px" onclick="event.stopPropagation();openEditRoutine('${c.id}',${ri})">${_coIco('pencil',13,'✏️')}</button><button class="btn bd bsm" style="padding:3px 8px" onclick="event.stopPropagation();delRoutine('${c.id}',${ri})">${_coIco('trash',14,'🗑️')}</button></div><div class="rcchev">▼</div></div><div class="rcbody">${r.note?`<div style="background:rgba(242,201,76,.10);border:1px solid rgba(242,201,76,.30);border-radius:var(--rsm);padding:8px 12px;font-size:12px;color:var(--t1);margin-bottom:9px">💡 ${esc(r.note)}</div>`:''}${!(r.exercises||[]).length?'<div style="color:var(--t3);font-size:13px">Sin ejercicios</div>':(r.exercises||[]).map((e,_ei,_arr)=>`<div class="exrow"><div class="exicon" style="background:${MC[e.muscle]||'#ccc'}18;border:1px solid ${MC[e.muscle]||'#ccc'}30">${exIcon(e)}</div><div><div class="exname">${esc(e.name)}</div><div class="exmet">${esc(e.muscle)} · ${esc(e.type)} · ⏱${restForExercise(e,r)}s${bisetInfo(_arr,_ei).biset?' · <span class="biset-tag">🔗 biserie</span>':''}</div></div><div class="exsets">${exSetsCellHTML(e)}</div></div>`).join('')}${wuPreview}</div>`;
    con.appendChild(div);
  });
}

function openNewRoutine(){
  const c=DB.clients.find(x=>x.id===CUR.clientId);if(!c)return;
  CUR.editRoutineIdx=null;
  document.getElementById('mr-title').innerHTML=`Nueva rutina — <span style="color:var(--g)">${esc(c.name)}</span>`;
  document.getElementById('save-rut-btn').textContent='Guardar rutina';
  document.getElementById('rf-name').value='';document.getElementById('rf-note').value='';document.getElementById('rf-day').value='Lunes';document.getElementById('rf-shift').value='';const whyElNew=document.getElementById('r-why');if(whyElNew)whyElNew.value='';
  CUR.routineExs=[];CUR.restSec=60;CUR.routineWarmup=null;
  document.querySelectorAll('#rf-rp .rp').forEach(b=>b.classList.remove('on'));document.querySelectorAll('#rf-rp .rp')[1].classList.add('on');
  // Show template loader only if templates exist
  const tplRow=document.getElementById('tpl-load-row');
  if(tplRow)tplRow.style.display=DB.templates.length?'block':'none';
  renderRfExList();om('m-routine');
}

// ══════════════════════ AUTO-GENERADOR DE RUTINAS (Paso 1) ══════════════════════
// El motor vive en avi-core.js (generarRutinas, testeado). Aquí solo el preview + confirmación.
// Principio: genera un BORRADOR; el coach revisa, confirma y ajusta. Nunca se auto-asigna a ciegas.
function _genSeed(s){let h=0;s=s||'';for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h;}
// Estilo por defecto según el entorno del asesorado.
const PLACE_DEFAULT_STYLE={gym:'gym_hipertrofia',casa:'casa_equipo',corporal:'casa_corporal',parque:'parque_calistenia'};
// ── Fase C: preferencias del generador por asesorado (excluir 🚫 / priorizar ⭐) ──
// Viven en el propio objeto del cliente (c.genPrefs) → viajan y se sincronizan con él,
// igual que sus rutinas. El deload 🔄 es por-sesión de generación (no se persiste).
function genPrefs(c){ if(!c.genPrefs)c.genPrefs={exclude:[],prefer:[]}; c.genPrefs.exclude=c.genPrefs.exclude||[]; c.genPrefs.prefer=c.genPrefs.prefer||[]; return c.genPrefs; }
function _updateGenPrefBtns(c){ const p=genPrefs(c); const eb=document.getElementById('mg-excl-btn'),pb=document.getElementById('mg-pref-btn'); if(eb)eb.textContent=`🚫 Excluidos (${p.exclude.length})`; if(pb)pb.textContent=`⭐ Priorizados (${p.prefer.length})`; }
function toggleGenDeload(v){ CUR.genDeload=!!v; if(CUR.genStyleId)genWithStyle(CUR.genStyleId); }
function openGenPrefsPicker(kind){
  pickerTarget=kind; CUR.pkFilter='all'; CUR.pkEnv='all';
  const es=document.getElementById('pk-env'); if(es)es.value='all';
  buildFilterBtns('pk-f',pkFilter); renderPickerForTarget(); om('m-picker');
}
function openGenRutinas(){
  const c=DB.clients.find(x=>x.id===CUR.clientId);if(!c)return;
  // Poblar el selector de estilos; default = el que corresponde al entorno del cliente.
  const def=PLACE_DEFAULT_STYLE[c.place]||'gym_hipertrofia';
  document.getElementById('mg-style').innerHTML=TRAINING_STYLES.map(s=>`<option value="${s.id}"${s.id===def?' selected':''}>${s.icon} ${esc(s.name)}</option>`).join('');
  document.getElementById('mg-title').innerHTML=`✨ Borrador de la semana — <span style="color:var(--g)">${esc(c.name)}</span>`;
  CUR.genDeload=false; const dl=document.getElementById('mg-deload'); if(dl)dl.checked=false;
  _updateGenPrefBtns(c);
  if(!genWithStyle(def))return;
  om('m-gen');
}
// Genera (o regenera) el borrador con el estilo elegido. El estilo fija entorno + methodBias.
function genWithStyle(styleId){
  const c=DB.clients.find(x=>x.id===CUR.clientId);if(!c)return false;
  const style=TRAINING_STYLES.find(s=>s.id===styleId)||TRAINING_STYLES[0];
  const inAdapt=isInAdaptation(c,DB.history,new Date());
  const _med=(DB.medidas&&DB.medidas[c.id])||[];
  const _waist=_med.length?_med[0].cintura:null;
  const loadProfile=bodyLoadProfile(c,_waist);
  const _p=genPrefs(c);
  const res=generarRutinas(c,DB.exercises,{idFn:uid,seed:_genSeed(c.id),place:style.env,methodBias:style.methodBias,adaptation:inAdapt,loadProfile,excludeIds:_p.exclude,preferIds:_p.prefer,deload:!!CUR.genDeload});
  if(!res.routines.length){toast('⚠️ No se pudo generar el borrador');return false;}
  CUR.genDraft=res;CUR.genStyleId=style.id;
  _updateGenPrefBtns(c);
  renderGenPreview(c,res);
  return true;
}
const PLACE_LABELS={gym:'🏋️ Gym completo',casa:'🏠 Casa (bandas/mancuernas)',corporal:'🤸 Solo peso corporal',parque:'🌳 Aire libre / parque'};
function renderGenPreview(c,res){
  const warn=res.needsReview?`<div style="background:#fde8e8;border:1px solid var(--rd);border-radius:var(--rsm);padding:10px 12px;font-size:12px;color:#a02020;margin-bottom:12px"><b>⚠️ Limitación detectada</b> (${esc(res.limitations.zones.join(', '))}). Se excluyeron ejercicios contraindicados, pero <b>revisa cada día antes de aprobar</b>. Un algoritmo no conoce el detalle clínico — tú sí.</div>`:'';
  const gaps=(res.envGaps&&res.envGaps.length)?`<div style="background:var(--yll);border:1px solid var(--yl);border-radius:var(--rsm);padding:10px 12px;font-size:12px;color:#7a5c00;margin-bottom:12px"><b>ℹ️ Sin opciones en este entorno para:</b> ${esc(res.envGaps.join(', '))}. Esos grupos quedaron sin cubrir (en peso corporal, tirar y curl exigen resistencia). Sugerencia: una <b>banda elástica</b> los desbloquea, o cambia el entorno del asesorado.</div>`:'';
  const adaptBanner=res.adaptation?`<div style="background:#e9f8f0;border:1px solid var(--g);border-radius:var(--rsm);padding:10px 12px;font-size:12px;color:#1c6b4a;margin-bottom:12px"><b>🌱 Fase de adaptación</b> — este asesorado lleva pocas semanas, así que el borrador usa <b>15-20 reps con poco o nada de peso</b> y foco en técnica (sin importar el objetivo). Las cargas suben solas cuando pase la fase (~3 semanas). Profesional desde el día 1.</div>`:'';
  const loadBanner=res.loadProfile==='high'?`<div style="background:var(--bll);border:1px solid var(--bl);border-radius:var(--rsm);padding:10px 12px;font-size:12px;color:#1a4a7a;margin-bottom:12px"><b>⚖️ Perfil de carga alto</b> (IMC/cintura) — el borrador prioriza <b>máquinas y movimientos guiados/asistidos</b> y evita saltos/pliométricos, para cuidar articulaciones mientras gana base. Ajústalo según veas a la persona.</div>`:'';
  const deloadBanner=res.deload?`<div style="background:rgba(232,151,58,.12);border:1px solid #E8973A;border-radius:var(--rsm);padding:10px 12px;font-size:12px;color:#8a5a14;margin-bottom:12px"><b>🔄 Semana de descarga</b> — volumen reducido (−1 serie por ejercicio). Recuérdale <b>bajar la carga ~10-20%</b>: la meta de esta semana es recuperar, no exigir.</div>`:'';
  const intro=`<div style="font-size:12px;color:var(--t2);margin-bottom:12px">Borrador para <b>${esc(c.goal||'—')}</b> · ${esc(c.level||'—')} · ${res.routines.length} días/semana · ${PLACE_LABELS[res.place]||'🏋️ Gym'}. Es un punto de partida: confírmalo y luego ajusta cada rutina en el editor (✏️).</div>`;
  const cards=res.routines.map(r=>{
    const totS=r.exercises.reduce((s,e)=>s+(parseInt(e.sets)||0),0);
    const exs=r.exercises.map((e,_ei,_arr)=>`<div class="exrow"><div class="exicon" style="background:${MC[e.muscle]||'#ccc'}18;border:1px solid ${MC[e.muscle]||'#ccc'}30">${exIcon(e)}</div><div><div class="exname">${esc(e.name)}</div><div class="exmet">${esc(e.muscle)} · ${esc(e.type)} · ⏱${restForExercise(e,r)}s${bisetInfo(_arr,_ei).biset?' · <span class="biset-tag">🔗 biserie</span>':''}</div></div><div class="exsets">${exSetsCellHTML(e)}</div></div>`).join('');
    return `<div class="rc open" style="margin-bottom:8px"><div class="rch"><div class="rcnum">${r.day.slice(0,2)}</div><div class="rci"><div class="rcname">${esc(r.name)}</div><div class="rcmeta">${esc(r.day)} · ${r.exercises.length} ejercicios · ${totS} series · ⏱${r.restSec}s</div></div></div><div class="rcbody" style="display:block">${exs}</div></div>`;
  }).join('');
  document.getElementById('mg-body').innerHTML=warn+gaps+adaptBanner+loadBanner+deloadBanner+intro+cards;
}
function confirmGenRutinas(){
  const c=DB.clients.find(x=>x.id===CUR.clientId);if(!c||!CUR.genDraft)return;
  const n=CUR.genDraft.routines.length;
  // REEMPLAZA la semana, no la acumula: antes hacía push y regenerar daba 3+3=6 días
  // (bug reportado por Camilo 2026-06-23). Consistente con _autoGenerateWeek/clientSelfGenerate,
  // que ya reemplazaban. Los logs de las viejas (por id) los barre _sweepOrphanSessionKeys.
  c.routines=sortRoutinesByDay(CUR.genDraft.routines.map(r=>({...r,exercises:r.exercises.map((e,_ei,_arr)=>({...e}))})));
  sv('ax_c',DB.clients);
  cm('m-gen');renderDetailRoutines(c);renderHome();
  toast(`✨ ${n} rutina${n!==1?'s':''} generada${n!==1?'s':''} para ${c.name} — revísalas y ajusta`);
  CUR.genDraft=null;
}

function openEditRoutine(cid,ri){
  const c=DB.clients.find(x=>x.id===cid);if(!c)return;
  const r=c.routines[ri];if(!r)return;
  CUR.clientId=cid;CUR.editRoutineIdx=ri;
  document.getElementById('mr-title').innerHTML=`Editar rutina — <span style="color:var(--g)">${esc(c.name)}</span>`;
  document.getElementById('save-rut-btn').textContent='Guardar cambios';
  document.getElementById('rf-name').value=r.name;
  document.getElementById('rf-note').value=r.note||'';
  const whyEl=document.getElementById('r-why');if(whyEl)whyEl.value=r.why||'';
  document.getElementById('rf-day').value=r.day||'Lunes';
  document.getElementById('rf-shift').value=r.shift||'';
  CUR.routineExs=(r.exercises||[]).map((e,_ei,_arr)=>({...e}));
  CUR.routineWarmup=(r.warmup&&r.warmup.length)?r.warmup.slice():null;
  CUR.restSec=r.restSec||60;
  // Activate correct rest preset button
  const restMap={45:0,60:1,90:2,120:3,180:4};
  document.querySelectorAll('#rf-rp .rp').forEach(b=>b.classList.remove('on'));
  const idx=restMap[CUR.restSec];
  if(idx!==undefined)document.querySelectorAll('#rf-rp .rp')[idx].classList.add('on');
  renderRfExList();om('m-routine');
  // Hide template loader when editing
  const tplRow=document.getElementById('tpl-load-row');
  if(tplRow)tplRow.style.display='none';
}

function selR(sec,el){CUR.restSec=sec;document.querySelectorAll('#rf-rp .rp').forEach(b=>b.classList.remove('on'));el.classList.add('on')}

function moveEx(i,dir){
  const j=i+dir;
  if(j<0||j>=CUR.routineExs.length)return;
  const tmp=CUR.routineExs[i];CUR.routineExs[i]=CUR.routineExs[j];CUR.routineExs[j]=tmp;
  normalizeBisets(CUR.routineExs);
  renderRfExList();
}
function rfDelEx(i){ CUR.routineExs.splice(i,1); normalizeBisets(CUR.routineExs); renderRfExList(); }
// Biseries: unir el ejercicio i con el siguiente (sin descanso entre ambos) / deshacer.
function linkBiset(i){ if(CUR.routineExs[i]){CUR.routineExs[i].ssNext=true;normalizeBisets(CUR.routineExs);renderRfExList();} }
function unlinkBiset(i){ if(CUR.routineExs[i]){delete CUR.routineExs[i].ssNext;renderRfExList();} }

// Una fila de ejercicio del constructor. abMark: 'A'|'B' si va dentro de una biserie.
function rfExRow(i,n,abMark){
  const e=CUR.routineExs[i];
  const inpSt=`width:50px;padding:6px 4px;border:1.5px solid var(--g);border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;text-align:center;background:white;outline:none;color:var(--g)`;
  const upDis=i===0; const dnDis=i===n-1;
  const ab=(dir,dis)=>`<button onclick="moveEx(${i},${dir})" ${dis?'disabled':''} style="width:30px;height:30px;border-radius:6px;border:1.5px solid var(--br2);background:var(--bg);color:${dis?'var(--t3)':'var(--t1)'};cursor:${dis?'default':'pointer'};font-size:14px;display:flex;align-items:center;justify-content:center;opacity:${dis?.3:1}">${dir===-1?'↑':'↓'}</button>`;
  // Botón de unir en biserie: solo si i no está ya en pareja, hay un siguiente, y el siguiente tampoco está en pareja.
  const canLink = !abMark && i<n-1 && !bisetInfo(CUR.routineExs,i).biset && !bisetInfo(CUR.routineExs,i+1).biset;
  const linkBtn = canLink
    ? `<button title="Unir en biserie con el ejercicio de abajo (sin descanso entre ambos)" onclick="linkBiset(${i})" style="width:30px;height:30px;border-radius:6px;border:1.5px solid #A855F7;background:#A855F710;color:#A855F7;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center">${_coIco('link',15,'🔗')}</button>`
    : '';
  const abChip = abMark ? `<span style="font-size:10px;font-weight:900;color:#A855F7;background:#A855F718;border-radius:5px;padding:1px 6px;margin-right:2px;flex-shrink:0">${abMark}</span>` : '';
  const border = abMark ? 'border:none;border-radius:0' : `border:1px solid var(--br);border-left:3px solid ${MC[e.muscle]||'var(--g)'};border-radius:var(--rsm)`;
  // Controles según MODALIDAD (track): cardio→minutos, isométrico→series×segundos,
  // resto→series×reps. Antes pintaba siempre "Series × Reps" y para cardio confundía
  // (e.reps ES minutos, no reps; el "seg" era el descanso). Camilo 2026-06-29.
  const track = (typeof exTrack==='function') ? exTrack(e) : 'peso_reps';
  const lbl = t => `<span style="font-size:11px;color:var(--t3);font-weight:600;margin-right:2px">${t}</span>`;
  const restCtl = `<span title="Descanso entre series — por defecto según el tipo de ejercicio; edítalo para fijarlo" style="font-size:11px;color:var(--t3);font-weight:600;margin-left:6px;margin-right:2px">⏱</span>`
    + `<input type="number" inputmode="numeric" style="${inpSt};width:58px;color:var(--t2);border-color:var(--br2)" value="${restForExercise(e,{restSec:CUR.restSec})}" min="0" max="600" step="5" onchange="CUR.routineExs[${i}].restSec=Math.max(0,parseInt(this.value)||0);renderRfExList()" onfocus="this.select()"><span style="color:var(--t3);font-size:11px;font-weight:600">seg</span>`;
  const delCtl = `<button onclick="rfDelEx(${i})" style="margin-left:auto;width:28px;height:28px;border-radius:50%;border:none;background:var(--rdl);color:var(--rd);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>`;
  const setsIn = `<input type="number" inputmode="numeric" style="${inpSt}" value="${e.sets}" min="1" max="20" onchange="CUR.routineExs[${i}].sets=Math.max(1,parseInt(this.value)||1);this.value=CUR.routineExs[${i}].sets" onfocus="this.select()">`;
  let ctl;
  if(track==='cardio'){
    // Cardio: SOLO duración en minutos (e.reps = minutos). Sin series ni descanso.
    ctl = lbl('Duración')
      + `<input type="number" inputmode="numeric" style="${inpSt};width:58px" value="${e.reps}" min="1" max="240" onchange="CUR.routineExs[${i}].reps=Math.max(1,parseInt(this.value)||1);CUR.routineExs[${i}].sets=1;this.value=CUR.routineExs[${i}].reps" onfocus="this.select()">`
      + `<span style="color:var(--t3);font-size:11px;font-weight:600">min de cardio</span>` + delCtl;
  } else if(track==='tiempo'){
    // Isométrico: series × SEGUNDOS de aguante (e.reps = segundos).
    ctl = lbl('Series') + setsIn + `<span style="color:var(--t3);font-size:14px;font-weight:700">×</span>` + lbl('Seg')
      + `<input type="number" inputmode="numeric" style="${inpSt}" value="${e.reps}" min="1" max="999" onchange="CUR.routineExs[${i}].reps=Math.max(1,parseInt(this.value)||1);this.value=CUR.routineExs[${i}].reps" onfocus="this.select()">`
      + restCtl + delCtl;
  } else {
    // peso/reps/hiit: series × reps + descanso (comportamiento de siempre).
    ctl = lbl('Series') + setsIn + `<span style="color:var(--t3);font-size:14px;font-weight:700">×</span>` + lbl('Reps')
      + `<input type="number" inputmode="numeric" style="${inpSt}" value="${e.reps}" min="1" max="999" onchange="CUR.routineExs[${i}].reps=Math.max(1,parseInt(this.value)||1);this.value=CUR.routineExs[${i}].reps" onfocus="this.select()">`
      + restCtl + delCtl;
  }
  return `<div style="background:var(--w);${border};margin-bottom:${abMark?'0':'6px'};overflow:hidden">
      <div style="display:flex;align-items:center;gap:8px;padding:9px 10px">
        ${abChip}${muscleIcon(e.muscle,20)}
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.name}</div>
          <div style="font-size:11px;color:var(--t2);margin-top:1px">${e.muscle} · ${e.type}</div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">${linkBtn}${ab(-1,upDis)}${ab(1,dnDis)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;padding:0 10px 9px;padding-left:44px;flex-wrap:wrap">${ctl}</div>
    </div>`;
}

function renderRfExList(){
  const con=document.getElementById('rf-exlist');
  if(!CUR.routineExs.length){
    con.innerHTML='<div style="color:var(--t3);font-size:13px;padding:14px 0;text-align:center;border:1.5px dashed var(--br2);border-radius:var(--rsm)">Toca "+ Añadir ejercicios" para comenzar</div>';
    renderRfWarmup();
    return;
  }
  normalizeBisets(CUR.routineExs);
  const n=CUR.routineExs.length;
  let html='';
  bisetBlocks(CUR.routineExs).forEach(block=>{
    if(block.length===1){ html+=rfExRow(block[0],n,null); }
    else {
      html+=`<div style="border:1.5px solid #A855F7;border-radius:var(--rsm);margin-bottom:6px;overflow:hidden;background:#A855F708">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:#A855F712">
          <span style="font-size:11px;font-weight:800;color:#A855F7;letter-spacing:.3px">${_coIco('link',11,'🔗')} BISERIE · alterna sin descanso entre ambos</span>
          <button onclick="unlinkBiset(${block[0]})" style="font-size:11px;font-weight:700;color:#A855F7;background:none;border:none;cursor:pointer;text-decoration:underline">Deshacer</button>
        </div>
        ${rfExRow(block[0],n,'A')}
        <div style="height:1px;background:#A855F725;margin:0 10px"></div>
        ${rfExRow(block[1],n,'B')}
      </div>`;
    }
  });
  con.innerHTML=html;
  renderRfWarmup();
}

// ── Calentamiento editable por rutina (coach) ──
// CUR.routineWarmup: null = no personalizado (se muestra el auto-sugerido y, al editar, se
// "materializa"); array = lista propia de ids de WARMUP_LIBRARY. Vacío/[] = el cliente
// auto-sugiere. Resuelto por id con findWarmupEx (app-6-extra.js). Pedido de Camilo 2026-06-23.
function _effWarmIds(){
  if(CUR.routineWarmup) return CUR.routineWarmup.slice();
  const w=buildWarmup(CUR.routineExs||[]); // auto-sugerido según músculos
  return [...w.articulares,...w.activaciones].map(e=>e.id);
}
function renderRfWarmup(){
  const con=document.getElementById('rf-warmup'); if(!con) return;
  const isCustom=!!CUR.routineWarmup;
  const items=_effWarmIds().map(id=>findWarmupEx(id)).filter(Boolean);
  const rows=items.map(ex=>`<div style="display:flex;align-items:center;gap:9px;padding:7px 10px;background:var(--bg);border:1px solid var(--br);border-radius:9px;margin-bottom:6px">
      <span style="font-size:16px;flex-shrink:0">${ex.icon}</span>
      <div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:700">${esc(ex.name)}</div><div style="font-size:10.5px;color:var(--t3)">${esc(ex.reps)}</div></div>
      <button onclick="rfWarmDel('${ex.id}')" title="Quitar" style="background:none;border:none;color:var(--t3);font-size:16px;cursor:pointer;padding:2px 6px;flex-shrink:0">✕</button>
    </div>`).join('');
  con.innerHTML=`${isCustom?'':'<div style="font-size:10.5px;color:var(--t3);margin-bottom:6px">Auto-sugerido según los músculos. Quitá o agregá para personalizarlo.</div>'}`
    +(rows||'<div style="font-size:11.5px;color:var(--t3);margin-bottom:6px">Sin movimientos — la app auto-sugiere el calentamiento.</div>')
    +`<button class="btn bg bsm" onclick="openWarmPicker()" style="margin-top:2px">+ Agregar movimiento</button>`;
}
function rfWarmDel(id){ CUR.routineWarmup=_effWarmIds().filter(x=>x!==id); renderRfWarmup(); }
function rfWarmAdd(id){ const cur=_effWarmIds(); if(!cur.includes(id))cur.push(id); CUR.routineWarmup=cur; renderRfWarmup(); cm('m-warmpick'); }
function openWarmPicker(){
  const body=document.getElementById('wp-body'); if(!body) return;
  const have=new Set(_effWarmIds());
  const labels={hombros:'Hombro',cadera:'Cadera',rodillas:'Rodilla',tobillos:'Tobillo',munecas:'Muñeca',espalda:'Espalda / columna',activacion_superior:'Activación — tren superior',activacion_inferior:'Activación — tren inferior',activacion_core:'Activación — core'};
  let html='';
  for(const area in WARMUP_LIBRARY){
    const pool=WARMUP_LIBRARY[area]||[]; if(!pool.length) continue;
    html+=`<div style="font-size:10.5px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:var(--t3);margin:10px 0 5px">${esc(labels[area]||area)}</div>`;
    html+=pool.map(ex=>{const used=have.has(ex.id);return `<div onclick="${used?'':`rfWarmAdd('${ex.id}')`}" style="display:flex;align-items:center;gap:9px;padding:8px 10px;border:1px solid var(--br);border-radius:9px;margin-bottom:5px;cursor:${used?'default':'pointer'};opacity:${used?'.45':'1'}">
        <span style="font-size:16px;flex-shrink:0">${ex.icon}</span>
        <div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:700">${esc(ex.name)}</div><div style="font-size:10.5px;color:var(--t3)">${esc(ex.reps)}</div></div>
        <span style="font-size:13px;font-weight:800;color:${used?'var(--g)':'var(--g2)'};flex-shrink:0">${used?'✓':'+'}</span>
      </div>`;}).join('');
  }
  body.innerHTML=html;
  om('m-warmpick');
}

function autoRoutineNote(exs){
  if(!exs.length)return '';
  const counts={};
  exs.forEach(e=>{counts[e.muscle]=(counts[e.muscle]||0)+1;});
  const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([m])=>m);
  const labels={pecho:'Pecho',espalda:'Espalda',hombros:'Hombros',biceps:'Bíceps',triceps:'Tríceps',piernas:'Piernas',gluteo:'Glúteo',core:'Core',cardio:'Cardio',otro:'Cuerpo completo'};
  const ctx={pecho:'Empuje y desarrollo completo del pectoral.',espalda:'Tracción para fortalecer la espalda y el dorsal.',hombros:'Desarrollo del deltoides en sus tres cabezas.',biceps:'Aislamiento y volumen del bíceps.',triceps:'Fortalecimiento de la cabeza posterior del tríceps.',piernas:'Tren inferior: cuádriceps, femoral y pantorrilla.',gluteo:'Activación y desarrollo del glúteo.',core:'Estabilidad del núcleo y zona lumbar.',cardio:'Resistencia cardiovascular y quema calórica.',otro:'Trabajo funcional y cuerpo completo.'};
  const focus=top.slice(0,2).map(m=>labels[m]||m).join(' y ');
  return `Sesión de ${focus}. ${ctx[top[0]]||''}`;
}

function saveRoutine(){
  const name=document.getElementById('rf-name').value.trim();
  if(!name){toast('⚠️ Escribe un nombre para la rutina');return}
  if(!CUR.routineExs.length){toast('⚠️ Añade al menos un ejercicio');return}
  const c=DB.clients.find(x=>x.id===CUR.clientId);if(!c)return;
  if(!c.routines)c.routines=[];
  const noteVal=document.getElementById('rf-note').value.trim()||autoRoutineNote(CUR.routineExs);
  // warmup: lista propia si el coach personalizó; [] = auto-sugerir en la app (y sobrescribe
  // cualquier personalización vieja al editar, ya que el merge es {...existing,...rutData}).
  const rutData={name,day:document.getElementById('rf-day').value,shift:document.getElementById('rf-shift').value||null,note:noteVal,why:(document.getElementById('r-why')?.value||'').trim(),restSec:CUR.restSec,exercises:CUR.routineExs.map(e=>({...e})),warmup:(CUR.routineWarmup&&CUR.routineWarmup.length)?CUR.routineWarmup.slice():[]};
  if(CUR.editRoutineIdx!==null){
    const existing=c.routines[CUR.editRoutineIdx];
    c.routines[CUR.editRoutineIdx]={...existing,...rutData};
    toast(`✅ Rutina "${name}" actualizada`);
  } else {
    c.routines.push({id:uid(),...rutData,createdAt:new Date().toISOString()});
    toast(`✅ Rutina "${name}" guardada para ${c.name}`);
  }
  c.routines=sortRoutinesByDay(c.routines);
  sv('ax_c',DB.clients);cm('m-routine');renderDetailRoutines(c);renderHome();
  if(CUR.loggedAs==='client'){renderClientAllRoutines(c);renderClientToday(c);} // coach-en-su-entreno o cliente libre: refrescar SU vista
}

function delRoutine(cid,ri){
  const c=DB.clients.find(x=>x.id===cid);if(!c||!confirm('¿Eliminar esta rutina?'))return;
  const r=c.routines[ri];
  if(r){// Limpiar claves de log huérfanas en localStorage
    const rid=r.id;
    (r.exercises||[]).forEach((ex,ei)=>{
      const sets=parseInt(ex.sets)||3;
      for(let si=0;si<sets;si++){
        localStorage.removeItem(logKey(rid,ei,si,'kg'));
        localStorage.removeItem(logKey(rid,ei,si,'reps'));
        localStorage.removeItem(getDoneKey(rid,ei,si));
      }
    });
    localStorage.removeItem(`session_date_${rid}`);
    localStorage.removeItem(`session_id_${rid}`);
  }
  c.routines.splice(ri,1);sv('ax_c',DB.clients);renderDetailRoutines(c);renderHome();toast('🗑️ Rutina eliminada');
  if(CUR.loggedAs==='client'){renderClientAllRoutines(c);renderClientToday(c);} // coach-en-su-entreno o cliente libre: refrescar SU vista
}

// PICKER
function openPicker(){
  pickerTarget='routine';
  CUR.pkFilter='all';
  // Por defecto, filtra por el entorno del asesorado actual → el coach ve lo relevante.
  const c=DB.clients.find(x=>x.id===CUR.clientId);
  CUR.pkEnv=(c&&c.place)||'all';
  const envSel=document.getElementById('pk-env');if(envSel)envSel.value=CUR.pkEnv;
  buildFilterBtns('pk-f',pkFilter);
  renderPickerForTarget();om('m-picker');
}
function pkFilter(muscle,el){CUR.pkFilter=muscle;styleFilterBtns('pk-f',el);renderPickerForTarget()}
function pkEnvFilter(v){CUR.pkEnv=v;renderPickerForTarget();}
// Chip compacto del entorno MÍNIMO necesario (el más accesible) de un ejercicio.
function envChips(env){
  env=env||['gym'];
  const e=env.includes('corporal')?'🤸':env.includes('casa')?'🏠':env.includes('parque')?'🌳':'🏋️';
  const lbl=env.includes('corporal')?'Peso corporal':env.includes('casa')?'Casa':env.includes('parque')?'Parque':'Gym';
  return `<span title="${lbl}" style="font-size:11px;opacity:.85">${e}</span>`;
}

// ══════════════════════ MESSAGES (COACH) ══════════════════════
function renderDetailMsgs(id){
  localStorage.setItem(`coach_read_${id}`,new Date().toISOString());
  const msgs=DB.msgs[id]||[];const con=document.getElementById('d-msgs');con.innerHTML='';
  if(!msgs.length){con.innerHTML='<div style="text-align:center;padding:18px;color:var(--t3);font-size:13px">Sin mensajes. Escribe el primero 👇</div>';return}
  msgs.forEach(m=>{
    const isC=m.from==='coach';
    const b=document.createElement('div');b.className=`mb ${isC?'cs':'cl'}`;b.textContent=m.text||'';con.appendChild(b);
    const t=document.createElement('div');t.className=`mt${isC?' r':''}`;t.textContent=`${isC?'Coach':'Asesorado'} · ${fmtD(m.date)} ${fmtT(m.date)}`;con.appendChild(t);
  });
  con.scrollTop=con.scrollHeight;
}
function sendCoachMsg(){
  const ta=document.getElementById('msg-in');const text=ta.value.trim();if(!text||!CUR.clientId)return;
  if(!DB.msgs[CUR.clientId])DB.msgs[CUR.clientId]=[];
  DB.msgs[CUR.clientId].push({from:'coach',text,date:new Date().toISOString()});
  sv('ax_m',DB.msgs);
  const _pc=DB.clients.find(x=>x.id===CUR.clientId);
  if(_pc){pushToClient(CUR.clientId,'💬 Mensaje de tu Coach',ta.value.trim().length>80?ta.value.trim().slice(0,77)+'...':ta.value.trim(),{type:'message',chatId:CUR.clientId,tag:'avi-chat-'+CUR.clientId});}
  ta.value='';ta.style.height='auto';renderDetailMsgs(CUR.clientId);renderMsgs();renderHome();toast('💬 Mensaje enviado');updateMsgBadge(CUR.clientId);
}
function renderMsgs(){
  const con=document.getElementById('msgs-list');
  const list=DB.clients.map(c=>{const ms=DB.msgs[c.id]||[];return ms.length?{c,last:ms[ms.length-1],count:ms.length}:null}).filter(Boolean).sort((a,b)=>new Date(b.last.date)-new Date(a.last.date));
  // Badge on sidebar msgs item: count clients with last msg from client (unread by coach)
  const unreadClients=DB.clients.filter(c=>{
    const ms=DB.msgs[c.id]||[];
    const lastClientMsg=ms.filter(m=>m.from==='client').slice(-1)[0];
    if(!lastClientMsg)return false;
    const lastRead=localStorage.getItem(`coach_read_${c.id}`);
    return !lastRead||new Date(lastClientMsg.date)>new Date(lastRead);
  }).length;
  const sbBdg=document.getElementById('sb-msgs-bdg');
  if(sbBdg){sbBdg.textContent=unreadClients;sbBdg.style.display=unreadClients>0?'inline-flex':'none';}
  if(!list.length){con.innerHTML='<div class="empty" style="padding:50px"><div class="eico" style="color:var(--g2)">'+_coIco('chat',34,'💬')+'</div><div class="etxt">Sin mensajes todavía</div><div class="esub">Ve a un asesorado y escríbele</div></div>';return}
  con.innerHTML='';
  list.forEach(({c,last,count})=>{
    const lastClientMsg=(DB.msgs[c.id]||[]).filter(m=>m.from==='client').slice(-1)[0];
    const lastRead=localStorage.getItem(`coach_read_${c.id}`);
    const hasUnread=lastClientMsg&&(!lastRead||new Date(lastClientMsg.date)>new Date(lastRead));
    const div=document.createElement('div');div.className='cli';
    div.innerHTML=`<div class="cav" style="width:38px;height:38px;font-size:14px;background:${avc(c.name)}">${esc(ini(c.name))}</div><div style="flex:1;min-width:0"><div class="cn">${esc(c.name)}${hasUnread?'<span style="display:inline-block;width:8px;height:8px;background:var(--rd);border-radius:50%;margin-left:6px;vertical-align:middle"></span>':''}</div><div class="cm">${last.from==='coach'?'📤 Tú':'📥 Asesorado'}: "${esc(last.text.slice(0,45))}${last.text.length>45?'...':''}"</div></div><div style="font-size:11px;color:var(--t3);text-align:right">${fmtD(last.date)}<br>${count} msg</div>`;
    div.onclick=()=>openDetail(c.id);con.appendChild(div);
  });
}
