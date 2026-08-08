// ══════════════ PLAN NUTRICIONAL ══════════════


const NUT_TEMPLATES=[
  {label:'Cutting 🔻',goal:'cutting',prot:160,carbs:160,fat:55,water:10,meals:'4',
   plan:'Déficit calórico moderado para perder grasa preservando músculo.\nPrioriza proteína en cada comida.',
   examples:'Desayuno: 3 claras + 1 huevo revuelto con avena y fruta\nAlmuerzo: Arroz integral, pechuga a la plancha y ensalada\nMerienda: Yogur griego con frutas\nCena: Sopa de verduras con atún al natural',
   avoid:'Azúcares simples, frituras, bebidas azucaradas, alcohol'},
  {label:'Volumen 💪',goal:'volumen',prot:180,carbs:380,fat:80,water:12,meals:'5',
   plan:'Superávit calórico limpio para ganar masa muscular con mínima grasa.\nDistribuye las comidas cada 3-4 horas.',
   examples:'Desayuno: Avena con leche, banano y 3 huevos revueltos\nMerienda AM: Batido de proteína con avena y mantequilla de maní\nAlmuerzo: Arroz, pasta o papa + carne roja o pollo + aguacate\nMerienda PM: Yogur griego con granola y frutas\nCena: Pollo o atún con camote y brócoli',
   avoid:'Comida chatarra, azúcares procesados en exceso'},
  {label:'Mantenimiento ⚖️',goal:'mantenimiento',prot:150,carbs:270,fat:75,water:9,meals:'3',
   plan:'Balance calórico para mantener el peso y la composición corporal actual.\nCome variado y equilibrado.',
   examples:'Desayuno: Huevos, tostadas integrales y fruta\nAlmuerzo: Proteína + carbohidrato complejo + vegetales\nCena: Proteína ligera con ensalada abundante',
   avoid:'Exceso de ultraprocesados y azúcares refinados'},
  {label:'Definición 🔥',goal:'definicion',prot:175,carbs:185,fat:60,water:11,meals:'4',
   plan:'Déficit moderado con alta proteína para definir músculo y perder grasa.\nIdeal para quienes ya tienen base muscular.',
   examples:'Desayuno: Claras de huevo, avena y café sin azúcar\nAlmuerzo: Pollo o pescado, arroz integral y vegetales al vapor\nMerienda: Atún con galletas de arroz\nCena: Ensalada grande con proteína magra',
   avoid:'Sodio en exceso, alcohol, azúcares, grasas saturadas'},
  // La recomposición NECESITA su propia plantilla, no solo su rótulo: `_nutSwapTemplateText`
  // busca los textos por clave de objetivo, y sin esta entrada un plan de recomposición se
  // quedaba con el texto de «mantenimiento» — el defecto de v437 con otra cara.
  {label:'Recomposición 🔄',goal:'recomposicion',prot:180,carbs:250,fat:70,water:10,meals:'4',
   plan:'Mantenimiento calórico con la proteína alta: comes lo que gastas.\nEl peso puede quedarse igual — lo que cambia es de qué está hecho.\nMide la cintura cada 3 semanas, no la balanza todos los días.',
   examples:'Desayuno: Huevos con arepa y fruta\nAlmuerzo: Arroz, carne o pollo, fríjol y ensalada\nMerienda: Yogur griego con maní\nCena: Proteína magra con verduras y un carbohidrato pequeño',
   avoid:'Saltarse comidas, alcohol en exceso, ultraprocesados'},
];

function applyNutTemplate(idx){
  const t=NUT_TEMPLATES[idx];if(!t)return;
  // 🔴 El titular se DERIVA de sus macros, NUNCA se guarda aparte (regla de v435/v444).
  // Las plantillas cargaban su propio `kcal` y cuatro de las cinco no cuadraban con sus
  // propios gramos: la de Volumen por **240 kcal**, que es EXACTAMENTE el desfase del plan
  // de Nataly que se cazo en v435. O sea que la causa raiz nunca fue su plan: era este
  // boton. Y el remate: como el plato se arma con los MACROS, el asesorado leia 2.960
  // mientras el coach habia escrito 3.200, y encima la ficha le saltaba al coach con
  // «tu plan dice 3.200 pero sus macros suman 2.960» — la app culpandolo de haber pulsado
  // nuestro propio boton. Los gramos NO se tocan (esos son de Andres); se borra el numero
  // que sobraba. Hallazgo de Isabella auditando v449.
  document.getElementById('nut-kcal').value=nutMacroKcal(t);
  document.getElementById('nut-prot').value=t.prot;
  document.getElementById('nut-carbs').value=t.carbs;
  document.getElementById('nut-fat').value=t.fat;
  document.getElementById('nut-water').value=t.water;
  document.getElementById('nut-meals').value=t.meals;
  document.getElementById('nut-goal').value=t.goal||'';
  document.getElementById('nut-plan').value=t.plan;
  document.getElementById('nut-examples').value=t.examples;
  document.getElementById('nut-avoid').value=t.avoid;
  document.getElementById('nut-calc-nota').style.display='none';
  nutGoalCheck();   // una plantilla genérica sobre una persona concreta puede contradecirla
}

function openNutModal(){
  const c=DB.clients.find(x=>x.id===CUR.clientId);if(!c)return;
  document.getElementById('m-nut-cn').textContent=c.name;
  const nut=(DB.nutrition||{})[CUR.clientId]||{};
  document.getElementById('nut-kcal').value=nut.kcal||'';
  document.getElementById('nut-prot').value=nut.prot||'';
  document.getElementById('nut-carbs').value=nut.carbs||'';
  document.getElementById('nut-fat').value=nut.fat||'';
  document.getElementById('nut-meals').value=nut.meals||'3';
  document.getElementById('nut-goal').value=nut.goal||'';
  document.getElementById('nut-plan').value=nut.plan||'';
  document.getElementById('nut-avoid').value=nut.avoid||'';
  document.getElementById('nut-water').value=nut.water||'';
  document.getElementById('nut-examples').value=nut.examples||'';
  if(!nut.kcal && !nut.plan) nutFillSuggested(c,true);
  else {
    const nota=document.getElementById('nut-calc-nota');
    if(nota)nota.style.display='none';
    nutGoalCheck();   // un plan YA guardado que se contradice se delata al abrirlo
  }
  om('m-nut');
}

// ── v436: EL FORMULARIO CALCULA CON EL MISMO MOTOR QUE LA APP ──────────────────
// 🔴 `calcMacrosSugeridos` era una CUARTA cuenta, distinta de la que la app entrega, y hacía sobre
// el PESO TOTAL lo que el motor ya corrige desde v428 (por encima de IMC 30 la proteína y la grasa
// van sobre peso de REFERENCIA, o no queda espacio para nada más). Medido 2026-08-04: a Kathe
// (IMC 32) le proponía 2.710 kcal cuando le corresponden 1.930, y a Luz (IMC 33,7) 2.602 contra
// 1.730 — a las dos, con objetivo de PERDER GRASA, les proponía comer POR ENCIMA de su gasto.
// El prefill pasa a `nutritionEstimate`, que es exactamente lo que come quien no tiene plan escrito.
function nutFillSuggested(c,silencioso){
  const est=(typeof nutritionEstimate==='function')?nutritionEstimate(c,_nutPesoDe(c)):null;
  const nota=document.getElementById('nut-calc-nota');
  if(!est||!est.macros){
    if(nota){nota.style.display='block';nota.innerHTML='&#9888;&#65039; Faltan datos del cuerpo (peso, estatura, edad o sexo) para calcularle el plan. Compl&eacute;talos en su perfil.';}
    return false;
  }
  const m=est.macros;
  document.getElementById('nut-kcal').value=est.kcalObj;
  document.getElementById('nut-prot').value=m.prot_g;
  document.getElementById('nut-carbs').value=m.carb_g;
  document.getElementById('nut-fat').value=m.fat_g;
  if(est.water)document.getElementById('nut-water').value=est.water;
  // ── v437: EL RÓTULO VA CON LOS NÚMEROS ──────────────────────────────────────────────────
  // «Generar» calculó para el objetivo de ESTA persona, así que el objetivo del PLAN —el que le
  // explica el «por qué» al asesorado— se fija aquí mismo. Antes solo se tocaban las cifras:
  // medido en producción el 2026-08-05, Kathe y Luz (objetivo «Perder grasa») quedaron con el
  // rótulo «mantenimiento» de una plantilla vieja y su pantalla les decía «estás comiendo en
  // balance: lo que gastas» encima de un déficit real de 500 kcal/día.
  const goalKey=nutGoalForClient(c.goal,c);
  document.getElementById('nut-goal').value=goalKey;
  _nutSwapTemplateText(goalKey);
  if(nota){
    nota.style.display='block';
    nota.innerHTML='&#128161; Calculado para <strong>'+esc(c.name)+'</strong>: gasta ~<strong>'+est.tdee+' kcal</strong> al d&iacute;a y su objetivo es <strong>'+esc(c.goal||'salud general')+'</strong>. Revisa y ajusta antes de guardar &mdash; AVI propone, t&uacute; apruebas.';
  }
  if(!silencioso&&typeof toast==='function')toast('Plan propuesto — revísalo y guarda');
  nutGoalCheck();
  return true;
}
// Los textos de plantilla (plan / ejemplos / evitar) son NUESTROS, no del coach: si quedaron de
// una plantilla de OTRO objetivo, se cambian por los del objetivo que corresponde. Lo que él
// escribió a mano (cualquier texto que no sea verbatim de una plantilla) NO se toca — se le
// AVISA con `nutGoalCheck` y decide él. Filtrar y marcar son cosas distintas.
function _nutSwapTemplateText(goalKey){
  const t=NUT_TEMPLATES.find(x=>x.goal===goalKey); if(!t)return false;
  let cambio=false;
  [['nut-plan','plan'],['nut-examples','examples'],['nut-avoid','avoid']].forEach(function(par){
    const el=document.getElementById(par[0]); if(!el)return;
    const v=(el.value||'').trim();
    const esNuestro=(v==='')||NUT_TEMPLATES.some(x=>(x[par[1]]||'').trim()===v);
    if(!esNuestro)return;
    const nuevo=t[par[1]]||'';
    if(v!==nuevo.trim()){el.value=nuevo;cambio=true;}
  });
  return cambio;
}
// ⚠️ MARCAR, no filtrar: si el rótulo del plan contradice las calorías escritas, se avisa —
// nadie le quita opciones al coach. El oráculo es `inferNutGoal`, la MISMA función que decide
// qué explicación ve el asesorado, así que el aviso dice exactamente lo que él va a leer.
function nutGoalCheck(){
  const nota=document.getElementById('nut-goal-nota'); if(!nota)return;
  const apagar=function(){nota.style.display='none';nota.innerHTML='';};
  const c=(DB.clients||[]).find(x=>x.id===CUR.clientId); if(!c)return apagar();
  const est=(typeof nutritionEstimate==='function')?nutritionEstimate(c,_nutPesoDe(c)):null;
  if(!est||!est.tdee)return apagar();
  const kcal=parseInt(document.getElementById('nut-kcal').value)||0;
  // El oráculo pasa por el MISMO candado que la pantalla de ella: si es menor, el rótulo de
  // composición corporal no le llega, y el aviso al coach tiene que decir lo que ella VA A LEER
  // — calcularlo con otra función es cómo el coach acaba aprobando una cosa y su asesorada
  // leyendo otra (lección de v437).
  const efectivo=nutWhyKey({
    goal:document.getElementById('nut-goal').value,
    plan:document.getElementById('nut-plan').value,
    avoid:document.getElementById('nut-avoid').value
  },c);
  const mm=nutGoalMismatch(efectivo,kcal,est.tdee); if(!mm)return apagar();
  const DIR={deficit:'un d&eacute;ficit',superavit:'un super&aacute;vit',balance:'un balance'};
  const titulo=(GOAL_WHY[efectivo]||{}).title||efectivo;
  nota.style.display='block';
  nota.innerHTML='&#9888;&#65039; A '+esc(c.name)+' la app le va a explicar <strong>'+esc(titulo)+
    '</strong>, pero gasta ~<strong>'+est.tdee+' kcal</strong> al d&iacute;a y el plan le da <strong>'+
    kcal+'</strong> &mdash; eso es <strong>'+DIR[mm.real]+'</strong>. Ajusta el objetivo o las calor&iacute;as.';
}
// El peso que manda es el ÚLTIMO registrado, no el del perfil (que envejece). Quién es «el
// último» lo decide `nutWeightFor` (avi-core) POR FECHA — aquí vivía un `bw[bw.length-1]` que
// leía el registro MÁS VIEJO, porque el arreglo se guarda en orden descendente.
function _nutPesoDe(c){
  return nutWeightFor(c,(DB.bodyweight||{})[c&&c.id]);
}
// «✨ Generar plan»: rellena el formulario con lo que le corresponde a ESTA persona, aunque ya
// tenga plan. No guarda nada — el coach revisa y aprueba, igual que con las rutinas.
function nutGenerate(){
  const c=DB.clients.find(x=>x.id===CUR.clientId); if(!c)return;
  nutFillSuggested(c,false);
}

