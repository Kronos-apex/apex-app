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
  const col=entries[entries.length-1].kg<=entries[0].kg?'var(--chart-g)':'var(--chart-or)';
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto 2px"><path d="${d}" fill="none" style="stroke:${col}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function renderClients(){
  const list=document.getElementById('cli-list');
  // Preservar el filtro activo (C2 auditoría 2026-07-13): antes se limpiaba el buscador en CADA
  // render, así que el poll de 15s (o la llegada de un mensaje) borraba el término mientras el
  // coach filtraba. Ahora navegar limpia (gp→p-clients); render sólo reconstruye y re-aplica.
  const searchEl=document.getElementById('cli-search');
  const _term=searchEl?searchEl.value:'';
  document.getElementById('cli-lbl').textContent=`${DB.clients.length} asesorado${DB.clients.length!==1?'s':''} registrado${DB.clients.length!==1?'s':''}`;
  if(!DB.clients.length){list.innerHTML=`<div style="padding:20px 0"><div style="text-align:center;padding:8px 0 20px"><div style="width:56px;height:56px;border-radius:50%;background:var(--gl);color:var(--gt);display:flex;align-items:center;justify-content:center;margin:0 auto 12px">${_coIco('users',26,'👥')}</div><div style="font-size:17px;font-weight:800;color:var(--t1);margin-bottom:6px">Aún no hay asesorados</div><div style="font-size:13px;color:var(--t2);margin-bottom:18px;line-height:1.5">Crea tu primer cliente para comenzar<br>a gestionar rutinas y progreso.</div><button class="btn bp" onclick="openAddClient()" style="padding:12px 28px;font-size:14px">+ Nuevo asesorado</button></div>${[0,1,2].map(()=>`<div class="cli" style="pointer-events:none;opacity:.3"><div style="width:42px;height:42px;border-radius:50%;background:var(--br2);flex-shrink:0"></div><div style="flex:1;min-width:0"><div style="height:13px;width:55%;background:var(--br2);border-radius:6px;margin-bottom:7px"></div><div style="height:11px;width:80%;background:var(--br);border-radius:6px"></div></div><div style="width:54px;height:22px;background:var(--br2);border-radius:20px;flex-shrink:0"></div></div>`).join('')}</div>`;return}
  list.innerHTML='';
  // Orden inteligente (mejora 7 + v360): quién necesita atención primero. sortClientsByAttention
  // (avi-core, puro/testeado) NO muta DB.clients — home y otras vistas conservan su orden.
  // Determinista (desempata por nombre) → el poll de 15s no reordena la lista en vivo.
  // v360: armamos optsById { id: {msgs, lastReadTs} } desde DB.msgs + el mapa de leído del coach
  // (ax_msgreads, v321) para que un 💬 mensaje sin responder suba (tier 2) y un 🙋 lead persista
  // (tier 3). La función es PURA — el estado de lectura entra por aquí, no lo lee ella.
  const _reads=(typeof _coachReads==='function')?_coachReads():{};
  const _ldone=_leadsDone(); // leads ya atendidos (registro del coach) → no vuelven a subir al tope
  const _optsById={};
  DB.clients.forEach(c=>{
    const ms=DB.msgs[c.id];
    const o={};
    if(ms&&ms.length){ const iso=_reads[c.id]; o.msgs=ms; o.lastReadTs=iso?Date.parse(iso):null; }
    if(_ldone[c.id]) o.leadsDone=_ldone;
    if(Object.keys(o).length) _optsById[c.id]=o;
  });
  sortClientsByAttention(DB.clients,DB.history,undefined,_optsById).forEach(({c,r})=>{
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
      st={ring:'var(--g2)',bg:'var(--gl)',col:'var(--gt)',ico:_coIco('check',12,'✓'),txt:'Entrenó hoy'};
    } else if(_todayR){
      st={ring:'var(--or)',bg:'var(--orl)',col:'var(--ort)',ico:_coIco('timer',12,'⏳'),txt:`${esc(_todayR.name)} · hoy`};
    } else if(_tomorrowR){
      st={ring:'var(--bl)',bg:'var(--bll)',col:'var(--blt)',ico:_coIco('calendar',12,'📅'),txt:`${esc(_tomorrowR.name)} · mañana`};
    } else if(_ruts.length){
      st={ring:'var(--br2)',bg:'var(--bg)',col:'var(--t3)',ico:_coIco('moon',12,'💤'),txt:'Descanso hoy'};
    } else {
      st={ring:'var(--rd)',bg:'var(--rdl)',col:'var(--rdt)',ico:_coIco('flag',12,'🚩'),txt:'Sin rutinas asignadas'};
    }
    const lvlCls=c.level==='Principiante'?'tg':c.level==='Intermedio'?'tb':'to';
    const spark=miniSparkline(c.id);
    // selfBadge: cuando el asesorado es un lead que YA aparece con el chip "🙋 Pidió coach" de
    // atención (reason==='lead'), NO repetimos el "🙋 Quiere coach" (dos píldoras 🙋 idénticas se
    // veían redundantes) — el chip de atención lo supersede y además trae la antigüedad. El badge
    // 🆓 Libre (para libres que NO piden coach) se conserva igual.
    const selfBadge=c.selfReg?(_leadPending(c)?(r.reason==='lead'?'':'<span class="tag" style="background:var(--orl);color:var(--ort)">🙋 Quiere coach</span>'):`<span class="tag" style="background:var(--bll);color:var(--blt)">${_coIco('leaf',12,'🆓')} Libre</span>`):'';
    // Chip de ATENCIÓN (mejora 7 + v360): la RAZÓN por la que este asesorado sube en la lista.
    // r.label es texto fijo + un entero (días) → sin datos de usuario, seguro sin esc.
    // v360: unread → azul info (💬); lead → naranja (🙋, coherente con "Quiere coach").
    const _ATN={pain:['--rdl','--rdt'],overdue:['--rdl','--rdt'],unread:['--bll','--blt'],lead:['--orl','--ort'],expiring:['--orl','--ort'],idle:['--br','--t2'],nostart:['--br','--t2']};
    const _ac=_ATN[r.reason];
    const atn=(r.label&&_ac)?`<span class="cli-pill" style="background:var(${_ac[0]});color:var(${_ac[1]})">${r.label}</span>`:'';
    const d=document.createElement('div');d.className='cli';
    d.innerHTML=`<div class="cav ring" style="${avcStyle(c.name)};--cring:${st.ring}">${esc(ini(c.name))}</div>
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
  // Re-aplicar el filtro activo sobre la lista recién reconstruida (filterClients opera sobre el
  // DOM ya creado y actualiza la etiqueta a "N resultados de M"). Si no hay término, no-op.
  if(_term&&typeof filterClients==='function')filterClients(_term);
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
  // 🧹 Auto-cura (2026-07-30): borra valores IMPOSIBLES ya guardados (había 800.000.090 kg
  // en un curl femoral) y recalcula el volumen de esa sesión. Va aquí y no solo en la nube porque
  // la app es offline-first: si se arregla solo en Supabase, el teléfono lo vuelve a pisar.
  const _sh=(typeof sanitizeHistory==='function')?sanitizeHistory(DB.history[id]):{history:DB.history[id],fixed:0};
  if(_sh.fixed>0){ DB.history={[id]: _sh.history};
    try{ svNow('ax_hist',DB.history); log&&log('AVI: saneados '+_sh.fixed+' valores imposibles del historial'); }catch(_e){} }
  const _sp=(typeof sanitizePrs==='function')?sanitizePrs(coll.prs||{}):{prs:coll.prs||{},removed:0};
  DB.prs       ={[id]: _sp.prs};
  if(_sp.removed>0){ try{ svNow('ax_pr',DB.prs); log&&log('AVI: retirados '+_sp.removed+' récords imposibles'); }catch(_e){} }
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
    // phone: llega del wizard (ya normalizado por waPhone). Antes iba vacío a la fuerza y por eso
    // los 13 auto-registrados eran inalcanzables: sin push y sin número, no había CÓMO escribirles.
    notes:'', phone:(p&&p.phone)||'', selfReg:true, tier:'libre', routines:[],
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
      // Con permiso ya dado: self-heal FORZADO (v320 — el no-forzado no re-insertaba la fila
      // muerta del cutover; CERO asesorados suscritos en 40+ días). Sin pedir aún ('default'):
      // tarjeta amable en "Hoy" — auditoría 2026-07-07: nadie le pedía el permiso al asesorado.
      if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
        if(typeof ensureClientPush==='function')ensureClientPush();
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
      // v321: estado de leído del chat sincronizado (fusiona con lo local, gana el más reciente
      // por asesorado) → los mensajes ya leídos NO reaparecen como nuevos en otro dispositivo.
      if(_cs.mr && typeof _cs.mr==='object'){
        const loc=(function(){try{return JSON.parse(localStorage.getItem('ax_msgreads')||'{}')||{};}catch(e){return {};}})();
        const merged={...loc};
        Object.keys(_cs.mr).forEach(id=>{ if(!merged[id]||new Date(_cs.mr[id])>new Date(merged[id]))merged[id]=_cs.mr[id]; });
        localStorage.setItem('ax_msgreads',JSON.stringify(merged));
      }
      // Leads ya atendidos (mismo patrón de fusión: gana la marca más reciente por asesorado)
      // → «ya lo atendí» viaja entre los dispositivos del coach y no lo revive el del asesorado.
      if(_cs.ld && typeof _cs.ld==='object'){
        const locL=(function(){try{return JSON.parse(localStorage.getItem('ax_leadsdone')||'{}')||{};}catch(e){return {};}})();
        const mergedL={...locL};
        Object.keys(_cs.ld).forEach(id=>{ if(!mergedL[id]||new Date(_cs.ld[id])>new Date(mergedL[id]))mergedL[id]=_cs.ld[id]; });
        localStorage.setItem('ax_leadsdone',JSON.stringify(mergedL));
      }
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
const LEGAL_V='2026-07-26-borrador'; // 2026-07-26: §9 corrige QUIÉN te ve — decía «solo por código,
// no hay directorio ni buscador» y eso es FALSO desde el directorio del gimnasio (C5) y «Descubrir»
// (③c-3). Ahora describe los tres caminos y el bloqueo. PENDIENTE de abogado.
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

// ══════════ COMUNIDAD DEL GYM (C5) — el COACH controla la membresía ══════════
// La pertenencia al directorio vive en community_gym_members, escrita SOLO por el coach
// (ni coach_id ni tier sirven: el cliente los escribe — hallazgo Fable). member_id = auth uid
// del asesorado (= DB.clients[].id en modo auth). Todo por AUTH.client() y sellado en localhost.
let _gymMembers = null;   // Set de member_ids en mi comunidad
let _gymCoachUid = null;  // mi uid (coach)
let _gymActive = null;    // A3: Set de member_ids que YA crearon su perfil de comunidad
async function openGymMgr(){
  om('m-gym');
  const body=document.getElementById('gym-mgr-body'); if(body)body.innerHTML='Cargando…';
  try{
    const cli=AUTH.client(); const u=await AUTH.getUser(); if(!cli||!u){ if(body)body.innerHTML='Conéctate para gestionar tu comunidad.'; return; }
    _gymCoachUid=u.id;
    const {data,error}=await cli.from('community_gym_members').select('member_id').eq('coach_id',u.id);
    if(error)throw error;
    _gymMembers=new Set((data||[]).map(r=>r.member_id));
    // A3: quién de mi directorio YA activó su perfil. La RLS (`cp_sel` vía `_same_community`) deja
    // al coach ver el perfil de sus miembros de gym — verificado por impersonación 2026-07-25 (los
    // 7 perfiles del gym vuelven). Falla en silencio: sin este dato el modal sigue funcionando
    // igual, solo sin las etiquetas ni el botón de invitar.
    // CLAVE: `_gymActive` queda en NULL si no se pudo leer. Un Set VACÍO diría «nadie activó» y
    // el modal ofrecería invitar a los que YA están — inventarle un estado al coach es peor que
    // no mostrarlo. null = «no sé» y la UI se calla; Set = dato real.
    await _gymLoadActive(cli);
    _renderGymMgr();
  }catch(e){ if(body)body.innerHTML='<div style="color:var(--rdt);font-size:13px">No se pudo cargar. Revisa tu conexión.</div>'; }
}
// F4: se consulta CADA VEZ que cambia el directorio, no solo al abrir el modal. Antes el Set se
// calculaba una sola vez con los miembros de ese momento: al AGREGAR a alguien que ya tenía perfil,
// su id no estaba en la consulta previa → el modal lo marcaba como «no activado» y empujaba a
// invitarlo a algo donde ya estaba.
async function _gymLoadActive(cli){
  _gymActive=null;
  try{
    const ids=_gymMembers?[..._gymMembers]:[];
    if(!ids.length){ _gymActive=new Set(); return; }
    const {data:profs,error:perr}=await cli.from('community_profiles').select('user_id').in('user_id',ids);
    if(perr)throw perr;
    _gymActive=new Set((profs||[]).map(p=>p.user_id));
  }catch(e){ _gymActive=null; } // null = «no sé» (la UI se calla); Set vacío = «nadie activó»
}
function _gymSwitch(id,on){
  return '<button class="cmty-sw'+(on?' on':'')+'" role="switch" aria-checked="'+(on?'true':'false')+'" onclick="toggleGymMember(\''+id+'\')" style="flex:0 0 auto;width:46px;height:28px;border-radius:14px;border:none;cursor:pointer;position:relative;background:'+(on?'var(--g2)':'var(--br2)')+';transition:background var(--dur,220ms) var(--ease-out,ease)"><span style="position:absolute;top:3px;left:'+(on?'21px':'3px')+';width:22px;height:22px;border-radius:50%;background:#fff;transition:left var(--dur,220ms) var(--ease-out,ease)"></span></button>';
}
// A3: etiqueta de estado por miembro. Solo tiene sentido para quien YA está en el directorio
// (a quien no está no se le invita: abriría Comunidad y no vería a nadie — mismo candado del
// "cuarto vacío" de A2). Sin el dato de perfiles (falló la consulta) no se pinta nada.
function _gymStatusHtml(id){
  if(!_gymActive||!_gymMembers||!_gymMembers.has(id)) return '';
  if(_gymActive.has(id)) return '<span style="font-size:11px;font-weight:700;color:var(--gt);background:var(--gl);padding:2px 7px;border-radius:99px">✓ Ya está</span>';
  // F6: 36px es el mínimo táctil (R1.5) y aquí importa el doble — el botón vive pegado al switch
  // que da o quita la membresía, así que un dedo impreciso cambia el directorio sin querer.
  return '<button class="btn bg bsm" style="min-height:36px;padding:0 10px;font-size:12px" onclick="gymInvite(\''+esc(id)+'\')">Invitar</button>';
}
function _renderGymMgr(){
  const body=document.getElementById('gym-mgr-body'); if(!body||!_gymMembers)return;
  const row=(id,name,sub,status)=>'<div style="display:flex;align-items:center;gap:10px;padding:9px 2px;border-bottom:1px solid var(--br)"><div style="flex:1;min-width:0"><div style="font-weight:600;color:var(--t1);font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(name)+'</div>'+(sub?'<div style="font-size:11px;color:var(--t3)">'+esc(sub)+'</div>':'')+'</div>'+(status||'')+_gymSwitch(id,_gymMembers.has(id))+'</div>';
  // A3: la cifra que le importa al coach — cuántos de su gym ya activaron. Motor puro.
  const cls=(DB.clients||[]).filter(c=>c&&c.id);
  // F5: la frase se deriva de lo que la lista REALMENTE ofrece. Con botón solo salen los
  // asesorados con fila (el coach nunca lo tiene, y un archivado ni siquiera aparece).
  let h='';
  if(_gymActive&&typeof communityGymAdoption==='function'){
    const a=communityGymAdoption([..._gymMembers],[..._gymActive],cls.map(c=>c.id));
    if(a.total){
      const hint=(typeof communityGymHint==='function')
        ? communityGymHint(a,{coachPending:!!(_gymCoachUid&&_gymMembers.has(_gymCoachUid)&&!_gymActive.has(_gymCoachUid))})
        : '';
      h+='<div style="font-size:12px;color:var(--t2);background:var(--gl);border-radius:var(--rsm);padding:9px 11px;margin-bottom:10px;line-height:1.45">'+
        '<b style="color:var(--gt)">'+a.active+' de '+a.total+'</b> ya crearon su perfil. '+esc(hint)+
      '</div>';
    }
  }
  h+=row(_gymCoachUid,'Yo (mi perfil)','Participas como uno más de tu gym','');
  if(!cls.length) h+='<div style="font-size:12px;color:var(--t3);padding:12px 0">Aún no tienes asesorados que agregar.</div>';
  cls.forEach(c=>{ h+=row(c.id, c.name||'Asesorado', '', _gymStatusHtml(c.id)); });
  body.innerHTML=h;
}

// A3: abre WhatsApp con la invitación PRELLENADA. Como en v364, el mensaje lo revisa y lo envía
// el coach — AVI nunca le escribe sola a un asesorado. `waPhone` normaliza el móvil colombiano
// (sin +57 el enlace de wa.me es inválido, bug de clase v365); sin teléfono cae a `wa.me/?text=`
// para elegir contacto, igual que el banner de compartir.
function gymInvite(memberId){
  const c=(DB.clients||[]).find(x=>x&&x.id===memberId);
  const peers=_gymActive?_gymActive.size:0;
  const msg=(typeof communityInviteMsg==='function')?communityInviteMsg(c&&c.name,peers):'';
  if(!msg)return;
  const phone=(typeof waPhone==='function')?waPhone(c&&c.phone):'';
  window.open('https://wa.me/'+(phone||'')+'?text='+encodeURIComponent(msg),'_blank');
  // F14: sin número plausible se elige el contacto a mano — y se explica por qué (un fijo de
  // Bogotá guardado sin indicativo abría chat con Malasia).
  const nota=(!phone&&typeof waPhoneNote==='function')?waPhoneNote(c&&c.phone):'';
  toast(phone?'📲 Invitación lista en WhatsApp':(nota?('📲 '+nota+' Elige el contacto.'):'📲 Elige a quién enviarle la invitación'));
}
async function toggleGymMember(memberId){
  const on=_gymMembers&&_gymMembers.has(memberId);
  if(cloudWriteSealed(location.hostname, window.AVI_ALLOW_CLOUD_WRITE)){
    // Sellado = no se ESCRIBE a la nube, pero leer sí se puede: el simulacro local debe
    // comportarse como producción, incluida la relectura de estados de F4.
    if(_gymMembers){ on?_gymMembers.delete(memberId):_gymMembers.add(memberId);
      const c=AUTH.client(); if(c) await _gymLoadActive(c);
      _renderGymMgr(); }
    return;
  }
  try{
    const cli=AUTH.client(); const u=await AUTH.getUser(); if(!cli||!u)return;
    if(on){ const {error}=await cli.from('community_gym_members').delete().eq('coach_id',u.id).eq('member_id',memberId); if(error)throw error; _gymMembers.delete(memberId); }
    else { const {error}=await cli.from('community_gym_members').insert({coach_id:u.id,member_id:memberId}); if(error)throw error; _gymMembers.add(memberId); }
    await _gymLoadActive(cli); // F4: el directorio cambió → el estado «ya activó» hay que releerlo
    _renderGymMgr();
  }catch(e){ toast('No se pudo actualizar. Intenta de nuevo.'); }
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
    // Normalizado YA aquí con waPhone (avi-core): un móvil colombiano sin +57 da un wa.me roto
    // — gotcha vigente del fix v365. Vacío se queda vacío: el campo es opcional.
    phone:(typeof waPhone==='function')?waPhone(g('su-phone')&&g('su-phone').value||''):'',
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
    const meta={name:data.name,goal:data.goal,level:data.level,days:data.days,sex:data.sex,age:data.age,weight:data.weight,height:data.height,place:data.place,phone:data.phone,selfReg:true,consent};
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
    ['libre','leaf','🆓','Libre','Gratis · app auto-generada'],
    ['app','star','⭐','Premium app','$19.900 · toda la app, sin coach'],
    ['coach','crown','👑','Premium + Coach','$100.000 · todo + chat y ajustes'],
  ];
  const btns=opts.map(([k,ico,fb,lbl,sub])=>{
    const on=k===cur;
    return `<button class="planopt${on?' on':''}"${on?' disabled':''} onclick="setClientPlan('${esc(c.id)}','${k}')">
      <div class="planopt-lbl">${_coIco(ico,14,fb)} ${lbl}${on?' ✓':''}</div>
      <div class="planopt-sub">${sub}</div>
    </button>`;
  }).join('');
  const wants=(cur!=='coach'&&_leadPending(c))?`<div class="plan-wants">🙋 <b>Pidió un coach.</b> Súbelo a <b>Premium + Coach</b> cuando confirmes el pago.` +
    `<button class="btn bg bsm" style="margin-top:8px;min-height:36px;width:100%" onclick="markLeadDone('${esc(c.id)}')">Ya lo atendí — quitar el aviso</button></div>`:'';
  // Colapsable (progressive disclosure): el nivel rara vez cambia → colapsado muestra el tier
  // ACTUAL en el encabezado; se expande con un toque para cambiarlo. El aviso "Pidió un coach"
  // (lead caliente) se mantiene visible aunque esté colapsado.
  const _co=opts.find(o=>o[0]===cur);
  const _curSum=_co?`${_coIco(_co[1],13,_co[2])} ${_co[3]}`:'';
  return `<div class="plan-control">
    <div class="plan-control-h" onclick="togglePlanControl(this)" style="cursor:pointer;user-select:none;display:flex;align-items:center;justify-content:space-between;margin-bottom:0">
      <span>Nivel de acceso</span>
      <span style="display:flex;align-items:center;gap:8px;text-transform:none">
        <span style="font-size:12.5px;font-weight:800;color:var(--t1);display:flex;align-items:center;gap:4px">${_curSum}</span>
        <span class="plan-chev" style="font-size:11px;color:var(--t3);transition:transform .2s">▼</span>
      </span>
    </div>
    ${wants?`<div style="margin-top:10px">${wants}</div>`:''}
    <div class="planopts" style="display:none;margin-top:10px">${btns}</div>
  </div>`;
}
// Cambia el nivel del cliente. 'coach' se persiste como tier='premium' (compatibilidad
// con datos existentes; clientHasCoach lo trata como coacheado).
// ¿Este lead sigue pendiente? Lee el registro del COACH (ax_leadsdone), no el flag del asesorado.
// El motor está en avi-core (`leadPending`, puro y testeado); esto solo le pasa el mapa local.
function _leadsDone(){ try{ return JSON.parse(localStorage.getItem('ax_leadsdone')||'{}')||{}; }catch(e){ return {}; } }
function _leadPending(c){ return (typeof leadPending==='function') ? leadPending(c,_leadsDone()) : !!(c&&c.wantsCoach); }
// Marca un lead como ATENDIDO. Vía sancionada: sv() sobre una clave que está en SB_KEYS +
// _COACH_SETTINGS_KEYS + _coachSettingsObj (las tres, lección v321) → viaja a la nube y a sus
// otros dispositivos. Si el asesorado vuelve a pedir coach MÁS TARDE, reaparece solo.
function markLeadDone(cid){
  const c=DB.clients.find(x=>x.id===cid); if(!c)return;
  const done=_leadsDone(); done[cid]=new Date().toISOString();
  sv('ax_leadsdone',done);
  toast(`✅ ${c.name.split(' ')[0]}: solicitud marcada como atendida`);
  if(typeof openDetail==='function')openDetail(cid);
  if(typeof renderClients==='function')renderClients();
  if(typeof renderHome==='function')renderHome();
}
function setClientPlan(cid,plan){
  const c=DB.clients.find(x=>x.id===cid);if(!c)return;
  if(clientPlan(c)===plan)return;
  const labels={libre:'Libre (gratis)',app:'Premium app (sin coach)',coach:'Premium + Coach'};
  if(!confirm(`¿Cambiar a ${c.name.split(' ')[0]} al nivel "${labels[plan]}"?`))return;
  c.tier = plan==='coach' ? 'premium' : plan;
  // Cambiar el plan ES atender la solicitud, sea cual sea el plan elegido (el bug de Hernán y
  // Cristian: se los pasó a "Premium app" y la marca quedó encendida para siempre porque solo
  // la rama 'coach' la apagaba). El registro del coach es el que manda; el flag del asesorado se
  // apaga además en su fila cuando aplica, pero ya no es quien decide.
  if(_leadPending(c)){ const d=_leadsDone(); d[cid]=new Date().toISOString(); sv('ax_leadsdone',d); }
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
  else{av.textContent=ini(c.name);av.style.background=avc(c.name);av.style.color=inkOn(avc(c.name));av.style.backgroundImage='';}
  document.getElementById('d-name').textContent=c.name;
  // Identidad y datos organizados en grupos (skill: agrupar por whitespace, jerarquía):
  // (1) CORREO en su propia línea con ícono de sobre — contacto, separado de las medidas.
  const _emailEl=document.getElementById('d-email');
  if(c.email){ _emailEl.style.display='flex'; _emailEl.innerHTML=`${_coIco('mail',13,'✉')}<span style="min-width:0;overflow-wrap:break-word">${esc(c.email)}</span>`; }
  else { _emailEl.style.display='none'; _emailEl.innerHTML=''; }
  // (2) DATOS FÍSICOS (sexo · edad · altura · peso) en su propia fila a ancho completo.
  const _stats=[];
  if(c.sex) _stats.push(c.sex==='M'?'♂ Masculino':'♀ Femenino');
  if(c.age) _stats.push(c.age+' años');
  if(c.height) _stats.push(c.height+' cm');
  if(c.weight) _stats.push(c.weight+' kg');
  const _statsEl=document.getElementById('d-stats');
  if(_stats.length){ _statsEl.style.display='flex'; _statsEl.textContent=_stats.join(' · '); }
  else { _statsEl.style.display='none'; }
  const _plan=clientPlan(c);
  const _planCls={libre:'tb',app:'tg',coach:'ty'}[_plan]||'';
  const _planIco={libre:_coIco('leaf',12,'🆓'),app:_coIco('star',12,'⭐'),coach:_coIco('crown',12,'👑')}[_plan];
  const _wantsTag=(_plan!=='coach'&&_leadPending(c))?`<span class="tag" style="background:var(--orl);color:var(--ort)">🙋 Quiere coach</span>`:'';
  document.getElementById('d-tags').innerHTML=`<span class="tag ${c.level==='Principiante'?'tg':c.level==='Intermedio'?'tb':'to'}">${esc(c.level)}</span><span class="tag ty">${_coIco('target',12,'🎯')} ${esc(c.goal)}</span><span class="tag tg">${_coIco('calendar',12,'📅')} ${esc(String(c.days))} días/sem</span><span class="tag ${_planCls}">${_planIco} ${PLAN_LABEL[_plan]}</span>${_wantsTag}`;
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
  renderShockCard(c);
  renderCoachHabitsCard(c);
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
    renderCoachHabitsCard(c); // la meta puede afinarse con el plan nutricional recién cargado
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

  const sumEl=document.getElementById('d-valoracion-sum');
  // Need at least weight + height for basic calculations
  if(!w || !h){
    if(sumEl){sumEl.textContent='Faltan peso y altura';sumEl.style.color='var(--t3)';}
    con.innerHTML=`<div style="font-size:13px;color:var(--t3);text-align:center;padding:12px 0">
      Completa peso y altura del asesorado para ver la valoración.
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
  // Resumen visible cuando la tarjeta está colapsada: el dato clave (objetivo calórico).
  if(sumEl){ sumEl.textContent = kcalObj ? kcalObj.toLocaleString()+' kcal/día' : (tdee?tdee.toLocaleString()+' kcal TDEE':''); sumEl.style.color='var(--gt)'; }

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

  // Tablero de macros: superficie OSCURA propia en los dos temas (decisión del PO 2026-07-30).
  // Todos los colores viven en `.vmac` (styles.css) — aquí NO va color inline, justamente para
  // que nadie vuelva a meter un `var(--t3)` que se rompa en tema claro.
  if(kcalObj || macros){
    html += `<div class="vmac">`;
    if(kcalObj){
      html += `<div class="vmac-obj">
        <div class="vmac-obj-t">${_coIco('target',12,'🎯')} OBJETIVO: ${esc(goal).toUpperCase()}</div>
        <div class="vmac-kcal">${kcalObj.toLocaleString()} kcal/día</div>
        <div class="vmac-lbl">${kcalLabel}</div>
      </div>`;
    }
    if(macros){
      html += `<div class="vmac-h">Distribución de macronutrientes</div>
      <div class="vmac-g">
        <div class="vmac-c prot">
          <div class="vmac-k">Proteína</div>
          <div class="vmac-n">${macros.prot_g}g</div>
          <div class="vmac-u">${macros.prot_g*4} kcal</div>
        </div>
        <div class="vmac-c carb">
          <div class="vmac-k">Carbos</div>
          <div class="vmac-n">${macros.carb_g}g</div>
          <div class="vmac-u">${macros.carb_g*4} kcal</div>
        </div>
        <div class="vmac-c fat">
          <div class="vmac-k">Grasas</div>
          <div class="vmac-n">${macros.fat_g}g</div>
          <div class="vmac-u">${macros.fat_g*9} kcal</div>
        </div>
      </div>`;
    }
    html += `</div>`;
  }

  // Datos base: Peso/Altura, Edad y Sexo ya viven en la CABECERA del asesorado (no repetir —
  // anti-redundancia). Solo queda Actividad diaria, que no aparece en otro lado y alimenta el TDEE.
  html += `<div style="margin-top:4px">`;
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

// Valoración física colapsable (progressive disclosure): es data de REFERENCIA (calorías/macros/
// fórmulas) que el coach consulta, no necesita ocupar la pantalla siempre. Colapsada muestra el
// dato clave (objetivo calórico) en el encabezado; se expande con un toque.
function toggleValoracion(){
  const b=document.getElementById('d-valoracion-body');
  const ch=document.getElementById('d-valoracion-chev');
  if(!b)return;
  const open=b.style.display!=='none';
  b.style.display=open?'none':'block';
  if(ch)ch.style.transform=open?'rotate(0deg)':'rotate(180deg)';
}

// Nivel de acceso colapsable (mismo patrón que la valoración). Restaura display:'' (no 'block')
// para no romper el flex-column de .planopts.
function togglePlanControl(h){
  const pc=h.closest('.plan-control'); if(!pc)return;
  const opts=pc.querySelector('.planopts'); const ch=pc.querySelector('.plan-chev');
  if(!opts)return;
  const open=opts.style.display!=='none';
  opts.style.display=open?'none':'';
  if(ch)ch.style.transform=open?'rotate(0deg)':'rotate(180deg)';
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

// ══════════════════════ PLAN DE CHOQUE (v354 Fase 4 · v355 Fase 4.1) ══════════════════════
// Detectar un estancamiento y no proponer nada es medio producto (Camilo, v353). Cuando un
// asesorado se planta, el coach ve aquí una propuesta concreta y la aplica en un toque. La lógica
// es PURA y vive en avi-core (`shockTargets`/`shockPlan`/`applyShockOption`); esto solo pinta y
// cablea. CANDADO: nada llega al asesorado sin que el coach lo toque — "Aplicar" cambia su rutina
// y PRELLENA el chat, pero el mensaje lo envía él.
// Fase 4.1 (múltiples estancamientos, criterio del coach profesional):
//   · 1-2 músculos → tarjeta multi-sección (uno por músculo, el más plantado; el hermano en `also`).
//     Aplicar/Escribirle POR sección; mute POR ejercicio → aplicar a uno NO oculta al otro.
//   · 3+ ejercicios a la vez → fatiga sistémica → tarjeta GLOBAL: no propone protocolos por
//     ejercicio, sino una SEMANA DE DESCARGA (cablea el generador ya existente con #mg-deload).
function _shockMuteKey(cid,exName){ return 'shockmute_'+cid+'_'+(typeof _norm==='function'?_norm(exName):exName); }
function _shockMuted(cid,exName){ const v=parseInt(localStorage.getItem(_shockMuteKey(cid,exName))); return !!v&&Date.now()<v; }
// Mute LOCAL (no va a SB_KEYS a propósito: es ruido de UI de ESTE dispositivo, no dato del negocio).
function _shockMute(cid,exName){
  const days=(typeof SHOCK_MUTE_DAYS==='number')?SHOCK_MUTE_DAYS:21;
  localStorage.setItem(_shockMuteKey(cid,exName),String(Date.now()+days*86400000));
}
// Mute del modo GLOBAL: clave propia, ventana más corta (SHOCK_GLOBAL_MUTE_DAYS=7) — si está
// sistémicamente fundido, una semana después hay que volver a mirar.
function _shockGlobalMuteKey(cid){ return 'shockmute_'+cid+'__global'; }
function _shockGlobalMuted(cid){ const v=parseInt(localStorage.getItem(_shockGlobalMuteKey(cid))); return !!v&&Date.now()<v; }
function _shockGlobalMute(cid){
  const days=(typeof SHOCK_GLOBAL_MUTE_DAYS==='number')?SHOCK_GLOBAL_MUTE_DAYS:7;
  localStorage.setItem(_shockGlobalMuteKey(cid),String(Date.now()+days*86400000));
}
function _shockBolt(){ return typeof aviIcon==='function'?aviIcon('bolt',14):'⚡'; }
// HTML del análisis de un target (kg plantado + fecha + sesiones planas).
function _shockAnalysisLine(a){
  const _since=a.sinceStr?` desde el ${esc(a.sinceStr)}`:'';
  const _flat=a.flatPoints>0?` · ${a.flatPoints} ${a.flatPoints===1?'sesión':'sesiones'} sin superarlo`:'';
  return `<div style="font-size:12px;color:var(--t2);margin-bottom:8px">Plantado en <strong>${esc(String(a.bestKg))} kg</strong>${_since}${_flat}.</div>`;
}
function renderShockCard(c){
  const el=document.getElementById('d-shock'); if(!el)return;
  el.innerHTML='';el.style.display='none';CUR.shock=null;
  if(typeof shockTargets!=='function'||typeof shockPlan!=='function'||!c)return;
  const sessions=(DB.history[c.id]||[]);
  const tg=shockTargets(sessions,c,Date.now()); if(!tg)return;

  // ── Modo REBUILD: 3+ estancados pero entrenó a saltos → recuperar ritmo, NO descarga ──
  // La descarga a quien ya entrena poco es el consejo equivocado (baja aún más el volumen). AVI se
  // lo dice al coach y NO ofrece generar descarga: primero constancia.
  if(tg.mode==='rebuild'){
    if(_shockGlobalMuted(c.id))return;
    CUR.shock={cid:c.id,mode:'rebuild',count:tg.count,names:tg.names};
    // Cifra de constancia = la EVIDENCIA de por qué no es descarga. Se mide SIN contar la semana en
    // curso (un retornante que vuelve fuerte no es constancia establecida). Decimal con coma (es-CO).
    const _cad=String(tg.cadence).replace('.',',');
    const _plan=tg.plan+(tg.plan===1?' día':' días');
    // cadencia 0 = casi no entrenó las semanas previas (ausente / apenas volvió) → frase digna, no "~0".
    const _cadLine=tg.cadence>0
      ? `Viene entrenando <strong>~${_cad}</strong> de sus <strong>${_plan}</strong> por semana (sin contar esta).`
      : `Casi no entrenó las semanas previas (su plan son <strong>${_plan}</strong> por semana).`;
    el.style.display='block';
    el.innerHTML=`<div class="card" style="padding:12px 14px">
      <div class="ctitle" style="margin-bottom:4px">${_shockBolt()} ${tg.count} estancados — pero es por constancia</div>
      <div style="font-size:12px;color:var(--t2);line-height:1.55;margin-bottom:8px">${esc(tg.names.join(', '))} llevan rato sin subir, pero <strong>no ha venido entrenando parejo</strong>. Antes de tocar el plan, lo que más mueve la aguja es <strong>afianzar el ritmo</strong> — cuando sostenga la constancia unas semanas, revisamos si algo se estancó de verdad. (Una descarga ahora bajaría aún más el volumen: no es lo que necesita.)</div>
      <div style="background:var(--bll);border-radius:var(--rsm);padding:7px 10px;margin-bottom:10px;font-size:12px;color:var(--blt);line-height:1.5">${typeof aviIcon==='function'?aviIcon('calendar',13):'📅'} ${_cadLine}</div>
      <div style="display:flex;gap:6px">
        <button class="btn bp bsm" style="flex:1;min-height:36px" onclick="shockWriteRebuild()">${_coIco('pencil',13,'✍️')} Escribirle</button>
        <button class="btn bg bsm" style="min-height:36px" onclick="dismissShockGlobal()">Descartar</button>
      </div>
    </div>`;
    return;
  }

  // ── Modo GLOBAL: fatiga sistémica → semana de descarga (no N protocolos) ──
  if(tg.mode==='global'){
    if(_shockGlobalMuted(c.id))return;
    CUR.shock={cid:c.id,mode:'global',count:tg.count,names:tg.names};
    el.style.display='block';
    el.innerHTML=`<div class="card" style="padding:12px 14px">
      <div class="ctitle" style="margin-bottom:4px">${_shockBolt()} Atención — ${tg.count} ejercicios plantados a la vez</div>
      <div style="font-size:12px;color:var(--t2);line-height:1.55;margin-bottom:10px">${esc(tg.names.join(', '))} se estancaron a la vez. Eso ya no es un problema de un ejercicio: es <strong>fatiga acumulada</strong> (sueño, comida o estrés cuentan). Lo correcto es una <strong>semana de descarga</strong>, no forzar cada uno.</div>
      <button class="btn bp bsm" style="width:100%;min-height:38px;margin-bottom:8px" onclick="shockDeload()">Generar semana de descarga</button>
      <div style="display:flex;gap:6px">
        <button class="btn bg bsm" style="flex:1;min-height:36px" onclick="shockWriteGlobal()">${_coIco('pencil',13,'✍️')} Escribirle</button>
        <button class="btn bg bsm" style="min-height:36px" onclick="dismissShockGlobal()">Descartar</button>
      </div>
    </div>`;
    return;
  }

  // ── Modo MULTI: 1-2 secciones (una por músculo). Filtra los targets muteados por ejercicio. ──
  const targets=[];
  tg.targets.forEach(t=>{
    if(_shockMuted(c.id,t.name))return;
    const plan=shockPlan(c,t.name,sessions,DB.exercises,Date.now());
    if(!plan||!plan.options.length)return;
    targets.push({exName:t.name,also:(t.also||[]),plan});
  });
  if(!targets.length)return; // todos muteados o sin plan aplicable
  // El plan vive en memoria (CUR.shock): los onclick van por ÍNDICE de sección+opción, así ningún
  // dato del usuario (nombre de ejercicio/variante) se interpola dentro de un atributo.
  CUR.shock={cid:c.id,mode:'multi',targets};
  const multi=targets.length>1;
  el.style.display='block';
  el.innerHTML=`<div class="card" style="padding:12px 14px">
    <div class="ctitle" style="margin-bottom:8px">${_shockBolt()} ${multi?'Planes de choque':'Plan de choque'}</div>
    ${targets.map((T,ti)=>`<div style="padding:9px 0;border-top:1px solid var(--br)">
      <div style="font-size:13px;font-weight:700;margin-bottom:3px">${esc(T.exName)}</div>
      ${_shockAnalysisLine(T.plan.analysis)}
      ${T.also.length?`<div style="background:var(--gl);border-radius:var(--rsm);padding:6px 9px;margin-bottom:8px;font-size:11px;color:var(--gt);line-height:1.5">${esc(T.also.join(', '))} también se plantó — destrabemos este primero.</div>`:''}
      ${T.plan.warnings.map(w=>`<div style="background:var(--orl);border:1px solid var(--or);border-radius:var(--rsm);padding:7px 9px;margin-bottom:8px;font-size:12px;line-height:1.5">${esc(w)}</div>`).join('')}
      ${T.plan.options.map((o,oi)=>`<div style="padding:7px 0 3px">
        <div style="font-size:13px;font-weight:700;margin-bottom:2px">${esc(o.title)}</div>
        <div style="font-size:12px;color:var(--t2);line-height:1.5;margin-bottom:7px">${esc(o.desc)}</div>
        <button class="btn bp bsm" style="min-height:36px" onclick="applyShock(${ti},${oi})">Aplicar</button>
      </div>`).join('')}
      <div style="margin-top:8px"><button class="btn bg bsm" style="min-height:36px" onclick="shockWrite(${ti})">${_coIco('pencil',13,'✍️')} Escribirle</button></div>
    </div>`).join('')}
    <div style="display:flex;margin-top:10px">
      <button class="btn bg bsm" style="min-height:36px" onclick="dismissShock()">${multi?'Descartar todos':'Descartar'}</button>
    </div>
  </div>`;
}
// ── Hábitos: adherencia de agua del asesorado (I2) — el COACH la ve en la ficha ──
// Los datos viven en client.habits (sincronizan como painCare, ya viajan). Meta = plan del
// coach (nut.water) o peso, vía waterGoalFor puro. OCULTO si 0 días registrados
// (progressive disclosure: ni tarjeta vacía ni regaño al asesorado). Solo lectura.
function renderCoachHabitsCard(c){
  const el=document.getElementById('d-habits'); if(!el)return;
  el.innerHTML='';el.style.display='none';
  if(typeof waterAdherence!=='function'||typeof waterGoalFor!=='function'||!c)return;
  const nut=(DB.nutrition||{})[c.id];
  const goal=waterGoalFor(c,nut);
  const a=waterAdherence(c.habits||{},goal,new Date());
  if(a.loggedDays===0)return; // nada registrado → no mostrar (sin tarjeta vacía)
  // Puntos: lleno (azul) = cumplió la meta ese día; vacío (aro gris) = no. Título con el conteo.
  const dots=a.week.map(d=>`<span title="${d.n} vaso${d.n!==1?'s':''}" style="width:13px;height:13px;border-radius:50%;box-sizing:border-box;${d.met?'background:var(--bl)':'background:transparent;border:2px solid var(--br2)'}"></span>`).join('');
  const done=a.metDays===7?'Cumplió la meta los 7 días 💧':`Cumplió la meta ${a.metDays} de los últimos 7 días`;
  el.style.display='block';
  el.innerHTML=`<div class="card" style="padding:12px 14px">
    <div class="ctitle" style="margin-bottom:9px">${_coIco('droplet',15,'💧')} Hidratación</div>
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:9px">${dots}</div>
    <div style="font-size:12.5px;color:var(--t2);line-height:1.5">${done} · meta ${goal} vaso${goal!==1?'s':''}/día</div>
  </div>`;
}
// Abre el chat con el mensaje YA ESCRITO — el coach lo edita y lo envía. Jamás se envía solo.
function _shockChat(cid,msg){
  if(typeof openCoachChat!=='function')return;
  openCoachChat(cid); // openCoachChat vacía el textarea al abrir → prellenar DESPUÉS
  const ta=document.getElementById('cchat-in'); if(!ta)return;
  ta.value=msg||'';
  if(typeof _cchatGrow==='function')_cchatGrow(ta);
  ta.focus();
}
// Aplica la opción `oi` del target `ti` a la rutina. Muta SOLO ese ejercicio → los otros targets
// siguen visibles. Prellena el chat con el mensaje de esa opción.
function applyShock(ti,oi){
  const S=CUR.shock; if(!S||S.mode!=='multi')return;
  const T=S.targets[ti]; if(!T)return;
  const opt=T.plan.options[oi]; if(!opt)return;
  const c=DB.clients.find(x=>x.id===S.cid); if(!c)return;
  c.routines=applyShockOption(c.routines||[],T.exName,opt,DB.exercises);
  sv('ax_c',DB.clients);
  _shockMute(S.cid,T.exName);
  renderDetailRoutines(c);renderShockCard(c);renderHome();
  toast('✅ Plan aplicado a la rutina de '+(c.name||'').split(' ')[0]);
  _shockChat(S.cid,opt.msg);
}
// Escribirle SIN tocar la rutina: usa el mensaje de la opción recomendada (la primera) de ese target.
function shockWrite(ti){
  const S=CUR.shock; if(!S||S.mode!=='multi')return;
  const T=S.targets[ti]; if(!T||!T.plan.options.length)return;
  _shockChat(S.cid,T.plan.options[0].msg);
}
// Descartar: silencia TODOS los targets visibles (mute por ejercicio) y re-renderiza.
function dismissShock(){
  const S=CUR.shock; if(!S||S.mode!=='multi')return;
  S.targets.forEach(T=>_shockMute(S.cid,T.exName));
  const c=DB.clients.find(x=>x.id===S.cid);
  if(c)renderShockCard(c);
}
// ── Modo global: descarga / escribir / descartar ──
// Cablea el generador YA existente: abre m-gen, marca #mg-deload y regenera con descarga. El
// borrador sigue teniendo el candado del coach (él aprueba antes de asignar) — no se toca.
function shockDeload(){
  const S=CUR.shock; if(!S||S.mode!=='global')return;
  if(typeof openGenRutinas!=='function')return;
  CUR.clientId=S.cid;
  openGenRutinas();
  const dl=document.getElementById('mg-deload'); if(dl)dl.checked=true;
  if(typeof toggleGenDeload==='function')toggleGenDeload(true); // marca CUR.genDeload + re-genera
}
function shockWriteGlobal(){
  const S=CUR.shock; if(!S||S.mode!=='global')return;
  const first=(((DB.clients.find(x=>x.id===S.cid)||{}).name||'').split(' ')[0])||'';
  _shockChat(S.cid,first+', vi que varios ejercicios se te estancaron a la vez. Esta semana bajamos revoluciones a propósito: es una descarga programada para recuperar, no un retroceso. Volvemos con todo la próxima 💪');
}
// Rebuild: escribirle enfocado en volver al ritmo (nada de descarga; nada toca la rutina).
function shockWriteRebuild(){
  const S=CUR.shock; if(!S||S.mode!=='rebuild')return;
  const first=(((DB.clients.find(x=>x.id===S.cid)||{}).name||'').split(' ')[0])||'';
  _shockChat(S.cid,first+', he visto que varios ejercicios llevan rato sin subir, pero también que las últimas semanas fueron a saltos. No es para preocuparse: lo primero es volver a un ritmo parejo, aunque sean sesiones cortas. En cuanto retomemos la constancia tu cuerpo vuelve a responder, y ahí sí ajustamos lo que haga falta 💪');
}
function dismissShockGlobal(){
  const S=CUR.shock; if(!S)return;
  _shockGlobalMute(S.cid);
  const c=DB.clients.find(x=>x.id===S.cid);
  if(c)renderShockCard(c);
}

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

    div.innerHTML=`<div class="rch" onclick="this.closest('.rc').classList.toggle('open')"><div class="rcnum">${ri+1}</div><div class="rci"><div class="rcname">${esc(r.name)}</div><div class="rcmeta">${esc(r.day)} · ${exN} ejercicio${exN!==1?'s':''} · ${totS} series · ${_coIco('timer',11,'⏱')}${r.restSec||60}s</div></div><div style="display:flex;gap:4px;margin-right:4px"><button class="btn bg bsm" style="padding:0 9px;min-height:36px;justify-content:center" title="Guardar como plantilla" aria-label="Guardar como plantilla" onclick="event.stopPropagation();saveRoutineAsTemplate('${c.id}',${ri})">${_coIco('folder',14,'📂')}</button><button class="btn bg bsm" style="padding:0 9px;min-height:36px;justify-content:center" title="Editar rutina" aria-label="Editar rutina" onclick="event.stopPropagation();openEditRoutine('${c.id}',${ri})">${_coIco('pencil',13,'✏️')}</button><button class="btn bd bsm" style="padding:0 9px;min-height:36px;justify-content:center" title="Eliminar rutina" aria-label="Eliminar rutina" onclick="event.stopPropagation();delRoutine('${c.id}',${ri})">${_coIco('trash',14,'🗑️')}</button></div><div class="rcchev">▼</div></div><div class="rcbody">${r.note?`<div style="background:rgba(242,201,76,.10);border:1px solid rgba(242,201,76,.30);border-radius:var(--rsm);padding:8px 12px;font-size:12px;color:var(--t1);margin-bottom:9px">💡 ${esc(r.note)}</div>`:''}${!(r.exercises||[]).length?'<div style="color:var(--t3);font-size:13px">Sin ejercicios</div>':(r.exercises||[]).map((e,_ei,_arr)=>`<div class="exrow"><div class="exicon" style="background:${MC[e.muscle]||'#ccc'}18;border:1px solid ${MC[e.muscle]||'#ccc'}30">${exIcon(e)}</div><div><div class="exname">${esc(e.name)}</div><div class="exmet">${esc(typeof exMuscleText==='function'?exMuscleText(e):e.muscle)} · ${esc(e.type)} · ${_coIco('timer',11,'⏱')}${restForExercise(e,r)}s${bisetInfo(_arr,_ei).biset?' · <span class="biset-tag">'+_coIco('link',10,'🔗')+' biserie</span>':''}</div></div><div class="exsets">${exSetsCellHTML(e)}</div></div>`).join('')}${wuPreview}</div>`;
    con.appendChild(div);
  });
}

