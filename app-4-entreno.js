// ══════════════════════ EXERCISES ══════════════════════
let exF='all';
function buildFilterBtns(containerId,handler){
  const cats=['all','pecho','espalda','hombros','biceps','triceps','piernas','gluteo','core','cardio','otro'];
  const labels={all:'Todos',pecho:'Pecho',espalda:'Espalda',hombros:'Hombros',biceps:'Bíceps',triceps:'Tríceps',piernas:'Piernas',gluteo:'Glúteo',core:'Core',cardio:'Cardio',otro:'Otro'};
  const con=document.getElementById(containerId);if(!con)return;con.innerHTML='';
  cats.forEach(cat=>{
    const b=document.createElement('button');b.className='btn bg bsm';b.textContent=labels[cat];
    if(cat==='all'){b.style.background='var(--gl)';b.style.color='var(--gt)';b.style.borderColor='var(--g2)'}
    b.onclick=()=>handler(cat,b);con.appendChild(b);
  });
}
function styleFilterBtns(containerId,activeEl){
  const con=document.getElementById(containerId);if(!con)return;
  con.querySelectorAll('.btn').forEach(b=>{b.style.background='';b.style.color='';b.style.borderColor=''});
  activeEl.style.background='var(--gl)';activeEl.style.color='var(--gt)';activeEl.style.borderColor='var(--g2)';
}
function exFilter(muscle,el){exF=muscle;styleFilterBtns('exf',el);renderExercises()}
function renderExercises(){
  const grid=document.getElementById('ex-grid');
  const filtered=DB.exercises.filter(e=>exF==='all'||e.muscle===exF);
  grid.innerHTML='';
  filtered.forEach(ex=>{
    const color=MC[ex.muscle]||'#6B6B6B';const div=document.createElement('div');div.className='exc';
    div.innerHTML=`<div style="display:flex;align-items:flex-start;gap:9px;margin-bottom:8px"><div style="width:36px;height:36px;border-radius:8px;background:${color}18;border:1.5px solid ${color}30;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;overflow:hidden">${exIcon(ex)}</div><div style="flex:1"><div style="font-size:13px;font-weight:700">${esc(ex.name)}</div><div style="font-size:11px;color:var(--t2)">${ex.muscleLabel||ex.muscle} · ${ex.type}</div></div><div style="display:flex;gap:4px"><button class="btn bg bsm" style="padding:3px 8px;font-size:11px" title="Ver detalle" onclick="openExDetail('${ex.id}',true)">👁</button><button class="btn bg bsm" style="padding:3px 8px;font-size:11px" onclick="openEditEx('${ex.id}')">✏️</button></div></div><span class="tag" style="background:${color}15;color:${color};border:1px solid ${color}30;font-size:11px">${ex.sets}×${ex.reps}</span>${ex.desc?`<div style="font-size:11px;color:var(--t3);margin-top:6px;line-height:1.4">${esc(ex.desc.slice(0,80))}${ex.desc.length>80?'...':''}</div>`:''}`;
    grid.appendChild(div);
  });
  if(!filtered.length)grid.innerHTML='<div class="empty" style="grid-column:1/-1"><div class="eico">🏋️</div><div class="etxt">Sin ejercicios aquí</div><div class="esub">Añade uno con el botón de arriba</div></div>';
}
function openAddEx(){CUR.editExId=null;document.getElementById('m-ex-title').textContent='Nuevo ejercicio';['ex-n','ex-d','ex-i'].forEach(id=>document.getElementById(id).value='');document.getElementById('ex-s').value='3';document.getElementById('ex-r').value='12';document.getElementById('ex-m').value='pecho';document.getElementById('ex-t').value='Compuesto';['ex-hiit-work','ex-hiit-rest','ex-hold-secs'].forEach(id=>document.getElementById(id).value='');exFormSync();om('m-ex')}
function openEditEx(id){
  const ex=DB.exercises.find(e=>e.id===id);if(!ex)return;CUR.editExId=id;
  document.getElementById('m-ex-title').textContent='Editar ejercicio';
  document.getElementById('ex-n').value=ex.name;document.getElementById('ex-m').value=ex.muscle;document.getElementById('ex-t').value=ex.type;
  document.getElementById('ex-s').value=ex.sets;document.getElementById('ex-r').value=ex.reps;document.getElementById('ex-i').value=ex.icon||'';document.getElementById('ex-d').value=ex.desc||'';
  document.getElementById('ex-hiit-work').value=(ex.hiit&&ex.hiit.work)||'';document.getElementById('ex-hiit-rest').value=(ex.hiit&&ex.hiit.rest)||'';document.getElementById('ex-hold-secs').value=ex.holdSecs||'';
  exFormSync();om('m-ex');
}
function saveEx(){
  const name=document.getElementById('ex-n').value.trim();if(!name){toast('⚠️ El nombre es obligatorio');return}
  const muscle=document.getElementById('ex-m').value;
  const type=document.getElementById('ex-t').value;
  const data={name,muscle,type,sets:parseInt(document.getElementById('ex-s').value)||3,reps:parseInt(document.getElementById('ex-r').value)||12,icon:document.getElementById('ex-i').value.trim()||ME[muscle]||'💪',desc:document.getElementById('ex-d').value.trim()};
  // Config por modalidad
  data.hiit=type==='HIIT'?{work:parseInt(document.getElementById('ex-hiit-work').value)||30,rest:parseInt(document.getElementById('ex-hiit-rest').value)||15}:null;
  data.holdSecs=type==='Isométrico'?(parseInt(document.getElementById('ex-hold-secs').value)||60):null;
  if(CUR.editExId){const i=DB.exercises.findIndex(e=>e.id===CUR.editExId);if(i!==-1)DB.exercises[i]={...DB.exercises[i],...data};toast(`✅ "${name}" actualizado`)}
  else{DB.exercises.push({id:uid(),...data});toast(`✅ "${name}" añadido`)}
  sv('ax_e',DB.exercises);cm('m-ex');renderExercises();renderHome();
}

// ══════════════════════ CLIENT VIEW ══════════════════════
function initClientView(client){
  const h=new Date().getHours();
  document.getElementById('cn-greet').textContent=(h<13?'Buenos días':h<20?'Buenas tardes':'Buenas noches')+', '+client.name.split(' ')[0]+'!';
  document.querySelectorAll('.cntab').forEach(t=>t.classList.remove('on'));document.querySelector('.cntab').classList.add('on');
  document.querySelectorAll('.cnp').forEach(p=>p.classList.remove('on'));document.getElementById('cn-today').classList.add('on');
  document.getElementById('rest-banner').classList.add('hide');
  if(!DB.prs)DB.prs=ld('ax_pr',{});if(!DB.bodyweight)DB.bodyweight=ld('ax_bw',{});
  // Fase 2 (perf móvil): en el login solo pintamos lo VISIBLE ("Hoy") + el badge de mensajes.
  // Perfil, Historial, Rutinas y Mensajes se pintan en cnTab al abrir su pestaña (lazy),
  // sacando 4 renders pesados (gráficas SVG, listas largas) de la ruta crítica de arranque.
  renderClientToday(client);updateMsgBadge(client.id);
  // (Eliminada la pantalla vieja "Cuéntanos de ti"/#profile-ob 2026-06-09: el wizard premium
  // de 7 pasos ya captura el perfil; si faltaran datos se genera con defaults y el usuario
  // puede regenerar desde Rutinas. Una sola onboarding = el wizard.)
  // Show onboarding on first login — data wizard first, educational after.
  // Si no hay onboarding pendiente (asesorado que regresa), damos la bienvenida personalizada.
  // Deep-link desde los app shortcuts de Android (manifest "shortcuts" → ?go=…).
  const _goId={hoy:'cn-today',rutinas:'cn-routines',mensajes:'cn-messages',progreso:'cn-history',perfil:'cn-profile'}[new URLSearchParams(location.search).get('go')];
  if(shouldShowDataOnboarding(client.id)){
    setTimeout(()=>showDataOnboarding(client.id), 400);
  } else if(shouldShowOnboarding(client.id)){
    setTimeout(()=>showOnboarding(client.id), 400);
  } else if(!_goId){
    // El "welcome de vuelta" se omite si entró directo a una pestaña por un acceso directo.
    setTimeout(()=>showClientWelcome(client), 350);
  }
  if(_goId){
    const _order=['cn-today','cn-routines','cn-messages','cn-history','cn-profile'];
    const _tab=document.querySelectorAll('.cntab')[_order.indexOf(_goId)];
    if(_tab)setTimeout(()=>{ cnTab(_goId,_tab); if(_goId==='cn-messages')markMsgsRead(); },450);
  }
}

// Momento de bienvenida personalizado al entrar — saluda por su nombre y
// conecta con el coach y con el día de hoy. Nuestra alma, no la de Nike.
function showClientWelcome(client){
  const el=document.getElementById('cwelcome'); if(!el||!client) return;
  const first=esc((client.name||'').split(' ')[0]||'crack');
  const h=new Date().getHours();
  const hi=h<13?'¡Buenos días':(h<20?'¡Buenas tardes':'¡Buenas noches');
  document.getElementById('cw-hi').innerHTML=`${hi}, <b>${first}</b>!`;
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const today=days[new Date().getDay()];
  const rt=(client.routines||[]).find(r=>r.day===today);
  let line;
  if(rt && rt.day!=='Libre'){
    line=`Hoy te toca <b>${esc(rt.name||'entrenar')}</b>. Tu coach la preparó para ti.`;
  } else if((client.routines||[]).length){
    line='Hoy es tu día de descanso. Recupera fuerzas y vuelve con todo 💪';
  } else {
    line='Tu coach está armando tu plan. En nada lo tienes listo 💪';
  }
  document.getElementById('cw-line').innerHTML=line;
  el.classList.add('on');
  clearTimeout(window._cwTimer);
  window._cwTimer=setTimeout(hideClientWelcome, 5200);
}
function hideClientWelcome(){
  const el=document.getElementById('cwelcome'); if(el)el.classList.remove('on');
  clearTimeout(window._cwTimer);
}

function cnTab(id,el){
  document.querySelectorAll('.cnp').forEach(p=>p.classList.remove('on'));document.querySelectorAll('.cntab').forEach(t=>t.classList.remove('on'));
  document.getElementById(id).classList.add('on');if(el)el.classList.add('on');
  // Re-render sections that depend on visible width or live data
  if(id==='cn-today'&&CUR.clientId){
    const c=DB.clients.find(x=>x.id===CUR.clientId);
    const _days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const _tod=_days[new Date().getDay()];
    if(cnTodayGuard(CUR,_tod,!!c)){renderClientToday(c);}
  }
  if(id==='cn-profile'&&CUR.clientId){
    const c=DB.clients.find(x=>x.id===CUR.clientId);
    if(c){renderClientProfile(c);}
    setTheme(ld('ax_theme','dark'));
  }
  if(id==='cn-history'&&CUR.clientId){
    renderClientHistory(CUR.clientId);
  }
  if(id==='cn-routines'&&CUR.clientId){
    const c=DB.clients.find(x=>x.id===CUR.clientId);
    if(c)renderClientAllRoutines(c);
  }
  if(id==='cn-messages'&&CUR.clientId){
    renderClientMsgs(CUR.clientId);
  }
}

// PROFILE

// ══════════ BODY WEIGHT ══════════
function logBodyWeight(){
  const val=parseFloat(document.getElementById('bw-kg').value);
  if(!val||val<20||val>300){toast('⚠️ Ingresa un peso válido (20–300 kg)');return;}
  const clientId=CUR.clientId;if(!clientId)return;
  if(!DB.bodyweight[clientId])DB.bodyweight[clientId]=[];
  const today=new Date().toISOString().split('T')[0];
  // Update today's entry or push new
  const idx=DB.bodyweight[clientId].findIndex(e=>e.date===today);
  if(idx>-1)DB.bodyweight[clientId][idx].kg=val;
  else DB.bodyweight[clientId].unshift({date:today,kg:val});
  DB.bodyweight[clientId].sort((a,b)=>new Date(b.date)-new Date(a.date));
  if(DB.bodyweight[clientId].length>52)DB.bodyweight[clientId]=DB.bodyweight[clientId].slice(0,52);
  sv('ax_bw',DB.bodyweight);
  document.getElementById('bw-kg').value='';
  renderBodyWeightSection(clientId);
  toast('⚖️ Peso registrado');
}

