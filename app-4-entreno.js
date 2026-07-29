// ══════════════════════ EXERCISES ══════════════════════
let exF='all';
// Estado del buscador y del pintado por tandas de la biblioteca (auditoría FASE 2). LOCAL a la
// sesión a propósito: es un filtro de vista, no un ajuste del coach — nada que sincronizar.
let exQ='', exPage=1;
const EX_PAGE=30;   // primera tanda; «Ver más» suma otra
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
function exFilter(muscle,el){exF=muscle;exPage=1;styleFilterBtns('exf',el);renderExercises()}
// Buscador y pintado por tandas (auditoría FASE 2, 2026-07-27). La biblioteca medía 30.752 px
// —42 pantallas— con los 212 ejercicios dibujados de golpe (cada uno con su foto) y sin forma
// de buscar por nombre. Al escribir se vuelve a la primera tanda: si no, el «ver más» de la
// búsqueda anterior dejaría resultados nuevos escondidos.
function exSearch(term){ exQ=String(term||''); exPage=1; renderExercises(); }
function exMore(){ exPage++; renderExercises(); }
function renderExercises(){
  const grid=document.getElementById('ex-grid');
  const filtered=(typeof searchExercises==='function')
    ? searchExercises(DB.exercises,exQ,exF)
    : DB.exercises.filter(e=>exF==='all'||e.muscle===exF);
  const tope=EX_PAGE*exPage;
  const visibles=filtered.slice(0,tope);
  grid.innerHTML='';
  visibles.forEach(ex=>{
    const color=MC[ex.muscle]||'#6B6B6B';const div=document.createElement('div');div.className='exc';
    div.innerHTML=`<div style="display:flex;align-items:flex-start;gap:9px;margin-bottom:8px"><div style="width:36px;height:36px;border-radius:8px;background:${color}18;border:1.5px solid ${color}30;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;overflow:hidden">${exIcon(ex)}</div><div style="flex:1"><div style="font-size:13px;font-weight:700">${esc(ex.name)}</div><div style="font-size:11px;color:var(--t2)">${ex.muscleLabel||ex.muscle} · ${ex.type}</div></div><div style="display:flex;gap:4px"><button class="btn bg bsm" style="padding:0 9px;min-height:36px;justify-content:center" title="Ver detalle" aria-label="Ver detalle del ejercicio" onclick="openExDetail('${ex.id}',true)">${typeof aviIcon==='function'?aviIcon('eye',15):'👁'}</button><button class="btn bg bsm" style="padding:0 9px;min-height:36px;justify-content:center" title="Editar ejercicio" aria-label="Editar ejercicio" onclick="openEditEx('${ex.id}')">${typeof aviIcon==='function'?aviIcon('pencil',14):'✏️'}</button></div></div><span class="tag mc-chip" style="--mc:${color};--mct:${(typeof mcInk==='function'?mcInk(color):color)};--mcu:${(typeof mcInkUp==='function'?mcInkUp(color):color)};background:${color}15;border:1px solid ${color}30;font-size:11px">${ex.sets}×${ex.reps}</span>${ex.desc?`<div style="font-size:11px;color:var(--t3);margin-top:6px;line-height:1.4">${esc(ex.desc.slice(0,80))}${ex.desc.length>80?'...':''}</div>`:''}`;
    grid.appendChild(div);
  });
  // Estado vacío consciente de POR QUÉ está vacío: no es lo mismo un músculo sin ejercicios
  // que una búsqueda sin resultados (ahí lo accionable es borrar la búsqueda, no crear uno).
  if(!filtered.length){
    grid.innerHTML='<div class="empty" style="grid-column:1/-1"><div class="eico">'+(typeof aviIcon==='function'?aviIcon('dumbbell',34):'🏋️')+'</div>'
      +(exQ.trim()
        ? '<div class="etxt">Ningún ejercicio se llama así</div><div class="esub">Revisa cómo lo escribiste o borra la búsqueda para ver todos.</div>'
        : '<div class="etxt">Sin ejercicios aquí</div><div class="esub">Añade uno con el botón de arriba</div>')
      +'</div>';
  }
  const more=document.getElementById('ex-more');
  if(more){
    const faltan=filtered.length-visibles.length;
    more.innerHTML=faltan>0
      ? `<button class="btn bg" style="width:100%" onclick="exMore()">Ver ${faltan} más (${visibles.length} de ${filtered.length})</button>`
      : (filtered.length>EX_PAGE?`<div style="text-align:center;font-size:12px;color:var(--t3);padding:4px 0">${filtered.length} ejercicios</div>`:'');
  }
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
  let guardadoId=CUR.editExId;
  if(CUR.editExId){const i=DB.exercises.findIndex(e=>e.id===CUR.editExId);if(i!==-1)DB.exercises[i]={...DB.exercises[i],...data};toast(`✅ "${name}" actualizado`)}
  // El ejercicio nuevo va AL PRINCIPIO, no al final. Con la biblioteca entera pintada daba
  // igual; con el pintado por tandas, al final caía en la posición 213 y para enseñárselo al
  // coach había que abrir las 8 tandas —o sea volver a dibujar los 213 y perder la mejora el
  // resto de la sesión—. Arriba se ve solo, sin abrir nada. Y de paso es lo natural: lo último
  // que creaste, de primero.
  else{guardadoId=uid();DB.exercises.unshift({id:guardadoId,...data});toast(`✅ "${name}" añadido`)}
  sv('ax_e',DB.exercises);cm('m-ex');exReveal(guardadoId);renderHome();
}
// El ejercicio que el coach acaba de guardar TIENE que verse. Con la biblioteca entera pintada
// daba igual; desde el pintado por tandas (v405) un ejercicio nuevo cae al final del catálogo
// —posición 213 de 213— y quedaba escondido tras «Ver más» mientras el toast decía «añadido».
// Lo mismo si lo edita y deja de coincidir con la búsqueda o el filtro que tenga puestos.
// Regla: si con los filtros actuales NO se vería, se quitan (no se le miente al coach), y se
// abren tandas hasta incluirlo. Cazado en la verificación adversarial de v405, no por un usuario.
function exReveal(id){
  const _pos=()=>((typeof searchExercises==='function')?searchExercises(DB.exercises,exQ,exF):DB.exercises)
    .findIndex(e=>e&&e.id===id);
  let i=_pos();
  if(i===-1){
    exQ=''; exF='all';
    const inp=document.getElementById('ex-search'); if(inp)inp.value='';
    const todos=document.querySelector('#exf button'); if(todos&&typeof styleFilterBtns==='function')styleFilterBtns('exf',todos);
    i=_pos();
  }
  if(i>=0)exPage=Math.max(1,Math.ceil((i+1)/EX_PAGE));
  renderExercises();
  // Y se lleva a la vista: verlo es la confirmación de verdad, no el toast.
  if(i>=0)setTimeout(()=>{const c=document.querySelectorAll('#ex-grid .exc')[i];
    if(c&&c.scrollIntoView)c.scrollIntoView({behavior:'smooth',block:'center'});},80);
}

// ══════════════════════ CLIENT VIEW ══════════════════════
function initClientView(client){
  const h=new Date().getHours();
  document.getElementById('cn-greet').textContent=(h<13?'Buenos días':h<20?'Buenas tardes':'Buenas noches')+', '+client.name.split(' ')[0]+'!';
  document.querySelectorAll('.cntab').forEach(t=>t.classList.remove('on'));document.querySelector('.cntab').classList.add('on');
  document.querySelectorAll('.cnp').forEach(p=>p.classList.remove('on'));document.getElementById('cn-today').classList.add('on');
  navReset('cn-today'); // botón atrás: inicio = Hoy, sin pasos previos
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
    // Aviso único de "agrandar texto" (descubribilidad) tiene prioridad sobre el welcome esa
    // primera vez; después de ofrecerlo, vuelve el saludo normal.
    if(typeof shouldShowFsIntro==='function' && shouldShowFsIntro()){
      setTimeout(()=>showFsIntro(), 650);
    } else {
      // El "welcome de vuelta" se omite si entró directo a una pestaña por un acceso directo.
      setTimeout(()=>showClientWelcome(client), 350);
    }
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

const _CNTAB_ORDER=['cn-today','cn-routines','cn-messages','cn-history','cn-profile'];
function _cnTabEl(id){return document.querySelectorAll('.cntab')[_CNTAB_ORDER.indexOf(id)];}
function cnTab(id,el,_silent){
  document.querySelectorAll('.cnp').forEach(p=>p.classList.remove('on'));document.querySelectorAll('.cntab').forEach(t=>t.classList.remove('on'));
  document.getElementById(id).classList.add('on');if(el)el.classList.add('on');
  // Botón atrás: registrar el salto de pestaña (solo navegación REAL hacia adelante).
  // _silent (lo usa el "undo" del stack) solo sincroniza la pestaña actual sin registrar.
  if(_silent){ AVINAV.curTab=id; }
  else if(id!==AVINAV.curTab){
    const prev=AVINAV.curTab;
    if(prev){ const pel=_cnTabEl(prev); navRecord(function(){ cnTab(prev,pel,true); }); }
    AVINAV.curTab=id;
  }
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
    _syncFsBtns(ld('ax_textsize','normal'));
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
  if(id==='cn-community'&&typeof renderCommunity==='function'){
    renderCommunity();
  }
  // Cambiar de pestaña no dispara scroll: la píldora «Instalar app» debe re-evaluarse aquí
  // o se quedaría escondida al salir del entreno (o encimada al volver). Ver app-6-extra.
  if(typeof window._aviPillGuard==='function') window._aviPillGuard();
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
    // Tokens de gráfica (C6) — var() solo en style=, nunca en atributos SVG (gotcha en styles.css)
    const trendColor=trend<0?'var(--chart-g)':trend>0?'var(--chart-or)':'var(--t3)';
    const lineColor=trend<=0?'var(--chart-g)':'var(--chart-or)';
    document.getElementById('bw-chart').innerHTML=`<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="bwg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" style="stop-color:${lineColor}" stop-opacity="0.15"/><stop offset="100%" style="stop-color:${lineColor}" stop-opacity="0"/></linearGradient></defs>
      <path d="${areaD}" fill="url(#bwg)"/>
      <path d="${pathD}" fill="none" style="stroke:${lineColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${pts.map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" style="fill:${lineColor}"/>`).join('')}
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
    const deltaStr=i===recents.length-1?'':(delta===0?'':`<span class="wlog-delta" style="background:${delta<0?'var(--gl)':'var(--orl)'};color:${delta<0?'var(--gt)':'var(--ort)'}">${delta>0?'+':''}${delta.toFixed(1)}</span>`);
    return `<div class="wlog-row">
      <div class="wlog-date">${isToday?'<strong>Hoy</strong>':new Date(e.date+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}</div>
      <div class="wlog-kg">${e.kg} kg</div>
      ${deltaStr}
      <button class="hit40" onclick="deleteBodyWeight('${e.date}')" style="border:none;background:none;cursor:pointer;color:var(--t3);font-size:14px;padding:0;line-height:1" aria-label="Eliminar registro de peso">✕</button>
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
    // Construye las series HECHAS (lee del DOM/estado) y deja el cálculo a avi-core.
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
function _prRowHtml(pr,clientId){
  // 1RM estimado (Epley) solo para récords de peso con >1 rep — si es 1 rep el récord YA
  // es el 1RM, y reps fuera de rango devuelven null (no se muestra). Es una estimación.
  const isKg=(pr.unit||'kg')==='kg';
  const e1=isKg&&pr.reps>1?estimate1RM(pr.val!=null?pr.val:pr.kg,pr.reps):null;
  const tap=clientId?` pr-row-door" onclick="openRecordRoom('${esc(String(clientId))}','${esc(pr.name)}')` :'';
  return `<div class="pr-row${tap}">
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
    con.innerHTML=list.slice(0,PEEK).map(p=>_prRowHtml(p,clientId)).join('')+
      `<button class="collapse-more" onclick="togglePRs()">Ver mis ${list.length} récords ▾</button>`;
  } else {
    con.innerHTML=list.map(p=>_prRowHtml(p,clientId)).join('')+
      (list.length>COLLAPSE_AT?`<button class="collapse-more" onclick="togglePRs()">Ver menos ▴</button>`:'');
  }
}

// F3 (v307): chips de estadísticas de las habitaciones — el emoji pasa al SVG de marca
// equivalente (hereda --sc del chip). Emojis sin ícono propio se quedan como están.
const _SROOM_IC={'📅':'calendar','🏆':'trophy','🔁':'repeat','📊':'chart','💪':'dumbbell','🏋️':'barbell','🔥':'flame','💧':'droplet','🍽️':'utensils','🥧':'pie','📈':'trend','📉':'trenddown','➖':'flat','⬆️':'arrowup','⚡':'bolt','⏱':'timer','✅':'check','📋':'clipboard'};
function _sroomIc(e){const n=_SROOM_IC[e];return (n&&typeof aviIcon==='function')?aviIcon(n,18):e;}

