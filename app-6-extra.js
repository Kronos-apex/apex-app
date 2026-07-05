// ══════════════════════ PWA BOOTSTRAP ══════════════════════

// El ícono de la PWA viene de archivos PNG de marca (icons/icon-192.png y icon-512.png,
// el ala esmeralda de AVI): el manifest los usa en Android y el apple-touch-icon en iOS.
// (Se eliminó pwaGenIcon, que dibujaba en canvas el logo viejo AVI — la "A" con barra.)

function initPWA(){
  // Ícono para Apple Touch Icon (iOS "Añadir a inicio") = MISMO logo AVI que usa
  // el manifest en Android. Antes se generaba en canvas con el logo viejo AVI (la
  // "A" con barra) → en iPhone salía el ícono antiguo. Ahora apunta al PNG de marca.
  const appleLink=document.getElementById('pwa-icon-apple');
  if(appleLink)appleLink.href='/apex-app/icons/icon-192.png?v=avi2';

  // Manifest: ya apunta a /apex-app/manifest.json estático (no se sobreescribe)

  const isSecure=location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1';
  if('serviceWorker' in navigator && isSecure){
    navigator.serviceWorker.register('/apex-app/sw.js',{scope:'/apex-app/'})
      .then(reg=>{
        log('AVI SW ✅');
        window._swReg=reg;
        reg.addEventListener('updatefound',()=>{ const nw=reg.installing; if(!nw)return; nw.addEventListener('statechange',()=>{ if(nw.state==='installed' && navigator.serviceWorker.controller && typeof toast==='function') toast('🔄 Nueva versión de AVI lista. Ciérrala y ábrela para actualizar.'); }); });
        // Limpiar registraciones viejas (blob URL SWs con scope /)
        navigator.serviceWorker.getRegistrations().then(regs=>{
          regs.forEach(r=>{if(r.scope!==reg.scope)r.unregister();});
        });
      })
      .catch(e=>warn('AVI SW error:',e));
  }

  // Banner e instrucciones de instalación PWA.
  // El evento beforeinstallprompt lo captura un script en el <head> ANTES de que
  // cargue este JS (que espera a la nube), y lo deja en window.__aviBIP. Aquí lo
  // recogemos para que el botón pueda instalar de un toque sin perder el evento.
  let deferredPrompt=window.__aviBIP||null;
  const isStandalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream;

  // Muestra el botón flotante de instalar (un solo control, práctico, siempre a la mano)
  const showInstallBtn=()=>{
    if(isStandalone) return;
    if(sessionStorage.getItem('avi_install_dismissed')) return;
    const b=document.getElementById('install-banner');
    if(b) b.style.display='flex';
  };

  // Cuando el navegador ya permite instalar de un toque: botón visible + pista directa
  const reflectInstallable=()=>{
    if(isStandalone) return;
    showInstallBtn();
    const generic=document.getElementById('install-hint-generic');
    const android=document.getElementById('install-hint-android');
    if(generic)generic.style.display='none';
    if(android)android.style.display='block';
  };

  // Si ya está instalada (standalone) ocultar todo; si no, mostrar botón + instrucciones de login
  if(isStandalone){
    ['install-banner','install-hint','ios-install-banner'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
  } else {
    // Botón flotante visible de una vez (no espera al permiso del navegador)
    showInstallBtn();
    // Instrucciones en login adaptadas al dispositivo
    const hint=document.getElementById('install-hint');
    if(hint){
      hint.style.display='block';
      if(isIOS){
        document.getElementById('install-hint-ios').style.display='block';
        document.getElementById('install-hint-generic').style.display='none';
      } else {
        document.getElementById('install-hint-generic').style.display='block';
      }
    }
    // Si el evento ya se capturó en el <head>, reflejar "instalable" de una vez
    if(deferredPrompt) reflectInstallable();
  }

  // Hook llamado por el script del <head> si el evento llega DESPUÉS de este init
  window._aviOnBIP=e=>{
    if(isStandalone) return;
    deferredPrompt=e;
    reflectInstallable();
  };

  window._aviOnInstalled=()=>{
    deferredPrompt=null;
    ['install-banner','install-hint','ios-install-banner'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
    if(typeof toast==='function') toast('✅ ¡App instalada! Ábrela desde tu pantalla de inicio.');
  };

  window._aviInstall=async()=>{
    // iPhone/Safari: Apple no permite instalar por botón → abrir la guía visual de pasos
    if(isIOS){
      const b=document.getElementById('ios-install-banner');
      if(b) b.style.display='block';
      else toast('Toca Compartir ↑ → "Añadir a pantalla de inicio"');
      return;
    }
    // Android/Chrome: si el navegador ya dio el permiso, instalación nativa de un toque
    if(!deferredPrompt){
      toast('Abre el menú del navegador (⋮) y toca "Instalar aplicación"');
      return;
    }
    deferredPrompt.prompt();
    const{outcome}=await deferredPrompt.userChoice;
    if(outcome==='accepted') toast('🚀 Instalando...');
    deferredPrompt=null;
    const b=document.getElementById('install-banner');
    if(b)b.style.display='none';
  };

  // Cerrar el botón flotante (solo por esta sesión: vuelve la próxima vez)
  window._aviDismissInstall=()=>{
    const b=document.getElementById('install-banner');
    if(b)b.style.display='none';
    try{sessionStorage.setItem('avi_install_dismissed','1');}catch(e){}
  };

  window.dismissIOSBanner=function dismissIOSBanner(){
    const b=document.getElementById('ios-install-banner');
    if(b)b.style.display='none';
    localStorage.setItem('apex_ios_banner_dismissed','1');
  };
}

// ══════════════════════════════════════════
// MODO GUIADO — ejercicio a ejercicio
// ══════════════════════════════════════════
const GM = {
  routine: null,
  exercises: [],
  steps: [],
  currentStep: 0,
  restTimer: null,
  restTotal: 60,
  hiit: null,
};

function openGuidedMode(){
  const routine = CUR.activeRoutine;
  if(!routine || !(routine.exercises||[]).length){ toast('No hay ejercicios en esta rutina'); return; }
  // Reset diario + dropsets huérfanos ANTES de calcular pasos: el guiado no debe depender
  // de que la clásica haya renderizado (plan unificación P10). Idempotente el mismo día.
  if(typeof prepareTodaySession==='function') prepareTodaySession(routine);
  gmRebuild();
  const g=document.getElementById('guided-mode');
  g.classList.remove('gm-embedded'); // defensivo: si venía embebido, vuelve a ser overlay
  g.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  _gmDeferScrollToCurrent(200);
  // Tarjeta de respiración del primer ejercicio (si la rutina no está ya completa)
  setTimeout(() => { const s=GM.steps[GM.currentStep]; if(s) gmShowStartCard(s.ex); }, 420);
}

// ══════════ GUIADO EMBEBIDO como pantalla de "Hoy" (unificación F2 sub-2) ══════════
// Con el flag ax_ui_guided ON, "Hoy" ES el guiado embebido en #cn-today-body (no overlay).
// Reubica el MISMO #guided-mode (reusa topbar/body/footer/rest-overlay ya probados) dentro del
// tab y le quita position:fixed vía la clase gm-embedded. No hay ✕, no bloquea el scroll del
// body, no muestra tarjeta de inicio. El camino del overlay (openGuidedMode) NO se usa con el
// flag ON (el botón "▶ Empezar" no se pinta) → nunca hay dos renders gm-* a la vez.
let _gmHomeParent=null, _gmHomeNext=null;
function _gmCaptureHome(){
  const g=document.getElementById('guided-mode'); if(!g||_gmHomeParent!==null) return;
  _gmHomeParent=g.parentNode; _gmHomeNext=g.nextSibling;
}
// Devuelve #guided-mode a su sitio original (overlay) y oculto. Debe correr ANTES de que
// renderClientToday haga con.innerHTML='' (si no, borraría el nodo compartido del DOM).
// SOLO actúa si está EMBEBIDO: si es un overlay abierto (flag OFF, guiado clásico encima de
// "Hoy") NO se toca — hacerlo lo ocultaría a media sesión (bug S6/S7/S8: pickMood/todayMoveEx
// disparan renderClientToday con el overlay abierto).
function gmRestoreOverlayHome(){
  const g=document.getElementById('guided-mode'); if(!g) return;
  if(!g.classList.contains('gm-embedded')) return;
  g.classList.remove('gm-embedded');
  g.classList.add('hidden');
  if(_gmHomeParent && g.parentNode!==_gmHomeParent){ _gmHomeParent.insertBefore(g,_gmHomeNext); }
}
function openGuidedEmbedded(routine){
  if(!routine || !(routine.exercises||[]).length) return false;
  const g=document.getElementById('guided-mode');
  const con=document.getElementById('cn-today-body');
  if(!g||!con) return false;
  _gmCaptureHome();
  if(typeof prepareTodaySession==='function') prepareTodaySession(routine);
  // Sin timers heredados de una sesión previa
  if(GM.restTimer){ clearInterval(GM.restTimer); GM.restTimer=null; }
  if(GM.holding) _gmEndHoldUI();
  if(GM.hiit){ clearInterval(GM.hiit); GM.hiit=null; relWake(); }
  const ov=document.getElementById('gm-rest-overlay'); if(ov) ov.classList.add('hidden');
  g.classList.add('gm-embedded');
  g.classList.remove('hidden');
  if(g.parentNode!==con) con.appendChild(g); // mueve el nodo (con su rest-overlay hijo) al tab
  document.body.style.overflow=''; // embebido NO bloquea el scroll de la app
  gmRebuild();
  _gmDeferScrollToCurrent(120);
  return true;
}
function _gmIsEmbedded(){ const g=document.getElementById('guided-mode'); return !!(g&&g.classList.contains('gm-embedded')); }
// ¿Hay un timer del guiado corriendo (descanso, HIIT o isométrico)? Lo usa renderClientToday
// para que el poll en vivo NO corte una serie en curso (F2 sub-3).
function _gmLiveTimer(){ return !!(GM.restTimer||GM.hiit||GM.holding); }

// Reconstruye el estado del guiado desde CUR.activeRoutine (tras ánimo, reorden o
// sustitución). Las claves de sesión ya viajaron con el ejercicio
// (_swapSessionKeys/_clearSessionKeys de la clásica), así que el paso actual se recalcula
// solo con el bucle de series hechas. Cancela cualquier timer vivo ANTES de repintar: al
// reordenar/sustituir, GM.steps cambia de índices y un descanso/hold/HIIT en curso quedaría
// apuntando a un paso movido (el HIIT es el caso real: corre dentro de la tarjeta, con los
// botones ↑↓ a la vista; los overlays de descanso/hold tapan la pantalla y no dejan reordenar
// debajo). En openGuidedMode no hay timers vivos → la limpieza es no-op segura.
function gmRebuild(){
  const routine = CUR.activeRoutine; if(!routine) return;
  if(GM.restTimer){ clearInterval(GM.restTimer); GM.restTimer = null; }
  if(GM.holding) _gmEndHoldUI();
  if(GM.hiit){ clearInterval(GM.hiit); GM.hiit = null; relWake(); }
  const _ov = document.getElementById('gm-rest-overlay'); if(_ov) _ov.classList.add('hidden');
  GM.routine = routine;
  GM.exercises = routine.exercises;
  // Orden de pasos respetando biseries (intercala A1,B1,A2,B2…). Sin biseries
  // queda idéntico al orden serie-por-serie de siempre.
  GM.steps = guidedStepOrder(GM.exercises).map(({ei, si}) => {
    const ex = GM.exercises[ei];
    return { ei, si, ex, sets: parseInt(ex.sets)||3 };
  });
  GM.currentStep = 0;
  for(let i = 0; i < GM.steps.length; i++){
    if(!isDone(routine.id, GM.steps[i].ei, GM.steps[i].si)){ GM.currentStep = i; break; }
    if(i === GM.steps.length - 1) GM.currentStep = GM.steps.length;
  }
  gmRender();
}

// ── Reordenar / sustituir desde el guiado (plan unificación P3) ──
// Reusa todayMoveEx/todaySubstitute de la clásica (copia de trabajo del día + claves de
// sesión que siguen al ejercicio + re-render clásico debajo) y reconstruye el guiado encima.
// La sustitución abre #m-picker (z-index 1000 > 700 del guiado); al elegir, _applySubstitute
// detecta el guiado abierto y llama gmRebuild.
function gmMoveEx(ei,dir){
  todayMoveEx(ei,dir);
  gmRebuild();
}

function closeGuidedMode(){
  if(GM.restTimer){ clearInterval(GM.restTimer); GM.restTimer = null; }
  if(GM.holding) _gmEndHoldUI();
  if(GM.hiit){ clearInterval(GM.hiit); GM.hiit = null; relWake(); }
  document.getElementById('gm-rest-overlay').classList.add('hidden');
  closeStartCard();
  // Embebido (F2): "Hoy" ES el guiado → NO se oculta ni se relocaliza. Solo se limpian timers;
  // la celebración de fin la muestra checkAndShowCongrats (quien llama). El body no se bloquea.
  if(_gmIsEmbedded()){ if(GM.routine) updateClientProgress(GM.routine); return; }
  document.getElementById('guided-mode').classList.add('hidden');
  document.body.style.overflow = '';
  if(GM.routine) updateClientProgress(GM.routine);
}

// Cabecera de rutina del guiado (P12): nombre + pills (nº ejercicios/series/descanso) +
// nota del coach + "por qué esta rutina" + banner si el usuario eligió una rutina distinta
// a la de hoy. Estilos sobre tokens neutros (el guiado va sobre var(--bg), no el gradiente
// verde del hero). Todo pasa por esc(). Devuelve '' si no hay rutina.
function gmRoutineHeaderHTML(){
  const r=GM.routine; if(!r) return '';
  const nEx=(r.exercises||[]).length;
  const nSets=(r.exercises||[]).reduce((s,e)=>s+(parseInt(e.sets)||0),0);
  const pill=t=>`<span style="font-size:11px;font-weight:700;color:var(--t2);background:var(--w);border:1px solid var(--br);border-radius:99px;padding:3px 9px">${t}</span>`;
  const pills=pill(nEx+' ejercicios')+pill(nSets+' series')+(r.restSec?pill('⏱ '+r.restSec+'s descanso'):'');
  const override=CUR.todayOverride?`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--bll);border:1px solid var(--bl);border-radius:var(--rsm);padding:8px 12px;margin-bottom:8px;font-size:12px;color:var(--bl)"><span>📋 Elegiste esta rutina manualmente</span></div>`:'';
  const note=r.note?`<div style="background:rgba(242,201,76,.10);border:1px solid rgba(242,201,76,.35);border-radius:var(--rsm);padding:9px 12px;font-size:12.5px;color:var(--t1);margin-bottom:8px;line-height:1.5">💡 <strong style="color:#E9C46A">Nota:</strong> ${esc(r.note)}</div>`:'';
  const why=r.why?`<div style="background:var(--gl);border-left:3px solid var(--g2);border-radius:var(--rsm);padding:9px 12px;margin-bottom:8px;font-size:12.5px;color:var(--gt);line-height:1.55"><div style="font-size:10px;font-weight:700;letter-spacing:.5px;margin-bottom:3px;opacity:.7">POR QUÉ ESTA RUTINA</div>${esc(r.why)}</div>`:'';
  return `<div class="gm-routine-head" style="margin:0 0 10px">
    ${override}
    <div style="font-size:17px;font-weight:800;color:var(--gt);margin-bottom:6px">${esc(r.name||'Tu entrenamiento')}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:${(note||why)?'9px':'0'}">${pills}</div>
    ${note}${why}
  </div>`;
}

function gmRender(){
  const body = document.getElementById('gm-body');
  body.innerHTML = '';
  gmUpdateProgress();
  // Check-in de ánimo (plan unificación P1) — paridad COMPLETA con la clásica: si aún no eligió
  // cómo se siente → chooser; si YA eligió → banner con la adaptación + "Cambiar cómo me siento"
  // (antes solo mostraba el chooser y al elegir DESAPARECÍA todo → parecía que la feature no
  // estaba; reporte de Camilo 2026-07-03). GM.routine.adapt lo trae applyMood (la rutina activa
  // ya viene adaptada desde renderClientToday). No bloquea el entreno.
  const _cli = DB.clients.find(x=>x.id===CUR.clientId);
  if(_cli && typeof applyMood==='function' && typeof MOOD_STATES!=='undefined'){
    const _mood = getTodayMood(_cli.id);
    const mc=document.createElement('div');
    if(!_mood){
      mc.innerHTML=moodChooserHtml(_cli,'gmPickMood');
    } else if(GM.routine && GM.routine.adapt && typeof moodBannerHtml==='function'){
      mc.innerHTML=moodBannerHtml(GM.routine.adapt,'gmChangeMood');
    }
    if(mc.firstElementChild) body.appendChild(mc.firstElementChild);
  }
  // Cabecera de rutina (plan unificación P12): nombre + pills + nota + por-qué + banner de
  // override. Hoy es contexto dentro del overlay; en F2 (guiado embebido como pantalla
  // principal) reemplaza al hero de la clásica. insertAdjacentHTML para no perder listeners.
  const _hdrHTML=gmRoutineHeaderHTML();
  if(_hdrHTML) body.insertAdjacentHTML('beforeend', _hdrHTML);
  // Calentamiento / movilidad-estiramiento de la sesión (paridad con la clásica): la tarjeta
  // colapsable con sus ejercicios, reps y el toggle "mostrar/ocultar" (▼) va tras la cabecera y
  // ANTES de los ejercicios. renderWarmup la pinta dentro de #wu-wrap — aquí el ÚNICO del DOM (la
  // clásica no está montada con el guiado ON). Faltaba en el guiado embebido (reporte Camilo).
  body.insertAdjacentHTML('beforeend', '<div id="wu-wrap" style="margin:2px 0 12px"></div>');
  if(typeof renderWarmup==='function') renderWarmup(GM.exercises);
  const exGroups = {};
  GM.steps.forEach((step, idx) => {
    if(!exGroups[step.ei]) exGroups[step.ei] = [];
    exGroups[step.ei].push({...step, stepIdx: idx});
  });
  Object.entries(exGroups).forEach(([eiStr, steps]) => {
    const ei = parseInt(eiStr);
    const ex = GM.exercises[ei];
    const color = MC[ex.muscle]||'#888';
    const exAllDone = steps.every(({si}) => isDone(GM.routine.id, ei, si));
    const isActiveEx = steps.some(s => s.stepIdx === GM.currentStep);
    const card = document.createElement('div');
    card.className = `gm-ex-card${exAllDone?' done':''}${isActiveEx?' active':''}`;
    card.id = `gm-ex-${ei}`;
    const hdr = document.createElement('div');
    hdr.className = 'gm-ex-header';
    // Tools (❓ + reorder) van en un grupo propio que ENVUELVE a una 2ª línea cuando la letra
    // está grande (zoom), en vez de irse fuera de pantalla — reporte Camilo 2026-07-03 (el ↑↓🔄
    // quedaba casi invisible al agrandar el texto). El nombre conserva un ancho mínimo legible.
    hdr.innerHTML = `
      <div class="gm-ex-icon" style="background:${color}18;border:1.5px solid ${color}30;overflow:hidden">${exIcon(ex)}</div>
      <div class="gm-ex-nm">
        <div class="gm-ex-name">${esc(ex.name)}</div>
        <div class="gm-ex-meta">${esc(ex.muscleLabel||ex.muscle)} · ${esc(ex.type)}</div>
      </div>
      <div class="gm-ex-tools">
        ${exAllDone?'<span style="font-size:20px">✅</span>':''}
        <button class="exinfo-btn" aria-label="Ver cómo se hace: guía y video" title="Ver cómo se hace" onclick="openExDetail('${ex.id}')">❓</button>
        <div class="cex-reorder" onclick="event.stopPropagation()">
          <button onclick="gmMoveEx(${ei},-1)" ${ei===0?'disabled':''} title="Subir" aria-label="Subir ejercicio">↑</button>
          <button onclick="gmMoveEx(${ei},1)" ${ei===GM.exercises.length-1?'disabled':''} title="Bajar" aria-label="Bajar ejercicio">↓</button>
          <button onclick="todaySubstitute(${ei})" title="Cambiar este ejercicio" aria-label="Cambiar ejercicio">🔄</button>
        </div>
      </div>`;
    card.appendChild(hdr);
    const setsEl = document.createElement('div');
    setsEl.className = 'gm-sets';
    const gmSug=_suggestKg(ex);
    if(gmSug){
      const sh=document.createElement('div');
      sh.style.cssText='font-size:11.5px;font-weight:700;color:var(--gt);margin:2px 0 4px';
      sh.textContent=`🎯 Peso sugerido: ${gmSug} kg · según tu récord`;
      setsEl.appendChild(sh);
    }
    const gmTrack = exTrack(ex);
    // Lastre (peso añadido) para peso corporal — paridad con la clásica (plan unificación P4).
    // Estado por ejercicio en lastre_<rid>_<ei> (compartido con la clásica: reusa lastreOn/
    // toggleLastre y las claves ya viajan en reorden vía _SK_EX).
    const gmLastre = gmTrack==='reps' && lastreOn(GM.routine,ei);
    if(gmTrack==='hiit'){
      gmRenderHiit(setsEl, ei, ex, steps.length);
    } else {
    // Toggle "+ Lastre (peso añadido)" para peso corporal — una vez por ejercicio, antes de las series
    if(gmTrack==='reps'){
      const tg=document.createElement('div');
      tg.className='gm-lastre-toggle';
      tg.style.cssText='text-align:right;margin:0 0 6px';
      tg.innerHTML=`<button type="button" style="font-size:11px;font-weight:600;padding:3px 9px;border-radius:99px;border:1.5px solid var(--br2);background:${gmLastre?'var(--gl)':'transparent'};color:${gmLastre?'var(--gt)':'var(--t3)'};cursor:pointer">${gmLastre?'✓ ':'+ '}Lastre (peso añadido)</button>`;
      tg.querySelector('button').onclick=()=>{toggleLastre(GM.routine,ei);gmRender();};
      setsEl.appendChild(tg);
    }
    // 🔥 Sets de calentamiento (aproximación) — solo peso: ENCABEZADO con Mostrar/Ocultar
    // (paridad con la clásica buildWarmupSection) + la fila cuando está visible. Antes el guiado
    // solo pintaba la fila si YA estaba activada, sin el botón para activarla → el usuario no
    // encontraba las series de aproximación ni el botón "mostrar" (reporte Camilo 2026-07-04).
    if(gmTrack==='peso_reps'){
      const _wShown=exWarmShown(GM.routine,ei);
      const wh=document.createElement('div');
      wh.className='gm-warm-toggle';
      wh.style.cssText='display:flex;align-items:center;justify-content:space-between;margin:2px 0 6px';
      wh.innerHTML=`<span style="font-size:11.5px;font-weight:700;color:var(--t2)">🔥 Sets de calentamiento</span>`
        +`<button type="button" style="font-size:11px;font-weight:600;padding:3px 11px;border-radius:99px;border:1.5px solid var(--br2);background:${_wShown?'var(--gl)':'transparent'};color:${_wShown?'var(--gt)':'var(--t3)'};cursor:pointer">${_wShown?'Ocultar':'Mostrar'}</button>`;
      wh.querySelector('button').onclick=()=>gmToggleExWarm(ei);
      setsEl.appendChild(wh);
      if(_wShown){
        setsEl.insertAdjacentHTML('beforeend', gmAuxRowHTML(ei,ex,WARM_SI,'warm','🔥', _warmupKg(ex), '12'));
      }
    }
    steps.forEach(({si, stepIdx}) => {
      const done = isDone(GM.routine.id, ei, si);
      const isActive = stepIdx === GM.currentStep;
      const row = document.createElement('div');
      row.className = `gm-set-row${isActive?' active-set':''}${done?' set-done':''}`;
      row.id = `gm-set-${ei}-${si}`;
      row.innerHTML = `
        <div class="gm-set-num" id="gm-snum-${ei}-${si}">${done?'✓':si+1}</div>
        ${gmSetCellsHTML(gmTrack, ex, ei, si, done, gmSug, gmLastre)}
        <button class="gm-check${done?' checked':''}" id="gm-chk-${ei}-${si}" aria-label="Marcar serie ${si+1} como hecha"
          onclick="gmToggleSet(${ei},${si},${stepIdx})">${done?'✓':'○'}</button>`;
      if(gmTrack==='tiempo'){
        const go=row.querySelector('.gm-timer-go');
        if(go) go.onclick=(e)=>{e.stopPropagation();const inp=row.querySelector('.gm-sinput[data-field="secs"]');gmHoldTimer(ei,si,parseInt(inp&&inp.value)||0);};
      }
      // Solo peso: envolver la serie para poder DESLIZARLA → dropset (igual que la tarjeta
      // clásica). El re-render del guiado es gmRender, no renderClientExList.
      if(gmTrack==='peso_reps'){
        const w=document.createElement('div');
        w.className='setrow-wrap';
        const rv=document.createElement('div');
        rv.className='drop-reveal';
        rv.textContent=dropSetOn(GM.routine,ei,si)?'🔻 Quitar dropset':'🔻 Dropset';
        w.appendChild(rv);
        w.appendChild(row);
        attachDropSwipe(row,GM.routine,ei,si,gmRender);
        setsEl.appendChild(w);
      } else {
        setsEl.appendChild(row);
      }
      // 🔻 Dropset de ESTA serie (si se activó deslizando) — bajo su serie
      if(gmTrack==='peso_reps' && dropSetOn(GM.routine,ei,si)){
        setsEl.insertAdjacentHTML('beforeend', gmAuxRowHTML(ei,ex,dropTok(si),'drop','🔻', _dropKg(GM.routine,ex,ei,si), 'fallo'));
      }
    });
    }
    card.appendChild(setsEl);
    body.appendChild(card);
  });
  // Acciones de sesión al final de la lista (paridad con la clásica, plan unificación P2):
  // finalizar con lo que lleve + reiniciar el día. Van en el cuerpo (no en el footer fijo)
  // para no crecer el footer ni tapar contenido.
  const acts=document.createElement('div');
  acts.id='gm-session-actions';
  acts.style.cssText='display:flex;gap:8px;margin:14px 2px 4px';
  acts.innerHTML=`
    <button onclick="gmResetSession()" style="flex:1;padding:11px;background:var(--bg);color:var(--t2);border:1px solid var(--br2);border-radius:12px;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">↺ Reiniciar</button>
    <button onclick="gmFinishEarly()" style="flex:2;padding:11px;background:var(--gl);color:var(--gt);border:1.5px solid var(--g2);border-radius:12px;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer">✓ Finalizar entrenamiento</button>`;
  body.appendChild(acts);
  gmUpdateActionBtn();
  gmShowExTip(); // tooltip educativo (❓ video + 💨 respiración) mientras no lo haya cerrado
}

// ── Check-in de ánimo desde el guiado (plan unificación P1) ──
// Reusa pickMood (guarda el ánimo, adapta con applyMood, avisa al coach si aplica y
// re-renderiza la clásica → CUR.activeRoutine queda ADAPTADA) y reconstruye el guiado
// encima: openGuidedMode regenera GM.steps sobre la rutina adaptada, corre
// prepareTodaySession (dropsets huérfanos si applyMood recortó series) y recalcula
// GM.currentStep con su bucle de series hechas.
function gmPickMood(mood){
  pickMood(mood);
  gmRebuild(); // sin re-lanzar la tarjeta de inicio (anotación de Lucas QA en v247)
  gmScrollTop(); // el ánimo va ARRIBA del guiado → subir al banner, NO saltar al ejercicio actual
}
// "Cambiar cómo me siento" desde el guiado: limpia el ánimo del día. Embebido → renderClientToday
// re-adapta (applyMood sin ánimo → rutina base) y re-embebe. Overlay → gmRebuild con la copia
// actual y muestra el chooser; al re-elegir, gmPickMood→pickMood re-adapta la rutina.
function gmChangeMood(){
  const c=DB.clients.find(x=>x.id===CUR.clientId);if(!c)return;
  clearTodayMood(c.id);
  if(_gmIsEmbedded()){ renderClientToday(c,CUR.todayOverride); gmScrollTop(); return; }
  gmRebuild();
  gmScrollTop();
}

// ── Finalizar/Reiniciar desde el guiado (plan unificación P2) ──
// Reusan las funciones de la clásica (mismo guardado de historial/PRs y mismo reset de
// claves); aquí solo se re-sincroniza el estado GM y sus overlays/timers.
function gmFinishEarly(){
  if(!finishSessionEarly()) return; // no guardó (0 series o canceló el confirm)
  closeGuidedMode();
}
function gmResetSession(){
  if(!resetSession()) return; // canceló el confirm (o no hay rutina)
  if(GM.restTimer){ clearInterval(GM.restTimer); GM.restTimer=null; }
  if(GM.holding) _gmEndHoldUI();
  if(GM.hiit){ clearInterval(GM.hiit); GM.hiit=null; relWake(); }
  document.getElementById('gm-rest-overlay').classList.add('hidden');
  closeStartCard();
  GM.currentStep=0;
  gmUpdateProgress();
  gmRender();
  gmScrollToCurrent();
}

// Mostrar/ocultar los "Sets de calentamiento" (aproximación) de UN ejercicio desde el guiado.
// Comparte la clave wshow_<rid>_<ei> y exWarmShown con la clásica; re-renderiza el guiado (la
// clásica usa toggleExWarm→renderClientExList). Añadido tras el reporte de Camilo (guiado default).
function gmToggleExWarm(ei){
  if(!GM.routine) return;
  localStorage.setItem(`wshow_${GM.routine.id}_${ei}`, exWarmShown(GM.routine,ei)?'0':'1');
  gmRender();
}

// Fila auxiliar del guiado (calentamiento/dropset): NO entra en GM.steps ni dispara
// descanso. El usuario la marca manualmente; no toca volumen/récords (token w0/d0).
function gmAuxRowHTML(ei,ex,tok,kind,num,sug,repsPh){
  const done=isDone(GM.routine.id,ei,tok);
  const g=f=>getLog(GM.routine.id,ei,tok,f);
  const ro=done?'readonly':'';
  const rid=`gm-aux-${ei}-${tok}`, cid=`gm-auxchk-${ei}-${tok}`;
  return `<div class="gm-set-row gm-${kind}${done?' set-done':''}" id="${rid}">
    <div class="gm-set-num ${kind}">${num}</div>
    <div><input class="gm-sinput" data-field="kg" inputmode="decimal" type="number" step="0.5" min="0" placeholder="${sug?('~'+sug):'kg'}" value="${g('kg')}" ${ro} oninput="setLog('${GM.routine.id}',${ei},'${tok}','kg',this.value)"><div class="gm-sinput-label">${kind==='warm'?'KG · CALENT.':'KG · DROP'}</div></div>
    <div><input class="gm-sinput" data-field="reps" inputmode="numeric" type="number" min="1" placeholder="${repsPh}" value="${g('reps')}" ${ro} oninput="setLog('${GM.routine.id}',${ei},'${tok}','reps',this.value)"><div class="gm-sinput-label">REPS</div></div>
    <button class="gm-check ${kind}${done?' checked':''}" id="${cid}" aria-label="Marcar ${kind==='warm'?'calentamiento':'dropset'} como hecho" onclick="gmToggleAux(${ei},'${tok}','${rid}','${cid}')">${done?'✓':'○'}</button>
  </div>`;
}
// Marca/desmarca una fila auxiliar (calentamiento/dropset) sin avanzar el paso activo
// ni lanzar el cronómetro de descanso.
function gmToggleAux(ei,tok,rid,cid){
  const done=isDone(GM.routine.id,ei,tok);
  const row=document.getElementById(rid), chk=document.getElementById(cid);
  const inps=row?row.querySelectorAll('.gm-sinput[data-field]'):[];
  if(!done){
    inps.forEach(inp=>setLog(GM.routine.id,ei,tok,inp.dataset.field,inp.value));
    setDone(GM.routine.id,ei,tok,true);
    if(navigator.vibrate)navigator.vibrate(30);
    if(row)row.classList.add('set-done');
    if(chk){chk.classList.add('checked');chk.textContent='✓';}
    inps.forEach(inp=>inp.readOnly=true);
    toast(tok===WARM_SI?'🔥 Calentamiento listo':'🔻 Dropset al fallo, ¡bien!');
  } else {
    setDone(GM.routine.id,ei,tok,false);
    if(row)row.classList.remove('set-done');
    if(chk){chk.classList.remove('checked');chk.textContent='○';}
    inps.forEach(inp=>inp.readOnly=false);
  }
}

// Celdas de input del modo guiado SEGÚN la modalidad (espeja el flujo clásico):
// peso_reps → KG+REPS · reps → REPS · tiempo → SEG+▶crono · cardio → MIN+KM.
function gmSetCellsHTML(track, ex, ei, si, done, gmSug, lastre){
  const ro=done?'readonly':'';
  const g=f=>getLog(GM.routine.id,ei,si,f);
  const cell=(f,attrs,ph,val,label,span)=>`<div${span?' style="grid-column:2/4"':''}>
    <input class="gm-sinput" data-field="${f}" inputmode="${(f==='kg'||f==='dist')?'decimal':'numeric'}" ${attrs} placeholder="${ph}" value="${val}" ${ro}
      oninput="setLog('${GM.routine.id}',${ei},${si},'${f}',this.value)">
    <div class="gm-sinput-label">${label}</div></div>`;
  // Peso corporal con lastre activo: celda KG (peso añadido) + REPS, igual que la clásica
  // (mismo campo 'kg' → entra al volumen). Sin lastre: solo REPS a lo ancho.
  if(track==='reps'&&lastre) return cell('kg','type="number" step="0.5" min="0"','lastre',g('kg'),'LASTRE',false)+cell('reps','type="number" min="1"',ex.reps,g('reps')||ex.reps,'REPS',false);
  if(track==='reps') return cell('reps','type="number" min="1"',ex.reps,g('reps')||ex.reps,'REPS',true);
  if(track==='tiempo') return cell('secs','type="number" min="0"',holdSecsOf(ex),g('secs')||holdSecsOf(ex),'SEG',false)
    +`<div><button type="button" class="gm-timer-go" aria-label="Iniciar cronómetro de la serie" style="width:100%;padding:8px;border:1.5px solid var(--g2);border-radius:8px;background:transparent;color:var(--g2);cursor:pointer;font-size:16px;font-weight:700">▶</button><div class="gm-sinput-label">CRONO</div></div>`;
  if(track==='cardio') return cell('min','type="number" min="0"','min',g('min')||ex.reps,'MIN',false)+cell('dist','type="number" min="0" step="0.1"','km',g('dist'),'KM',false);
  return cell('kg','type="number" step="0.5" min="0"',ex.defaultKg||(gmSug?'~'+gmSug:'kg'),g('kg'),'KG',false)+cell('reps','type="number" min="1"',ex.reps,g('reps')||ex.reps,'REPS',false);
}

// Registra los inputs (cualquier modalidad) de una serie del guiado y los bloquea.
function gmLogRow(ei, si){
  const ex=GM.exercises[ei];
  const row=document.getElementById(`gm-set-${ei}-${si}`);
  if(!row) return;
  const inps=row.querySelectorAll('.gm-sinput[data-field]');
  inps.forEach(inp=>{
    let v=inp.value;
    if(inp.dataset.field==='reps' && !v) v=ex.reps; // reps vacío → el objetivo de la rutina
    setLog(GM.routine.id, ei, si, inp.dataset.field, v);
    inp.readOnly=true;
  });
}

// Cronómetro de isométrico en el guiado: cuenta regresiva en el overlay y, al
// terminar, marca la serie (clic en el check) → registra los segundos y avanza.
// El overlay pasa a ÁMBAR (clase gm-hold) y el botón de abajo dice "⏹ Cancelar":
// mientras aguantas NO es un descanso y cancelar no marca nada (reporte 2026-07-02).
function _gmEndHoldUI(){
  GM.holding=null;
  const overlay=document.getElementById('gm-rest-overlay');
  if(!overlay)return;
  overlay.classList.remove('gm-hold');
  const sk=overlay.querySelector('.gm-rest-skip'); if(sk)sk.textContent='⏩ Saltar descanso';
}
function gmHoldTimer(ei, si, secs){
  if(!secs || secs<1){ toast('⏱ Pon los segundos a aguantar y vuelve a tocar ▶'); return; }
  if(GM.restTimer){ clearInterval(GM.restTimer); GM.restTimer=null; }
  reqWake();
  GM.holding={ei,si};
  const overlay=document.getElementById('gm-rest-overlay');
  const secEl=document.getElementById('gm-rest-sec');
  const arc=document.getElementById('gm-rest-arc');
  const titleEl=document.getElementById('gm-rest-title');
  const lblEl=overlay.querySelector('.gm-rest-lbl');
  const nextEl=document.getElementById('gm-rest-next');
  const breEl=document.getElementById('gm-rest-breath');
  if(breEl) breEl.style.display='none';
  if(nextEl) nextEl.textContent='';
  if(titleEl) titleEl.textContent='💪 ¡Aguanta la posición!';
  if(lblEl) lblEl.textContent='segundos · se marca sola al llegar a 0';
  overlay.classList.add('gm-hold');
  const sk=overlay.querySelector('.gm-rest-skip'); if(sk)sk.textContent='⏹ Cancelar — no marcar la serie';
  const C=439.8;
  overlay.classList.remove('hidden','gm-rest-paused'); GM.restPaused=false;
  secEl.textContent=secs;
  arc.style.transition='none'; arc.style.strokeDashoffset='0';
  setTimeout(()=>{ arc.style.transition='stroke-dashoffset 1s linear'; },50);
  const endAt=Date.now()+secs*1000; // conteo por timestamp absoluto (robusto a iOS bloqueado)
  let left=secs;
  GM.restTimer=setInterval(()=>{
    left=Math.max(0,Math.round((endAt-Date.now())/1000));
    secEl.textContent=left; secEl.classList.remove('tick'); void secEl.offsetWidth; secEl.classList.add('tick');
    arc.style.strokeDashoffset=C*((secs-left)/secs);
    if(left>0&&left<=5) playRestTick();
    if(left<=0){
      clearInterval(GM.restTimer); GM.restTimer=null;
      _gmEndHoldUI();
      overlay.classList.add('hidden'); relWake(); playRestEndBeep();
      const chk=document.getElementById(`gm-chk-${ei}-${si}`);
      if(chk && !chk.classList.contains('checked')) chk.click();
    }
  },1000);
}

// Tarjeta de intervalos HIIT dentro del modo guiado (trabajo/descanso × rondas).
// IDs propios `gm-hiit-*` para NO chocar con la tarjeta HIIT del flujo clásico que
// vive detrás del overlay (ambas con el mismo ei → getElementById tomaba la oculta).
function gmRenderHiit(setsEl, ei, ex, sets){
  const cfg=hiitCfg(ex);
  const done=Array.from({length:sets},(_,si)=>isDone(GM.routine.id,ei,si)).filter(Boolean).length;
  const card=document.createElement('div');
  card.style.cssText='padding:16px;text-align:center;background:var(--bg);border-radius:12px';
  card.innerHTML=`
    <div style="font-size:12px;color:var(--t2);margin-bottom:10px;font-family:'JetBrains Mono',monospace">${cfg.work}s 🔥 · ${cfg.rest}s 😮‍💨 · ${sets} rondas</div>
    <div id="gm-hiit-disp-${ei}" style="font-size:46px;font-weight:800;font-family:'JetBrains Mono',monospace;line-height:1">${done>=sets?'✓':cfg.work}</div>
    <div id="gm-hiit-phase-${ei}" style="font-size:14px;font-weight:700;margin:4px 0;color:var(--t3)">${done>=sets?'¡Completado!':'Listo para empezar'}</div>
    <div id="gm-hiit-rounds-${ei}" style="font-size:12px;color:var(--t2);margin-bottom:12px">Ronda ${Math.min(done+1,sets)} de ${sets}</div>
    <button class="btn bp" id="gm-hiit-btn-${ei}" style="width:100%">${done>=sets?'▶ Reiniciar':'▶ Iniciar HIIT'}</button>`;
  setsEl.appendChild(card);
  card.querySelector(`#gm-hiit-btn-${ei}`).onclick=()=>gmStartHiit(ei,sets,cfg.work,cfg.rest);
}
function gmStartHiit(ei, rounds, work, rest){
  if(GM.hiit){ clearInterval(GM.hiit); GM.hiit=null; }
  for(let s=0;s<rounds;s++) setDone(GM.routine.id,ei,s,false);
  reqWake();
  const disp=document.getElementById(`gm-hiit-disp-${ei}`);
  const phaseEl=document.getElementById(`gm-hiit-phase-${ei}`);
  const roundsEl=document.getElementById(`gm-hiit-rounds-${ei}`);
  const btn=document.getElementById(`gm-hiit-btn-${ei}`);
  if(!disp) return;
  if(btn){ btn.textContent='⏹ Detener'; btn.onclick=()=>gmStopHiit(); }
  let round=0, phase='work', left=work;
  let phaseEnd=Date.now()+work*1000; // fin de la fase actual por timestamp (robusto a iOS bloqueado)
  const paint=()=>{
    disp.textContent=String(left).padStart(2,'0');
    phaseEl.textContent=phase==='work'?'🔥 TRABAJO':'😮‍💨 DESCANSO';
    phaseEl.style.color=phase==='work'?'var(--rd)':'var(--g2)';
    roundsEl.textContent=`Ronda ${Math.min(round+1,rounds)} de ${rounds}`;
  };
  paint(); playRestTick();
  gmUpdateProgress(); updateClientProgress(GM.routine);
  GM.hiit=setInterval(()=>{
    left=Math.max(0,Math.round((phaseEnd-Date.now())/1000));
    if(left>0&&left<=3) playRestTick();
    if(left<=0){
      if(phase==='work'){
        setDone(GM.routine.id,ei,round,true); round++;
        gmUpdateProgress(); updateClientProgress(GM.routine);
        if(round>=rounds){
          disp.textContent='✓'; phaseEl.textContent='¡Completado!'; phaseEl.style.color='var(--g)';
          roundsEl.textContent=`${rounds}/${rounds} rondas`;
          clearInterval(GM.hiit); GM.hiit=null; relWake(); playRestEndBeep();
          gmAfterHiit(ei); return;
        }
        phase='rest'; left=rest; phaseEnd=Date.now()+rest*1000; playRestEndBeep();
      } else { phase='work'; left=work; phaseEnd=Date.now()+work*1000; playRestEndBeep(); }
    }
    paint();
  },1000);
}
function gmStopHiit(){
  if(GM.hiit){ clearInterval(GM.hiit); GM.hiit=null; }
  relWake();
  gmRender(); // vuelve la tarjeta al estado actual
}
// Tras completar un HIIT en el guiado: sincroniza progreso, avanza y refresca.
function gmAfterHiit(ei){
  if(document.getElementById('guided-mode').classList.contains('hidden')) return;
  gmUpdateProgress(); updateClientProgress(GM.routine);
  let next=GM.currentStep;
  while(next<GM.steps.length && isDone(GM.routine.id, GM.steps[next].ei, GM.steps[next].si)) next++;
  GM.currentStep=next;
  gmRender();
  if(GM.currentStep>=GM.steps.length){ setTimeout(()=>{ closeGuidedMode(); checkAndShowCongrats(GM.routine); }, 500); }
  else { _gmDeferScrollToCurrent(100); }
}

function gmUpdateProgress(){
  const total = GM.steps.length;
  const done = GM.steps.filter(({ei,si}) => isDone(GM.routine.id,ei,si)).length;
  const pct = total ? Math.round(done/total*100) : 0;
  const fill = document.getElementById('gm-prog-fill');
  const pctEl = document.getElementById('gm-prog-pct');
  const lbl = document.getElementById('gm-prog-label');
  if(fill) fill.style.width = pct+'%';
  if(pctEl) pctEl.textContent = pct+'%';
  if(lbl){
    const cur = GM.steps[GM.currentStep];
    lbl.textContent = cur ? `${esc(cur.ex.name)} · Serie ${cur.si+1}/${cur.sets}` : '¡Completado!';
  }
}

function gmUpdateActionBtn(){
  const btn = document.getElementById('gm-action-btn');
  if(!btn) return;
  btn.style.display='';
  if(GM.currentStep >= GM.steps.length){
    // Embebido: "Cerrar entrenamiento" no aplica (es la pantalla de Hoy) → ocultar el botón;
    // las tarjetas en verde + la celebración de fin ya comunican que terminó.
    if(_gmIsEmbedded()){ btn.style.display='none'; return; }
    btn.textContent = '🏆 ¡Listo! Cerrar entrenamiento';
    btn.onclick = () => closeGuidedMode();
    return;
  }
  const {ex, si, sets} = GM.steps[GM.currentStep];
  if(exTrack(ex)==='hiit'){
    btn.textContent = `▶ Inicia el HIIT — ${esc(ex.name)}`;
    btn.onclick = () => { gmScrollToCurrent(); const b=document.getElementById(`gm-hiit-btn-${GM.steps[GM.currentStep].ei}`); if(b) b.click(); };
    return;
  }
  btn.textContent = `✓ Completar serie ${si+1}/${sets} — ${esc(ex.name)}`;
  btn.onclick = () => gmActionBtn();
}

function gmActionBtn(){
  if(GM.currentStep >= GM.steps.length){ closeGuidedMode(); return; }
  const {ei, si, ex} = GM.steps[GM.currentStep];
  if(exTrack(ex)==='hiit'){ toast('▶ Inicia el HIIT con el botón de su tarjeta'); return; } // el HIIT lo maneja su tarjeta de intervalos
  gmLogRow(ei, si); // registra los inputs de la modalidad (kg/reps, reps, secs, min/km)
  setDone(GM.routine.id, ei, si, true);
  if(navigator.vibrate)navigator.vibrate(40);
  const row = document.getElementById(`gm-set-${ei}-${si}`);
  const chk = document.getElementById(`gm-chk-${ei}-${si}`);
  const num = document.getElementById(`gm-snum-${ei}-${si}`);
  if(row){ row.classList.remove('active-set'); row.classList.add('set-done'); }
  if(chk){ chk.classList.add('checked'); chk.textContent='✓'; }
  if(num) num.textContent='✓';
  const sets2 = parseInt(ex.sets)||3;
  const exDone = Array.from({length:sets2},(_,s)=>isDone(GM.routine.id,ei,s)).every(Boolean);
  if(exDone){ const c=document.getElementById(`gm-ex-${ei}`);if(c){c.classList.add('done');c.classList.remove('active');}}
  let next = GM.currentStep + 1;
  while(next < GM.steps.length && isDone(GM.routine.id, GM.steps[next].ei, GM.steps[next].si)) next++;
  GM.currentStep = next;
  gmUpdateProgress();
  updateClientProgress(GM.routine);
  if(GM.currentStep >= GM.steps.length){
    gmUpdateActionBtn();
    setTimeout(() => { closeGuidedMode(); checkAndShowCongrats(GM.routine); }, 400);
    return;
  }
  const nextStep = GM.steps[GM.currentStep];
  gmRest(ei, si, nextStep);
  setTimeout(() => {
    const nr = document.getElementById(`gm-set-${nextStep.ei}-${nextStep.si}`);
    const nc = document.getElementById(`gm-ex-${nextStep.ei}`);
    if(nr) nr.classList.add('active-set');
    if(nc) nc.classList.add('active');
    gmScrollToCurrent();
    gmUpdateActionBtn();
  }, 100);
}

function gmToggleSet(ei, si, stepIdx){
  const done = isDone(GM.routine.id, ei, si);
  const row=document.getElementById(`gm-set-${ei}-${si}`);
  const chk=document.getElementById(`gm-chk-${ei}-${si}`);
  const num=document.getElementById(`gm-snum-${ei}-${si}`);
  const ex=GM.exercises[ei];
  if(!done){
    gmLogRow(ei,si); // registra los inputs de la modalidad y los bloquea
    setDone(GM.routine.id,ei,si,true);
    if(row){row.classList.add('set-done');row.classList.remove('active-set');}
    if(chk){chk.classList.add('checked');chk.textContent='✓';}
    if(num) num.textContent='✓';
    // Avanzar paso actual y mostrar descanso si era el paso activo
    if(stepIdx === GM.currentStep){
      const sets2=parseInt(ex.sets)||3;
      const exDone=Array.from({length:sets2},(_,s)=>isDone(GM.routine.id,ei,s)).every(Boolean);
      if(exDone){const c=document.getElementById(`gm-ex-${ei}`);if(c){c.classList.add('done');c.classList.remove('active');}}
      let next=GM.currentStep+1;
      while(next<GM.steps.length&&isDone(GM.routine.id,GM.steps[next].ei,GM.steps[next].si))next++;
      GM.currentStep=next;
      if(GM.currentStep>=GM.steps.length){
        gmUpdateProgress();updateClientProgress(GM.routine);gmUpdateActionBtn();
        setTimeout(()=>{closeGuidedMode();checkAndShowCongrats(GM.routine);},400);
        return;
      }
      const nextStep=GM.steps[GM.currentStep];
      gmRest(ei, si, nextStep);
      setTimeout(()=>{
        const nr=document.getElementById(`gm-set-${nextStep.ei}-${nextStep.si}`);
        const nc=document.getElementById(`gm-ex-${nextStep.ei}`);
        if(nr)nr.classList.add('active-set');
        if(nc)nc.classList.add('active');
        gmScrollToCurrent();gmUpdateActionBtn();
      },100);
    }
  } else {
    setDone(GM.routine.id,ei,si,false);
    if(row) row.classList.remove('set-done');
    if(chk){chk.classList.remove('checked');chk.textContent='○';}
    if(num) num.textContent=si+1;
    if(row) row.querySelectorAll('.gm-sinput[data-field]').forEach(inp=>inp.readOnly=false);
  }
  gmUpdateProgress();
  updateClientProgress(GM.routine);
  gmUpdateActionBtn();
}

// ══════════ RESPIRACIÓN (recordatorios durante el entreno) ══════════
// Cue específico para los grandes compuestos (brace/Valsalva); para el resto, un
// default inteligente por TIPO. {s:corto (descanso), l:largo (tarjeta de inicio)}.
// Pedido de Camilo 2026-06-09 — va en el modo guiado (no en la ficha) para que se vea.
const EX_BREATH={
  e13:{s:'Toma aire arriba y aprieta el core; sostenlo al bajar y suéltalo al subir.',l:'Llena el pecho de aire y aprieta el abdomen ANTES de bajar (como si fueras a recibir un golpe). Mantén el aire mientras bajas y suéltalo con fuerza al subir. Ese core firme transfiere la fuerza de las piernas a todo el cuerpo y protege tu espalda.'},
  e70:{s:'Aire y core firme antes de bajar; suelta al subir.',l:'Toma aire y aprieta el abdomen antes de bajar; sostenlo en la bajada y exhala al subir. El core firme estabiliza la columna en cada repetición.'},
  e34:{s:'Llena el aire y aprieta el abdomen ANTES de jalar; exhala arriba.',l:'De pie sobre la barra, llena el aire y aprieta fuerte el abdomen ANTES de jalar. Mantén ese bloque de aire durante toda la subida y exhala solo arriba. Nunca sueltes el aire a mitad del esfuerzo: ahí es donde el core protege la zona lumbar.'},
  e14:{s:'Aire y core antes de bajar; exhala al subir.',l:'Toma aire y aprieta el abdomen antes de empujar la cadera hacia atrás. Mantén el aire mientras bajas sintiendo el femoral y exhala al volver arriba. Espalda siempre recta.'},
  e1:{s:'Inhala al bajar la barra · exhala empujando.',l:'Inhala mientras bajas la barra al pecho con control, aprieta el core y los omóplatos contra el banco, y exhala con fuerza mientras empujas hacia arriba.'},
  e7:{s:'Core firme · exhala al empujar arriba.',l:'Aprieta glúteos y abdomen para no arquear la espalda. Toma aire abajo y exhala al empujar la barra por encima de la cabeza. El core firme evita que la zona lumbar compense.'},
  e22:{s:'Core firme · exhala al subir las mancuernas.',l:'Mantén el abdomen apretado para no arquear la espalda. Inhala abajo y exhala al subir las mancuernas. No aguantes el aire entre repeticiones.'},
  e42:{s:'Exhala empujando la cadera arriba · inhala al bajar.',l:'Toma aire abajo, exhala mientras empujas la cadera hacia arriba apretando el glúteo al tope, e inhala al bajar con control. Costillas abajo, sin arquear la zona lumbar.'},
};
// Reutilizar los cues finos en variantes del mismo patrón
EX_BREATH.e33=EX_BREATH.e58=EX_BREATH.e80=EX_BREATH.e13; // sentadillas
EX_BREATH.e46=EX_BREATH.e50=EX_BREATH.e14;               // bisagra de cadera
EX_BREATH.e43=EX_BREATH.e42;                              // hip thrust
function breathCue(ex){
  if(!ex) return null;
  if(EX_BREATH[ex.id]) return EX_BREATH[ex.id];
  switch(ex.type){
    case 'Compuesto':   return {s:'Aprieta el core y exhala en el esfuerzo.',l:'Toma aire y aprieta el abdomen antes de empezar el movimiento; exhala en la parte de más esfuerzo (cuando empujas o levantas). No aguantes el aire serie tras serie.'};
    case 'Aislamiento': return {s:'Exhala al contraer · inhala al volver.',l:'Exhala cuando haces fuerza (al contraer el músculo) e inhala al volver a la posición inicial. Mantén un ritmo constante, sin contener el aire.'};
    case 'Cardio':      return {s:'Respira rítmico · no aguantes el aire.',l:'Respira de forma rítmica y constante; no contengas el aire. Si te falta el aire, baja el ritmo hasta recuperarte.'};
    case 'HIIT':        return {s:'Respira parejo · recupera en las pausas.',l:'Mantén una respiración rítmica durante el esfuerzo y aprovecha las pausas para respirar profundo y recuperar.'};
    case 'Isométrico':  return {s:'Sigue respirando · NO aguantes el aire.',l:'No contengas la respiración: sigue respirando lento y controlado mientras sostienes la posición.'};
    default:            return {s:'Exhala en el esfuerzo · core activo.',l:'Exhala cuando haces fuerza e inhala al volver. Mantén el core activo durante todo el movimiento y no aguantes el aire.'};
  }
}
// Tarjeta breve al INICIAR un ejercicio: cómo respirar aquí (cue largo).
function gmShowStartCard(ex){
  if(!ex) return; const bc=breathCue(ex); if(!bc) return;
  const old=document.getElementById('gm-start-card'); if(old) old.remove();
  const el=document.createElement('div');
  el.id='gm-start-card'; el.className='gm-start-card';
  el.addEventListener('click',e=>{ if(e.target===el) closeStartCard(); });
  el.innerHTML='<div class="gsc-card">'
    +'<div class="gsc-ex">'+esc(ex.name)+'</div>'
    +'<div class="gsc-h">💨 Cómo respirar aquí</div>'
    +'<div class="gsc-b">'+glossarize(bc.l)+'</div>'
    +'<button class="gsc-btn" onclick="closeStartCard()">Empezar</button>'
    +'</div>';
  document.body.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('on'));
}
function closeStartCard(){ const el=document.getElementById('gm-start-card'); if(el){ el.classList.remove('on'); setTimeout(()=>{ if(el&&!el.classList.contains('on')) el.remove(); },300); } }

// Plan de descanso tras completar la serie (ei,si). En biserie: si acabas el
// PRIMER ejercicio (rol A) y a la pareja le falta esa ronda → transición SIN
// descanso (pasas al otro ya). Al cerrar la pareja → descanso = el mayor de los dos.
function gmRestPlan(ei, si){
  const info = bisetInfo(GM.exercises, ei);
  if(info.biset && info.role==='a'){
    const pSets = parseInt(GM.exercises[info.partner].sets)||3;
    // Transición sin descanso solo si a la pareja le falta ESTA ronda (si toggleó
    // fuera de orden y ya la hizo, mejor un descanso normal).
    if(si < pSets && !isDone(GM.routine.id, info.partner, si)) return { transition:true, partner: GM.exercises[info.partner] };
  }
  let sec = restForExercise(GM.exercises[ei], GM.routine);
  if(info.biset) sec = Math.max(sec, restForExercise(GM.exercises[info.partner], GM.routine));
  return { transition:false, sec };
}
// Lanza el descanso/transición correcto según el plan de biserie.
function gmRest(ei, si, nextStep){
  // Isométricos (tiempo): el descanso lo decide la persona; no lanzamos overlay (igual que el clásico).
  if(exTrack(GM.exercises[ei])==='tiempo') return;
  const plan = gmRestPlan(ei, si);
  if(plan.transition){
    gmShowRest(BISET_TRANSITION_SEC, nextStep, { title:'🔗 Biserie — ¡sin pausa!', label:'cambia de ejercicio', biset:true });
  } else {
    gmShowRest(plan.sec, nextStep);
  }
}
const BISET_TRANSITION_SEC = 12; // respiro mínimo para cambiar de estación en una biserie
function gmShowRest(secs, nextStep, opts){
  opts=opts||{};
  _gmEndHoldUI(); // por si el overlay venía de un isométrico (clase/label de "aguanta")
  const overlay=document.getElementById('gm-rest-overlay');
  const secEl=document.getElementById('gm-rest-sec');
  const arc=document.getElementById('gm-rest-arc');
  const nextEl=document.getElementById('gm-rest-next');
  const titleEl=document.getElementById('gm-rest-title');
  const lblEl=overlay.querySelector('.gm-rest-lbl');
  if(titleEl) titleEl.textContent = opts.title || '¡Serie completada! 💪';
  if(lblEl) lblEl.textContent = opts.label || 'descanso';
  const C=439.8;
  overlay.classList.remove('hidden','gm-rest-paused');
  secEl.textContent=secs;
  arc.style.transition='none';
  arc.style.strokeDashoffset='0';
  if(nextStep) nextEl.textContent=`Siguiente: ${esc(nextStep.ex.name)} — Serie ${nextStep.si+1}/${nextStep.sets}`;
  const breEl=document.getElementById('gm-rest-breath');
  if(breEl){ const bc=nextStep&&breathCue(nextStep.ex); breEl.textContent=bc?('💨 '+bc.s):''; breEl.style.display=bc?'block':'none'; }
  if(GM.restTimer) clearInterval(GM.restTimer);
  // Reset del estado de pausa/+15s y del botón de pausa (el overlay se reusa entre descansos).
  GM.restPaused=false;GM.restTotal=secs;GM.restEndAt=Date.now()+secs*1000;
  const pbtn=document.getElementById('gm-rest-pause');if(pbtn){pbtn.textContent='⏸ Pausar';pbtn.setAttribute('aria-label','Pausar descanso');}
  // Conteo por timestamp ABSOLUTO (no por ticks): iOS congela los setInterval con la
  // pantalla bloqueada; al volver, el reloj Date.now() ya avanzó y el siguiente tick
  // recalcula y cierra el descanso. Ver [[feedback_avi_timers_ios]] / auditoría 2026-06-21.
  let left=secs;
  setTimeout(()=>{ arc.style.transition='stroke-dashoffset 1s linear'; },50);
  GM.restTimer=setInterval(()=>{
    if(GM.restPaused)return;
    left=Math.max(0,Math.round((GM.restEndAt-Date.now())/1000));
    secEl.textContent=left;secEl.classList.remove('tick');void secEl.offsetWidth;secEl.classList.add('tick');
    arc.style.strokeDashoffset=C*((GM.restTotal-left)/GM.restTotal);
    if(left>0&&left<=5)playRestTick();
    if(left<=0){
      clearInterval(GM.restTimer);GM.restTimer=null;
      overlay.classList.remove('gm-rest-paused');
      overlay.classList.add('hidden');
      playRestEndBeep();
      a11ySay('Descanso terminado. Empieza la siguiente serie.');
      // Ejercicio NUEVO (primera serie) → tarjeta de respiración; misma serie → flash "¡VAMOS!"
      if(nextStep && nextStep.si===0) gmShowStartCard(nextStep.ex);
      else gmShowGoFlash();
      if(nextStep){ setTimeout(()=>{ const _r=document.getElementById(`gm-set-${nextStep.ei}-${nextStep.si}`);const inp=_r&&_r.querySelector('.gm-sinput[data-field]');if(inp)inp.focus();},600); }
    }
  },1000);
}

// Pausar / reanudar el descanso del guiado. No aplica al isométrico "aguanta" (GM.holding).
function gmRestPause(){
  if(GM.holding||!GM.restTimer)return;
  const overlay=document.getElementById('gm-rest-overlay');
  const btn=document.getElementById('gm-rest-pause');
  const arc=document.getElementById('gm-rest-arc');
  if(GM.restPaused){
    GM.restPaused=false;GM.restEndAt=Date.now()+GM.restFrozen*1000;
    overlay.classList.remove('gm-rest-paused');
    if(arc)arc.style.transition='stroke-dashoffset 1s linear';
    if(btn){btn.textContent='⏸ Pausar';btn.setAttribute('aria-label','Pausar descanso');}
    a11ySay('Descanso reanudado');
  }else{
    GM.restPaused=true;GM.restFrozen=Math.max(0,Math.round((GM.restEndAt-Date.now())/1000));
    overlay.classList.add('gm-rest-paused');
    if(arc)arc.style.transition='none'; // congela el arco donde está
    if(btn){btn.textContent='▶ Reanudar';btn.setAttribute('aria-label','Reanudar descanso');}
    a11ySay('Descanso en pausa');
  }
}
// Suma 15s al descanso del guiado (aumenta también el total para que el arco no salte feo).
function gmRestAdd15(){
  if(GM.holding||!GM.restTimer)return;
  GM.restTotal=(GM.restTotal||0)+15;
  const secEl=document.getElementById('gm-rest-sec');
  if(GM.restPaused){GM.restFrozen=(GM.restFrozen||0)+15;if(secEl)secEl.textContent=GM.restFrozen;}
  else{GM.restEndAt+=15000;if(secEl)secEl.textContent=Math.max(0,Math.round((GM.restEndAt-Date.now())/1000));}
  a11ySay('15 segundos añadidos');toast('⏱ +15 segundos');
}
function gmSkipRest(){
  if(GM.restTimer){clearInterval(GM.restTimer);GM.restTimer=null;}
  GM.restPaused=false;
  const _ov=document.getElementById('gm-rest-overlay');
  _ov.classList.remove('gm-rest-paused');
  _ov.classList.add('hidden');
  if(GM.holding){ // cancelar el crono isométrico: NO marca la serie ni lanza "siguiente"
    _gmEndHoldUI(); relWake();
    toast('⏹ Cronómetro cancelado — la serie no se marcó');
    return;
  }
  const next=GM.steps[GM.currentStep];
  if(next && next.si===0) gmShowStartCard(next.ex);
  if(next){ setTimeout(()=>{const _r=document.getElementById(`gm-set-${next.ei}-${next.si}`);const inp=_r&&_r.querySelector('.gm-sinput[data-field]');if(inp)inp.focus();},200); }
}

function gmShowGoFlash(){
  const el=document.createElement('div');
  el.className='gm-go-flash';
  el.innerHTML='<div style="font-size:64px;font-weight:900;color:white;letter-spacing:-2px">¡VAMOS!</div><div style="font-size:16px;color:rgba(255,255,255,.8);margin-top:8px;font-weight:600">Siguiente serie lista</div>';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),950);
}