function openNewRoutine(){
  const c=DB.clients.find(x=>x.id===CUR.clientId);if(!c)return;
  CUR.editRoutineIdx=null;
  document.getElementById('mr-title').innerHTML=`Nueva rutina — <span style="color:var(--gt)">${esc(c.name)}</span>`;
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
  document.getElementById('mg-title').innerHTML=`✨ Borrador de la semana — <span style="color:var(--gt)">${esc(c.name)}</span>`;
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
  const gaps=(res.envGaps&&res.envGaps.length)?`<div style="background:var(--yll);border:1px solid var(--yl);border-radius:var(--rsm);padding:10px 12px;font-size:12px;color:var(--ylt);margin-bottom:12px"><b>ℹ️ Sin opciones en este entorno para:</b> ${esc(res.envGaps.join(', '))}. Esos grupos quedaron sin cubrir (en peso corporal, tirar y curl exigen resistencia). Sugerencia: una <b>banda elástica</b> los desbloquea, o cambia el entorno del asesorado.</div>`:'';
  const adaptBanner=res.adaptation?`<div style="background:#e9f8f0;border:1px solid var(--g);border-radius:var(--rsm);padding:10px 12px;font-size:12px;color:#1c6b4a;margin-bottom:12px"><b>🌱 Fase de adaptación</b> — este asesorado lleva pocas semanas, así que el borrador usa <b>15-20 reps con poco o nada de peso</b> y foco en técnica (sin importar el objetivo). Las cargas suben solas cuando pase la fase (~3 semanas). Profesional desde el día 1.</div>`:'';
  const loadBanner=res.loadProfile==='high'?`<div style="background:var(--bll);border:1px solid var(--bl);border-radius:var(--rsm);padding:10px 12px;font-size:12px;color:var(--blt);margin-bottom:12px"><b>⚖️ Perfil de carga alto</b> (IMC/cintura) — el borrador prioriza <b>máquinas y movimientos guiados/asistidos</b> y evita saltos/pliométricos, para cuidar articulaciones mientras gana base. Ajústalo según veas a la persona.</div>`:'';
  const deloadBanner=res.deload?`<div style="background:rgba(232,151,58,.12);border:1px solid #E8973A;border-radius:var(--rsm);padding:10px 12px;font-size:12px;color:#8a5a14;margin-bottom:12px"><b>🔄 Semana de descarga</b> — volumen reducido (−1 serie por ejercicio). Recuérdale <b>bajar la carga ~10-20%</b>: la meta de esta semana es recuperar, no exigir.</div>`:'';
  const intro=`<div style="font-size:12px;color:var(--t2);margin-bottom:12px">Borrador para <b>${esc(c.goal||'—')}</b> · ${esc(c.level||'—')} · ${res.routines.length} días/semana · ${PLACE_LABELS[res.place]||'🏋️ Gym'}. Es un punto de partida: confírmalo y luego ajusta cada rutina en el editor (✏️).</div>`;
  const cards=res.routines.map(r=>{
    const totS=r.exercises.reduce((s,e)=>s+(parseInt(e.sets)||0),0);
    const exs=r.exercises.map((e,_ei,_arr)=>`<div class="exrow"><div class="exicon" style="background:${MC[e.muscle]||'#ccc'}18;border:1px solid ${MC[e.muscle]||'#ccc'}30">${exIcon(e)}</div><div><div class="exname">${esc(e.name)}</div><div class="exmet">${esc(typeof exMuscleText==='function'?exMuscleText(e):e.muscle)} · ${esc(e.type)} · ${_coIco('timer',11,'⏱')}${restForExercise(e,r)}s${bisetInfo(_arr,_ei).biset?' · <span class="biset-tag">'+_coIco('link',10,'🔗')+' biserie</span>':''}</div></div><div class="exsets">${exSetsCellHTML(e)}</div></div>`).join('');
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
  document.getElementById('mr-title').innerHTML=`Editar rutina — <span style="color:var(--gt)">${esc(c.name)}</span>`;
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
  const inpSt=`width:50px;padding:6px 4px;border:1.5px solid var(--g);border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;text-align:center;background:white;outline:none;color:var(--gt)`;
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
  const delCtl = `<button onclick="rfDelEx(${i})" style="margin-left:auto;width:28px;height:28px;border-radius:50%;border:none;background:var(--rdl);color:var(--rdt);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>`;
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
          <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.name)}</div>
          <div style="font-size:11px;color:var(--t2);margin-top:1px">${esc(e.muscle)} · ${esc(e.type)}</div>
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
  // v363: la ficha ya NO tiene input propio. Un solo lugar para escribir = el chat de pantalla
  // completa (openCoachChat, botón «Abrir chat»). Aquí va solo un PREVIEW de los últimos 2
  // mensajes, SOLO LECTURA. El leído NO se marca por abrir el PERFIL (v321, aviso Lucas): se
  // abre para editar rutina/medidas sin ver el chat → limpiaría el badge en falso.
  const msgs=DB.msgs[id]||[];const con=document.getElementById('d-msgs');if(!con)return;con.innerHTML='';
  if(!msgs.length){con.innerHTML='<div style="text-align:center;padding:18px;color:var(--t3);font-size:13px">Sin mensajes. Abre el chat para escribir el primero 👇</div>';return}
  const prev=msgs.slice(-2);
  if(msgs.length>prev.length){
    const more=document.createElement('div');more.style.cssText='text-align:center;color:var(--t3);font-size:11px;padding:2px 0 8px';
    const extra=msgs.length-prev.length;more.textContent=`+${extra} mensaje${extra>1?'s':''} más — abre el chat para ver todo`;con.appendChild(more);
  }
  prev.forEach(m=>{
    const isC=m.from==='coach';
    const b=document.createElement('div');b.className=`mb ${isC?'cs':'cl'}`;b.textContent=m.text||'';con.appendChild(b);
    const t=document.createElement('div');t.className=`mt${isC?' r':''}`;t.textContent=`${isC?'Coach':'Asesorado'} · ${fmtD(m.date)} ${fmtT(m.date)}`;con.appendChild(t);
  });
  con.scrollTop=con.scrollHeight;
}
function renderMsgs(){
  const con=document.getElementById('msgs-list');
  const list=DB.clients.map(c=>{const ms=DB.msgs[c.id]||[];return ms.length?{c,last:ms[ms.length-1],count:ms.length}:null}).filter(Boolean).sort((a,b)=>new Date(b.last.date)-new Date(a.last.date));
  // Badge on sidebar msgs item: count clients with last msg from client (unread by coach)
  const unreadClients=DB.clients.filter(c=>{
    const ms=DB.msgs[c.id]||[];
    const lastClientMsg=ms.filter(m=>m.from==='client').slice(-1)[0];
    if(!lastClientMsg)return false;
    const lastRead=_coachReadOf(c.id);
    return !lastRead||new Date(lastClientMsg.date)>new Date(lastRead);
  }).length;
  const sbBdg=document.getElementById('sb-msgs-bdg');
  if(sbBdg){sbBdg.textContent=unreadClients;sbBdg.style.display=unreadClients>0?'inline-flex':'none';}
  con.innerHTML='';
  if(!list.length)con.innerHTML='<div class="empty" style="padding:28px 20px"><div class="eico" style="color:var(--g2)">'+_coIco('chat',34,'💬')+'</div><div class="etxt">Todavía no hay conversaciones</div><div class="esub">Toca a cualquiera de abajo y escríbele el primer mensaje</div></div>';
  list.forEach(({c,last,count})=>{
    const lastClientMsg=(DB.msgs[c.id]||[]).filter(m=>m.from==='client').slice(-1)[0];
    const lastRead=_coachReadOf(c.id);
    const hasUnread=lastClientMsg&&(!lastRead||new Date(lastClientMsg.date)>new Date(lastRead));
    const div=document.createElement('div');div.className='cli';
    div.innerHTML=`<div class="cav" style="width:38px;height:38px;font-size:14px;${avcStyle(c.name)}">${esc(ini(c.name))}</div><div style="flex:1;min-width:0"><div class="cn">${esc(c.name)}${hasUnread?'<span style="display:inline-block;width:8px;height:8px;background:var(--rd);border-radius:50%;margin-left:6px;vertical-align:middle"></span>':''}</div><div class="cm">${last.from==='coach'?'<span style="color:var(--g2);font-weight:600">Tú</span>':'<span style="color:var(--blt);font-weight:600">Asesorado</span>'}: "${esc(last.text.slice(0,45))}${last.text.length>45?'...':''}"</div></div><div style="font-size:11px;color:var(--t3);text-align:right">${fmtD(last.date)}<br>${count} msg</div>`;
    div.onclick=()=>openCoachChat(c.id);con.appendChild(div);
  });
  renderMsgsSinConversar(con);
}