function renderClientProfile(client){
  // 🔴 v403 metió aquí `if(!_dia1)` reusando una `const` que vive DENTRO de renderClientToday:
  // desde ese deploy, abrir «Perfil» lanzaba ReferenceError en la PRIMERA línea y la pantalla
  // entera dejaba de pintarse. Cada función calcula su propio estado del día 1 — jamás se
  // comparte una local por nombre entre funciones (fix 2026-07-27).
  const _dia1 = (typeof firstSessionMode==='function')
    && firstSessionMode((typeof DB!=='undefined'&&DB.history&&DB.history[client.id])||[]);
  if(!_dia1) renderCoachUpsell(client);
  renderGoogleLink();
  // Current weight from bodyweight log (most recent entry)
  const bwEntries=DB.bodyweight[client.id]||[];
  const currentKg=bwEntries.length?bwEntries[0].kg:client.weight;
  const _pfi=(nm,fb)=>typeof aviIcon==='function'?aviIcon(nm,12):fb;
  const avInner=client.avatar?`<img class="profav-img" src="${esc(client.avatar)}" alt="">`:ini(client.name);
  const _pc=document.getElementById('cn-prof-card');
  _pc.style.backgroundImage=`url('${aviProfilePhoto(client.sex)}')`;
  _pc.innerHTML=`<div class="profav tap" onclick="openAvatarPicker()" title="${client.avatar?'Cambiar foto':'Agregar foto'}">${avInner}<div class="profav-cam">${typeof aviIcon==='function'?aviIcon('camera',12):'📷'}</div></div><div><div class="profname">${esc(client.name)}</div><div class="profmeta">${esc(client.email)}</div><div class="profpills">${client.goal?`<span class="profpill">${_pfi('target','🎯')} ${esc(client.goal)}</span>`:''}${client.level?`<span class="profpill">${_pfi('chart','📊')} ${esc(client.level)}</span>`:''}<span class="profpill">${_pfi('calendar','📅')} ${esc(String(client.days||3))} días/sem</span>${currentKg?`<span class="profpill">${_pfi('scale','⚖️')} ${currentKg}kg</span>`:''}</div>${client.avatar?`<div class="profrm" onclick="removeAvatar()">✕ Quitar foto</div>`:''}</div></div>`;
  const rows=[[`${_pfi('target','🎯')} Objetivo`,client.goal],[`${_pfi('chart','📊')} Nivel`,client.level],[`${_pfi('calendar','📅')} Días de entreno`,`${client.days} días por semana`],currentKg?[`${_pfi('scale','⚖️')} Peso actual`,`${currentKg} kg`]:null,client.notes?[`${_pfi('pencil','📝')} Nota del coach`,client.notes]:null].filter(Boolean);
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

// (F5a 2026-07-06: el interruptor guiada/clásica y el flag ax_ui_guided se RETIRARON —
// el guiado es la única vista de "Hoy". Decisión de Camilo, validada en su celular.)

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
      <button class="btn bsm" onclick="openDeleteAccount()" style="background:transparent;color:var(--rdt);border:1.5px solid var(--rd);font-weight:700">🗑️ Eliminar mi cuenta</button>
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

// ══════════════════════ GAMIFICACIÓN (nivel permanente + logros) ══════════════════════
// GX_LEVELS, gxLevel → avi-core.js (fuente única de verdad, con tests). El descuento por
// adherencia (gxDiscount/gxNextTier) se ELIMINÓ el 2026-07-06 — decisión de Camilo: poca recepción.
function renderGamification(client){
  const con=document.getElementById('cn-gamif'); if(!con)return;
  const hist=(DB.history||{})[client.id]||[];
  const pays=(client.payments||[]);
  if(!hist.length && !pays.length){ con.innerHTML=''; return; } // asesorado nuevo: nada que mostrar aún
  const total=hist.length;
  const totalVol=hist.reduce((s,h)=>s+(h.totalVol||0),0);
  const L=gxLevel(total);
  const prs=Object.keys((DB.prs||{})[client.id]||{}).length;
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
  // Medallas de marca (v312, pedido Camilo): el "oro" lo pone el chip .gx-bic (anillo
  // degradado), el glifo es del set de línea. Progresión de kg: dumbbell→disc→barbell.
  // fb = emoji original por si aviIcon no cargó (caché mezclada).
  const B=[
    {ic:'trophy',fb:'🏆',nm:'Primer récord',on:prs>=1,gold:true},
    {ic:'check',fb:'✅',nm:'10 entrenos',on:total>=10},
    {ic:'medal',fb:'🎖️',nm:'30 entrenos',on:total>=30},
    {ic:'dumbbell',fb:'💪',nm:'10.000 kg',on:totalVol>=10000,gold:true},
    {ic:'barbell',fb:'⭐',nm:'50.000 kg',on:totalVol>=50000},
    {ic:'disc',fb:'🔩',nm:'20.000 kg',on:totalVol>=20000},
    {ic:'star',fb:'🥇',nm:'Nivel 3',on:L.cur.n>=3,gold:true},
    {ic:'crown',fb:'👑',nm:'Imparable',on:L.cur.n>=4,gold:true},
  ];
  const _bIc=(n,fb)=>typeof aviIcon==='function'?aviIcon(n,19):fb;
  const badgesHTML=`<div class="streak-title" style="margin-top:16px">${typeof aviIcon==='function'?aviIcon('medal',14):'🎖️'} Tus logros</div><div class="gx-badges">${B.map(b=>`<div class="gx-badge ${b.on?(b.gold?'gold':''):'lock'}"><div class="gx-bic">${b.on?_bIc(b.ic,b.fb):_bIc('lock','🔒')}</div><div class="gx-bn">${esc(b.nm)}</div></div>`).join('')}</div>`;
  con.innerHTML=lvlHTML+badgesHTML;
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
  // Nutrición: visible si el coach asignó plan O si es Premium (ahí vive la calculadora
  // automática de calorías/macros para el self-serve sin coach). El modo libre no la ve.
  const _nutClient=(DB.clients||[]).find(x=>x.id===clientId);
  show('cn-nut-card', hasNut || (_nutClient && !isFreeClient(_nutClient)));
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
// entrenando). La racha la calcula workoutStreak (avi-core, testeado).
// Fotos de marca por pantalla, según el sexo del asesorado (mismo criterio que los videos).
// Cualquier valor distinto de 'M' cae a la foto femenina (default seguro).
// Perfil/descanso: el hombre ve una foto del coach (coach-verde); la mujer, una atleta.
function aviProfilePhoto(sex){ return sex==='M' ? 'media/brand/coach-verde.jpg' : 'media/brand/ath-woman-2.jpg'; }
function aviRestPhoto(sex){ return sex==='M' ? 'media/brand/coach-verde.jpg' : 'media/brand/hiit-mujer.jpg'; }

// Saludo del "Hoy": texto simple (el wohero de abajo ya trae foto — una sola imagen por
// pantalla, decisión de Camilo 2026-07-05; la foto del coach saludando vive en la bienvenida).
function renderTodayHead(client){
  const el=document.getElementById('cn-today-head'); if(!el||!client)return;
  const h=new Date().getHours();
  const saludo=h<13?'Buenos días':h<20?'Buenas tardes':'Buenas noches';
  const name=esc((client.name||'').split(' ')[0]||'');
  // Racha SEMANAL (2026-07-06): semanas seguidas cumpliendo la meta del plan — la racha
  // por días consecutivos castigaba al de 3/sem (vivía en "Empieza tu racha hoy").
  const ws=weekStreak((DB.history&&DB.history[client.id])||[], planDays(client), new Date());
  // Íconos SVG de marca (v306, F2): flame para racha encendida, target para la meta en curso.
  const _ic=(n,s,fb)=>(typeof aviIcon==='function'?aviIcon(n,s):fb);
  const chip=ws.weeks>=1
    ? `<div class="streak-chip">${_ic('flame',15,'🔥')} <b>${ws.weeks}</b> semana${ws.weeks!==1?'s':''} cumpliendo tu plan</div>`
    : ws.thisWeekDays>0
      ? `<div class="streak-chip">${_ic('target',15,'💪')} Esta semana: <b>${ws.thisWeekDays}/${ws.target}</b> días</div>`
      : `<div class="streak-chip streak-0">${_ic('target',15,'💪')} Empieza tu racha esta semana</div>`;
  el.innerHTML=`<div class="today-greet"><div class="tg-hi">${saludo},</div><div class="tg-name">${name} 👋</div></div>${chip}`;
  // Botón de entrenamientos rápidos (HTML estático): el ⚡ emoji pasa a bolt SVG (F2).
  const qe=document.querySelector('#qw-entry .qw-entry-ic');
  if(qe&&typeof aviIcon==='function')qe.innerHTML=aviIcon('bolt',22);
}

// v313 (estudio de interfaz, mejora 1 aprobada por Camilo): en día de ENTRENO el entreno
// va PRIMERO (arriba del pliegue) y agua/rápidos/recordatorios/upsell después; en descanso
// o sin rutinas se mantiene el orden clásico. appendChild re-ancla en secuencia (idempotente,
// no duplica). Corre en cada render de Hoy — nunca con timer vivo (ese render se salta antes).
// ══════════ PORTADA DEL DÍA 1 — variante C del estudio de interfaz (PO, 2026-07-26) ══════════
// 8 de las 23 personas del gimnasio tienen rutina asignada y NUNCA completaron un entreno. El día 1
// «Hoy» les pedía primero autoevaluarse (ánimo) y dejaba bajo el pliegue lo único que importa: qué
// entrenan hoy y cómo empiezan. Esta portada ocupa la primera pantalla y solo tiene una salida.
// Se apaga SOLA en cuanto existe una sesión, aunque sea parcial (`firstSessionMode` — clase v367).
function renderFirstRun(client, routine){
  const el=document.getElementById('cn-firstrun'); if(!el) return false;
  el.innerHTML='';
  if(!client||!routine) return false;
  if(typeof firstSessionMode!=='function') return false;
  const sess=(typeof DB!=='undefined'&&DB.history&&DB.history[client.id])||[];
  if(!firstSessionMode(sess)) return false;
  const nombre=((client.name||'').trim().split(' ')[0])||'';
  const exN=(routine.exercises||[]).length;
  const mins=(typeof estimateWorkoutMinutes==='function')?estimateWorkoutMinutes(routine):null;
  const chips=[exN+' ejercicio'+(exN===1?'':'s')]
    .concat(mins?['~'+mins+' min']:[])   // sin estimación fiable NO se inventa un número
    .map(t=>'<span class="fr-chip">'+esc(t)+'</span>').join('');
  // «Mi Coach» es el valor POR DEFECTO de `getCoachName` (app-2): usarlo aquí sonaría a plantilla
  // sin rellenar («Mi Coach te armó tu plan»). Sin nombre real, la frase se dice sin nombre.
  const coach=(typeof getCoachName==='function'&&getCoachName())||'';
  const quien=(coach&&coach!=='Mi Coach')?(esc(coach)+' te armó tu plan. '):'';  // sin nombre, no se repite el título
  el.innerHTML='<div class="fr-wrap">'+
    '<div class="fr-emoji" aria-hidden="true">💪</div>'+
    '<h2 class="fr-h">'+(nombre?esc(nombre)+', tu plan está listo':'Tu plan está listo')+'</h2>'+
    '<p class="fr-sub">'+quien+'Hoy empiezas con el primero — tómate tu tiempo, lo importante es terminarlo.</p>'+
    '<div class="fr-card">'+
      '<div class="fr-eyebrow">'+(typeof aviIcon==='function'?aviIcon('dumbbell',12):'⚡')+' TU PRIMER ENTRENO</div>'+
      '<div class="fr-name">'+esc(routine.name||'Entrenamiento')+'</div>'+
      '<div class="fr-chips">'+chips+'</div>'+
    '</div>'+
    '<button type="button" class="fr-cta" onclick="firstRunGo()">Empezar mi primer entreno →</button>'+
    '<div class="fr-foot">Lo demás aparece cuando termines este.</div>'+
  '</div>';
  return true;
}
// El entreno YA está montado debajo (el guiado embebido ES el cuerpo de «Hoy»): el botón no
// "arranca" nada, lleva hasta él. Así no se toca el motor del guiado, que es zona caliente.
function firstRunGo(){
  const b=document.getElementById('cn-today-body');
  if(b&&b.scrollIntoView) b.scrollIntoView({behavior:'smooth',block:'start'});
}

function _todayOrder(training){
  const panel=document.getElementById('cn-today'); if(!panel)return;
  // v352: la tarjeta del Coach Inteligente (#cn-coach-card) va DESPUÉS del entreno en día de
  // entreno (no empuja el guiado bajo el pliegue, decisión v313) y ARRIBA en descanso/sin rutina
  // (ahí es el contenido principal del día).
  // v368: #cn-missday (día que se corrió) — en día de entreno va tras el entreno (no empuja el
  // guiado bajo el pliegue) y en descanso/sin rutina arriba, junto a las tarjetas de coaching.
  // A2 (adopción, 2026-07-25): #cn-cmty-nudge va al FINAL, junto a #cn-share — es una invitación,
  // no una tarea del día; jamás debe empujar el entreno bajo el pliegue (regla R1.6).
  // Día 1 (variante C): #cn-firstrun va JUSTO tras el saludo y antes del entreno — es la portada
  // que ocupa la primera pantalla de quien nunca ha entrenado. Los demás días queda vacía.
  const ids=training
    ? ['cn-today-head','cn-firstrun','cn-today-body','cn-missday','cn-coach-card','cn-habits','qw-entry','cn-push-nudge','cn-today-upsell','cn-news','cn-cmty-nudge','cn-share']
    : ['cn-today-head','cn-firstrun','cn-missday','cn-coach-card','qw-entry','cn-push-nudge','cn-today-upsell','cn-news','cn-habits','cn-today-body','cn-cmty-nudge','cn-share'];
  ids.forEach(id=>{const el=document.getElementById(id); if(el&&el.parentElement===panel)panel.appendChild(el);});
}
// Tarjeta compacta de "ya entrenaste hoy" (v366). Muestra QUÉ entrenó (routineName de las
// sesiones de hoy, deduplicado) y deja botones para entrenar otra vez o ver sus rutinas.
function _trainedTodayCardHTML(client){
  const today=(typeof localDayStart==='function')?localDayStart(new Date()):null;
  const sess=(DB.history[client.id]||[]).filter(s=>s&&today&&localDayStart(s.date)===today&&(typeof sessionFinished!=='function'||sessionFinished(s)));
  const names=[...new Set(sess.map(s=>s.routineName).filter(Boolean))];
  const trainedLine=names.length
    ? `Hoy entrenaste <b>${esc(names.join(' + '))}</b>${sess.length>1?` · ${sess.length} sesiones`:''}.`
    : 'Hoy ya hiciste tu entrenamiento.';
  return `<div class="trained-card">
    <div class="tc-ic">${typeof aviIcon==='function'?aviIcon('check',30):'✅'}</div>
    <div class="tc-title">¡Ya entrenaste hoy! 💪</div>
    <div class="tc-sub">${trainedLine} Tu cuerpo ya hizo el trabajo — hidrátate, registra tus pasos y descansa.</div>
    <div class="tc-actions">
      <button class="btn bo bsm" onclick="todayTrainAgain()">Entrenar otra vez</button>
      <button class="btn bg bsm" onclick="cnTab('cn-routines',document.querySelectorAll('.cntab')[1])">Ver mis rutinas</button>
    </div>
  </div>`;
}
// "Entrenar otra vez": muestra el entrenamiento de hoy aunque ya haya entrenado (2ª sesión del día).
// El flag vive en CUR (se resetea al recargar); un nuevo día ya no aplica (finishedTrainingToday será false).
function todayTrainAgain(){
  CUR.trainAgain=true;
  const c=DB.clients.find(x=>x.id===CUR.clientId);
  if(c){ renderClientToday(c,CUR.todayOverride); const t=document.getElementById('cn-today'); if(t)t.scrollTop=0; }
}
function renderClientToday(client, overrideRoutine){
  const con=document.getElementById('cn-today-body');
  // F2 sub-3: si el guiado embebido está montado con un timer vivo (descanso/HIIT/isométrico),
  // NO re-renderizar "Hoy" — el poll en vivo de 15s (que refresca cuando el coach cambia el
  // plan) no debe cortar la serie en curso. El refresco entra en el próximo render sin timer.
  // Reorden/ánimo NO pasan por aquí para re-render (llaman gmRebuild aparte), así que siguen ágiles.
  if(typeof _gmIsEmbedded==='function'
     && _gmIsEmbedded() && typeof _gmLiveTimer==='function' && _gmLiveTimer()) return;
  // F2: devolver #guided-mode a su sitio de overlay ANTES de tocar con.innerHTML (si estaba
  // embebido, es hijo de `con` y un innerHTML='' lo borraría del DOM). Cada render decide
  // de nuevo si embebe. Guard typeof por si app-6 (donde vive) aún no cargó.
  if(typeof _gmCaptureHome==='function'){ _gmCaptureHome(); gmRestoreOverlayHome(); }
  renderTodayHead(client);
  // 🔔 Recordatorio de notificaciones (2026-07-11): antes se pintaba UNA vez (4s tras login);
  // ahora en cada render de Hoy, para que persista si el permiso sigue en 'default'. La propia
  // renderPushNudge decide (permiso/snooze/_pushCtx) — barato y sin efectos si no aplica.
  // DÍA 1 (variante C): quien no ha empezado NI UN entreno ve una portada y nada más. Las tarjetas
  // secundarias se apagan enteras — no compiten con lo único que tiene que pasar hoy. En cuanto
  // exista una sesión (aunque sea parcial) esto es false y «Hoy» vuelve a ser lo de siempre.
  const _dia1 = (typeof firstSessionMode==='function')
    && firstSessionMode((typeof DB!=='undefined'&&DB.history&&DB.history[client.id])||[]);
  // OJO: apagar con `display:none` obliga a ENCENDER de vuelta. Sin esta restauración, al terminar
  // el primer entreno la portada se apaga pero hábitos/coach/novedades quedaban invisibles el resto
  // de la sesión (lo cazó `_verify-firstrun` D5 antes de salir de aquí).
  const _DIA1_OFF=['cn-push-nudge','cn-habits','cn-coach-card','cn-missday','cn-news','cn-today-upsell','cn-cmty-nudge','cn-share','qw-entry'];
  _DIA1_OFF.forEach(id=>{ const e=document.getElementById(id); if(!e) return;
    if(_dia1){ e.innerHTML=''; e.style.display='none'; } else if(e.style.display==='none'){ e.style.display=''; } });
  if(!_dia1 && typeof renderPushNudge==='function')renderPushNudge();
  // Self-heal del asesorado (v320): si ya dio permiso, re-suscribe forzado 1×/sesión (reintenta
  // si el intento de los 4s falló por la carrera del token). Guarded/idempotente.
  if(typeof ensureClientPush==='function')ensureClientPush();
  // 💧 Hábitos de hoy (v300): antes de los early-returns — la tarjeta también sale
  // en día de descanso y sin rutinas (el agua es diaria). Guard por caché vieja.
  if(!_dia1 && typeof renderHabitsCard==='function')renderHabitsCard(client);
  // 🧠 Coach Inteligente (v352): 1 insight priorizado (récord/racha/inactividad/…). Antes de los
  // early-returns → sale también en descanso y sin rutinas. Guard por caché vieja.
  if(!_dia1 && typeof renderCoachCard==='function')renderCoachCard(client);
  // 🔁 Día que se corrió (v368, idea Camilo 2026-07-17): rutina de un día ya pasado esta
  // semana sin entrenar → tarjeta para recuperarla hoy o moverla en el plan. Recibe el
  // override para callarse cuando el asesorado ya está enfocado en un entreno concreto.
  if(!_dia1 && typeof renderMissedDayCard==='function')renderMissedDayCard(client, overrideRoutine);
  // 💚 Comparte AVI (v370): banner ocasional de crecimiento orgánico, solo tras engagement real.
  // 🌐 Comunidad — la puerta (A2, adopción 2026-07-25): invita a activar el perfil a quien nunca
  // lo hizo Y ya tiene gente a quien ver. Va ANTES del banner de compartir a propósito: si esta
  // sale, aquel cede el turno (dos pedidos apilados en la misma pantalla se anulan entre sí).
  // F9: NADA de comunidad puede impedir que se pinte el entreno. Estas dos tarjetas corren ANTES
  // del cuerpo de «Hoy» y leen datos de localStorage que pueden venir corruptos; un throw aquí
  // dejaba la pantalla sin entreno. El fallo se traga a propósito (la tarjeta simplemente no sale).
  try{
    if(!_dia1 && typeof renderCommunityNudge==='function')renderCommunityNudge(client);
    if(!_dia1 && typeof renderShareBanner==='function')renderShareBanner(client);
  }catch(_e){ if(typeof warn==='function')warn('tarjetas de comunidad en Hoy:', _e&&_e.message); }
  // ✨ Novedades (v302): una vez por tanda, descartable.
  if(!_dia1 && typeof renderNewsCard==='function')renderNewsCard();
  renderCoachUpsell(client);
  const routines=client.routines||[];
  if(!routines.length){_todayOrder(false);con.innerHTML='<div class="noroutine"><div style="font-size:32px;margin-bottom:10px">📋</div><div style="font-size:14px;font-weight:700;color:var(--gt);margin-bottom:6px">Tu plan aún está en preparación</div><div style="font-size:12px;color:var(--t2);margin-bottom:14px">Tu coach está personalizando tu rutina. Mientras tanto, puedes enviarle un mensaje.</div><button class="btn bp bsm" onclick="cnTab(\'cn-messages\',document.getElementById(\'tab-msgs\'))">Ir a mensajes →</button></div>';return}
  // ✅ "Ya entrenaste hoy" (v366, fix v367): si ya TERMINÓ un entreno hoy (CUALQUIER rutina
  // finalizada — el lunes de pierna pudo finalizar la de espalda), colapsamos el entrenamiento en una
  // tarjeta compacta para que agua/pasos queden a la mano sin scrollear. CLAVE DEL FIX: exige sesión
  // FINALIZADA (finishedAt), NO una parcial en curso — el auto-guardado parcial (1ª serie) NO debe
  // disparar la tarjeta, o cambiar ánimo/reordenar/dolor/poll del coach (que re-renderizan a media
  // sesión) le pisarían el entreno en curso. NO aplica con override ("quiere entrenar esa") ni con
  // "Entrenar otra vez" (CUR.trainAgain). Va DESPUÉS del no-hay-rutinas y ANTES del descanso.
  if(typeof finishedTrainingToday==='function' && !overrideRoutine && !CUR.trainAgain && finishedTrainingToday(DB.history[client.id],new Date())){
    _todayOrder(false);
    con.innerHTML=_trainedTodayCardHTML(client);
    return;
  }
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
    _todayOrder(false);
    con.innerHTML=`<div class="avi-restbnr"><div class="rb-bg" style="background-image:url('${aviRestPhoto(client.sex)}')"></div><div class="rb-ov"></div><div class="rb-in">
      <div style="color:#fff;opacity:.92">${typeof aviIcon==='function'?aviIcon('moon',34):'💤'}</div>
      <div class="rb-title">Hoy es tu día de descanso</div>
      <div class="rb-sub">El descanso es parte del entrenamiento. Hoy tu cuerpo repara y crece — regresa mañana listo para rendir.</div>
      <button class="btn bp bsm" style="margin-top:6px" onclick="cnTab('cn-routines',document.querySelectorAll('.cntab')[1])">Ver todas mis rutinas →</button>
    </div></div>`;
    return;
  }
  // Check-in diario: si el asesorado ya marcó cómo se siente hoy, la rutina se
  // adapta (avi-core.applyMood, regla universal). Si no, mostramos el selector.
  // Guard de caché: si avi-core.js está viejo (sin applyMood), degradamos sin
  // check-in en vez de romper toda la vista de "Hoy".
  const _moodOK=(typeof applyMood==='function'&&typeof MOOD_STATES!=='undefined');
  const _mood=_moodOK?getTodayMood(client.id):'';
  const _adapted=_mood?applyMood(baseR,_mood,{sex:client.sex}):null;
  const todayR=_adapted||baseR;
  prepareTodaySession(todayR); // reset diario + reubicar dropsets huérfanos
  // F5b (2026-07-06): la lista clásica se RETIRÓ. El guiado embebido es la única vista;
  // si no puede embeber (throw por SW/index desincronizado), tarjeta de error con
  // Reintentar — NUNCA pantalla en blanco (blindaje F4, adaptado).
  CUR.activeRoutine=todayR;
  // Portada del día 1 (variante C): se pinta ANTES del entreno y decide ella sola si aplica.
  if(typeof renderFirstRun==='function') renderFirstRun(client, todayR);
  _todayOrder(true); // v313: el entreno arriba del pliegue
  con.innerHTML='';
  try{ if(typeof openGuidedEmbedded==='function' && openGuidedEmbedded(todayR)) return; }
  catch(err){ console.error('[AVI] el guiado embebido lanzó', err); }
  con.innerHTML=`<div class="card" style="text-align:center;padding:26px 18px">
    <div style="font-size:32px;margin-bottom:10px">🔄</div>
    <div style="font-size:14px;font-weight:700;color:var(--t1);margin-bottom:6px">No pudimos cargar tu entrenamiento</div>
    <div style="font-size:12px;color:var(--t2);margin-bottom:14px;line-height:1.5">Suele resolverse recargando la app. Tus datos están a salvo.</div>
    <button class="btn bp bsm" onclick="location.reload()">🔄 Recargar la app</button>
  </div>`;
}

// ── Check-in diario "¿cómo te sientes hoy?" ──
// El ánimo se guarda por asesorado y por día (localStorage). La lógica de
// adaptación vive en avi-core.applyMood (testeable); aquí solo UI + estado.
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
function moodChooserHtml(client,fnName){
  const fn=fnName==='gmPickMood'?fnName:'pickMood'; // allowlist: el nombre viaja a onclick
  const opts=MOOD_STATES.filter(m=>!m.femaleOnly||client.sex==='F');
  const btns=opts.map(m=>{
    const [mc,mct]=MOOD_COLORS[m.id]||['var(--g2)','var(--gl)'];
    return `<button class="mood-btn" style="--mc:${mc};--mct:${mct}" onclick="${fn}('${m.id}')" aria-label="${esc(m.label)}"><span class="mood-emoji">${m.emoji}</span><span class="mood-lbl">${esc(m.label)}</span></button>`;
  }).join('');
  return `<div class="checkin-card"><div class="checkin-q">¿Cómo te sientes hoy?</div><div class="checkin-sub">Ajustamos tu entrenamiento a cómo amaneciste.</div><div class="mood-grid">${btns}</div></div>`;
}
function moodBannerHtml(adapt,fnName){
  const fn=fnName==='gmChangeMood'?fnName:'changeMood'; // allowlist: el nombre viaja a onclick
  const map={g:['var(--gl)','var(--g2)','var(--gt)'],b:['var(--bll)','var(--bl)','var(--bl)'],r:['rgba(229,72,77,.10)','var(--rd)','var(--rd)']};
  const t=map[adapt.tone]||map.g;
  const chips=(adapt.changes&&adapt.changes.length)?`<div class="mood-chips">${adapt.changes.map(c=>`<span>${esc(c)}</span>`).join('')}</div>`:'';
  // Coach Inteligente Capa A (v352): bloque de bienestar "Para cuidarte hoy". esc() aunque
  // hoy sean estáticos (regla de la casa). Un solo cambio cubre la vista clásica Y el guiado
  // embebido (app-6 reusa moodBannerHtml). Guard por caché vieja de avi-core sin adapt.care.
  const care=(adapt.care&&adapt.care.length)
    ?`<div style="margin-top:10px;padding-top:9px;border-top:1px solid ${t[1]}"><div style="display:flex;align-items:center;gap:5px;font-size:11px;font-weight:800;color:${t[2]};text-transform:uppercase;letter-spacing:.03em;margin-bottom:5px">${typeof aviIcon==='function'?aviIcon('heart',13):'💚'}<span>Para cuidarte hoy</span></div>${adapt.care.map(c=>`<div style="font-size:12px;color:var(--t1);line-height:1.5;padding-left:2px">${esc(c)}</div>`).join('')}</div>`
    :'';
  return `<div style="background:${t[0]};border:1px solid ${t[1]};border-left:3px solid ${t[1]};border-radius:var(--r);padding:12px 14px;margin-bottom:12px"><div style="font-size:14px;font-weight:800;color:${t[2]};margin-bottom:3px">${esc(adapt.title)}</div><div style="font-size:12.5px;color:var(--t1);line-height:1.5">${esc(adapt.why)}</div>${chips}${care}<button onclick="${fn}()" style="margin-top:9px;font-size:11px;font-weight:700;color:var(--t3);background:none;border:none;cursor:pointer;padding:0;text-decoration:underline">Cambiar cómo me siento</button></div>`;
}
function pickMood(mood){
  const c=DB.clients.find(x=>x.id===CUR.clientId);if(!c)return;
  setTodayMood(c.id,mood);
  renderClientToday(c,CUR.todayOverride);
  const today=document.getElementById('cn-today');if(today)today.scrollTop=0;
  // Estados que requieren avisar al coach (hoy: dolor). La verdad vive en
  // avi-core.applyMood (adapt.flagCoach) → si mañana otro estado lo activa,
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

// ── Coach Inteligente: tarjeta de insight en "Hoy" (Capa B, v352) ──
// Lee el insight priorizado de avi-core.coachInsight (motor de REGLAS puro) y lo pinta como una
// tarjeta ligera. "Entendido" silencia ese tipo por unos días — localStorage por asesorado+tipo,
// LOCAL a propósito (no sincroniza: es preferencia efímera de UI, no dato del asesorado).
const _INSIGHT_MUTE_DAYS={inactivo:2,record:2,racha:3,estancado:7,adaptacion:5,deload:21,peso:5,agua:3};
function _coachMuteKey(cid,type){return 'coachmute_'+cid+'_'+type;}
function _coachMuteMap(cid){
  const m={};
  Object.keys(_INSIGHT_MUTE_DAYS).forEach(t=>{const v=parseInt(localStorage.getItem(_coachMuteKey(cid,t)));if(v)m[t]=v;});
  return m;
}
function dismissCoachInsight(type){
  const c=DB.clients.find(x=>x.id===CUR.clientId);if(!c||!type)return;
  const days=_INSIGHT_MUTE_DAYS[type]||3;
  localStorage.setItem(_coachMuteKey(c.id,type),String(Date.now()+days*86400000));
  renderCoachCard(c); // se oculta o muestra el siguiente insight
}
function renderCoachCard(client){
  const el=document.getElementById('cn-coach-card');if(!el)return;
  const cid=client&&client.id;
  if(typeof coachInsight!=='function'||!cid){el.innerHTML='';return;} // guard caché vieja de avi-core
  // v353: pasamos peso (bodyweight) y meta de agua para las señales finas. Guard typeof:
  // _waterGoalFor vive en app-5; si aún no cargó, agua cae a waterGoalGlasses(peso) en core.
  const _bw=(DB.bodyweight&&DB.bodyweight[cid])||[];
  const _wg=(typeof _waterGoalFor==='function')?_waterGoalFor(client):undefined;
  const ins=coachInsight(client,(DB.history&&DB.history[cid])||[],(DB.prs&&DB.prs[cid])||{},Date.now(),{isFree:isFreeClient(client),muted:_coachMuteMap(cid),bw:_bw,waterGoal:_wg});
  if(!ins){el.innerHTML='';return;} // sin señal (o todas silenciadas) → la tarjeta desaparece sola
  const ic=typeof aviIcon==='function'?aviIcon(ins.icon,20):'';
  // El cta solo llega en insights premium (estancado); premium sí tiene chat → coherente.
  const ctaBtn=(ins.cta&&ins.cta.action==='msgs')
    ?`<button class="btn bp bsm" onclick="cnTab('cn-messages',document.getElementById('tab-msgs'))" style="flex:1;min-height:36px">${esc(ins.cta.label)}</button>`
    :'';
  el.innerHTML=`<div class="card" data-insight="${esc(ins.type)}" style="padding:14px 15px;margin-bottom:12px">
    <div style="display:flex;align-items:flex-start;gap:10px">
      <div style="color:var(--g2);flex:0 0 auto;margin-top:1px">${ic}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:800;color:var(--t1);margin-bottom:3px">${esc(ins.title)}</div>
        <div style="font-size:12.5px;color:var(--t2);line-height:1.5">${esc(ins.msg)}</div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:11px">${ctaBtn}<button class="btn bg bsm" onclick="dismissCoachInsight('${esc(ins.type)}')" style="${ins.cta?'':'flex:1;'}min-height:36px">Entendido</button></div>
  </div>`;
}

// ══════════════════ DÍA QUE SE CORRIÓ — recuperar / mover (v368) ══════════════════
// Idea de Camilo 2026-07-17 (híbrido elegido por él): si una rutina de un día YA PASADO de
// esta semana quedó sin entrenar, ofrecerle (1) "Entrenar hoy" = abrirla como override (el
// plan NO se toca), (2) "Mover a hoy en mi plan" = swap de días + sync a su fila, (3) "Hoy no"
// = mute por-rutina-por-semana (local). El motor (weeklyMissed) es puro en avi-core.
function _missMuteMap(cid){ try{ return JSON.parse(localStorage.getItem('ax_missmute_'+cid))||{}; }catch(e){ return {}; } }
function _missMuteSet(cid,rid){
  const map=_missMuteMap(cid);
  map[rid]=(typeof weekStartTs==='function')?weekStartTs(new Date()):Date.now();
  try{ localStorage.setItem('ax_missmute_'+cid, JSON.stringify(map)); }catch(e){}
}
function renderMissedDayCard(client, override){
  const el=document.getElementById('cn-missday'); if(!el)return;
  el.innerHTML='';
  if(typeof weeklyMissed!=='function'||!client)return;                    // guard caché vieja
  if(override||CUR.trainAgain)return;                                     // ya está en un entreno
  const hist=(DB.history&&DB.history[client.id])||[];
  // v372 (reserva Fable): NO mostrar si ya entrenó O está entrenando hoy. Antes solo miraba
  // finishedTrainingToday → con un entreno de hoy a MEDIA SESIÓN (parcial ya auto-guardado) la
  // tarjeta salía y "Mover a hoy" cambiaba la vista escondiendo el entreno en curso (misma CLASE
  // del bug que v367 mató en la trained-card). Cualquier sesión de hoy (parcial o cerrada) = hoy ya
  // hizo algo → sin nudge. Antes de la 1ª serie aún no hay sesión → puede salir (no hay qué pisar).
  const _td=(typeof localDayStart==='function')?localDayStart(new Date()):null;
  if(_td!==null && hist.some(s=>s&&localDayStart(s.date)===_td))return;
  let missed=weeklyMissed(client,hist,new Date());
  if(!missed.length)return;
  // Mute por-rutina-por-semana (LOCAL, NO en SB_KEYS a propósito, como los mutes del coach).
  const mute=_missMuteMap(client.id), wk=(typeof weekStartTs==='function')?weekStartTs(new Date()):0;
  missed=missed.filter(m=>mute[m.routine.id]!==wk);
  if(!missed.length)return;
  const r=missed[0].routine;                                             // top-1: la más atrasada
  const nm=esc(r.name||'tu rutina'), dn=esc(missed[0].dayName||'');
  el.innerHTML=`<div class="card" style="padding:14px 15px;margin-bottom:12px">
    <div style="display:flex;align-items:flex-start;gap:10px">
      <div style="color:var(--g2);flex:0 0 auto;margin-top:1px">${typeof aviIcon==='function'?aviIcon('repeat',20):'🔁'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:800;color:var(--t1);margin-bottom:3px">Te quedó pendiente esta semana</div>
        <div style="font-size:12.5px;color:var(--t2);line-height:1.5">No alcanzaste <b>${nm}</b> (${dn}). ¿La recuperas hoy?</div>
      </div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:11px">
      <button class="btn bp bsm" onclick="missTrainToday('${esc(r.id)}')" style="flex:1;min-width:132px;min-height:36px">Entrenar hoy</button>
      <button class="btn bo bsm" onclick="missMoveToday('${esc(r.id)}')" style="flex:1;min-width:132px;min-height:36px">Mover a hoy en mi plan</button>
    </div>
    <button class="btn bg bsm" onclick="missMute('${esc(r.id)}')" style="width:100%;min-height:36px;margin-top:8px">Hoy no</button>
  </div>`;
}
// "Entrenar hoy": abre la rutina perdida como override — el plan guardado NO cambia (reusa startRoutineNow).
function missTrainToday(rid){ if(typeof startRoutineNow==='function')startRoutineNow(rid); }
// "Hoy no": mute de esa rutina por esta semana (caduca al cambiar de semana) + re-render.
function missMute(rid){
  const c=DB.clients.find(x=>x.id===CUR.clientId); if(!c)return;
  _missMuteSet(c.id,rid);
  renderClientToday(c);
}
// "Mover a hoy en mi plan": SWAP de días — la perdida toma HOY; lo que ocupaba hoy toma el día
// que ella dejó libre. Persiste + sincroniza por la MISMA vía sancionada que cualquier edición
// del plan (sv('ax_c') → upsertOwn perfil+rutinas de la fila propia). Si el desplazado cae en un
// día ya pasado (porque el que dejó la perdida es pasado), lo muteamos esta semana: el asesorado
// lo desplazó a propósito, no es un "olvido" que valga la pena volver a gritar.
function missMoveToday(rid){
  const c=DB.clients.find(x=>x.id===CUR.clientId); if(!c)return;
  const routines=c.routines||[];
  const r=routines.find(x=>x.id===rid); if(!r)return;
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const today=days[new Date().getDay()];
  const oldDay=r.day;
  const occ=routines.find(x=>x&&x.day===today&&x.id!==r.id); // la que ocupaba hoy (si había)
  r.day=today;
  if(occ){
    occ.day=oldDay;                                          // swap
    if(typeof dayOrder==='function'&&dayOrder(oldDay)<dayOrder(today))_missMuteSet(c.id,occ.id); // cayó en pasado → no nagear
  }
  sv('ax_c',DB.clients);
  toast(`✅ ${r.name||'Rutina'} movida a hoy`);
  renderClientToday(c);                                      // ahora HOY es la rutina movida → entreno arriba
  const t=document.getElementById('cn-today'); if(t)t.scrollTop=0;
}

// ══════════════════ COMPARTE AVI — crecimiento orgánico (v370) ══════════════════
// Banner ocasional en "Hoy" para que el asesorado invite a alguien. Aparece SOLO tras engagement
// real (≥3 sesiones finalizadas, motor puro shareBannerEligible) y se pospone 45 días al descartar.
// Comparte con navigator.share nativo (móvil) y cae a WhatsApp (elige contacto) si no está.
const AVI_SHARE_URL='https://kronos-apex.github.io/apex-app/';
const AVI_SHARE_MSG='Entreno con AVI 💪 una app para llevar mis rutinas y ver mi progreso. Míralo aquí:';
function renderShareBanner(client){
  const el=document.getElementById('cn-share'); if(!el)return;
  el.innerHTML='';
  if(typeof shareBannerEligible!=='function'||!client){ el.style.display='none'; return; }
  // A2: si la tarjeta de Comunidad ya está pidiendo algo en esta misma pantalla, este banner
  // se calla (dos pedidos apilados se anulan entre sí). Vuelve solo cuando aquella se va.
  if(typeof CMTY!=='undefined'&&CMTY.nudgeOn){ el.style.display='none'; return; }
  let snooze=0; try{ snooze=parseInt(localStorage.getItem('ax_sharesnooze'))||0; }catch(e){}
  if(!shareBannerEligible((DB.history&&DB.history[client.id])||[],Date.now(),snooze)){ el.style.display='none'; return; }
  el.style.display='block';
  el.innerHTML=`<div class="card" style="padding:12px 14px;display:flex;align-items:center;gap:11px">
    <div style="color:var(--g2);flex:0 0 auto">${typeof aviIcon==='function'?aviIcon('heart',20):'💚'}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:800;color:var(--t1)">¿Te sirve AVI?</div>
      <div style="font-size:12px;color:var(--t2);line-height:1.45">Invita a alguien a empezar a entrenar contigo.</div>
    </div>
    <button class="btn bp bsm" style="flex:0 0 auto;min-height:36px" onclick="shareApp()">Compartir</button>
    <button class="btn bg bsm" style="flex:0 0 auto;min-height:36px;padding:0 10px" aria-label="Ahora no" onclick="dismissShare()">✕</button>
  </div>`;
}
async function shareApp(){
  const msg=AVI_SHARE_MSG+' '+AVI_SHARE_URL;
  try{
    if(navigator.share){
      await navigator.share({title:'AVI',text:AVI_SHARE_MSG,url:AVI_SHARE_URL});
      dismissShare(); // compartió → no seguir insistiendo pronto
      return;
    }
  }catch(e){ if(e&&e.name==='AbortError')return; } // canceló el share: silencio, sin snooze
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank'); // respaldo: elige contacto en WhatsApp
  dismissShare();
}
function dismissShare(){
  try{ localStorage.setItem('ax_sharesnooze',String(Date.now()+ (typeof SHARE_SNOOZE_DAYS!=='undefined'?SHARE_SNOOZE_DAYS:45)*86400000)); }catch(e){}
  const el=document.getElementById('cn-share'); if(el){ el.style.display='none'; el.innerHTML=''; }
}

function startRoutineNow(routineId){
  const c=DB.clients.find(x=>x.id===CUR.clientId);if(!c)return;
  const routine=routineId?((c.routines||[]).find(r=>r.id===routineId)||null):null;
  const tabs=document.querySelectorAll('.cntab');
  cnTab('cn-today',tabs[0]);
  renderClientToday(c,routine);
  document.getElementById('cn-today').scrollTop=0;
}

// ══════════════════════ BIBLIOTECA DE ENTRENAMIENTOS RÁPIDOS ══════════════════════
// Sesiones curadas para días FUERA del plan asignado (no pudo ir al gym, quiere un HIIT
// o abdomen suelto en casa…). No tocan el plan guardado, pero SÍ cuentan en el historial:
// cada una tiene id propio → session_id propio ([[project_avi_historial_session_id]]).
// Reusan el motor de "Hoy" vía renderClientToday(client, override). `track` explícito por
// ítem porque exTrack manda 'Movilidad' a 'peso_reps' (pediría kg). Todo sin equipo.
const QUICK_WORKOUTS=[
  {id:'qw_hiit_maquina', emoji:'🚴', ic:'bike', name:'HIIT en Máquina', goal:'Cardio · HIIT', place:'Gym', dur:'~10 min',
   desc:'Bici estática, elíptica o trotadora: sprints fuertes con pausas suaves. Tú eliges las rondas.',
   items:[{id:'e74',sets:10,hiit:{work:30,rest:15}}]},
  {id:'qw_hiit_casa', emoji:'🔥', ic:'flame', name:'HIIT Quema-grasa', goal:'Cardio · HIIT', place:'Casa/Parque', dur:'~15 min',
   desc:'Circuito de alta intensidad sin equipo: 4 rondas de 30s fuerte / 15s de pausa.',
   items:[{id:'e182',sets:4,hiit:{work:30,rest:15}},{id:'e81',sets:4,hiit:{work:30,rest:15}},{id:'e184',sets:4,hiit:{work:30,rest:15}},{id:'e202',sets:4,hiit:{work:30,rest:15}},{id:'e183',sets:4,hiit:{work:30,rest:15}}]},
  {id:'qw_abs_casa', emoji:'💥', ic:'burst', name:'Abdomen Express', goal:'Core', place:'Casa', dur:'~10 min',
   desc:'Cinco ejercicios para encender el abdomen en casa, sin equipo.',
   items:[{id:'e18',sets:3,reps:15,track:'reps'},{id:'e72',sets:3,reps:12,track:'reps'},{id:'e81',sets:3,reps:20,track:'reps'},{id:'e49',sets:3,reps:30,track:'tiempo'},{id:'e17',sets:3,reps:40,track:'tiempo'}]},
  {id:'qw_movilidad', emoji:'🧘', ic:'leaf', name:'Movilidad & Estiramiento', goal:'Movilidad · Recuperación', place:'Casa', dur:'~10 min',
   desc:'Sesión suave para descanso activo o cuando no puedes entrenar fuerte. Suelta espalda y caderas.',
   items:[{id:'e165',sets:2,reps:30,track:'tiempo'},{id:'e173',sets:2,reps:30,track:'tiempo'},{id:'e170',sets:2,reps:30,track:'tiempo'},{id:'e168',sets:2,reps:30,track:'tiempo'},{id:'e179',sets:2,reps:30,track:'tiempo'},{id:'e167',sets:2,reps:40,track:'tiempo'}]},
  {id:'qw_fullbody_casa', emoji:'⚡', ic:'bolt', name:'Full-Body Express', goal:'Cuerpo completo', place:'Casa', dur:'~20 min',
   desc:'Un poco de todo sin equipo: empuje, pierna, glúteo, tracción y core.',
   items:[{id:'e83',sets:3,reps:12,track:'reps'},{id:'e162',sets:3,reps:12,track:'reps'},{id:'e73',sets:3,reps:15,track:'reps'},{id:'e146',sets:3,reps:12,track:'reps'},{id:'e17',sets:3,reps:40,track:'tiempo'}]},
  {id:'qw_gluteo_casa', emoji:'🍑', ic:'dumbbell', name:'Glúteo & Pierna en casa', goal:'Glúteo · Pierna', place:'Casa', dur:'~15 min',
   desc:'Tren inferior sin equipo, enfocado en glúteo. Con banda, aún mejor.',
   items:[{id:'e73',sets:4,reps:15,track:'reps'},{id:'e162',sets:3,reps:12,track:'reps'},{id:'e130',sets:3,reps:15,track:'reps'},{id:'e106',sets:3,reps:10,track:'reps'},{id:'e163',sets:3,reps:15,track:'reps'}]},
  {id:'qw_plio', emoji:'🏃', ic:'gauge', name:'Cardio Pliométrico', goal:'Cardio · Potencia', place:'Parque/Casa', dur:'~12 min',
   desc:'Saltos e intervalos explosivos: 3 rondas de 40s fuerte / 20s de pausa. Alto impacto.',
   items:[{id:'e184',sets:3,hiit:{work:40,rest:20}},{id:'e185',sets:3,hiit:{work:40,rest:20}},{id:'e186',sets:3,hiit:{work:40,rest:20}},{id:'e198',sets:3,hiit:{work:40,rest:20}},{id:'e203',sets:3,hiit:{work:40,rest:20}}]}
];
// Arma una rutina válida para el motor de "Hoy" desde un preset: spread de la entrada del
// catálogo (hereda name/muscle/type/icon/desc) + override de sets/reps/track/hiit.
// cfg opcional (v301, pedido Camilo 2026-07-09): {rounds,work,rest} elegidos por el
// usuario en el mini-modal — se aplica SOLO a los ítems HIIT (rondas = sets).
function buildQuickRoutine(spec, cfg){
  const exercises=(spec.items||[]).map(it=>{
    const base=(DB.exercises||[]).find(e=>e.id===it.id)||{id:it.id,name:it.id,type:'Bodyweight'};
    const ex={...base};
    if(it.sets!=null)ex.sets=it.sets;
    if(it.reps!=null)ex.reps=it.reps;
    if(it.track)ex.track=it.track;
    if(it.hiit){
      ex.type='HIIT';ex.track='hiit';ex.hiit={...(base.hiit||{}),...it.hiit};
      if(cfg){ex.sets=cfg.rounds;ex.hiit={work:cfg.work,rest:cfg.rest};}
    }
    return ex;
  });
  return {id:spec.id,name:spec.name,day:'Libre',quick:true,exercises};
}
function openQuickWorkouts(){
  const room=document.getElementById('quickwo-room'),body=document.getElementById('quickwo-body');
  if(!room||!body)return;
  body.innerHTML=`<div class="qw-intro">Sesiones listas para un día fuera de tu plan. No cambian tu rutina asignada, pero <b>sí cuentan</b> en tu historial y tu racha 🔥</div>`+
    QUICK_WORKOUTS.map(w=>`<button class="qw-card" onclick="startQuickWorkout('${w.id}')">
      <span class="qw-card-ic">${typeof aviIcon==='function'&&w.ic?aviIcon(w.ic,24):w.emoji}</span>
      <span class="qw-card-mid">
        <span class="qw-card-nm">${esc(w.name)}</span>
        <span class="qw-card-meta">${esc(w.goal)} · ${esc(w.place)} · ${esc(w.dur)}</span>
        <span class="qw-card-desc">${esc(w.desc)}</span>
        <span class="qw-card-tag">${(w.items||[]).length} ejercicios</span>
      </span>
      <span class="qw-card-go">›</span>
    </button>`).join('')+`<div style="height:30px"></div>`;
  body.scrollTop=0; _roomFront(room); _syncRoomBodyClass();
}
function closeQuickRoom(){ const r=document.getElementById('quickwo-room'); if(r)r.classList.remove('on'); _syncRoomBodyClass(); }
// Arranca un extra como "Hoy" (override) sin tocar el plan. Cierra la biblioteca consumiendo
// su capa de historial (como el botón atrás) antes de renderizar, para no dejar el overlay encima.
// Presets con HIIT (v301): antes de arrancar se abre el mini-modal de rondas/trabajo/descanso
// prellenado con los valores del preset — el usuario decide (pedido Camilo 2026-07-09).
let _qwCfgSpec=null;
function startQuickWorkout(id){
  const spec=QUICK_WORKOUTS.find(w=>w.id===id); if(!spec)return;
  const hiitItem=(spec.items||[]).find(it=>it.hiit);
  if(hiitItem){
    _qwCfgSpec=spec;
    const nm=document.getElementById('qwcfg-name'); if(nm)nm.textContent=spec.name;
    // Ícono SVG de marca en el título (v303, F1): bici para máquina, rayo para el resto.
    const icEl=document.getElementById('qwcfg-ic');
    if(icEl)icEl.innerHTML=(typeof aviIcon==='function')?aviIcon(spec.ic||'bolt',20):(spec.emoji||'⚡');
    const set=(i,v)=>{const e=document.getElementById(i);if(e)e.value=v;};
    set('qwcfg-rounds',hiitItem.sets||4); set('qwcfg-work',(hiitItem.hiit&&hiitItem.hiit.work)||30); set('qwcfg-rest',(hiitItem.hiit&&hiitItem.hiit.rest)||15);
    om('m-qwcfg');
    return;
  }
  _qwGo(spec,null);
}
// Confirmación del mini-modal: clamps de cordura en avi-core (clampQwHiit, testeado).
function qwStartConfigured(){
  const spec=_qwCfgSpec; if(!spec){cm('m-qwcfg');return;}
  const hiitItem=(spec.items||[]).find(it=>it.hiit)||{};
  const def={rounds:hiitItem.sets||4,work:(hiitItem.hiit&&hiitItem.hiit.work)||30,rest:(hiitItem.hiit&&hiitItem.hiit.rest)||15};
  const g=i=>(document.getElementById(i)||{}).value;
  const cfg=clampQwHiit({rounds:g('qwcfg-rounds'),work:g('qwcfg-work'),rest:g('qwcfg-rest')},def);
  _qwCfgSpec=null;
  cm('m-qwcfg');
  _qwGo(spec,cfg);
}
function _qwGo(spec,cfg){
  const c=DB.clients.find(x=>x.id===CUR.clientId); if(!c)return;
  const routine=buildQuickRoutine(spec,cfg);
  // La entrada vive dentro de "Hoy", así que ya estamos en esa pestaña: NO usamos cnTab (su
  // manejo de historial chocaría con el history.back que cierra la biblioteca). Solo renderizamos
  // el extra como override y dejamos que history.back cierre la sala (consume su capa).
  const room=document.getElementById('quickwo-room');
  const go=()=>{ renderClientToday(c,routine); const t=document.getElementById('cn-today'); if(t)t.scrollTop=0; toast('⚡ '+spec.name+' — ¡a darle!'); };
  if(room&&room.classList.contains('on')){ history.back(); setTimeout(go,70); } else go();
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
// exTrack → avi-core.js (fuente única de verdad)
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
// usando el heurístico inferExerciseEnv (avi-core.js). PROPONE — el coach valida/edita.
// Solo asigna si falta → no pisa ediciones del coach. Ver docs/estilos-y-entornos.md.
function migrateEnv(){
  if(localStorage.getItem('ax_env_migrated')==='1')return;
  // Si avi-core.js está desactualizado en caché, NO marcar como hecho → reintenta al recargar.
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
// fmtMetric → avi-core.js (fuente única, testeada)
function lastreOn(routine,ei){return localStorage.getItem(`lastre_${routine.id}_${ei}`)==='1';}
function toggleLastre(routine,ei){localStorage.setItem(`lastre_${routine.id}_${ei}`,lastreOn(routine,ei)?'0':'1');}

function exMetaText(ex,sets,track){
  if(track==='hiit'){const c=hiitCfg(ex);return `${sets} rondas · ${c.work}s/${c.rest}s`;}
  if(track==='tiempo')return `${sets} series × ${holdSecsOf(ex)}s`;
  if(track==='cardio')return `${ex.reps} min`;
  return `${sets} series × ${ex.reps} reps`;
}
// Contenido de la celda ".exsets" (vista de rutina) según MODALIDAD. Antes se pintaba
// siempre "S×R series × reps" → para un cardio mostraba "1×20 series × reps" en vez de
// "20 min". Camilo 2026-06-29.
function exSetsCellHTML(e){
  const t=exTrack(e);
  if(t==='cardio')return `${esc(String(e.reps||0))}<small>min de cardio</small>`;
  if(t==='tiempo')return `${esc(String(e.sets||0))}×${esc(String(holdSecsOf(e)))}<small>series × seg</small>`;
  if(t==='hiit'){const c=hiitCfg(e);return `${esc(String(e.sets||0))}<small>rondas · ${c.work}s/${c.rest}s</small>`;}
  return `${esc(String(e.sets||0))}×${esc(String(e.reps||0))}<small>series × reps</small>`;
}

// (setLogHeadHTML — cabecera de la tabla clásica — RETIRADA en F5b 2026-07-06)

// ── Peso sugerido por PR (Epley, funciones en avi-core) ──
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
// Estado de "mostrar/ocultar calentamiento" por ejercicio (default: OCULTO). El toggle
// del guiado es gmToggleExWarm (app-6); comparte esta clave wshow_. (toggleExWarm y
// buildWarmupSection — la sección clásica — se RETIRARON en F5b 2026-07-06.)
function exWarmShown(routine,ei){return localStorage.getItem(`wshow_${routine.id}_${ei}`)==='1';}
// Índice de log del set de calentamiento. Token 'w0' (string) → los bucles de
// volumen/récords/historial recorren si ENTEROS 0..sets-1, así que NUNCA lo tocan.
const WARM_SI='w0';

// ── Dropsets (uno por serie, opcional) ── peso reducido tras la serie, SIN descanso.
// Se ALTERNA deslizando la serie a la DERECHA (attachDropSwipe): añade o quita. Token 'd'+si →
// fuera de los bucles enteros de volumen/récords/historial (que recorren si ENTERO).
function dropTok(si){return 'd'+si;}
function dropSetOn(routine,ei,si){return localStorage.getItem(`drop_${routine.id}_${ei}_${si}`)==='1';}
// `rerender`: el guiado pasa gmRender para que la fila 🔻 aparezca/desaparezca.
// (El default clásico renderClientExList se retiró en F5b — sin rerender, no-op.)
function addDropSet(routine,ei,si,rerender){
  localStorage.setItem(`drop_${routine.id}_${ei}_${si}`,'1');
  if(navigator.vibrate)navigator.vibrate(25);
  toast(`🔻 Dropset añadido a la serie ${si+1}`);
  (rerender||(()=>{}))();
}
function removeDropSet(routine,ei,si,rerender){
  localStorage.removeItem(`drop_${routine.id}_${ei}_${si}`);
  const tok=dropTok(si); ['kg','reps'].forEach(f=>setLog(routine.id,ei,tok,f,'')); setDone(routine.id,ei,tok,false);
  (rerender||(()=>{}))();
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
// (buildDropRow — la fila de dropset de la tarjeta clásica — RETIRADA en F5b 2026-07-06;
// el guiado pinta la suya vía gmAuxRowHTML con las MISMAS claves d<si>.)
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

// (setLogInputsHTML y setDoneToast — inputs/toast de la tarjeta clásica — RETIRADOS en
// F5b 2026-07-06; el guiado usa gmSetCellsHTML y sus propios toasts.)

// ── Wake Lock: mantener pantalla encendida durante timers ──
let aviWakeLock=null;
async function reqWake(){try{if('wakeLock'in navigator)aviWakeLock=await navigator.wakeLock.request('screen');}catch(e){}}
function relWake(){try{if(aviWakeLock){aviWakeLock.release();aviWakeLock=null;}}catch(e){}}

// (El HIIT clásico — buildHiitCard/startHiit/stopHiit — y el cronómetro isométrico
// clásico — HOLD/_endHoldUI/cancelHold/startHoldTimer — se RETIRARON en F5b 2026-07-06.
// El guiado tiene los suyos: gmRenderHiit/gmStartHiit/gmStopHiit y gmHoldTimer, con la
// misma semántica v245: ámbar, cancelar honesto, marca sola al llegar a 0.)

// ── Sincroniza campos de config del formulario de ejercicio según el tipo ──
function exFormSync(){
  const t=document.getElementById('ex-t').value;
  const hiitRow=document.getElementById('ex-hiit-row');
  const holdRow=document.getElementById('ex-hold-row');
  if(hiitRow)hiitRow.style.display=t==='HIIT'?'':'none';
  if(holdRow)holdRow.style.display=t==='Isométrico'?'':'none';
}

// Devuelve true si reinició (el guiado lo usa para re-sincronizar su estado GM).
// ── Identidad de sesión (fix pérdida de datos, Camilo 2026-07-03) ──
// El historial se de-duplicaba por (rutina + día), así que un SEGUNDO entreno de la misma rutina
// el mismo día PISABA al primero (Camilo entrenó pierna en la mañana y al reiniciar por la tarde
// mientras probaba el guiado se borró el de la mañana). Ahora cada sesión tiene id propio: se
// acuña al arrancar fresca (día nuevo o reiniciar) y saveSessionToHistory hace match por ese id
// → un reinicio crea una entrada NUEVA, no destruye la anterior. Regla: nunca perder un entreno.
function _sessionIdKey(rid){ return 'session_id_'+rid; }
function currentSessionId(rid){ try{ return localStorage.getItem(_sessionIdKey(rid))||''; }catch(e){ return ''; } }
function startNewSession(rid){ const id=uid(); try{ localStorage.setItem(_sessionIdKey(rid),id); }catch(e){} return id; }

function resetSession(){
  const routine=CUR.activeRoutine;if(!routine)return false;
  if(!confirm('¿Reiniciar el entrenamiento de hoy? Se borrarán las series completadas pero se conservarán los pesos.'))return false;
  (routine.exercises||[]).forEach((ex,ei)=>{
    const sets=parseInt(ex.sets)||3;
    for(let si=0;si<sets;si++) localStorage.removeItem(getDoneKey(routine.id,ei,si));
  });
  clearWarmup(routine.id);
  clearWarmDropDone(routine);
  localStorage.removeItem(`session_date_${routine.id}`);
  startNewSession(routine.id); // reiniciar = sesión NUEVA → no pisa la entrada de historial ya guardada
  // (F5b: la limpieza de timers/overlay del guiado la hace gmResetSession, que es quien llama.)
  updateClientProgress(routine);toast('↺ Sesión reiniciada');
  return true;
}

// Preparación de la sesión del día, INDEPENDIENTE del modo (clásica o guiado): reset
// diario + reubicación de dropsets huérfanos. Debe correr al entrar a "Hoy" ANTES de
// cualquier render — cuando el guiado sea la pantalla principal (plan unificación F2),
// la lista clásica puede no renderizar nunca, así que esto no puede vivir dentro de
// renderClientExList. La llaman renderClientToday y openGuidedEmbedded; es idempotente
// dentro del mismo día.
function prepareTodaySession(routine){
  // Blindaje (F4): un hueco null/undefined en exercises (dato corrupto por sync/edición) haría
  // lanzar tanto a la clásica (checkAndResetSession recorre exercises) como al guiado
  // (gmRebuild/guidedStepOrder) → "Hoy" en blanco. Ignoramos los huecos aquí, en la raíz común
  // de ambas vistas. No-op si no hay huecos (no cambia índices en el caso sano).
  if(routine && Array.isArray(routine.exercises) && routine.exercises.some(e=>!e)) routine.exercises=routine.exercises.filter(Boolean);
  checkAndResetSession(routine);
  _rehomeOrphanDropsets(routine);
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
    startNewSession(routine.id); // día nuevo = sesión nueva (entrada de historial aparte)
  }
  localStorage.setItem(dateKey,today);
}
// Barre las claves de sesión (log_/done_) de índices que ya no existen en la rutina: si el
// coach reduce las series o reordena/quita ejercicios, esos índices quedaban huérfanos y los
// `log_` NUNCA se borraban → crecían sin límite (riesgo de llenar localStorage). Auditoría 2026-06-21.
function _sweepOrphanSessionKeys(routine){
  try{
    const valid=new Set();      // 'ei_si' / 'ei_dSi' / 'ei_WARM' vigentes (por-serie)
    const validEi=new Set();    // 'ei' vigentes (por-ejercicio: lastre_/wshow_)
    (routine.exercises||[]).forEach((ex,ei)=>{
      validEi.add(String(ei));
      const sets=parseInt(ex.sets)||3;
      for(let si=0;si<sets;si++){ valid.add(ei+'_'+si); valid.add(ei+'_'+dropTok(si)); }
      valid.add(ei+'_'+WARM_SI);
    });
    const rid=routine.id;
    const dp='done_'+rid+'_', drp='drop_'+rid+'_', lp='log_'+rid+'_';
    const exP=_SK_EX.map(kind=>kind+'_'+rid+'_'); // ['lastre_<rid>_','wshow_<rid>_']
    Object.keys(localStorage).forEach(k=>{
      // por-serie con suffix 'ei_si' (done_/drop_): mismo formato → misma comprobación
      if(k.indexOf(dp)===0){ const t=k.slice(dp.length); if(!valid.has(t)) localStorage.removeItem(k); return; }
      if(k.indexOf(drp)===0){ const t=k.slice(drp.length); if(!valid.has(t)) localStorage.removeItem(k); return; }
      // log_ con suffix 'ei_si_field' → recortar el último '_field'
      if(k.indexOf(lp)===0){ const rest=k.slice(lp.length); const i=rest.lastIndexOf('_'); const t=i>0?rest.slice(0,i):rest; if(!valid.has(t)) localStorage.removeItem(k); return; }
      // por-ejercicio con suffix 'ei' (lastre_/wshow_)
      for(const p of exP){ if(k.indexOf(p)===0){ const t=k.slice(p.length); if(!validEi.has(t)) localStorage.removeItem(k); return; } }
    });
  }catch(e){ warn('AVI: barrido de claves de sesión falló (no bloquea):',e&&e.message); }
}

// ══════════ REORDENAR / SUSTITUIR EJERCICIOS (usuario, en "Hoy") ══════════
// Las claves de sesión se indexan por (routineId, ei). Al reordenar movemos TAMBIÉN todas
// para que sigan al ejercicio (no al índice): por-serie log_/done_/drop_ (suffix `ei_si…`)
// y por-ejercicio lastre_/wshow_ (clave exacta, sin si). Antes solo se movían log_/done_ →
// el dropset/lastre/calentamiento quedaba pegado al índice viejo: fila de dropset fantasma,
// peso del dropset perdido, lastre/🔥 en el ejercicio equivocado (bug #5 auditoría 2026-06-30).
// Al sustituir las limpiamos (es otro ejercicio). Las ediciones viven en una COPIA de trabajo
// en memoria (CUR.todayWorking); el plan guardado no se toca hasta confirmar al finalizar.
// Ver feedback_avi_practicidad_usuario.
const _SK_SET=['log','done','drop'];   // por-serie: clave `${kind}_${rid}_${ei}_${si}…`
const _SK_EX=['lastre','wshow'];        // por-ejercicio: clave exacta `${kind}_${rid}_${ei}`
function _swapSessionKeys(rid,a,b){
  const grab=idx=>{ const out=[];
    _SK_SET.forEach(kind=>{ const p=`${kind}_${rid}_${idx}_`;
      Object.keys(localStorage).forEach(k=>{ if(k.indexOf(p)===0)out.push([kind,k.slice(p.length),localStorage.getItem(k),false]); }); });
    _SK_EX.forEach(kind=>{ const ek=`${kind}_${rid}_${idx}`; const v=localStorage.getItem(ek); if(v!=null)out.push([kind,'',v,true]); });
    return out; };
  const A=grab(a),B=grab(b);
  const wipe=idx=>{
    _SK_SET.forEach(kind=>{ const p=`${kind}_${rid}_${idx}_`; Object.keys(localStorage).forEach(k=>{ if(k.indexOf(p)===0)localStorage.removeItem(k); }); });
    _SK_EX.forEach(kind=>localStorage.removeItem(`${kind}_${rid}_${idx}`)); };
  wipe(a); wipe(b);
  const put=(es,idx)=>es.forEach(([kind,suf,val,isEx])=>localStorage.setItem(isEx?`${kind}_${rid}_${idx}`:`${kind}_${rid}_${idx}_${suf}`,val));
  put(A,b); put(B,a);
}
function _clearSessionKeys(rid,idx){
  _SK_SET.forEach(kind=>{ const p=`${kind}_${rid}_${idx}_`; Object.keys(localStorage).forEach(k=>{ if(k.indexOf(p)===0)localStorage.removeItem(k); }); });
  _SK_EX.forEach(kind=>localStorage.removeItem(`${kind}_${rid}_${idx}`));
}
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
  // Si el guiado está abierto encima (sustitución lanzada desde él), reconstruirlo también.
  const _gm=document.getElementById('guided-mode');
  if(_gm&&!_gm.classList.contains('hidden')&&typeof gmRebuild==='function')gmRebuild();
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

// (renderClientExList y updateBlockHeader — la LISTA CLÁSICA de "Hoy" completa —
// se RETIRARON en F5b 2026-07-06. El guiado embebido (gmRender, app-6) es la única vista.)

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
  // (Los contadores del hero clásico — prog-num/prog-fill/prog-vol/wohero-* — se
  // retiraron en F5b; el progreso visible lo pinta el guiado con gmUpdateProgress.)
  if(done===total&&total>0){
    saveSessionToHistory(routine,totalVol,done,true,true); // finalizada al 100% → marca finishedAt
    // Blindaje (caso Claudia 2026-07-07: historial guardado 19/19 pero SIN pantalla de fin):
    // si algo entre el guardado y la celebración lanza, la celebración NO puede morir en
    // silencio — se atrapa, se reporta a app_errors y la pantalla sale igual.
    let newPRs=[];
    try{ newPRs=checkAndUpdatePRs(routine)||[]; }
    catch(e){ warn('AVI: checkAndUpdatePRs falló:',e&&e.message); try{ _logAppError('error','wf-prs: '+(e&&e.message),e&&e.stack&&String(e.stack).split('\n')[1]); }catch(_e){} }
    try{ renderPRsInProfile(CUR.clientId); renderClientExProgress(CUR.clientId); }
    catch(e){ warn('AVI: refresh de PRs/progreso falló:',e&&e.message); try{ _logAppError('error','wf-refresh: '+(e&&e.message),e&&e.stack&&String(e.stack).split('\n')[1]); }catch(_e){} }
    showWorkoutFinish(routine,{done,total,totalVol,newPRs});
  } else if(done>0){
    // Auto-guardado PARCIAL: en cuanto marca la 1ª serie, el entreno queda registrado
    // (y se va actualizando). Así no se pierde aunque no llegue al 100% ni toque
    // "Finalizar", o si la app se cierra/congela a mitad. Sync con debounce.
    saveSessionToHistory(routine,totalVol,done,false);
  }
}

function saveSessionToHistory(routine,totalVol,doneSets,immediate=true,finished=false){
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
    return {id:ex.id,name:ex.name,muscle:ex.muscle,icon:ex.icon,track:exTrack(ex),...(warm?{warm}:{}),sets:Array.from({length:sets},(_,si)=>{const drop=auxVal(ei,dropTok(si));return {kg:getLog(routine.id,ei,si,'kg'),reps:getLog(routine.id,ei,si,'reps')||ex.reps,secs:getLog(routine.id,ei,si,'secs'),min:getLog(routine.id,ei,si,'min'),dist:getLog(routine.id,ei,si,'dist'),done:isDone(routine.id,ei,si),...(drop?{drop}:{})};})};
  });
  const totalSets=(routine.exercises||[]).reduce((s,e)=>s+(parseInt(e.sets)||0),0);
  // Evita duplicar DENTRO de una misma sesión (cada serie marcada re-guarda) matcheando por el
  // id de sesión, NO por (rutina+día): así un 2º entreno de la misma rutina el mismo día crea
  // una entrada NUEVA en vez de pisar la anterior (fix pérdida de datos Camilo 2026-07-03).
  let sid=currentSessionId(routine.id);
  let already;
  if(sid){
    already=DB.history[clientId].find(h=>h.sessionId===sid);
  }else{
    // Sesión iniciada antes de esta versión (sin id): se acuña uno y se ADOPTA solo una entrada
    // del mismo día/rutina SIN id y NO completada (misma sesión en curso, para no duplicar); una
    // sesión ya COMPLETADA no se toca (justo el caso que borraba el entreno de la mañana).
    sid=startNewSession(routine.id);
    already=DB.history[clientId].find(h=>!h.sessionId&&h.routineId===routine.id&&new Date(h.date).toDateString()===today&&(h.doneSets||0)<(h.totalSets||0));
  }
  if(already){already.sessionId=sid;already.totalVol=Math.round(totalVol);already.doneSets=doneSets;already.totalSets=totalSets;already.exercises=setsData;already.date=new Date().toISOString();if(finished&&!already.finishedAt)already.finishedAt=new Date().toISOString();}
  else{
    // startedAt = primera serie marcada (este else corre la 1ª vez de la sesión) → duración real.
    // finishedAt: solo si esta llamada viene de un flujo de FIN (100% o "Finalizar temprano") — es
    // lo que distingue una sesión TERMINADA de una parcial en curso (fix tarjeta "ya entrenaste" v367).
    DB.history[clientId].unshift({id:uid(),sessionId:sid,routineId:routine.id,routineName:routine.name,date:new Date().toISOString(),startedAt:new Date().toISOString(),totalVol:Math.round(totalVol),doneSets,totalSets,exercises:setsData,...(finished?{finishedAt:new Date().toISOString()}:{})});
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
// Devuelve true si guardó (el guiado lo usa para cerrarse tras finalizar).
function finishSessionEarly(){
  const routine=CUR.activeRoutine;if(!routine)return false;
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
  if(done===0){toast('Marca al menos una serie para guardar tu entreno 💪');return false;}
  if(done<total && !confirm(`Llevas ${done} de ${total} series. ¿Guardar tu entrenamiento de hoy con lo que llevas?`))return false;
  saveSessionToHistory(routine,totalVol,done,true,true); // "Finalizar temprano" → marca finishedAt (sesión cerrada, no parcial)
  checkAndUpdatePRs(routine);
  renderPRsInProfile(CUR.clientId);
  renderClientExProgress(CUR.clientId);
  toast('✅ Entrenamiento guardado');
  offerKeepReorder();
  return true;
}

// ── Fin de entrenamiento: celebración full-bleed (se dispara al 100%) ──
// Foto: window.AVI_FINISH_PHOTO la sobreescribe; default = foto de marca AVI.
const WF_DEFAULT_PHOTO='media/brand/ob-2.jpg';
let _wfShownFor=null; // routineId|día ya celebrado → evita re-pop al re-marcar la última serie
// fmtDuration → avi-core.js (fuente única, testeada)
// "¿Cómo te sentiste?" — calificación de la sesión que el COACH ve en el panel (foso vs Gravl).
// WF_FEELINGS + feelingEmoji/feelingLabel → avi-core.js (fuente única, testeada)
let _wfEntry=null; // entrada de historial de la sesión recién cerrada (para guardar la calificación)
function wfRate(n){
  if(_wfEntry){_wfEntry.feeling=n;svNow('ax_hist',DB.history);}
  document.querySelectorAll('#wf-faces .wf-face').forEach((b,i)=>b.classList.toggle('sel',WF_FEELINGS[i].v===n));
  const lbl=document.getElementById('wf-feeling-lbl');if(lbl)lbl.textContent=`¡Gracias! · ${feelingLabel(n)}`;
}
// MET aproximado por modalidad (para estimar calorías quemadas). Antes era 5.5 fijo para TODA
// la sesión → subestimaba cardio/HIIT y sobreestimaba isométricos. Ahora se promedia según la
// modalidad real de los ejercicios. Sigue siendo una estimación. Auditoría 2026-06-30 (menor).
function _trackMET(track){ return ({cardio:7,hiit:8,peso_reps:5,reps:4,tiempo:4})[track]||5.5; }
function _sessionMET(routine){
  const exs=(routine&&routine.exercises)||[];
  if(!exs.length)return 5.5;
  let sum=0; exs.forEach(e=>{ sum+=_trackMET(exTrack(e)); });
  return sum/exs.length;
}
function showWorkoutFinish(routine,stats){
  if(!routine)return;
  const key=routine.id+'|'+new Date().toDateString();
  if(_wfShownFor===key)return;
  // OJO: el guard se fija AL FINAL (junto al classList.add). Si se fijara aquí y algo
  // lanzara a mitad de la función, el día entero quedaría sin celebración aunque el
  // usuario re-marque (caso Claudia 2026-07-07: guardado OK, pantalla nunca salió).
  const c=DB.clients.find(x=>x.id===CUR.clientId);
  const name=((c&&c.name)||'').trim().split(/\s+/)[0]||'';
  const done=(stats&&stats.done)||0, total=(stats&&stats.total)||0;
  const vol=Math.round((stats&&stats.totalVol)||0);
  const prs=(stats&&stats.newPRs)||[];
  // Duración (desde la 1ª serie) + calorías aproximadas (MET·peso·horas). Se persisten en la sesión.
  let durationSec=null, kcal=null;
  const today=new Date().toDateString();
  const _sid=currentSessionId(routine.id); // la sesión recién guardada (no la de la mañana)
  const entry=(DB.history[CUR.clientId]||[]).find(h=>_sid?h.sessionId===_sid:(h.routineId===routine.id&&new Date(h.date).toDateString()===today));
  _wfEntry=entry||null;
  if(entry&&entry.startedAt){
    durationSec=Math.max(60,Math.min(4*3600,Math.round((Date.now()-Date.parse(entry.startedAt))/1000)));
    const w=parseFloat(c&&c.weight)||70;            // kg; fallback 70 si no hay peso
    kcal=Math.round(_sessionMET(routine)*w*(durationSec/3600)); // MET según la modalidad de la sesión
    entry.durationSec=durationSec; entry.kcal=kcal;
    // Récords logrados este día → se guardan en la sesión para mostrarlos luego en
    // la "habitación" de detalle (el historial viejo no los tiene; se omiten sin romper).
    if(prs&&prs.length)entry.prs=prs.slice(0,6).map(pr=>({name:pr.name,val:pr.val!=null?pr.val:pr.kg,unit:pr.unit||'kg',reps:pr.reps,isNew:!!pr.isNew}));
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
  // toLocaleDateString con options lanza RangeError en WebViews sin ICU completo (Huawei
  // viejos) — y aquí un throw mata la celebración entera. Fallback manual sin locale.
  let fecha;
  try{ fecha=new Date().toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long'}); }
  catch(e){ const d=new Date(); fecha=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'][d.getDay()]+', '+d.getDate()+' de '+['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][d.getMonth()]; }
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
  // v313 (estudio, mejora 2): datos para la imagen compartible del cierre.
  _wfShareData={name:name||'',rname:(routine&&routine.name)||'',fecha,chips:chips.slice(),
    prs:prs.slice(0,3).map(pr=>({name:pr.name,val:pr.val!=null?pr.val:pr.kg,unit:pr.unit||'kg',reps:pr.reps}))};
  // F13 — TURNOS: la pantalla de fin llegó a apilar TRES pedidos (logro + compartir + activar
  // notificaciones) y eso empujaba el trofeo y «¡Lo lograste!» fuera de la pantalla. Se muestra UNO
  // por cierre, por rareza y valor: el hito manda (solo cae en 2/4/8/12/24/52 semanas), luego el
  // push (que ya trae su propio silencio de 7 días) y por último compartir, que se puede hacer
  // después desde el muro. Mismo criterio que A2 cediéndole el turno a «Comparte AVI» en «Hoy».
  _wfAskOwner=null;
  if(typeof renderWfMilestoneAsk==='function')renderWfMilestoneAsk(); // A4: el opt-in de logros EN el hito
  renderWfPushNudge(); // v325: activar notificaciones en el momento de máximo compromiso
  _wfCmtyRoutineName=(routine&&routine.name)||''; if(typeof renderWfCmtyShare==='function')renderWfCmtyShare(); // v3-a: compartir en el muro
  if(typeof cmtyOnWorkoutFinished==='function')cmtyOnWorkoutFinished(); // C3: refresca el snapshot de comunidad (debounced) al terminar
  document.getElementById('workout-finish').classList.add('on');
  _wfShownFor=key; // la pantalla YA está visible — ahora sí vale el anti re-pop del día
  document.body.style.overflow='hidden';
  wfConfetti();
}
// v325 (adopción push, palanca #1): al TERMINAR el entreno, ofrecer activar notificaciones al
// asesorado que aún no las tiene (permiso 'default') — el momento de máximo compromiso. Reusa
// aviAskPush/aviSnoozePush y RESPETA el mismo snooze de 7 días de la tarjeta de "Hoy" (no
// duplica el fastidio). 'denied' y 'granted' no se molestan aquí (denied → instrucciones en
// "Hoy"; granted → ya está). El coach nunca lo ve (su nudge vive en su home).
function renderWfPushNudge(){
  const el=document.getElementById('wf-push-nudge'); if(!el) return;
  el.innerHTML='';
  // F13: si el turno era MÍO se suelta antes de recalcular (idempotente: repintarme no me
  // bloquea a mí mismo); si lo tiene otro, cedo.
  if(_wfAskOwner==='push') _wfAskOwner=null;
  if(_wfAskOwner) return;
  const cid=_pushCtx&&_pushCtx.clientId;
  if(!cid||cid==='_coach'||typeof Notification==='undefined'||!('PushManager' in window)) return;
  if(Notification.permission!=='default') return;
  let snooze=0; try{ snooze=parseInt(localStorage.getItem('ax_push_snooze_'+cid)||'0',10)||0; }catch(_e){}
  if(Date.now()-snooze<7*86400000) return;
  const bell=typeof aviIcon==='function'?aviIcon('bell',15):'🔔';
  _wfAskOwner='push';
  el.innerHTML=`<div class="wf-push">
    <div class="wf-push-txt"><b>${bell} No te pierdas tu próximo entreno</b>Te aviso en tus días, con tips de hidratación y recuperación. Sin spam — cuando quieras lo apagas.</div>
    <div class="wf-push-btns"><button type="button" class="wf-push-on" onclick="aviAskPush().then(renderWfPushNudge)">Activar recordatorios</button><button type="button" class="wf-push-later" onclick="aviSnoozePush();renderWfPushNudge()">Ahora no</button></div>
  </div>`;
}
// ── Compartir el ENTRENO en el MURO de comunidad (v3-a #2+#3) ──
// Distinto de wfShare (imagen a WhatsApp): publica un post kind='workout' en el muro. Opt-in POR
// publicación (decisión PO): nada automático, botón explícito. Solo si el asesorado es MIEMBRO de la
// comunidad (CMTY.profile). Se comparte nombre + duración + nº de ejercicios + nota opcional (≤140);
// JAMÁS kilos (el mapeador puro communityWorkoutPayload los descarta, el trigger los rechaza).
let _wfCmtyRoutineName='';
// F13: QUIÉN tiene el turno en esta pantalla de fin ('milestone'|'push'|'share'|null). No es un
// booleano a propósito: la tarjeta que ya lo tiene debe poder repintarse a sí misma (el push se
// re-renderiza tras conceder el permiso), y solo cede cuando deja de aplicar.
let _wfAskOwner=null;
function renderWfCmtyShare(){
  const el=document.getElementById('wf-cmty-share'); if(!el) return;
  el.innerHTML='';
  // F13: si el turno era MÍO se suelta antes de recalcular (idempotente: repintarme no me
  // bloquea a mí mismo); si lo tiene otro, cedo.
  if(_wfAskOwner==='share') _wfAskOwner=null;
  if(_wfAskOwner) return;
  // Solo miembros de comunidad, y solo si la sesión se puede compartir (finalizada, con nombre).
  // F2: `_cmtyMe()` en vez de `CMTY.profile` — este bloque sufría el mismo mal que A4 y no salía
  // nunca en la sesión típica (hay que haber abierto la pestaña Comunidad en ESA carga).
  if(typeof CMTY==='undefined' || typeof _cmtyMe!=='function' || !_cmtyMe()) return;
  if(typeof communityWorkoutPayload!=='function') return;
  const pl=communityWorkoutPayload(_wfEntry, _wfCmtyRoutineName);
  if(!pl) return;
  const dur=pl.duration_min!=null?(' · '+pl.duration_min+' min'):'';
  const resumen=esc(pl.name)+dur+' · '+pl.exercises_count+' ejercicio'+(pl.exercises_count===1?'':'s');
  _wfAskOwner='share';
  el.innerHTML='<div class="wf-cshare">' +
    '<div class="wf-cshare-h">Compártelo con tu gente</div>' +
    '<div class="wf-cshare-sum">'+resumen+'</div>' +
    '<textarea id="wf-cshare-note" class="wf-cshare-note" rows="2" maxlength="140" placeholder="Cuéntale algo a tu gente (opcional)" oninput="_wfCshareCount()"></textarea>' +
    '<div class="wf-cshare-count"><span id="wf-cshare-n">0</span>/140</div>' +
    '<button type="button" class="wf-cshare-btn" onclick="wfShareToCommunity()">Compartir este entreno</button>' +
    '</div>';
}
function _wfCshareCount(){ const t=document.getElementById('wf-cshare-note'), n=document.getElementById('wf-cshare-n'); if(t&&n)n.textContent=String(t.value.length); }
async function wfShareToCommunity(){
  const el=document.getElementById('wf-cmty-share'); if(!el) return;
  const ta=document.getElementById('wf-cshare-note');
  const note=ta?ta.value:'';
  const btn=el.querySelector('.wf-cshare-btn'); if(btn){ btn.disabled=true; btn.textContent='Compartiendo…'; }
  let okShare=false;
  try{ okShare=(typeof cmtyShareWorkout==='function') ? await cmtyShareWorkout(_wfEntry, _wfCmtyRoutineName, note) : false; }
  catch(e){ okShare=false; }
  if(okShare){ el.innerHTML='<div class="wf-cshare wf-cshare-done">'+(typeof aviIcon==='function'?aviIcon('check',15):'✓')+' Compartido con tu gente</div>'; }
  else if(btn){ btn.disabled=false; btn.textContent='Compartir este entreno'; }
}

// ── Compartir el cierre (v313, estudio de interfaz mejora 2, aprobada por Camilo) ──
// Imagen 1080×1920 (formato historia/estado de WhatsApp) dibujada en canvas con la marca:
// gradiente esmeralda, números grandes, récords y el sitio del coach. navigator.share con
// archivo si el dispositivo puede (Android/TWA sí); si no, descarga el PNG. Sin fotos en
// el lienzo: solo gradientes y texto → jamás canvas contaminado ni dependencias de red.
let _wfShareData=null;
function wfShare(){
  const d=_wfShareData; if(!d){toast('Aún no hay datos de esta sesión');return;}
  const cv=document.createElement('canvas');cv.width=1080;cv.height=1920;
  const x=cv.getContext('2d');
  // fondo de marca
  const bg=x.createLinearGradient(0,0,0,1920);
  bg.addColorStop(0,'#06120D');bg.addColorStop(.55,'#0A2118');bg.addColorStop(1,'#04090688');
  x.fillStyle='#06120D';x.fillRect(0,0,1080,1920);
  x.fillStyle=bg;x.fillRect(0,0,1080,1920);
  const glow=x.createRadialGradient(870,240,60,870,240,700);
  glow.addColorStop(0,'rgba(16,224,160,.20)');glow.addColorStop(1,'rgba(16,224,160,0)');
  x.fillStyle=glow;x.fillRect(0,0,1080,1100);
  const F='system-ui,Roboto,sans-serif';
  // wordmark
  x.fillStyle='#EAFBF4';x.font='900 84px '+F;x.fillText('AVI',90,190);
  x.fillStyle='#10E0A0';x.fillRect(90,215,120,7);
  x.fillStyle='rgba(234,251,244,.55)';x.font='700 26px '+F;
  x.fillText('ENTRENAMIENTO CON NOMBRE PROPIO',90,275);
  // titular
  x.fillStyle='#10E0A0';x.font='800 34px '+F;x.fillText('ENTRENAMIENTO COMPLETADO',90,520);
  x.fillStyle='#FFFFFF';x.font='900 112px '+F;
  x.fillText(d.name?('¡Lo logré!'):'¡Sesión lista!',90,650);
  x.fillStyle='rgba(234,251,244,.75)';x.font='600 40px '+F;
  x.fillText((d.rname?d.rname+'  ·  ':'')+d.fecha,90,725);
  // estadísticas 2×2
  const cells=d.chips.slice(0,4);
  // roundRect no existe en WebViews viejos → rectángulo normal antes que un throw
  const _rr=(cx,cy,w,h,r)=>{x.beginPath();if(x.roundRect)x.roundRect(cx,cy,w,h,r);else x.rect(cx,cy,w,h);};
  cells.forEach((c2,i)=>{
    const cx=90+(i%2)*470, cy=850+Math.floor(i/2)*260;
    x.fillStyle='rgba(255,255,255,.05)';
    _rr(cx,cy,430,215,26);x.fill();
    x.strokeStyle='rgba(16,224,160,.28)';x.lineWidth=2.5;
    _rr(cx,cy,430,215,26);x.stroke();
    x.fillStyle='#10E0A0';x.font='900 76px '+F;x.fillText(String(c2[1]),cx+36,cy+112);
    x.fillStyle='rgba(234,251,244,.6)';x.font='700 28px '+F;x.fillText(String(c2[0]).toUpperCase(),cx+36,cy+172);
  });
  // récords
  let ry=850+Math.ceil(cells.length/2)*260+70;
  d.prs.forEach(pr=>{
    x.fillStyle='#F2C94C';x.font='900 40px '+F;x.fillText('★',90,ry);
    x.fillStyle='#FFFFFF';x.font='800 38px '+F;
    const det=pr.unit==='kg'?(pr.val+' kg'+(pr.reps?' × '+pr.reps:'')):(pr.val+' '+pr.unit);
    x.fillText('Récord: '+pr.name+' — '+det,150,ry);
    ry+=72;
  });
  // pie con el coach
  x.fillStyle='rgba(16,224,160,.9)';x.fillRect(90,1760,900,4);
  x.fillStyle='rgba(234,251,244,.8)';x.font='700 34px '+F;
  const coach=(typeof getCoachName==='function'&&getCoachName())||'';
  const site=(typeof getCoachSite==='function'&&getCoachSite())||'';
  x.fillText('Entreno con '+(coach||'mi coach')+(site?('  ·  '+site):''),90,1830);
  try{window._wfLastCanvas=cv;}catch(e){} // gancho de verificación visual (harness v313)
  cv.toBlob(async blob=>{
    if(!blob){toast('No se pudo crear la imagen');return;}
    const file=new File([blob],'avi-entreno.png',{type:'image/png'});
    try{
      if(navigator.canShare&&navigator.canShare({files:[file]})){
        await navigator.share({files:[file],title:'Mi entreno en AVI'});
        return;
      }
    }catch(e){ if(e&&e.name==='AbortError')return; } // canceló el share: silencio
    // Respaldo (desktop/navegadores sin share de archivos): descarga directa
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='avi-entreno.png';
    document.body.appendChild(a);a.click();a.remove();
    toast('📥 Imagen guardada — súbela a tu estado');
  },'image/png');
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
  // Lo puede abrir cualquiera SIN coach (libre o Premium app) para pedir un coach.
  const c=_curClient(); if(!c||clientHasCoach(c))return;
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
// La decisión (kick/título/cuerpo/días) → avi-core.js (weekEditorial); aquí solo el markup.
function clientWeekEditorial(client){
  const e=weekEditorial(client);
  const daysNote=e.trainDays?` <b>${e.trainDays} día${e.trainDays!==1?'s':''}</b> de entreno te esperan.`:'';
  return `<div class="weekly-ed"><div class="we-kick">${e.kick}</div><div class="we-title">${esc(e.title)}</div><div class="we-body">${esc(e.body)}${daysNote}</div></div>`;
}

function renderClientAllRoutines(client){
  const ed=document.getElementById('cn-week-ed');
  const con=document.getElementById('cn-all-rut');const routines=sortRoutinesByDay(client.routines||[]);
  // TODO cliente puede editar SUS propias rutinas (Opción B, Camilo 2026-06-25). Antes los
  // premium quedaban bloqueados, así que "Activar Premium" le QUITABA al usuario la capacidad
  // de ajustar su plan que ya tenía gratis — un contrasentido. El coach sigue editándolas desde
  // su panel (renderDetailRoutines). Esta vista es siempre el entreno propio del que entró.
  // (Las gráficas avanzadas siguen siendo Premium; esto es solo armar/ajustar ejercicios.)
  const canEdit=true;
  if(ed)ed.innerHTML=routines.length?clientWeekEditorial(client):'';
  if(!routines.length){
    con.innerHTML=COACH_SELF
      ? '<div class="empty" style="padding:36px"><div class="eico" style="color:var(--g2)">'+(typeof aviIcon==='function'?aviIcon('dumbbell',34):'🏋️')+'</div><div class="etxt">Crea tu primera rutina</div><div class="esub">Arma tu propio entrenamiento igual que el de un asesorado.</div><button class="btn bp bsm" style="margin-top:12px" onclick="openNewRoutine()">+ Nueva rutina</button></div>'
      : client.selfReg
      ? '<div class="empty" style="padding:36px"><div class="eico" style="color:var(--g2)">'+(typeof aviIcon==='function'?aviIcon('sparkles',34):'✨')+'</div><div class="etxt">Crea tu primera rutina</div><div class="esub">Generamos un plan a tu medida según tus datos — o ármalo tú mismo si ya tienes el tuyo.</div><button class="btn bp bsm" style="margin-top:12px" onclick="clientSelfGenerate()">✨ Generar mi semana</button><button class="btn bg bsm" style="margin-top:8px" onclick="openNewRoutine()">+ Crear rutina manual</button></div>'
      : '<div class="empty" style="padding:36px"><div class="eico" style="color:var(--g2)">'+(typeof aviIcon==='function'?aviIcon('clipboard',34):'📋')+'</div><div class="etxt">Tu plan está en preparación</div><div class="esub">Escríbele a tu coach si tienes alguna pregunta mientras tanto.</div><button class="btn bp bsm" style="margin-top:12px" onclick="cnTab(\'cn-messages\',document.getElementById(\'tab-msgs\'))">Ir a mensajes →</button></div>';
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
  // (El botón «+ Nueva rutina» va DESPUÉS de la lista — ver más abajo. Estudio de interfaz
  //  2026-07-27, defecto 4: era el botón más llamativo de la pantalla, verde y de ancho
  //  completo, ENCIMA del plan. A alguien a quien su entrenador ya le armó la semana, lo que
  //  más le gritaba «Rutinas» era que se creara otra.)
  routines.forEach((r,ri)=>{
    const exN=(r.exercises||[]).length;const totS=(r.exercises||[]).reduce((s,e)=>s+(parseInt(e.sets)||0),0);
    const isRest=r.day==='Libre';
    const isToday=!isRest && r.day===['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][new Date().getDay()];
    const dayAb=isRest?'💤':esc(r.day).slice(0,2);
    // v315 (estudio, mejora 4): la foto del primer ejercicio con foto de fondo del encabezado.
    // exImgSrc solo devuelve rutas internas del catálogo (respeta variante F) — sin datos de usuario.
    const ph=(r.exercises||[]).map(e=>exImgSrc(e)).find(Boolean)||'';
    const div=document.createElement('div');div.className='rc'+(isToday?' rc-today':'');
    div.innerHTML=`<div class="rch" onclick="this.closest('.rc').classList.toggle('open')">${ph?`<div class="rc-photo" style="background-image:url('${ph}')"></div>`:''}<div class="rcthumb${isRest?' rest':''}">${dayAb}</div><div class="rci"><div class="rcname">${esc(r.name)}${isToday?'<span class="rc-today-tag">Hoy</span>':''}</div><div class="rcpills"><span class="rcpill">${esc(r.day)}</span><span class="rcpill">${exN} ejercicio${exN!==1?'s':''}</span><span class="rcpill">${totS} series</span></div></div><div class="rcchev">▾</div></div><div class="rcbody">${r.note?`<div style="background:rgba(242,201,76,.10);border:1px solid rgba(242,201,76,.30);border-radius:var(--rsm);padding:8px 12px;font-size:12px;color:var(--t1);margin-bottom:9px">💡 ${esc(r.note)}</div>`:''}${!(r.exercises||[]).length?'<div style="color:var(--t3);font-size:13px">Sin ejercicios</div>':(r.exercises||[]).map((e,_ei,_arr)=>`<div class="exrow"><div class="exicon" style="background:${MC[e.muscle]||'#ccc'}18;border:1px solid ${MC[e.muscle]||'#ccc'}30">${exIcon(e)}</div><div><div class="exname">${esc(e.name||'')}</div><div class="exmet">${esc(typeof exMuscleText==='function'?exMuscleText(e):(e.muscle||''))} · ${typeof aviIcon==='function'?aviIcon('timer',11):'⏱'}${restForExercise(e,r)}s${bisetInfo(_arr,_ei).biset?` · <span class="biset-tag">${typeof aviIcon==='function'?aviIcon('link',10):'🔗'} biserie</span>`:''}</div></div><div class="exsets">${exSetsCellHTML(e)}</div></div>`).join('')}<button onclick="startRoutineNow('${r.id}')" style="margin-top:12px;width:100%;padding:12px;background:linear-gradient(135deg,var(--g),var(--g2));color:white;border:none;border-radius:var(--r);font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;letter-spacing:.2px">${typeof aviIcon==='function'?aviIcon('play',14):'▶'} Hacer esta rutina ahora</button>${!isRest?`<button class="btn bg bsm" style="width:100%;margin-top:8px" onclick="event.stopPropagation();openRoutineRoom('${client.id}','${r.id}')">${typeof aviIcon==='function'?aviIcon('chart',14):'📊'} Mi progreso con esta rutina</button>`:''}${canEdit?`<div style="display:flex;gap:8px;margin-top:8px"><button class="btn bg bsm" style="flex:1" onclick="event.stopPropagation();openEditRoutine('${client.id}',${ri})">${typeof aviIcon==='function'?aviIcon('pencil',13):'✏️'} Editar</button><button class="btn bd bsm" aria-label="Eliminar rutina" onclick="event.stopPropagation();delRoutine('${client.id}',${ri})">${typeof aviIcon==='function'?aviIcon('trash',14):'🗑️'}</button></div>`:''}</div>`;
    con.appendChild(div);
  });
  // Crear rutinas propias sigue disponible (decisión de Camilo 2026-06-25, Opción B) pero ya no
  // compite con el plan: va al FINAL y como acción secundaria, no como el botón principal.
  if(canEdit){
    const nb=document.createElement('button');
    nb.className='btn bg bsm';
    nb.style.cssText='width:100%;margin-top:14px';
    nb.textContent='+ Nueva rutina';
    nb.onclick=openNewRoutine;
    con.appendChild(nb);
  }
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
  con.innerHTML=`<svg width="100%" height="${H+16}" viewBox="0 0 ${W} ${H+16}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" style="stop-color:var(--chart-g)" stop-opacity="0.18"/><stop offset="100%" style="stop-color:var(--chart-g)" stop-opacity="0"/></linearGradient></defs>
    <path d="${areaD}" fill="url(#vg)"/>
    <path d="${pathD}" fill="none" style="stroke:var(--chart-g)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${pts.map((p,i)=>{
      // Etiquetas en su propia banda (y=H+11), y las de los extremos ancladas hacia
      // dentro (start/end) para que "23 jun" y la última no se salgan del borde.
      const anc=i===0?'start':(i===pts.length-1?'end':'middle');
      const lx=i===0?pad:(i===pts.length-1?W-pad:p.x);
      return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" style="fill:var(--chart-g)"/>
      <text x="${lx.toFixed(1)}" y="${H+11}" text-anchor="${anc}" font-family="Plus Jakarta Sans,sans-serif" font-size="9" style="fill:var(--t3)">${new Date(p.s.date).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</text>`;
    }).join('')}
  </svg>`;
}

// Detalle de una sesión (ejercicios → series). Compartido por la vista del cliente y la
// del coach. Calentamiento (🔥 ámbar) y dropset (🔻 azul) se muestran como chips aparte,
// SIN sumar al volumen (que solo cuenta series de trabajo hechas). Valores escapados.
function _sessionExercisesHTML(s,clientId){
  // Volumen por ejercicio + barrita relativa al ejercicio que más movió en la sesión
  // → de un vistazo se ve dónde estuvo el trabajo pesado. Color = músculo (MC).
  // clientId → cada ejercicio es una "puerta" a su habitación (historial/progresión).
  const _exVol=ex=>(ex.sets||[]).filter(st=>st.done).reduce((t,st)=>t+(parseFloat(st.kg)||0)*(parseFloat(st.reps)||0),0);
  const _maxVol=(s.exercises||[]).reduce((m,ex)=>Math.max(m,_exVol(ex)),0);
  return (s.exercises||[]).map(ex=>{
    const exVol=_exVol(ex);
    const auxChip=(emoji,label,col,bg,a)=>`<div style="background:${bg};border:1px solid ${col}55;border-radius:6px;padding:6px 8px;text-align:center">
        <div style="font-size:10px;color:${col};margin-bottom:2px">${emoji} ${label}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;color:${col}">${a.kg?esc(a.kg)+'kg':'—'}${a.reps?' × '+esc(a.reps):''}</div>
      </div>`;
    const chips=[];
    if(ex.warm&&(ex.warm.kg||ex.warm.reps))chips.push(auxChip(typeof aviIcon==='function'?aviIcon('flame',11):'🔥','Calent.','#E8973A','rgba(232,151,58,.10)',ex.warm));
    ex.sets.forEach((st,si)=>{
      chips.push(`<div style="background:${st.done?'var(--gl)':'var(--bg)'};border:1px solid ${st.done?'var(--g2)':'var(--br)'};border-radius:6px;padding:6px 8px;text-align:center">
          <div style="font-size:10px;color:var(--t3);margin-bottom:2px">Serie ${si+1}</div>
          ${st.done?`<div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;color:var(--gt)">${st.kg?esc(st.kg)+'kg':'—'} × ${esc(st.reps)}</div>`:`<div style="font-size:11px;color:var(--t3)">No completada</div>`}
        </div>`);
      if(st.drop&&(st.drop.kg||st.drop.reps))chips.push(auxChip(typeof aviIcon==='function'?aviIcon('tridown',10):'🔻','Drop','#3B82F6','rgba(59,130,246,.08)',st.drop));
    });
    const barCol=(typeof MC!=='undefined'&&MC[ex.muscle])||'var(--g)';
    const barW=_maxVol>0?Math.max(5,Math.round(exVol/_maxVol*100)):0;
    const volBar=exVol>0?`<div style="height:5px;background:var(--bg);border-radius:3px;overflow:hidden;margin:0 0 8px"><div style="height:100%;width:${barW}%;background:${barCol};border-radius:3px"></div></div>`:'';
    const door=clientId?` data-exid="${esc(ex.id||'')}" data-exname="${esc(ex.name||'')}" onclick="event.stopPropagation();openExerciseRoom('${esc(String(clientId))}',this.dataset.exid,this.dataset.exname)" style="cursor:pointer"`:'';
    return `<div style="margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"${door}>
          ${muscleIcon(ex.muscle,18)}
          <div style="font-size:13px;font-weight:700">${esc(ex.name)}</div>
          ${exVol>0?`<span style="margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--gt);font-weight:600">${Math.round(exVol)} kg vol</span>`:''}
          ${clientId?`<span style="${exVol>0?'':'margin-left:auto;'}color:var(--t3);font-size:16px;flex-shrink:0">›</span>`:''}
        </div>
        ${volBar}
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:5px">${chips.join('')}</div>
      </div>`;
  }).join('');
}

// HISTORY
// ── Racha y constancia (Premium): racha actual + récord + calendario del mes.
// La racha simple ya vive como chip en "Hoy" (libre); esta vista rica es Premium.
function renderClientStreak(clientId){
  const con=document.getElementById('cn-streak');if(!con)return;
  const c=DB.clients.find(x=>x.id===clientId);
  if(isFreeClient(c)){con.innerHTML=premiumLockHTML('Tu constancia','Cuántas semanas seguidas llevas cumpliendo tu plan, tu récord y el calendario del mes.');return;}
  const sessions=(DB.history&&DB.history[clientId])||[];
  const now=new Date();
  // Racha SEMANAL (2026-07-06): semanas seguidas cumpliendo la meta del plan.
  const tgt=planDays(c);
  const ws=weekStreak(sessions,tgt,now);
  const record=longestWeekStreak(sessions,tgt);
  const cal=adherenceMonth(sessions,now);
  const mes=now.toLocaleDateString('es-ES',{month:'long',year:'numeric'});
  const dows=['L','M','M','J','V','S','D'];
  let grid='';
  cal.weeks.forEach(w=>w.forEach(d=>{
    if(!d.inMonth){grid+='<div class="cal-cell empty"></div>';return;}
    let cls='cal-cell';
    if(d.trained)cls+=' trained'+(d.count>=2?' t2':'');
    else if(d.isFuture)cls+=' future';
    if(d.isToday)cls+=' today';
    // Día con entreno → clickeable: lleva a la sesión que hizo ese día.
    const click=d.trained?` onclick="cnOpenDayHistory('${clientId}',${cal.year},${cal.month},${d.day})" style="cursor:pointer" title="Ver el entrenamiento de este día"`:'';
    grid+=`<div class="${cls}"${click}>${d.day}</div>`;
  }));
  // Mensaje en lenguaje claro: explica qué es la racha y qué hacer ahora.
  const falta=Math.max(0,ws.target-ws.thisWeekDays);
  const msg = ws.weeks>=2
    ? `Llevas <b>${ws.weeks} semanas seguidas</b> cumpliendo tu plan de ${ws.target} día${ws.target!==1?'s':''}. ¡Sigue así!${!ws.metThisWeek?` Esta semana vas <b>${ws.thisWeekDays}/${ws.target}</b>.`:''}`
    : ws.weeks===1
      ? `¡Semana cumplida! 🎉 Completa esta (${ws.thisWeekDays}/${ws.target}) para encadenar 2 seguidas.`
      : ws.thisWeekDays>0
        ? `Esta semana llevas <b>${ws.thisWeekDays} de ${ws.target}</b> día${ws.target!==1?'s':''}. Te ${falta===1?'falta':'faltan'} <b>${falta}</b> para encender tu racha 🔥`
        : `Tu racha son las <b>semanas seguidas</b> cumpliendo tu meta de ${ws.target} día${ws.target!==1?'s':''}. ¡Esta semana cuenta!`;
  con.innerHTML=`<div class="card streak-card">
    <div class="streak-title">${typeof aviIcon==='function'?aviIcon('flame',14):'🔥'} Tu constancia</div>
    <div class="streak-stats">
      <div class="sstat sstat-g"><div class="sstat-n">${ws.weeks}</div><div class="sstat-l">Semanas seguidas</div></div>
      <div class="sstat sstat-y"><div class="sstat-n">${record}</div><div class="sstat-l">Tu récord</div></div>
      <div class="sstat sstat-b"><div class="sstat-n">${cal.trainedDays}</div><div class="sstat-l">Días este mes</div></div>
    </div>
    <div class="streak-msg">${msg}</div>
    <div class="cal-month cal-month-door" onclick="openMonthRoom('${clientId}',${cal.year},${cal.month})" title="Ver el resumen del mes">${mes.charAt(0).toUpperCase()+mes.slice(1)} <span class="cal-month-chev">›</span></div>
    <div class="cal-dows">${dows.map(x=>`<span>${x}</span>`).join('')}</div>
    <div class="cal-grid">${grid}</div>
    <div class="cal-legend"><i></i> Días que entrenaste · <span style="opacity:.6">toca un día para ver ese entreno</span></div>
  </div>`;
}

// Tocar un día entrenado del calendario → abre la "habitación" de esa sesión.
function cnOpenDayHistory(clientId,year,month,day){
  const sessions=(DB.history&&DB.history[clientId])||[];
  const target=sessions.find(s=>{const d=new Date(s.date);return d.getFullYear()===year&&d.getMonth()===month&&d.getDate()===day;});
  if(target)openSessionRoom(clientId,target.id);
}

// ── "Habitación" de detalle de una sesión: pantalla dedicada que entra con
// profundidad (no es una pestaña plana). Muestra todo el entreno de ese día.
function _sessionSummary(s,reps,exCount,pct){
  const nEx=exCount||((s.exercises||[]).length);
  let t=`Completaste <b>${s.doneSets} de ${s.totalSets} series</b> (${pct}%) en <b>${nEx} ejercicio${nEx===1?'':'s'}</b>`;
  if(s.durationSec)t+=`, durante <b>${fmtDuration(s.durationSec)}</b>`;
  t+='. ';
  if(s.totalVol>0)t+=`Moviste <b>${s.totalVol.toLocaleString()} kg</b> en total`;
  if(s.kcal)t+=`${s.totalVol>0?' y':'Quemaste'} unas <b>${s.kcal} kcal</b>`;
  if(s.totalVol>0||s.kcal)t+='. ';
  const np=(s.prs||[]).length;
  if(np)t+=`¡Y marcaste <b>${np} récord${np===1?'':'s'}</b>! 🏆`;
  else if(pct===100)t+='¡Sesión redonda! 💪';
  return t;
}
function openSessionRoom(clientId,sid){
  const sessions=(DB.history&&DB.history[clientId])||[];
  const s=sessions.find(x=>x.id===sid);
  const room=document.getElementById('session-room'),body=document.getElementById('sroom-body');
  if(!s||!room||!body)return;
  const exs=s.exercises||[];
  let reps=0,exCount=0;
  exs.forEach(ex=>{let any=false;(ex.sets||[]).forEach(st=>{if(st&&st.done){reps+=parseInt(st.reps)||0;any=true;}});if(any)exCount++;});
  const d=new Date(s.date);
  const dateStr=d.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
  const timeStr=d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
  const pct=s.totalSets>0?Math.round(s.doneSets/s.totalSets*100):0;
  const stats=[];
  if(s.durationSec)stats.push(['⏱','Duración',fmtDuration(s.durationSec),'#3a86c8']);
  if(s.kcal)stats.push(['🔥','Calorías',s.kcal+' kcal','#e0772e']);
  if(s.totalVol>0)stats.push(['🏋️','Volumen',s.totalVol.toLocaleString()+' kg','#10b981']);
  if(reps>0)stats.push(['🔁','Reps totales',String(reps),'#9b6dd6']);
  stats.push(['📋','Ejercicios',String(exCount||exs.length),'#0ea5b7']);
  stats.push(['✅','Series',`${s.doneSets}/${s.totalSets}`,pct===100?'#10b981':'#e0a72e']);
  const statsHTML=stats.map(([ic,l,v,col])=>`<div class="sroom-stat" style="--sc:${col}"><div class="sroom-stat-ic">${_sroomIc(ic)}</div><div class="sroom-stat-v">${esc(v)}</div><div class="sroom-stat-l">${esc(l)}</div></div>`).join('');
  // Comparación con la última vez que hizo ESTA rutina (no con cualquier otra, que sería
  // peras con manzanas): sube/baja de volumen → engancha a superarse. Solo si hay con qué.
  let cmpHTML='';
  const _idx=sessions.findIndex(x=>x.id===s.id);
  const _prev=_idx>=0?sessions.slice(_idx+1).find(x=>(x.routineId&&x.routineId===s.routineId)||(x.routineName&&x.routineName===s.routineName)):null;
  if(_prev&&s.totalVol>0&&_prev.totalVol>0){
    const dv=s.totalVol-_prev.totalVol, pd=Math.round(dv/_prev.totalVol*100);
    const cls=pd>=2?'up':pd<=-2?'down':'flat';
    const ic=cls==='up'?'📈':cls==='down'?'📉':'➖';
    const txt=cls==='flat'?'Mismo volumen que la vez anterior de esta rutina':`${dv>0?'Subiste':'Bajaste'} el volumen vs la vez anterior de esta rutina`;
    cmpHTML=`<div class="sroom-cmp ${cls}"><span class="sroom-cmp-ic">${_sroomIc(ic)}</span><span>${txt}</span><span class="sroom-cmp-d">${dv>0?'+':''}${dv.toLocaleString()} kg</span></div>`;
  }
  let prHTML='';
  const prs=s.prs||[];
  if(prs.length){
    prHTML=`<div class="sroom-sec">${typeof aviIcon==='function'?aviIcon('trophy',14):'🏆'} Récords de este día</div>`+prs.map(pr=>{
      const detail=(pr.unit==='kg'||!pr.unit)?`${fmtMetric(pr.val,pr.unit||'kg')}${pr.reps?` × ${pr.reps} reps`:''}`:fmtMetric(pr.val,pr.unit);
      return `<div class="sroom-pr"><span class="sroom-pr-ic">🏆</span><div><div class="sroom-pr-n">${pr.isNew?'¡Primer récord!':'¡Nuevo récord!'} ${esc(pr.name)}</div><div class="sroom-pr-d">${esc(detail)}</div></div></div>`;
    }).join('');
  }
  const circ=2*Math.PI*26, off=(circ*(1-pct/100)).toFixed(1);
  const feelHero=s.feeling?`<div class="sroom-hero-feel">${feelingEmoji(s.feeling)} ${esc(feelingLabel(s.feeling))}</div>`:'';
  body.innerHTML=`
    <div class="sroom-hero">
      <div class="sroom-ring">
        <svg viewBox="0 0 60 60"><circle class="sr-bg" cx="30" cy="30" r="26"/><circle class="sr-fg" cx="30" cy="30" r="26" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${off}"/></svg>
        <div class="sroom-ring-n"><span id="sroom-pct">${pct}</span><small>%</small></div>
      </div>
      <div class="sroom-hero-txt">
        <div class="sroom-date">${dateStr.charAt(0).toUpperCase()+dateStr.slice(1)} · ${timeStr}</div>
        <div class="sroom-title">${esc(s.routineName||'Entrenamiento')}</div>
        ${feelHero}
      </div>
    </div>
    <div class="sroom-stats">${statsHTML}</div>
    ${cmpHTML}
    <div class="sroom-summary">${_sessionSummary(s,reps,exCount,pct)}</div>
    ${prHTML}
    <div class="sroom-sec">Ejercicios de la sesión <span style="font-weight:600;text-transform:none;letter-spacing:0;color:var(--t3)">· toca uno para ver su progreso</span></div>
    <div class="sroom-exs">${_sessionExercisesHTML(s,clientId)}</div>
    <div style="height:30px"></div>`;
  body.scrollTop=0;
  _roomFront(room);
  // El % del anillo cuenta hacia arriba a la par del trazo → sensación viva (no número seco).
  const pn=document.getElementById('sroom-pct');
  if(pn)_roomCountUp(pn,pct,750);
  _syncRoomBodyClass();
}
// Una o más habitaciones (.sroom) abiertas → bloquea scroll de fondo y oculta el banner
// flotante "Instalar app" (clase consumida por CSS !important). Robusto a que la
// habitación de sesión conviva con la de ejercicio encima.
function _syncRoomBodyClass(){
  const any=document.querySelector('.sroom.on');
  document.body.classList.toggle('sroom-open',!!any);
  document.body.style.overflow=any?'hidden':'';
}
// Abre una habitación SIEMPRE encima de las demás. Todas las .sroom comparten z-index, así
// que sin esto la que pinta arriba es la última en el DOM (no la recién abierta) → una
// habitación abierta sobre otra posterior en el HTML quedaría DETRÁS. Bumpeamos su z al abrir.
let _roomZSeq=1400;
function _roomFront(room){ if(room){ if(!room.classList.contains('on')){ navOpenLayer(); room.scrollTop=0; } room.style.zIndex=String(++_roomZSeq); room.classList.add('on'); } }
function _roomCountUp(el,target,dur){
  target=parseInt(target)||0;
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){el.textContent=target;return;}
  const t0=performance.now();
  const step=now=>{
    const p=Math.min(1,(now-t0)/dur), e=1-Math.pow(1-p,3); // easeOutCubic
    el.textContent=Math.round(target*e);
    if(p<1)requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function closeSessionRoom(){
  const room=document.getElementById('session-room');
  if(room)room.classList.remove('on');
  _syncRoomBodyClass();
}

// ── HABITACIÓN DE EJERCICIO: historial + progresión de carga/1RM + récord + técnica.
// Se entra tocando un ejercicio (en la habitación de sesión o en la vista del coach).
// Resuelve por id (sesiones nuevas) o por nombre (historial viejo) contra el catálogo.
function openExerciseRoom(clientId,exId,exName){
  const room=document.getElementById('exercise-room'),body=document.getElementById('exroom-body');
  if(!room||!body)return;
  exId=(exId&&exId!=='null'&&exId!=='')?exId:null;
  const cat=DB.exercises||[];
  let def=exId?cat.find(e=>e.id===exId):null;
  if(!def&&exName)def=cat.find(e=>e.name&&e.name.toLowerCase().trim()===String(exName).toLowerCase().trim());
  const name=(def&&def.name)||exName||'Ejercicio';
  const muscle=(def&&def.muscle)||'otro';
  const type=(def&&def.type)||'';
  const muscleLabel=(def&&def.muscleLabel)||(typeof MUSCLE_GROUP_LABEL!=='undefined'&&MUSCLE_GROUP_LABEL[muscle])||muscle;
  const col=(typeof MC!=='undefined'&&MC[muscle])||'#0A7C5B';
  const sessions=(DB.history&&DB.history[clientId])||[];
  const prog=computeExerciseProgress(sessions).find(e=>e.name===name);
  const pts=(prog&&prog.points)||[];
  const unit=(prog&&prog.unit)||'kg';
  const prs=(DB.prs&&DB.prs[clientId])||{};
  const pr=prs[exId]||prs[name]||null;
  const recordVal=pr?(pr.val!=null?pr.val:pr.kg):(pts.length?Math.max(...pts.map(p=>p.maxKg)):null);
  const e1=(unit==='kg'&&pr&&pr.reps>1)?estimate1RM(pr.val!=null?pr.val:pr.kg,pr.reps):null;
  const did=sessions.filter(s=>(s.exercises||[]).some(x=>(exId&&x.id===exId)||x.name===name));
  const veces=did.length;
  const lastDate=did.reduce((m,s)=>(!m||new Date(s.date)>new Date(m))?s.date:m,null);
  const lastStr=lastDate?new Date(lastDate).toLocaleDateString('es-ES',{day:'numeric',month:'short'}):'—';
  const first=pts.length?pts[0].maxKg:null,last=pts.length?pts[pts.length-1].maxKg:null;
  const trend=(first!=null&&last!=null)?last-first:0;
  const trendStr=!pts.length?'':trend>0?`↑ +${fmtMetric(trend,unit)}`:trend<0?`↓ ${fmtMetric(trend,unit)}`:'↔ estable';
  const trendCol=trend>0?'var(--gt)':trend<0?'var(--ort)':'var(--t3)';
  const stat=(ic,l,v,c)=>`<div class="sroom-stat" style="--sc:${c}"><div class="sroom-stat-ic">${_sroomIc(ic)}</div><div class="sroom-stat-v">${esc(v)}</div><div class="sroom-stat-l">${esc(l)}</div></div>`;
  const statsHTML=[
    stat('🏆','Récord',recordVal!=null?fmtMetric(recordVal,unit):'—','#e0a72e'),
    stat('🔁','Veces',String(veces),'#9b6dd6'),
    stat('📅','Última vez',lastStr,'#3a86c8'),
  ].join('');
  const chartHTML=pts.length>=2
    ? `<div class="sroom-sec">Progresión de carga</div><div id="exroom-chart" style="width:100%;min-height:78px;background:var(--w);border:1px solid var(--br);border-radius:14px;padding:10px 6px;box-shadow:0 4px 12px rgba(0,0,0,.1)"></div>
       <div style="display:flex;justify-content:space-between;margin:9px 2px 16px;font-size:11.5px;color:var(--t2)"><span>Inicio <b>${fmtMetric(first,unit)}</b></span><span style="color:${trendCol};font-weight:700">${trendStr}</span><span>Actual <b style="color:${col}">${fmtMetric(last,unit)}</b></span></div>`
    : pts.length===1
    ? `<div class="exroom-note">Lo registraste una vez (<b>${fmtMetric(pts[0].maxKg,unit)}</b>). Con más sesiones verás aquí tu curva de progreso 📈</div>`
    : `<div class="exroom-note">Aún no hay cargas registradas. Cuando lo entrenes en <b>"Hoy"</b>, aquí verás cómo progresas.</div>`;
  const recent=did.slice(0,6).map(s=>{
    const ex=(s.exercises||[]).find(x=>(exId&&x.id===exId)||x.name===name)||{};
    const done=(ex.sets||[]).filter(st=>st.done);
    let best='—';
    if(done.length){const bw=done.reduce((m,st)=>Math.max(m,parseFloat(st.kg)||0),0);const br=done.find(st=>(parseFloat(st.kg)||0)===bw);best=bw>0?`${bw}kg × ${br?esc(String(br.reps)):''}`:`${done.length} serie${done.length!==1?'s':''}`;}
    return `<div class="exroom-hrow"><span>${new Date(s.date).toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'})}</span><span class="exroom-hrow-v">${best}</span></div>`;
  }).join('');
  const recentHTML=did.length?`<div class="sroom-sec">Últimas veces</div>${recent}`:'';
  const tech=def?`<div class="sroom-sec">Cómo hacerlo</div>${(def.descSimple||def.desc)?`<div class="exroom-tech">${esc(def.descSimple||def.desc)}</div>`:''}${def.id?`<button class="exroom-tech-btn" onclick="openExDetail('${esc(def.id)}')">▶ Ver técnica y video</button>`:''}`:'';
  body.innerHTML=`
    <div class="sroom-hero exroom-hero">
      <div class="exroom-hero-ic" style="background:${col}22;border:1px solid ${col}55">${muscleIcon(muscle,38)}</div>
      <div class="sroom-hero-txt">
        <div class="sroom-title" style="margin-top:0">${esc(name)}</div>
        <div class="exroom-tags"><span>${esc(muscleLabel)}</span>${type?`<span>${esc(type)}</span>`:''}</div>
        ${e1?`<div class="sroom-hero-feel">≈ ${Math.round(e1)} kg · 1RM estimado</div>`:''}
      </div>
    </div>
    <div class="sroom-stats">${statsHTML}</div>
    ${chartHTML}
    ${recentHTML}
    ${tech}
    <div style="height:30px"></div>`;
  body.scrollTop=0;
  _roomFront(room);
  _syncRoomBodyClass();
  if(pts.length>=2)requestAnimationFrame(()=>{const ch=document.getElementById('exroom-chart');if(ch)drawExProgChart(ch,pts,col,unit);});
}
function closeExerciseRoom(){
  const room=document.getElementById('exercise-room');
  if(room)room.classList.remove('on');
  _syncRoomBodyClass();
}

// ── HABITACIÓN DEL MES: reporte mensual (se entra tocando el nombre del mes en el
// calendario de Progreso). Reúne lo que ya existe: adherenceMonth, longestStreak,
// muscleVolume + pushPullBalance, y agrega volumen/kcal/duración del mes calendario.
function openMonthRoom(clientId,year,month){
  const room=document.getElementById('month-room'),body=document.getElementById('mroom-body');
  if(!room||!body)return;
  const all=(DB.history&&DB.history[clientId])||[];
  const ms=all.filter(s=>{const d=new Date(s.date);return d.getFullYear()===year&&d.getMonth()===month;});
  const ref=new Date(year,month,15);
  const monthName=ref.toLocaleDateString('es-ES',{month:'long',year:'numeric'});
  const adh=adherenceMonth(all,ref);
  const now=new Date();
  const isCurrent=(now.getFullYear()===year&&now.getMonth()===month);
  const denom=isCurrent?now.getDate():new Date(year,month+1,0).getDate();
  const adhPct=denom?Math.round(adh.trainedDays/denom*100):0;
  let vol=0,kcal=0,dur=0,reps=0;
  ms.forEach(s=>{vol+=s.totalVol||0;kcal+=s.kcal||0;dur+=s.durationSec||0;(s.exercises||[]).forEach(ex=>(ex.sets||[]).forEach(st=>{if(st&&st.done)reps+=parseInt(st.reps)||0;}));});
  const streakRec=longestStreak(ms);
  const exVol={};
  ms.forEach(s=>(s.exercises||[]).forEach(ex=>{const v=(ex.sets||[]).filter(st=>st.done).reduce((t,st)=>t+(parseFloat(st.kg)||0)*(parseFloat(st.reps)||0),0);if(v>0){const k=ex.name||'?';if(!exVol[k])exVol[k]={name:k,muscle:ex.muscle,id:ex.id,vol:0};exVol[k].vol+=v;}}));
  const topEx=Object.values(exVol).sort((a,b)=>b.vol-a.vol).slice(0,5);
  const mv=muscleVolume(ms,99999,ref), bal=pushPullBalance(mv.byCat);
  const cap=monthName.charAt(0).toUpperCase()+monthName.slice(1);

  if(!ms.length){
    body.innerHTML=`<div class="sroom-hero exroom-hero"><div class="exroom-hero-ic" style="background:#3a86c822;border:1px solid #3a86c855;color:#3a86c8">${typeof aviIcon==='function'?aviIcon('calendar',26):'📅'}</div><div class="sroom-hero-txt"><div class="sroom-title" style="margin-top:0">${esc(cap)}</div><div class="exroom-tags"><span>Sin entrenos este mes</span></div></div></div>
      <div class="exroom-note">No registraste entrenamientos en ${esc(cap)}. Cada sesión que completes en <b>"Hoy"</b> sumará a tu resumen del mes 💪</div><div style="height:30px"></div>`;
    body.scrollTop=0; _roomFront(room); _syncRoomBodyClass(); return;
  }
  const stat=(ic,l,v,c)=>`<div class="sroom-stat" style="--sc:${c}"><div class="sroom-stat-ic">${_sroomIc(ic)}</div><div class="sroom-stat-v">${esc(v)}</div><div class="sroom-stat-l">${esc(l)}</div></div>`;
  const statsHTML=[
    stat('🏋️','Entrenos',String(ms.length),'#10b981'),
    stat('📊','Volumen',vol>=1000?(vol/1000).toFixed(1).replace('.0','')+' t':vol+' kg','#9b6dd6'),
    stat('🔥','Calorías',kcal?kcal.toLocaleString()+'':'—','#e0772e'),
    stat('⏱','Tiempo',dur?fmtDuration(dur):'—','#3a86c8'),
    stat('📅','Días','+'+adh.trainedDays,'#0ea5b7'),
    stat('⚡','Racha máx',streakRec+(streakRec===1?' día':' días'),'#e0a72e'),
  ].join('');
  // mini calendario del mes
  const dows=['L','M','M','J','V','S','D'];
  // hoy/futuro se calculan contra la fecha REAL (no contra `ref`, que es mitad de mes y
  // solo sirve para fijar el mes en adherenceMonth) → así el mes en curso marca bien el día
  // de hoy y los meses pasados no grisan días como si fueran futuros.
  const todayStr=now.toDateString();
  let grid='';
  adh.weeks.forEach(w=>w.forEach(d=>{
    if(!d.inMonth){grid+='<div class="cal-cell empty"></div>';return;}
    const dd=new Date(year,month,d.day);
    let cls='cal-cell'; if(d.trained)cls+=' trained'+(d.count>=2?' t2':''); else if(dd>now)cls+=' future'; if(dd.toDateString()===todayStr)cls+=' today';
    grid+=`<div class="${cls}">${d.day}</div>`;
  }));
  const calHTML=`<div class="sroom-sec">Tu mes día a día</div><div class="mroom-cal"><div class="cal-dows">${dows.map(x=>`<span>${x}</span>`).join('')}</div><div class="cal-grid">${grid}</div><div class="cal-legend"><i></i> Días que entrenaste</div></div>`;
  // top ejercicios por volumen
  const maxV=topEx.length?topEx[0].vol:1;
  const topHTML=topEx.length?`<div class="sroom-sec">Tus ejercicios estrella</div>`+topEx.map((e,i)=>{
    const col=(typeof MC!=='undefined'&&MC[e.muscle])||'var(--g)'; const w=Math.max(8,Math.round(e.vol/maxV*100));
    return `<div class="mroom-top" onclick="openExerciseRoom('${esc(String(clientId))}','${esc(e.id||'')}','${esc(e.name||'')}')"><div class="mroom-top-rk">${i+1}</div><div class="mroom-top-mid"><div class="mroom-top-nm">${esc(e.name)}</div><div class="mroom-top-track"><div class="mroom-top-fill" style="width:${w}%;background:${col}"></div></div></div><div class="mroom-top-v">${Math.round(e.vol).toLocaleString()}<small>kg</small></div></div>`;
  }).join(''):'';
  // balance empuje/tracción
  let balHTML='';
  if(bal.total){
    const vcol={equilibrado:'#10b981','mas-empuje':'#e0a72e','mas-traccion':'#e0a72e'}[bal.verdict]||'#8a8f98';
    balHTML=`<div class="sroom-sec">Equilibrio del mes</div>
      <div class="adv-bal" style="margin-bottom:8px"><div class="adv-bal-bar"><div class="adv-bal-seg push" style="width:${bal.pushPct}%">${bal.pushPct>=16?bal.pushPct+'%':''}</div><div class="adv-bal-seg pull" style="width:${bal.pullPct}%">${bal.pullPct>=16?bal.pullPct+'%':''}</div></div>
      <div class="adv-bal-legend"><span><i class="dot push"></i> Empuje · ${bal.push}</span><span><i class="dot pull"></i> Tracción · ${bal.pull}</span></div>
      <div class="adv-verdict" style="border-color:${vcol}55"><span>${bal.verdict==='equilibrado'?'✅':'⚖️'}</span><span>${esc(bal.msg)}</span></div></div>`;
  }
  const summary=`Entrenaste <b>${ms.length} ${ms.length===1?'vez':'veces'}</b> en ${esc(cap)} (${adh.trainedDays} ${adh.trainedDays===1?'día':'días'}, ${adhPct}% de adherencia). Moviste <b>${vol.toLocaleString()} kg</b> en total${kcal?` y quemaste unas <b>${kcal.toLocaleString()} kcal</b>`:''}. ${streakRec>=2?`Encadenaste hasta <b>${streakRec} días seguidos</b> 🔥`:'¡A sumar más días el próximo mes! 💪'}`;

  body.innerHTML=`
    <div class="sroom-hero exroom-hero">
      <div class="exroom-hero-ic" style="background:#10b98122;border:1px solid #10b98155;color:#10b981">${typeof aviIcon==='function'?aviIcon('calendar',26):'📅'}</div>
      <div class="sroom-hero-txt"><div class="sroom-title" style="margin-top:0">${esc(cap)}</div>
        <div class="exroom-tags"><span>${ms.length} ${ms.length===1?'entreno':'entrenos'}</span><span>${adhPct}% adherencia</span></div></div>
    </div>
    <div class="sroom-stats">${statsHTML}</div>
    <div class="sroom-summary">${summary}</div>
    ${calHTML}
    ${topHTML}
    ${balHTML}
    <div style="height:30px"></div>`;
  body.scrollTop=0; _roomFront(room); _syncRoomBodyClass();
}
function closeMonthRoom(){
  const room=document.getElementById('month-room');
  if(room)room.classList.remove('on');
  _syncRoomBodyClass();
}

// ── HABITACIÓN DE RÉCORD/PR: línea de tiempo de marcas de UN ejercicio (se entra
// tocando un récord en "Tus récords"). Reúne el PR guardado + computeExerciseProgress:
// recorre los puntos (oldest-first) y marca cada vez que el máximo SUPERÓ a todos los
// anteriores = un récord nuevo. Muestra hito a hito + curva + 1RM estimado.
function openRecordRoom(clientId,exName){
  const room=document.getElementById('record-room'),body=document.getElementById('rroom-body');
  if(!room||!body)return;
  const prs=(DB.prs&&DB.prs[clientId])||{};
  const pr=Object.values(prs).find(p=>p.name===exName)||{name:exName};
  const hist=(DB.history&&DB.history[clientId])||[];
  const prog=computeExerciseProgress(hist).find(e=>e.name===exName);
  const unit=(prog&&prog.unit)||pr.unit||'kg';
  const muscle=(prog&&prog.muscle)||pr.muscle;
  const col=(typeof MC!=='undefined'&&MC[muscle])||'var(--g)';
  // hitos: cada punto cuyo máximo superó a todos los previos
  const milestones=[]; let run=-Infinity;
  if(prog)prog.points.forEach(p=>{ if(p.maxKg>run){ milestones.push({date:p.date,dateStr:p.dateStr,val:p.maxKg,first:run===-Infinity}); run=p.maxKg; } });
  const cur=milestones.length?milestones[milestones.length-1]:null;
  const first=milestones.length?milestones[0]:null;
  const recVal=cur?cur.val:(pr.val!=null?pr.val:pr.kg);
  const isKg=unit==='kg';
  const e1=isKg&&pr.reps>1?estimate1RM(recVal,pr.reps):null;
  const beat=Math.max(0,milestones.length-1);
  const gain=(first&&cur)?(cur.val-first.val):0;
  const recDate=pr.date?new Date(pr.date):(cur?new Date(cur.date):null);

  const stat=(ic,l,v,c)=>`<div class="sroom-stat" style="--sc:${c}"><div class="sroom-stat-ic">${_sroomIc(ic)}</div><div class="sroom-stat-v">${esc(v)}</div><div class="sroom-stat-l">${esc(l)}</div></div>`;
  const stats=[
    stat('🏆','Récord',fmtMetric(recVal,unit),'#e0a72e'),
    e1?stat('💪','1RM est.','≈ '+Math.round(e1)+' kg','#9b6dd6'):null,
    beat>0?stat('📈','Lo superaste',beat+(beat===1?' vez':' veces'),'#10b981'):null,
    (gain>0&&isKg)?stat('⬆️','Desde el inicio','+'+Math.round(gain)+' kg','#0ea5b7'):null,
  ].filter(Boolean).join('');

  // línea de tiempo (más reciente arriba)
  const tl=milestones.slice().reverse().map((m,i)=>{
    const isCur=(i===0);
    const d=new Date(m.date).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});
    const tag=m.first?'Primer registro':(isCur?'Récord actual':'Nueva marca');
    return `<div class="rr-mile${isCur?' cur':''}"><div class="rr-mile-dot">${isCur?'🏆':'•'}</div><div class="rr-mile-body"><div class="rr-mile-top"><span class="rr-mile-val">${fmtMetric(m.val,unit)}</span><span class="rr-mile-tag">${tag}</span></div><div class="rr-mile-date">${d}</div></div></div>`;
  }).join('');
  const tlHTML=milestones.length?`<div class="sroom-sec">Tu línea de marcas</div><div class="rr-timeline">${tl}</div>`:`<div class="exroom-note">Aún no hay marcas registradas para este ejercicio. Completa una sesión con peso para empezar tu historial 💪</div>`;

  const chartHTML=(prog&&prog.points.length>=2)?`<div class="sroom-sec">Cómo subió tu marca</div><div id="rroom-chart" style="width:100%;min-height:78px;background:var(--w);border:1px solid var(--br);border-radius:14px;padding:10px 6px;box-shadow:0 4px 12px rgba(0,0,0,.1)"></div>`:'';

  body.innerHTML=`
    <div class="sroom-hero exroom-hero hero-tint" style="background:linear-gradient(135deg,#e0a72e18,#e0a72e08),var(--w);border-color:#e0a72e44">
      <div class="exroom-hero-ic" style="background:#e0a72e22;border:1px solid #e0a72e66">🏆</div>
      <div class="sroom-hero-txt">
        <div class="sroom-title" style="margin-top:0">${esc(exName)}</div>
        <div class="rr-hero-rec">${fmtMetric(recVal,unit)}${isKg&&pr.reps?` <small>× ${pr.reps}</small>`:''}</div>
        <div class="exroom-tags"><span>Récord personal</span>${recDate?`<span>${recDate.toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}</span>`:''}</div>
      </div>
    </div>
    <div class="sroom-stats">${stats}</div>
    ${tlHTML}
    ${chartHTML}
    <div style="height:30px"></div>`;
  body.scrollTop=0; _roomFront(room); _syncRoomBodyClass();
  if(prog&&prog.points.length>=2)requestAnimationFrame(()=>{const ch=document.getElementById('rroom-chart');if(ch)drawExProgChart(ch,prog.points,col,unit);});
}
function closeRecordRoom(){
  const room=document.getElementById('record-room');
  if(room)room.classList.remove('on');
  _syncRoomBodyClass();
}

// ── HABITACIÓN DE RUTINA: el plan + el historial de cumplimiento (se entra desde la
// tarjeta de cada rutina en "Rutinas"). Reúne client.routines (el plan) + las sesiones
// del historial que la realizaron (match por routineId, o por nombre en datos viejos).
function openRoutineRoom(clientId,routineId){
  const room=document.getElementById('routine-room'),body=document.getElementById('rtroom-body');
  if(!room||!body)return;
  const client=(DB.clients||[]).find(c=>c.id===clientId)||(typeof _curClient==='function'?_curClient():null);
  const rt=((client&&client.routines)||[]).find(r=>r.id===routineId);
  if(!rt){ if(typeof toast==='function')toast('No encontré esa rutina'); return; }
  const hist=(DB.history&&DB.history[clientId])||[];
  const done=hist.filter(s=>s.routineId===routineId||(rt.name&&s.routineName===rt.name)).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  const exN=(rt.exercises||[]).length, totS=(rt.exercises||[]).reduce((s,e)=>s+(parseInt(e.sets)||0),0);
  const vols=done.map(s=>s.totalVol||0).filter(v=>v>0);
  const avgVol=vols.length?Math.round(vols.reduce((a,b)=>a+b,0)/vols.length):0;
  const bestVol=vols.length?Math.max(...vols):0;
  const last=done.length?new Date(done[0].date):null;
  const daysAgo=last?Math.floor((Date.now()-last.getTime())/864e5):null;
  const lastStr=daysAgo===null?'—':daysAgo<=0?'Hoy':daysAgo===1?'Ayer':daysAgo<7?'Hace '+daysAgo+' d':last.toLocaleDateString('es-ES',{day:'numeric',month:'short'});
  const IND='#6366f1';
  const fv=v=>v>=1000?(v/1000).toFixed(1).replace('.0','')+' t':v+' kg';

  const stat=(ic,l,v,c)=>`<div class="sroom-stat" style="--sc:${c}"><div class="sroom-stat-ic">${_sroomIc(ic)}</div><div class="sroom-stat-v">${esc(v)}</div><div class="sroom-stat-l">${esc(l)}</div></div>`;
  const stats=[
    stat('🔁','Veces',String(done.length),IND),
    stat('📅','Última vez',lastStr,'#3a86c8'),
    avgVol?stat('📊','Volumen típico',fv(avgVol),'#10b981'):null,
    bestVol?stat('🏆','Tu mejor día',fv(bestVol),'#e0a72e'):null,
  ].filter(Boolean).join('');

  // historial de veces — cada una abre la habitación de sesión, con ▲/▼ vs la anterior
  let sessHTML='';
  if(done.length){
    const rows=done.map((s,i)=>{
      const prev=done[i+1]; const v=s.totalVol||0;
      let delta=''; if(prev&&prev.totalVol>0&&v>0){ const d=v-prev.totalVol; const pc=Math.abs(d/prev.totalVol); if(pc>=0.02)delta=d>0?`<span class="rtr-up">▲ ${fv(Math.abs(d))}</span>`:`<span class="rtr-dn">▼ ${fv(Math.abs(d))}</span>`; }
      const dd=new Date(s.date).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});
      return `<div class="rtr-sess" onclick="openSessionRoom('${esc(String(clientId))}','${esc(s.id||'')}')"><div class="rtr-sess-d">${dd}</div><div class="rtr-sess-r"><span class="rtr-sess-v">${v?fv(v):'—'}</span>${delta}<span class="rtr-chev">›</span></div></div>`;
    }).join('');
    sessHTML=`<div class="sroom-sec">Tus veces con esta rutina</div>${rows}`;
  } else {
    sessHTML=`<div class="exroom-note">Aún no has hecho esta rutina. Tócala en "Hoy" o usa <b>"Hacer esta rutina ahora"</b> y aquí verás tu progreso cada vez 💪</div>`;
  }

  const planHTML=(rt.exercises||[]).length?`<div class="sroom-sec">El plan</div>`+(rt.exercises||[]).map(e=>`<div class="exrow"><div class="exicon" style="background:${(MC[e.muscle]||'#ccc')}18;border:1px solid ${(MC[e.muscle]||'#ccc')}30">${exIcon(e)}</div><div style="flex:1;min-width:0"><div class="exname">${esc(e.name||'')}</div><div class="exmet">${esc(typeof exMuscleText==='function'?exMuscleText(e):(e.muscle||''))}</div></div><div class="exsets">${exSetsCellHTML(e)}</div></div>`).join(''):'';

  const chartHTML=vols.length>=2?`<div class="sroom-sec">Tu volumen, vez a vez</div><div id="rtroom-chart" style="width:100%;min-height:78px;background:var(--w);border:1px solid var(--br);border-radius:14px;padding:10px 6px;box-shadow:0 4px 12px rgba(0,0,0,.1)"></div>`:'';

  const isToday=rt.day===['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][new Date().getDay()];
  body.innerHTML=`
    <div class="sroom-hero exroom-hero hero-tint" style="background:linear-gradient(135deg,${IND}18,${IND}08),var(--w);border-color:${IND}44">
      <div class="exroom-hero-ic" style="background:${IND}22;border:1px solid ${IND}66">📋</div>
      <div class="sroom-hero-txt">
        <div class="sroom-title" style="margin-top:0">${esc(rt.name)}</div>
        <div class="exroom-tags"><span>${esc(rt.day||'')}${isToday?' · hoy':''}</span><span>${exN} ejercicio${exN!==1?'s':''}</span><span>${totS} series</span></div>
      </div>
    </div>
    <div class="sroom-stats">${stats}</div>
    <button onclick="startRoutineNow('${esc(String(rt.id))}')" style="width:100%;padding:12px;margin-bottom:6px;background:linear-gradient(135deg,var(--g),var(--g2));color:#fff;border:none;border-radius:var(--r);font-family:inherit;font-size:14px;font-weight:800;cursor:pointer">▶ Hacer esta rutina ahora</button>
    ${chartHTML}
    ${sessHTML}
    ${planHTML}
    <div style="height:30px"></div>`;
  body.scrollTop=0; _roomFront(room); _syncRoomBodyClass();
  if(vols.length>=2)requestAnimationFrame(()=>{const ch=document.getElementById('rtroom-chart');if(ch){const pts=done.slice().reverse().filter(s=>s.totalVol>0).map(s=>({date:s.date,dateStr:new Date(s.date).toLocaleDateString('es-ES',{day:'numeric',month:'short'}),maxKg:s.totalVol}));drawExProgChart(ch,pts,IND,'kg');}});
}
function closeRoutineRoom(){
  const room=document.getElementById('routine-room');
  if(room)room.classList.remove('on');
  _syncRoomBodyClass();
}