function gmScrollToCurrent(){
  const step=GM.steps[GM.currentStep];if(!step)return;
  const card=document.getElementById(`gm-ex-${step.ei}`);
  if(card) card.scrollIntoView({behavior:'smooth',block:'center'});
}
// El scroll-a-current se difiere (tras el render) y se RASTREA en un solo handle para poder
// cancelarlo: al re-embeber (openGuidedEmbedded) se programa uno, y una acción de ánimo que
// quiere quedarse ARRIBA debía poder anularlo (si no, saltaba al ejercicio 120ms después —
// reporte Camilo 2026-07-03, sc=155).
let _gmScrollT=null;
function _gmDeferScrollToCurrent(ms){ if(_gmScrollT)clearTimeout(_gmScrollT); _gmScrollT=setTimeout(()=>{_gmScrollT=null;gmScrollToCurrent();},ms); }
// Sube al tope del guiado. Embebido: el scroll real vive en .cnbody (NO en #cn-today, que es un
// .cnp sin overflow → la clásica hace today.scrollTop=0 pero es no-op inofensivo). Overlay: el
// scroll propio es #gm-body. Lo usan las acciones de ánimo (chooser/banner van arriba) para NO
// saltar la pantalla al ejercicio actual; cancela cualquier scroll-a-current diferido pendiente.
function gmScrollTop(){
  if(_gmScrollT){ clearTimeout(_gmScrollT); _gmScrollT=null; }
  if(_gmIsEmbedded()){ const b=document.querySelector('#s-client .cnbody'); if(b) b.scrollTop=0; }
  else { const b=document.getElementById('gm-body'); if(b) b.scrollTop=0; }
}