function saveNutrition(){
  const clientId=CUR.clientId;if(!clientId)return;
  if(!DB.nutrition)DB.nutrition={};
  DB.nutrition[clientId]={
    kcal:parseInt(document.getElementById('nut-kcal').value)||0,
    prot:parseInt(document.getElementById('nut-prot').value)||0,
    carbs:parseInt(document.getElementById('nut-carbs').value)||0,
    fat:parseInt(document.getElementById('nut-fat').value)||0,
    meals:document.getElementById('nut-meals').value,
    goal:document.getElementById('nut-goal').value,
    plan:document.getElementById('nut-plan').value.trim(),
    avoid:document.getElementById('nut-avoid').value.trim(),
    water:parseInt(document.getElementById('nut-water').value)||0,
    examples:document.getElementById('nut-examples').value.trim(),
    updatedAt:new Date().toISOString()
  };
  sv('ax_nut',DB.nutrition);
  cm('m-nut');renderNutritionCoach(clientId);
  // En el propio entrenamiento del coach (COACH_SELF) la vista visible es la del
  // asesorado, as\u00ed que refrescamos tambi\u00e9n ese render para que el cambio se vea.
  if(typeof renderNutritionClient==='function')renderNutritionClient(clientId);
  toast('\u2705 Plan nutricional guardado');
}