// ── HABITACIÓN DE MÚSCULO: detalle de un grupo (se entra tocándolo en estadísticas).
// Reúne muscleVolume (series del grupo en la ventana _advWin) + submuscleVolume (subregiones)
// + los ejercicios del historial que lo trabajan (cada uno = puerta a su habitación) +
// la tendencia de series por sesión. Usa la misma ventana 7/30 que las estadísticas.
function openMuscleRoom(clientId,group){
  const room=document.getElementById('muscle-room'),body=document.getElementById('mscroom-body');
  if(!room||!body)return;
  const sessions=(DB.history&&DB.history[clientId])||[];
  const win=_advWin, winLbl=win===7?'7 días':'30 días';
  const vol=muscleVolume(sessions,win,new Date());
  const g=vol.groups.find(x=>x.group===group)||{group,label:group,cat:'otro',sets:0};
  const catColor={empuje:'#3ba776',traccion:'#3a86c8',piernas:'#9b6dd6',core:'#e0a72e',cardio:'#e07a5f',otro:'#8a8f98'};
  const col=catColor[g.cat]||catColor.otro;
  const catLabel={empuje:'Empuje',traccion:'Tracción',piernas:'Piernas',core:'Core',cardio:'Cardio',otro:'Otro'}[g.cat]||'';
  const pct=vol.totalSets?Math.round(g.sets/vol.totalSets*100):0;
  const subs=(group==='cardio'||group==='otro')?[]:submuscleVolume(sessions,group,win,new Date(),_exSubregions);
  // ejercicios que lo trabajan (en la ventana): por nombre → series done + volumen
  const cutoff=Date.now()-win*864e5, exMap={};
  sessions.forEach(s=>{ const t=new Date(s.date).getTime(); if(isNaN(t)||t<cutoff)return; (s.exercises||[]).forEach(ex=>{ if(ex.muscle!==group)return; const done=(ex.sets||[]).filter(st=>st&&st.done); if(!done.length)return; const k=ex.name||'?'; if(!exMap[k])exMap[k]={name:k,id:ex.id,muscle:ex.muscle,sets:0,vol:0}; exMap[k].sets+=done.length; exMap[k].vol+=done.reduce((a,st)=>a+(parseFloat(st.kg)||0)*(parseFloat(st.reps)||0),0); }); });
  const exList=Object.values(exMap).sort((a,b)=>b.sets-a.sets);
  // tendencia: series del músculo por sesión (todas, últimas 10 con datos)
  const trend=[];
  sessions.slice().reverse().forEach(s=>{ let n=0; (s.exercises||[]).forEach(ex=>{ if(ex.muscle===group)n+=(ex.sets||[]).filter(st=>st&&st.done).length; }); if(n>0)trend.push({date:s.date,dateStr:new Date(s.date).toLocaleDateString('es-ES',{day:'numeric',month:'short'}),maxKg:n}); });
  const trendPts=trend.slice(-10);

  const stat=(ic,l,v,c)=>`<div class="sroom-stat" style="--sc:${c}"><div class="sroom-stat-ic">${_sroomIc(ic)}</div><div class="sroom-stat-v">${esc(v)}</div><div class="sroom-stat-l">${esc(l)}</div></div>`;
  const stats=[
    stat('💪','Series',String(g.sets),col),
    stat('🏋️','Ejercicios',String(exList.length),'#10b981'),
    stat('🥧','Del total',pct+'%','#9b6dd6'),
  ].join('');

  let subHTML='';
  if(subs.length){
    const smMax=subs[0].sets||1;
    subHTML=`<div class="sroom-sec">Por dónde le pegas</div>`+subs.map(s=>{
      const sw=Math.max(8,Math.round(s.sets/smMax*100));
      return `<div class="msc-sub"><div class="msc-sub-lbl">${esc(s.label)}</div><div class="msc-sub-track"><div class="msc-sub-fill" style="width:${sw}%;background:${col}"></div></div><div class="msc-sub-val">${s.sets}</div></div>`;
    }).join('');
  }

  let exHTML='';
  if(exList.length){
    const mxs=exList[0].sets||1;
    exHTML=`<div class="sroom-sec">Ejercicios que lo trabajan</div>`+exList.map(e=>{
      const w=Math.max(8,Math.round(e.sets/mxs*100));
      return `<div class="msc-ex" onclick="openExerciseRoom('${esc(String(clientId))}','${esc(e.id||'')}','${esc(e.name||'')}')"><div class="msc-ex-mid"><div class="msc-ex-nm">${esc(e.name)}</div><div class="msc-ex-track"><div class="msc-ex-fill" style="width:${w}%;background:${col}"></div></div></div><div class="msc-ex-v">${e.sets}<small>series</small></div><span class="rtr-chev">›</span></div>`;
    }).join('');
  } else {
    exHTML=`<div class="exroom-note">No registré ejercicios de este grupo en los últimos ${winLbl}.</div>`;
  }

  const chartHTML=trendPts.length>=2?`<div class="sroom-sec">Tus series, sesión a sesión</div><div id="mscroom-chart" style="width:100%;min-height:78px;background:var(--w);border:1px solid var(--br);border-radius:14px;padding:10px 6px;box-shadow:0 4px 12px rgba(0,0,0,.1)"></div>`:'';

  body.innerHTML=`
    <div class="sroom-hero exroom-hero hero-tint" style="background:linear-gradient(135deg,${col}18,${col}08),var(--w);border-color:${col}44">
      <div class="exroom-hero-ic" style="background:${col}1f;border:1px solid ${col}55">${typeof muscleIcon==='function'?muscleIcon(group,30):'💪'}</div>
      <div class="sroom-hero-txt">
        <div class="sroom-title" style="margin-top:0">${esc(g.label)}</div>
        <div class="exroom-tags"><span>${g.sets} series · ${winLbl}</span>${catLabel?`<span>${catLabel}</span>`:''}</div>
      </div>
    </div>
    <div class="sroom-stats">${stats}</div>
    ${subHTML}
    ${exHTML}
    ${chartHTML}
    <div style="height:30px"></div>`;
  body.scrollTop=0; _roomFront(room); _syncRoomBodyClass();
  if(trendPts.length>=2)requestAnimationFrame(()=>{const ch=document.getElementById('mscroom-chart');if(ch)drawExProgChart(ch,trendPts,col,'series');});
}
function closeMuscleRoom(){
  const room=document.getElementById('muscle-room');
  if(room)room.classList.remove('on');
  _syncRoomBodyClass();
}