function checkAndShowCongrats(routine){
  const total=(routine.exercises||[]).reduce((s,e)=>s+(parseInt(e.sets)||0),0);
  let done=0,totalVol=0;
  (routine.exercises||[]).forEach((ex,ei)=>{const sets=parseInt(ex.sets)||3;for(let si=0;si<sets;si++){if(isDone(routine.id,ei,si)){done++;totalVol+=(parseFloat(getLog(routine.id,ei,si,'kg'))||0)*(parseFloat(getLog(routine.id,ei,si,'reps'))||0);}}});
  if(done>=total&&total>0){
    const newPRs=checkAndUpdatePRs(routine);
    renderPRsInProfile(CUR.clientId);
    renderClientExProgress(CUR.clientId);
    showWorkoutFinish(routine,{done,total,totalVol,newPRs});
  }
}

// ══════════════════════════════════════════
// ONBOARDING — primer uso del asesorado
// ══════════════════════════════════════════
let _obSlide = 0;
const OB_SLIDES = 3;
const OB_KEY = 'apex_ob_done';

function shouldShowOnboarding(clientId){
  return !localStorage.getItem(OB_KEY + '_' + clientId);
}

// ══════════════════════ AYUDA CONTEXTUAL (asesorado) ══════════════════════
// Re-accesible desde el botón ❓ Ayuda. Explica la SECCIÓN actual en lenguaje
// sencillo (pensado para personas no técnicas — pedido de Andrés 2026-05-31).
const HELP_SECTIONS = {
  'cn-today': { emoji:'🏋️', title:'La pantalla "Hoy"', html:`
    Aquí está tu entrenamiento de <b>hoy</b>, preparado por tu entrenador.
    <ul style="margin:10px 0 0;padding-left:18px">
      <li style="margin-bottom:7px">Primero haz el <b>calentamiento</b>. El botón <b>🎥</b> te muestra cómo se hace cada movimiento.</li>
      <li style="margin-bottom:7px">En cada ejercicio, escribe el <b>peso (KG)</b> y las <b>repeticiones</b> que hiciste. Si no usas peso, deja 0.</li>
      <li style="margin-bottom:7px">Toca el <b>círculo verde ✓</b> al terminar cada serie. La app cuenta tu descanso sola.</li>
      <li style="margin-bottom:7px">¿No conoces un ejercicio? Toca su <b>nombre</b> para ver un video y la explicación.</li>
    </ul>
    <div style="margin-top:10px">Cuando termines todo, verás una <b>celebración 🎉</b>. ¡Sin presión, ve a tu ritmo!</div>` },
  'cn-routines': { emoji:'📋', title:'Tus "Rutinas"', html:`
    Aquí están <b>todas las rutinas</b> que tu entrenador armó para ti, organizadas por día.
    <ul style="margin:10px 0 0;padding-left:18px">
      <li style="margin-bottom:7px">Toca una rutina para ver sus ejercicios.</li>
      <li style="margin-bottom:7px">Sigue la rutina del <b>día que te toca</b> entrenar.</li>
    </ul>
    <div style="margin-top:10px">Si algo no te queda claro o sientes molestia, escríbele a tu entrenador por <b>Mensajes 💬</b>.</div>` },
  'cn-messages': { emoji:'💬', title:'"Mensajes" con tu entrenador', html:`
    Este es tu <b>chat directo</b> con tu entrenador, como un WhatsApp dentro de la app.
    <ul style="margin:10px 0 0;padding-left:18px">
      <li style="margin-bottom:7px">Escríbele si tienes <b>dudas</b>, una <b>molestia</b> o no pudiste entrenar.</li>
      <li style="margin-bottom:7px">Él te responde aquí mismo.</li>
    </ul>
    <div style="margin-top:10px">Nunca te quedes con la duda: para eso está tu entrenador 🙂</div>` },
  'cn-history': { emoji:'📊', title:'Tu "Historial" (progreso)', html:`
    Aquí ves cómo <b>avanzas con el tiempo</b>.
    <ul style="margin:10px 0 0;padding-left:18px">
      <li style="margin-bottom:7px">Cada entrenamiento que completas queda <b>guardado</b> solo.</li>
      <li style="margin-bottom:7px">Con las semanas verás cómo subes de peso o repeticiones 📈</li>
    </ul>
    <div style="margin-top:10px">Al principio estará casi vacío — es normal. <b>Entrena y vuelve en unas semanas</b> para ver tu cambio.</div>` },
  'cn-profile': { emoji:'👤', title:'Tu "Perfil"', html:`
    Aquí están tus datos y tu <b>racha</b> de entrenamientos.
    <ul style="margin:10px 0 0;padding-left:18px">
      <li style="margin-bottom:7px">Puedes anotar tu <b>peso y medidas</b> para ver cómo cambian con el tiempo.</li>
      <li style="margin-bottom:7px">Tu entrenador usa estos datos para <b>ajustar tu plan</b>.</li>
    </ul>
    <div style="margin-top:10px">No es obligatorio llenarlo todo. Anota lo que puedas, cuando puedas.</div>` },
};
function openHelp(){
  const active = document.querySelector('#s-client .cnp.on');
  const id = (active && active.id) || 'cn-today';
  const h = HELP_SECTIONS[id] || HELP_SECTIONS['cn-today'];
  document.getElementById('help-title').innerHTML = `${h.emoji} ${esc(h.title)}`;
  document.getElementById('help-body').innerHTML = h.html;
  om('m-help');
}

