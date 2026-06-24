// ══════════════ PLAN NUTRICIONAL ══════════════

// calcMacrosSugeridos → avi-core.js (fuente única de verdad)

const NUT_TEMPLATES=[
  {label:'Cutting 🔻',goal:'cutting',kcal:1800,prot:160,carbs:160,fat:55,water:10,meals:'4',
   plan:'Déficit calórico moderado para perder grasa preservando músculo.\nPrioriza proteína en cada comida.',
   examples:'Desayuno: 3 claras + 1 huevo revuelto con avena y fruta\nAlmuerzo: Arroz integral, pechuga a la plancha y ensalada\nMerienda: Yogur griego con frutas\nCena: Sopa de verduras con atún al natural',
   avoid:'Azúcares simples, frituras, bebidas azucaradas, alcohol'},
  {label:'Volumen 💪',goal:'volumen',kcal:3200,prot:180,carbs:380,fat:80,water:12,meals:'5',
   plan:'Superávit calórico limpio para ganar masa muscular con mínima grasa.\nDistribuye las comidas cada 3-4 horas.',
   examples:'Desayuno: Avena con leche, banano y 3 huevos revueltos\nMerienda AM: Batido de proteína con avena y mantequilla de maní\nAlmuerzo: Arroz, pasta o papa + carne roja o pollo + aguacate\nMerienda PM: Yogur griego con granola y frutas\nCena: Pollo o atún con camote y brócoli',
   avoid:'Comida chatarra, azúcares procesados en exceso'},
  {label:'Mantenimiento ⚖️',goal:'mantenimiento',kcal:2400,prot:150,carbs:270,fat:75,water:9,meals:'3',
   plan:'Balance calórico para mantener el peso y la composición corporal actual.\nCome variado y equilibrado.',
   examples:'Desayuno: Huevos, tostadas integrales y fruta\nAlmuerzo: Proteína + carbohidrato complejo + vegetales\nCena: Proteína ligera con ensalada abundante',
   avoid:'Exceso de ultraprocesados y azúcares refinados'},
  {label:'Definición 🔥',goal:'definicion',kcal:2000,prot:175,carbs:185,fat:60,water:11,meals:'4',
   plan:'Déficit moderado con alta proteína para definir músculo y perder grasa.\nIdeal para quienes ya tienen base muscular.',
   examples:'Desayuno: Claras de huevo, avena y café sin azúcar\nAlmuerzo: Pollo o pescado, arroz integral y vegetales al vapor\nMerienda: Atún con galletas de arroz\nCena: Ensalada grande con proteína magra',
   avoid:'Sodio en exceso, alcohol, azúcares, grasas saturadas'},
];