function renderNutritionCoach(clientId){
  const con=document.getElementById('d-nut-preview');if(!con)return;
  const nut=(DB.nutrition||{})[clientId];
  if(!nut||(!nut.kcal&&!nut.plan)){con.innerHTML='<span style="color:var(--t3)">Sin plan asignado.</span>';return;}
  let html='';
  if(nut.kcal||nut.prot||nut.carbs||nut.fat){
    html+=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
      ${nut.kcal?`<div style="text-align:center;background:var(--gl);border-radius:var(--rsm);padding:8px 4px"><div style="font-size:18px;font-weight:800;color:var(--gt)">${esc(String(nut.kcal))}</div><div style="font-size:10px;color:var(--t2)">kcal</div></div>`:''}
      ${nut.prot?`<div style="text-align:center;background:var(--bll);border-radius:var(--rsm);padding:8px 4px"><div style="font-size:18px;font-weight:800;color:var(--blt)">${esc(String(nut.prot))}g</div><div style="font-size:10px;color:var(--t2)">prot</div></div>`:''}
      ${nut.carbs?`<div style="text-align:center;background:var(--yll);border-radius:var(--rsm);padding:8px 4px"><div style="font-size:18px;font-weight:800;color:var(--t1)">${esc(String(nut.carbs))}g</div><div style="font-size:10px;color:var(--t2)">carbs</div></div>`:''}
      ${nut.fat?`<div style="text-align:center;background:var(--orl);border-radius:var(--rsm);padding:8px 4px"><div style="font-size:18px;font-weight:800;color:var(--ort)">${esc(String(nut.fat))}g</div><div style="font-size:10px;color:var(--t2)">grasas</div></div>`:''}
    </div>`;
  }
  if(nut.meals)html+=`<div style="font-size:12px;color:var(--t2);margin-bottom:8px">\uD83C\uDF7D\ufe0f ${esc(String(nut.meals))} comidas/d\u00eda</div>`;
  if(nut.water)html+=`<div style="font-size:12px;color:var(--t2);margin-bottom:8px">\uD83D\uDCA7 ${esc(String(nut.water))} vasos de agua/d\u00eda</div>`;
  if(nut.plan)html+=`<div style="white-space:pre-line;font-size:13px;line-height:1.7">${esc(nut.plan)}</div>`;
  if(nut.avoid)html+=`<div style="margin-top:10px;background:var(--rdl);border-radius:var(--rsm);padding:8px 12px;font-size:12px;color:var(--rdt)">\u26a0\ufe0f Evitar: ${esc(nut.avoid)}</div>`;
  con.innerHTML=html;
}

// Estado de los "Ejemplos de alimentación" colapsables (dentro de la sesión).

// Fichas educativas de cada nutriente. Lenguaje simple, enfocado al entrenamiento
// (audiencia = asesorado no técnico). Se abren al tocar una tarjeta del plan.
const NUTRI_INFO={
  kcal:{emoji:'🔥',title:'Calorías',tag:'Tu energía del día',
    what:'Es la energía que tu cuerpo saca de la comida, como la gasolina de un carro.',
    why:'Es el total de energía que debes comer al día para lograr tu objetivo. Si comes de más, subes de peso; de menos, bajas. Tu coach calculó este número para ti.',
    where:'Todos los alimentos aportan calorías. Las "vacías" (gaseosa, fritos, dulces) llenan pero no nutren — prioriza comida real.'},
  prot:{emoji:'🍗',title:'Proteína',tag:'Construye y repara músculo',
    what:'Es el material con el que tu cuerpo construye y repara el músculo.',
    why:'Recupera el músculo después de entrenar, te mantiene lleno por más tiempo y cuida tu masa muscular cuando estás bajando de peso. Es el macro más importante para verte fuerte.',
    where:'Huevo, pollo, carne magra, pescado, atún, yogur griego, queso, lentejas, fríjoles y proteína en polvo.'},
  carbs:{emoji:'🍚',title:'Carbohidratos',tag:'Tu combustible para entrenar',
    what:'Son la fuente principal de energía rápida de tu cuerpo.',
    why:'Te dan fuerza para entrenar duro y mantienen tu cerebro funcionando. Llenan tus músculos de energía para rendir en cada serie.',
    where:'Arroz, papa, yuca, plátano, avena, pan, pasta y frutas. Prefiere los integrales y las frutas por encima del azúcar y las harinas refinadas.'},
  fat:{emoji:'🥑',title:'Grasas',tag:'Esenciales — no son el enemigo',
    what:'Son un nutriente que tu cuerpo necesita para vivir. No engordan por sí solas.',
    why:'Regulan tus hormonas (incluida la testosterona), ayudan a absorber vitaminas y te dan energía de larga duración.',
    where:'Aguacate, huevo, frutos secos (maní, almendras), aceite de oliva, salmón y semillas. Evita las grasas de frituras y ultraprocesados.'},
  water:{emoji:'💧',title:'Agua',tag:'Tu cuerpo es ~60% agua',
    what:'Sin suficiente agua, nada en tu cuerpo funciona bien.',
    why:'Mejora tu rendimiento, evita calambres, ayuda a la digestión y a que el músculo se recupere. Tomar poca te hace rendir menos sin que te des cuenta.',
    where:'El agua simple es lo mejor. También suman frutas y verduras con mucha agua (sandía, pepino). Limita gaseosas y jugos azucarados.'},
};
// El "por qué" del plan según el objetivo. Lo ve el asesorado encima de su plan.
const GOAL_WHY={
  volumen:{title:'🔼 Volumen / Superávit',
    text:'Estás en superávit calórico: comes un poco más de lo que gastas. Ese extra, sumado a entrenar con buena carga y a descansar bien, es la materia prima con la que tu cuerpo construye músculo nuevo y gana fuerza. Por eso subimos la proteína (el material con que se repara y crece el músculo) y los carbohidratos (la energía para empujar fuerte en cada serie y recuperarte). Sin ese excedente, tu cuerpo no tiene de dónde sacar para crecer.'},
  definicion:{title:'🔥 Definición / Déficit',
    text:'Estás en déficit calórico: comes un poco menos de lo que gastas, así tu cuerpo tira de la grasa guardada como energía. Mantenemos la proteína alta para que, mientras pierdes grasa, conserves el músculo que ya construiste. Ajustamos los carbohidratos para que tengas energía de entrenar sin frenar la pérdida. Clave: el déficit es moderado — uno muy agresivo te hace perder músculo y fuerza.'},
  cutting:{title:'🔻 Cutting / Pérdida de grasa',
    text:'El objetivo es perder grasa cuidando tu músculo. Comes algo menos de lo que gastas (déficit), pero mantenemos la proteína alta para no perder lo ganado y para llegar más lleno a cada comida. El entrenamiento de fuerza le dice a tu cuerpo "conserva este músculo"; la dieta hace el resto.'},
  mantenimiento:{title:'⚖️ Mantenimiento / Salud general',
    text:'Estás comiendo en balance: lo que gastas. El objetivo no es subir ni bajar, sino sostener tu composición, sentirte con energía y crear hábitos sostenibles. Comida variada, suficiente proteína para cuidar el músculo y carbohidratos para rendir en el día a día.'},
  // 🔴 Rótulo PROPIO de la recomposición (dictamen de Andrés Hyp, punto 4). Antes caía en
  // `mantenimiento`, cuyo texto dice «el objetivo no es subir ni bajar, sino SOSTENER tu
  // composición» — la negación exacta de lo que es una recomposición, que existe justamente para
  // cambiarla. Redactado por Sofía sobre el contenido que firmó Andrés; no agregar promesas.
  // El título sigue el patrón «término / traducción» de sus cuatro hermanas — y era el único que
  // no lo hacía, siendo la palabra más difícil de las cinco. Y el cuerpo dice «PUEDE quedarse
  // igual», que es lo que firmó Andrés: la versión anterior («con el mismo número en la pesa»)
  // lo afirmaba como un hecho y además se contradecía con el texto de la plantilla dos líneas
  // más abajo, en la misma pantalla. Las dos correcciones son de Sofía.
  recomposicion:{title:'🔄 Recomposición / Cambiar grasa por músculo',
    text:'Comes lo que gastas: ni más ni menos. Lo que sube es la proteína, porque aquí el objetivo no es que la balanza baje — es que cambie de qué está hecho ese peso: menos grasa y más músculo. Tu peso puede quedarse igual, y eso está bien. Por eso la balanza sola te va a confundir; lo que sí te va a mostrar el cambio es la cintura: mídetela cada 3 semanas y compárala, en vez de pesarte todos los días.'},
};
// inferNutGoal → avi-core.js (fuente única, testeada). GOAL_WHY (texto del "por qué")
// se queda aquí porque es data de presentación que usa renderNutritionClient.
// El mapa objetivo-del-cliente → clave de GOAL_WHY vive en avi-core (`nutGoalForClient`), que es
// la MISMA que usa «✨ Generar» para rotular el plan. Estaba duplicado aquí como GOAL_WHY_KEY.
// ¿El coach guardó un plan nutricional? Fuente ÚNICA para card/room/share — antes cada uno
// usaba una definición distinta y un plan SOLO con macros (sin kcal/plan/examples) se trataba
// como "sin plan" → se mostraba la estimación automática encima del plan real del coach.
// Bug Clase 4 auditoría 2026-06-30.
function _hasCoachNutPlan(nut){ return !!(nut&&(nut.kcal||nut.plan||nut.examples||nut.prot||nut.carbs||nut.fat||nut.water||nut.meals)); }
// Ideas para armar el plato (contexto colombiano) + tips prácticos. Llenan la
// habitación de Nutrición cuando el cliente solo tiene la estimación automática.
const NUT_PLATE=[
  {ic:'🍗',h:'Proteína · en cada comida',t:'Huevo, pollo, carne magra, pescado, atún, lentejas, fríjol, queso campesino, yogurt griego, proteína en polvo.'},
  {ic:'🍚',h:'Carbohidratos · tu energía',t:'Arroz, papa, yuca, plátano, avena, arepa, pasta, pan integral, fruta. Pon más alrededor de tu entrenamiento.'},
  {ic:'🥑',h:'Grasas saludables · poco y bueno',t:'Aguacate, aceite de oliva, maní, almendras, semillas, huevo entero. Pequeñas cantidades, mucho valor.'},
  {ic:'🥗',h:'Vegetales y fibra · libres',t:'Tomate, lechuga, espinaca, brócoli, zanahoria, pepino. Sacian, cuidan tu digestión y casi no suman calorías.'},
];
const NUT_TIPS=[
  '💧 Toma agua a lo largo del día, no toda de golpe. Muchas veces la sed se confunde con hambre.',
  '🍗 Reparte la proteína en todas tus comidas, no toda en una. Así tu cuerpo la aprovecha mejor para construir músculo.',
  '🥗 Llena medio plato de vegetales: te sacian, cuidan tu digestión y casi no suman calorías.',
  '📆 La constancia le gana a la perfección. Un día no define tu progreso; tu semana sí.',
];
function openNutriInfo(key){
  const d=NUTRI_INFO[key]; if(!d)return;
  const body=document.getElementById('m-nutri-body'); if(!body)return;
  body.innerHTML=`<div style="text-align:center;margin-bottom:16px;padding-top:6px">
      <div style="font-size:42px;line-height:1">${d.emoji}</div>
      <div class="mdtitle" style="margin:6px 0 2px">${d.title}</div>
      <div style="font-size:12px;color:var(--gt);font-weight:700">${d.tag}</div>
    </div>
    <div class="nutri-sec"><div class="nutri-h">¿Qué es?</div><div class="nutri-p">${d.what}</div></div>
    <div class="nutri-sec"><div class="nutri-h">¿Para qué te sirve?</div><div class="nutri-p">${d.why}</div></div>
    <div class="nutri-sec"><div class="nutri-h">¿Dónde lo encuentras?</div><div class="nutri-p">${d.where}</div></div>`;
  om('m-nutri-info');
}
// ── Calculadora nutricional automática (Premium): estima kcal + macros desde los
// datos del cliente (Mifflin-St Jeor → TDEE → objetivo por meta → macros). Para
// quien NO tiene plan escrito por un coach (self-serve). Reusa nutritionEstimate (core).
const _NUT_ACTS=[[1.2,'Sedentario'],[1.375,'Ligero'],[1.55,'Moderado'],[1.725,'Activo'],[1.9,'Muy activo']];
function setNutActivity(f){
  const c=_curClient();if(!c)return;
  c.activityFactor=f;sv('ax_c',DB.clients);
  renderNutritionClient(c.id);
  const nr=document.getElementById('nutrition-room');
  if(nr&&nr.classList.contains('on'))openNutritionRoom(c.id);
}
function nutCalcHTML(c){
  // El peso que manda es el ULTIMO registrado, no el de la ficha (que envejece). Estas tres
  // superficies se quedaron llamando sin peso: en Samuel eran 78 kg de ficha contra 86 reales,
  // o sea 138 kcal y 17 g de proteina de diferencia ENTRE PANTALLAS DE LA MISMA APP.
  // Cuarta superficie de la familia de v435/v444 (hallazgo de Andres Hyp, 2026-08-05).
  const est=nutritionEstimate(c,_nutPesoDe(c));
  if(!est){
    return `<div style="text-align:center;padding:22px 14px">
      <div style="margin-bottom:8px;color:var(--g2)">${typeof aviIcon==='function'?aviIcon('apple',34):'🍎'}</div>
      <div style="font-size:15px;font-weight:800;color:var(--t1);margin-bottom:6px">Calculadora nutricional</div>
      <div style="font-size:13px;line-height:1.6;color:var(--t2)">Completa tu <b>peso, estatura, edad y sexo</b> en tu Perfil y aquí verás tu estimación automática de calorías y macros para tu objetivo.</div>
    </div>`;
  }
  const curAf=parseFloat(c.activityFactor)||1.55;
  const actBtns=_NUT_ACTS.map(([f,l])=>`<button type="button" onclick="setNutActivity(${f})" style="flex:1;min-width:0;padding:8px 3px;border:1.5px solid ${curAf===f?'var(--g)':'var(--br2)'};border-radius:var(--rsm);background:${curAf===f?'var(--gl)':'transparent'};color:${curAf===f?'var(--gt)':'var(--t2)'};font-family:inherit;font-size:11px;font-weight:700;cursor:pointer">${l}</button>`).join('');
  const m=est.macros||{prot_g:0,carb_g:0,fat_g:0};
  return `<div style="font-size:12px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">${typeof aviIcon==='function'?aviIcon('apple',13):'🍎'} Tu estimación automática</div>
    <div style="font-size:11px;color:var(--t2);margin-bottom:9px">¿Qué tan activo eres en tu día a día?</div>
    <div style="display:flex;gap:5px;margin-bottom:16px">${actBtns}</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:12px">
      <div style="text-align:center;background:var(--gl);border-radius:var(--rsm);padding:14px 4px"><div style="font-size:26px;font-weight:800;color:var(--gt)">${est.kcalObj}</div><div style="font-size:11px;color:var(--t2);font-weight:600">KCAL / DÍA</div></div>
      <div style="text-align:center;background:var(--bll);border-radius:var(--rsm);padding:14px 4px"><div style="font-size:26px;font-weight:800;color:var(--blt)">${est.water||'—'}</div><div style="font-size:11px;color:var(--t2);font-weight:600">VASOS DE AGUA</div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
      <div style="text-align:center;background:var(--bll);border-radius:var(--rsm);padding:10px 4px"><div style="font-size:18px;font-weight:800;color:var(--blt)">${m.prot_g}g</div><div style="font-size:10px;color:var(--t2)">Proteína</div><div style="font-size:10px;color:var(--blt);font-weight:600">${m.prot_g*4} kcal</div></div>
      <div style="text-align:center;background:var(--yll);border-radius:var(--rsm);padding:10px 4px"><div style="font-size:18px;font-weight:800;color:var(--t1)">${m.carb_g}g</div><div style="font-size:10px;color:var(--t2)">Carbos</div><div style="font-size:10px;color:var(--t2);font-weight:600">${m.carb_g*4} kcal</div></div>
      <div style="text-align:center;background:var(--orl);border-radius:var(--rsm);padding:10px 4px"><div style="font-size:18px;font-weight:800;color:var(--ort)">${m.fat_g}g</div><div style="font-size:10px;color:var(--t2)">Grasas</div><div style="font-size:10px;color:var(--ort);font-weight:600">${m.fat_g*9} kcal</div></div>
    </div>
    <div style="background:var(--gl);border-left:3px solid var(--g);border-radius:var(--rsm);padding:11px 13px;font-size:12px;color:var(--gt);line-height:1.55"><b>${esc(est.label)}.</b> Estimación automática según tus datos (Mifflin-St Jeor). Ajústala según tu progreso real semana a semana.</div>`;
}

// ══════════════════════════════════════════════════════════════════════
// LA COMIDA DE HOY, PEGADA AL DÍA DE ENTRENO (2026-08-01)
// ──────────────────────────────────────────────────────────────────────
// Decisión del PO: «que sea un conjunto con su plan de entrenamiento y sus objetivos»,
// con comida colombiana y CANTIDADES de verdad, y más carbohidrato el día de pierna que
// el de descanso. Hasta hoy el plan decía «Desayuno: 600 kcal, 40 g de proteína» y no
// tenía una sola cantidad de comida.
// El motor vive en avi-core (puro y testeado); aquí solo se pinta.
// Regla que se respeta: si el coach escribió un plan, esos son los números — AVI solo
// los reparte por día y los convierte en comida.
function _mealsDayLabel(kind){
  return kind==='pierna' ? 'Hoy entrenas fuerte' : kind==='entreno' ? 'Hoy entrenas' : 'Hoy descansas';
}
function renderMealsToday(client){
  const con=document.getElementById('cn-meals'); if(!con)return;
  con.innerHTML='';
  if(!client)return;
  if(typeof isFreeClient==='function'&&isFreeClient(client))return; // el plan de comida es Premium
  if(typeof nutDayPlan!=='function')return;
  try{
    const nut=(DB.nutrition||{})[client.id];
    // peso más reciente si lo hay (el del perfil puede estar viejo)
    const peso=_nutPesoDe(client);
    const base=nutBaseFor(client,nut,peso);
    if(!base){
      // Sin datos del cuerpo NO se inventa un plan: se pide el dato que falta.
      const faltan=[];
      if(!(parseFloat(peso)>0))faltan.push('tu peso');
      if(!(parseFloat(client.height)>0))faltan.push('tu estatura');
      if(!(parseInt(client.age)>0))faltan.push('tu edad');
      if(client.sex!=='M'&&client.sex!=='F')faltan.push('tu sexo');
      if(!faltan.length)return;
      con.innerHTML=`<div class="card" style="padding:12px 14px">
        <div style="font-size:13px;font-weight:800;color:var(--t1);margin-bottom:4px">${typeof aviIcon==='function'?aviIcon('nutrition',14):'🥗'} Tu plan de comida</div>
        <div style="font-size:12px;color:var(--t2)">Para armarlo necesito ${esc(faltan.join(', ').replace(/, ([^,]*)$/,' y $1'))}. Pídele a tu coach que los complete.</div>
      </div>`;
      return;
    }
    const shape=nutWeekShape(client.routines);
    const hoy=new Date();
    const dias=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const rHoy=(client.routines||[]).find(r=>r.day===dias[hoy.getDay()])||null;
    const kind=nutDayKind(rHoy);
    const plan=nutDayPlan(base,kind,shape.trainDays,shape.legDays,hoy.getDay());
    if(!plan)return;
    const t=plan.target;
    // v435: el número de HOY se mueve con el tipo de entreno y el del perfil es el de la semana.
    // Sin esta línea son dos números que se contradicen a la vista (reporte del PO 2026-08-04).
    const nota=(typeof nutDayNote==='function')?nutDayNote(kind,t.kcal,base.kcalObj):'';
    const abierto=_mealsOpen;
    const filas=plan.meals.map((m,i)=>{
      const comida=m.items.map(it=>`${esc(it.name)} <b style="color:var(--t1)">${esc(it.text)}</b>`).join(' + ');
      const acomp=m.acomp.length?`<div style="font-size:11px;color:var(--t3);margin-top:2px">con ${esc(m.acomp.join(', ').toLowerCase())}</div>`:'';
      return `<div style="padding:9px 0;${i?'border-top:1px solid var(--br)':''}">
        <div style="font-size:11px;font-weight:800;color:var(--gt);text-transform:uppercase;letter-spacing:.3px">${esc(m.name)}</div>
        <div style="font-size:12.5px;color:var(--t2);margin-top:3px;line-height:1.5">${comida}</div>${acomp}
      </div>`;
    }).join('');
    con.innerHTML=`<div class="card" style="padding:12px 14px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer" onclick="toggleMealsToday()">
        <div style="min-width:0">
          <div style="font-size:13px;font-weight:800;color:var(--t1)">${typeof aviIcon==='function'?aviIcon('nutrition',14):'🥗'} Tu comida de hoy</div>
          <div style="font-size:11.5px;color:var(--t2);margin-top:2px">${esc(_mealsDayLabel(kind))} · ${t.kcal} kcal</div>
        </div>
        <button class="btn bg bsm" style="flex-shrink:0;min-height:36px" aria-expanded="${abierto?'true':'false'}">${abierto?'Ocultar':'Ver'}</button>
      </div>
      <div style="display:flex;gap:6px;margin-top:9px;flex-wrap:wrap">
        <span class="tag tb">Proteína ${t.prot_g} g</span>
        <span class="tag" style="background:var(--yll);color:var(--ort)">Carbohidrato ${t.carb_g} g</span>
        <span class="tag to">Grasa ${t.fat_g} g</span>
      </div>
      ${nota?`<div style="font-size:11.5px;color:var(--t2);background:var(--bg);border-radius:var(--rsm);padding:8px 10px;margin-top:9px;line-height:1.5">${esc(nota)}</div>`:''}
      ${abierto?`<div style="margin-top:8px">${filas}</div>
      <div style="font-size:11px;color:var(--t3);margin-top:8px;line-height:1.5">Son cantidades ya listas para comer. Puedes cambiar un alimento por otro parecido — lo que importa es acercarte a esos números.</div>`:''}
    </div>`;
  }catch(e){ warn('AVI: pintar la comida de hoy falló (no bloquea el día):',e&&e.message); con.innerHTML=''; }
}
let _mealsOpen=false;
function toggleMealsToday(){ _mealsOpen=!_mealsOpen; const c=DB.clients.find(x=>x.id===CUR.clientId); if(c)renderMealsToday(c); }

function renderNutritionClient(clientId){
  const con=document.getElementById('cn-nut-body');if(!con)return;
  if(isFreeClient(DB.clients.find(x=>x.id===clientId))){con.innerHTML=premiumLockHTML('Plan nutricional','Calorías, macros y un plan de alimentación armado para ti.');return;}
  // El bot\u00f3n "Editar" solo aparece para el coach en su propio entrenamiento (COACH_SELF):
  // as\u00ed el due\u00f1o ajusta su plan, pero los asesorados lo siguen viendo como lo dej\u00f3 el coach.
  const editBtn=document.getElementById('cn-nut-edit'); if(editBtn)editBtn.style.display=COACH_SELF?'':'none';
  const nut=(DB.nutrition||{})[clientId];
  if(!_hasCoachNutPlan(nut)){
    // Sin plan escrito por un coach \u2192 calculadora autom\u00e1tica (Premium self-serve).
    // El coach (COACH_SELF) ve adem\u00e1s el recordatorio de armar un plan a medida.
    const c=DB.clients.find(x=>x.id===clientId);
    con.innerHTML=`<button class="btn bp bsm" style="width:100%;margin-bottom:12px" onclick="openNutritionRoom('${clientId}')">${typeof aviIcon==='function'?aviIcon('utensils',15):'\ud83c\udf7d\ufe0f'} Ver mi plan en grande</button>`+nutCalcHTML(c)+(COACH_SELF
      ? '<div style="text-align:center;margin-top:12px;color:var(--t3);font-size:12px">O toca \u270f\ufe0f Editar para escribir un plan a medida.</div>'
      : '');
    return;
  }
  let html='';
  // ── v435: LA MISMA VERDAD QUE «HOY» ──────────────────────────────────────────
  // El PO reportó «hay dos planes y son diferentes». Lo eran: aquí se pintaba el titular escrito
  // por el coach (fijo) y en «Hoy» el objetivo DEL DÍA (que se mueve con el entreno) — a Kathe le
  // salían 2.227 el domingo contra 2.400 aquí. Ahora esta pantalla lee del MISMO motor y muestra
  // la semana entera, para que el número de «Hoy» tenga dónde encajar.
  const _c=DB.clients.find(x=>x.id===clientId);
  let _sem=null, _semanaHtml='';
  try{
    if(_c && typeof nutBaseFor==='function' && typeof nutWeekTargets==='function'){
      const _base=nutBaseFor(_c,nut,_nutPesoDe(_c));
      if(_base)_sem=nutWeekTargets(_base,_c.routines);
    }
  }catch(e){ warn('AVI: la semana de nutrición no se pudo armar (no bloquea el perfil):',e&&e.message); }
  if(_sem){
    const hoyIdx=new Date().getDay();
    const filas=_sem.days.map(d=>{
      const esHoy=d.dayIndex===hoyIdx;
      const et=d.kind==='pierna'?'Pierna':d.kind==='entreno'?'Entreno':'Descanso';
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 0;${d.dayIndex?'border-top:1px solid var(--br)':''}${esHoy?';font-weight:800':''}">
        <div style="font-size:12.5px;color:var(--t1);min-width:0">${esc(d.day)}${esHoy?' <span style="color:var(--gt);font-size:11px">· hoy</span>':''}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <span style="font-size:11px;color:var(--t3)">${esc(et)}</span>
          <span style="font-size:12.5px;color:var(--t1);min-width:62px;text-align:right">${d.target.kcal} kcal</span>
        </div>
      </div>`;}).join('');
    _semanaHtml=`<div class="card" style="padding:12px 14px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:800;color:var(--t1);margin-bottom:2px">${typeof aviIcon==='function'?aviIcon('nutrition',14):'🥗'} Tu semana de comida</div>
      <div style="font-size:11.5px;color:var(--t2);margin-bottom:8px">Promedio <b>${_sem.promedioKcal} kcal al día</b>. Los días que entrenas comes un poco más y los de descanso un poco menos — en la semana comes lo mismo.</div>
      ${filas}
    </div>`;
  }
  // Macros grid
  if(nut.kcal||nut.prot||nut.carbs||nut.fat){
    html+=`<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px">`;
    // v435: el número que se muestra es el que suman SUS PROPIOS macros — que es lo que el plato
    // entrega. El titular escrito puede no cuadrar (medido: 6 de 10 planes; Nataly por 240 kcal).
    // El titular tiene que cuadrar con las tarjetas de macros que van justo debajo (P×4+C×4+G×9);
    // el PROMEDIO de la semana puede diferir en 1-2 kcal por el redondeo del reparto diario y lo
    // dice la tarjeta de la semana. Dos números distintos a la vista es justo el bug que se arregla.
    const _kcalReal=_sem?_sem.baseKcal:(parseInt(nut.kcal)||0);
    if(_kcalReal)html+=`<div class="nutri-card" onclick="openNutriInfo('kcal')" style="--nc:var(--gt);text-align:center;background:var(--gl);border-radius:var(--r);padding:12px 4px"><span class="nutri-i">\u24d8</span><div style="font-size:22px;font-weight:800;color:var(--gt)">${esc(String(_kcalReal))}</div><div style="font-size:11px;color:var(--t2);font-weight:600">CALOR\u00cdAS / D\u00cdA</div></div>`;
    if(nut.water)html+=`<div class="nutri-card" onclick="openNutriInfo('water')" style="--nc:var(--blt);text-align:center;background:var(--bll);border-radius:var(--r);padding:12px 4px"><span class="nutri-i">\u24d8</span><div style="font-size:22px;font-weight:800;color:var(--blt)">${esc(String(nut.water))}</div><div style="font-size:11px;color:var(--t2);font-weight:600">VASOS DE AGUA</div></div>`;
    html+=`</div>`;
    if(nut.prot||nut.carbs||nut.fat){
      html+=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">`;
      if(nut.prot)html+=`<div class="nutri-card" onclick="openNutriInfo('prot')" style="--nc:var(--blt);text-align:center;background:var(--bll);border-radius:var(--r);padding:11px 4px 10px"><span class="nutri-i">\u24d8</span><div style="font-size:18px;font-weight:800;color:var(--blt)">${esc(String(nut.prot))}g</div><div style="font-size:10px;color:var(--t2)">Prote\u00edna</div><div style="font-size:10px;color:var(--blt);font-weight:600">${nut.prot*4} kcal</div></div>`;
      if(nut.carbs)html+=`<div class="nutri-card" onclick="openNutriInfo('carbs')" style="--nc:var(--ylt);text-align:center;background:var(--yll);border-radius:var(--r);padding:11px 4px 10px"><span class="nutri-i">\u24d8</span><div style="font-size:18px;font-weight:800;color:var(--ylt)">${esc(String(nut.carbs))}g</div><div style="font-size:10px;color:var(--t2)">Carbos</div><div style="font-size:10px;color:var(--ylt);font-weight:600">${nut.carbs*4} kcal</div></div>`;
      if(nut.fat)html+=`<div class="nutri-card" onclick="openNutriInfo('fat')" style="--nc:var(--ort);text-align:center;background:var(--orl);border-radius:var(--r);padding:11px 4px 10px"><span class="nutri-i">\u24d8</span><div style="font-size:18px;font-weight:800;color:var(--ort)">${esc(String(nut.fat))}g</div><div style="font-size:10px;color:var(--t2)">Grasas</div><div style="font-size:10px;color:var(--ort);font-weight:600">${nut.fat*9} kcal</div></div>`;
      html+=`</div>`;
    }
  }
  html+=_semanaHtml;   // la semana va DESPUES del numero grande, no antes
  // ── PERFIL = RESUMEN. El DETALLE vive en la habitación «Ver mi plan completo» ──
  // Antes esta tarjeta repetía casi entera la habitación: el «por qué», los ejemplos, el plan
  // escrito y el «evitar» salían en las DOS superficies, y el Perfil quedaba larguísimo con dos
  // bloques seguidos diciendo casi lo mismo (reporte del PO, 2026-08-05: «se siente muy larga…
  // quiero que se vea organizado, no en ese desorden»). Ahora hay UNA jerarquía:
  //   Perfil     → los NÚMEROS (kcal, agua, macros) + su semana + la puerta al detalle
  //   Habitación → el «por qué», los ejemplos, el plan escrito y qué evitar
  // Nada se pierde: todo lo que se quitó de aquí YA lo pintaba la habitación.
  const _pistas=[nut.examples?'ejemplos de comidas':null,nut.plan?'el plan de tu coach':null,nut.avoid?'qu\u00e9 evitar':null].filter(Boolean);
  con.innerHTML=html+`<button class="btn bp bsm" style="width:100%;margin-top:4px" onclick="openNutritionRoom('${clientId}')">${typeof aviIcon==='function'?aviIcon('utensils',15):'\ud83c\udf7d\ufe0f'} Ver mi plan completo</button>`
    +(_pistas.length?`<div style="font-size:11.5px;color:var(--t3);text-align:center;margin-top:7px;line-height:1.5">Adentro: ${esc(_pistas.join(' \u00b7 '))}</div>`:'');
}