function showOnboarding(clientId){
  _obSlide = 0;
  _obClientId = clientId;
  const el = document.getElementById('onboarding');
  el.style.display = 'flex';
  el.classList.remove('fade-out');
  obGoTo(0);
}

let _obClientId = null;

function obGoTo(idx){
  _obSlide = idx;
  document.getElementById('ob-track').style.transform = `translateX(-${idx * 100}%)`;
  for(let i = 0; i < OB_SLIDES; i++){
    document.getElementById('ob-dot-' + i).classList.toggle('on', i === idx);
  }
  const btn = document.getElementById('ob-next-btn');
  if(idx === OB_SLIDES - 1){
    btn.textContent = '¡Empezar entrenamiento! 💪';
  } else {
    btn.textContent = 'Siguiente →';
  }
}

function obNext(){
  if(_obSlide < OB_SLIDES - 1){
    obGoTo(_obSlide + 1);
  } else {
    obFinish();
  }
}

function obSkip(){ obFinish(); }

function obFinish(){
  const el = document.getElementById('onboarding');
  el.classList.add('fade-out');
  setTimeout(() => { el.style.display = 'none'; }, 400);
  if(_obClientId){
    localStorage.setItem(OB_KEY + '_' + _obClientId, '1');
    // Show data onboarding wizard if needed, otherwise show tooltip
    if(shouldShowDataOnboarding(_obClientId)){
      setTimeout(() => showDataOnboarding(_obClientId), 600);
    } else {
      setTimeout(() => showExTooltip(), 600);
    }
  }
}