// ══════════ LOS QUE NUNCA HAN ESCRITO (F4, 2026-07-28) ══════════
// La bandeja mostraba SOLO las conversaciones existentes y dejaba media pantalla en blanco.
// Lo que falta ahí no es decoración: medido contra el backup del 2026-07-27, **11 de los 23
// asesorados no han cruzado NUNCA un mensaje con el coach** — y el problema nº1 de la app es
// justo que la gente no arranca. Así que el hueco lo ocupa la lista de a quién le falta el
// primer mensaje, a un toque de escribirle. Sin flujo nuevo: reusa openCoachChat.
// Los suspendidos no aparecen (no son un pendiente, son bajas).
function _sinConversar(){
  return (DB.clients||[]).filter(c=>c&&!c.suspended&&!((DB.msgs[c.id]||[]).length));
}
function renderMsgsSinConversar(con){
  const pend=_sinConversar();
  if(!pend.length)return;
  const wrap=document.createElement('div');
  wrap.id='msgs-sinconv';
  wrap.innerHTML=`<div style="display:flex;align-items:baseline;gap:7px;margin:18px 2px 9px">
      <div style="font-size:13px;font-weight:800;color:var(--t1)">Sin conversación</div>
      <div style="font-size:12px;color:var(--t3)">${pend.length} de ${(DB.clients||[]).filter(c=>c&&!c.suspended).length}</div>
    </div>
    <div style="font-size:12px;color:var(--t3);margin:0 2px 10px;line-height:1.45">Nunca han cruzado un mensaje contigo. Un «¿cómo vas?» suele ser lo que los devuelve a entrenar.</div>`;
  pend.forEach(c=>{
    const div=document.createElement('div');div.className='cli';
    div.innerHTML=`<div class="cav" style="width:38px;height:38px;font-size:14px;${avcStyle(c.name)}">${esc(ini(c.name))}</div>`
      +`<div style="flex:1;min-width:0"><div class="cn">${esc(c.name)}</div>`
      +`<div class="cm" style="color:var(--t3)">Todavía no se han escrito</div></div>`
      +`<div class="btn bg bsm" style="pointer-events:none;padding:0 12px;min-height:36px;font-size:11px">Escribir</div>`;
    div.onclick=()=>openCoachChat(c.id);
    wrap.appendChild(div);
  });
  con.appendChild(wrap);
}