// ── HABITACIÓN DE NUTRICIÓN: versión inmersiva del plan (se entra desde la tarjeta
// "Mi plan nutricional"). Une las dos fuentes: plan escrito por el coach (DB.nutrition)
// o estimación automática self-serve (nutritionEstimate). Reúne kcal, agua, macros con
// reparto visual, el "por qué", comidas/ejemplos y el selector de actividad (self-serve).
function openNutritionRoom(clientId){
  const room=document.getElementById('nutrition-room'),body=document.getElementById('nutroom-body');
  if(!room||!body)return;
  const c=(DB.clients||[]).find(x=>x.id===clientId);
  if(!c)return;
  const nut=(DB.nutrition||{})[clientId];
  const hasPlan=_hasCoachNutPlan(nut);
  let d;
  if(hasPlan){
    // 🔴 EL MISMO NÚMERO QUE LAS OTRAS DOS PANTALLAS. Esta habitación se quedó pintando el
    // titular ESCRITO por el coach (`nut.kcal`) mientras «Hoy» y «Perfil» ya pintan el derivado
    // de sus propios macros desde v435. Medido con un plan real: la habitación decía **2.900**
    // y el Perfil **2.805** — 95 kcal/día de diferencia para el MISMO plan, a un toque de
    // distancia. Es exactamente el defecto que v435 arregló… en las otras dos superficies.
    // El titular se DERIVA de sus componentes, nunca se guarda aparte.
    const _base=(typeof nutBaseFor==='function')?nutBaseFor(c,nut,_nutPesoDe(c)):null;
    const _kcal=(_base&&_base.kcalObj)?_base.kcalObj:nut.kcal;
    d={kcal:_kcal,water:nut.water,prot:+nut.prot||0,carb:+nut.carbs||0,fat:+nut.fat||0,meals:nut.meals,examples:nut.examples,plan:nut.plan,avoid:nut.avoid,isEst:false,why:GOAL_WHY[nutWhyKey(nut,c)]};
  } else {
    const est=nutritionEstimate(c,_nutPesoDe(c));
    if(!est){
      body.innerHTML=`<div class="sroom-hero exroom-hero"><div class="exroom-hero-ic" style="background:#10b98122;border:1px solid #10b98155">🥗</div><div class="sroom-hero-txt"><div class="sroom-title" style="margin-top:0">Nutrición</div></div></div>
        <div class="exroom-note">Completa tu <b>peso, estatura, edad y sexo</b> en tu Perfil y aquí verás tu estimación automática de calorías y macros para tu objetivo 🍎</div><div style="height:30px"></div>`;
      body.scrollTop=0; _roomFront(room); _syncRoomBodyClass(); return;
    }
    const m=est.macros||{prot_g:0,carb_g:0,fat_g:0};
    d={kcal:est.kcalObj,water:est.water,prot:m.prot_g,carb:m.carb_g,fat:m.fat_g,isEst:true,label:est.label,why:GOAL_WHY[nutGoalForClient(c.goal,c)]};
  }
  const pk=d.prot*4, ck=d.carb*4, fk=d.fat*9, tot=pk+ck+fk||1;
  const pp=Math.round(pk/tot*100), cp=Math.round(ck/tot*100), fp=Math.max(0,100-pp-cp);

  // MISMAS tarjetas que el Perfil (`.nutri-card` + tokens del sistema): el asesorado pasa de
  // una pantalla a otra con UN toque, y el mismo dato tiene que verse igual. Antes esta
  // habitacion usaba `.sroom-stat` (aro y brillo) y colores escritos a mano.
  // `col` es SIEMPRE la variante legible del tinte (--gt/--blt/--ylt/--ort) y de ella se deriva
  // el filo con `--nc`. Antes «Comidas» iba con `--t1`: el filo habría salido NEGRO y, peor, la
  // fila de tarjetas pintaba azul/NEGRO/coral debajo de una barra de macros azul/ámbar/coral —
  // una leyenda que no coincidía con su propia gráfica.
  const tile=(bg,col,ic,val,lab,info)=>`<div class="nutri-card"${info?` onclick="openNutriInfo('${info}')"`:''} style="--nc:var(${col});text-align:center;background:var(${bg});border-radius:var(--r);padding:13px 4px 12px">${info?'<span class="nutri-i">ⓘ</span>':''}<div class="nutri-ic">${typeof aviIcon==='function'?aviIcon(ic,17):''}</div><div style="font-size:22px;font-weight:800;color:var(${col})">${esc(String(val))}</div><div style="font-size:11px;color:var(--t2);font-weight:600">${esc(lab)}</div></div>`;
  const _st=[
    tile('--gl','--gt','flame',d.kcal||'—','CALORÍAS / DÍA','kcal'),
    d.water?tile('--bll','--blt','droplet',d.water,'VASOS DE AGUA','water'):null,
    d.meals?tile('--yll','--ylt','utensils',d.meals,'COMIDAS',null):null,
  ].filter(Boolean);
  const stats=`<div style="display:grid;grid-template-columns:repeat(${_st.length},1fr);gap:10px">${_st.join('')}</div>`;

  // Sin círculo de ícono: la barra de macros de arriba ya es su leyenda.
  const macroTile=(bg,col,g,lab,kc,info)=>`<div class="nutri-card" onclick="openNutriInfo('${info}')" style="--nc:var(${col});text-align:center;background:var(${bg});border-radius:var(--r);padding:11px 4px 10px"><span class="nutri-i">ⓘ</span><div style="font-size:18px;font-weight:800;color:var(${col})">${g}g</div><div style="font-size:10px;color:var(--t2)">${esc(lab)}</div><div style="font-size:10px;color:var(${col});font-weight:600">${kc} kcal</div></div>`;
  let macroHTML='';
  if(d.prot||d.carb||d.fat){
    macroHTML=`<div class="sroom-sec">Tus macros</div>
      <div class="nutr-bar">
        <div class="nutr-seg prot" style="width:${pp}%">${pp>=12?pp+'%':''}</div>
        <div class="nutr-seg carb" style="width:${cp}%">${cp>=12?cp+'%':''}</div>
        <div class="nutr-seg fat" style="width:${fp}%">${fp>=12?fp+'%':''}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">
        ${macroTile('--bll','--blt',d.prot,'Proteína',pk,'prot')}
        ${macroTile('--yll','--ylt',d.carb,'Carbos',ck,'carbs')}
        ${macroTile('--orl','--ort',d.fat,'Grasas',fk,'fat')}
      </div>`;
  }

  let actHTML='';
  if(d.isEst){
    const curAf=parseFloat(c.activityFactor)||1.55;
    actHTML=`<div class="sroom-sec">¿Qué tan activo eres?</div><div class="nutr-acts">`+_NUT_ACTS.map(([f,l])=>`<button type="button" onclick="setNutActivity(${f})" class="nutr-act${curAf===f?' on':''}">${l}</button>`).join('')+`</div>`;
  }

  let whyHTML='';
  if(d.why)whyHTML=`<div class="sroom-sec">¿Por qué este plan?</div><div class="exroom-tech" style="border-left:3px solid #10b981"><b>${esc(d.why.title)}.</b> ${esc(d.why.text)}</div>`;
  if(d.isEst)whyHTML+=`<div class="exroom-note"><b>${esc(d.label||'')}.</b> Estimación automática según tus datos (fórmula Mifflin-St Jeor). Ajústala según tu progreso real semana a semana.</div>`;

  let mealsHTML='';
  if(d.examples){
    const lines=d.examples.split('\n').filter(l=>l.trim());
    mealsHTML=`<div class="sroom-sec">Ejemplos de alimentación</div>`+lines.map(line=>{
      const ci=line.indexOf(':');
      if(ci>0)return `<div class="nutr-meal"><div class="nutr-meal-h">${esc(line.slice(0,ci).trim())}</div><div class="nutr-meal-t">${esc(line.slice(ci+1).trim())}</div></div>`;
      return `<div class="nutr-meal"><div class="nutr-meal-t">${esc(line)}</div></div>`;
    }).join('');
  }
  let planHTML='';
  if(d.plan)planHTML=`<div class="sroom-sec">Plan</div><div class="exroom-tech" style="white-space:pre-line">📋 ${esc(d.plan)}</div>`;
  if(d.avoid)planHTML+=`<div class="nutr-avoid">⚠️ <b>Evitar:</b> ${esc(d.avoid)}</div>`;

  // Sin ejemplos del coach (estimación automática o plan solo con números) la
  // habitación quedaba vacía abajo: la llenamos con guía práctica self-serve.
  let guideHTML='';
  if(!d.examples){
    if(d.kcal&&d.prot){
      const split=nutMealSplit(d.kcal,d.prot,d.meals||4);
      guideHTML+=`<div class="sroom-sec">Cómo repartir tu día</div>`+split.map(s=>
        `<div class="nutr-meal" style="display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div class="nutr-meal-h" style="margin:0">${esc(s.name)}</div>
          <div class="nutr-meal-t" style="white-space:nowrap;color:var(--t2)"><b style="color:var(--t1)">${s.kcal}</b> kcal · <b style="color:#3a86c8">${s.prot}g</b> prot</div>
        </div>`).join('')+
        `<div class="exroom-note" style="margin-top:9px">Guía aproximada. La proteína va repartida en partes iguales: tu cuerpo la aprovecha mejor cuando llega a cada comida, no toda de una.</div>`;
    }
    guideHTML+=`<div class="sroom-sec">Ideas para armar tu plato</div>`+NUT_PLATE.map(p=>
      `<div class="nutr-meal"><div class="nutr-meal-h">${p.ic} ${esc(p.h)}</div><div class="nutr-meal-t">${esc(p.t)}</div></div>`).join('');
    guideHTML+=`<div class="sroom-sec">Para que funcione</div><div class="exroom-tech" style="line-height:1.7">`+
      NUT_TIPS.map(t=>esc(t)).join('<br><br>')+`</div>`;
  }

  body.innerHTML=`
    <div class="sroom-hero exroom-hero hero-tint" style="background:linear-gradient(135deg,#10b98118,#10b98108),var(--w);border-color:#10b98144">
      <div class="exroom-hero-ic" style="background:#10b98122;border:1px solid #10b98166">🥗</div>
      <div class="sroom-hero-txt">
        <div class="sroom-title" style="margin-top:0">Mi nutrición</div>
        <div class="exroom-tags"><span>${d.isEst?'Estimación automática':'Plan de tu coach'}</span>${d.label?`<span>${esc(d.label)}</span>`:''}</div>
      </div>
    </div>
    ${stats}
    ${macroHTML}
    ${actHTML}
    ${whyHTML}
    ${mealsHTML}
    ${planHTML}
    ${guideHTML}
    <div style="height:30px"></div>`;
  body.scrollTop=0; _roomFront(room); _syncRoomBodyClass();
}
function closeNutritionRoom(){
  const room=document.getElementById('nutrition-room');
  if(room)room.classList.remove('on');
  _syncRoomBodyClass();
}