// ── First-exercise tooltip ──
// Enseña a tocar el ❓ (video del ejercicio). En la vista guiada (default desde F4) el tip vive
// DENTRO del guiado embebido y suma la respiración (💨), que es la ventaja del guiado (P13);
// lo pinta gmShowExTip. En la clásica va sobre #cex-list.
function _exTipClientId(){ return _obClientId || (typeof CUR!=='undefined' && CUR.clientId) || ''; }
function showExTooltip(){
  const cid=_exTipClientId();
  if(cid && localStorage.getItem('apex_tip_done_' + cid)) return; // ya lo cerró
  // Vista guiada (default): dentro del guiado, con el ❓ + la respiración.
  if(typeof _gmIsEmbedded==='function' && _gmIsEmbedded()){ gmShowExTip(); return; }
  // Vista clásica: sobre la lista de ejercicios.
  const list = document.getElementById('cex-list');
  if(!list || !list.firstChild) return;
  const tip = document.createElement('div');
  tip.className = 'ex-tooltip';
  tip.id = 'ex-first-tip';
  tip.innerHTML = `
    <div class="ex-tooltip-icon">👆</div>
    <div>Toca el <strong>❓</strong> junto al nombre de cualquier ejercicio para ver cómo hacerlo en video.</div>
    <button class="ex-tooltip-close" onclick="dismissExTooltip()">×</button>
  `;
  list.insertBefore(tip, list.firstChild);
}

// Tooltip del MODO GUIADO (pantalla default desde F4): vive en #gm-body, sobre la primera tarjeta
// de ejercicio, y enseña las DOS ayudas del guiado — el ❓ (video) y el 💨 "Cómo respirar aquí"
// (P13). gmRender lo re-inserta mientras no esté cerrado → aparece aunque el usuario elija primero
// su ánimo (el chooser va arriba, los ejercicios abajo) y no molesta al marcar series (eso no
// re-renderiza). Se cierra con la × (o queda cerrado por dispositivo en apex_tip_done_<cid>).
function gmShowExTip(){
  const cid=_exTipClientId();
  if(!cid || localStorage.getItem('apex_tip_done_' + cid)) return;
  const body = document.getElementById('gm-body'); if(!body) return;
  const firstCard = body.querySelector('.gm-ex-card'); if(!firstCard) return;
  if(document.getElementById('ex-first-tip')) return; // ya está puesto
  const tip = document.createElement('div');
  tip.className = 'ex-tooltip';
  tip.id = 'ex-first-tip';
  tip.innerHTML = `
    <div class="ex-tooltip-icon">👆</div>
    <div>Toca el <strong>❓</strong> de un ejercicio para ver el <strong>video</strong>. Y al empezar cada uno, el <strong>💨</strong> te muestra <strong>cómo respirar</strong>.</div>
    <button class="ex-tooltip-close" onclick="dismissExTooltip()">×</button>`;
  body.insertBefore(tip, firstCard);
}

function dismissExTooltip(){
  const tip = document.getElementById('ex-first-tip');
  if(tip) tip.remove();
  const cid=_exTipClientId();
  if(cid) localStorage.setItem('apex_tip_done_' + cid, '1');
}

// ══════════════════════════════════════════
// DATA ONBOARDING WIZARD — baseline del asesorado
// ══════════════════════════════════════════
let _dobClientId = null;
let _dobStep = 0;
let _dobPhotoFile = null;

function shouldShowDataOnboarding(clientId){
  if(localStorage.getItem('apex_ob_data_done_' + clientId)) return false;
  const bw = ld('ax_bw', {});
  const med = ld('ax_med', {});
  const photos = ld('ax_photos', {});
  const hasBW = (bw[clientId] || []).length > 0;
  const hasMed = (med[clientId] || []).length > 0;
  const hasPhoto = (photos[clientId] || []).length > 0;
  return !hasBW && !hasMed && !hasPhoto;
}

function showDataOnboarding(clientId){
  _dobClientId = clientId;
  _dobStep = 0;
  _dobPhotoFile = null;
  const el = document.getElementById('data-ob');
  el.classList.add('on');
  _dobRenderStep(0);
}

function _dobSetDots(step){
  for(let i = 0; i < 4; i++){
    const d = document.getElementById('dob-d' + i);
    if(d) d.classList.toggle('on', i === step);
  }
}

function _dobRenderStep(step){
  _dobStep = step;
  _dobSetDots(step);
  const body = document.getElementById('dob-body');
  if(!body) return;
  const _dobC = DB.clients.find(x=>x.id===_dobClientId) || {}; // hereda datos del registro (ej. peso → no re-preguntar)

  if(step === 0){
    body.innerHTML = `
      <div class="dob-mid">
        <div class="dob-badge"><svg viewBox="0 0 24 24"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-3M13 16V9M18 16v-6"/></svg></div>
        <div class="dob-eyebrow">Tu punto de partida</div>
        <div class="dob-title">¿Cómo estás hoy?</div>
        <div class="dob-sub">Guarda tu <b>peso, medidas y una foto</b> de hoy. En unas semanas vas a ver —con números— cuánto avanzaste.</div>
        <div class="dob-benefits"><div class="dob-ben"><div class="ic">⚖️</div>Peso</div><div class="dob-ben"><div class="ic">📏</div>Medidas</div><div class="dob-ben"><div class="ic">📸</div>Foto</div></div>
      </div>
      <div class="dob-foot">
        <button class="dob-cta" onclick="_dobRenderStep(1)">Empezar · 2 min</button>
        <button class="dob-skip" onclick="_dobFinish()">Saltar por ahora</button>
      </div>`;
  } else if(step === 1){
    body.innerHTML = `
      <div class="dob-mid">
        <div class="dob-badge"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 12l3.5-3.5"/><path d="M12 3.5v2M20.5 12h-2M5.5 12h-2"/></svg></div>
        <div class="dob-eyebrow" style="color:#10E0A0">Paso 1 de 3</div>
        <div class="dob-title">¿Cuánto pesas hoy?</div>
        <div class="dob-sub">Será tu peso de inicio. Lo puedes cambiar cuando quieras desde tu perfil.</div>
        <div class="dob-stepper">
          <button class="dob-pm" type="button" onclick="_dobStepBW(-0.5)" aria-label="Bajar">−</button>
          <input id="dob-bw" class="dob-bwin" type="number" inputmode="decimal" step="0.1" min="20" max="300" placeholder="75.5" value="${_dobC.weight||''}"><span class="dob-bwu">kg</span>
          <button class="dob-pm" type="button" onclick="_dobStepBW(0.5)" aria-label="Subir">+</button>
        </div>
      </div>
      <div class="dob-foot">
        <button class="dob-cta" onclick="_dobSaveBW()">Guardar y continuar</button>
        <button class="dob-skip" onclick="_dobRenderStep(2)">Saltar este paso</button>
      </div>`;
  } else if(step === 2){
    body.innerHTML = `
      <div class="dob-mid">
        <div class="dob-badge"><svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/></svg></div>
        <div class="dob-eyebrow" style="color:#10E0A0">Paso 2 de 3</div>
        <div class="dob-title">Tus medidas</div>
        <div class="dob-sub">Todas son opcionales. Completa las que tengas a mano ahora.</div>
        <div class="dob-grid">
          <div class="fg"><label class="ilbl">Cintura (cm)</label><input class="inp" id="dob-cintura" type="number" inputmode="decimal" step="0.1" placeholder="Ej: 80"></div>
          <div class="fg"><label class="ilbl">Cadera (cm)</label><input class="inp" id="dob-cadera" type="number" inputmode="decimal" step="0.1" placeholder="Ej: 95"></div>
          <div class="fg"><label class="ilbl">Pecho (cm)</label><input class="inp" id="dob-pecho" type="number" inputmode="decimal" step="0.1" placeholder="Ej: 95"></div>
          <div class="fg"><label class="ilbl">Bíceps der. (cm)</label><input class="inp" id="dob-brazo" type="number" inputmode="decimal" step="0.1" placeholder="Ej: 35"></div>
          <div class="fg"><label class="ilbl">Muslo der. (cm)</label><input class="inp" id="dob-muslo" type="number" inputmode="decimal" step="0.1" placeholder="Ej: 55"></div>
          <div class="fg"><label class="ilbl">Pantorrilla (cm)</label><input class="inp" id="dob-pantorrilla" type="number" inputmode="decimal" step="0.1" placeholder="Ej: 38"></div>
        </div>
      </div>
      <div class="dob-foot">
        <button class="dob-cta" onclick="_dobSaveMed()">Continuar</button>
        <button class="dob-skip" onclick="_dobRenderStep(3)">Saltar este paso</button>
      </div>`;
  } else if(step === 3){
    body.innerHTML = `
      <div class="dob-mid">
        <div class="dob-badge"><svg viewBox="0 0 24 24"><path d="M4 8a2 2 0 0 1 2-2h2l1.4-2h5.2L18 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.5" r="3.4"/></svg></div>
        <div class="dob-eyebrow" style="color:#10E0A0">Paso 3 de 3</div>
        <div class="dob-title">Tu foto de inicio</div>
        <div class="dob-sub">Guárdala hoy. En 4 semanas vas a comparar y ver el cambio. Solo tú y tu coach pueden verla.</div>
        <input type="file" id="dob-photo-input" class="dob-file" accept="image/*" onchange="_dobPreviewPhoto(this)">
        <img id="dob-photo-img" class="dob-preview" alt="Vista previa">
      </div>
      <div class="dob-foot">
        <button class="dob-cta" onclick="_dobSavePhoto()">Guardar foto</button>
        <button class="dob-skip" onclick="_dobFinish()">Saltar este paso</button>
      </div>`;
  }
}

function _dobStepBW(d){
  const i=document.getElementById('dob-bw'); if(!i) return;
  let v=parseFloat(i.value); if(isNaN(v)) v=70;
  v=Math.min(300,Math.max(20,Math.round((v+d)*10)/10));
  i.value=v;
}
function _dobSaveBW(){
  const val = parseFloat(document.getElementById('dob-bw').value);
  if(!val || val < 20 || val > 300){ toast('Ingresa un peso válido (20–300 kg)'); return; }
  const clientId = _dobClientId;
  if(!DB.bodyweight) DB.bodyweight = {};
  if(!DB.bodyweight[clientId]) DB.bodyweight[clientId] = [];
  const today = new Date().toISOString().split('T')[0];
  const idx = DB.bodyweight[clientId].findIndex(e => e.date === today);
  if(idx > -1) DB.bodyweight[clientId][idx].kg = val;
  else DB.bodyweight[clientId].unshift({date: today, kg: val});
  DB.bodyweight[clientId].sort((a, b) => new Date(b.date) - new Date(a.date));
  sv('ax_bw', DB.bodyweight);
  renderBodyWeightSection(clientId);
  toast('⚖️ Peso guardado');
  _dobRenderStep(2);
}

function _dobSaveMed(){
  const clientId = _dobClientId;
  const fields = [
    {key:'cintura',id:'dob-cintura'},
    {key:'cadera',id:'dob-cadera'},
    {key:'pecho',id:'dob-pecho'},
    {key:'brazo',id:'dob-brazo'},
    {key:'muslo',id:'dob-muslo'},
    {key:'pantorrilla',id:'dob-pantorrilla'}
  ];
  const entry = {date: new Date().toISOString()};
  let hasData = false;
  fields.forEach(f => {
    const el = document.getElementById(f.id);
    if(!el) return;
    const v = parseFloat(el.value);
    if(v > 0){ entry[f.key] = v; hasData = true; }
  });
  if(hasData){
    if(!DB.medidas) DB.medidas = {};
    if(!DB.medidas[clientId]) DB.medidas[clientId] = [];
    DB.medidas[clientId].unshift(entry);
    if(DB.medidas[clientId].length > 24) DB.medidas[clientId] = DB.medidas[clientId].slice(0, 24);
    sv('ax_med', DB.medidas);
    renderMedidasClient(clientId);
    toast('📏 Medidas guardadas');
  }
  _dobRenderStep(3);
}

function _dobPreviewPhoto(input){
  const file = input.files[0];
  if(!file) return;
  _dobPhotoFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById('dob-photo-img');
    if(img){ img.src = e.target.result; img.style.display = 'block'; }
  };
  reader.readAsDataURL(file);
}

function _dobSavePhoto(){
  const clientId = _dobClientId;
  if(!_dobPhotoFile){ toast('Selecciona una foto primero'); return; }
  const reader = new FileReader();
  reader.onload = async e => {
    let base64 = e.target.result;
    toast('⏳ Subiendo foto...'); base64 = await compressImage(base64, 100000);
    const photoId = uid();
    let src = base64;
    try{ src = await uploadPhotoToStorage(clientId, photoId, base64); }
    catch(e){ warn('AVI storage upload failed, keeping base64', e.message); }
    if(!DB.photos) DB.photos = {};
    if(!DB.photos[clientId]) DB.photos[clientId] = [];
    const label = 'Foto inicial ' + new Date().toLocaleDateString('es-ES', {month:'short', year:'numeric'});
    DB.photos[clientId].unshift({id:photoId, date:new Date().toISOString(), label:label, src});
    if(DB.photos[clientId].length > 12) DB.photos[clientId] = DB.photos[clientId].slice(0, 12);
    svNow('ax_photos', DB.photos);
    renderPhotosClient(clientId);
    toast('📸 Foto guardada');
    _dobFinish();
  };
  reader.readAsDataURL(_dobPhotoFile);
}