// Ventana de días para estadísticas avanzadas (7 = semana, 30 = mes). Por cliente-sesión.
let _advWin=30;
function setAdvWin(d){_advWin=d;renderAdvStats(CUR.clientId);}
// Estadísticas avanzadas Premium: balance empuje/tracción + volumen por grupo muscular.
// Series EFECTIVAS (completadas) de las últimas _advWin días. Funciona sobre el historial
// que YA existe. Patrón premium: tarjetas etiquetadas + lenguaje claro (no datos sueltos).
function renderAdvStats(clientId){
  const con=document.getElementById('cn-advstats');if(!con)return;
  const c=DB.clients.find(x=>x.id===clientId);
  if(isFreeClient(c)){con.innerHTML=premiumLockHTML('Tu entrenamiento en números','Cuántas series le das a cada músculo y si tu empuje y tu tracción están equilibrados.');return;}
  const sessions=(DB.history&&DB.history[clientId])||[];
  const win=_advWin;
  const vol=muscleVolume(sessions,win,new Date());
  const bal=pushPullBalance(vol.byCat);
  const winLbl=win===7?'7 días':'30 días';
  const pills=`<div class="adv-win">
    <button class="adv-pill${win===7?' on':''}" onclick="setAdvWin(7)">7 días</button>
    <button class="adv-pill${win===30?' on':''}" onclick="setAdvWin(30)">30 días</button>
  </div>`;
  if(!vol.totalSets){
    con.innerHTML=`<div class="card adv-card">
      <div class="adv-head"><div class="streak-title">${typeof aviIcon==='function'?aviIcon('chart',14):'📊'} Tu entrenamiento en números</div>${pills}</div>
      <div class="empty" style="padding:26px 10px"><div class="eico" style="color:var(--t3)">${typeof aviIcon==='function'?aviIcon('chart',34):'📊'}</div><div class="etxt">Aún no hay series en los últimos ${winLbl}</div><div class="esub">Cuando completes entrenamientos en <b>"Hoy"</b>, aquí verás cuántas series le das a cada músculo y si tu cuerpo entrena equilibrado 💪</div></div>
    </div>`;
    return;
  }
  // Balance empuje/tracción — barra de dos segmentos + veredicto.
  const vcolor={equilibrado:'var(--g2,#2ecc71)','mas-empuje':'var(--yl,#f1c40f)','mas-traccion':'var(--yl,#f1c40f)','sin-datos':'var(--t3,#888)'}[bal.verdict];
  const vicon={equilibrado:'✅','mas-empuje':'⚖️','mas-traccion':'⚖️','sin-datos':'—'}[bal.verdict];
  let balHTML='';
  if(bal.total){
    balHTML=`<div class="adv-bal">
      <div class="adv-bal-bar">
        <div class="adv-bal-seg push" style="width:${bal.pushPct}%">${bal.pushPct>=16?bal.pushPct+'%':''}</div>
        <div class="adv-bal-seg pull" style="width:${bal.pullPct}%">${bal.pullPct>=16?bal.pullPct+'%':''}</div>
      </div>
      <div class="adv-bal-legend"><span><i class="dot push"></i> Empuje · ${bal.push} series</span><span><i class="dot pull"></i> Tracción · ${bal.pull} series</span></div>
      <div class="adv-verdict" style="border-color:${vcolor}55"><span>${vicon}</span><span>${esc(bal.msg)}</span></div>
    </div>`;
  }
  // Volumen por grupo muscular — barras horizontales (color por categoría).
  // Cada grupo con desglose es expandible: al tocarlo muestra sus subregiones
  // (Cuádriceps, Femoral, Aductores…) calculadas con MM_EX (vía _exSubregions).
  const catColor={empuje:'#3ba776',traccion:'#3a86c8',piernas:'#9b6dd6',core:'#e0a72e',cardio:'#e07a5f',otro:'#8a8f98'};
  const maxSets=vol.groups[0]?vol.groups[0].sets:1;
  // Cada grupo es una PUERTA a su Habitación de Músculo (detalle: subregiones + ejercicios
  // que lo trabajan + tendencia). El desglose de subregiones vive ahora dentro de la habitación.
  const bars=vol.groups.map(g=>{
    const w=Math.max(6,Math.round(g.sets/maxSets*100));
    const col=catColor[g.cat]||catColor.otro;
    return `<div class="adv-grp">
      <div class="adv-row adv-row-door" onclick="openMuscleRoom('${clientId}','${g.group}')">
        <div class="adv-row-lbl">${esc(g.label)} <span class="adv-chev">›</span></div>
        <div class="adv-row-track"><div class="adv-row-fill" style="width:${w}%;background:${col}"></div></div>
        <div class="adv-row-val">${g.sets}<span>series</span></div>
      </div>
    </div>`;
  }).join('');
  con.innerHTML=`<div class="card adv-card">
    <div class="adv-head"><div class="streak-title">${typeof aviIcon==='function'?aviIcon('chart',14):'📊'} Tu entrenamiento en números</div>${pills}</div>
    <div class="adv-sub">Series <b>completadas</b> en los últimos ${winLbl} · ${vol.totalSets} en total, ${vol.sessions} entreno${vol.sessions===1?'':'s'}.</div>
    ${balHTML}
    <div class="adv-sech">Cuánto le das a cada músculo <span style="font-weight:600;text-transform:none;letter-spacing:0;color:var(--t3)">· toca un grupo para entrar al detalle</span></div>
    <div class="adv-bars">${bars}</div>
    <div class="adv-foot">Contamos solo las <b>series que marcaste como hechas</b> (sin calentamiento). Más series = más estímulo para ese músculo.</div>
  </div>`;
}
// Expandir/colapsar el desglose de subgrupos de una fila de grupo muscular.
function cnToggleSub(rowEl){
  const grp=rowEl.parentElement;const sm=grp.querySelector('.adv-sm');if(!sm)return;
  const open=sm.style.display!=='none';
  sm.style.display=open?'none':'block';
  const chev=rowEl.querySelector('.adv-chev');if(chev)chev.style.transform=open?'':'rotate(180deg)';
}
// Resuelve las subregiones PRIMARIAS de un ejercicio del historial. La sesión guarda
// nombre+grupo (y, en sesiones nuevas, id). Estrategia, de más a menos confiable:
//   1) por id (sesiones nuevas) → exacto.
//   2) por nombre NORMALIZADO exacto (ignora mayúsculas, tildes, paréntesis, puntuación).
//   3) aproximado SEGURO: entre catálogo del MISMO grupo, candidatos cuyo nombre
//      normalizado es prefijo-superset del histórico (o viceversa); se usa SOLO si TODOS
//      coinciden en la misma subregión del grupo. Si no, cae a [] ("General"): preferimos
//      no atribuir antes que mostrar un submúsculo equivocado. Datos nuevos (con id)
//      resuelven al 100%; esto recupera el historial viejo cuyo nombre derivó del catálogo.
function _normExName(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/\([^)]*\)/g,' ').replace(/[^a-z0-9]+/g,' ').trim();
}
let _subCache=null; // { exact:{norm:subs}, group:{muscle:[{norm,subs}]} }
function _buildSubCache(){
  _subCache={exact:{},group:{}};
  if(typeof MM_EX==='undefined')return;
  (DB.exercises||[]).forEach(e=>{
    if(!e||!e.name)return;
    const subs=(MM_EX[e.id]&&MM_EX[e.id].p)||[];
    const nm=_normExName(e.name);
    if(nm&&!_subCache.exact[nm])_subCache.exact[nm]={subs};
    (_subCache.group[e.muscle]=_subCache.group[e.muscle]||[]).push({norm:nm,subs});
  });
}
function _exSubregions(ex){
  // 1) por id directo
  const id=ex&&ex.id;
  if(id&&typeof MM_EX!=='undefined'&&MM_EX[id])return MM_EX[id].p||[];
  if(typeof MM_EX==='undefined')return [];
  if(!_subCache)_buildSubCache();
  const nm=_normExName(ex&&ex.name);
  if(!nm)return [];
  // 2) normalizado exacto
  if(_subCache.exact[nm])return _subCache.exact[nm].subs;
  // 3) aproximado seguro dentro del grupo del ejercicio
  const grp=ex&&ex.muscle;
  const pool=(grp&&_subCache.group[grp])||[];
  const cand=pool.filter(p=>p.norm&&(p.norm===nm||p.norm.startsWith(nm+' ')||nm.startsWith(p.norm+' ')));
  if(cand.length){
    const inGrpKey=c=>JSON.stringify([...new Set((c.subs||[]).filter(s=>SUBMUSCLE_GROUP[s]===grp))].sort());
    const k0=inGrpKey(cand[0]);
    if(k0!=='[]'&&cand.every(c=>inGrpKey(c)===k0))return cand[0].subs;
  }
  return [];
}