function shareNutWhatsapp(){
  const nut=(DB.nutrition||{})[CUR.clientId];
  const cl=DB.clients.find(x=>x.id===CUR.clientId);
  const nombre=cl?cl.name.split(' ')[0]:'';
  let msg=`🥗 *MI PLAN NUTRICIONAL - AVI*\n`;
  if(nombre)msg+=`👤 ${nombre}\n`;
  msg+=`\n`;
  if(_hasCoachNutPlan(nut)){
    if(nut.kcal)msg+=`🔥 *Calorías diarias:* ${nut.kcal} kcal\n`;
    if(nut.water)msg+=`💧 *Agua:* ${nut.water} vasos/día\n`;
    if(nut.meals)msg+=`🍽️ *Comidas:* ${nut.meals} al día\n`;
    if(nut.prot||nut.carbs||nut.fat){
      msg+=`\n📊 *Macros:*\n`;
      if(nut.prot)msg+=`  • Proteína: ${nut.prot}g (${nut.prot*4} kcal)\n`;
      if(nut.carbs)msg+=`  • Carbohidratos: ${nut.carbs}g (${nut.carbs*4} kcal)\n`;
      if(nut.fat)msg+=`  • Grasas saludables: ${nut.fat}g (${nut.fat*9} kcal)\n`;
    }
    if(nut.examples){
      msg+=`\n💡 *Ejemplos de comidas:*\n`;
      nut.examples.split('\n').filter(l=>l.trim()).forEach(l=>msg+=`  ${l.trim()}\n`);
    }
    if(nut.plan){msg+=`\n📋 *Notas de tu coach:*\n${nut.plan}\n`;}
    if(nut.avoid){msg+=`\n⚠️ *Evitar:* ${nut.avoid}\n`;}
  } else {
    // Self-serve (Premium sin plan del coach): comparte la ESTIMACIÓN automática. Antes decía
    // "tu coach aún no ha asignado un plan" aunque la app mostraba kcal+macros. Bug #9 auditoría 2026-06-30.
    const est=cl?nutritionEstimate(cl,_nutPesoDe(cl)):null;
    if(!est){toast('Completa tu peso, estatura, edad y sexo en tu Perfil para ver tu estimación');return;}
    const m=est.macros||{};
    msg+=`🔥 *Calorías diarias:* ${est.kcalObj} kcal _(estimación automática)_\n`;
    if(est.water)msg+=`💧 *Agua:* ${est.water} vasos/día\n`;
    if(m.prot_g||m.carb_g||m.fat_g){
      msg+=`\n📊 *Macros:*\n`;
      if(m.prot_g)msg+=`  • Proteína: ${m.prot_g}g (${m.prot_g*4} kcal)\n`;
      if(m.carb_g)msg+=`  • Carbohidratos: ${m.carb_g}g (${m.carb_g*4} kcal)\n`;
      if(m.fat_g)msg+=`  • Grasas saludables: ${m.fat_g}g (${m.fat_g*9} kcal)\n`;
    }
    if(est.label)msg+=`\n🎯 ${est.label}\n`;
  }
  msg+=`\n_Plan generado por AVI 💪_`;
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
}


// ══════════════ MEDIDAS CORPORALES ══════════════

const MED_FIELDS=[
  {key:'pecho',label:'Pecho',icon:'\uD83D\uDCAA'},
  {key:'cintura',label:'Cintura',icon:'\u2B55'},
  {key:'cadera',label:'Cadera',icon:'\uD83D\uDC9B'},
  {key:'brazo',label:'Brazo',icon:'\uD83D\uDCAA'},
  {key:'muslo',label:'Muslo',icon:'\uD83E\uDDB5'},
  {key:'pantorrilla',label:'Pantorrilla',icon:'\uD83E\uDDB5'}
];

function openMedModal(){
  MED_FIELDS.forEach(f=>{const el=document.getElementById('med-'+f.key);if(el)el.value='';});
  om('m-med');
}

function saveMedidas(){
  const clientId=CUR.clientId;if(!clientId)return;
  if(!DB.medidas)DB.medidas={};
  if(!DB.medidas[clientId])DB.medidas[clientId]=[];
  const entry={date:new Date().toISOString()};
  let hasData=false;
  MED_FIELDS.forEach(f=>{
    const el=document.getElementById('med-'+f.key);
    if(!el)return;
    const v=parseFloat(el.value);
    if(v>0){entry[f.key]=v;hasData=true;}
  });
  if(!hasData){toast('\u26a0\ufe0f Ingresa al menos una medida');return;}
  const today=new Date().toDateString();
  const idx=DB.medidas[clientId].findIndex(e=>new Date(e.date).toDateString()===today);
  if(idx>=0)DB.medidas[clientId][idx]={...DB.medidas[clientId][idx],...entry};
  else DB.medidas[clientId].unshift(entry);
  if(DB.medidas[clientId].length>24)DB.medidas[clientId]=DB.medidas[clientId].slice(0,24);
  sv('ax_med',DB.medidas);
  cm('m-med');
  renderMedidasClient(clientId);
  renderMedidasCoach(clientId);
  toast('\uD83D\uDCCF Medidas guardadas');
}

