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
  DB.clients.forEach(c=>{
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
      st={ring:'var(--or)',bg:'var(--orl)',col:'var(--or)',ico:'⏳',txt:`${_todayR.name} · hoy`};
    } else if(_tomorrowR){
      st={ring:'var(--bl)',bg:'var(--bll)',col:'var(--bl)',ico:'📅',txt:`${_tomorrowR.name} · mañana`};
    } else if(_ruts.length){
      st={ring:'var(--br2)',bg:'var(--bg)',col:'var(--t3)',ico:'💤',txt:'Descanso hoy'};
    } else {
      st={ring:'var(--rd)',bg:'var(--rdl)',col:'var(--rd)',ico:'🚩',txt:'Sin rutinas asignadas'};
    }
    const lvlCls=c.level==='Principiante'?'tg':c.level==='Intermedio'?'tb':'to';
    const spark=miniSparkline(c.id);
    const selfBadge=c.selfReg?(c.wantsCoach?'<span class="tag" style="background:var(--orl);color:var(--or)">🙋 Quiere coach</span>':'<span class="tag" style="background:var(--bll);color:var(--bl)">🆓 Libre</span>'):'';
    const d=document.createElement('div');d.className='cli';
    d.innerHTML=`<div class="cav ring" style="background:${avc(c.name)};--cring:${st.ring}">${esc(ini(c.name))}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:7px;min-width:0">
          <span class="cn">${esc(c.name)}</span>
          <span class="tag ${lvlCls}" style="flex-shrink:0">${c.level||'—'}</span>
          ${selfBadge}
        </div>
        <div style="margin-top:6px"><span class="cli-pill" style="background:${st.bg};color:${st.col}">${st.ico} ${esc(st.txt)}</span></div>
        <div class="cm" style="margin-top:6px">${esc(c.goal||'—')} · ${esc(String(c.days||3))} días/sem · ${(c.routines||[]).length} rutina${(c.routines||[]).length!==1?'s':''}</div>
        ${last?`<div style="font-size:11px;color:var(--t3);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">💬 "${esc(last.text.slice(0,45))}${last.text.length>45?'…':''}"</div>`:''}
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

async function saveClient(){
  const fn=document.getElementById('cf-name').value.trim();
  const ln=document.getElementById('cf-last').value.trim();
  const email=document.getElementById('cf-email').value.trim().toLowerCase();
  const pass=document.getElementById('cf-pass').value.trim();
  if(!fn){toast('⚠️ El nombre es obligatorio');return}
  if(!CUR.editClientId&&(!email||!pass)){toast('⚠️ Email y contraseña son obligatorios');return}
  if(pass&&pass.length<4){toast('⚠️ La contraseña debe tener al menos 4 caracteres');return}
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
  if(CUR.editClientId){
    const i=DB.clients.findIndex(c=>c.id===CUR.editClientId);
    if(i!==-1){
      const existing=DB.clients[i];
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
  sv('ax_c',DB.clients);cm('m-client');renderAll();if(CUR.editClientId)openDetail(CUR.editClientId);
}

// ── Auto-registro (modo libre) ──────────────────────────────────────────
// Genera y APLICA una semana al cliente `c` reusando el motor del coach (adaptación +
// perfil de carga). Para modo libre no hay coach que revise → se aplica directo.
function _autoGenerateWeek(c){
  const styleId=PLACE_DEFAULT_STYLE[c.place]||'gym_hipertrofia';
  const style=TRAINING_STYLES.find(s=>s.id===styleId)||TRAINING_STYLES[0];
  const inAdapt=isInAdaptation(c,DB.history,new Date());
  const _med=(DB.medidas&&DB.medidas[c.id])||[];
  const _waist=_med.length?_med[_med.length-1].cintura:null;
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
  DB.history   ={[id]: coll.history   ||[]};
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
let _authDirty=false;    // hubo cambios que la nube no confirmó (reintentar al reconectar)
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
  try{ await UD.upsertOwn(patch); _authDirty=false; log('AVI: cambios offline sincronizados con la nube'); }
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
  if(row){
    client=rowToClient(row);
    _applyAuthClientDB(client,{
      history:row.history, prs:row.prs, bodyweight:row.bodyweight,
      medidas:row.medidas, nutrition:row.nutrition, photos:row.photos, msgs:row.msgs,
    });
    if(online) _cacheAuthRow(_authUid,row); // refresca el respaldo con lo recién bajado
  } else {
    const prof=_profileFromMeta(authUser);
    if(!prof._complete){
      // Usuario NUEVO sin perfil = entró por "Iniciar sesión con Google" SIN haberse registrado
      // antes (los registros por email o por "Crear cuenta con Google" sí traen perfil/pending).
      // No creamos cuenta a la fuerza con datos por defecto: cerramos sesión y le pedimos crear
      // cuenta primero (así su rutina se arma con su objetivo/nivel/sexo/edad reales).
      try{ await AUTH.signOut(); }catch(e){}
      AUTH_MODE=false;
      try{localStorage.removeItem('ax_wz_pending');}catch(e){}
      showScreen('s-login');
      const er=document.getElementById('lerr');
      if(er){ er.textContent='No tienes una cuenta todavía. Toca “Crear cuenta” para registrarte primero.'; er.classList.add('on'); }
      toast('Aún no estás registrado. Crea primero tu cuenta. 👇');
      return;
    }
    client=await _provisionFreeClient(authUser,prof);
  }
  try{localStorage.removeItem('ax_wz_pending');}catch(e){} // ya consumido (o usuario existente)
  CUR.loggedAs='client'; CUR.clientId=client.id;
  showScreen('s-client');
  initClientView(client);
  startMsgPolling();
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
  await _loadCoachClientsIntoDB();
  CUR.loggedAs='coach'; CUR.clientId=null; COACH_SELF=false;
  showScreen('s-coach');
  initCoach();
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
  if(!AUTH.ready()){err.textContent='Sin conexión para crear la cuenta. Revisa tu internet.';err.classList.add('on');return;}
  err.classList.remove('on');
  if(btn){btn.disabled=true;}
  try{
    // 1. Crear cuenta en Supabase Auth (la contraseña la maneja Auth; el perfil va en metadata)
    const meta={name:data.name,goal:data.goal,level:data.level,days:data.days,sex:data.sex,age:data.age,weight:data.weight,height:data.height,place:data.place,selfReg:true};
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
  try{
    localStorage.setItem('ax_wz_pending', JSON.stringify({
      name, goal:g('su-goal')||null, place:g('su-place')||'gym', level:g('su-level')||'Principiante',
      days:parseInt(g('su-days'))||3, sex:g('su-sex')||null,
      age:parseInt(g('su-age'))||null, weight:parseFloat(g('su-weight'))||null, height:parseFloat(g('su-height'))||null,
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

async function openDetail(id){
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
  document.getElementById('d-tags').innerHTML=`<span class="tag ${c.level==='Principiante'?'tg':c.level==='Intermedio'?'tb':'to'}">${esc(c.level)}</span><span class="tag ty">🎯 ${esc(c.goal)}</span><span class="tag tg">📅 ${esc(String(c.days))} días/sem</span><span class="tag" style="${_planStyle}">${_planIco} ${PLAN_LABEL[_plan]}</span>${_wantsTag}`;
  const freeLead=document.getElementById('d-freelead');
  if(freeLead) freeLead.innerHTML=planControlHTML(c);
  const dn=document.getElementById('d-notes');dn.style.display=c.notes?'block':'none';if(c.notes)dn.innerHTML=`📝 <strong>Notas:</strong> ${esc(c.notes)}`;
  renderValoracion(c);
  renderDetailRoutines(c);renderDetailMsgs(id);renderCoachClientHistory(id);renderCoachExProgress(id);renderNutritionCoach(id);renderMedidasCoach(id);
  renderDetailMembership(id);
  gp('p-detail',null,'Detalle');document.querySelectorAll('.sbi').forEach(s=>s.classList.remove('on'));document.getElementById('sbi-clients').classList.add('on');
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
  const latestMed = (DB.medidas && DB.medidas[c.id] && DB.medidas[c.id].length)
    ? DB.medidas[c.id][DB.medidas[c.id].length - 1]
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
    html += statBox('📐','Cintura/Talla', rct.toFixed(2), rctInfo.label, rctInfo.color);
  } else if(h) {
    html += statBox('📐','Cintura/Talla','—','Registra tu cintura','var(--t3)');
  }
  if(icc && iccInfo){
    html += statBox('⚖️','Cintura/Cadera', icc.toFixed(2), iccInfo.label, iccInfo.color);
  }
  if(tmb)  html += statBox('🔥','TMB',tmb+' kcal','En reposo','var(--or)');
  if(tdee) html += statBox('⚡','TDEE',tdee+' kcal','Con actividad','var(--g)');
  html += `</div>`;

  if(kcalObj){
    html += `<div style="background:linear-gradient(135deg,rgba(45,106,79,.15),rgba(82,183,136,.08));border:1.5px solid rgba(82,183,136,.3);border-radius:12px;padding:13px 14px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:800;color:var(--g2);margin-bottom:8px">🎯 OBJETIVO: ${esc(goal).toUpperCase()}</div>
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
  sv('ax_c',DB.clients);sv('ax_m',DB.msgs);sv('ax_hist',DB.history||{});sv('ax_pr',DB.prs||{});sv('ax_bw',DB.bodyweight||{});sv('ax_nut',DB.nutrition||{});sv('ax_med',DB.medidas||{});sv('ax_photos',DB.photos||{});renderAll();gp('p-clients',document.getElementById('sbi-clients'),'Asesorados');toast(`🗑️ ${c.name} eliminado`);
}