function _dobFinish(){
  const el = document.getElementById('data-ob');
  if(el) el.classList.remove('on');
  if(_dobClientId){
    localStorage.setItem('apex_ob_data_done_' + _dobClientId, '1');
  }
  _dobPhotoFile = null;
  // After data wizard: show educational onboarding if not yet seen, otherwise show tooltip
  if(_dobClientId && shouldShowOnboarding(_dobClientId)){
    setTimeout(()=>showOnboarding(_dobClientId), 600);
  } else if(_dobClientId && localStorage.getItem(OB_KEY + '_' + _dobClientId)){
    setTimeout(() => {
      _obClientId = _dobClientId;
      showExTooltip();
    }, 400);
  }
}

// ══════════════════════════════════════════
// CALENTAMIENTO INTELIGENTE
// ══════════════════════════════════════════

// Biblioteca de ejercicios de movilidad y activación
// Catálogo de estilos = presets que combinan ENTORNO + METODOLOGÍA. Fase A (cimiento).
// `env` filtra la biblioteca; `methodBias` afinará selección/split en fases siguientes.
// Se cableará en la UI del generador en Fase D. Ver docs/estilos-y-entornos.md.
const TRAINING_STYLES = [
  {id:'gym_hipertrofia',  name:'Gym — Hipertrofia',          icon:'🏋️', env:'gym',      methodBias:'hipertrofia'},
  {id:'gym_fuerza',       name:'Gym — Fuerza',               icon:'🏋️', env:'gym',      methodBias:'fuerza'},
  {id:'casa_corporal',    name:'Casa — Peso corporal',       icon:'🤸', env:'corporal', methodBias:'funcional'},
  {id:'casa_equipo',      name:'Casa — Bandas y mancuernas', icon:'🏠', env:'casa',     methodBias:'hipertrofia'},
  {id:'parque_calistenia',name:'Calistenia / Parque',        icon:'🌳', env:'parque',   methodBias:'calistenia'},
  {id:'funcional',        name:'Funcional',                  icon:'🔥', env:'casa',     methodBias:'funcional'},
];

const WARMUP_LIBRARY = {

  // ── MOVILIDAD ARTICULAR ──
  hombros:[
    {id:'wh1',name:'Círculos de hombro',icon:'🔄',reps:'10 c/lado',desc:'Brazos extendidos, traza círculos amplios hacia adelante y luego hacia atrás. Siente la articulación soltarse.',ytQuery:'círculos de hombro movilidad calentamiento'},
    {id:'wh2',name:'Rotación de manguito rotador',icon:'↩️',reps:'15 c/lado',desc:'Codo doblado 90°, gira el antebrazo hacia arriba y hacia abajo sin mover el codo. Lento y controlado.',ytQuery:'rotación de manguito rotador ejercicio calentamiento'},
    {id:'wh3',name:'Apertura de pecho en pared',icon:'🧱',reps:'10 reps',desc:'Apoya el antebrazo en la pared a 90°. Gira el cuerpo alejándote hasta sentir el pecho abrirse. Mantén 2 seg.',ytQuery:'estiramiento apertura de pecho en pared'},
    {id:'wh4',name:'Rotación torácica sentado',icon:'🌀',reps:'10 c/lado',desc:'Sentado, manos detrás de la nuca. Rota el torso a un lado y al otro. La cintura no se mueve, solo la espalda alta.',ytQuery:'rotación torácica sentado movilidad columna'},
    {id:'wh5',name:'Círculos de muñeca',icon:'👐',reps:'10 c/dirección',desc:'Entrelaza los dedos y traza círculos amplios con ambas muñecas. Primero en un sentido, luego en el otro.',ytQuery:'círculos de muñeca calentamiento'},
  ],

  cadera:[
    {id:'wc1',name:'Círculos de cadera de pie',icon:'⭕',reps:'10 c/dirección',desc:'Pies separados al ancho de hombros, manos en la cadera. Traza círculos grandes con la pelvis como si movieras un hula-hoop.',ytQuery:'círculos de cadera de pie movilidad'},
    {id:'wc2',name:'Estocada con rotación',icon:'🔃',reps:'6 c/lado',desc:'Da un paso largo al frente. En la posición de estocada, rota el torso hacia la pierna delantera y levanta el brazo al techo.',ytQuery:'estocada con rotación torácica movilidad'},
    {id:'wc3',name:'Apertura de cadera (90/90)',icon:'🦋',reps:'8 c/lado',desc:'Sentado en el suelo, una pierna hacia adelante y otra hacia afuera formando 90°. Inclínate suavemente sobre la pierna delantera.',ytQuery:'movilidad de cadera 90 90 ejercicio'},
    {id:'wc4',name:'Puente de glúteo activación',icon:'🌉',reps:'15 reps',desc:'Acostado boca arriba, rodillas dobladas. Sube las caderas apretando el glúteo. Aguanta 1 segundo arriba. Baja lento.',ytQuery:'puente de glúteo activación tutorial'},
    {id:'wc5',name:'Patada lateral de pie',icon:'↔️',reps:'12 c/lado',desc:'De pie apoyado en una pared. Lleva la pierna al lado lo más alto posible controlado, luego al frente y atrás. Activa el glúteo medio.',ytQuery:'patada lateral de cadera glúteo medio de pie'},
  ],

  rodillas:[
    {id:'wr1',name:'Círculos de rodilla',icon:'🔵',reps:'10 c/dirección',desc:'Pies juntos y rodillas ligeramente dobladas, manos sobre las rodillas. Traza círculos con las rodillas. Luego cambia de dirección.',ytQuery:'círculos de rodilla calentamiento movilidad'},
    {id:'wr2',name:'Sentadilla de movilidad lenta',icon:'⬇️',reps:'10 reps',desc:'Baja la sentadilla muy despacio (4 segundos bajando, 4 subiendo). Sin peso. El objetivo es movilidad, no fuerza.',ytQuery:'sentadilla profunda movilidad lenta sin peso'},
    {id:'wr3',name:'Movilidad de isquiotibiales de pie',icon:'🦵',reps:'10 c/lado',desc:'De pie, extiende una pierna al frente apoyando el talón. Inclínate ligeramente hacia ella manteniendo la espalda recta. Siente el estiramiento en la parte trasera del muslo.',ytQuery:'movilidad de isquiotibiales de pie talón'},
  ],

  tobillos:[
    {id:'wt1',name:'Círculos de tobillo',icon:'🦶',reps:'10 c/dirección',desc:'Sentado o de pie, levanta un pie y traza círculos amplios con el tobillo. Lento y completo. Cambia dirección y luego repite con el otro pie.',ytQuery:'círculos de tobillo movilidad calentamiento'},
    {id:'wt2',name:'Movilidad tobillo en pared',icon:'🧱',reps:'10 c/lado',desc:'De pie frente a la pared a unos 10 cm. Dobla la rodilla hacia adelante intentando tocar la pared sin levantar el talón. Aumenta la distancia progresivamente.',ytQuery:'movilidad de tobillo en pared dorsiflexión'},
  ],

  munecas:[
    {id:'wm1',name:'Círculos de muñeca',icon:'✋',reps:'10 c/dirección',desc:'Entrelaza los dedos y traza círculos amplios con ambas muñecas. Lento y completo en ambas direcciones.',ytQuery:'círculos de muñeca calentamiento'},
    {id:'wm2',name:'Estiramiento extensor de muñeca',icon:'🤲',reps:'30 seg c/lado',desc:'Extiende el brazo al frente, dobla la muñeca hacia abajo, jala los dedos suavemente con la otra mano. Mantén 30 segundos.',ytQuery:'estiramiento extensor de muñeca antebrazo'},
    {id:'wm3',name:'Estiramiento flexor de muñeca',icon:'🖐️',reps:'30 seg c/lado',desc:'Extiende el brazo, dobla la muñeca hacia arriba, jala los dedos hacia ti con la otra mano. Sientes el antebrazo interior.',ytQuery:'estiramiento flexor de muñeca antebrazo'},
  ],

  espalda:[
    {id:'we5',name:'Rollitos sobre colchoneta',icon:'🌀',reps:'8–10 reps',desc:'Acostado de espalda en la colchoneta, abraza las rodillas al pecho y rueda suavemente adelante y atrás sobre la columna, masajeando y descomprimiendo la espalda baja. Lento y controlado.',ytQuery:'rollitos sobre colchoneta descompresión espalda baja'},
    {id:'we1',name:'Cat-Cow (Gato-Vaca)',icon:'🐱',reps:'10 reps',desc:'En cuatro patas. Alterna entre arquear la espalda hacia arriba (gato) y hundirla hacia abajo (vaca). 1 segundo en cada posición.',ytQuery:'ejercicio gato vaca cat cow movilidad columna'},
    {id:'we2',name:'Rotación torácica en el suelo',icon:'🔄',reps:'8 c/lado',desc:'Acostado de lado con rodillas dobladas. Extiende los brazos al frente. Rota el brazo de arriba hacia atrás abriendo el pecho. La cadera no se mueve.',ytQuery:'rotación torácica en el suelo movilidad'},
    {id:'we3',name:'Apertura de cadena posterior',icon:'🙇',reps:'30 seg',desc:'De pie, pies separados. Dobla el cuerpo hacia adelante dejando caer los brazos y la cabeza. Relaja la espalda completamente. No fuerces.',ytQuery:'estiramiento cadena posterior de pie flexión'},
    {id:'we4',name:'Plancha de hombros',icon:'🤸',reps:'10 reps',desc:'En posición de lagartija alta. Deja caer los hombros hacia el suelo (protracción) y luego empújalos hacia arriba (retracción). Los brazos no se doblan.',ytQuery:'protracción retracción escapular plancha tutorial'},
  ],

  // ── ACTIVACIÓN ──
  activacion_superior:[
    {id:'wa1',name:'Flexión de pecho (lagartija)',icon:'💪',reps:'10–15 reps',desc:'Lagartija completa con el cuerpo recto. Si es muy difícil, apoya las rodillas. El objetivo es activar, no fatigarse.',ytQuery:'cómo hacer flexiones lagartijas principiantes'},
    {id:'wa3',name:'Band pull-apart / apertura con banda',icon:'↔️',reps:'15 reps',desc:'Sostén una banda o toalla con los brazos extendidos al frente. Jala los extremos hacia afuera hasta los lados. Aprieta la espalda alta.',ytQuery:'band pull apart apertura con banda tutorial'},
    {id:'wa4',name:'Balanceo de brazos cruzados',icon:'🤸',reps:'15 reps',desc:'Balancéa los brazos abiertos y luego crúzalos frente al pecho. Alterna cuál brazo queda por encima. Calienta la articulación del hombro.',ytQuery:'balanceo de brazos calentamiento hombros'},
    {id:'wa2',name:'Remo invertido en barra baja',icon:'🔙',reps:'10 reps',desc:'Debajo de una barra baja, jala el pecho hacia la barra. Activa dorsal y bíceps sin carga extra. (Requiere barra baja — opcional.)',ytQuery:'remo invertido en barra baja tutorial'},
  ],

  activacion_inferior:[
    {id:'wai1',name:'Sentadilla con peso corporal',icon:'🏋️',reps:'15 reps',desc:'Sentadilla sin peso. Foco en profundidad y control. Prepara la rodilla, la cadera y el tobillo para la carga.',ytQuery:'sentadilla peso corporal técnica principiantes'},
    {id:'wai2',name:'Desplante alterno',icon:'👣',reps:'10 c/lado',desc:'Zancadas alternas sin peso. Activa el cuádricep y el glúteo de manera controlada.',ytQuery:'desplantes zancadas peso corporal tutorial'},
    {id:'wai3',name:'Peso muerto con peso corporal',icon:'🙆',reps:'10 reps',desc:'Inclinación de cadera sin barra, con las manos en los muslos. Practica la bisagra de cadera y activa el femoral.',ytQuery:'bisagra de cadera peso muerto sin peso técnica'},
    {id:'wai4',name:'Elevación de talones bilateral',icon:'👟',reps:'15 reps',desc:'Sube de puntillas despacio y baja lento. Activa la pantorrilla y el tendón de Aquiles antes de la carga.',ytQuery:'elevación de talones pantorrilla de pie'},
  ],

  activacion_core:[
    {id:'wac1',name:'Plancha isométrica corta',icon:'📏',reps:'3 × 20 seg',desc:'Plancha frontal en antebrazos. Aprieta abdomen, glúteo y quads al mismo tiempo. 20 segundos, 3 veces.',ytQuery:'cómo hacer plancha abdominal correctamente'},
    {id:'wac2',name:'Deadbug',icon:'🐛',reps:'8 c/lado',desc:'Acostado boca arriba, brazos al techo, rodillas 90°. Extiende el brazo derecho y la pierna izquierda al mismo tiempo. Espalda pegada al suelo.',ytQuery:'dead bug ejercicio core tutorial'},
    {id:'wac3',name:'Rotación de cadera tumbado',icon:'🔁',reps:'8 c/lado',desc:'Acostado, rodillas juntas al pecho. Deja caer ambas rodillas a un lado y vuelve al centro. Espalda pegada al suelo. Activa oblicuos.',ytQuery:'rotación de columna tumbado movilidad lumbar'},
  ],
};

// Mapeo de músculo → qué calentamiento necesita
const MUSCLE_WARMUP_MAP = {
  pecho:    {articular:['hombros','munecas'],activacion:['activacion_superior']},
  espalda:  {articular:['hombros','espalda'],activacion:['activacion_superior']},
  hombros:  {articular:['hombros','munecas'],activacion:['activacion_superior']},
  biceps:   {articular:['hombros','munecas'],activacion:['activacion_superior']},
  triceps:  {articular:['hombros','munecas'],activacion:['activacion_superior']},
  piernas:  {articular:['cadera','rodillas','tobillos'],activacion:['activacion_inferior']},
  gluteo:   {articular:['cadera','rodillas'],activacion:['activacion_inferior']},
  core:     {articular:['espalda','cadera'],activacion:['activacion_core']},
  cardio:   {articular:['rodillas','tobillos'],activacion:['activacion_inferior']},
  otro:     {articular:['hombros','cadera'],activacion:['activacion_superior','activacion_inferior']},
};

// Detecta el tipo de sesión y construye el calentamiento ideal
function buildWarmup(exercises){
  const muscleCount={};
  (exercises||[]).forEach(e=>{
    const m=e.muscle||'otro';
    muscleCount[m]=(muscleCount[m]||0)+1;
  });

  const muscles=Object.keys(muscleCount);
  const hasUpper=muscles.some(m=>['pecho','espalda','hombros','biceps','triceps'].includes(m));
  const hasLower=muscles.some(m=>['piernas','gluteo'].includes(m));
  const hasCore=muscles.includes('core');
  const isFull=hasUpper&&hasLower;

  // Determine session label
  let sessionLabel='Cuerpo completo';
  let sessionEmoji='⚡';
  if(isFull){sessionLabel='Cuerpo completo';sessionEmoji='⚡';}
  else if(hasUpper&&!hasLower){
    const p=muscles.includes('pecho'),e=muscles.includes('espalda'),h=muscles.includes('hombros');
    if(p&&!e)sessionLabel='Empuje (tren superior)';
    else if(e&&!p)sessionLabel='Jalón (tren superior)';
    else sessionLabel='Tren superior';
    sessionEmoji='💪';
  }
  else if(hasLower&&!hasUpper){
    sessionLabel=muscles.includes('gluteo')&&!muscles.includes('piernas')?'Glúteo':'Tren inferior';
    sessionEmoji='🦵';
  }
  else if(hasCore){sessionLabel='Core';sessionEmoji='🔥';}

  // Build unique articular exercises (no dupes)
  const articularSets=new Set();
  const articulares=[];
  muscles.forEach(m=>{
    const map=MUSCLE_WARMUP_MAP[m]||MUSCLE_WARMUP_MAP['otro'];
    (map.articular||[]).forEach(area=>{
      if(!articularSets.has(area)){
        articularSets.add(area);
        const pool=WARMUP_LIBRARY[area]||[];
        // Take 1-2 exercises per area
        pool.slice(0,2).forEach(ex=>articulares.push(ex));
      }
    });
  });

  // Build activation exercises (unique, max 3)
  const activacionSets=new Set();
  const activaciones=[];
  muscles.forEach(m=>{
    const map=MUSCLE_WARMUP_MAP[m]||MUSCLE_WARMUP_MAP['otro'];
    (map.activacion||[]).forEach(area=>{
      if(!activacionSets.has(area)){
        activacionSets.add(area);
        const pool=WARMUP_LIBRARY[area]||[];
        pool.slice(0,2).forEach(ex=>{
          if(activaciones.length<4)activaciones.push(ex);
        });
      }
    });
  });

  // Aproximación sets for compound exercises
  const aproximacion=(exercises||[]).filter(e=>e.type==='Compuesto').slice(0,3);

  return {sessionLabel,sessionEmoji,articulares,activaciones,aproximacion};
}