function applyNutTemplate(idx){
  const t=NUT_TEMPLATES[idx];if(!t)return;
  document.getElementById('nut-kcal').value=t.kcal;
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
  if(!nut.kcal && !nut.plan){
    const sug=calcMacrosSugeridos(c);
    document.getElementById('nut-kcal').value=sug.kcal;
    document.getElementById('nut-prot').value=sug.prot;
    document.getElementById('nut-carbs').value=sug.carbs;
    document.getElementById('nut-fat').value=sug.fat;
    document.getElementById('nut-water').value=sug.water;
    const nota=document.getElementById('nut-calc-nota');
    if(nota){nota.style.display='block';nota.innerHTML='&#128161; Valores calculados para <strong>'+esc(c.name)+'</strong> ('+Math.round(parseFloat(c.weight)||0)+'kg &middot; '+(c.activity||'actividad media')+' &middot; objetivo: '+(c.goal||'general')+'). Ajusta seg&uacute;n tu criterio.';}
  } else {
    const nota=document.getElementById('nut-calc-nota');
    if(nota)nota.style.display='none';
  }
  om('m-nut');
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
      ${nut.kcal?`<div style="text-align:center;background:var(--gl);border-radius:var(--rsm);padding:8px 4px"><div style="font-size:18px;font-weight:800;color:var(--g)">${esc(String(nut.kcal))}</div><div style="font-size:10px;color:var(--t2)">kcal</div></div>`:''}
      ${nut.prot?`<div style="text-align:center;background:var(--bll);border-radius:var(--rsm);padding:8px 4px"><div style="font-size:18px;font-weight:800;color:var(--bl)">${esc(String(nut.prot))}g</div><div style="font-size:10px;color:var(--t2)">prot</div></div>`:''}
      ${nut.carbs?`<div style="text-align:center;background:var(--yll);border-radius:var(--rsm);padding:8px 4px"><div style="font-size:18px;font-weight:800;color:var(--t1)">${esc(String(nut.carbs))}g</div><div style="font-size:10px;color:var(--t2)">carbs</div></div>`:''}
      ${nut.fat?`<div style="text-align:center;background:var(--orl);border-radius:var(--rsm);padding:8px 4px"><div style="font-size:18px;font-weight:800;color:var(--or)">${esc(String(nut.fat))}g</div><div style="font-size:10px;color:var(--t2)">grasas</div></div>`:''}
    </div>`;
  }
  if(nut.meals)html+=`<div style="font-size:12px;color:var(--t2);margin-bottom:8px">\uD83C\uDF7D\ufe0f ${esc(String(nut.meals))} comidas/d\u00eda</div>`;
  if(nut.water)html+=`<div style="font-size:12px;color:var(--t2);margin-bottom:8px">\uD83D\uDCA7 ${esc(String(nut.water))} vasos de agua/d\u00eda</div>`;
  if(nut.plan)html+=`<div style="white-space:pre-line;font-size:13px;line-height:1.7">${esc(nut.plan)}</div>`;
  if(nut.avoid)html+=`<div style="margin-top:10px;background:var(--rdl);border-radius:var(--rsm);padding:8px 12px;font-size:12px;color:var(--rd)">\u26a0\ufe0f Evitar: ${esc(nut.avoid)}</div>`;
  con.innerHTML=html;
}

// Estado de los "Ejemplos de alimentación" colapsables (dentro de la sesión).
let _nutExOpen=false;
function toggleNutEx(){_nutExOpen=!_nutExOpen;renderNutritionClient(CUR.clientId);}

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
};
// inferNutGoal → avi-core.js (fuente única, testeada). GOAL_WHY (texto del "por qué")
// se queda aquí porque es data de presentación que usa renderNutritionClient.
function openNutriInfo(key){
  const d=NUTRI_INFO[key]; if(!d)return;
  const body=document.getElementById('m-nutri-body'); if(!body)return;
  body.innerHTML=`<div style="text-align:center;margin-bottom:16px;padding-top:6px">
      <div style="font-size:42px;line-height:1">${d.emoji}</div>
      <div class="mdtitle" style="margin:6px 0 2px">${d.title}</div>
      <div style="font-size:12px;color:var(--g);font-weight:700">${d.tag}</div>
    </div>
    <div class="nutri-sec"><div class="nutri-h">¿Qué es?</div><div class="nutri-p">${d.what}</div></div>
    <div class="nutri-sec"><div class="nutri-h">¿Para qué te sirve?</div><div class="nutri-p">${d.why}</div></div>
    <div class="nutri-sec"><div class="nutri-h">¿Dónde lo encuentras?</div><div class="nutri-p">${d.where}</div></div>`;
  om('m-nutri-info');
}
function renderNutritionClient(clientId){
  const con=document.getElementById('cn-nut-body');if(!con)return;
  if(isFreeClient(DB.clients.find(x=>x.id===clientId))){con.innerHTML=premiumLockHTML('Plan nutricional','Calorías, macros y un plan de alimentación armado para ti.');return;}
  // El bot\u00f3n "Editar" solo aparece para el coach en su propio entrenamiento (COACH_SELF):
  // as\u00ed el due\u00f1o ajusta su plan, pero los asesorados lo siguen viendo como lo dej\u00f3 el coach.
  const editBtn=document.getElementById('cn-nut-edit'); if(editBtn)editBtn.style.display=COACH_SELF?'':'none';
  const nut=(DB.nutrition||{})[clientId];
  if(!nut||(!nut.kcal&&!nut.plan&&!nut.examples)){
    con.innerHTML=COACH_SELF
      ? '<div style="text-align:center;padding:20px 0;color:var(--t3)">A\u00fan no has armado tu plan. Toca \u270f\ufe0f Editar para crearlo.</div>'
      : '<div style="text-align:center;padding:20px 0;color:var(--t3)">Tu coach a\u00fan no ha cargado tu plan de alimentaci\u00f3n. Escr\u00edbele si quieres que lo incluya.</div>';
    return;
  }
  let html='';
  // Macros grid
  if(nut.kcal||nut.prot||nut.carbs||nut.fat){
    html+=`<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px">`;
    if(nut.kcal)html+=`<div class="nutri-card" onclick="openNutriInfo('kcal')" style="text-align:center;background:var(--gl);border-radius:var(--rsm);padding:12px 4px"><span class="nutri-i">\u24d8</span><div style="font-size:22px;font-weight:800;color:var(--g)">${esc(String(nut.kcal))}</div><div style="font-size:11px;color:var(--t2);font-weight:600">CALOR\u00cdAS / D\u00cdA</div></div>`;
    if(nut.water)html+=`<div class="nutri-card" onclick="openNutriInfo('water')" style="text-align:center;background:var(--bll);border-radius:var(--rsm);padding:12px 4px"><span class="nutri-i">\u24d8</span><div style="font-size:22px;font-weight:800;color:var(--bl)">${esc(String(nut.water))}</div><div style="font-size:11px;color:var(--t2);font-weight:600">VASOS DE AGUA</div></div>`;
    html+=`</div>`;
    if(nut.prot||nut.carbs||nut.fat){
      html+=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">`;
      if(nut.prot)html+=`<div class="nutri-card" onclick="openNutriInfo('prot')" style="text-align:center;background:var(--bll);border-radius:var(--rsm);padding:10px 4px"><span class="nutri-i">\u24d8</span><div style="font-size:18px;font-weight:800;color:var(--bl)">${esc(String(nut.prot))}g</div><div style="font-size:10px;color:var(--t2)">Prote\u00edna</div><div style="font-size:10px;color:var(--bl);font-weight:600">${nut.prot*4} kcal</div></div>`;
      if(nut.carbs)html+=`<div class="nutri-card" onclick="openNutriInfo('carbs')" style="text-align:center;background:var(--yll);border-radius:var(--rsm);padding:10px 4px"><span class="nutri-i">\u24d8</span><div style="font-size:18px;font-weight:800;color:var(--t1)">${esc(String(nut.carbs))}g</div><div style="font-size:10px;color:var(--t2)">Carbos</div><div style="font-size:10px;color:var(--t2);font-weight:600">${nut.carbs*4} kcal</div></div>`;
      if(nut.fat)html+=`<div class="nutri-card" onclick="openNutriInfo('fat')" style="text-align:center;background:var(--orl);border-radius:var(--rsm);padding:10px 4px"><span class="nutri-i">\u24d8</span><div style="font-size:18px;font-weight:800;color:var(--or)">${esc(String(nut.fat))}g</div><div style="font-size:10px;color:var(--t2)">Grasas</div><div style="font-size:10px;color:var(--or);font-weight:600">${nut.fat*9} kcal</div></div>`;
      html+=`</div>`;
    }
  }
  // \u00bfPor qu\u00e9 este plan? \u2014 explicaci\u00f3n seg\u00fan el objetivo (encima del plan)
  const _gw=GOAL_WHY[inferNutGoal(nut)];
  if(_gw)html+=`<div style="background:var(--gl);border-left:3px solid var(--g);border-radius:var(--rsm);padding:12px 14px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:800;color:var(--gt);margin-bottom:5px">${_gw.title} \u00b7 \u00bfPor qu\u00e9 este plan?</div>
      <div style="font-size:13px;line-height:1.6;color:var(--gt)">${esc(_gw.text)}</div>
    </div>`;
  // Comidas por d\u00eda
  if(nut.meals)html+=`<div style="display:flex;align-items:center;gap:8px;background:var(--bg);border-radius:var(--rsm);padding:10px 12px;margin-bottom:12px;font-size:13px"><span style="font-size:16px">\uD83C\uDF7D\ufe0f</span><span><strong>${esc(String(nut.meals))} comidas por d\u00eda</strong> \u2014 distribuye tus calor\u00edas de manera uniforme</span></div>`;
  // Ejemplos de comidas
  if(nut.examples){
    html+=`<div style="margin-bottom:12px"><div style="font-size:12px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">\ud83d\udca1 Ejemplos de alimentaci\u00f3n</div>`;
    const lines=nut.examples.split('\n').filter(l=>l.trim());
    const exRow=line=>{
      const colonIdx=line.indexOf(':');
      if(colonIdx>0){
        const label=line.slice(0,colonIdx).trim();
        const content=line.slice(colonIdx+1).trim();
        return `<div style="background:var(--w);border:1px solid var(--br);border-radius:var(--rsm);padding:10px 12px;margin-bottom:8px"><div style="font-size:11px;font-weight:700;color:var(--g);text-transform:uppercase;margin-bottom:3px">${esc(label)}</div><div style="font-size:13px;color:var(--t1)">${esc(content)}</div></div>`;
      }
      return `<div style="background:var(--w);border:1px solid var(--br);border-radius:var(--rsm);padding:10px 12px;margin-bottom:8px;font-size:13px;color:var(--t1)">${esc(line)}</div>`;
    };
    // Pocos (≤3): se muestran todos. Largos: asoman 2 y se expanden con el botón.
    const shown=(lines.length>3 && !_nutExOpen)?lines.slice(0,2):lines;
    shown.forEach(line=>{html+=exRow(line);});
    if(lines.length>3)html+=`<button class="collapse-more" onclick="toggleNutEx()">${_nutExOpen?'Ver menos ▴':'Ver los '+lines.length+' ejemplos ▾'}</button>`;
    html+=`</div>`;
  }
  // Plan libre
  if(nut.plan)html+=`<div style="background:var(--gl);border-radius:var(--rsm);padding:12px;margin-bottom:12px;white-space:pre-line;font-size:13px;line-height:1.7;color:var(--gt)">\ud83d\udccb ${esc(nut.plan)}</div>`;
  // Evitar
  if(nut.avoid)html+=`<div style="background:var(--rdl);border-radius:var(--rsm);padding:10px 12px;font-size:12px;color:var(--rd)">\u26a0\ufe0f <strong>Evitar:</strong> ${esc(nut.avoid)}</div>`;
  con.innerHTML=html;
}