// ══════════════════════ ROUTINES ══════════════════════

function renderDetailRoutines(c){
  const con=document.getElementById('d-routines');
  if(!(c.routines||[]).length){con.innerHTML='<div class="empty" style="padding:18px 0"><div class="eico">📋</div><div class="etxt">Sin rutinas todavía</div><div class="esub">Crea la primera para este asesorado</div></div>';return}
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

    div.innerHTML=`<div class="rch" onclick="this.closest('.rc').classList.toggle('open')"><div class="rcnum">${ri+1}</div><div class="rci"><div class="rcname">${esc(r.name)}</div><div class="rcmeta">${esc(r.day)} · ${exN} ejercicio${exN!==1?'s':''} · ${totS} series · ⏱${r.restSec||60}s</div></div><div style="display:flex;gap:4px;margin-right:4px"><button class="btn bg bsm" style="padding:3px 8px;font-size:11px" title="Guardar como plantilla" onclick="event.stopPropagation();saveRoutineAsTemplate('${c.id}',${ri})">📂</button><button class="btn bg bsm" style="padding:3px 8px;font-size:11px" onclick="event.stopPropagation();openEditRoutine('${c.id}',${ri})">✏️</button><button class="btn bd bsm" style="padding:3px 8px" onclick="event.stopPropagation();delRoutine('${c.id}',${ri})">🗑️</button></div><div class="rcchev">▼</div></div><div class="rcbody">${r.note?`<div style="background:rgba(242,201,76,.10);border:1px solid rgba(242,201,76,.30);border-radius:var(--rsm);padding:8px 12px;font-size:12px;color:var(--t1);margin-bottom:9px">💡 ${esc(r.note)}</div>`:''}${!(r.exercises||[]).length?'<div style="color:var(--t3);font-size:13px">Sin ejercicios</div>':(r.exercises||[]).map((e,_ei,_arr)=>`<div class="exrow"><div class="exicon" style="background:${MC[e.muscle]||'#ccc'}18;border:1px solid ${MC[e.muscle]||'#ccc'}30">${exIcon(e)}</div><div><div class="exname">${esc(e.name)}</div><div class="exmet">${esc(e.muscle)} · ${esc(e.type)} · ⏱${restForExercise(e,r)}s${bisetInfo(_arr,_ei).biset?' · <span style="color:#A855F7;font-weight:700">🔗 biserie</span>':''}</div></div><div class="exsets">${esc(String(e.sets))}×${esc(String(e.reps))}<small>series × reps</small></div></div>`).join('')}${wuPreview}</div>`;
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
  const _waist=_med.length?_med[_med.length-1].cintura:null;
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
    const exs=r.exercises.map((e,_ei,_arr)=>`<div class="exrow"><div class="exicon" style="background:${MC[e.muscle]||'#ccc'}18;border:1px solid ${MC[e.muscle]||'#ccc'}30">${exIcon(e)}</div><div><div class="exname">${esc(e.name)}</div><div class="exmet">${esc(e.muscle)} · ${esc(e.type)} · ⏱${restForExercise(e,r)}s${bisetInfo(_arr,_ei).biset?' · <span style="color:#A855F7;font-weight:700">🔗 biserie</span>':''}</div></div><div class="exsets">${esc(String(e.sets))}×${esc(String(e.reps))}<small>series × reps</small></div></div>`).join('');
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
    ? `<button title="Unir en biserie con el ejercicio de abajo (sin descanso entre ambos)" onclick="linkBiset(${i})" style="width:30px;height:30px;border-radius:6px;border:1.5px solid #A855F7;background:#A855F710;color:#A855F7;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center">🔗</button>`
    : '';
  const abChip = abMark ? `<span style="font-size:10px;font-weight:900;color:#A855F7;background:#A855F718;border-radius:5px;padding:1px 6px;margin-right:2px;flex-shrink:0">${abMark}</span>` : '';
  const border = abMark ? 'border:none;border-radius:0' : `border:1px solid var(--br);border-left:3px solid ${MC[e.muscle]||'var(--g)'};border-radius:var(--rsm)`;
  return `<div style="background:var(--w);${border};margin-bottom:${abMark?'0':'6px'};overflow:hidden">
      <div style="display:flex;align-items:center;gap:8px;padding:9px 10px">
        ${abChip}${muscleIcon(e.muscle,20)}
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.name}</div>
          <div style="font-size:11px;color:var(--t2);margin-top:1px">${e.muscle} · ${e.type}</div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">${linkBtn}${ab(-1,upDis)}${ab(1,dnDis)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;padding:0 10px 9px;padding-left:44px;flex-wrap:wrap">
        <span style="font-size:11px;color:var(--t3);font-weight:600;margin-right:2px">Series</span>
        <input type="number" inputmode="numeric" style="${inpSt}" value="${e.sets}" min="1" max="20"
          onchange="CUR.routineExs[${i}].sets=Math.max(1,parseInt(this.value)||1);this.value=CUR.routineExs[${i}].sets"
          onfocus="this.select()">
        <span style="color:var(--t3);font-size:14px;font-weight:700">×</span>
        <span style="font-size:11px;color:var(--t3);font-weight:600;margin-right:2px">Reps</span>
        <input type="number" inputmode="numeric" style="${inpSt}" value="${e.reps}" min="1" max="999"
          onchange="CUR.routineExs[${i}].reps=Math.max(1,parseInt(this.value)||1);this.value=CUR.routineExs[${i}].reps"
          onfocus="this.select()">
        <span title="Descanso entre series — por defecto según el tipo de ejercicio; edítalo para fijarlo" style="font-size:11px;color:var(--t3);font-weight:600;margin-left:6px;margin-right:2px">⏱</span>
        <input type="number" inputmode="numeric" style="${inpSt};width:58px;color:var(--t2);border-color:var(--br2)" value="${restForExercise(e,{restSec:CUR.restSec})}" min="0" max="600" step="5"
          onchange="CUR.routineExs[${i}].restSec=Math.max(0,parseInt(this.value)||0);renderRfExList()"
          onfocus="this.select()">
        <span style="color:var(--t3);font-size:11px;font-weight:600">seg</span>
        <button onclick="rfDelEx(${i})"
          style="margin-left:auto;width:28px;height:28px;border-radius:50%;border:none;background:var(--rdl);color:var(--rd);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>
      </div>
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
          <span style="font-size:11px;font-weight:800;color:#A855F7;letter-spacing:.3px">🔗 BISERIE · alterna sin descanso entre ambos</span>
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
  if(!list.length){con.innerHTML='<div class="empty" style="padding:50px"><div class="eico">💬</div><div class="etxt">Sin mensajes todavía</div><div class="esub">Ve a un asesorado y escríbele</div></div>';return}
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