// Persistencia del calentamiento (igual que las series: localStorage por rutina).
// Antes vivía solo en memoria y se borraba al re-renderizar → al salir y volver a
// la rutina tocaba re-marcar todo. Se resetea por día (checkAndResetSession) y en
// el reinicio manual (resetSession), como el resto de la sesión.
function wuKey(routineId,exId){return `wu_${routineId}_${exId}`}
function wuIsDone(routineId,exId){return localStorage.getItem(wuKey(routineId,exId))==='1'}
function clearWarmup(routineId){
  Object.keys(localStorage).filter(k=>k.startsWith(`wu_${routineId}_`)).forEach(k=>localStorage.removeItem(k));
}

function wuToggle(id){
  const rid=CUR.activeRoutine&&CUR.activeRoutine.id;if(!rid)return;
  const done=!wuIsDone(rid,id);
  localStorage.setItem(wuKey(rid,id),done?'1':'0');
  const btn=document.getElementById('wu-btn-'+id);
  const row=document.getElementById('wu-row-'+id);
  if(btn){btn.textContent=done?'✓':'';btn.style.background=done?'var(--g)':'transparent';btn.style.borderColor=done?'var(--g)':'var(--br2)';}
  if(row){row.style.opacity=done?'.5':'1';}
  updateWarmupProgress();
}

function updateWarmupProgress(){
  const wrap=document.getElementById('wu-wrap');
  if(!wrap)return;
  const all=wrap.querySelectorAll('[id^="wu-btn-"]');
  const done=[...all].filter(b=>b.textContent==='✓').length;
  const total=all.length;
  document.getElementById('wu-prog-num').textContent=done+'/'+total;
  const pct=total?Math.round(done/total*100):0;
  document.getElementById('wu-prog-fill').style.width=pct+'%';
  const badge=document.getElementById('wu-status-badge');
  if(done===total&&total>0){
    badge.textContent='✅ ¡Listo para entrenar!';
    badge.style.background='var(--gl)';
    badge.style.color='var(--g)';
    badge.style.borderColor='var(--g)';
  } else {
    badge.textContent='⚡ Calentar antes de empezar';
    badge.style.background='var(--orl)';
    badge.style.color='var(--or)';
    badge.style.borderColor='var(--or)';
  }
}

function renderWarmup(exercises){
  const con=document.getElementById('wu-wrap');
  if(!con)return;
  const rid=CUR.activeRoutine&&CUR.activeRoutine.id;
  const {sessionLabel,sessionEmoji,articulares,activaciones,aproximacion}=buildWarmup(exercises);
  // Calentamiento EDITABLE por el coach: si la rutina trae una lista propia (routine.warmup),
  // se usa esa (lista plana); si no, se auto-deriva (movilidad + activación). Editable 2026-06-23.
  const customIds=(CUR.activeRoutine&&CUR.activeRoutine.warmup)||null;
  const custom=(customIds&&customIds.length)?customIds.map(id=>findWarmupEx(id)).filter(Boolean):null;
  const total=custom?custom.length:(articulares.length+activaciones.length);

  const exRow=(ex)=>{
    const d=rid&&wuIsDone(rid,ex.id); // estado persistido: queda marcado al salir y volver
    return `
    <div id="wu-row-${ex.id}" class="wu-ex-row" onclick="wuToggle('${ex.id}')" style="opacity:${d?'.5':'1'}">
      <div class="wu-ex-icon">${ex.icon}</div>
      <div class="wu-ex-info">
        <div class="wu-ex-name">${esc(ex.name)}</div>
        <div class="wu-ex-reps">${esc(ex.reps)}</div>
      </div>
      <button class="wu-guide-btn" aria-label="Ver cómo se hace: guía y video" title="Cómo se hace (guía + video)" onclick="event.stopPropagation();openWarmupDetail('${ex.id}')" style="background:none;border:none;font-size:17px;cursor:pointer;flex-shrink:0;margin-right:2px;opacity:.75">🎥</button>
      <button id="wu-btn-${ex.id}" class="wu-check-btn" onclick="event.stopPropagation();wuToggle('${ex.id}')" style="${d?'background:var(--g);border-color:var(--g)':''}">${d?'✓':''}</button>
    </div>`;
  };

  // La "Aproximación" (series con % del peso) se movió a los Sets de calentamiento POR
  // ejercicio (en cada tarjeta) — aquí queda solo Movilidad + Activación para no duplicar.

  con.innerHTML=`
    <div class="wu-card">
      <div class="wu-header" onclick="toggleWarmup()">
        <div>
          <div class="wu-title">${sessionEmoji} Calentamiento — ${esc(sessionLabel)}</div>
          <div id="wu-status-badge" class="wu-badge">⚡ Calentar antes de empezar</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="wu-prog-txt"><span id="wu-prog-num">0/${total}</span></div>
          <div class="wu-chev" id="wu-chev">▼</div>
        </div>
      </div>
      <div class="wu-prog-bar"><div class="wu-prog-fill" id="wu-prog-fill"></div></div>

      <div id="wu-body" class="wu-body">
        ${custom
          ? custom.map(exRow).join('')
          : `<div class="wu-section-title">🦴 Movilidad articular</div>
        ${articulares.map(exRow).join('')}
        <div class="wu-section-title" style="margin-top:14px">⚡ Activación muscular</div>
        ${activaciones.map(exRow).join('')}`}
      </div>
    </div>`;
  updateWarmupProgress(); // refleja el calentamiento ya marcado (persistido)
}

function toggleWarmup(){
  const body=document.getElementById('wu-body');
  const chev=document.getElementById('wu-chev');
  if(!body)return;
  const open=body.classList.toggle('open');
  chev.style.transform=open?'rotate(180deg)':'rotate(0deg)';
}


let CUR_EX_YT_QUERY = '';
let CUR_EX_REF = null; // ejercicio de biblioteca en edición (env), o null si no editable

// ══════════ GLOSARIO (tap-to-explain) ══════════
// Términos técnicos que un principiante no entiende. En la guía y la nota de coach
// se resaltan y, al tocarlos, abren una explicación en lenguaje simple. Pedido de
// Camilo 2026-06-09 ("nombres técnicos como omóplato necesitan una descripción").
const GLOSS=[
  {k:'omoplato',t:'Omóplato (escápula)',terms:['omóplatos','omóplato','escápulas','escápula'],b:'El hueso plano de la espalda alta, detrás de cada hombro. "Juntar los omóplatos" es llevarlos hacia atrás y al centro, como apretando un lápiz entre ellos.'},
  {k:'bisagra',t:'Bisagra de cadera',terms:['bisagra de cadera','bisagra'],b:'Empujar la cola hacia atrás doblando poco las rodillas, con la espalda recta. El movimiento sale de la cadera, no de la cintura — como cerrar una puerta con la cadera.'},
  {k:'protraccion',t:'Protracción',terms:['protracción'],b:'Separar los hombros hacia adelante, alejando los omóplatos entre sí.'},
  {k:'retraccion',t:'Retracción',terms:['retracción'],b:'Llevar los hombros hacia atrás juntando los omóplatos.'},
  {k:'isometrico',t:'Isométrico',terms:['isométricos','isométrico','isométrica'],b:'Ejercicio en el que aguantas una posición fija sin moverte (como la plancha). El músculo trabaja sin cambiar de largo.'},
  {k:'excentrico',t:'Fase excéntrica',terms:['excéntricos','excéntrico','excéntrica'],b:'La parte del movimiento en que el músculo se alarga bajo tensión, normalmente la bajada del peso. Hacerla lenta da más resultados.'},
  {k:'concentrico',t:'Fase concéntrica',terms:['concéntrico','concéntrica'],b:'La parte en que el músculo se acorta y levanta o empuja el peso (la subida).'},
  {k:'aduccion',t:'Aducción',terms:['aducción'],b:'Acercar una pierna o brazo hacia el centro del cuerpo (juntar).'},
  {k:'abduccion',t:'Abducción',terms:['abducción'],b:'Alejar una pierna o brazo del centro del cuerpo (abrir).'},
  {k:'propiocepcion',t:'Propiocepción',terms:['propiocepción','propioceptivo'],b:'El sentido de saber dónde está tu cuerpo en el espacio y mantener el equilibrio sin mirarte.'},
  {k:'manguito',t:'Manguito rotador',terms:['manguito rotador','manguito'],b:'Grupo de músculos pequeños que estabilizan el hombro. Cuidarlos previene lesiones.'},
  {k:'serrato',t:'Serrato',terms:['serrato'],b:'Músculo a los lados de las costillas, bajo la axila; ayuda a mover el omóplato.'},
  {k:'romboides',t:'Romboides',terms:['romboides'],b:'Músculos entre los omóplatos que los juntan hacia el centro de la espalda.'},
  {k:'soleo',t:'Sóleo',terms:['sóleo'],b:'Músculo profundo de la pantorrilla; trabaja sobre todo con la rodilla doblada.'},
  {k:'gastrocnemio',t:'Gastrocnemio',terms:['gastrocnemio'],b:'El músculo visible de la pantorrilla (el "gemelo").'},
  {k:'valsalva',t:'Maniobra de Valsalva',terms:['valsalva','maniobra de valsalva'],b:'Antes de levantar un peso grande: toma aire, llena la barriga y apriétala como si fueras a aguantar la respiración. Crea presión que protege la columna. Suelta el aire al terminar la repetición.'},
  {k:'tempo',t:'Tempo',terms:['tempo'],b:'La velocidad a la que haces cada parte del movimiento (bajar, pausar, subir). Bajar lento — por ejemplo en 3 segundos — da más resultados que dejar caer el peso.'},
  {k:'lumbar',t:'Zona lumbar',terms:['zona lumbar','lumbar'],b:'La parte baja de la espalda, justo encima de las nalgas. "Lumbar neutra" = ni arqueada ni redondeada de más, en su curva natural.'},
  {k:'valgo',t:'Valgo de rodilla',terms:['valgo'],b:'Cuando las rodillas se van hacia adentro al agacharte o subir. Hay que evitarlo: las rodillas siguen la dirección de los pies.'},
  {k:'core',t:'Core',terms:['core'],b:'El centro del cuerpo: abdomen, baja espalda y pelvis que te estabilizan. Un core fuerte protege la columna en todos los ejercicios.'},
  {k:'supino',t:'Agarre supino / prono',terms:['supino','supina','supinar','supinas','prono','prona'],b:'Supino = palmas hacia arriba o hacia ti. Prono = palmas hacia abajo o al frente. "Supinar la muñeca" es girarla para que la palma mire hacia arriba.'},
  {k:'femoral',t:'Femoral (isquiotibiales)',terms:['femoral','isquiotibiales'],b:'Los músculos de la parte de atrás del muslo. Doblan la rodilla y trabajan al estirar la cadera (como en el peso muerto rumano).'},
  {k:'dorsal',t:'Dorsal ancho',terms:['dorsal ancho','dorsales','dorsal'],b:'El músculo grande de la espalda que da la forma de "V". Trabaja al jalar o remar llevando los codos hacia abajo y atrás.'},
  {k:'gluteomedio',t:'Glúteo medio',terms:['glúteo medio'],b:'El músculo del lado de la cadera (no la nalga grande). Estabiliza la pelvis y evita que las rodillas se vayan hacia adentro.'},
  {k:'deltoides',t:'Deltoides',terms:['deltoides','deltoide'],b:'El músculo redondeado del hombro. Tiene tres partes: frontal, lateral (la que da anchura) y posterior (atrás).'},
  {k:'pectoral',t:'Pectoral',terms:['pectoral mayor','pectorales','pectoral'],b:'El músculo del pecho. Trabaja al empujar hacia adelante o arriba (press, flexiones, aperturas).'},
  {k:'clavicular',t:'Pecho clavicular (superior)',terms:['clavicular','clavícula'],b:'La parte de arriba del pecho, cerca de la clavícula (el hueso bajo el cuello). El press inclinado la trabaja más.'},
  {k:'erectores',t:'Erectores de la columna',terms:['erectores'],b:'Los músculos largos a los lados de la columna que mantienen la espalda erguida y recta.'},
  {k:'braquial',t:'Braquial y braquiorradial',terms:['braquiorradial','braquial'],b:'Músculos del brazo y antebrazo que ayudan al bíceps a doblar el codo. El agarre tipo martillo los trabaja más.'},
];
const _glossEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
let _glossRe=null,_glossMap=null;
function _glossInit(){
  const items=[];
  GLOSS.forEach(g=>g.terms.forEach(t=>items.push({term:t,key:g.k})));
  items.sort((a,b)=>b.term.length-a.term.length); // los largos primero (alternación es leftmost-first)
  _glossMap={}; items.forEach(i=>{ const lk=i.term.toLowerCase(); if(!(lk in _glossMap))_glossMap[lk]=i.key; });
  const alts=items.map(i=>_glossEsc(i.term)).join('|');
  // borde consumido a la izquierda + lookahead a la derecha (sin lookbehind: compat iOS viejo)
  _glossRe=new RegExp('(^|[^\\p{L}\\p{N}])('+alts+')(?=$|[^\\p{L}\\p{N}])','giu');
}
// Devuelve HTML seguro: escapa el texto y envuelve los términos conocidos en spans tocables.
function glossarize(text){
  if(!text) return '';
  if(!_glossRe){ try{ _glossInit(); }catch(e){ return esc(text); } }
  try{
    return esc(text).replace(_glossRe,(full,pre,term)=>{
      const key=_glossMap[term.toLowerCase()];
      if(!key) return full;
      return pre+'<span class="gloss-term" onclick="showGloss(event,\''+key+'\')">'+term+'<span class="gloss-i">ⓘ</span></span>';
    });
  }catch(e){ return esc(text); }
}
function showGloss(ev,key){
  if(ev){ ev.stopPropagation(); }
  const g=GLOSS.find(x=>x.k===key); if(!g) return;
  let el=document.getElementById('gloss-pop');
  if(!el){ el=document.createElement('div'); el.id='gloss-pop'; el.className='gloss-pop'; el.addEventListener('click',function(e){ if(e.target===el) closeGloss(); }); document.body.appendChild(el); }
  el.innerHTML='<div class="gloss-card"><div class="gloss-card-t">'+esc(g.t)+'</div><div class="gloss-card-b">'+esc(g.b)+'</div><button class="gloss-card-x" onclick="closeGloss()">Entendido</button></div>';
  el.classList.add('on');
}
function closeGloss(){ const el=document.getElementById('gloss-pop'); if(el) el.classList.remove('on'); }