let _cnHistOpen={}; // clientId -> ver TODO el historial (por defecto colapsado a 2)
// v314 (estudio, mejora 3): salto por anclas dentro de Progreso. La fila solo aparece
// cuando hay sesiones; cada chip se oculta si su bloque está vacío (gamif con 0 entrenos).
function progJump(id){const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}
function _syncProgAnchors(hasSessions){
  const row=document.getElementById('prog-anchors'); if(!row)return;
  row.style.display=hasSessions?'flex':'none';
  // CANDADO: el scroll del asesorado vive en .cnbody (overflow:auto) y la barra superior
  // queda FUERA de ese scroller → top:0 (styles.css) pega la fila JUSTO debajo de la barra.
  // No poner top en px aquí: 55px dentro de .cnbody = hueco de 55px (bug cazado 2026-07-10).
  // El salto sí necesita despejar la fila: scroll-margin medido en vivo (letra grande cambia el alto).
  const clear=(row.offsetHeight||38)+8; // fila + aire
  row.querySelectorAll('[data-jump]').forEach(b=>{
    const t=document.getElementById(b.getAttribute('data-jump'));
    b.style.display=(t&&(t.id==='prog-hist-sec'||t.innerHTML.trim()))?'':'none';
    if(t)t.style.scrollMarginTop=clear+'px'; // que el salto no deje el título tapado
  });
}
function renderClientHistory(clientId){
  if(!DB.history)DB.history=ld('ax_hist',{});
  const sessions=DB.history[clientId]||[];
  const con=document.getElementById('cn-hist-list');if(!con)return;
  // Gamificación (Tu nivel + Tus logros) vive en este panel pero la pintaba solo
  // el Perfil → al entrar a Progreso llegaba tarde. La pintamos aquí, de una.
  const _gc=DB.clients.find(x=>x.id===clientId); if(_gc)renderGamification(_gc);
  renderClientStreak(clientId);
  renderAdvStats(clientId);
  renderVolChart(sessions);
  _syncProgAnchors(sessions.length>0);
  if(!sessions.length){
    con.innerHTML='<div class="empty" style="padding:36px"><div class="eico" style="color:var(--g2)">'+(typeof aviIcon==='function'?aviIcon('chart',34):'📊')+'</div><div class="etxt">Aquí verás tu progreso</div><div class="esub">Cada entrenamiento que completes en <b>"Hoy"</b> queda guardado aquí. Con las semanas verás cómo avanzas 📈<br><br>Al principio está vacío — ¡es normal!</div><button class="btn bp bsm" style="margin-top:14px" onclick="cnTab(\'cn-today\',document.querySelectorAll(\'.cntab\')[0])">Ir a mi entrenamiento →</button></div>';
    return;
  }
  con.innerHTML='';
  // Plegable: por defecto solo los últimos 2 entrenos; el resto tras "Ver todos".
  const open=_cnHistOpen[clientId];
  const shown=open?sessions:sessions.slice(0,2);
  shown.forEach(s=>{
    const d=new Date(s.date);
    const dateStr=d.toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'});
    const timeStr=d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
    const div=document.createElement('div');
    if(s.id)div.id='sescard-'+s.id;
    const pct=s.totalSets>0?Math.round((s.doneSets/s.totalSets)*100):0;
    const pcol=pct===100?'var(--gt)':'var(--ort)';
    div.className='sescard door'+(pct===100?' done':'');
    // La tarjeta es una "puerta": al tocarla entra a la habitación de esa sesión.
    div.innerHTML=`
      <div class="sescard-h" onclick="openSessionRoom('${clientId}','${s.id}')">
        <div class="sescard-top">
          <div><div class="sescard-name">${esc(s.routineName||"")}</div><div class="sescard-date">${dateStr} · ${timeStr}</div></div>
          <div class="sescard-sets"><b>${s.doneSets}/${s.totalSets}</b><small>series</small></div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <div class="pbar" style="flex:1;margin-top:0"><div class="pfill" style="width:${pct}%;background:${pcol}"></div></div>
          <span class="sescard-pct" style="color:${pcol}">${pct}%</span>
          ${s.totalVol>0?`<span class="sescard-vol">${s.totalVol.toLocaleString()} kg</span>`:''}
          <span class="sescard-arrow">›</span>
        </div>
      </div>`;
    con.appendChild(div);
  });
  if(sessions.length>2){
    const mb=document.createElement('button');
    mb.className='collapse-more';
    mb.textContent=open?'Ver menos ▴':`Ver todos (${sessions.length}) ▾`;
    mb.onclick=()=>{_cnHistOpen[clientId]=!open;renderClientHistory(clientId);};
    con.appendChild(mb);
  }
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
    div.innerHTML=`<div style="padding:9px 0${hasDetail?';cursor:pointer':''}"${hasDetail?` onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'"`:''}><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><div><div style="font-size:13px;font-weight:600">${esc(s.routineName)}${feel}${hasDetail?' <span style="color:var(--t3);font-size:11px">▾</span>':''}</div><div style="font-size:11px;color:var(--t3)">${dateStr}${meta?' · '+meta:''}</div></div><div style="text-align:right"><span style="font-size:13px;font-weight:700;color:${pct===100?'var(--gt)':'var(--ort)'}">${pct}%</span>${s.totalVol>0?`<span style="font-size:11px;color:var(--t2);margin-left:8px">${s.totalVol.toLocaleString()}kg</span>`:''}</div></div><div class="pbar" style="margin-top:0"><div class="pfill" style="width:${pct}%;background:${pct===100?'var(--g)':'var(--or)'}"></div></div></div>${hasDetail?`<div style="display:none;background:var(--bg);border-radius:8px;padding:10px 12px;margin:0 0 9px">${_sessionExercisesHTML(s,clientId)}</div>`:''}`;
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
  const quick=document.getElementById('cn-msg-quick'); // v316: respuestas rápidas
  // El chat es SOLO-COACH (Premium + Coach). Libre y Premium app (sin coach) ven el
  // candado con invitación a sumar coach. El resto de lo premium de app NO se toca.
  if(!clientHasCoach(DB.clients.find(x=>x.id===clientId))){
    if(composer)composer.style.display='none';
    if(quick)quick.style.display='none';
    con.innerHTML=premiumLockHTML('Chat con tu coach','Habla directo con un entrenador que te guía, ajusta tu plan y te responde.');
    return;
  }
  if(composer)composer.style.display='';
  if(quick)quick.style.display='flex';
  // Sin mensajes NO es un caso raro: 11 de los 23 del gimnasio no han cruzado uno nunca (medido
  // 2026-07-28). Es la primera impresión de la pestaña, así que dice para qué sirve y qué hacer,
  // y las respuestas rápidas de abajo ya le dan el primer toque sin escribir nada.
  if(!msgs.length){
    const nom=(DB.clients.find(x=>x.id===clientId)?.name||'').split(' ')[0];
    con.innerHTML='<div class="mempty"><div class="eico">'+(typeof aviIcon==='function'?aviIcon('chat',34):'💬')+'</div>'
      +'<div class="etxt">Aquí hablas con tu coach</div>'
      +'<div class="esub">Cuéntale cómo te fue, pregúntale una duda o avísale si algo te dolió'+(nom?', '+esc(nom):'')+'. Te responde por acá mismo.</div></div>';
    return;
  }
  msgs.forEach(m=>{
    // Vista del CLIENTE: lo MÍO (from==='client') va a la derecha/verde (cs); el coach a la izquierda (cl).
    const mine=m.from!=='coach';
    const b=document.createElement('div');b.className=`mb ${mine?'cs':'cl'}`;b.textContent=m.text||'';con.appendChild(b);
    const t=document.createElement('div');t.className=`mt${mine?' r':''}`;t.textContent=`${mine?'Tú':'Coach'} · ${fmtD(m.date)} ${fmtT(m.date)}`;con.appendChild(t);
  });
  con.scrollTop=con.scrollHeight;
}
// Ruta ÚNICA de envío del asesorado — la usan el textarea y las respuestas rápidas (v316).
function _clientSend(text){
  const clientId=CUR.clientId;if(!text||!clientId)return;
  if(!DB.msgs[clientId])DB.msgs[clientId]=[];
  DB.msgs[clientId].push({from:'client',text,date:new Date().toISOString()});
  svNow('ax_m',DB.msgs);
  const clientName=DB.clients.find(c=>c.id===clientId)?.name||'Asesorado';
  // Push al coach para notificación en tiempo real
  pushToClient('_coach','💬 '+clientName+' te escribió',text.length>80?text.slice(0,77)+'...':text,{type:'message',chatId:clientId,tag:'avi-chat-coach'});
  renderClientMsgs(clientId);toast('💬 Mensaje enviado a tu coach');
}
function sendClientMsg(){
  // Guard ANTES de limpiar (aviso Julián v316): sin sesión el texto no se borra en silencio.
  const ta=document.getElementById('cn-msg-in');const text=ta.value.trim();if(!text||!CUR.clientId)return;
  ta.value='';ta.style.height='auto';
  _clientSend(text);
}
// v316 (estudio, mejora 6): chip de respuesta rápida — un toque, mensaje enviado.
function clientQuickMsg(t){ if(navigator.vibrate)navigator.vibrate(15); _clientSend((t||'').trim()); }

