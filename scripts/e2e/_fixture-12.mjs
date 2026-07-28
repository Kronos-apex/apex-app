// _fixture-12.mjs — EL MISMO DATO PARA TODAS LAS AUDITORÍAS DE LAS 12 SUPERFICIES.
//
// Nació de la FASE 2 (recorrido asertivo) y la FASE 3 (contraste y letra grande) lo necesita
// IGUAL. Copiarlo habría sido garantizar que se separen: dos auditorías midiendo dos apps
// distintas es peor que no medir. La forma del dato es la REAL de producción — `muscleLabel`
// presente en unos ejercicios y ausente en otros, como las rutinas viejas de 8 personas del
// gimnasio (un fixture irreal ya fabricó un defecto falso en la FASE 1).
export const FIXTURE = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const hoy=days[new Date().getDay()];
  const ex=(id,n,m,lbl,t,s,r)=>{const e={id:id,name:n,muscle:m,type:t,sets:s,reps:r};if(lbl)e.muscleLabel=lbl;return e;};
  const rut=(id,n,d)=>({id:id,name:n,day:d,restSec:90,exercises:[
    ex('e1','Sentadilla','piernas','Cuádriceps y glúteo','Compuesto',4,'12'),
    ex('e2','Press de Banca con Barra','pecho','Pecho','Compuesto',4,'10'),
    ex('e3','Curl de Bíceps','biceps','','Aislamiento',3,'12'),
    ex('e4','Plancha','core','','Isométrico',3,'40')]});
  const _dk=off=>{const d=new Date();d.setDate(d.getDate()-off);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const ses=(cid,off,vol)=>{const d=new Date();d.setDate(d.getDate()-off);d.setHours(18,0,0,0);
    return {id:cid+'s'+off,sessionId:cid+'sid'+off,routineId:'r1',routineName:'Full body A',date:d.toISOString(),
      startedAt:d.toISOString(),finishedAt:d.toISOString(),totalVol:vol,doneSets:12,totalSets:12,
      exercises:[{name:'Sentadilla',muscle:'piernas',track:'peso_reps',sets:[{done:true,kg:'60',reps:'12'},{done:true,kg:'65',reps:'10'}]},
                 {name:'Press de Banca con Barra',muscle:'pecho',track:'peso_reps',sets:[{done:true,kg:'40',reps:'10'}]}]};};
  const cli={id:'cA',name:'Santiago Rivera',email:'santiago.rivera@gmail.com',goal:'Ganar músculo',level:'Intermedio',
    days:3,weight:78,height:176,age:29,sex:'M',phone:'3001234567',tier:'premium',
    notes:'Cuida la zona lumbar en peso muerto.',
    payments:[{date:'2026-06-15',dueDate:'2026-08-05',amount:120000,note:'Mensualidad julio'}],
    routines:[rut('r1','Full body A',hoy),rut('r2','Full body B','Miércoles'),rut('r3','Full body C','Viernes')],
    habits:{water:{[_dk(0)]:6,[_dk(1)]:8,[_dk(2)]:4,[_dk(3)]:8},steps:{[_dk(0)]:6200,[_dk(1)]:9100}}};
  const otro=(id,nm,due,sex,goal)=>({id,name:nm,email:nm.toLowerCase().replace(/ /g,'.')+'@gmail.com',goal,level:'Principiante',
    days:3,weight:70,height:170,age:31,sex,phone:'3009876543',tier:'premium',
    payments:[{date:'2026-06-15',dueDate:due,amount:120000}],routines:[rut('r9','Full body A','Lunes')]});
  DB.clients=[cli, otro('cB','Andrea Molina','2026-07-16','F','Bajar de peso'), otro('cC','Julián Restrepo','2026-07-02','M','Fuerza')];
  DB.history={cA:[ses('cA',0,4800),ses('cA',2,4600),ses('cA',5,4400),ses('cA',7,4200),ses('cA',9,4000)],cB:[ses('cB',1,3200)]};
  DB.prs={cA:{e1:{name:'Sentadilla',kg:120,reps:5,date:'2026-07-20',val:120,unit:'kg'},e2:{name:'Press de Banca con Barra',kg:85,reps:5,date:'2026-07-10',val:85,unit:'kg'}}};
  DB.bodyweight={cA:[{date:_dk(0),kg:78.2},{date:_dk(7),kg:78.9},{date:_dk(14),kg:79.4}]};
  DB.msgs={cA:[{from:'coach',text:'¡Buen trabajo hoy Santiago!',date:new Date(Date.now()-5*3.6e6).toISOString()},
               {from:'client',text:'Gracias coach, me sentí fuerte 💪',date:new Date(Date.now()-3*3.6e6).toISOString()}],
           cB:[{from:'client',text:'Coach, me dolió un poco la rodilla en la sentadilla',date:new Date(Date.now()-2*3.6e6).toISOString()}]};
  DB.nutrition={cA:{water:8,kcal:2600,prot:160,carb:280,fat:80,meals:[{name:'Desayuno',items:'Huevos, avena, fruta'},{name:'Almuerzo',items:'Pollo, arroz, ensalada'}]}};
  DB.medidas={cA:[{date:_dk(0),cintura:82,pecho:100,brazo:36}]};
  DB.templates=[{id:'t1',name:'Full Body Principiante',tag:'Principiante',restSec:90,note:'Primeras 3 semanas.',
                 exercises:[ex('e1','Sentadilla','piernas','Cuádriceps y glúteo','Compuesto',3,'12')]},
                {id:'t2',name:'Empuje — Hipertrofia',tag:'Intermedio',restSec:75,
                 exercises:[ex('e2','Press de Banca con Barra','pecho','Pecho','Compuesto',4,'10')]}];
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,x)=>Math.max(m,x.v),0)));
  // La píldora, en el estado REAL de quien no ha instalado la app.
  const b=document.getElementById('install-banner'); if(b){b.classList.remove('hide');b.style.display='flex';}
  return 'ok';
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})()`;

export const TABS = [
  ['a1-hoy', '#cn-today', 0], ['a2-rutinas', '#cn-routines', 1], ['a3-mensajes', '#cn-messages', 2],
  ['a4-progreso', '#cn-history', 3], ['a5-perfil', '#cn-profile', 4], ['a6-comunidad', '#cn-community', 5]
];

export const PANELES = [
  ['c1-inicio', '#p-home', `gp('p-home',document.getElementById('sbi-home'),'Inicio');renderHome();`],
  ['c2-asesorados', '#p-clients', `gp('p-clients',document.getElementById('sbi-clients'),'Asesorados');renderClients();`],
  ['c3-ficha', '#p-detail', `openDetail('cA');`],
  ['c4-plantillas', '#p-templates', `gp('p-templates',document.getElementById('sbi-templates'),'Plantillas');renderTemplates();`],
  ['c5-ejercicios', '#p-exercises', `gp('p-exercises',document.getElementById('sbi-exercises'),'Ejercicios');renderExercises();`],
  ['c6-mensajes', '#p-msgs', `gp('p-msgs',document.getElementById('sbi-msgs'),'Mensajes');renderMsgs();`]
];