function openExDetail(exId, forceCoachView){
  const inLib = DB.exercises.find(e=>e.id===exId);
  let ex = inLib;
  if(!ex){
    // Respaldo: ejercicio que NO está en la biblioteca de este usuario. Pasa cuando
    // el coach asigna un ejercicio propio (custom): su biblioteca ax_e no se sincroniza
    // al cliente, así que el cliente no lo tiene. Usamos el snapshot guardado en la
    // rutina activa / modo guiado para que la ficha abra igual y no quede "perdido".
    const pools=[ (typeof GM!=='undefined'&&GM.exercises)||[], (CUR.activeRoutine&&CUR.activeRoutine.exercises)||[] ];
    for(const p of pools){ const f=p.find(e=>e.id===exId); if(f){ ex=f; break; } }
  }
  if(!ex) return;
  // Solo editable (editor de entorno) si el ejercicio vive en la biblioteca.
  _showExSheet(ex, forceCoachView || CUR.loggedAs === 'coach', !!inLib);
}
// Busca un ejercicio de calentamiento por id en toda la WARMUP_LIBRARY.
function findWarmupEx(id){
  for(const k in WARMUP_LIBRARY){ const f = WARMUP_LIBRARY[k].find(e=>e.id===id); if(f) return f; }
  return null;
}
// Calentamiento: misma ficha (guía + video) que un ejercicio normal, para quien no
// conoce los nombres ("cat-cow", "band pull-apart"...). Pedido de Andrés 2026-05-30.
function openWarmupDetail(id){
  const w = findWarmupEx(id);
  if(!w) return;
  _showExSheet({ ...w, muscleLabel:'Calentamiento · movilidad', type:w.type||'Movilidad', sets:'—' }, CUR.loggedAs === 'coach', false); // calentamiento: no editable
}
function _showExSheet(ex, isCoach, editable){
  const color = MC[ex.muscle] || '#888';

  // Icon block
  const iconEl = document.getElementById('exd-icon');
  const heroEl = document.getElementById('exd-hero');
  const _exdImg = exImgSrc(ex);
  const _exdVid = exVidSrc(ex);
  iconEl.style.border = '1.5px solid ' + color + '40';
  if(_exdImg){
    // Si el ejercicio tiene VIDEO, lo reproducimos en loop (mudo, autoplay) con la
    // foto de poster (se ve al instante mientras carga). Si no, la foto normal.
    iconEl.innerHTML = _exdVid
      ? `<video class="exicon-vid" src="${_exdVid}" poster="${_exdImg}" data-name="${esc(ex.name)}" autoplay loop muted playsinline preload="metadata" style="cursor:zoom-in" onclick="event.stopPropagation();openExVid(this.src,this.dataset.name)"></video>`
      : exImgTag(_exdImg, ex.name);
    iconEl.style.background = 'none';
    iconEl.style.overflow = 'hidden';
    if(heroEl) heroEl.classList.add('has-photo');
  } else {
    iconEl.innerHTML = '';
    iconEl.innerHTML = muscleIcon(ex.muscle, 34);
    iconEl.style.background = color + '20';
    if(heroEl) heroEl.classList.remove('has-photo');
  }

  // Name & muscle label
  document.getElementById('exd-name').textContent = ex.name;
  document.getElementById('exd-muscle').textContent = ex.muscleLabel || ex.muscle;

  // Mapa muscular anatómico (sub-región por ejercicio). Solo si hay datos del músculo.
  const muscWrap = document.getElementById('exd-muscles-wrap');
  const muscEl = document.getElementById('exd-muscles');
  const hasMap = typeof muscleMapForExercise === 'function' && ex.id
    && (typeof exerciseMuscles === 'function' ? exerciseMuscles(ex.id) : true)
    && ex.muscle && ex.muscle !== 'cardio' && ex.muscle !== 'otro';
  if(hasMap){
    try{
      muscEl.innerHTML = muscleMapForExercise(ex.id, ex.muscle, { size: 168, gap: 14 });
      muscWrap.style.display = 'block';
    }catch(_){ muscWrap.style.display = 'none'; }
  } else { muscWrap.style.display = 'none'; }

  // Stats
  document.getElementById('exd-sets').textContent = ex.sets;
  document.getElementById('exd-reps').textContent = ex.reps;
  document.getElementById('exd-type').textContent = ex.type;

  // Simple description (shown to asesorado)
  const simpleWrap = document.getElementById('exd-simple-wrap');
  const simpleEl = document.getElementById('exd-simple');
  const simpleText = ex.descSimple || ex.desc || '';
  // Nunca dejar la guía vacía: si el ejercicio no trae texto, mostramos un mensaje
  // que orienta al asesorado (al video o al coach) en vez de ocultar la sección.
  simpleEl.innerHTML = glossarize(simpleText || 'Aún no hay una descripción escrita de este ejercicio. Toca “Ver en YouTube” abajo para ver la técnica, o pregúntale a tu coach.');
  simpleWrap.style.display = 'block';

  // Nota del coach (cue profesional corto, visible para el asesorado)
  const tipWrap = document.getElementById('exd-coachtip-wrap');
  const tipEl = document.getElementById('exd-coachtip');
  const tipText = ex.coachTip || (typeof EX_COACHTIP!=='undefined' && EX_COACHTIP[ex.id]) || '';
  if(tipText){ tipEl.innerHTML = glossarize(tipText); tipWrap.style.display = 'block'; }
  else { tipWrap.style.display = 'none'; }

  // YouTube query
  CUR_EX_YT_QUERY = ex.ytQuery || (ex.name + ' ejercicio tutorial');

  // Editor de entorno (solo coach, ejercicios de la biblioteca)
  CUR_EX_REF = (isCoach && editable) ? ex : null;
  const envWrap = document.getElementById('exd-env-wrap');
  if(CUR_EX_REF){ renderExEnvChips(); envWrap.style.display='block'; }
  else { envWrap.style.display='none'; }

  // Show sheet — SIEMPRE por encima de cualquier habitación (.sroom) abierta. La ficha vive
  // en z-index 900 pero las habitaciones están en 1400+, así que al abrir "Ver técnica y video"
  // DESDE una habitación, la ficha salía DETRÁS y parecía que el botón no hacía nada. Subimos
  // su z por encima de la habitación más alta que esté abierta (y la dejamos en CSS si no hay).
  const bg = document.getElementById('exdetail-bg');
  const openRooms = [...document.querySelectorAll('.sroom.on')].map(e => parseInt(getComputedStyle(e).zIndex) || 0);
  bg.style.zIndex = openRooms.length ? String(Math.max(...openRooms) + 10) : '';
  // La ficha empuja su PROPIA capa de historial (como las habitaciones): así el atrás físico
  // la cierra descontando SU capa y no la de la sala que tenga debajo (bug #7 auditoría
  // 2026-06-30: atrás desde "Ver técnica" dentro de una .sroom podía cerrar la app en TWA).
  if(!bg.classList.contains('on')) navOpenLayer();
  bg.classList.add('on');
  document.body.style.overflow = 'hidden';
}

// Chips editables del entorno del ejercicio en edición (CUR_EX_REF).
const ENV_OPTS = [['corporal','🤸 Peso corporal'],['casa','🏠 Casa'],['parque','🌳 Parque'],['gym','🏋️ Gym']];
function renderExEnvChips(){
  const ex = CUR_EX_REF; if(!ex) return;
  const env = ex.env || ['gym'];
  document.getElementById('exd-env-chips').innerHTML = ENV_OPTS.map(([code,lbl])=>{
    const on = env.includes(code);
    return `<button onclick="toggleExEnv('${code}')" style="font-size:12px;padding:5px 10px;border-radius:14px;cursor:pointer;border:1.5px solid ${on?'var(--g)':'var(--br)'};background:${on?'var(--gl)':'var(--w)'};color:${on?'var(--g)':'var(--t2)'};font-weight:${on?'700':'500'}">${on?'✓ ':''}${lbl}</button>`;
  }).join('');
}
function toggleExEnv(code){
  const ex = CUR_EX_REF; if(!ex) return;
  let env = Array.isArray(ex.env)?ex.env.slice():['gym'];
  if(env.includes(code)){
    if(env.length===1){toast('⚠️ Debe quedar al menos un entorno');return;}
    env = env.filter(x=>x!==code);
  } else { env.push(code); }
  // Orden canónico para consistencia
  ex.env = ['corporal','casa','parque','gym'].filter(x=>env.includes(x));
  sv('ax_e',DB.exercises);
  renderExEnvChips();
  toast(`✓ Entorno actualizado: ${ex.name}`);
}

function closeExDetail(e){
  if(e && e.target !== document.getElementById('exdetail-bg')) return;
  // Cierre por UI (tap en el fondo): la ficha tiene capa de historial propia → consumirla
  // con history.back(); el popstate llama _closeExDetail y descuenta la capa.
  navCloseLayer(_closeExDetail);
}
function _closeExDetail(){
  const bg = document.getElementById('exdetail-bg');
  bg.classList.remove('on');
  bg.style.zIndex = '';
  // Si quedó una habitación abierta debajo, mantener el scroll bloqueado (lo resincroniza
  // _syncRoomBodyClass); si no, liberar el body.
  if(typeof _syncRoomBodyClass === 'function') _syncRoomBodyClass();
  else document.body.style.overflow = '';
}

function openExYoutube(){
  const q = encodeURIComponent(CUR_EX_YT_QUERY);
  window.open('https://www.youtube.com/results?search_query=' + q, '_blank');
}

// Close sheet with swipe down
(function(){
  let startY = 0, sheet;
  document.addEventListener('DOMContentLoaded', ()=>{
    sheet = document.getElementById('exdetail-sheet');
    if(!sheet) return;
    sheet.addEventListener('touchstart', e=>{ startY = e.touches[0].clientY; }, {passive:true});
    sheet.addEventListener('touchend', e=>{
      // Swipe hacia abajo = cierre por UI → consumir la capa de historial de la ficha.
      if(e.changedTouches[0].clientY - startY > 80) navCloseLayer(_closeExDetail);
    }, {passive:true});
  });
})();

// ══════════════════════════════════════════
// MEMBRESÍA — DETALLE Y ACCIONES
// ══════════════════════════════════════════

function renderDetailMembership(id){
  const con=document.getElementById('d-membership');
  if(!con)return;
  const c=DB.clients.find(x=>x.id===id);
  if(!c){con.innerHTML='';return;}
  const st=MS.getStatus(c);
  const badge=MS.badge(st);
  const pays=(c.payments||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  const last=pays[0]||null;

  // Fecha de vencimiento legible
  let dueStr='—', dateStr='—', daysLeftStr='';
  if(last){
    dateStr=new Date(last.date).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'});
    const due=new Date(last.dueDate);
    dueStr=due.toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'});
    const daysLeft=Math.ceil((due-Date.now())/86400000);
    if(daysLeft>=0) daysLeftStr=`<span style="font-size:11px;color:var(--t2)">${daysLeft} día${daysLeft!==1?'s':''} restante${daysLeft!==1?'s':''}</span>`;
    else daysLeftStr=`<span style="font-size:11px;color:var(--rd)">${Math.abs(daysLeft)} día${Math.abs(daysLeft)!==1?'s':''} vencido${Math.abs(daysLeft)!==1?'s':''}</span>`;
  }

  // Descuento ganado este ciclo (gamificación) — el coach lo honra MANUAL al renovar.
  // Misma lógica que ve el asesorado en su perfil, para que ambos vean lo mismo.
  const hist=(DB.history||{})[id]||[];
  const disc=gxDiscount(c,hist);
  let discHTML='';
  if(disc){
    const adhPct=Math.round(disc.adh*100);
    const nt=gxNextTier(disc);
    const sub=disc.pct>0
      ?`Ganado por constancia este ciclo · ${disc.done}/${disc.expected} sesiones (${adhPct}%).`
      :`Sin descuento aún este ciclo · ${disc.done}/${disc.expected} sesiones (${adhPct}%).`;
    const ntTxt=nt?` Le ${nt.need===1?'falta':'faltan'} ${nt.need} para ${nt.pct}%.`:' ¡Ciclo perfecto! 🏆';
    discHTML=`<div style="display:flex;align-items:center;gap:13px;padding:13px 15px;background:#FBF4DC;border:1px solid #EBDDA8;border-radius:var(--rsm);margin-bottom:14px">
      <div style="font-size:28px;font-weight:900;color:#9A7B16;line-height:1;flex-shrink:0;min-width:54px;text-align:center">${disc.pct}%</div>
      <div>
        <div style="font-size:12px;font-weight:800;color:var(--t1)">🎁 Descuento a aplicar en su renovación</div>
        <div style="font-size:11.5px;color:var(--t2);margin-top:2px;line-height:1.4">${sub}${ntTxt}</div>
      </div>
    </div>`;
  }

  // Historial últimos 5 pagos
  let histHTML='';
  if(pays.length){
    histHTML='<div style="font-size:11px;font-weight:700;color:var(--t3);letter-spacing:.5px;text-transform:uppercase;margin-bottom:10px">Historial de pagos</div>';
    pays.slice(0,5).forEach((p,i,arr)=>{
      const d=new Date(p.date).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'});
      const dd=new Date(p.dueDate).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'});
      const amt=p.amount?'$'+Number(p.amount).toLocaleString('es-CO'):'—';
      const isLast=i===arr.slice(0,5).length-1;
      histHTML+=`<div style="display:flex;justify-content:space-between;align-items:center;padding:11px 14px;background:var(--bg);border-radius:var(--rsm);${isLast?'':'margin-bottom:7px'}">
        <div>
          <div style="font-size:14px;font-weight:800;color:var(--t1)">${amt}</div>
          <div style="font-size:12px;color:var(--t2);margin-top:2px">Pagado: ${d} · Vence: ${dd}</div>
          ${p.note?`<div style="font-size:11px;color:var(--t3);font-style:italic;margin-top:2px">${esc(p.note)}</div>`:''}
        </div>
        <div style="background:var(--gl);border-radius:8px;padding:6px 8px;font-size:16px;flex-shrink:0">💳</div>
      </div>`;
    });
  }else{
    histHTML='<div style="font-size:13px;color:var(--t3);text-align:center;padding:16px 0">Sin pagos registrados</div>';
  }

  // Botones acción
  const suspLabel=c.suspended?'Reactivar':'Suspender';
  const suspClass=c.suspended?'btn bg':'btn bd';
  const whatsappBtn=(st==='overdue'||st==='expiring')
    ?`<button class="btn bo bsm" onclick="whatsappReminder('${id}')">WhatsApp</button>`
    :'';

  con.innerHTML=`
    <div class="card">
      <div class="ch">
        <div>
          <div class="ctitle">💳 Membresía</div>
          <div style="font-size:12px;color:var(--t2);margin-top:3px">Último pago: ${dateStr} · Vence: ${dueStr}</div>
          ${daysLeftStr?`<div style="margin-top:4px">${daysLeftStr}</div>`:''}
        </div>
        <span style="background:${badge.bg};color:${badge.color};font-size:11px;font-weight:700;padding:5px 12px;border-radius:20px;white-space:nowrap;flex-shrink:0">${badge.label}</span>
      </div>
      <div class="cb">
        ${discHTML}
        ${histHTML}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
          <button class="btn bp bsm" onclick="openPaymentModal('${id}')">+ Registrar pago</button>
          <button class="${suspClass} bsm" onclick="toggleSuspend('${id}')">${suspLabel}</button>
          ${whatsappBtn}
        </div>
      </div>
    </div>`;
}

function openPaymentModal(id){
  CUR.paymentClientId=id;
  const today=new Date().toISOString().split('T')[0];
  const due=new Date(Date.now()+30*86400000).toISOString().split('T')[0];
  document.getElementById('pay-amount').value='';
  document.getElementById('pay-date').value=today;
  document.getElementById('pay-due').value=due;
  document.getElementById('pay-note').value='';
  document.getElementById('pay-err').style.display='none';
  om('m-payment');
}
function payDateChanged(){
  const d=document.getElementById('pay-date').value;
  if(!d)return;
  const due=new Date(new Date(d+'T12:00').getTime()+30*86400000).toISOString().split('T')[0];
  document.getElementById('pay-due').value=due;
}

function registerPayment(){
  const id=CUR.paymentClientId;
  if(!id)return;
  const c=DB.clients.find(x=>x.id===id);
  if(!c)return;
  const amount=parseFloat(document.getElementById('pay-amount').value)||0;
  const dateVal=document.getElementById('pay-date').value;
  const dueVal=document.getElementById('pay-due').value;
  const note=document.getElementById('pay-note').value.trim();
  const errEl=document.getElementById('pay-err');
  if(!dateVal||!dueVal){
    errEl.textContent='Las fechas de pago y vencimiento son obligatorias.';
    errEl.style.display='block';
    return;
  }
  if(new Date(dueVal)<=new Date(dateVal)){
    errEl.textContent='La fecha de vencimiento debe ser posterior al pago.';
    errEl.style.display='block';
    return;
  }
  if(!c.payments)c.payments=[];
  c.payments.push({
    date:new Date(dateVal+'T12:00').toISOString(),
    dueDate:new Date(dueVal+'T12:00').toISOString(),
    amount:amount||0,
    note:note
  });
  // Si estaba suspendido y se registra pago, reactivar
  if(c.suspended)c.suspended=false;
  sv('ax_c',DB.clients);
  cm('m-payment');
  renderDetailMembership(id);
  renderClients();
  renderHome();
  toast('Pago registrado correctamente');
}

function toggleSuspend(id){
  const c=DB.clients.find(x=>x.id===id);
  if(!c)return;
  c.suspended=!c.suspended;
  sv('ax_c',DB.clients);
  renderDetailMembership(id);
  renderClients();
  renderHome();
  toast(c.suspended?'Asesorado suspendido':'Asesorado reactivado');
}

function whatsappReminder(id){
  const c=DB.clients.find(x=>x.id===id);
  if(!c)return;
  const pays=(c.payments||[]).slice().sort((a,b)=>new Date(b.dueDate)-new Date(a.dueDate));
  const last=pays[0];
  let dueStr='pronto';
  if(last){
    dueStr=new Date(last.dueDate).toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'});
  }
  const nombre=c.name.split(' ')[0];
  const amount=last&&last.amount?` ($${last.amount.toLocaleString('es-CO')} COP)`:'';
  const msg=`Hola ${nombre} 👋, tu plan en AVI vence el ${dueStr}${amount}. Renuévalo hoy y no pierdas tu progreso 💪 — responde aquí o escríbeme directamente.`;
  const phone=c.phone?(c.phone.replace(/\D/g,'')):'';
  const url=phone
    ?`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    :`https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url,'_blank');
}

// Empujón de entrenamiento por WhatsApp (adherencia, no pago). Mensaje cálido según
// si nunca entrenó o si dejó de venir. Ver vista de adherencia (banner del home).
function whatsappNudge(id){
  const c=DB.clients.find(x=>x.id===id);
  if(!c)return;
  const nombre=c.name.split(' ')[0];
  const nunca=!((DB.history[c.id]||[])[0]);
  const msg=nunca
    ?`Hola ${nombre} 👋 ¿Cómo vas? Vi que aún no has hecho tu primer entrenamiento en AVI. ¿Te ayudo a arrancar? Cualquier duda, aquí estoy 💪`
    :`Hola ${nombre} 👋 ¿Cómo vas? Hace unos días no te veo entrenar y no quiero que pierdas el ritmo que llevabas 💪 ¿Todo bien? Si necesitas ajustar la rutina o tienes alguna molestia, escríbeme.`;
  const phone=c.phone?(c.phone.replace(/\D/g,'')):'';
  const url=phone
    ?`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    :`https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url,'_blank');
}