function renderBodyWeightSection(clientId){
  if(!DB.bodyweight)DB.bodyweight=ld('ax_bw',{});
  const entries=(DB.bodyweight[clientId]||[]).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  const listEl=document.getElementById('bw-list');
  const chartWrap=document.getElementById('bw-chart-wrap');
  const summEl=document.getElementById('bw-summary');
  if(!listEl)return;

  if(!entries.length){
    listEl.innerHTML='<div style="color:var(--t3);font-size:13px;text-align:center;padding:10px 6px;line-height:1.6">Aún no has anotado tu peso. Anótalo de vez en cuando (no todos los días) y verás cómo cambia con el tiempo ⚖️</div>';
    if(chartWrap)chartWrap.style.display='none';
    return;
  }

  // Chart
  if(chartWrap&&entries.length>=2){
    chartWrap.style.display='block';
    const W=Math.max(chartWrap.offsetWidth||window.innerWidth-64||280,200);const H=75;
    const vals=entries.map(e=>e.kg);
    const maxV=Math.max(...vals);const minV=Math.min(...vals);
    const pad=8;const cW=W-pad*2;const cH=H-16;
    const pts=entries.map((e,i)=>({
      x:pad+i*(cW/(entries.length-1||1)),
      y:8+cH-((e.kg-minV)/(maxV-minV||1))*cH,
      e
    }));
    const pathD=pts.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaD=`${pathD} L${pts[pts.length-1].x.toFixed(1)},${H} L${pts[0].x.toFixed(1)},${H} Z`;
    const trend=entries[entries.length-1].kg-entries[0].kg;
    const trendColor=trend<0?'#0A7C5B':trend>0?'#E76F51':'#888';
    const lineColor=trend<=0?'#0A7C5B':'#E76F51';
    document.getElementById('bw-chart').innerHTML=`<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="bwg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${lineColor}" stop-opacity="0.15"/><stop offset="100%" stop-color="${lineColor}" stop-opacity="0"/></linearGradient></defs>
      <path d="${areaD}" fill="url(#bwg)"/>
      <path d="${pathD}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${pts.map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${lineColor}"/>`).join('')}
    </svg>`;
    if(summEl){
      const arrow=trend<0?'↓':trend>0?'↑':'→';
      summEl.innerHTML=`Inicio: <strong>${entries[0].kg}kg</strong> · Actual: <strong>${entries[entries.length-1].kg}kg</strong> · <span style="color:${trendColor};font-weight:700">${arrow} ${Math.abs(trend).toFixed(1)}kg</span>`;
    }
  }

  // List (recent first)
  const recents=[...entries].reverse().slice(0,8);
  const first=entries[0].kg;
  listEl.innerHTML=recents.map((e,i)=>{
    const delta=e.kg-first;
    const isToday=e.date===new Date().toISOString().split('T')[0];
    const deltaStr=i===recents.length-1?'':(delta===0?'':`<span class="wlog-delta" style="background:${delta<0?'var(--gl)':'var(--orl)'};color:${delta<0?'var(--g)':'var(--or)'}">${delta>0?'+':''}${delta.toFixed(1)}</span>`);
    return `<div class="wlog-row">
      <div class="wlog-date">${isToday?'<strong>Hoy</strong>':new Date(e.date+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}</div>
      <div class="wlog-kg">${e.kg} kg</div>
      ${deltaStr}
      <button onclick="deleteBodyWeight('${e.date}')" style="width:20px;height:20px;border:none;background:none;cursor:pointer;color:var(--t3);font-size:14px;padding:0;line-height:1">✕</button>
    </div>`;
  }).join('');
}

function deleteBodyWeight(date){
  const clientId=CUR.clientId;if(!clientId)return;
  DB.bodyweight[clientId]=(DB.bodyweight[clientId]||[]).filter(e=>e.date!==date);
  sv('ax_bw',DB.bodyweight);
  renderBodyWeightSection(clientId);
}

// ══════════ PERSONAL RECORDS ══════════
function checkAndUpdatePRs(routine){
  const clientId=CUR.clientId;if(!clientId)return[];
  if(!DB.prs[clientId])DB.prs[clientId]={};
  const newPRs=[];
  (routine.exercises||[]).forEach((ex,ei)=>{
    const sets=parseInt(ex.sets)||3;
    const track=exTrack(ex);
    // El récord se mide según la modalidad: kg (peso), reps (corporal),
    // segundos (isométrico), minutos totales (cardio), rondas (HIIT).
    // Construye las series HECHAS (lee del DOM/estado) y deja el cálculo a apex-core.
    const doneSets=[];
    for(let si=0;si<sets;si++){
      if(!isDone(routine.id,ei,si))continue;
      doneSets.push({
        kg:getLog(routine.id,ei,si,'kg'),
        reps:parseInt(getLog(routine.id,ei,si,'reps'))||parseInt(ex.reps)||0,
        secs:getLog(routine.id,ei,si,'secs'),
        min:getLog(routine.id,ei,si,'min'),
      });
    }
    const pr=prFromSets(doneSets,track);
    if(!pr)return;
    const {val,reps,unit}=pr;
    const key=ex.id||ex.name;
    const prev=DB.prs[clientId][key];
    const prevVal=prev?(prev.val!=null?prev.val:prev.kg):null;
    if(isBetterPR(val,reps,unit,prev)){
      const isNew=!prev;
      DB.prs[clientId][key]={val,unit,reps,kg:unit==='kg'?val:0,date:new Date().toISOString(),name:ex.name,icon:ex.icon||'💪',muscle:ex.muscle};
      newPRs.push({name:ex.name,val,unit,reps,icon:ex.icon||'💪',isNew,prev:prevVal});
    }
  });
  if(newPRs.length){sv('ax_pr',DB.prs);}
  return newPRs;
}


// Récords personales: si hay pocos (≤3) se muestran todos; si son muchos, se
// colapsan (asoman 2) para que el perfil no quede larguísimo. _prsOpen guarda el
// estado dentro de la sesión.
let _prsOpen=false;
function togglePRs(){_prsOpen=!_prsOpen;renderPRsInProfile(CUR.clientId);}
function _prRowHtml(pr){
  // 1RM estimado (Epley) solo para récords de peso con >1 rep — si es 1 rep el récord YA
  // es el 1RM, y reps fuera de rango devuelven null (no se muestra). Es una estimación.
  const isKg=(pr.unit||'kg')==='kg';
  const e1=isKg&&pr.reps>1?estimate1RM(pr.val!=null?pr.val:pr.kg,pr.reps):null;
  return `<div class="pr-row">
    <div class="pr-ex-icon" style="background:${MC[pr.muscle]||'#ccc'}20">${muscleIcon(pr.muscle,20)}</div>
    <div style="flex:1;min-width:0">
      <div class="pr-ex-name">${esc(pr.name)}</div>
      <div class="pr-ex-date">${new Date(pr.date).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}</div>
    </div>
    <div style="text-align:right">
      <div class="pr-ex-val">${fmtMetric(pr.val!=null?pr.val:pr.kg,pr.unit||'kg')}</div>
      <div style="font-size:10px;color:var(--t2)">${isKg?`${pr.reps} reps`:'récord'}</div>
      ${e1?`<div style="font-size:9.5px;color:var(--t3);margin-top:1px">≈ ${Math.round(e1)}kg · 1RM est.</div>`:''}
    </div>
  </div>`;}
function renderPRsInProfile(clientId){
  if(!DB.prs)DB.prs=ld('ax_pr',{});
  const con=document.getElementById('cn-pr-list');if(!con)return;
  if(isFreeClient(DB.clients.find(x=>x.id===clientId))){con.innerHTML=premiumLockHTML('Tus récords (PRs)','Lleva el registro de tus marcas personales por ejercicio.');return;}
  const prs=DB.prs[clientId]||{};
  const list=Object.values(prs).sort((a,b)=>new Date(b.date)-new Date(a.date));
  if(!list.length){
    con.innerHTML='<div style="color:var(--t3);font-size:13px;text-align:center;padding:12px 0">Completa sesiones para ver tus récords 💪</div>';
    return;
  }
  const COLLAPSE_AT=3, PEEK=2;
  if(list.length>COLLAPSE_AT && !_prsOpen){
    con.innerHTML=list.slice(0,PEEK).map(_prRowHtml).join('')+
      `<button class="collapse-more" onclick="togglePRs()">Ver mis ${list.length} récords ▾</button>`;
  } else {
    con.innerHTML=list.map(_prRowHtml).join('')+
      (list.length>COLLAPSE_AT?`<button class="collapse-more" onclick="togglePRs()">Ver menos ▴</button>`:'');
  }
}

function renderClientProfile(client){
  renderCoachUpsell(client);
  renderGoogleLink();
  // Current weight from bodyweight log (most recent entry)
  const bwEntries=DB.bodyweight[client.id]||[];
  const currentKg=bwEntries.length?bwEntries[0].kg:client.weight;
  const avInner=client.avatar?`<img class="profav-img" src="${esc(client.avatar)}" alt="">`:ini(client.name);
  document.getElementById('cn-prof-card').innerHTML=`<div class="profav tap" onclick="openAvatarPicker()" title="${client.avatar?'Cambiar foto':'Agregar foto'}">${avInner}<div class="profav-cam">📷</div></div><div><div class="profname">${esc(client.name)}</div><div class="profmeta">${esc(client.email)}</div><div class="profpills">${client.goal?`<span class="profpill">🎯 ${esc(client.goal)}</span>`:''}${client.level?`<span class="profpill">📊 ${esc(client.level)}</span>`:''}<span class="profpill">📅 ${esc(String(client.days||3))} días/sem</span>${currentKg?`<span class="profpill">⚖️ ${currentKg}kg</span>`:''}</div>${client.avatar?`<div class="profrm" onclick="removeAvatar()">✕ Quitar foto</div>`:''}</div></div>`;
  const rows=[['🎯 Objetivo',client.goal],['📊 Nivel',client.level],['📅 Días de entreno',`${client.days} días por semana`],currentKg?['⚖️ Peso actual',`${currentKg} kg`]:null,client.notes?['📝 Nota del coach',client.notes]:null].filter(Boolean);
  document.getElementById('cn-prof-data').innerHTML=rows.map(([l,v])=>`<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--br)"><span style="font-size:13px;color:var(--t2)">${l}</span><span style="font-size:13px;font-weight:600;text-align:right;max-width:60%">${esc(String(v||''))}</span></div>`).join('');
  renderPaymentCard(client);
  renderGamification(client);
  renderBodyWeightSection(client.id);
  renderPRsInProfile(client.id);
  renderClientExProgress(client.id);
  renderMedidasClient(client.id);
  renderNutritionClient(client.id);
  renderPhotosClient(client.id);
  renderAccountActions(client);
  applyProfileDisclosure(client.id);
}

// Tarjeta "Cuenta" → eliminar cuenta (derecho de supresión / requisito Play Store).
// El borrado real lo hace la Edge Function delete-account (service role): borra
// user_data + push_subscriptions + auth.users (irreversible). Solo se muestra a
// asesorados reales en modo auth. El coach (incl. su propio entrenamiento COACH_SELF)
// NO la ve: su cuenta arrastraría las filas de todos sus asesorados — la Edge Function
// también la protege por COACH_UID.
function renderAccountActions(client){
  const el=document.getElementById('cn-danger-card'); if(!el)return;
  if(!AUTH_MODE||COACH_SELF||AUTH_ROLE==='coach'){ el.innerHTML=''; return; }
  el.innerHTML=`<div class="card" style="margin-bottom:12px">
    <div class="ch"><div class="ctitle">Cuenta</div></div>
    <div class="cb">
      <div style="font-size:12px;color:var(--t2);line-height:1.55;margin-bottom:12px">Eliminar tu cuenta borra de forma permanente tu perfil, rutinas, progreso, medidas y fotos. No se puede deshacer.</div>
      <button class="btn bsm" onclick="openDeleteAccount()" style="background:transparent;color:var(--rd);border:1.5px solid var(--rd);font-weight:700">🗑️ Eliminar mi cuenta</button>
    </div>
  </div>`;
}

// ── Borrado de cuenta self-service (requisito Google Play) ──
// Llama la Edge Function delete-account, que borra user_data + push_subscriptions
// + auth.users con service role. Tras el OK, limpia el rastro local y recarga.
function delacctCheck(el){ const b=document.getElementById('delacct-go'); if(b)b.disabled=(el.value.trim()!=='ELIMINAR'); }
function openDeleteAccount(){
  if(!AUTH_MODE){ toast('Disponible solo con sesión iniciada'); return; }
  if(COACH_SELF||AUTH_ROLE==='coach'){ toast('La cuenta del coach no se elimina desde aquí'); return; }
  const i=document.getElementById('delacct-confirm'); if(i)i.value='';
  const b=document.getElementById('delacct-go'); if(b)b.disabled=true;
  const e=document.getElementById('delacct-err'); if(e)e.style.display='none';
  om('m-delacct');
}
async function confirmDeleteAccount(){
  const btn=document.getElementById('delacct-go');
  const err=document.getElementById('delacct-err');
  if(err)err.style.display='none';
  const c=(typeof AUTH!=='undefined')?AUTH.client():null;
  if(!c){ if(err){err.textContent='No hay conexión con el servidor. Intenta de nuevo.';err.style.display='block';} return; }
  if(btn){ btn.disabled=true; btn.textContent='Eliminando…'; }
  try{
    const { data, error } = await c.functions.invoke('delete-account',{ body:{} });
    if(error) throw new Error(error.message||'Error de red');
    if(!data || !data.ok) throw new Error((data&&data.error)||'No se pudo eliminar');
    // Éxito: cerrar sesión y borrar todo rastro local antes de recargar al login.
    try{ await AUTH.signOut(); }catch(_e){}
    try{ Object.keys(localStorage).forEach(k=>{ if(/^(ax_|avi_|apex)/.test(k)) localStorage.removeItem(k); }); }catch(_e){}
    cm('m-delacct');
    toast('Tu cuenta fue eliminada');
    setTimeout(()=>{ location.reload(); }, 900);
  }catch(e){
    if(btn){ btn.disabled=false; btn.textContent='Eliminar definitivamente'; }
    if(err){ err.textContent='No se pudo eliminar ('+((e&&e.message)||e)+'). Intenta de nuevo.'; err.style.display='block'; }
  }
}

// El asesorado puede poner su propia foto de perfil (opcional). Tap en el avatar
// abre el selector; se comprime, se sube al bucket (con respaldo base64) y se
// guarda en client.avatar para que sincronice y la vea también el coach.
function openAvatarPicker(){
  const inp=document.createElement('input');
  inp.type='file';inp.accept='image/*';
  inp.onchange=()=>{if(inp.files&&inp.files[0])saveAvatar(inp.files[0]);};
  inp.click();
}
function saveAvatar(file){
  const clientId=CUR.clientId;if(!clientId)return;
  const client=DB.clients.find(c=>c.id===clientId);if(!client)return;
  const reader=new FileReader();
  reader.onload=async e=>{
    toast('⏳ Subiendo foto...');
    const small=await compressImage(e.target.result,40000);
    let src=small;
    try{src=(await uploadPhotoToStorage(clientId,'avatar',small))+'?v='+Date.now();}
    catch(err){warn('AVI avatar upload failed, keeping base64',err.message);}
    client.avatar=src;
    svNow('ax_c',DB.clients);
    renderClientProfile(client);
    toast('📸 Foto de perfil actualizada');
  };
  reader.readAsDataURL(file);
}
function removeAvatar(){
  const clientId=CUR.clientId;if(!clientId)return;
  const client=DB.clients.find(c=>c.id===clientId);if(!client||!client.avatar)return;
  if(!confirm('¿Quitar tu foto de perfil? Volverás a ver tus iniciales.'))return;
  delete client.avatar;
  svNow('ax_c',DB.clients);
  deletePhotoFromStorage(clientId,'avatar');
  renderClientProfile(client);
  toast('Foto quitada');
}

// ══════════════════════ GAMIFICACIÓN (nivel permanente + descuento del mes) ══════════════════════
// GX_LEVELS, gxLevel, gxDiscount, gxNextTier → apex-core.js (fuente única de verdad, con tests)
function renderGamification(client){
  const con=document.getElementById('cn-gamif'); if(!con)return;
  const hist=(DB.history||{})[client.id]||[];
  const pays=(client.payments||[]);
  if(!hist.length && !pays.length){ con.innerHTML=''; return; } // asesorado nuevo: nada que mostrar aún
  const total=hist.length;
  const totalVol=hist.reduce((s,h)=>s+(h.totalVol||0),0);
  const L=gxLevel(total);
  const prs=Object.keys((DB.prs||{})[client.id]||{}).length;
  // ── Tarjeta descuento del mes ──
  const d=gxDiscount(client,hist);
  let monthHTML='';
  if(d){
    const nt=gxNextTier(d);
    const circ=Math.round(d.adh*100);
    const renewStr=d.renewal.toLocaleDateString('es-ES',{day:'numeric',month:'long'});
    const infoTxt = nt
      ? `Llevas <b>${d.done} de ${d.expected}</b> sesiones de este mes (${circ}%). Te ${nt.need===1?'falta':'faltan'} <b>${nt.need}</b> para subir a <b>${nt.pct}% de descuento</b> en tu renovación. 💪`
      : `¡Mes perfecto! Tienes <b>15% de descuento</b> asegurado en tu renovación. 🏆`;
    monthHTML=`<div class="gx-month">
      <div class="gx-mtop">
        <div><div class="gx-k">🎁 Descuento de este mes</div><div class="gx-renew">Renueva el <b>${renewStr}</b>${d.daysLeft>0?` · faltan ${d.daysLeft} días`:' · hoy'}</div></div>
        <div class="gx-pct"><b>${d.pct}%</b><small>DESBLOQUEADO</small></div>
      </div>
      <div class="gx-mbar"><div class="gx-mfill" style="width:${circ}%"></div></div>
      <div class="gx-tiers">
        <div class="gx-tier${d.pct>=5?' on':''}"><b>5%</b>60% del plan</div>
        <div class="gx-tier${d.pct>=10?' on':''}"><b>10%</b>80%</div>
        <div class="gx-tier${d.pct>=15?' on':''}"><b>15%</b>100%</div>
      </div>
      <div class="gx-minfo">${infoTxt}</div>
    </div>`;
  }
  // ── Tarjeta de nivel ──
  const circ2=276.5, off=circ2*(1-L.pct/100);
  const progHTML = L.next
    ? `<div class="gx-prog"><div class="gx-pbar"><div class="gx-pfill" style="width:${L.pct}%"></div></div>
        <div class="gx-plbl"><span>Te ${L.rem===1?'falta':'faltan'} <b>${L.rem} entreno${L.rem===1?'':'s'}</b> para <b>${esc(L.next.name)}</b></span><span>${total}/${L.next.min}</span></div></div>`
    : `<div class="gx-prog"><div class="gx-plbl"><span>Has llegado al nivel máximo 🏆</span><span>${total} entrenos</span></div></div>`;
  const volTxt = totalVol>=1000?`${(totalVol/1000).toFixed(1)}<span class="u">k kg</span>`:`${totalVol}<span class="u"> kg</span>`;
  const lvlHTML=`<div class="gx-lvl">
    <div class="gx-ltop">
      <div class="gx-ring"><svg viewBox="0 0 100 100" style="width:100%;height:100%;transform:rotate(-90deg)"><circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="7"/><circle cx="50" cy="50" r="44" fill="none" stroke="#10E0A0" stroke-width="7" stroke-linecap="round" stroke-dasharray="${circ2}" stroke-dashoffset="${off.toFixed(1)}" style="filter:drop-shadow(0 0 5px rgba(16,224,160,.6))"/></svg><div class="gx-num"><b>${L.cur.n}</b><small>NIVEL</small></div></div>
      <div class="gx-lname"><div class="gx-lk">Tu nivel</div><div class="gx-lt">${esc(L.cur.name)}</div><div class="gx-ls">Tu historia en AVI — no se reinicia. Sigue subiendo 🔥</div></div>
    </div>
    ${progHTML}
    <div class="gx-stats">
      <div class="gx-stat"><div class="gx-sv">${total}</div><div class="gx-sl">ENTRENAMIENTOS</div></div>
      <div class="gx-stat"><div class="gx-sv">${volTxt}</div><div class="gx-sl">VOLUMEN TOTAL</div></div>
    </div>
  </div>`;
  // ── Logros ──
  const B=[
    {ic:'🏆',nm:'Primer récord',on:prs>=1,gold:true},
    {ic:'✅',nm:'10 entrenos',on:total>=10},
    {ic:'🎖️',nm:'30 entrenos',on:total>=30},
    {ic:'💪',nm:'10.000 kg',on:totalVol>=10000,gold:true},
    {ic:'⭐',nm:'Mes perfecto',on:!!(d&&d.pct>=15)},
    {ic:'🔩',nm:'20.000 kg',on:totalVol>=20000},
    {ic:'🥇',nm:'Nivel 3',on:L.cur.n>=3,gold:true},
    {ic:'👑',nm:'Imparable',on:L.cur.n>=4,gold:true},
  ];
  const badgesHTML=`<div class="gx-title">Tus logros</div><div class="gx-badges">${B.map(b=>`<div class="gx-badge ${b.on?(b.gold?'gold':''):'lock'}"><div class="gx-bic">${b.on?b.ic:'🔒'}</div><div class="gx-bn">${esc(b.nm)}</div></div>`).join('')}</div>`;
  con.innerHTML=monthHTML+lvlHTML+badgesHTML;
}