// (restInt/_restVis/_restPaused — estado del rest-banner clasico — RETIRADOS en F5b)

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
// (_stopRest/startClientRest/restPause/restAdd15/skipRest — el rest-banner clasico completo —
// se RETIRARON en F5b 2026-07-06; el guiado usa gm-rest-overlay + #gm-rest-mini.)

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
  a.download=`avi-backup-${date}.json`;
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
      el.style.color=kb>3500?'var(--rdt)':kb>2000?'var(--ort)':'var(--gt)';
    }
  }catch(e){}
  om('m-backup');
}
function om(id){document.getElementById(id).classList.add('on')}
function cm(id){document.getElementById(id).classList.remove('on')}
// Cierre por click en el FONDO (tap-fuera) — DELEGADO en document para cubrir TODOS los .mdbg,
// incluidos los declarados DESPUÉS de este <script> (m-qwcfg/m-notif/m-nut/m-med/m-delacct/
// m-payment/m-photos). El binding por-elemento anterior (`querySelectorAll('.mdbg').forEach`)
// corría en tiempo de PARSEO y no veía esos modales tardíos → el tap-fuera no los cerraba
// (bug cazado y reproducido 2026-07-13). La delegación es inmune al orden de declaración.
document.addEventListener('click',e=>{const t=e.target;if(t&&t.classList&&t.classList.contains('mdbg')&&t.classList.contains('on'))t.classList.remove('on');});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.mdbg.on').forEach(m=>m.classList.remove('on'))});