function renderMedidasClient(clientId){
  const listEl=document.getElementById('cn-med-list');
  const chartWrap=document.getElementById('cn-med-chart-wrap');
  if(!listEl)return;
  if(isFreeClient(DB.clients.find(x=>x.id===clientId))){listEl.innerHTML=premiumLockHTML('Medidas corporales','Registra cintura, cadera y más, y míralas evolucionar.');if(chartWrap)chartWrap.style.display='none';return;}
  const entries=(DB.medidas||{})[clientId]||[];
  if(!entries.length){
    listEl.innerHTML=`<div class="empty" style="padding:22px 12px"><div class="eico" style="color:var(--t3)">${typeof aviIcon==='function'?aviIcon('ruler',32):'📏'}</div><div class="etxt">Aún no has registrado medidas</div><div class="esub">Anota cintura, cadera y más — así ves cómo tu cuerpo cambia con el tiempo.</div></div>`;
    if(chartWrap)chartWrap.style.display='none';return;
  }
  if(chartWrap){
    const cintPts=entries.filter(e=>e.cintura).slice(0,12).reverse();
    if(cintPts.length>=2){
      chartWrap.style.display='block';
      drawMedChart(document.getElementById('cn-med-chart'),cintPts,'cintura','var(--chart-or)');
    } else chartWrap.style.display='none';
  }
  const latest=entries[0];const first=entries[entries.length-1];
  let html=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="border-bottom:2px solid var(--br)">
      <th style="text-align:left;padding:6px 8px;color:var(--t2);font-weight:700">Medida</th>
      <th style="text-align:right;padding:6px 8px;color:var(--t2);font-weight:700">Actual</th>
      <th style="text-align:right;padding:6px 8px;color:var(--t2);font-weight:700">Inicio</th>
      <th style="text-align:right;padding:6px 8px;color:var(--t2);font-weight:700">Cambio</th>
    </tr></thead><tbody>`;
  MED_FIELDS.forEach(f=>{
    const cur=latest[f.key];const ini=first[f.key];
    if(!cur&&!ini)return;
    const delta=(cur&&ini)?(cur-ini).toFixed(1):null;
    const dc=delta===null?'':parseFloat(delta)<0?'var(--gt)':parseFloat(delta)>0?'var(--ort)':'var(--t3)';
    html+=`<tr style="border-bottom:1px solid var(--br)">
      <td style="padding:7px 8px;font-weight:600">${f.label}</td>
      <td style="padding:7px 8px;text-align:right;font-family:'JetBrains Mono',monospace;font-weight:700">${cur?cur+' cm':'\u2014'}</td>
      <td style="padding:7px 8px;text-align:right;color:var(--t3)">${ini?ini+' cm':'\u2014'}</td>
      <td style="padding:7px 8px;text-align:right;font-weight:700;color:${dc}">${delta!==null?(parseFloat(delta)>0?'+':'')+delta+' cm':'\u2014'}</td>
    </tr>`;
  });
  html+=`</tbody></table></div>`;
  html+=`<div style="font-size:11px;color:var(--t3);margin-top:8px;text-align:right">${entries.length} registro${entries.length!==1?'s':''} \u00b7 \u00faltimo: ${new Date(latest.date).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}</div>`;
  listEl.innerHTML=html;
}

function renderMedidasCoach(clientId){
  const con=document.getElementById('d-med-preview');if(!con)return;
  const entries=(DB.medidas||{})[clientId]||[];
  if(!entries.length){con.innerHTML='<div style="color:var(--t3);font-size:13px;padding:8px 0">Sin medidas a\u00fan</div>';return;}
  const latest=entries[0];const first=entries[entries.length-1];
  let html='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">';
  MED_FIELDS.forEach(f=>{
    const cur=latest[f.key];if(!cur)return;
    const ini=first[f.key];
    const delta=ini?(cur-ini).toFixed(1):null;
    const dc=delta!==null&&parseFloat(delta)<0?'var(--gt)':delta!==null&&parseFloat(delta)>0?'var(--ort)':'var(--t3)';
    html+=`<div style="background:var(--w);border:1px solid var(--br);border-radius:var(--rsm);padding:10px;text-align:center;box-shadow:var(--sh)">
      <div style="font-size:10px;color:var(--t2);margin-bottom:3px">${f.label}</div>
      <div style="font-size:18px;font-weight:800">${cur}cm</div>
      ${delta!==null?`<div style="font-size:11px;font-weight:700;color:${dc}">${parseFloat(delta)>0?'+':''}${delta}cm</div>`:''}
    </div>`;
  });
  html+=`</div><div style="font-size:11px;color:var(--t3);margin-top:8px">${entries.length} registro${entries.length!==1?'s':''} \u00b7 \u00faltimo: ${new Date(latest.date).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</div>`;
  con.innerHTML=html;
}

function drawMedChart(container,points,field,color){
  if(!container||!points.length)return;
  const W=Math.max(container.offsetWidth||280,200);const H=60;const pad=8;
  const vals=points.map(p=>p[field]);
  const maxV=Math.max(...vals)||1;const minV=Math.min(...vals);const span=maxV-minV||1;
  const pts=points.map((p,i)=>({
    x:pad+i*(W-pad*2)/Math.max(points.length-1,1),
    y:6+(H-16)-((p[field]-minV)/span)*(H-16),p
  }));
  const pathD=pts.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  // Colores en style= (no atributos): el caller pasa tokens var(--chart-*) — gotcha en styles.css
  container.innerHTML=`<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <path d="${pathD} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z" style="fill:${color}" fill-opacity="0.1"/>
    <path d="${pathD}" fill="none" style="stroke:${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${pts.map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" style="fill:${color}"/>
      <text x="${p.x.toFixed(1)}" y="${H}" text-anchor="middle" font-size="8" style="fill:var(--t3)" font-family="sans-serif">${new Date(p.p.date).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</text>`).join('')}
  </svg>`;
}

// ══════════════ FOTOS DE PROGRESO — SUPABASE STORAGE ══════════════

// Token de la sesión del usuario para Storage. Las políticas del bucket limitan
// subir/borrar a la propia carpeta del usuario (o a la de sus clientes, si es coach),
// así que NO usamos la anon key para escribir. Fallback a anon solo en modo legacy.
async function _storageToken(){
  try{const s=await AUTH.getSession();if(s&&s.access_token)return s.access_token;}catch(e){}
  return SB_KEY;
}

async function uploadPhotoToStorage(clientId,photoId,base64){
  const res=await fetch(base64);
  const blob=await res.blob();
  const path=`${clientId}/${photoId}.jpg`;
  const token=await _storageToken();
  const r=await fetch(`${SB_URL}/storage/v1/object/apex-photos/${path}`,{
    method:'POST',
    headers:{'apikey':SB_KEY,'Authorization':`Bearer ${token}`,'Content-Type':'image/jpeg','x-upsert':'true'},
    body:blob
  });
  if(!r.ok)throw new Error('Storage upload failed: '+r.status);
  return `${SB_URL}/storage/v1/object/public/apex-photos/${path}`;
}

async function deletePhotoFromStorage(clientId,photoId){
  const token=await _storageToken();
  await fetch(`${SB_URL}/storage/v1/object/apex-photos`,{
    method:'DELETE',
    headers:{'apikey':SB_KEY,'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({prefixes:[`${clientId}/${photoId}.jpg`]})
  }).catch(()=>{});
}

async function migratePhotosToStorage(){
  const photos=DB.photos||{};
  let changed=false;
  for(const cid of Object.keys(photos)){
    for(const p of photos[cid]){
      if(p.src&&p.src.startsWith('data:image/')){
        try{p.src=await uploadPhotoToStorage(cid,p.id,p.src);changed=true;}
        catch(e){warn('AVI storage migration skip:',p.id,e.message);}
      }
    }
  }
  if(changed){svNow('ax_photos',DB.photos);log('AVI: fotos migradas a Storage');}
  // Avatares en base64 → Storage. Cubre los avatares de clientes cargados (coach) y, en
  // modo asesorado, el propio (DB.clients=[me]). Mismo camino de guardado que saveAvatar.
  let avChanged=false;
  for(const c of (DB.clients||[])){
    if(c.avatar&&c.avatar.startsWith('data:image/')){
      try{c.avatar=(await uploadPhotoToStorage(c.id,'avatar',c.avatar))+'?v='+Date.now();avChanged=true;}
      catch(e){warn('AVI avatar migration skip:',c.id,e.message);}
    }
  }
  if(avChanged){svNow('ax_c',DB.clients);log('AVI: avatares migrados a Storage');}
  // El avatar PROPIO del coach no está en DB.clients (su fila no se carga al abrir el panel).
  if(AUTH_ROLE==='coach'){
    try{
      const own=await UD.loadOwn();
      const av=own&&own.profile&&own.profile.avatar;
      if(typeof av==='string'&&av.startsWith('data:image/')){
        const u=await AUTH.getUser();
        const url=(await uploadPhotoToStorage(u.id,'avatar',av))+'?v='+Date.now();
        await UD.upsertOwn({profile:Object.assign({},own.profile,{avatar:url})});
        log('AVI: avatar propio del coach migrado a Storage');
      }
    }catch(e){warn('AVI own-avatar migration skip:',e.message);}
  }
}

// ══════════════ FOTOS DE PROGRESO ══════════════

function openPhotosModal(){
  const input=document.getElementById('photo-input');
  if(input)input.value='';
  const lbl=document.getElementById('photo-label');
  if(lbl)lbl.value='';
  const prev=document.getElementById('photo-preview');
  if(prev)prev.style.display='none';
  om('m-photos');
}

function previewPhoto(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const img=document.getElementById('photo-img');
    const prev=document.getElementById('photo-preview');
    if(img)img.src=e.target.result;
    if(prev)prev.style.display='block';
  };
  reader.readAsDataURL(file);
}

function compressImage(base64,maxLen){
  return new Promise(resolve=>{
    const img=new Image();
    img.onerror=()=>resolve(base64);
    img.onload=()=>{
      const MAX=800;let w=img.width,h=img.height;
      if(w>MAX||h>MAX){if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;}}
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      let q=0.72,out=canvas.toDataURL('image/jpeg',q);
      while(out.length>maxLen&&q>0.2){q=Math.round((q-0.1)*10)/10;out=canvas.toDataURL('image/jpeg',q);}
      resolve(out);
    };
    img.src=base64;
  });
}

function savePhoto(){
  const clientId=CUR.clientId;if(!clientId)return;
  const input=document.getElementById('photo-input');
  const labelEl=document.getElementById('photo-label');
  const label=labelEl?labelEl.value.trim():'';
  const finalLabel=label||('Foto '+new Date().toLocaleDateString('es-ES',{month:'short',year:'numeric'}));
  if(!input||!input.files[0]){toast('\u26a0\ufe0f Selecciona una foto');return;}
  const file=input.files[0];
  const reader=new FileReader();
  reader.onload=async e=>{
    let base64=e.target.result;
    toast('\u23f3 Subiendo foto...');base64=await compressImage(base64,100000);
    const photoId=uid();
    let src=base64;
    try{src=await uploadPhotoToStorage(clientId,photoId,base64);}
    catch(e){warn('AVI storage upload failed, keeping base64',e.message);}
    if(!DB.photos)DB.photos={};
    if(!DB.photos[clientId])DB.photos[clientId]=[];
    DB.photos[clientId].unshift({id:photoId,date:new Date().toISOString(),label:finalLabel,src});
    if(DB.photos[clientId].length>12)DB.photos[clientId]=DB.photos[clientId].slice(0,12);
    svNow('ax_photos',DB.photos);
    cm('m-photos');
    renderPhotosClient(clientId);
    toast('\uD83D\uDCF8 Foto guardada');
  };
  reader.readAsDataURL(file);
}

function renderPhotosClient(clientId){
  const con=document.getElementById('cn-photos-grid');if(!con)return;
  if(isFreeClient(DB.clients.find(x=>x.id===clientId))){con.innerHTML=premiumLockHTML('Fotos de progreso','Guarda tu antes/después y compara tu transformación.');return;}
  const photos=(DB.photos||{})[clientId]||[];
  if(!photos.length){
    con.innerHTML=`<div class="empty" style="padding:22px 12px"><div class="eico" style="color:var(--t3)">${typeof aviIcon==='function'?aviIcon('camera',32):'\ud83d\udcf7'}</div><div class="etxt">A\u00fan no tienes fotos de progreso</div><div class="esub">La primera es la m\u00e1s importante: marca tu punto de partida.</div></div>`;return;
  }
  con.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
    ${photos.map(p=>`
      <div style="position:relative;border-radius:var(--rsm);overflow:hidden;cursor:pointer" onclick="viewPhoto('${esc(p.id)}','${esc(clientId)}')">
        <img src="${/^(data:image\/|https:\/\/)/.test(p.src)?p.src:''}" alt="Foto de progreso" style="width:100%;aspect-ratio:3/4;object-fit:cover;display:block" loading="lazy">
        <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.65));padding:6px;font-size:10px;color:white;font-weight:600">${esc(p.label)}</div>
      </div>`).join('')}
  </div>
  <div style="font-size:11px;color:var(--t3);margin-top:8px;text-align:right">${photos.length}/12 fotos guardadas</div>`;
}

function viewPhoto(photoId,clientId){
  const cid=clientId||CUR.clientId;if(!cid)return;
  const photo=(DB.photos[cid]||[]).find(p=>p.id===photoId);if(!photo)return;
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML=`
    <img src="${/^(data:image\/|https:\/\/)/.test(photo.src)?photo.src:''}" alt="Foto de progreso ampliada" style="max-width:100%;max-height:72vh;border-radius:var(--r);object-fit:contain">
    <div style="color:white;font-size:14px;font-weight:700;margin-top:12px">${esc(photo.label)}</div>
    <div style="color:rgba(255,255,255,.55);font-size:12px;margin-top:4px">${new Date(photo.date).toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}</div>
    <div style="display:flex;gap:10px;margin-top:16px">
      <button onclick="this.closest('div').parentElement.remove()" style="padding:10px 24px;border-radius:20px;border:2px solid rgba(255,255,255,.4);background:transparent;color:white;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer">Cerrar</button>
      <button onclick="deletePhoto('${esc(photoId)}','${esc(cid)}');this.closest('div').parentElement.remove()" style="padding:10px 24px;border-radius:20px;border:none;background:var(--rd);color:white;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer">Eliminar</button>
    </div>`;
  overlay.onclick=e=>{if(e.target===overlay)overlay.remove();};
  document.body.appendChild(overlay);
}

function deletePhoto(photoId,clientId){
  const cid=clientId||CUR.clientId;if(!cid)return;
  deletePhotoFromStorage(cid,photoId);
  DB.photos[cid]=(DB.photos[cid]||[]).filter(p=>p.id!==photoId);
  sv('ax_photos',DB.photos);
  renderPhotosClient(cid);
  toast('Foto eliminada');
}

// ══════════════════════ NOTIFICACIONES PUSH ══════════════════════

let notifTimer=null;

function notifFillTemplate(){
  const sel=document.getElementById('notif-tpl');
  const ta=document.getElementById('notif-msg');
  if(sel.value&&sel.value!=='custom')ta.value=sel.value;
  else if(sel.value==='custom')ta.value='';
}

function openNotifModal(){
  // Llenar destinatarios
  const sel=document.getElementById('notif-target');
  sel.innerHTML='<option value="all">Todos los asesorados</option>';
  DB.clients.forEach(c=>{
    const opt=document.createElement('option');
    opt.value=c.id;opt.textContent=c.name;
    sel.appendChild(opt);
  });
  renderScheduledNotifs();
  om('m-notif');
  // Renderizar estado actual de permisos de notificación
  const st=document.getElementById('notif-status');
  if(!('Notification' in window)){
    if(st){st.textContent='Este navegador no soporta notificaciones push.';st.style.color='var(--rdt)';}
  } else if(Notification.permission==='granted'){
    if(st){st.innerHTML='<span style="color:var(--gt);font-weight:600">Notificaciones activas</span> — los pushes llegarán a los asesorados.';st.style.color='';}
  } else if(Notification.permission==='denied'){
    if(st){st.innerHTML='<span style="color:var(--rdt);font-weight:600">Permiso denegado.</span> Activa las notificaciones en la configuracion del navegador y recarga la app.';st.style.color='';}
  } else {
    // permission === 'default': todavía no se ha pedido o no se ha decidido
    if(st){
      st.innerHTML='<button class="btn bp bsm" style="font-size:12px;padding:5px 12px" onclick="Notification.requestPermission().then(p=>{ const s=document.getElementById(\'notif-status\'); if(p===\'granted\'){s.innerHTML=\'<span style=\\"color:var(--gt);font-weight:600\\">Notificaciones activas</span> — los pushes llegaran a los asesorados.\';subscribePush(\'_coach\');restoreNotifications();}else{s.innerHTML=\'<span style=\\"color:var(--rdt);font-weight:600\\">Permiso denegado.</span> Activalas en la configuracion del navegador.\';} })">Activar notificaciones</button>';
      st.style.color='';
    }
  }
}

function scheduleNotification(){
  if(!('Notification' in window)){toast('❌ Este navegador no soporta notificaciones');return;}
  if(Notification.permission!=='granted'){
    Notification.requestPermission().then(p=>{
      if(p==='granted')scheduleNotification();
      else toast('⚠️ Activa los permisos de notificación en tu navegador');
    });
    return;
  }
  const msg=document.getElementById('notif-msg').value.trim();
  const time=document.getElementById('notif-time').value;
  const target=document.getElementById('notif-target').value;
  const repeat=document.querySelector('input[name="notif-repeat"]:checked').value;
  if(!msg){toast('⚠️ Escribe un mensaje');return;}
  if(!time){toast('⚠️ Elige una hora');return;}

  // Guardar notificación programada
  const notifs=JSON.parse(localStorage.getItem('apex_notifs')||'[]');
  const notif={
    id:'n'+Date.now(),
    msg,time,target,repeat,
    createdAt:new Date().toISOString(),
    active:true
  };
  notifs.push(notif);
  localStorage.setItem('apex_notifs',JSON.stringify(notifs));

  // Programar la primera disparo
  fireNotifAt(notif);
  renderScheduledNotifs();
  toast('🔔 Notificación programada para las '+time);
  document.getElementById('notif-msg').value='';
  document.getElementById('notif-tpl').value='';
}

function fireNotifAt(notif){
  const [h,m]=notif.time.split(':').map(Number);
  const now=new Date();
  let target=new Date();
  target.setHours(h,m,0,0);
  if(target<=now)target.setDate(target.getDate()+1); // mañana si ya pasó
  const ms=target-now;

  // Timer principal
  const timerId=setTimeout(()=>{
    const activeNotifs=JSON.parse(localStorage.getItem('apex_notifs')||'[]');
    const still=activeNotifs.find(n=>n.id===notif.id&&n.active);
    if(!still)return;

    // Enviar el push SOLO a los asesorados (a SUS dispositivos). El bucle que mostraba una
    // notificación LOCAL en el navegador del COACH por cada asesorado se ELIMINÓ (v322):
    // hacía que Camilo recibiera en su teléfono las N que eran para ellos (bug 2026-07-11 —
    // "me llegaron las 21 que debían llegarle a los asesorados").
    if(notif.target==='all'){
      DB.clients.forEach(cl=>{
        const body=notif.msg.replace(/\{nombre\}/g,cl.name);
        pushToClient(cl.id,'AVI — Recordatorio',body);
      });
    } else {
      const cl=DB.clients.find(x=>x.id===notif.target);
      if(cl){
        const body=notif.msg.replace(/\{nombre\}/g,cl.name);
        pushToClient(cl.id,'AVI — Recordatorio',body);
      }
    }

    // Reprogramar si es recurrente
    const shouldRepeat=notif.repeat==='daily'||(notif.repeat==='weekdays'&&[1,2,3,4,5].includes(new Date().getDay()));
    if(shouldRepeat)fireNotifAt(notif);
    else{
      // Marcar como completada si es 'once'
      const arr=JSON.parse(localStorage.getItem('apex_notifs')||'[]');
      const idx=arr.findIndex(n=>n.id===notif.id);
      if(idx>=0){arr[idx].active=false;localStorage.setItem('apex_notifs',JSON.stringify(arr));}
    }
  },ms);

  // Guardar timerId para poder cancelar
  window['_notifTimer_'+notif.id]=timerId;
}

function cancelNotification(id){
  const notifs=JSON.parse(localStorage.getItem('apex_notifs')||'[]');
  const idx=notifs.findIndex(n=>n.id===id);
  if(idx>=0){notifs[idx].active=false;localStorage.setItem('apex_notifs',JSON.stringify(notifs));}
  if(window['_notifTimer_'+id])clearTimeout(window['_notifTimer_'+id]);
  renderScheduledNotifs();
  toast('🗑️ Notificación cancelada');
}

function renderScheduledNotifs(){
  const cont=document.getElementById('notif-scheduled');
  if(!cont)return;
  const notifs=JSON.parse(localStorage.getItem('apex_notifs')||'[]').filter(n=>n.active);
  if(!notifs.length){cont.innerHTML='<div style="font-size:12px;color:var(--t3);text-align:center;padding:8px 0">Sin notificaciones programadas</div>';return;}
  cont.innerHTML='<div style="font-size:11px;font-weight:700;color:var(--t2);margin-bottom:8px;letter-spacing:.5px">PROGRAMADAS</div>'+
    notifs.map(n=>{
      const targetName=n.target==='all'?'Todos':DB.clients.find(c=>c.id===n.target)?.name||'?';
      const repeatLabel={once:'Una vez',daily:'Cada día',weekdays:'Lun–Vie'}[n.repeat]||n.repeat;
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--s);border-radius:var(--rsm);margin-bottom:6px;font-size:12px">
        <div style="flex:1"><div style="font-weight:600;color:var(--t1)">🕐 ${esc(n.time)} · ${esc(targetName)} · ${esc(repeatLabel)}</div><div style="color:var(--t2);margin-top:2px">${esc(n.msg.substring(0,60))}${n.msg.length>60?'...':''}</div></div>
        <button class="btn bd" style="padding:3px 8px;font-size:11px" onclick="cancelNotification('${esc(n.id)}')">✕</button>
      </div>`;
    }).join('');
}