// Progressive disclosure del Perfil: para un asesorado nuevo, oculta las tarjetas de
// solo-lectura vacías (récords, nutrición sin asignar) y deja el seguimiento
// personal (peso/medidas/fotos) colapsado. Se revela solo cuando hay contenido real.
function applyProfileDisclosure(clientId){
  const show=(id,cond)=>{const el=document.getElementById(id);if(el)el.style.display=cond?'':'none';};
  const hist=(DB.history||{})[clientId]||[];
  const prs=(DB.prs||{})[clientId]||{};
  const nut=(DB.nutrition||{})[clientId];
  const hasNut=!!(nut&&(nut.kcal||nut.plan||nut.examples));
  const bw=(DB.bodyweight||{})[clientId]||[];
  const med=(DB.medidas||{})[clientId]||[];
  const ph=(DB.photos||{})[clientId]||[];
  show('cn-pr-card', Object.keys(prs).length>0);
  show('cn-nut-card', hasNut);
  // Seguimiento personal: abierto si ya hay datos; colapsado si está todo vacío.
  const ttBody=document.getElementById('tt-body'), ttChev=document.getElementById('tt-chev');
  const hasTracking=bw.length||med.length||ph.length;
  if(ttBody){ttBody.style.display=hasTracking?'block':'none';}
  if(ttChev){ttChev.style.transform=hasTracking?'rotate(180deg)':'rotate(0deg)';}
}
function toggleTrackingTools(){
  const body=document.getElementById('tt-body'), chev=document.getElementById('tt-chev');
  if(!body)return;
  const open=body.style.display==='none';
  body.style.display=open?'block':'none';
  if(chev)chev.style.transform=open?'rotate(180deg)':'rotate(0deg)';
}

// TODAY
// Cabecera del "Hoy": saludo grande con el nombre + chip de racha (días seguidos
// entrenando). La racha la calcula workoutStreak (apex-core, testeado).
function renderTodayHead(client){
  const el=document.getElementById('cn-today-head'); if(!el||!client)return;
  const h=new Date().getHours();
  const saludo=h<13?'Buenos días':h<20?'Buenas tardes':'Buenas noches';
  const name=esc((client.name||'').split(' ')[0]||'');
  const streak=workoutStreak((DB.history&&DB.history[client.id])||[], new Date());
  const chip=streak>0
    ? `<div class="streak-chip">🔥 <b>${streak}</b> día${streak!==1?'s':''} de racha</div>`
    : `<div class="streak-chip streak-0">💪 Empieza tu racha hoy</div>`;
  el.innerHTML=`<div class="today-greet"><div class="tg-hi">${saludo},</div><div class="tg-name">${name} 👋</div></div>${chip}`;
}

function renderClientToday(client, overrideRoutine){
  const con=document.getElementById('cn-today-body');
  renderTodayHead(client);
  renderCoachUpsell(client);
  const routines=client.routines||[];
  if(!routines.length){con.innerHTML='<div class="noroutine"><div style="font-size:32px;margin-bottom:10px">📋</div><div style="font-size:14px;font-weight:700;color:var(--gt);margin-bottom:6px">Tu plan aún está en preparación</div><div style="font-size:12px;color:var(--t2);margin-bottom:14px">Tu coach está personalizando tu rutina. Mientras tanto, puedes enviarle un mensaje.</div><button class="btn bp bsm" onclick="cnTab(\'cn-messages\',document.getElementById(\'tab-msgs\'))">Ir a mensajes →</button></div>';return}
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const today=days[new Date().getDay()];
  CUR.todayRenderedDay=today;
  const autoR=routines.find(r=>r.day===today)||routines.find(r=>r.day==='Libre');
  let baseR=overrideRoutine||autoR;
  const isOverride=!!overrideRoutine;
  // Recordamos la rutina mostrada para que el check-in (pickMood/changeMood)
  // re-renderice SIN perder la selección manual (ej. abrir una rutina de otro día).
  CUR.todayOverride=overrideRoutine||null;
  // Si el usuario reordenó/sustituyó hoy, usamos su copia de trabajo (misma rutina) para
  // que los cambios sobrevivan a los re-render (mood, etc.). El plan guardado no se toca.
  if(baseR&&CUR.todayWorking&&CUR.todayWorking.id===baseR.id)baseR=CUR.todayWorking;
  if(!baseR){
    con.innerHTML=`<div class="noroutine" style="text-align:center;padding:24px 16px">
      <div style="font-size:36px;margin-bottom:10px">💤</div>
      <div style="font-size:15px;font-weight:800;color:var(--gt);margin-bottom:5px">Hoy es tu día de descanso</div>
      <div style="font-size:13px;color:var(--t2);margin-bottom:14px">El descanso es parte del entrenamiento. Hoy tu cuerpo repara y crece — regresa mañana listo para rendir.</div>
      <button class="btn bp bsm" onclick="cnTab('cn-routines',document.querySelectorAll('.cntab')[1])">Ver todas mis rutinas →</button>
    </div>`;
    return;
  }
  // Check-in diario: si el asesorado ya marcó cómo se siente hoy, la rutina se
  // adapta (apex-core.applyMood, regla universal). Si no, mostramos el selector.
  // Guard de caché: si apex-core.js está viejo (sin applyMood), degradamos sin
  // check-in en vez de romper toda la vista de "Hoy".
  const _moodOK=(typeof applyMood==='function'&&typeof MOOD_STATES!=='undefined');
  const _mood=_moodOK?getTodayMood(client.id):'';
  const _adapted=_mood?applyMood(baseR,_mood,{sex:client.sex}):null;
  const todayR=_adapted||baseR;
  _rehomeOrphanDropsets(todayR); // si el check-in recortó series, no perder el dropset (reubicar a la última)
  const checkinHtml=!_moodOK?'':(_mood?moodBannerHtml(_adapted.adapt):moodChooserHtml(client));
  const totalSets=(todayR.exercises||[]).reduce((s,e)=>s+(parseInt(e.sets)||0),0);
  const overrideBanner=isOverride?`<div style="display:flex;align-items:center;justify-content:space-between;background:var(--bll);border:1px solid var(--bl);border-radius:var(--rsm);padding:9px 13px;margin-bottom:10px;font-size:12px;color:var(--bl)"><span>📋 Elegiste esta rutina manualmente</span>${autoR?`<button onclick="startRoutineNow('')" style="font-size:11px;font-weight:700;color:var(--bl);background:none;border:none;cursor:pointer;padding:0;text-decoration:underline">Volver a la de hoy</button>`:'Hoy no hay rutina asignada'}</div>`:'';
  const dayLabel=isOverride?`📋 RUTINA SELECCIONADA`:`⚡ ENTRENAMIENTO DE HOY · ${today.toUpperCase()}`;
  con.innerHTML=`${checkinHtml}${overrideBanner}<div class="wohero"><div class="woday">${dayLabel}</div><div class="woname">${esc(todayR.name)}</div><div class="wopills"><span class="wopill">${(todayR.exercises||[]).length} ejercicios</span><span class="wopill">${totalSets} series</span>${todayR.restSec?`<span class="wopill">⏱ ${todayR.restSec}s descanso</span>`:''}</div><button onclick="openGuidedMode()" style="margin-top:12px;width:100%;padding:13px;background:linear-gradient(135deg,var(--g),var(--g2));color:white;border:none;border-radius:12px;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:.3px">▶ Empezar — ejercicio a ejercicio</button><div id="wohero-prog-wrap" style="margin-top:11px;display:flex;align-items:center;gap:9px"><div style="flex:1;height:3px;background:rgba(255,255,255,.2);border-radius:2px;overflow:hidden"><div id="wohero-fill" style="height:100%;background:white;border-radius:2px;width:0%;transition:width .5s cubic-bezier(.22,.68,0,1.2)"></div></div><div id="wohero-num" style="font-size:11px;font-weight:700;opacity:.75;white-space:nowrap;font-family:'JetBrains Mono',monospace">0/${totalSets} series</div></div></div>${todayR.note?`<div style="background:rgba(242,201,76,.10);border:1px solid rgba(242,201,76,.35);border-radius:var(--r);padding:11px 14px;font-size:13px;color:var(--t1);margin-bottom:12px;line-height:1.5">💡 <strong style="color:#F2C94C">Nota:</strong> ${esc(todayR.note)}</div>`:''}${todayR.why?`<div style="background:var(--gl);border-left:3px solid var(--g2);border-radius:var(--rsm);padding:12px 14px;margin-bottom:14px;font-size:13px;color:var(--gt);line-height:1.6"><div style="font-size:11px;font-weight:700;letter-spacing:.5px;margin-bottom:4px;opacity:.7">POR QUÉ ESTA RUTINA</div>${esc(todayR.why)}</div>`:''}<div id="wu-wrap" style="margin-bottom:12px"></div><div id="cex-list"></div><div style="margin-top:7px;padding:13px 14px;background:var(--w);border:1px solid var(--br);border-radius:var(--r)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><div style="font-size:12px;color:var(--t2)">Progreso de hoy</div><div style="display:flex;align-items:center;gap:8px"><button onclick="resetSession()" style="font-size:10px;padding:3px 9px;border-radius:20px;border:1px solid var(--br2);background:var(--bg);color:var(--t3);cursor:pointer;font-family:inherit;font-weight:600;transition:all .15s" onmouseover="this.style.color='var(--rd)';this.style.borderColor='var(--rd)'" onmouseout="this.style.color='var(--t3)';this.style.borderColor='var(--br2)'">↺ Reiniciar</button><div style="font-size:22px;font-weight:800;color:var(--g)" id="prog-num">0/${totalSets}</div></div></div><div class="pbar" style="margin-bottom:6px"><div class="pfill" style="width:0%;background:var(--g)" id="prog-fill"></div></div><div style="font-size:12px;color:var(--g);font-family:'JetBrains Mono',monospace;font-weight:500;text-align:right" id="prog-vol"></div></div><button onclick="finishSessionEarly()" style="margin-top:10px;width:100%;padding:12px;background:var(--gl);color:var(--gt);border:1.5px solid var(--g2);border-radius:12px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer">✓ Finalizar entrenamiento</button>`;
  CUR.activeRoutine=todayR;
  renderWarmup(todayR.exercises||[]);
  renderClientExList(todayR);
}