// ── Accesibilidad de modales (Grupo D) ──────────────────────────────────────────────
// Al ABRIR, el foco entra al diálogo (enfoca el contenedor .md, NO un input → no dispara el
// teclado en móvil); Tab queda ATRAPADO dentro; al CERRAR, el foco vuelve a quien lo abrió.
// Un MutationObserver por .mdbg detecta abrir/cerrar por la clase 'on' → cubre TODAS las vías
// de cierre (cm, tap-fuera, Escape, botón atrás/_aviCloseTopOverlay) sin tocar la navegación.
// Init tras el parseo completo: los modales tardíos aún no existen cuando corre este script.
function _initModalA11y(){
  const _mReturn=new WeakMap();
  const _focusables=m=>[...m.querySelectorAll('a[href],button:not([disabled]),input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>el.offsetParent!==null||el===document.activeElement);
  document.querySelectorAll('.mdbg').forEach(m=>{
    new MutationObserver(()=>{
      const open=m.classList.contains('on');
      if(open&&!m._a11yOpen){
        m._a11yOpen=true; _mReturn.set(m,document.activeElement);
        requestAnimationFrame(()=>{
          if(!m.classList.contains('on'))return;
          if(m.contains(document.activeElement)&&document.activeElement!==document.body)return; // foco manual del modal ya ganó
          const md=m.querySelector('.md')||m;
          if(!md.hasAttribute('tabindex'))md.setAttribute('tabindex','-1');
          try{md.focus({preventScroll:true});}catch(e){}
        });
      }else if(!open&&m._a11yOpen){
        m._a11yOpen=false;
        const r=_mReturn.get(m); _mReturn.delete(m);
        if(r&&document.body.contains(r)&&typeof r.focus==='function'){try{r.focus({preventScroll:true});}catch(e){}}
      }
    }).observe(m,{attributes:true,attributeFilter:['class']});
  });
  // Tab atrapado dentro del modal de más arriba (último .mdbg.on en el DOM = el recién abierto)
  document.addEventListener('keydown',e=>{
    if(e.key!=='Tab')return;
    const open=document.querySelectorAll('.mdbg.on'); if(!open.length)return;
    const m=open[open.length-1], f=_focusables(m);
    if(!f.length){e.preventDefault();return;}
    const first=f[0], last=f[f.length-1];
    if(!m.contains(document.activeElement)){e.preventDefault();first.focus();return;}
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',_initModalA11y);else _initModalA11y();

// INIT filter buttons
buildFilterBtns('exf',exFilter);
// restoreNotifications() se llama después del login del coach, una vez confirmados los permisos