function restoreNotifications(){
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  const notifs=JSON.parse(localStorage.getItem('apex_notifs')||'[]').filter(n=>n.active);
  notifs.forEach(n=>fireNotifAt(n));
  if(notifs.length)log('AVI: '+notifs.length+' notificaci\u00f3n(es) restauradas');
}

// ══════════════ HÁBITOS DE HOY (v300): 💧 AGUA POR VASOS ══════════════
// Tarjeta compacta en la pantalla "Hoy" (también en días de descanso — el agua es
// diaria). El registro vive en client.habits y viaja SOLO en el perfil (clientToRow
// copia todas las claves, mismo camino probado que painCare). La lógica es pura y
// testeada en avi-core (waterGoalGlasses/waterToday/waterAdd/waterWeek).
// La meta respeta el plan nutricional del coach (nut.water, ya viene en vasos);
// sin plan → se calcula del peso (~35 ml/kg). Diseñada para crecer: pasos y
// adherencia de comidas se sumarán a esta misma tarjeta.
function _waterGoalFor(client){
  const nut=(DB.nutrition||{})[client.id];
  const coachGoal=nut&&parseInt(nut.water);
  return (coachGoal>0)?Math.min(30,coachGoal):waterGoalGlasses(client.weight);
}
// Formatea un entero con separador de miles colombiano (8000 → "8.000").
function _fmtSteps(n){ return String(Math.max(0,parseInt(n)||0)).replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }
function _waterBlockHtml(client){
  const goal=_waterGoalFor(client);
  const n=waterToday(client.habits);
  const met=n>=goal;
  const lts=v=>(Math.round(v*WATER_GLASS_ML/100)/10)+' L';
  const pct=Math.min(100,Math.round(n/goal*100));
  const dots=waterWeek(client.habits).map(d=>{
    const cls=d.n>=goal?' full':(d.n>0?' some':'');
    return `<span class="hb-dot${cls}" title="${d.day}: ${d.n} vaso${d.n!==1?'s':''}"></span>`;
  }).join('');
  return `<div class="hb-row">
      <span class="hb-ic" aria-hidden="true">${typeof aviIcon==='function'?aviIcon('droplet',21):'💧'}</span>
      <div class="hb-info">
        <div class="hb-title">Agua de hoy</div>
        <div class="hb-sub" aria-live="polite">${met
          ?`¡Meta cumplida! ${n} vasos · ${lts(n)} 🎉`
          :`<b>${n}</b> de ${goal} vasos · ${lts(n)} de ${lts(goal)}`}</div>
        <div class="hb-bar"><div class="hb-fill${met?' met':''}" style="width:${pct}%"></div></div>
      </div>
      <button type="button" class="hb-btn hb-minus" aria-label="Quitar un vaso (corregir)" onclick="waterTap(-1)">−</button>
      <button type="button" class="hb-btn hb-plus" aria-label="Agregar un vaso de agua" onclick="waterTap(1)">+1</button>
    </div>
    <div class="hb-week" aria-hidden="true">${dots}</div>`;
}
// 👟 Pasos (v362): el asesorado teclea el total que marca su celular (input = fija) y de
// paso puede sumar de a 1.000. Meta fija 8.000 (OMS). Acento verde para distinguir del agua.
function _stepsBlockHtml(client){
  const goal=STEPS_GOAL_DEFAULT;
  const n=stepsToday(client.habits);
  const met=n>=goal;
  const pct=Math.min(100,Math.round(n/goal*100));
  const dots=stepsWeek(client.habits).map(d=>{
    const cls=d.n>=goal?' full':(d.n>0?' some':'');
    return `<span class="hb-dot st${cls}" title="${d.day}: ${_fmtSteps(d.n)} pasos"></span>`;
  }).join('');
  return `<div class="hb-sep"></div>
    <div class="hb-row">
      <span class="hb-ic st" aria-hidden="true">${typeof aviIcon==='function'?aviIcon('footprints',21):'👟'}</span>
      <div class="hb-info">
        <div class="hb-title">Pasos de hoy</div>
        <div class="hb-sub" aria-live="polite">${met
          ?`¡Meta cumplida! ${_fmtSteps(n)} pasos 🎉`
          :`<b class="st">${_fmtSteps(n)}</b> de ${_fmtSteps(goal)} pasos`}</div>
        <div class="hb-bar"><div class="hb-fill st${met?' met':''}" style="width:${pct}%"></div></div>
      </div>
    </div>
    <div class="hb-entry">
      <input type="number" class="hb-num" inputmode="numeric" min="0" max="${STEPS_MAX}" step="100"
        value="${n>0?n:''}" placeholder="Escribe tus pasos de hoy"
        aria-label="Escribe cuántos pasos llevas hoy" onchange="stepsSetInput(this)">
      <button type="button" class="hb-btn hb-plus st" aria-label="Sumar mil pasos" onclick="stepsQuick(1000)">+1.000</button>
    </div>
    <div class="hb-week" aria-hidden="true">${dots}</div>`;
}
// ══════════════════════════════════════════════════════════════════════
// REGISTRO DE ALIMENTOS — F2 (E9, E10, E11, E15 de Fable)
// ──────────────────────────────────────────────────────────────────────
// El motor (snapshot, poda, merge, totales) vive PURO en avi-core desde F0. Aquí va solo lo
// que toca el DOM. Decisiones del PO ya tomadas (§9 del plan): SOLO PREMIUM · el coach ve el
// DETALLE completo, y por eso al asesorado se le AVISA antes de registrar nada.
let _foodCat=null;          // catálogo en memoria (una sola carga por sesión)
let _foodCatCargando=null;
// E9 — DEGRADACIÓN: si `foods.json` no carga (primera visita sin red, archivo caído), NO se
// queda sin catálogo: `foodCatalog(null)` devuelve los 50 que viajan dentro de avi-core.
function foodCatalogLoad(){
  if(_foodCat)return Promise.resolve(_foodCat);
  if(_foodCatCargando)return _foodCatCargando;
  // El `?v=` tiene que ser el MISMO con el que el Service Worker precacheó el archivo, o la
  // petición no matchea el precache y la primera visita sin red se queda sin catálogo. No hay
  // constante de versión en runtime: se lee del propio `<script>` que cargó avi-core.
  let v='';
  try{ const s=document.querySelector('script[src*="avi-core.js?v="]');
       const m=s&&s.getAttribute('src').match(/\?v=(\d+)/); if(m)v='?v='+m[1]; }catch(e){}
  _foodCatCargando=fetch('foods.json'+v)
    .then(r=>r.ok?r.json():null)
    .catch(()=>null)
    .then(j=>{ _foodCat=foodCatalog(j); _foodCatCargando=null; return _foodCat; });
  return _foodCatCargando;
}
const FOODLOG_MEAL_LABEL={desayuno:'Desayuno',media_m:'Media mañana',almuerzo:'Almuerzo',media_t:'Media tarde',cena:'Cena'};
// La semana de nutrición de UNA persona. Extraída de `renderNutritionClient`, que la calculaba
// inline: ahora las dos superficies leen de aquí y no se pueden separar (regla de v435).
function _nutSemanaDe(clientId){
  try{
    const c=(DB.clients||[]).find(x=>x.id===clientId);
    if(!c||typeof nutBaseFor!=='function'||typeof nutWeekTargets!=='function')return null;
    const base=nutBaseFor(c,(DB.nutrition||{})[clientId],_nutPesoDe(c));
    return base?nutWeekTargets(base,c.routines):null;
  }catch(e){ warn('AVI: la semana de nutrición no se pudo armar:',e&&e.message); return null; }
}
function _foodLogTargetHoy(clientId){
  const sem=_nutSemanaDe(clientId);
  if(!sem)return null;
  const d=sem.days.find(x=>x.dayIndex===new Date().getDay());
  return d?d.target:null;
}
// ── Tarjeta en «Hoy»: tercer bloque de hábitos, al lado del agua y los pasos ──
function _foodLogBlockHtml(client){
  const hoy=foodLogDay(client.foodlog);
  const tot=foodLogTotals(hoy);
  const meta=_foodLogTargetHoy(client.id);
  const pr=foodLogProgress(tot,meta);
  const pct=pr.kcal.pct==null?0:Math.min(100,pr.kcal.pct);
  const sub=!meta
    ? (tot.n?`<b>${tot.kcal}</b> kcal registradas hoy`:'Anota lo que comes y llévalo claro')
    : (tot.n
        ? `<b>${pr.kcal.hecho}</b> de ${pr.kcal.meta} kcal${pr.kcal.falta?` · te faltan ${pr.kcal.falta}`:' · meta cumplida 🎉'}`
        : `Tu meta de hoy: <b>${pr.kcal.meta}</b> kcal`);
  return `<div class="hb-sep"></div>
    <div class="hb-row">
      <span class="hb-ic fl" aria-hidden="true">${typeof aviIcon==='function'?aviIcon('utensils',21):'🍽️'}</span>
      <div class="hb-info">
        <div class="hb-title">Comida de hoy</div>
        <div class="hb-sub" aria-live="polite">${sub}</div>
        <div class="hb-bar"><div class="hb-fill fl${pct>=100?' met':''}" style="width:${pct}%"></div></div>
      </div>
      <button type="button" class="hb-btn hb-plus fl" aria-label="Registrar lo que comí" onclick="openFoodLogRoom()">+</button>
    </div>`;
}
function renderHabitsCard(client){
  const el=document.getElementById('cn-habits'); if(!el)return;
  if(!client){ el.innerHTML=''; return; }
  // El registro es PREMIUM (decisión del PO): al tier libre no se le muestra ni el bloque, para
  // no ofrecerle una puerta que no puede abrir.
  const conComida=!(typeof isFreeClient==='function'&&isFreeClient(client));
  el.innerHTML=`<div class="hb-card" role="group" aria-label="Tus hábitos de hoy">
    ${_waterBlockHtml(client)}
    ${_stepsBlockHtml(client)}
    ${conComida?_foodLogBlockHtml(client):''}
  </div>`;
}
// ── La habitación del registro ────────────────────────────────────────────────
// Estado de la vista, NO de los datos (los datos viven en client.foodlog).
let _flView={modo:'dia',meal:'desayuno',q:'',offset:0,sel:null};
function openFoodLogRoom(meal){
  const c=(DB.clients||[]).find(x=>x.id===CUR.clientId); if(!c)return;
  if(typeof isFreeClient==='function'&&isFreeClient(c))return;
  _flView={modo:'dia',meal:meal||_flView.meal||'desayuno',q:'',offset:0,sel:null};
  const room=document.getElementById('foodlog-room'); if(!room)return;
  renderFoodLogRoom();
  const body=document.getElementById('flroom-body'); if(body)body.scrollTop=0;
  _roomFront(room); _syncRoomBodyClass();
  foodCatalogLoad().then(()=>{ if(_flView.modo==='buscar')renderFoodLogRoom(); });
}
function closeFoodLogRoom(){
  const room=document.getElementById('foodlog-room');
  if(room)room.classList.remove('on');
  _syncRoomBodyClass();
}
// El asesorado tiene que SABER que su coach ve el detalle antes de escribir nada. Decisión del
// PO (§9.2): la protección es la transparencia, no esconder el dato. La aceptación viaja en su
// perfil (sincroniza), no en una clave suelta del teléfono.
function _flAvisoHtml(c){
  // En SU PROPIO entrenamiento el coach es el dueño del dato: decirle «lo ve tu coach» no tiene
  // sentido y suena a que alguien más lo está mirando. Mismo patrón que el resto de COACH_SELF.
  const propio=(typeof COACH_SELF!=='undefined'&&COACH_SELF);
  const cuerpo=propio
    ? `Este es <b>tu propio registro</b>: lo que anotes aquí es tuyo y nadie más lo ve. Sirve para llevar la cuenta de tu día contra tu plan.<br><br>Puedes dejar de registrar cuando quieras.`
    : `Lo que registres aquí <b>lo ve tu coach</b>, con el detalle de cada comida. Es justamente para que pueda ayudarte: sin ver qué comiste, un «no cumpliste» no le dice si fue el pan de la noche o que te saltaste el desayuno.<br><br>Puedes dejar de registrar cuando quieras.`;
  return `<div style="background:var(--bll);border-left:3px solid var(--bl);border-radius:var(--rsm);padding:14px;margin-bottom:14px">
    <div style="font-size:14px;font-weight:800;color:var(--blt);margin-bottom:6px">Antes de empezar</div>
    <div style="font-size:13px;line-height:1.6;color:var(--blt)">${cuerpo}</div>
    <button class="btn bp bsm" style="width:100%;margin-top:12px" onclick="flAceptarAviso()">${propio?'Empezar a registrar':'Entendido, quiero registrar'}</button>
  </div>`;
}
function flAceptarAviso(){
  const c=(DB.clients||[]).find(x=>x.id===CUR.clientId); if(!c)return;
  c.foodlogOk=new Date().toISOString();
  sv('ax_c',DB.clients);
  renderFoodLogRoom();
}
function _flMacroChip(et,o,unidad){
  const pct=o.pct==null?null:Math.min(100,o.pct);
  return `<div style="flex:1;min-width:0;text-align:center;background:var(--bg);border-radius:var(--rsm);padding:8px 4px">
    <div style="font-size:15px;font-weight:800;color:var(--t1)">${o.hecho}${unidad}</div>
    <div style="font-size:10px;color:var(--t2)">${et}${o.meta?' de '+o.meta+unidad:''}</div>
    ${pct==null?'':`<div style="height:3px;background:var(--br);border-radius:2px;margin-top:5px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${o.pct>110?'var(--or)':'var(--g)'}"></div></div>`}
  </div>`;
}
function renderFoodLogRoom(){
  const body=document.getElementById('flroom-body'); if(!body)return;
  const c=(DB.clients||[]).find(x=>x.id===CUR.clientId); if(!c){body.innerHTML='';return;}
  if(!c.foodlogOk){ body.innerHTML=_flAvisoHtml(c)+'<div style="height:30px"></div>'; return; }
  body.innerHTML=(_flView.modo==='buscar'?_flBuscarHtml(c):_flDiaHtml(c))+'<div style="height:40px"></div>';
}
function _flDiaHtml(c){
  const hoy=foodLogDay(c.foodlog);
  const tot=foodLogTotals(hoy);
  const pr=foodLogProgress(tot,_foodLogTargetHoy(c.id));
  let html=`<div style="display:flex;gap:6px;margin-bottom:6px">
      ${_flMacroChip('kcal',pr.kcal,'')}${_flMacroChip('prot',pr.p,'g')}${_flMacroChip('carbs',pr.c,'g')}${_flMacroChip('grasas',pr.f,'g')}
    </div>`;
  if(pr.parcial)html+=`<div style="font-size:11.5px;color:var(--t2);margin-bottom:10px">Alguno de estos alimentos no trae todos sus datos, así que el total va incompleto.</div>`;
  else html+=`<div style="height:8px"></div>`;
  FOODLOG_MEALS.forEach(m=>{
    const items=hoy.filter(e=>e.meal===m);
    const kc=Math.round(items.reduce((a,e)=>a+(parseFloat(e.kcal)||0),0));
    html+=`<div style="margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
        <div style="font-size:13px;font-weight:800;color:var(--t1)">${FOODLOG_MEAL_LABEL[m]}${items.length?` <span style="font-weight:600;color:var(--t2)">· ${kc} kcal</span>`:''}</div>
        <button class="btn bg bsm" style="min-height:32px;padding:0 12px" onclick="flBuscar('${m}')">+ Agregar</button>
      </div>`;
    if(!items.length){
      html+=`<div style="font-size:12px;color:var(--t3);padding:8px 10px;background:var(--bg);border-radius:var(--rsm)">Sin registrar</div>`;
    }else{
      items.forEach(e=>{
        html+=`<div style="display:flex;align-items:center;gap:10px;padding:9px 10px;background:var(--w);border:1px solid var(--br);border-radius:var(--rsm);margin-bottom:6px">
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.name||'Alimento')}</div>
            <div style="font-size:11px;color:var(--t2)">${e.g} g · ${e.kcal==null?'sin datos':e.kcal+' kcal'}</div>
          </div>
          <button class="btn bg bsm" style="min-height:34px;min-width:38px;padding:0 10px" aria-label="Quitar ${esc(e.name||'alimento')}" onclick="flQuitar('${esc(e.id)}')">✕</button>
        </div>`;
      });
    }
    html+=`</div>`;
  });
  return html;
}
function _flBuscarHtml(c){
  const cat=_foodCat||[];
  const r=foodSearch(cat,_flView.q,{limit:FOOD_PAGE,offset:0});
  let html=`<div style="margin-bottom:12px">
      <button class="btn bg bsm" style="margin-bottom:10px" onclick="flVolverDia()">‹ ${FOODLOG_MEAL_LABEL[_flView.meal]}</button>
      <input class="inp" id="fl-q" type="search" inputmode="search" placeholder="Busca un alimento (arroz, huevo, lulo…)"
        value="${esc(_flView.q)}" aria-label="Buscar alimento" oninput="flQ(this.value)">
    </div>`;
  if(!cat.length)return html+`<div class="empty" style="padding:24px"><div class="etxt">Cargando alimentos…</div></div>`;
  if(_flView.sel)return html+_flCantidadHtml(_flView.sel);
  if(!r.total)return html+`<div class="empty" style="padding:24px"><div class="etxt">No encontramos ese alimento</div><div class="esub">Prueba con otro nombre — la lista tiene ${cat.length} alimentos.</div></div>`;
  html+=`<div style="font-size:11px;color:var(--t3);margin-bottom:8px">${r.total} resultado${r.total!==1?'s':''}${r.hayMas?' · mostrando los primeros '+r.items.length:''}</div>`;
  r.items.forEach(f=>{
    html+=`<button type="button" style="display:block;width:100%;text-align:left;padding:10px 12px;background:var(--w);border:1px solid var(--br);border-radius:var(--rsm);margin-bottom:6px;cursor:pointer" onclick="flElegir('${esc(f.id)}')">
      <div style="font-size:13px;color:var(--t1);font-weight:600">${esc(f.name)}</div>
      <div style="font-size:11px;color:var(--t2)">${f.kcal==null?'sin datos':f.kcal+' kcal por 100 g'}${f.un?` · ${esc(f.un.label)} ${f.un.g} g`:''}</div>
    </button>`;
  });
  return html;
}
function _flCantidadHtml(f){
  const un=f.un&&f.un.g>0?f.un:null;
  return `<div style="background:var(--w);border:1px solid var(--br);border-radius:var(--r);padding:14px">
    <div style="font-size:15px;font-weight:800;color:var(--t1);margin-bottom:2px">${esc(f.name)}</div>
    <div style="font-size:11.5px;color:var(--t2);margin-bottom:12px">${f.kcal==null?'sin datos':f.kcal+' kcal por 100 g'}</div>
    ${un?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
      ${[0.5,1,2].map(n=>`<button class="btn bg bsm" onclick="flGuardar('${esc(f.id)}',${Math.round(un.g*n)})">${n===0.5?'½':n} ${esc(un.label)} · ${Math.round(un.g*n)} g</button>`).join('')}
    </div>`:''}
    <label class="ilbl">O escribe los gramos</label>
    <div style="display:flex;gap:8px;align-items:center">
      <input class="inp" id="fl-g" type="number" inputmode="numeric" min="1" max="${FOODLOG_MAX_G}" placeholder="Ej: 150" style="flex:1">
      <button class="btn bp" onclick="flGuardarInput('${esc(f.id)}')">Agregar</button>
    </div>
    <button class="btn bg bsm" style="width:100%;margin-top:10px" onclick="flCancelarSel()">Elegir otro alimento</button>
  </div>`;
}
function flBuscar(meal){ _flView.modo='buscar'; _flView.meal=meal||_flView.meal; _flView.q=''; _flView.sel=null; renderFoodLogRoom(); foodCatalogLoad().then(()=>renderFoodLogRoom()); }
function flVolverDia(){ _flView.modo='dia'; _flView.sel=null; renderFoodLogRoom(); }
function flCancelarSel(){ _flView.sel=null; renderFoodLogRoom(); }
function flQ(v){
  _flView.q=v||'';
  const foco=document.activeElement===document.getElementById('fl-q');
  renderFoodLogRoom();
  if(foco){ const i=document.getElementById('fl-q'); if(i){ i.focus(); i.setSelectionRange(i.value.length,i.value.length); } }
}
function flElegir(id){
  const f=(_foodCat||[]).find(x=>x.id===id); if(!f)return;
  _flView.sel=f; renderFoodLogRoom();
}
function flGuardarInput(id){
  const i=document.getElementById('fl-g');
  flGuardar(id,i?i.value:0);
}
function flGuardar(id,gramos){
  const c=(DB.clients||[]).find(x=>x.id===CUR.clientId); if(!c)return;
  const f=(_foodCat||[]).find(x=>x.id===id); if(!f)return;
  const e=foodLogEntry(f,gramos,_flView.meal);
  if(!e){ toast('Escribe cuántos gramos comiste'); return; }
  c.foodlog=foodLogAdd(c.foodlog,e);
  sv('ax_c',DB.clients);
  _flView.modo='dia'; _flView.sel=null; _flView.q='';
  renderFoodLogRoom(); renderHabitsCard(c);
  if(navigator.vibrate)navigator.vibrate(15);
  toast('🍽️ '+f.name+' agregado');
}
function flQuitar(entryId){
  const c=(DB.clients||[]).find(x=>x.id===CUR.clientId); if(!c)return;
  c.foodlog=foodLogRemove(c.foodlog,habitDayKey(),entryId);
  sv('ax_c',DB.clients);
  renderFoodLogRoom(); renderHabitsCard(c);
}

function waterTap(delta){
  const c=DB.clients.find(x=>x.id===CUR.clientId); if(!c)return;
  const goal=_waterGoalFor(c);
  const before=waterToday(c.habits);
  c.habits=waterAdd(c.habits,delta);
  sv('ax_c',DB.clients); // debounce del sync: varios toques seguidos = una escritura
  renderHabitsCard(c);
  if(delta>0&&navigator.vibrate)navigator.vibrate(15);
  if(delta>0&&before<goal&&waterToday(c.habits)>=goal)toast('💧 ¡Meta de agua cumplida! Tu cuerpo te lo agradece');
}
// Fija el total de pasos del día con lo que escribió (lee su celular). El clamp vive en el core.
function stepsSetInput(inp){
  const c=DB.clients.find(x=>x.id===CUR.clientId); if(!c)return;
  const before=stepsToday(c.habits);
  c.habits=stepsSet(c.habits,inp?inp.value:0);
  sv('ax_c',DB.clients);
  renderHabitsCard(c);
  if(navigator.vibrate)navigator.vibrate(15);
  if(before<STEPS_GOAL_DEFAULT&&stepsToday(c.habits)>=STEPS_GOAL_DEFAULT)toast('👟 ¡Meta de pasos cumplida! Bien hecho');
}
// Suma rápida de +1.000 pasos.
function stepsQuick(delta){
  const c=DB.clients.find(x=>x.id===CUR.clientId); if(!c)return;
  const before=stepsToday(c.habits);
  c.habits=stepsAdd(c.habits,delta);
  sv('ax_c',DB.clients);
  renderHabitsCard(c);
  if(navigator.vibrate)navigator.vibrate(15);
  if(before<STEPS_GOAL_DEFAULT&&stepsToday(c.habits)>=STEPS_GOAL_DEFAULT)toast('👟 ¡Meta de pasos cumplida! Bien hecho');
}