// ── Check-in diario "¿cómo te sientes hoy?" ──
// El ánimo se guarda por asesorado y por día (localStorage). La lógica de
// adaptación vive en apex-core.applyMood (testeable); aquí solo UI + estado.
function _moodDay(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function moodKey(cid){return 'mood_'+cid+'_'+_moodDay();}
function moodAlertKey(cid){return 'moodalert_'+cid+'_'+_moodDay();}
function getTodayMood(cid){return localStorage.getItem(moodKey(cid))||'';}
function setTodayMood(cid,m){localStorage.setItem(moodKey(cid),m);}
function clearTodayMood(cid){localStorage.removeItem(moodKey(cid));}

// Identidad de color por estado (solo presentación; la lógica vive en core).
// Usa los tokens de marca para adaptarse a claro/oscuro; el periodo lleva un
// rosa propio (rgba) porque no hay token y así funciona en ambos temas.
const MOOD_COLORS={
  bien:    ['var(--g2)','var(--gl)'],
  energia: ['var(--or)','var(--orl)'],
  cansado: ['var(--bl)','var(--bll)'],
  estres:  ['var(--yl)','var(--yll)'],
  periodo: ['#E0668A','rgba(224,102,138,.14)'],
  dolor:   ['var(--rd)','var(--rdl)'],
};
function moodChooserHtml(client){
  const opts=MOOD_STATES.filter(m=>!m.femaleOnly||client.sex==='F');
  const btns=opts.map(m=>{
    const [mc,mct]=MOOD_COLORS[m.id]||['var(--g2)','var(--gl)'];
    return `<button class="mood-btn" style="--mc:${mc};--mct:${mct}" onclick="pickMood('${m.id}')" aria-label="${esc(m.label)}"><span class="mood-emoji">${m.emoji}</span><span class="mood-lbl">${esc(m.label)}</span></button>`;
  }).join('');
  return `<div class="checkin-card"><div class="checkin-q">¿Cómo te sientes hoy?</div><div class="checkin-sub">Ajustamos tu entrenamiento a cómo amaneciste.</div><div class="mood-grid">${btns}</div></div>`;
}
function moodBannerHtml(adapt){
  const map={g:['var(--gl)','var(--g2)','var(--gt)'],b:['var(--bll)','var(--bl)','var(--bl)'],r:['rgba(229,72,77,.10)','var(--rd)','var(--rd)']};
  const t=map[adapt.tone]||map.g;
  const chips=(adapt.changes&&adapt.changes.length)?`<div class="mood-chips">${adapt.changes.map(c=>`<span>${esc(c)}</span>`).join('')}</div>`:'';
  return `<div style="background:${t[0]};border:1px solid ${t[1]};border-left:3px solid ${t[1]};border-radius:var(--r);padding:12px 14px;margin-bottom:12px"><div style="font-size:14px;font-weight:800;color:${t[2]};margin-bottom:3px">${esc(adapt.title)}</div><div style="font-size:12.5px;color:var(--t1);line-height:1.5">${esc(adapt.why)}</div>${chips}<button onclick="changeMood()" style="margin-top:9px;font-size:11px;font-weight:700;color:var(--t3);background:none;border:none;cursor:pointer;padding:0;text-decoration:underline">Cambiar cómo me siento</button></div>`;
}
function pickMood(mood){
  const c=DB.clients.find(x=>x.id===CUR.clientId);if(!c)return;
  setTodayMood(c.id,mood);
  renderClientToday(c,CUR.todayOverride);
  const today=document.getElementById('cn-today');if(today)today.scrollTop=0;
  // Estados que requieren avisar al coach (hoy: dolor). La verdad vive en
  // apex-core.applyMood (adapt.flagCoach) → si mañana otro estado lo activa,
  // esto lo respeta sin tocar nada aquí.
  const flagCoach=applyMood({},mood,{}).adapt.flagCoach;
  if(flagCoach){
    notifyCoachMood(c);
    toast('🩺 Le avisamos a tu coach. Cuídate hoy.');
  } else {
    toast('✓ Ajustamos tu rutina a cómo te sientes');
  }
}
function changeMood(){
  const c=DB.clients.find(x=>x.id===CUR.clientId);if(!c)return;
  clearTodayMood(c.id);
  renderClientToday(c,CUR.todayOverride);
}
// Aviso real al coach cuando el cliente reporta dolor: crea un mensaje en el
// hilo (mismo camino que sendClientMsg) + push al coach ('_coach'). Guard por
// día para no spamear si el cliente cambia/re-marca el estado.
function notifyCoachMood(client){
  const cid=client.id;if(!cid)return;
  if(localStorage.getItem(moodAlertKey(cid)))return; // ya avisamos hoy
  localStorage.setItem(moodAlertKey(cid),'1');
  const name=client.name||'Tu asesorado';
  const text='🩺 '+name+' marcó que hoy entrena con dolor o molestia. Su rutina se ajustó a trabajo suave, sin carga. Conviene que lo revises.';
  if(!DB.msgs[cid])DB.msgs[cid]=[];
  DB.msgs[cid].push({from:'client',text,date:new Date().toISOString(),system:true});
  svNow('ax_m',DB.msgs);
  pushToClient('_coach','🩺 '+name+' tiene dolor hoy',text.length>80?text.slice(0,77)+'...':text,{type:'message',chatId:cid,tag:'avi-chat-coach'});
}

function startRoutineNow(routineId){
  const c=DB.clients.find(x=>x.id===CUR.clientId);if(!c)return;
  const routine=routineId?((c.routines||[]).find(r=>r.id===routineId)||null):null;
  const tabs=document.querySelectorAll('.cntab');
  cnTab('cn-today',tabs[0]);
  renderClientToday(c,routine);
  document.getElementById('cn-today').scrollTop=0;
}

// Key helpers for session log
function logKey(routineId,ei,si,field){return `log_${routineId}_${ei}_${si}_${field}`}
function getLog(routineId,ei,si,field){return localStorage.getItem(logKey(routineId,ei,si,field))||''}
function setLog(routineId,ei,si,field,val){localStorage.setItem(logKey(routineId,ei,si,field),val)}
function getDoneKey(routineId,ei,si){return `done_${routineId}_${ei}_${si}`}
function isDone(routineId,ei,si){return localStorage.getItem(getDoneKey(routineId,ei,si))==='1'}
function setDone(routineId,ei,si,val){localStorage.setItem(getDoneKey(routineId,ei,si),val?'1':'0')}

// ══════════════════════ MODALIDADES DE ENTRENAMIENTO ══════════════════════
// La modalidad ('track') decide qué se mide y qué UI se pinta. Se deriva del
// campo `type` que ya existe (con override opcional ex.track).
// Ver docs/modalidades-entrenamiento.md
// exTrack → apex-core.js (fuente única de verdad)
// Migración única: corrige el `type` de ejercicios por defecto mal clasificados
// (peso corporal que pedía kg, HIIT que pedía kg). Solo actualiza si el ejercicio
// aún tiene el type viejo → no pisa cambios del coach. Ver docs/modalidades.
function migrateExTypes(){
  if(localStorage.getItem('ax_track_migrated')==='2')return;
  const fix={
    e4:['Compuesto','Bodyweight'],e19:['Compuesto','Bodyweight'],    e47:['Compuesto','Bodyweight'],e18:['Aislamiento','Bodyweight'],e48:['Aislamiento','Bodyweight'],
    e72:['Funcional','Bodyweight'],e73:['Aislamiento','Bodyweight'],e75:['Funcional','Bodyweight'],
    e77:['Compuesto','Bodyweight'],e78:['Compuesto','Bodyweight'],e79:['Compuesto','Bodyweight'],
    e80:['Compuesto','Bodyweight'],e81:['Funcional','Bodyweight'],e62:['Aislamiento','Bodyweight'],
    e76:['Cardio','Bodyweight'],e74:['Cardio','HIIT']
  };
  // Los ejercicios se copian dentro de rutinas y plantillas (no son referencias),
  // así que hay que reclasificarlos en TODAS partes. Solo si aún tienen el type
  // viejo → no pisa cambios manuales del coach.
  let n=0;
  const apply=arr=>(arr||[]).forEach(ex=>{const f=fix[ex.id];if(f&&ex.type===f[0]){ex.type=f[1];n++;}});
  apply(DB.exercises);
  (DB.clients||[]).forEach(c=>(c.routines||[]).forEach(r=>apply(r.exercises)));
  (DB.templates||[]).forEach(t=>apply(t.exercises));
  if(n){sv('ax_e',DB.exercises);sv('ax_c',DB.clients);if(DB.templates)sv('ax_tpl',DB.templates);log(`AVI: ${n} ejercicios reclasificados (modalidades)`);}
  localStorage.setItem('ax_track_migrated','2');
}
// Migración: etiqueta `env` (entorno de equipo) en los ejercicios que no lo tengan,
// usando el heurístico inferExerciseEnv (apex-core.js). PROPONE — el coach valida/edita.
// Solo asigna si falta → no pisa ediciones del coach. Ver docs/estilos-y-entornos.md.
function migrateEnv(){
  if(localStorage.getItem('ax_env_migrated')==='1')return;
  // Si apex-core.js está desactualizado en caché, NO marcar como hecho → reintenta al recargar.
  if(typeof inferExerciseEnv!=='function'){warn('AVI: inferExerciseEnv no disponible aún — entorno se etiquetará al recargar');return;}
  let n=0;
  const apply=arr=>(arr||[]).forEach(ex=>{if(!ex.env){ex.env=inferExerciseEnv(ex);n++;}});
  apply(DB.exercises);
  (DB.clients||[]).forEach(c=>(c.routines||[]).forEach(r=>apply(r.exercises)));
  (DB.templates||[]).forEach(t=>apply(t.exercises));
  if(n){sv('ax_e',DB.exercises);sv('ax_c',DB.clients);if(DB.templates)sv('ax_tpl',DB.templates);log(`AVI: ${n} ejercicios etiquetados con entorno (env)`);}
  localStorage.setItem('ax_env_migrated','1');
}
function hiitCfg(ex){const c=ex.hiit||{};return{work:parseInt(c.work)||30,rest:parseInt(c.rest)||15};}
function holdSecsOf(ex){return parseInt(ex.holdSecs)||parseInt(ex.reps)||60;}
// Formatea un valor de progreso/PR con su unidad según la modalidad.
// fmtMetric → apex-core.js (fuente única, testeada)
function lastreOn(routine,ei){return localStorage.getItem(`lastre_${routine.id}_${ei}`)==='1';}
function toggleLastre(routine,ei){localStorage.setItem(`lastre_${routine.id}_${ei}`,lastreOn(routine,ei)?'0':'1');}

function exMetaText(ex,sets,track){
  if(track==='hiit'){const c=hiitCfg(ex);return `${sets} rondas · ${c.work}s/${c.rest}s`;}
  if(track==='tiempo')return `${sets} series × ${holdSecsOf(ex)}s`;
  if(track==='cardio')return `${ex.reps} min`;
  return `${sets} series × ${ex.reps} reps`;
}

function setLogHeadHTML(track,lastre){
  if(track==='reps'&&!lastre)return `<div class="slh">SET</div><div class="slh" style="grid-column:2/4">REPS</div><div></div>`;
  if(track==='reps')return `<div class="slh">SET</div><div class="slh">LASTRE</div><div class="slh">REPS</div><div></div>`;
  if(track==='tiempo')return `<div class="slh">SET</div><div class="slh">SEG</div><div class="slh">⏱</div><div></div>`;
  if(track==='cardio')return `<div class="slh">SET</div><div class="slh">MIN</div><div class="slh">KM</div><div></div>`;
  return `<div class="slh">SET</div><div class="slh">KG</div><div class="slh">REPS</div><div></div>`;
}

// ── Peso sugerido por PR (Epley, funciones en apex-core) ──
// Solo modalidad de peso, con PR previo del MISMO ejercicio y fuera de la fase de
// adaptación (ahí la consigna es carga suave y técnica, no acercarse al máximo).
function _suggestKg(ex){
  try{
    if(exTrack(ex)!=='peso_reps')return null;
    const c=_curClient();if(!c)return null;
    if(isInAdaptation(c,DB.history,new Date()))return null;
    const pr=(DB.prs[c.id]||{})[ex.id||ex.name];
    return suggestFromPR(pr,parseInt(ex.reps)||10);
  }catch(e){return null;}
}
// Peso ligero sugerido para el calentamiento ≈ 50% del peso de trabajo, redondeado a
// 2.5 kg (sin bajar de 2.5). Devuelve null si no hay referencia de carga.
function _warmupKg(ex){
  return warmupLoad(_suggestKg(ex)||parseFloat(ex.defaultKg)||0);
}
// Estado de "mostrar/ocultar calentamiento" por ejercicio (default: mostrar).
// OJO nombre único: ya existe toggleWarmup() (colapsa el bloque de calentamiento global);
// reusar ese nombre lo pisaba y el botón Ocultar no respondía. Por eso exWarm*.
function exWarmShown(routine,ei){return localStorage.getItem(`wshow_${routine.id}_${ei}`)!=='0';}
function toggleExWarm(routine,ei){localStorage.setItem(`wshow_${routine.id}_${ei}`,exWarmShown(routine,ei)?'0':'1');renderClientExList(routine);}
// Índice de log del set de calentamiento. Token 'w0' (string) → los bucles de
// volumen/récords/historial recorren si ENTEROS 0..sets-1, así que NUNCA lo tocan.
const WARM_SI='w0';
// Construye la sección de calentamiento (solo modalidad de peso). No cuenta para
// volumen ni récords: vive en claves de log aparte (ei,'w0').
function buildWarmupSection(body,routine,ex,ei){
  const sug=_warmupKg(ex);
  const shown=exWarmShown(routine,ei);
  const done=isDone(routine.id,ei,WARM_SI);
  const g=f=>getLog(routine.id,ei,WARM_SI,f);
  const sec=document.createElement('div');
  const head=document.createElement('div');
  head.className='train-sec-label';
  head.innerHTML=`<span>🔥 Sets de calentamiento</span>`;
  const tg=document.createElement('button');
  tg.type='button';tg.className='warmup-toggle';tg.textContent=shown?'Ocultar':'Mostrar';
  tg.onclick=()=>toggleExWarm(routine,ei);
  head.appendChild(tg);
  sec.appendChild(head);
  if(shown){
    const row=document.createElement('div');
    row.className=`set-log-row warmup-row${done?' sdone':''}`;
    row.id=`warmrow_${ei}`;
    row.innerHTML=`<div class="set-num warm ${done?'sdone':''}">🔥</div>`+
      `<input class="sinput" data-field="kg" inputmode="decimal" type="number" step="0.5" min="0" placeholder="${sug?('~'+sug):'kg'}" value="${g('kg')}" ${done?'readonly':''} oninput="setLog('${routine.id}',${ei},'${WARM_SI}','kg',this.value)">`+
      `<input class="sinput" data-field="reps" inputmode="numeric" type="number" min="1" placeholder="12" value="${g('reps')||''}" ${done?'readonly':''} oninput="setLog('${routine.id}',${ei},'${WARM_SI}','reps',this.value)">`+
      `<div class="scheck warm ${done?'sdone':''}" role="button" aria-label="Marcar calentamiento">✓</div>`;
    const chk=row.querySelector('.scheck');
    chk.onclick=(e)=>{
      e.stopPropagation();
      const was=chk.classList.contains('sdone');
      const inps=row.querySelectorAll('.sinput[data-field]');
      if(!was){
        inps.forEach(inp=>setLog(routine.id,ei,WARM_SI,inp.dataset.field,inp.value));
        setDone(routine.id,ei,WARM_SI,true);
        if(navigator.vibrate)navigator.vibrate(30);
        row.classList.add('sdone');chk.classList.add('sdone');row.querySelector('.set-num').classList.add('sdone');
        inps.forEach(inp=>inp.readOnly=true);
        toast('🔥 Calentamiento listo');
      } else {
        setDone(routine.id,ei,WARM_SI,false);
        row.classList.remove('sdone');chk.classList.remove('sdone');row.querySelector('.set-num').classList.remove('sdone');
        inps.forEach(inp=>inp.readOnly=false);
      }
    };
    sec.appendChild(row);
    const hint=document.createElement('div');
    hint.className='warmup-hint';
    hint.textContent='Peso ligero para preparar el músculo · no cuenta en tu volumen';
    sec.appendChild(hint);
  }
  body.appendChild(sec);
}

// ── Dropsets (uno por serie, opcional) ── peso reducido tras la serie, SIN descanso.
// Se ALTERNA deslizando la serie a la DERECHA (attachDropSwipe): añade o quita. Token 'd'+si →
// fuera de los bucles enteros de volumen/récords/historial (que recorren si ENTERO).
function dropTok(si){return 'd'+si;}
function dropSetOn(routine,ei,si){return localStorage.getItem(`drop_${routine.id}_${ei}_${si}`)==='1';}
// `rerender` opcional: la tarjeta clásica re-pinta su lista (default); el modo guiado pasa
// gmRender para que la fila 🔻 aparezca/desaparezca ahí. Misma config (clave drop_) para ambos.
function addDropSet(routine,ei,si,rerender){
  localStorage.setItem(`drop_${routine.id}_${ei}_${si}`,'1');
  if(navigator.vibrate)navigator.vibrate(25);
  toast(`🔻 Dropset añadido a la serie ${si+1}`);
  (rerender||(()=>renderClientExList(routine)))();
}
function removeDropSet(routine,ei,si,rerender){
  localStorage.removeItem(`drop_${routine.id}_${ei}_${si}`);
  const tok=dropTok(si); ['kg','reps'].forEach(f=>setLog(routine.id,ei,tok,f,'')); setDone(routine.id,ei,tok,false);
  (rerender||(()=>renderClientExList(routine)))();
}
// Si una adaptación reduce las series (check-in "Cansado"/"Con dolor", o el coach recorta el
// plan), un dropset configurado en una serie que ya NO existe quedaba huérfano e invisible.
// Lo reubicamos a la última serie vigente para no perder la intención del usuario, migrando su
// peso/reps/✓. Solo sobrevive el de mayor índice; los demás huérfanos se descartan. Idempotente.
function _rehomeOrphanDropsets(routine){
  if(!routine) return;
  const rid=routine.id;
  (routine.exercises||[]).forEach((ex,ei)=>{
    const sets=parseInt(ex.sets)||3; if(sets<1) return;
    const last=sets-1;
    const prefix=`drop_${rid}_${ei}_`;
    const orphans=Object.keys(localStorage)
      .filter(k=>k.indexOf(prefix)===0)
      .map(k=>parseInt(k.slice(prefix.length)))
      .filter(si=>!isNaN(si)&&si>=sets)
      .sort((a,b)=>b-a); // de mayor a menor: el más alto se reubica, el resto se quita
    if(!orphans.length) return;
    let lastHas=dropSetOn(routine,ei,last);
    orphans.forEach(si=>{
      if(!lastHas){
        const from=dropTok(si), to=dropTok(last);
        ['kg','reps'].forEach(f=>{ const v=getLog(rid,ei,from,f); if(v) setLog(rid,ei,to,f,v); });
        if(isDone(rid,ei,from)) setDone(rid,ei,to,true);
        localStorage.setItem(`drop_${rid}_${ei}_${last}`,'1');
        lastHas=true;
      }
      removeDropSet(routine,ei,si,()=>{}); // limpia config + logs del huérfano, sin re-render
    });
  });
}
// Desmarca el "hecho" de calentamiento + dropsets (por día / reinicio), conservando el
// peso como sugerencia (la CONFIG de dropset persiste). Igual que las series efectivas.
function clearWarmDropDone(routine){
  (routine.exercises||[]).forEach((ex,ei)=>{
    setDone(routine.id,ei,WARM_SI,false);
    const sets=parseInt(ex.sets)||3;
    for(let si=0;si<sets;si++) setDone(routine.id,ei,dropTok(si),false);
  });
}
// Peso de dropset ≈ 70% del peso registrado en SU serie (o del sugerido).
function _dropKg(routine,ex,ei,si){
  return dropLoad(parseFloat(getLog(routine.id,ei,si,'kg'))||_suggestKg(ex)||parseFloat(ex.defaultKg)||0);
}
// Fila de dropset bajo su serie (si). Azul · peso ~70% · reps al fallo · ✕ para quitar.
function buildDropRow(body,routine,ex,ei,si){
  const tok=dropTok(si);
  const done=isDone(routine.id,ei,tok);
  const g=f=>getLog(routine.id,ei,tok,f);
  const sug=_dropKg(routine,ex,ei,si);
  const row=document.createElement('div');
  row.className=`set-log-row dropset-row${done?' sdone':''}`;
  row.id=`droprow_${ei}_${si}`;
  row.innerHTML=`<div class="set-num drop ${done?'sdone':''}">DROP</div>`+
    `<input class="sinput" data-field="kg" inputmode="decimal" type="number" step="0.5" min="0" placeholder="${sug?('~'+sug):'kg'}" value="${g('kg')}" ${done?'readonly':''} oninput="setLog('${routine.id}',${ei},'${tok}','kg',this.value)">`+
    `<input class="sinput" data-field="reps" inputmode="numeric" type="number" min="1" placeholder="al fallo" value="${g('reps')}" ${done?'readonly':''} oninput="setLog('${routine.id}',${ei},'${tok}','reps',this.value)">`+
    `<div class="scheck drop ${done?'sdone':''}" role="button" aria-label="Marcar dropset">✓</div>`;
  const chk=row.querySelector('.scheck');
  chk.onclick=(e)=>{
    e.stopPropagation();
    const was=chk.classList.contains('sdone');
    const inps=row.querySelectorAll('.sinput[data-field]');
    if(!was){
      inps.forEach(inp=>setLog(routine.id,ei,tok,inp.dataset.field,inp.value));
      setDone(routine.id,ei,tok,true);
      if(navigator.vibrate)navigator.vibrate(30);
      row.classList.add('sdone');chk.classList.add('sdone');row.querySelector('.set-num').classList.add('sdone');
      inps.forEach(inp=>inp.readOnly=true);
      toast('🔻 Dropset al fallo, ¡bien!');
    } else {
      setDone(routine.id,ei,tok,false);
      row.classList.remove('sdone');chk.classList.remove('sdone');row.querySelector('.set-num').classList.remove('sdone');
      inps.forEach(inp=>inp.readOnly=false);
    }
  };
  body.appendChild(row);
  const hint=document.createElement('div');
  hint.className='warmup-hint';
  hint.innerHTML=`Dropset de la serie ${si+1} · baja el peso y sigue sin descanso. <button type="button" class="drop-rm">Quitar</button>`;
  hint.querySelector('.drop-rm').onclick=()=>removeDropSet(routine,ei,si);
  body.appendChild(hint);
}
// Gesto: deslizar una serie (peso) a la DERECHA ALTERNA su dropset (añade si no hay,
// quita si ya hay). Solo actúa si el arrastre es claramente horizontal (no interfiere
// con scroll ni con tipear). La etiqueta del reveal dice "Quitar" cuando ya está activo.
function attachDropSwipe(row,routine,ei,si,rerender){
  let x0=0,y0=0,dx=0,dragging=false,decided=false,horiz=false;
  const TH=64;
  row.addEventListener('touchstart',e=>{
    if(e.touches.length!==1)return;
    x0=e.touches[0].clientX;y0=e.touches[0].clientY;dx=0;dragging=true;decided=false;horiz=false;
    row.style.transition='none';
  },{passive:true});
  row.addEventListener('touchmove',e=>{
    if(!dragging)return;
    dx=e.touches[0].clientX-x0; const dy=e.touches[0].clientY-y0;
    if(!decided&&(Math.abs(dx)>8||Math.abs(dy)>8)){decided=true;horiz=Math.abs(dx)>Math.abs(dy);}
    if(decided&&horiz){
      e.preventDefault();
      const t=Math.max(0,Math.min(dx,100));
      row.style.transform=`translateX(${t}px)`;
      const w=row.parentElement; if(w)w.classList.toggle('revealing',t>14);
    }
  },{passive:false});
  const end=()=>{
    if(!dragging)return; dragging=false;
    const fire=horiz&&dx>=TH;
    row.style.transition='transform .18s'; row.style.transform='';
    const w=row.parentElement; if(w)w.classList.remove('revealing');
    if(fire) dropSetOn(routine,ei,si)?removeDropSet(routine,ei,si,rerender):addDropSet(routine,ei,si,rerender);
  };
  row.addEventListener('touchend',end);
  row.addEventListener('touchcancel',end);
}

function setLogInputsHTML(track,routine,ex,ei,si,done,lastre){
  const ro=done?'readonly':'';
  const g=f=>getLog(routine.id,ei,si,f);
  // inputmode: en iOS type=number puede abrir teclado sin punto decimal; decimal lo garantiza para kg/km.
  const inp=(f,attrs,ph,val,span)=>`<input class="sinput" data-field="${f}" inputmode="${(f==='kg'||f==='dist')?'decimal':'numeric'}" ${span?'style="grid-column:2/4"':''} ${attrs} placeholder="${ph}" value="${val}" ${ro} oninput="setLog('${routine.id}',${ei},${si},'${f}',this.value)">`;
  if(track==='reps'){
    if(lastre)return inp('kg','type="number" step="0.5" min="0"','lastre',g('kg'),false)+inp('reps','type="number" min="1"',ex.reps,g('reps')||ex.reps,false);
    return inp('reps','type="number" min="1"',ex.reps,g('reps')||ex.reps,true);
  }
  if(track==='tiempo')
    return inp('secs','type="number" min="0"',holdSecsOf(ex),g('secs')||holdSecsOf(ex),false)+
      `<button type="button" class="timer-go" aria-label="Iniciar cronómetro de la serie" style="padding:7px;border:1.5px solid var(--g2);border-radius:6px;background:transparent;color:var(--g2);cursor:pointer;font-size:14px">▶</button>`;
  if(track==='cardio')
    return inp('min','type="number" min="0"','min',g('min')||ex.reps,false)+inp('dist','type="number" min="0" step="0.1"','km',g('dist'),false);
  const sug=_suggestKg(ex);
  return inp('kg','type="number" step="0.5" min="0"',ex.defaultKg||(sug?'~'+sug:'kg'),g('kg'),false)+inp('reps','type="number" min="1"',ex.reps,g('reps')||ex.reps,false);
}

function setDoneToast(track,ex,si,inputs){
  const v=f=>{const i=[...inputs].find(x=>x.dataset.field===f);return i?i.value:'';};
  if(track==='peso_reps'||(track==='reps'&&v('kg'))){const vol=parseFloat(v('kg')||0)*parseFloat(v('reps')||0);return vol>0?`✅ Serie ${si+1} — ${v('kg')}kg × ${v('reps')} = ${Math.round(vol)}kg`:`✅ Serie ${si+1} completada`;}
  if(track==='reps')return `✅ Serie ${si+1} — ${v('reps')} reps`;
  if(track==='tiempo')return `✅ Serie ${si+1} — ${v('secs')}s`;
  if(track==='cardio')return `✅ ${v('min')} min${v('dist')?` · ${v('dist')} km`:''}`;
  return `✅ Serie ${si+1} completada`;
}

// ── Wake Lock: mantener pantalla encendida durante timers ──
let apexWakeLock=null;
async function reqWake(){try{if('wakeLock'in navigator)apexWakeLock=await navigator.wakeLock.request('screen');}catch(e){}}
function relWake(){try{if(apexWakeLock){apexWakeLock.release();apexWakeLock=null;}}catch(e){}}

// ── Timer de intervalos HIIT ──
let HIIT={int:null};
function buildHiitCard(body,routine,ex,ei,sets){
  const cfg=hiitCfg(ex);
  const done=Array.from({length:sets},(_,si)=>isDone(routine.id,ei,si)).filter(Boolean).length;
  const card=document.createElement('div');
  card.style.cssText='padding:16px;text-align:center';
  card.innerHTML=`
    <div style="font-size:12px;color:var(--t2);margin-bottom:10px;font-family:'JetBrains Mono',monospace">${cfg.work}s 🔥 · ${cfg.rest}s 😮‍💨 · ${sets} rondas</div>
    <div id="hiit-display_${ei}" style="font-size:46px;font-weight:800;font-family:'JetBrains Mono',monospace;line-height:1">${done>=sets?'✓':cfg.work}</div>
    <div id="hiit-phase_${ei}" style="font-size:14px;font-weight:700;margin:4px 0;color:var(--t3)">${done>=sets?'¡Completado!':'Listo para empezar'}</div>
    <div id="hiit-rounds_${ei}" style="font-size:12px;color:var(--t2);margin-bottom:12px">Ronda ${Math.min(done+1,sets)} de ${sets}</div>
    <button class="btn bp" id="hiit-start_${ei}" style="width:100%">${done>=sets?'▶ Reiniciar':'▶ Iniciar HIIT'}</button>`;
  body.appendChild(card);
  card.querySelector(`#hiit-start_${ei}`).onclick=()=>startHiit(routine,ei,sets,cfg.work,cfg.rest);
}
function stopHiit(reset){
  if(HIIT.int){clearInterval(HIIT.int);HIIT.int=null;}
  relWake();
  if(reset&&CUR.activeRoutine)renderClientExList(CUR.activeRoutine);
}
function startHiit(routine,ei,rounds,work,rest){
  stopHiit();
  for(let s=0;s<rounds;s++)setDone(routine.id,ei,s,false);
  reqWake();
  const disp=document.getElementById(`hiit-display_${ei}`);
  const phaseEl=document.getElementById(`hiit-phase_${ei}`);
  const roundsEl=document.getElementById(`hiit-rounds_${ei}`);
  const startBtn=document.getElementById(`hiit-start_${ei}`);
  if(!disp)return;
  if(startBtn){startBtn.textContent='⏹ Detener';startBtn.onclick=()=>stopHiit(true);}
  let round=0,phase='work',left=work;
  let phaseEnd=Date.now()+work*1000; // fin de la fase actual por timestamp (robusto a iOS bloqueado)
  const paint=()=>{
    disp.textContent=String(left).padStart(2,'0');
    phaseEl.textContent=phase==='work'?'🔥 TRABAJO':'😮‍💨 DESCANSO';
    phaseEl.style.color=phase==='work'?'var(--rd)':'var(--g2)';
    roundsEl.textContent=`Ronda ${Math.min(round+1,rounds)} de ${rounds}`;
  };
  paint();playRestTick();
  updateBlockHeader(routine,ei,rounds);updateClientProgress(routine);
  HIIT={int:setInterval(()=>{
    left=Math.max(0,Math.round((phaseEnd-Date.now())/1000));
    if(left>0&&left<=3)playRestTick();
    if(left<=0){
      if(phase==='work'){
        setDone(routine.id,ei,round,true);round++;
        updateBlockHeader(routine,ei,rounds);updateClientProgress(routine);
        if(round>=rounds){disp.textContent='✓';phaseEl.textContent='¡Completado!';phaseEl.style.color='var(--g)';roundsEl.textContent=`${rounds}/${rounds} rondas`;clearInterval(HIIT.int);HIIT.int=null;relWake();playRestEndBeep();if(startBtn){startBtn.textContent='▶ Reiniciar';startBtn.onclick=()=>startHiit(routine,ei,rounds,work,rest);}return;}
        phase='rest';left=rest;phaseEnd=Date.now()+rest*1000;playRestEndBeep();
      } else {phase='work';left=work;phaseEnd=Date.now()+work*1000;playRestEndBeep();}
    }
    paint();
  },1000)};
}

// ── Cronómetro de cuenta regresiva para isométricos (reusa el rest-banner) ──
function startHoldTimer(secs,ei,si,routine){
  if(!secs||secs<1)return;
  if(restInt)clearInterval(restInt);
  reqWake();
  const banner=document.getElementById('rest-banner');const num=document.getElementById('rb-num');const sub=document.getElementById('rb-sub');const title=banner.querySelector('.resttitle');
  banner.classList.remove('hide');if(title)title.textContent='⏱ Aguanta';sub.textContent=`Serie ${si+1}`;
  const endAt=Date.now()+secs*1000; // conteo por timestamp absoluto (robusto a iOS bloqueado)
  let left=secs;num.textContent=left;
  restInt=setInterval(()=>{
    left=Math.max(0,Math.round((endAt-Date.now())/1000));num.textContent=left;num.classList.remove('tick');void num.offsetWidth;num.classList.add('tick');
    if(left>0&&left<=3)playRestTick();
    if(left<=0){clearInterval(restInt);restInt=null;banner.classList.add('hide');relWake();playRestEndBeep();if(title)title.textContent='⏱ Descansando';const chk=document.getElementById(`chk_${ei}_${si}`);if(chk&&!chk.classList.contains('sdone'))chk.click();}
  },1000);
}

// ── Sincroniza campos de config del formulario de ejercicio según el tipo ──
function exFormSync(){
  const t=document.getElementById('ex-t').value;
  const hiitRow=document.getElementById('ex-hiit-row');
  const holdRow=document.getElementById('ex-hold-row');
  if(hiitRow)hiitRow.style.display=t==='HIIT'?'':'none';
  if(holdRow)holdRow.style.display=t==='Isométrico'?'':'none';
}

function resetSession(){
  const routine=CUR.activeRoutine;if(!routine)return;
  if(!confirm('¿Reiniciar el entrenamiento de hoy? Se borrarán las series completadas pero se conservarán los pesos.'))return;
  (routine.exercises||[]).forEach((ex,ei)=>{
    const sets=parseInt(ex.sets)||3;
    for(let si=0;si<sets;si++) localStorage.removeItem(getDoneKey(routine.id,ei,si));
  });
  clearWarmup(routine.id);
  clearWarmDropDone(routine);
  localStorage.removeItem(`session_date_${routine.id}`);
  if(restInt){clearInterval(restInt);restInt=null;document.getElementById('rest-banner').classList.add('hide');}
  renderClientExList(routine);updateClientProgress(routine);toast('↺ Sesión reiniciada');
}

// SESSION RESET: clear done flags if last session was a different day (keep kg/reps as suggestions)
function checkAndResetSession(routine){
  const dateKey=`session_date_${routine.id}`;
  const lastDate=localStorage.getItem(dateKey);
  const today=new Date().toDateString();
  if(lastDate&&lastDate!==today){
    (routine.exercises||[]).forEach((ex,ei)=>{
      const sets=parseInt(ex.sets)||3;
      for(let si=0;si<sets;si++) localStorage.removeItem(getDoneKey(routine.id,ei,si));
    });
    clearWarmup(routine.id); // el calentamiento también es por día
    clearWarmDropDone(routine); // sets de calentamiento + dropsets: desmarcar por día
    _sweepOrphanSessionKeys(routine); // limpia log_/done_ de ei/si que ya no existen
  }
  localStorage.setItem(dateKey,today);
}
// Barre las claves de sesión (log_/done_) de índices que ya no existen en la rutina: si el
// coach reduce las series o reordena/quita ejercicios, esos índices quedaban huérfanos y los
// `log_` NUNCA se borraban → crecían sin límite (riesgo de llenar localStorage). Auditoría 2026-06-21.
function _sweepOrphanSessionKeys(routine){
  try{
    const valid=new Set();
    (routine.exercises||[]).forEach((ex,ei)=>{
      const sets=parseInt(ex.sets)||3;
      for(let si=0;si<sets;si++){ valid.add(ei+'_'+si); valid.add(ei+'_'+dropTok(si)); }
      valid.add(ei+'_'+WARM_SI);
    });
    const dp='done_'+routine.id+'_', lp='log_'+routine.id+'_';
    Object.keys(localStorage).forEach(k=>{
      if(k.indexOf(dp)===0){ const t=k.slice(dp.length); if(!valid.has(t)) localStorage.removeItem(k); }
      else if(k.indexOf(lp)===0){ const rest=k.slice(lp.length); const i=rest.lastIndexOf('_'); const t=i>0?rest.slice(0,i):rest; if(!valid.has(t)) localStorage.removeItem(k); }
    });
  }catch(e){ warn('AVI: barrido de claves de sesión falló (no bloquea):',e&&e.message); }
}

// ══════════ REORDENAR / SUSTITUIR EJERCICIOS (usuario, en "Hoy") ══════════
// Los logs de serie se indexan por (routineId, ei). Al reordenar movemos TAMBIÉN sus
// claves log_/done_ para que el peso y el ✓ sigan al ejercicio (no al índice). Al
// sustituir las limpiamos (es otro ejercicio). Las ediciones viven en una COPIA de
// trabajo en memoria (CUR.todayWorking); el plan guardado no se toca hasta que el usuario
// confirme "guardar para la próxima" al finalizar. Ver feedback_avi_practicidad_usuario.
function _swapSessionKeys(rid,a,b){
  const grab=idx=>{ const lp=`log_${rid}_${idx}_`,dp=`done_${rid}_${idx}_`,out=[];
    Object.keys(localStorage).forEach(k=>{ if(k.indexOf(lp)===0)out.push(['log',k.slice(lp.length),localStorage.getItem(k)]);
      else if(k.indexOf(dp)===0)out.push(['done',k.slice(dp.length),localStorage.getItem(k)]); }); return out; };
  const A=grab(a),B=grab(b);
  [a,b].forEach(idx=>{ const lp=`log_${rid}_${idx}_`,dp=`done_${rid}_${idx}_`;
    Object.keys(localStorage).forEach(k=>{ if(k.indexOf(lp)===0||k.indexOf(dp)===0)localStorage.removeItem(k); }); });
  const put=(es,idx)=>es.forEach(([kind,suf,val])=>localStorage.setItem(`${kind}_${rid}_${idx}_${suf}`,val));
  put(A,b); put(B,a);
}
function _clearSessionKeys(rid,idx){ const lp=`log_${rid}_${idx}_`,dp=`done_${rid}_${idx}_`;
  Object.keys(localStorage).forEach(k=>{ if(k.indexOf(lp)===0||k.indexOf(dp)===0)localStorage.removeItem(k); }); }
// Copia de trabajo del día (se crea al primer cambio; ligada a la rutina base por id).
function _todayWork(){
  const c=DB.clients.find(x=>x.id===CUR.clientId); if(!c)return null;
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const today=days[new Date().getDay()];
  const autoR=(c.routines||[]).find(r=>r.day===today)||(c.routines||[]).find(r=>r.day==='Libre');
  const baseR=CUR.todayOverride||autoR; if(!baseR)return null;
  if(!CUR.todayWorking||CUR.todayWorking.id!==baseR.id){
    CUR.todayWorking={...baseR,exercises:(baseR.exercises||[]).map(e=>({...e}))};
  }
  return CUR.todayWorking;
}
function todayMoveEx(ei,dir){
  const w=_todayWork(); if(!w)return; const exs=w.exercises; const j=ei+dir;
  if(j<0||j>=exs.length)return;
  const t=exs[ei];exs[ei]=exs[j];exs[j]=t;
  _swapSessionKeys(w.id,ei,j);
  if(typeof normalizeBisets==='function')normalizeBisets(exs);
  CUR.todayDirty=true;
  const c=DB.clients.find(x=>x.id===CUR.clientId); renderClientToday(c,CUR.todayOverride);
}
function todaySubstitute(ei){
  const w=_todayWork(); if(!w)return; const ex=w.exercises[ei]; if(!ex)return;
  CUR.subEi=ei; pickerTarget='substitute';
  CUR.pkFilter=ex.muscle||'all'; CUR.pkEnv='all';
  const es=document.getElementById('pk-env'); if(es)es.value='all';
  buildFilterBtns('pk-f',pkFilter); renderPickerForTarget(); om('m-picker');
}
function _applySubstitute(newEx){
  const w=_todayWork(); if(!w)return; const ei=CUR.subEi; const old=w.exercises[ei]; if(!old)return;
  // Conserva el VOLUMEN planeado (series/reps/descanso); cambia el movimiento.
  w.exercises[ei]={...newEx,sets:old.sets,reps:old.reps,restSec:old.restSec};
  delete w.exercises[ei].ssNext; // no heredar la pareja de biserie del anterior
  if(typeof normalizeBisets==='function')normalizeBisets(w.exercises);
  _clearSessionKeys(w.id,ei); // ejercicio nuevo → empieza limpio
  CUR.todayDirty=true; cm('m-picker');
  const c=DB.clients.find(x=>x.id===CUR.clientId); renderClientToday(c,CUR.todayOverride);
  toast('🔄 Ejercicio cambiado');
}
// Al finalizar: si la estructura (orden o ejercicios) cambió vs el plan guardado, ofrece
// conservarlo para la próxima. Si dice que no, el cambio fue solo por hoy.
function offerKeepReorder(){
  if(!CUR.todayDirty||!CUR.todayWorking){CUR.todayDirty=false;return;}
  const c=DB.clients.find(x=>x.id===CUR.clientId); if(!c){CUR.todayDirty=false;return;}
  const stored=(c.routines||[]).find(r=>r.id===CUR.todayWorking.id);
  if(!stored){CUR.todayDirty=false;CUR.todayWorking=null;return;}
  const a=CUR.todayWorking.exercises.map(e=>e.id).join(',');
  const b=(stored.exercises||[]).map(e=>e.id).join(',');
  if(a!==b&&confirm('Cambiaste tu rutina hoy (orden o ejercicios). ¿Guardar estos cambios para la próxima vez?')){
    stored.exercises=CUR.todayWorking.exercises.map(e=>({...e}));
    sv('ax_c',DB.clients); toast('✅ Guardado para la próxima');
  } else if(a!==b){ toast('Solo por hoy 👍'); }
  CUR.todayDirty=false; CUR.todayWorking=null;
}

function renderClientExList(routine){
  checkAndResetSession(routine);
  const con=document.getElementById('cex-list');if(!con)return;
  con.innerHTML='';
  const _nEx=(routine.exercises||[]).length;
  (routine.exercises||[]).forEach((ex,ei)=>{
    const sets=parseInt(ex.sets)||3;
    const color=MC[ex.muscle]||'#ccc';
    const doneCount=Array.from({length:sets},(_,si)=>isDone(routine.id,ei,si)).filter(Boolean).length;
    const allDone=doneCount===sets;
    const track=exTrack(ex);

    // Block wrapper
    const block=document.createElement('div');
    block.className=`cex-block${allDone?' all-done':''} open`;
    block.id=`block_${ei}`;

    // Header
    const header=document.createElement('div');
    header.className='cex-block-header';
    const muscleLabel = ex.muscleLabel || ex.muscle;
    const _img = exImgSrc(ex);
    const _lead = _img
      ? `<div class="cex-thumb"><img src="${_img}" alt="" loading="lazy" decoding="async"><span class="cex-thumb-badge">${allDone?'✓':ei+1}</span></div>`
      : `<div class="cex-block-num">${allDone?'✓':ei+1}</div>`;
    header.innerHTML=`
      ${_lead}
      <div class="cex-block-info" style="min-width:0">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <div class="cex-block-name">${esc(ex.name)}</div>
          <button class="exinfo-btn" title="Ver cómo hacerlo" onclick="event.stopPropagation();openExDetail('${ex.id}')">❓</button>
        </div>
        <div class="cex-block-meta">${esc(muscleLabel)} · ${exMetaText(ex,sets,track)}${(()=>{const _bi=bisetInfo(routine.exercises,ei);return _bi.biset?` · <span style="color:#A855F7;font-weight:700">🔗 biserie con ${esc((routine.exercises[_bi.partner]||{}).name||'')}</span>`:'';})()}</div>
      </div>
      <div class="cex-block-prog ${allDone?'done':''}">${doneCount}/${sets}</div>
      <div class="cex-reorder" onclick="event.stopPropagation()">
        <button onclick="todayMoveEx(${ei},-1)" ${ei===0?'disabled':''} title="Subir" aria-label="Subir ejercicio">↑</button>
        <button onclick="todayMoveEx(${ei},1)" ${ei===_nEx-1?'disabled':''} title="Bajar" aria-label="Bajar ejercicio">↓</button>
        <button onclick="todaySubstitute(${ei})" title="Cambiar este ejercicio" aria-label="Cambiar ejercicio">🔄</button>
      </div>
      <div class="cex-block-chev">▼</div>`;
    header.onclick=()=>block.classList.toggle('open');
    block.appendChild(header);

    // Body with set rows
    const body=document.createElement('div');
    body.className='cex-block-body';

    if(track==='hiit'){
      buildHiitCard(body,routine,ex,ei,sets);
    } else {
    const lastre=track==='reps'&&lastreOn(routine,ei);

    // Toggle "+lastre" para peso corporal
    if(track==='reps'){
      const tg=document.createElement('div');
      tg.style.cssText='padding:6px 14px 0;text-align:right';
      tg.innerHTML=`<button type="button" style="font-size:11px;font-weight:600;padding:3px 9px;border-radius:99px;border:1.5px solid var(--br2);background:${lastre?'var(--gl)':'transparent'};color:${lastre?'var(--gt)':'var(--t3)'};cursor:pointer">${lastre?'✓ ':'+ '}Lastre (peso añadido)</button>`;
      tg.querySelector('button').onclick=()=>{toggleLastre(routine,ei);renderClientExList(routine);};
      body.appendChild(tg);
    }

    // 🎯 Peso sugerido según su récord (informativo; el coach y la sensación mandan)
    if(track==='peso_reps'){
      const sug=_suggestKg(ex);
      if(sug){
        const sh=document.createElement('div');
        sh.style.cssText='padding:7px 14px 0;font-size:11.5px;font-weight:700;color:var(--gt)';
        sh.innerHTML=`🎯 Peso sugerido: <b>${sug} kg</b> <span style="color:var(--t3);font-weight:600">· según tu récord</span>`;
        body.appendChild(sh);
      }
    }

    // 🔥 Sets de calentamiento (solo peso) — peso ligero, no cuenta para volumen/récords
    if(track==='peso_reps'){
      buildWarmupSection(body,routine,ex,ei);
    }

    // Column headers según modalidad
    const head=document.createElement('div');
    head.className='set-log-head';
    head.innerHTML=setLogHeadHTML(track,lastre);
    body.appendChild(head);

    // Each set row
    for(let si=0;si<sets;si++){
      const done=isDone(routine.id,ei,si);

      const row=document.createElement('div');
      row.className=`set-log-row${done?' sdone':''}`;
      row.id=`setrow_${ei}_${si}`;

      row.innerHTML=`<div class="set-num ${done?'sdone':''}">${si+1}</div>`+
        setLogInputsHTML(track,routine,ex,ei,si,done,lastre)+
        `<div class="scheck ${done?'sdone':''}" id="chk_${ei}_${si}" role="button" aria-label="Marcar serie ${si+1}">✓</div>`;

      // ▶ countdown para isométricos
      if(track==='tiempo'){
        const go=row.querySelector('.timer-go');
        if(go)go.onclick=(e)=>{e.stopPropagation();const inp=row.querySelector('.sinput[data-field="secs"]');startHoldTimer(parseInt(inp.value)||0,ei,si,routine);};
      }

      // Wire up the checkmark (genérico por campos)
      const chk=row.querySelector('.scheck');
      chk.onclick=(e)=>{
        e.stopPropagation();
        const wasDone=chk.classList.contains('sdone');
        const inputs=row.querySelectorAll('.sinput[data-field]');
        if(!wasDone){
          inputs.forEach(inp=>setLog(routine.id,ei,si,inp.dataset.field,inp.value));
          setDone(routine.id,ei,si,true);
          if(navigator.vibrate)navigator.vibrate(40);
          row.classList.add('sdone');
          chk.classList.add('sdone');
          row.querySelector('.set-num').classList.add('sdone');
          inputs.forEach(inp=>inp.readOnly=true);
          toast(setDoneToast(track,ex,si,inputs));
          if(track!=='tiempo'){const _rs=restForExercise(ex,routine);if(_rs)startClientRest(_rs,ex.name);}
        } else {
          setDone(routine.id,ei,si,false);
          row.classList.remove('sdone');
          chk.classList.remove('sdone');
          row.querySelector('.set-num').classList.remove('sdone');
          inputs.forEach(inp=>inp.readOnly=false);
        }
        updateBlockHeader(routine,ei,sets);
        updateClientProgress(routine);
      };

      // Solo peso: envolver la serie para poder DESLIZARLA → dropset; y debajo, su
      // dropset si esa serie ya tiene uno. Otras modalidades: fila directa, sin swipe.
      if(track==='peso_reps'){
        const w=document.createElement('div');
        w.className='setrow-wrap';
        const rv=document.createElement('div');
        rv.className='drop-reveal';
        rv.textContent=dropSetOn(routine,ei,si)?'🔻 Quitar dropset':'🔻 Dropset';
        w.appendChild(rv);
        w.appendChild(row);
        attachDropSwipe(row,routine,ei,si);
        body.appendChild(w);
        if(dropSetOn(routine,ei,si)) buildDropRow(body,routine,ex,ei,si);
      } else {
        body.appendChild(row);
      }
    }
    }

    // Volume summary if any sets done
    const volSum=document.createElement('div');
    volSum.id=`volsum_${ei}`;
    volSum.style.cssText='padding:8px 14px 10px;font-size:12px;color:var(--t2);font-family:\'JetBrains Mono\',monospace';
    updateVolSummary(routine,ei,sets,ex,volSum);
    body.appendChild(volSum);

    block.appendChild(body);
    con.appendChild(block);
  });
}

function updateBlockHeader(routine,ei,sets){
  const block=document.getElementById(`block_${ei}`);if(!block)return;
  const doneCount=Array.from({length:sets},(_,si)=>isDone(routine.id,ei,si)).filter(Boolean).length;
  const allDone=doneCount===sets;
  const numEl=block.querySelector('.cex-block-num');
  const progEl=block.querySelector('.cex-block-prog');
  if(numEl)numEl.textContent=allDone?'✓':ei+1;
  if(progEl){progEl.textContent=`${doneCount}/${sets}`;progEl.className=`cex-block-prog${allDone?' done':''}`;};
  block.className=`cex-block open${allDone?' all-done':''}`;
}

function updateVolSummary(routine,ei,sets,ex,el){
  if(!el)el=document.getElementById(`volsum_${ei}`);
  if(!el)return;
  const track=exTrack(ex);
  let totalVol=0,doneSets=0,totReps=0,totSecs=0,totMin=0;
  for(let si=0;si<sets;si++){
    if(isDone(routine.id,ei,si)){
      doneSets++;
      totalVol+=(parseFloat(getLog(routine.id,ei,si,'kg'))||0)*(parseFloat(getLog(routine.id,ei,si,'reps'))||0);
      totReps+=parseInt(getLog(routine.id,ei,si,'reps'))||0;
      totSecs+=parseInt(getLog(routine.id,ei,si,'secs'))||0;
      totMin+=parseFloat(getLog(routine.id,ei,si,'min'))||0;
    }
  }
  if(!doneSets){el.textContent='';return;}
  let txt;
  if(track==='peso_reps'||(track==='reps'&&totalVol>0))txt=`Volumen: ${Math.round(totalVol).toLocaleString()} kg`;
  else if(track==='reps')txt=`Total: ${totReps} reps`;
  else if(track==='tiempo')txt=`Tiempo: ${totSecs}s`;
  else if(track==='cardio')txt=`Cardio: ${totMin} min`;
  else if(track==='hiit')txt=`${doneSets} ronda${doneSets!==1?'s':''}`;
  else txt=`${doneSets} completada${doneSets!==1?'s':''}`;
  el.textContent=`${txt} · ${doneSets}/${sets}`;
}

function updateClientProgress(routine){
  let total=0,done=0,totalVol=0;
  (routine.exercises||[]).forEach((ex,ei)=>{
    const sets=parseInt(ex.sets)||3;total+=sets;
    for(let si=0;si<sets;si++){
      if(isDone(routine.id,ei,si)){
        done++;
        const kg=parseFloat(getLog(routine.id,ei,si,'kg'))||0;
        const reps=parseFloat(getLog(routine.id,ei,si,'reps'))||0;
        totalVol+=kg*reps;
      }
    }
    updateVolSummary(routine,ei,sets,ex,null);
  });
  const pn=document.getElementById('prog-num');const pf=document.getElementById('prog-fill');
  const pv=document.getElementById('prog-vol');
  if(pn)pn.textContent=`${done}/${total}`;
  if(pf)pf.style.width=`${total>0?(done/total)*100:0}%`;
  if(pv)pv.textContent=totalVol>0?`Volumen total: ${Math.round(totalVol).toLocaleString()} kg`:'';
  const whn=document.getElementById('wohero-num');const whf=document.getElementById('wohero-fill');
  if(whn)whn.textContent=`${done}/${total} series`;
  if(whf)whf.style.width=`${total>0?(done/total)*100:0}%`;
  if(done===total&&total>0){
    saveSessionToHistory(routine,totalVol,done);
    const newPRs=checkAndUpdatePRs(routine);
    // Refresh PRs and exercise progress in profile if visible
    renderPRsInProfile(CUR.clientId);
    renderClientExProgress(CUR.clientId);
    showWorkoutFinish(routine,{done,total,totalVol,newPRs});
  } else if(done>0){
    // Auto-guardado PARCIAL: en cuanto marca la 1ª serie, el entreno queda registrado
    // (y se va actualizando). Así no se pierde aunque no llegue al 100% ni toque
    // "Finalizar", o si la app se cierra/congela a mitad. Sync con debounce.
    saveSessionToHistory(routine,totalVol,done,false);
  }
}

function saveSessionToHistory(routine,totalVol,doneSets,immediate=true){
  const clientId=CUR.clientId;if(!clientId)return;
  if(!DB.history)DB.history=ld('ax_hist',{});
  if(!DB.history[clientId])DB.history[clientId]=[];
  const today=new Date().toDateString();
  // Snapshot de series — se reconstruye SIEMPRE para que el guardado parcial y la
  // posterior finalización al 100% queden consistentes (antes solo se construía al crear).
  // Calentamiento (w0, uno por ejercicio) y dropset (dN, uno por serie de trabajo) se
  // guardan en campos APARTE (warm/drop) — visibles para cliente y coach, pero SIN entrar
  // en volumen ni récords (misma regla que en vivo). Solo se incluyen si tienen datos.
  const auxVal=(ei,tok)=>{ const kg=getLog(routine.id,ei,tok,'kg'), reps=getLog(routine.id,ei,tok,'reps'); return (kg||reps)?{kg,reps}:null; };
  const setsData=(routine.exercises||[]).map((ex,ei)=>{
    const sets=parseInt(ex.sets)||3;
    const warm=auxVal(ei,WARM_SI);
    return {name:ex.name,muscle:ex.muscle,icon:ex.icon,track:exTrack(ex),...(warm?{warm}:{}),sets:Array.from({length:sets},(_,si)=>{const drop=auxVal(ei,dropTok(si));return {kg:getLog(routine.id,ei,si,'kg'),reps:getLog(routine.id,ei,si,'reps')||ex.reps,secs:getLog(routine.id,ei,si,'secs'),min:getLog(routine.id,ei,si,'min'),dist:getLog(routine.id,ei,si,'dist'),done:isDone(routine.id,ei,si),...(drop?{drop}:{})};})};
  });
  const totalSets=(routine.exercises||[]).reduce((s,e)=>s+(parseInt(e.sets)||0),0);
  // Evita duplicar: misma rutina el mismo día → actualiza la entrada existente.
  const already=DB.history[clientId].find(h=>h.routineId===routine.id&&new Date(h.date).toDateString()===today);
  if(already){already.totalVol=Math.round(totalVol);already.doneSets=doneSets;already.totalSets=totalSets;already.exercises=setsData;already.date=new Date().toISOString();}
  else{
    // startedAt = primera serie marcada (este else corre la 1ª vez del día) → duración real de entreno
    DB.history[clientId].unshift({id:uid(),routineId:routine.id,routineName:routine.name,date:new Date().toISOString(),startedAt:new Date().toISOString(),totalVol:Math.round(totalVol),doneSets,totalSets,exercises:setsData});
    if(DB.history[clientId].length>365)DB.history[clientId]=DB.history[clientId].slice(0,365);
  }
  // El parcial usa sync con debounce (sv) para no disparar una llamada de red por cada
  // serie marcada; el 100%/Finalizar fuerza el envío inmediato (svNow). flushPendingSync
  // (pagehide/visibilitychange) asegura que lo parcial suba aunque cierren la app.
  if(immediate) svNow('ax_hist',DB.history);
  else sv('ax_hist',DB.history);
}

// Guardado PARCIAL: registra el entreno con lo que el asesorado lleve hecho, aunque no
// haya marcado el 100% de las series. Antes solo se guardaba al completar todo, así que
// un entreno real se perdía si no se palomeaba todo. Botón "Finalizar" en la vista de hoy.
function finishSessionEarly(){
  const routine=CUR.activeRoutine;if(!routine)return;
  let total=0,done=0,totalVol=0;
  (routine.exercises||[]).forEach((ex,ei)=>{
    const sets=parseInt(ex.sets)||3;total+=sets;
    for(let si=0;si<sets;si++){
      if(isDone(routine.id,ei,si)){
        done++;
        totalVol+=(parseFloat(getLog(routine.id,ei,si,'kg'))||0)*(parseFloat(getLog(routine.id,ei,si,'reps'))||0);
      }
    }
  });
  if(done===0){toast('Marca al menos una serie para guardar tu entreno 💪');return;}
  if(done<total && !confirm(`Llevas ${done} de ${total} series. ¿Guardar tu entrenamiento de hoy con lo que llevas?`))return;
  saveSessionToHistory(routine,totalVol,done);
  checkAndUpdatePRs(routine);
  renderPRsInProfile(CUR.clientId);
  renderClientExProgress(CUR.clientId);
  toast('✅ Entrenamiento guardado');
  offerKeepReorder();
}

// ── Fin de entrenamiento: celebración full-bleed (se dispara al 100%) ──
// Foto: window.AVI_FINISH_PHOTO la sobreescribe; default = foto de marca AVI.
const WF_DEFAULT_PHOTO='media/brand/ob-2.jpg';
let _wfShownFor=null; // routineId|día ya celebrado → evita re-pop al re-marcar la última serie
// fmtDuration → apex-core.js (fuente única, testeada)
// "¿Cómo te sentiste?" — calificación de la sesión que el COACH ve en el panel (foso vs Gravl).
// WF_FEELINGS + feelingEmoji/feelingLabel → apex-core.js (fuente única, testeada)
let _wfEntry=null; // entrada de historial de la sesión recién cerrada (para guardar la calificación)
function wfRate(n){
  if(_wfEntry){_wfEntry.feeling=n;svNow('ax_hist',DB.history);}
  document.querySelectorAll('#wf-faces .wf-face').forEach((b,i)=>b.classList.toggle('sel',WF_FEELINGS[i].v===n));
  const lbl=document.getElementById('wf-feeling-lbl');if(lbl)lbl.textContent=`¡Gracias! · ${feelingLabel(n)}`;
}
function showWorkoutFinish(routine,stats){
  if(!routine)return;
  const key=routine.id+'|'+new Date().toDateString();
  if(_wfShownFor===key)return;
  _wfShownFor=key;
  const c=DB.clients.find(x=>x.id===CUR.clientId);
  const name=((c&&c.name)||'').trim().split(/\s+/)[0]||'';
  const done=(stats&&stats.done)||0, total=(stats&&stats.total)||0;
  const vol=Math.round((stats&&stats.totalVol)||0);
  const prs=(stats&&stats.newPRs)||[];
  // Duración (desde la 1ª serie) + calorías aproximadas (MET·peso·horas). Se persisten en la sesión.
  let durationSec=null, kcal=null;
  const today=new Date().toDateString();
  const entry=(DB.history[CUR.clientId]||[]).find(h=>h.routineId===routine.id&&new Date(h.date).toDateString()===today);
  _wfEntry=entry||null;
  if(entry&&entry.startedAt){
    durationSec=Math.max(60,Math.min(4*3600,Math.round((Date.now()-Date.parse(entry.startedAt))/1000)));
    const w=parseFloat(c&&c.weight)||70;            // kg; fallback 70 si no hay peso
    kcal=Math.round(5.5*w*(durationSec/3600));       // MET 5.5 ≈ entrenamiento de fuerza
    entry.durationSec=durationSec; entry.kcal=kcal;
    svNow('ax_hist',DB.history);
  }
  // ¿Esta sesión cruzó un umbral de nivel (gamificación)? Se celebra al CERRAR este
  // overlay (no compite con el cierre). Guard por nivel ya celebrado en este dispositivo.
  try{
    const tot=((DB.history||{})[CUR.clientId]||[]).length;
    if(tot>0){
      const L=gxLevel(tot).cur, seenKey='gx_lvlup_'+CUR.clientId;
      const seen=parseInt(localStorage.getItem(seenKey)||'0',10)||0;
      if(L.n>gxLevel(tot-1).cur.n && L.n>seen){
        _pendingLevelUp=L; localStorage.setItem(seenKey,String(L.n));
      }
    }
  }catch(e){}
  document.getElementById('wf-photo').style.backgroundImage=`url('${window.AVI_FINISH_PHOTO||WF_DEFAULT_PHOTO}')`;
  document.getElementById('wf-title').textContent=name?`¡Lo lograste, ${name}!`:'¡Lo lograste!';
  const fecha=new Date().toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long'});
  document.getElementById('wf-sub').textContent=(routine.name?routine.name+' · ':'')+fecha;
  const chips=[];
  if(durationSec!=null)chips.push(['Duración',fmtDuration(durationSec)]);
  if(kcal!=null&&kcal>0)chips.push(['Calorías',`${kcal} kcal`]);
  chips.push(['Series',`${done}/${total}`]);
  if(vol>0)chips.push(['Volumen',`${vol.toLocaleString()} kg`]);
  document.getElementById('wf-stats').innerHTML=chips.map(([l,v])=>`<div class="wf-stat"><div class="wf-stat-val">${esc(v)}</div><div class="wf-stat-lbl">${esc(l)}</div></div>`).join('');
  const prWrap=document.getElementById('wf-prs');
  let prHtml=prs.slice(0,3).map(pr=>{
    const val=pr.val!=null?pr.val:pr.kg;const unit=pr.unit||'kg';
    const detail=unit==='kg'?`${fmtMetric(val,unit)}${pr.reps?` × ${pr.reps} reps`:''}`:fmtMetric(val,unit);
    return `<div class="wf-pr"><span class="wf-pr-ico">🏆</span><div style="flex:1;min-width:0"><div class="wf-pr-name">${pr.isNew?'¡Primer récord!':'¡Nuevo récord!'} ${esc(pr.name)}</div><div class="wf-pr-det">${esc(detail)}</div></div></div>`;
  }).join('');
  if(prs.length>3)prHtml+=`<div style="font-size:11.5px;color:rgba(242,245,244,.7);text-align:center">+${prs.length-3} récord${prs.length-3!==1?'s':''} más 🎉</div>`;
  prWrap.innerHTML=prHtml;
  // Calificación "¿Cómo te sentiste?" (resetea estado según lo ya guardado)
  const curFeel=(entry&&entry.feeling)||0;
  document.getElementById('wf-faces').innerHTML=WF_FEELINGS.map(f=>`<button type="button" class="wf-face${f.v===curFeel?' sel':''}" onclick="wfRate(${f.v})">${f.e}</button>`).join('');
  document.getElementById('wf-feeling-lbl').textContent=curFeel?feelingLabel(curFeel):'';
  document.getElementById('workout-finish').classList.add('on');
  document.body.style.overflow='hidden';
  wfConfetti();
}
function closeWorkoutFinish(){
  document.getElementById('workout-finish').classList.remove('on');
  document.body.style.overflow='';
  offerKeepReorder(); // ¿guardar el reorden/cambio de hoy para la próxima?
  if(_pendingLevelUp){const L=_pendingLevelUp;_pendingLevelUp=null;setTimeout(()=>showLevelUp(L),250);}
}
function wfConfetti(){
  const colors=['#10E0A0','#52B788','#D3F4E8','#13B583','#F2C94C','#ffffff'];
  for(let i=0;i<32;i++){
    const c=document.createElement('div');
    c.style.cssText=`position:fixed;top:${8+Math.random()*26}%;left:${Math.random()*100}%;width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;border-radius:${Math.random()>.5?'50%':'2px'};background:${colors[Math.floor(Math.random()*colors.length)]};animation:confettiFall ${0.8+Math.random()*1}s ease-out ${Math.random()*0.4}s forwards;pointer-events:none;z-index:9999`;
    document.body.appendChild(c);
    setTimeout(()=>c.remove(),2200);
  }
}

// ── Momentos full-bleed: upsell Premium + subida de nivel (reusan el molde wf-*) ──
const PU_DEFAULT_PHOTO='media/brand/ob-3.jpg';
function showPremiumUpsell(){
  const c=_curClient(); if(!c||!(c.selfReg||isFreeClient(c)))return;
  document.getElementById('pu-photo').style.backgroundImage=`url('${window.AVI_UPSELL_PHOTO||PU_DEFAULT_PHOTO}')`;
  _puState(!!c.wantsCoach);
  document.getElementById('premium-upsell').classList.add('on');
  document.body.style.overflow='hidden';
}
function _puState(sent){
  document.getElementById('pu-sell').style.display=sent?'none':'flex';
  document.getElementById('pu-sent').style.display=sent?'flex':'none';
}
async function puConfirm(){
  const btn=document.getElementById('pu-cta');btn.disabled=true;
  try{ await requestCoach(); _puState(true); wfConfetti(); }
  finally{ btn.disabled=false; }
}
function closePremiumUpsell(){
  document.getElementById('premium-upsell').classList.remove('on');
  document.body.style.overflow='';
}

const LU_DEFAULT_PHOTO='media/brand/reveal.jpg';
let _pendingLevelUp=null; // detectado en showWorkoutFinish → se celebra al cerrar ese overlay
function showLevelUp(lvl){
  document.getElementById('lu-photo').style.backgroundImage=`url('${window.AVI_LEVELUP_PHOTO||LU_DEFAULT_PHOTO}')`;
  document.getElementById('lu-num').textContent=lvl.n;
  document.getElementById('lu-name').textContent=lvl.name;
  const next=GX_LEVELS[GX_LEVELS.findIndex(l=>l.n===lvl.n)+1]||null;
  document.getElementById('lu-sub').textContent=next
    ? `Tu constancia te trajo hasta aquí — y tu nivel nunca se reinicia. Siguiente meta: ${next.name} (${next.min} entrenos).`
    : 'Nivel máximo. Eres élite AVI — esto ya es un estilo de vida. 🏆';
  document.getElementById('level-up').classList.add('on');
  document.body.style.overflow='hidden';
  wfConfetti();
}
function closeLevelUp(){
  document.getElementById('level-up').classList.remove('on');
  document.body.style.overflow='';
}

// ALL ROUTINES
// Intro editorial de la semana — voz de coach, contextual al objetivo del asesorado.
// La decisión (kick/título/cuerpo/días) → apex-core.js (weekEditorial); aquí solo el markup.
function clientWeekEditorial(client){
  const e=weekEditorial(client);
  const daysNote=e.trainDays?` <b>${e.trainDays} día${e.trainDays!==1?'s':''}</b> de entreno te esperan.`:'';
  return `<div class="weekly-ed"><div class="we-kick">${e.kick}</div><div class="we-title">${esc(e.title)}</div><div class="we-body">${esc(e.body)}${daysNote}</div></div>`;
}

function renderClientAllRoutines(client){
  const ed=document.getElementById('cn-week-ed');
  const con=document.getElementById('cn-all-rut');const routines=sortRoutinesByDay(client.routines||[]);
  // Puede editar su propia rutina: el coach en su entreno, o un cliente LIBRE (sin coach que se la
  // gestione). Los asesorados premium NO editan (su coach lo hace). Las gráficas siguen siendo premium,
  // pero armar/ajustar ejercicios está disponible para el libre que solo quiere registrar.
  const canEdit=COACH_SELF||isFreeClient(client);
  if(ed)ed.innerHTML=routines.length?clientWeekEditorial(client):'';
  if(!routines.length){
    con.innerHTML=COACH_SELF
      ? '<div class="empty" style="padding:36px"><div class="eico">🏋️</div><div class="etxt">Crea tu primera rutina</div><div class="esub">Arma tu propio entrenamiento igual que el de un asesorado.</div><button class="btn bp bsm" style="margin-top:12px" onclick="openNewRoutine()">+ Nueva rutina</button></div>'
      : client.selfReg
      ? '<div class="empty" style="padding:36px"><div class="eico">✨</div><div class="etxt">Crea tu primera rutina</div><div class="esub">Generamos un plan a tu medida según tus datos — o ármalo tú mismo si ya tienes el tuyo.</div><button class="btn bp bsm" style="margin-top:12px" onclick="clientSelfGenerate()">✨ Generar mi semana</button><button class="btn bg bsm" style="margin-top:8px" onclick="openNewRoutine()">+ Crear rutina manual</button></div>'
      : '<div class="empty" style="padding:36px"><div class="eico">📋</div><div class="etxt">Tu plan está en preparación</div><div class="esub">Escríbele a tu coach si tienes alguna pregunta mientras tanto.</div><button class="btn bp bsm" style="margin-top:12px" onclick="cnTab(\'cn-messages\',document.getElementById(\'tab-msgs\'))">Ir a mensajes →</button></div>';
    return;
  }
  con.innerHTML='';
  if(client.selfReg){
    const regen=document.createElement('button');
    regen.className='btn bd bsm';
    regen.style.cssText='width:100%;margin-bottom:10px';
    regen.textContent='✨ Regenerar mi semana';
    regen.onclick=clientSelfGenerate;
    con.appendChild(regen);
  }
  // Coach en su entreno o cliente libre: puede crear/gestionar sus propias rutinas.
  if(canEdit){
    const nb=document.createElement('button');
    nb.className='btn bp bsm';
    nb.style.cssText='width:100%;margin-bottom:10px';
    nb.textContent='+ Nueva rutina';
    nb.onclick=openNewRoutine;
    con.appendChild(nb);
  }
  routines.forEach((r,ri)=>{
    const exN=(r.exercises||[]).length;const totS=(r.exercises||[]).reduce((s,e)=>s+(parseInt(e.sets)||0),0);
    const isRest=r.day==='Libre';
    const isToday=!isRest && r.day===['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][new Date().getDay()];
    const dayAb=isRest?'💤':esc(r.day).slice(0,2);
    const div=document.createElement('div');div.className='rc'+(isToday?' rc-today':'');
    div.innerHTML=`<div class="rch" onclick="this.closest('.rc').classList.toggle('open')"><div class="rcthumb${isRest?' rest':''}">${dayAb}</div><div class="rci"><div class="rcname">${esc(r.name)}${isToday?'<span class="rc-today-tag">Hoy</span>':''}</div><div class="rcpills"><span class="rcpill">${esc(r.day)}</span><span class="rcpill">${exN} ejercicio${exN!==1?'s':''}</span><span class="rcpill">${totS} series</span></div></div><div class="rcchev">▾</div></div><div class="rcbody">${r.note?`<div style="background:rgba(242,201,76,.10);border:1px solid rgba(242,201,76,.30);border-radius:var(--rsm);padding:8px 12px;font-size:12px;color:var(--t1);margin-bottom:9px">💡 ${esc(r.note)}</div>`:''}${!(r.exercises||[]).length?'<div style="color:var(--t3);font-size:13px">Sin ejercicios</div>':(r.exercises||[]).map((e,_ei,_arr)=>`<div class="exrow"><div class="exicon" style="background:${MC[e.muscle]||'#ccc'}18;border:1px solid ${MC[e.muscle]||'#ccc'}30">${exIcon(e)}</div><div><div class="exname">${esc(e.name||'')}</div><div class="exmet">${esc(e.muscle||'')} · ${esc(e.type||'')} · ⏱${restForExercise(e,r)}s${bisetInfo(_arr,_ei).biset?' · <span style="color:#A855F7;font-weight:700">🔗 biserie</span>':''}</div></div><div class="exsets">${e.sets}×${e.reps}<small>series × reps</small></div></div>`).join('')}<button onclick="startRoutineNow('${r.id}')" style="margin-top:12px;width:100%;padding:12px;background:linear-gradient(135deg,var(--g),var(--g2));color:white;border:none;border-radius:var(--r);font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;letter-spacing:.2px">▶ Hacer esta rutina ahora</button>${canEdit?`<div style="display:flex;gap:8px;margin-top:8px"><button class="btn bg bsm" style="flex:1" onclick="event.stopPropagation();openEditRoutine('${client.id}',${ri})">✏️ Editar</button><button class="btn bd bsm" onclick="event.stopPropagation();delRoutine('${client.id}',${ri})">🗑️</button></div>`:''}</div>`;
    con.appendChild(div);
  });
}

function renderVolChart(sessions){
  const wrap=document.getElementById('vol-chart-wrap');
  const con=document.getElementById('vol-chart');
  if(wrap&&isFreeClient(_curClient())){wrap.style.display='none';return;} // analítica avanzada = Premium
  if(!wrap||!con)return;
  const withVol=sessions.filter(s=>s.totalVol>0).slice(0,12).reverse();
  if(withVol.length<2){wrap.style.display='none';return;}
  wrap.style.display='block';
  const W=Math.max(con.offsetWidth||window.innerWidth-64||280,200);const H=80;
  const vals=withVol.map(s=>s.totalVol);
  const maxV=Math.max(...vals)||1;const minV=Math.min(...vals);
  const pad=8;const chartW=W-pad*2;const chartH=H-16;
  const avg=Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
  document.getElementById('vol-chart-avg').textContent=`Promedio: ${avg.toLocaleString()} kg`;
  const pts=withVol.map((s,i)=>{
    const x=pad+i*(chartW/(withVol.length-1));
    const y=8+chartH-((s.totalVol-minV)/(maxV-minV||1))*chartH;
    return {x,y,s};
  });
  const pathD=pts.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD=`${pathD} L${pts[pts.length-1].x.toFixed(1)},${H} L${pts[0].x.toFixed(1)},${H} Z`;
  con.innerHTML=`<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0A7C5B" stop-opacity="0.18"/><stop offset="100%" stop-color="#0A7C5B" stop-opacity="0"/></linearGradient></defs>
    <path d="${areaD}" fill="url(#vg)"/>
    <path d="${pathD}" fill="none" stroke="#0A7C5B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${pts.map((p,i)=>`
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#0A7C5B"/>
      <text x="${p.x.toFixed(1)}" y="${H}" text-anchor="middle" font-family="Plus Jakarta Sans,sans-serif" font-size="9" fill="#B0B0B0">${new Date(p.s.date).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</text>
    `).join('')}
  </svg>`;
}

// Detalle de una sesión (ejercicios → series). Compartido por la vista del cliente y la
// del coach. Calentamiento (🔥 ámbar) y dropset (🔻 azul) se muestran como chips aparte,
// SIN sumar al volumen (que solo cuenta series de trabajo hechas). Valores escapados.
function _sessionExercisesHTML(s){
  return (s.exercises||[]).map(ex=>{
    const exVol=ex.sets.filter(st=>st.done).reduce((t,st)=>t+(parseFloat(st.kg)||0)*(parseFloat(st.reps)||0),0);
    const auxChip=(emoji,label,col,bg,a)=>`<div style="background:${bg};border:1px solid ${col}55;border-radius:6px;padding:6px 8px;text-align:center">
        <div style="font-size:10px;color:${col};margin-bottom:2px">${emoji} ${label}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;color:${col}">${a.kg?esc(a.kg)+'kg':'—'}${a.reps?' × '+esc(a.reps):''}</div>
      </div>`;
    const chips=[];
    if(ex.warm&&(ex.warm.kg||ex.warm.reps))chips.push(auxChip('🔥','Calent.','#E8973A','rgba(232,151,58,.10)',ex.warm));
    ex.sets.forEach((st,si)=>{
      chips.push(`<div style="background:${st.done?'var(--gl)':'var(--bg)'};border:1px solid ${st.done?'var(--g2)':'var(--br)'};border-radius:6px;padding:6px 8px;text-align:center">
          <div style="font-size:10px;color:var(--t3);margin-bottom:2px">Serie ${si+1}</div>
          ${st.done?`<div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;color:var(--gt)">${st.kg?esc(st.kg)+'kg':'—'} × ${esc(st.reps)}</div>`:`<div style="font-size:11px;color:var(--t3)">No completada</div>`}
        </div>`);
      if(st.drop&&(st.drop.kg||st.drop.reps))chips.push(auxChip('🔻','Drop','#3B82F6','rgba(59,130,246,.08)',st.drop));
    });
    return `<div style="margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
          ${muscleIcon(ex.muscle,18)}
          <div style="font-size:13px;font-weight:700">${esc(ex.name)}</div>
          ${exVol>0?`<span style="margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--g);font-weight:600">${Math.round(exVol)} kg vol</span>`:''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:5px">${chips.join('')}</div>
      </div>`;
  }).join('');
}

// HISTORY
function renderClientHistory(clientId){
  if(!DB.history)DB.history=ld('ax_hist',{});
  const sessions=DB.history[clientId]||[];
  const con=document.getElementById('cn-hist-list');if(!con)return;
  renderVolChart(sessions);
  if(!sessions.length){
    con.innerHTML='<div class="empty" style="padding:36px"><div class="eico">📊</div><div class="etxt">Aquí verás tu progreso</div><div class="esub">Cada entrenamiento que completes en <b>"Hoy"</b> queda guardado aquí. Con las semanas verás cómo avanzas 📈<br><br>Al principio está vacío — ¡es normal!</div><button class="btn bp bsm" style="margin-top:14px" onclick="cnTab(\'cn-today\',document.querySelectorAll(\'.cntab\')[0])">Ir a mi entrenamiento →</button></div>';
    return;
  }
  con.innerHTML='';
  sessions.forEach(s=>{
    const d=new Date(s.date);
    const dateStr=d.toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'});
    const timeStr=d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
    const div=document.createElement('div');
    const pct=s.totalSets>0?Math.round((s.doneSets/s.totalSets)*100):0;
    const pcol=pct===100?'var(--g)':'var(--or)';
    div.className='sescard'+(pct===100?' done':'');
    div.innerHTML=`
      <div class="sescard-h" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
        <div class="sescard-top">
          <div><div class="sescard-name">${esc(s.routineName||"")}</div><div class="sescard-date">${dateStr} · ${timeStr}</div></div>
          <div class="sescard-sets"><b>${s.doneSets}/${s.totalSets}</b><small>series</small></div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <div class="pbar" style="flex:1;margin-top:0"><div class="pfill" style="width:${pct}%;background:${pcol}"></div></div>
          <span class="sescard-pct" style="color:${pcol}">${pct}%</span>
          ${s.totalVol>0?`<span class="sescard-vol">${s.totalVol.toLocaleString()} kg</span>`:''}
        </div>
      </div>
      <div style="display:none;border-top:1px solid var(--br);background:var(--bg);padding:10px 14px">
        ${_sessionExercisesHTML(s)}
      </div>`;
    con.appendChild(div);
  });
}

// COACH sees client history
let _histOpen={}; // clientId -> mostrar TODAS las sesiones (colapsado por defecto)
function renderCoachClientHistory(clientId){
  if(!DB.history)DB.history=ld('ax_hist',{});
  const sessions=DB.history[clientId]||[];
  const con=document.getElementById('d-history');if(!con)return;
  if(!sessions.length){con.innerHTML='<div style="color:var(--t3);font-size:13px;padding:12px 0;text-align:center">Sin sesiones registradas todavía</div>';return;}
  con.innerHTML='';
  const _open=_histOpen[clientId];
  const _shown=_open?sessions:sessions.slice(0,3);
  _shown.forEach(s=>{
    const d=new Date(s.date);
    const dateStr=d.toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'});
    const pct=s.totalSets>0?Math.round((s.doneSets/s.totalSets)*100):0;
    const div=document.createElement('div');
    div.style.cssText='border-bottom:1px solid var(--br)';
    const feel=s.feeling?` <span title="${esc(feelingLabel(s.feeling))}">${feelingEmoji(s.feeling)}</span>`:'';
    const meta=[s.durationSec?fmtDuration(s.durationSec):'',s.kcal?`${s.kcal} kcal`:''].filter(Boolean).join(' · ');
    const hasDetail=(s.exercises||[]).length>0;
    div.innerHTML=`<div style="padding:9px 0${hasDetail?';cursor:pointer':''}"${hasDetail?` onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'"`:''}><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><div><div style="font-size:13px;font-weight:600">${esc(s.routineName)}${feel}${hasDetail?' <span style="color:var(--t3);font-size:11px">▾</span>':''}</div><div style="font-size:11px;color:var(--t3)">${dateStr}${meta?' · '+meta:''}</div></div><div style="text-align:right"><span style="font-size:13px;font-weight:700;color:${pct===100?'var(--g)':'var(--or)'}">${pct}%</span>${s.totalVol>0?`<span style="font-size:11px;color:var(--t2);margin-left:8px">${s.totalVol.toLocaleString()}kg</span>`:''}</div></div><div class="pbar" style="margin-top:0"><div class="pfill" style="width:${pct}%;background:${pct===100?'var(--g)':'var(--or)'}"></div></div></div>${hasDetail?`<div style="display:none;background:var(--bg);border-radius:8px;padding:10px 12px;margin:0 0 9px">${_sessionExercisesHTML(s)}</div>`:''}`;
    con.appendChild(div);
  });
  if(sessions.length>3){
    const mb=document.createElement('button');
    mb.className='collapse-more';
    mb.textContent=_open?'Ver menos ▴':`Ver las ${sessions.length} sesiones ▾`;
    mb.onclick=()=>{_histOpen[clientId]=!_open;renderCoachClientHistory(clientId);};
    con.appendChild(mb);
  }
}
function markMsgsRead(){
  if(!CUR.clientId)return;
  localStorage.setItem(`msg_read_${CUR.clientId}`,new Date().toISOString());
  const badge=document.getElementById('msg-badge');
  if(badge){badge.removeAttribute('data-count');}
}
function updateMsgBadge(clientId){
  const badge=document.getElementById('msg-badge');if(!badge)return;
  const lastRead=localStorage.getItem(`msg_read_${clientId}`);
  const msgs=DB.msgs[clientId]||[];
  const unread=msgs.filter(m=>m.from==='coach'&&(!lastRead||new Date(m.date)>new Date(lastRead))).length;
  if(unread>0){badge.setAttribute('data-count',unread>9?'9+':String(unread));}
  else{badge.removeAttribute('data-count');}
}

function renderClientMsgs(clientId){
  const msgs=DB.msgs[clientId]||[];const con=document.getElementById('cn-msg-thread');con.innerHTML='';
  const composer=document.getElementById('cn-msg-composer');
  if(isFreeClient(DB.clients.find(x=>x.id===clientId))){
    if(composer)composer.style.display='none';
    con.innerHTML=premiumLockHTML('Chat con tu coach','Habla directo con un entrenador que te guía y te responde.');
    return;
  }
  if(composer)composer.style.display='';
  if(!msgs.length){con.innerHTML='<div style="text-align:center;padding:18px;color:var(--t3);font-size:13px">Tu coach todavía no te ha escrito.<br>Puedes escribirle tú primero 👇</div>';return}
  msgs.forEach(m=>{
    // Vista del CLIENTE: lo MÍO (from==='client') va a la derecha/verde (cs); el coach a la izquierda (cl).
    const mine=m.from!=='coach';
    const b=document.createElement('div');b.className=`mb ${mine?'cs':'cl'}`;b.textContent=m.text||'';con.appendChild(b);
    const t=document.createElement('div');t.className=`mt${mine?' r':''}`;t.textContent=`${mine?'Tú':'Coach'} · ${fmtD(m.date)} ${fmtT(m.date)}`;con.appendChild(t);
  });
  con.scrollTop=con.scrollHeight;
}
function sendClientMsg(){
  const ta=document.getElementById('cn-msg-in');const text=ta.value.trim();const clientId=CUR.clientId;if(!text||!clientId)return;
  if(!DB.msgs[clientId])DB.msgs[clientId]=[];
  DB.msgs[clientId].push({from:'client',text,date:new Date().toISOString()});
  svNow('ax_m',DB.msgs);
  const clientName=DB.clients.find(c=>c.id===clientId)?.name||'Asesorado';
  // Push al coach para notificación en tiempo real
  pushToClient('_coach','💬 '+clientName+' te escribió',text.length>80?text.slice(0,77)+'...':text,{type:'message',chatId:clientId,tag:'apex-chat-coach'});
  ta.value='';ta.style.height='auto';renderClientMsgs(clientId);toast('💬 Mensaje enviado a tu coach');
}

// REST TIMER
let restInt=null;
let _restVis=null; // handler de visibilitychange del descanso (para poder removerlo)

// ── Audio iOS-safe ──────────────────────────────────────────────
// iOS solo reproduce sonido si el AudioContext se "desbloquea" DENTRO de un
// gesto del usuario. Antes creábamos un contexto NUEVO en cada beep → nacía
// suspendido y el iPhone quedaba MUDO (el beep lo dispara el temporizador, no
// un toque). Ahora: UN contexto compartido, desbloqueado en el primer toque y
// reutilizado; cada beep lo reanuda por si iOS lo suspendió al ir a segundo plano.
let _actx=null, _audioUnlocked=false;
function getAudioCtx(){
  if(!_actx){ try{ _actx=new(window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; } }
  return _actx;
}
function _unlockAudio(){
  const ctx=getAudioCtx(); if(!ctx) return;
  if(ctx.state==='suspended') ctx.resume().catch(()=>{});
  if(!_audioUnlocked){
    // Buffer silencioso = desbloqueo definitivo en iOS (debe correr en un gesto).
    try{ const b=ctx.createBuffer(1,1,22050),s=ctx.createBufferSource(); s.buffer=b; s.connect(ctx.destination); s.start(0); }catch(e){}
    _audioUnlocked=true;
  }
}
['pointerdown','touchend','click'].forEach(ev=>window.addEventListener(ev,_unlockAudio,{passive:true,capture:true}));

function playRestEndBeep(){
  try{
    const ctx=getAudioCtx();
    if(ctx){
      if(ctx.state==='suspended') ctx.resume().catch(()=>{});
      const t0=ctx.currentTime;
      const beep=(freq,start,dur)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);
        o.type='square';o.frequency.value=freq;
        g.gain.setValueAtTime(0,t0+start);
        g.gain.linearRampToValueAtTime(0.9,t0+start+0.01);
        g.gain.linearRampToValueAtTime(0,t0+start+dur);
        o.start(t0+start);o.stop(t0+start+dur+0.05);
      };
      beep(660,0,.15);beep(880,.2,.15);beep(1100,.4,.35);
    }
  }catch(e){}
  if(navigator.vibrate)navigator.vibrate([200,80,200,80,500]);
}

function playRestTick(){
  try{
    const ctx=getAudioCtx();
    if(ctx){
      if(ctx.state==='suspended') ctx.resume().catch(()=>{});
      const t0=ctx.currentTime;
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);
      o.type='square';o.frequency.value=660;
      g.gain.setValueAtTime(0,t0);
      g.gain.linearRampToValueAtTime(0.7,t0+0.005);
      g.gain.linearRampToValueAtTime(0,t0+0.12);
      o.start(t0);o.stop(t0+0.15);
    }
  }catch(e){}
  if(navigator.vibrate)navigator.vibrate(60);
}

// El conteo se basa en un timestamp ABSOLUTO (endAt), no en restar ticks. iOS suspende
// los setInterval cuando se bloquea la pantalla / la app pasa a segundo plano, así que un
// contador por ticks se congela y nunca avisa. Aquí el reloj es Date.now(): el tiempo
// transcurre igual aunque el timer no dispare, y al volver (visibilitychange) recalculamos
// al instante y, si ya venció, sonamos/avisamos en ese momento.
// NOTA iOS: con la pantalla bloqueada una PWA no puede reproducir sonido en segundo plano;
// el aviso suena en cuanto el usuario vuelve a la app. Sonido con pantalla bloqueada exige
// push nativo programado desde servidor (no implementado).
function _stopRest(){
  if(restInt){clearInterval(restInt);restInt=null;}
  if(_restVis){document.removeEventListener('visibilitychange',_restVis);_restVis=null;}
}
function startClientRest(sec,exName){
  _stopRest();
  const banner=document.getElementById('rest-banner');const num=document.getElementById('rb-num');const sub=document.getElementById('rb-sub');
  banner.classList.remove('hide');sub.textContent=`Después de: ${exName}`;
  const endAt=Date.now()+sec*1000;
  let lastShown=sec;num.textContent=sec;
  const tick=()=>{
    const left=Math.max(0,Math.round((endAt-Date.now())/1000));
    if(left!==lastShown){
      num.textContent=left;num.classList.remove('tick');void num.offsetWidth;num.classList.add('tick');
      if(left>0&&left<=5)playRestTick();
      lastShown=left;
    }
    if(left<=0){_stopRest();banner.classList.add('hide');playRestEndBeep();toast('✅ ¡A por la siguiente serie!');}
  };
  // Al volver de pantalla bloqueada / segundo plano, recalcula de inmediato.
  _restVis=()=>{ if(document.visibilityState==='visible'&&restInt) tick(); };
  document.addEventListener('visibilitychange',_restVis);
  restInt=setInterval(tick,250);
}
function skipRest(){_stopRest();document.getElementById('rest-banner').classList.add('hide');toast('⏩ Descanso saltado')}

// ══════════════════════ BACKUP / RESTORE ══════════════════════
function exportData(){
  const data={
    version:'1.3.1',
    exportedAt:new Date().toISOString(),
    clients:DB.clients,
    exercises:DB.exercises,
    msgs:DB.msgs,
    history:DB.history||{},
    prs:DB.prs||{},
    bodyweight:DB.bodyweight||{},
    templates:DB.templates||[],
    nutrition:DB.nutrition||{},
    medidas:DB.medidas||{},
    photos:DB.photos||{}
  };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  const date=new Date().toLocaleDateString('es-ES').replace(/\//g,'-');
  a.download=`apex-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('✅ Backup descargado correctamente');
}

function importData(input){
  const file=input.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=(e)=>{
    try{
      const data=JSON.parse(e.target.result);
      if(!data.clients||!data.exercises){
        toast('⚠️ Archivo inválido. Usa un backup generado por AVI');
        return;
      }
      if(!confirm(`¿Restaurar backup del ${new Date(data.exportedAt).toLocaleDateString('es-ES')}?\n\nSe reemplazarán: ${data.clients.length} asesorados, ${data.exercises.length} ejercicios.\n\nEsta acción no se puede deshacer.`))return;

      DB.clients=data.clients||[];
      DB.exercises=data.exercises||[];
      DB.msgs=data.msgs||{};
      DB.history=data.history||{};
      DB.prs=data.prs||{};
      DB.bodyweight=data.bodyweight||{};
      DB.templates=data.templates||[];
      DB.nutrition=data.nutrition||{};
      DB.medidas=data.medidas||{};
      DB.photos=data.photos||{};
      sv('ax_c',DB.clients);
      sv('ax_e',DB.exercises);
      sv('ax_m',DB.msgs);
      sv('ax_hist',DB.history);
      sv('ax_pr',DB.prs);
      sv('ax_bw',DB.bodyweight);
      sv('ax_tpl',DB.templates);
      sv('ax_nut',DB.nutrition);
      sv('ax_med',DB.medidas);
      sv('ax_photos',DB.photos);

      renderAll();
      cm('m-backup');
      toast(`✅ Backup restaurado: ${DB.clients.length} asesorados, ${DB.exercises.length} ejercicios`);
    }catch(err){
      toast('⚠️ Error al leer el archivo. Verifica que sea un backup válido de AVI');
    }
  };
  reader.readAsText(file);
  // Reset input
  input.value='';
}

function openBackup(){
  // Calcular uso de localStorage
  try{
    let bytes=0;
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      bytes+=(k.length+(localStorage.getItem(k)||'').length)*2;
    }
    const kb=Math.round(bytes/1024);
    const el=document.getElementById('backup-size');
    if(el){
      const pct=Math.round(kb/5120*100);
      el.textContent=`${kb} KB / ~5 MB (${pct}%)`;
      el.style.color=kb>3500?'var(--rd)':kb>2000?'var(--or)':'var(--g)';
    }
  }catch(e){}
  om('m-backup');
}
function om(id){document.getElementById(id).classList.add('on')}
function cm(id){document.getElementById(id).classList.remove('on')}
document.querySelectorAll('.mdbg').forEach(bg=>bg.addEventListener('click',e=>{if(e.target===bg)bg.classList.remove('on')}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.mdbg.on').forEach(m=>m.classList.remove('on'))});

// INIT filter buttons
buildFilterBtns('exf',exFilter);
// restoreNotifications() se llama después del login del coach, una vez confirmados los permisos