function shareNutWhatsapp(){
  const nut=(DB.nutrition||{})[CUR.clientId];
  if(!nut||(!nut.kcal&&!nut.plan)){toast('Tu coach aún no ha asignado un plan nutricional');return;}
  const cl=DB.clients.find(x=>x.id===CUR.clientId);
  const nombre=cl?cl.name.split(' ')[0]:'';
  let msg=`🥗 *MI PLAN NUTRICIONAL - AVI*\n`;
  if(nombre)msg+=`👤 ${nombre}\n`;
  msg+=`\n`;
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
    listEl.innerHTML='Sin medidas registradas. Toca "+ Registrar" para empezar.';
    if(chartWrap)chartWrap.style.display='none';return;
  }
  if(chartWrap){
    const cintPts=entries.filter(e=>e.cintura).slice(0,12).reverse();
    if(cintPts.length>=2){
      chartWrap.style.display='block';
      drawMedChart(document.getElementById('cn-med-chart'),cintPts,'cintura','#E76F51');
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
    const dc=delta===null?'':parseFloat(delta)<0?'var(--g)':parseFloat(delta)>0?'var(--or)':'var(--t3)';
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
    const dc=delta!==null&&parseFloat(delta)<0?'var(--g)':delta!==null&&parseFloat(delta)>0?'var(--or)':'var(--t3)';
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
  container.innerHTML=`<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <path d="${pathD} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z" fill="${color}" fill-opacity="0.1"/>
    <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${pts.map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${color}"/>
      <text x="${p.x.toFixed(1)}" y="${H}" text-anchor="middle" font-size="8" fill="#B0B0B0" font-family="sans-serif">${new Date(p.p.date).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</text>`).join('')}
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
    con.innerHTML='<div style="color:var(--t3);font-size:13px;text-align:center;padding:12px 0">A\u00fan no has subido fotos.</div>';return;
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
    if(st){st.textContent='Este navegador no soporta notificaciones push.';st.style.color='var(--rd)';}
  } else if(Notification.permission==='granted'){
    if(st){st.innerHTML='<span style="color:var(--g);font-weight:600">Notificaciones activas</span> — los pushes llegarán a los asesorados.';st.style.color='';}
  } else if(Notification.permission==='denied'){
    if(st){st.innerHTML='<span style="color:var(--rd);font-weight:600">Permiso denegado.</span> Activa las notificaciones en la configuracion del navegador y recarga la app.';st.style.color='';}
  } else {
    // permission === 'default': todavía no se ha pedido o no se ha decidido
    if(st){
      st.innerHTML='<button class="btn bp bsm" style="font-size:12px;padding:5px 12px" onclick="Notification.requestPermission().then(p=>{ const s=document.getElementById(\'notif-status\'); if(p===\'granted\'){s.innerHTML=\'<span style=\\"color:var(--g);font-weight:600\\">Notificaciones activas</span> — los pushes llegaran a los asesorados.\';subscribePush(\'_coach\');restoreNotifications();}else{s.innerHTML=\'<span style=\\"color:var(--rd);font-weight:600\\">Permiso denegado.</span> Activalas en la configuracion del navegador.\';} })">Activar notificaciones</button>';
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

  // Determinar nombres a notificar
  let names=[];
  if(notif.target==='all'){
    names=DB.clients.map(c=>c.name);
    if(!names.length)names=['Asesorado'];
  } else {
    const c=DB.clients.find(x=>x.id===notif.target);
    names=c?[c.name]:['Asesorado'];
  }

  // Timer principal
  const timerId=setTimeout(()=>{
    const activeNotifs=JSON.parse(localStorage.getItem('apex_notifs')||'[]');
    const still=activeNotifs.find(n=>n.id===notif.id&&n.active);
    if(!still)return;

    names.forEach((nombre,i)=>{
      setTimeout(()=>{
        const body=notif.msg.replace(/\{nombre\}/g,nombre);
        const iconSvg='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="%231B4332"/><text y="44" x="8" font-size="44">%F0%9F%92%AA</text></svg>';
        const opts={body,icon:iconSvg,badge:iconSvg,
          tag:'avi-'+notif.id+'-'+i,
          requireInteraction:false,
          vibrate:[200,100,200,100,200]};
        // Usar SW.showNotification — funciona con app en background en Android/iOS
        if(navigator.serviceWorker&&navigator.serviceWorker.controller){
          navigator.serviceWorker.ready
            .then(reg=>reg.showNotification('AVI — '+getCoachName(),opts))
            .catch(()=>{try{new Notification('AVI — '+getCoachName(),opts);}catch(e){}});
        } else {
          try{new Notification('AVI — '+getCoachName(),opts);}catch(e){warn('Notif:',e);}
        }
      },i*800);
    });

    // Enviar push real a los asesorados
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