// ══════════ ESTADO DE LEÍDO DEL COACH — sincronizado a la nube (v321) ══════════
// Antes vivía SOLO en localStorage (`coach_read_<id>`) → al cambiar de dispositivo/navegador
// (o tras el cutover) se perdía y los mensajes ya leídos volvían a verse como nuevos y a
// re-notificar (bug reportado por Camilo). Ahora es un mapa `ax_msgreads` {id: iso} que viaja
// en coach_settings.mr (ver _coachSettingsObj + la hidratación al entrar como coach, arriba).
function _coachReads(){ try{ return JSON.parse(localStorage.getItem('ax_msgreads')||'{}')||{}; }catch(e){ return {}; } }
function _coachReadOf(id){ const m=_coachReads(); return m[id]||null; }
function markCoachRead(id){
  if(!id)return;
  const m=_coachReads(); m[id]=new Date().toISOString();
  if(typeof sv==='function')sv('ax_msgreads',m); // sv espeja a localStorage y sube coach_settings
  else { try{ localStorage.setItem('ax_msgreads',JSON.stringify(m)); }catch(e){} }
}

// ══════════ CHAT DE PANTALLA COMPLETA DEL COACH (v321) ══════════
// La conversación con un asesorado en una vista dedicada (no enterrada en el perfil). La abren
// la notificación (openChatFor) y la bandeja (renderMsgs). Aterriza SIEMPRE en el último msg.
let _cchatId=null;
function _cchatGrow(ta){ ta.style.height='auto'; ta.style.height=Math.min(ta.scrollHeight,120)+'px'; }
function openCoachChat(clientId){
  const c=DB.clients.find(x=>x.id===clientId); if(!c)return;
  _cchatId=clientId;
  const av=document.getElementById('cchat-av'); if(av){ av.style.background=avc(c.name); av.style.color=inkOn(avc(c.name)); av.textContent=ini(c.name); }
  const nm=document.getElementById('cchat-name'); if(nm)nm.textContent=c.name; // textContent → sin XSS
  renderCoachChatThread(clientId,true); // al abrir SIEMPRE al final
  markCoachRead(clientId);
  if(typeof renderMsgs==='function')renderMsgs(); // refresca badges/lista detrás
  const el=document.getElementById('coach-chat'); if(!el)return;
  if(!el.classList.contains('on'))navOpenLayer();
  el.classList.add('on');
  // Aterrizar al final DESPUÉS de mostrar (con display:none el scrollHeight es 0 y no scrollea).
  const con=document.getElementById('cchat-thread'); if(con)con.scrollTop=con.scrollHeight;
  const ta=document.getElementById('cchat-in'); if(ta){ ta.value=''; ta.style.height='auto'; }
}
function renderCoachChatThread(clientId, forceBottom){
  const con=document.getElementById('cchat-thread'); if(!con)return;
  // Solo auto-scrollear si el coach YA estaba pegado al fondo (o al abrir, forceBottom). Si está
  // leyendo mensajes de arriba y llega uno nuevo por el poll, NO lo tiramos al fondo (aviso Lucas).
  const nearBottom=forceBottom||con.scrollHeight<=con.clientHeight||(con.scrollHeight-con.clientHeight-con.scrollTop)<=48;
  const prevTop=con.scrollTop;
  const msgs=DB.msgs[clientId]||[]; con.innerHTML='';
  const cli=DB.clients.find(x=>x.id===clientId)||{};
  const first=(cli.name||'Asesorado').split(' ')[0];
  // Aviso de NO-ENTREGA: el chat es solo-coach, así que a un plan 'libre'/'app' el mensaje se
  // guarda y nunca se ve. Antes esto era mudo (20 mensajes reales en el aire, ver avi-core).
  // No bloqueamos escribir — decisión del PO: avisar al coach y ofrecerle subir el plan.
  const blk=(typeof chatDeliveryBlock==='function')?chatDeliveryBlock(cli):null;
  if(blk){
    const w=document.createElement('div'); w.className='cchat-noliv';
    const t=document.createElement('div'); t.className='cchat-noliv-t';
    t.textContent=`${first} tiene plan «${blk.label}», que no incluye chat: lo que escribas aquí se guarda, pero no le llega.`;
    w.appendChild(t); // textContent → el nombre nunca entra como HTML
    const b=document.createElement('button'); b.type='button'; b.className='btn bp bsm';
    b.textContent='Activar Premium + Coach';
    b.onclick=()=>{ if(typeof setClientPlan==='function')setClientPlan(clientId,'coach'); };
    w.appendChild(b); con.appendChild(w);
  }
  if(!msgs.length){
    const e=document.createElement('div'); e.className='cchat-empty';
    e.textContent='Aún no hay mensajes. Escríbele el primero 👇';
    con.appendChild(e); con.scrollTop=nearBottom?con.scrollHeight:prevTop; return;
  }
  msgs.forEach(m=>{
    const isC=m.from==='coach';
    const b=document.createElement('div');b.className=`mb ${isC?'cs':'cl'}`;b.textContent=m.text||'';con.appendChild(b);
    const t=document.createElement('div');t.className=`mt${isC?' r':''}`;t.textContent=`${isC?'Tú':first} · ${fmtD(m.date)} ${fmtT(m.date)}`;con.appendChild(t);
  });
  con.scrollTop=nearBottom?con.scrollHeight:prevTop; // aterriza en el más reciente solo si procede
}
function sendCoachChatMsg(){
  const ta=document.getElementById('cchat-in'); const text=(ta&&ta.value||'').trim(); const id=_cchatId;
  if(!text||!id)return;
  if(!DB.msgs[id])DB.msgs[id]=[];
  DB.msgs[id].push({from:'coach',text,date:new Date().toISOString()});
  sv('ax_m',DB.msgs);
  if(DB.clients.find(x=>x.id===id))pushToClient(id,'💬 Mensaje de tu Coach',text.length>80?text.slice(0,77)+'...':text,{type:'message',chatId:id,tag:'avi-chat-'+id});
  ta.value=''; ta.style.height='auto';
  markCoachRead(id);
  renderCoachChatThread(id,true); // acabas de enviar → sigue al fondo
  if(typeof renderMsgs==='function')renderMsgs();
  if(typeof renderHome==='function')renderHome();
  const det=document.getElementById('p-detail');
  if(CUR.clientId===id&&det&&det.classList.contains('on')&&typeof renderDetailMsgs==='function')renderDetailMsgs(id);
  toast('💬 Mensaje enviado');
}
// v364 (adopción, ítem c): invitar al asesorado a ABRIR la app para activar sus notificaciones.
// RAÍZ del problema de adopción: un mensaje del chat interno solo llega como PUSH a quien YA está
// suscrito → a quien no ha abierto la app NO lo alcanza (huevo/gallina). Por eso el canal es
// WhatsApp (el que sí llega, como whatsappNudge/whatsappReminder). Sin teléfono → se prellena el
// chat interno (el coach revisa y envía; patrón del plan de choque). NADA se envía solo.
function coachInviteOpenApp(){
  const id=_cchatId; const c=DB.clients.find(x=>x.id===id); if(!c)return;
  const nombre=(c.name||'').split(' ')[0]||'';
  const saludo=nombre?`Hola ${nombre} 👋 `:'¡Hola! 👋 ';
  // El enlace NO es opcional: el mensaje pedía «abre AVI» sin decir DÓNDE, así que el asesorado
  // recibía la orden sin la puerta (hallazgo 2026-07-31). Mismo patrón defensivo que app-7.
  const url=(typeof AVI_SHARE_URL!=='undefined')?AVI_SHARE_URL:'https://kronos-apex.github.io/apex-app/';
  const msg=`${saludo}Abre AVI un momentito (solo entrar) para activar tus recordatorios y no perderte tus rutinas ni tu progreso 💪\n\n${url}`;
  const phone=waPhone(c.phone); // normaliza (móvil CO sin +57 → 57…) — bug de clase v364
  if(phone){ window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank'); toast('📲 Invitación lista en WhatsApp'); return; }
  const ta=document.getElementById('cchat-in'); if(ta){ ta.value=msg; if(typeof _cchatGrow==='function')_cchatGrow(ta); ta.focus(); }
  // F14: `waPhone` ya no devuelve un número dudoso (abría chat con un desconocido). Si el teléfono
  // no sirve se dice por qué, en vez de dejar al coach creyendo que WhatsApp «no funcionó».
  const nota=(typeof waPhoneNote==='function')?waPhoneNote(c.phone):'';
  toast(nota?('✍️ '+nota+' Te lo dejé listo en el chat'):'✍️ Revísalo y envíaselo para invitarlo');
}
function closeCoachChat(){ navCloseLayer(_closeCoachChat); }
function _closeCoachChat(){ const el=document.getElementById('coach-chat'); if(el)el.classList.remove('on'); _cchatId=null; }
function coachChatOpenProfile(){ const id=_cchatId; if(!id)return; closeCoachChat(); setTimeout(()=>{ if(typeof openDetail==='function')openDetail(id); },60); }

// ══════════ MODERACIÓN — BANDEJA DE REPORTES (lote v3-a #1, backend c14) ══════════
// El coach-moderador ve los reportes de la comunidad y actúa. La autoridad vive en la tabla
// community_moderators (solo service_role escribe) y TODO pasa por RPCs DEFINER gateadas por
// _is_moderator: cmty_mod_reports (bandeja) / cmty_mod_resolve (marcar resuelto) /
// cmty_mod_delete_post (borrar el post reportado por id). El cliente JAMÁS lee community_reports
// crudo. Un no-moderador recibe 0 filas de la RPC → la tarjeta ni aparece (no hace falta saber
// client-side "soy moderador"). Escrituras selladas en localhost como el resto de comunidad.
let _modReports=[];
function _modSealed(){ return typeof cloudWriteSealed==='function' && cloudWriteSealed(location.hostname, window.AVI_ALLOW_CLOUD_WRITE); }
async function renderReportsCard(){
  const el=document.getElementById('h-reports'); if(!el) return;
  let cli=null; try{ cli=(typeof AUTH!=='undefined'&&AUTH.client)?AUTH.client():null; }catch(e){}
  if(!cli){ el.style.display='none'; el.innerHTML=''; return; }
  try{
    const { data, error } = await cli.rpc('cmty_mod_reports');
    if(error) throw error;
    _modReports=(data||[]).filter(r=>r.rstatus==='open');
    if(!_modReports.length){ el.style.display='none'; el.innerHTML=''; return; }
    const n=_modReports.length;
    el.style.display='block';
    el.innerHTML='<div class="card" style="border-left:3px solid var(--rd);padding:12px 14px;cursor:pointer" onclick="openReportsInbox()">' +
      '<div style="display:flex;align-items:center;gap:8px">' +
        '<span style="font-size:12px;font-weight:800;color:var(--rdt);flex:1">' +
          (typeof aviIcon==='function'?aviIcon('flag',13):'🚩') + ' ' + n + (n>1?' reportes por revisar':' reporte por revisar') + '</span>' +
        '<span style="font-size:11px;color:var(--t3)">Ver ›</span>' +
      '</div></div>';
  }catch(e){ el.style.display='none'; el.innerHTML=''; if(typeof warn==='function')warn('mod reports:', e&&e.message); }
}
// Extracto humano de un reporte (motivo + a quién + contenido). esc() en TODO lo de usuario.
function _modReportRow(r){
  const rep=r.reporter_handle?esc(r.reporter_handle):'Alguien';
  const tgt=r.reported_handle?esc(r.reported_handle):'Ya no está en la comunidad';
  const motivo=r.rreason?esc(r.rreason):'Sin motivo';
  const cuando=r.rcreated_at?new Date(r.rcreated_at).toLocaleDateString('es-CO',{day:'numeric',month:'short'}):'';
  const excerpt=r.excerpt?('<div style="font-size:12px;color:var(--t2);background:var(--surface);border-radius:var(--rsm);padding:8px 10px;margin-top:7px">'+esc(r.excerpt)+'</div>'):'';
  const isPost=typeof r.rcontext==='string' && r.rcontext.indexOf('post:')===0;
  const delBtn=isPost?('<button class="btn bg bsm" style="min-height:36px;color:var(--rdt)" onclick="modDeletePost(\''+esc(r.rid)+'\')">Eliminar publicación</button>'):'';
  return '<div class="card" style="padding:12px;margin-bottom:9px">' +
    '<div style="font-size:13px;color:var(--t1);line-height:1.5"><b>'+rep+'</b> reportó a <b>'+tgt+'</b></div>' +
    '<div style="font-size:11.5px;color:var(--t3);margin-top:2px">'+motivo+' · '+esc(cuando)+'</div>' +
    excerpt +
    '<div style="display:flex;gap:8px;margin-top:10px">' +
      '<button class="btn bp bsm" style="min-height:36px;flex:1" onclick="modResolve(\''+esc(r.rid)+'\')">Marcar resuelto</button>' +
      delBtn +
    '</div></div>';
}
function openReportsInbox(){
  const host=document.getElementById('reports-body'); const scr=document.getElementById('s-reports');
  if(!host||!scr){ toast('No pude abrir los reportes.'); return; }
  if(!_modReports.length){
    host.innerHTML='<div class="empty"><div class="etxt">Sin reportes por revisar</div><div class="esub">Cuando alguien reporte contenido, aparecerá aquí.</div></div>';
  }else{
    host.innerHTML=_modReports.map(_modReportRow).join('');
  }
  if(!scr.classList.contains('on')){ if(typeof navOpenLayer==='function')navOpenLayer(); scr.classList.add('on'); scr.scrollTop=0; }
}
function closeReportsInbox(){ navCloseLayer(_closeReportsInbox); }
function _closeReportsInbox(){ const s=document.getElementById('s-reports'); if(s)s.classList.remove('on'); }
async function modResolve(rid){
  if(_modSealed()){ toast('🔒 (dev) sellado en localhost'); return; }
  try{
    const cli=AUTH.client(); if(!cli)return;
    const { error } = await cli.rpc('cmty_mod_resolve', { p_report: rid });
    if(error) throw error;
    _modReports=_modReports.filter(r=>r.rid!==rid);
    toast('✅ Reporte resuelto');
    openReportsInbox(); renderReportsCard();
  }catch(e){ toast('No pude resolver el reporte.'); if(typeof warn==='function')warn('mod resolve:',e&&e.message); }
}
async function modDeletePost(rid){
  const r=_modReports.find(x=>x.rid===rid); if(!r)return;
  const pid=(typeof r.rcontext==='string')?r.rcontext.split(':')[1]:null;
  if(!pid){ toast('Este reporte no apunta a una publicación.'); return; }
  if(!confirm('¿Eliminar la publicación reportada? No se puede deshacer.')) return;
  if(_modSealed()){ toast('🔒 (dev) sellado en localhost'); return; }
  try{
    const cli=AUTH.client(); if(!cli)return;
    const { error } = await cli.rpc('cmty_mod_delete_post', { p_post: pid });
    if(error) throw error;
    // borrar el post cierra el reporte también
    await cli.rpc('cmty_mod_resolve', { p_report: rid });
    _modReports=_modReports.filter(x=>x.rid!==rid);
    toast('🗑️ Publicación eliminada');
    openReportsInbox(); renderReportsCard();
  }catch(e){ toast('No pude eliminar la publicación.'); if(typeof warn==='function')warn('mod delete:',e&&e.message); }
}
