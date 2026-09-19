// Paridad avi-core.communitySnapshot (JS, local=UTC-5) vs port de refresh_snapshot (edge, Bogota fijo).
// Máquina en UTC-5 → ambas bases coinciden → deben dar EXACTAMENTE lo mismo.
const core = require('../../avi-core.js');

// ---- Port EXACTO de la edge (copiado de supabase/functions/refresh_snapshot/index.ts, sin tipos) ----
const BOGOTA_OFFSET_MS = 5 * 3600 * 1000;
const GX_MINS = [0, 10, 30, 60, 120];
function bogotaDayStart(t){ const s=new Date(t-BOGOTA_OFFSET_MS); s.setUTCHours(0,0,0,0); return s.getTime()+BOGOTA_OFFSET_MS; }
function bogotaWeekStart(t){ const s=new Date(t-BOGOTA_OFFSET_MS); s.setUTCHours(0,0,0,0); const dow=s.getUTCDay(); s.setUTCDate(s.getUTCDate()-((dow+6)%7)); return s.getTime()+BOGOTA_OFFSET_MS; }
function ymdBogota(dayStart){ const x=new Date(dayStart-BOGOTA_OFFSET_MS); const mm=String(x.getUTCMonth()+1).padStart(2,'0'); const dd=String(x.getUTCDate()).padStart(2,'0'); return x.getUTCFullYear()+'-'+mm+'-'+dd; }
function planDays(routines, days){ const fromR=(routines||[]).filter(r=>r&&r.day&&r.day!=='Libre').length; const d=fromR||parseInt(days)||3; return Math.max(1,Math.min(7,d)); }
function gxLevelN(total){ let n=1; for(let i=0;i<GX_MINS.length;i++){ if(total>=GX_MINS[i]) n=i+1; } return n; }
function weekStreakWeeks(hist,tgt,nowT){ const byWeek={}; for(const h of (hist||[])){ const t=new Date(h&&h.date).getTime(); if(isNaN(t))continue; const wk=bogotaWeekStart(t); (byWeek[wk]=byWeek[wk]||new Set()).add(bogotaDayStart(t)); } const WEEK=7*86400000; const curWk=bogotaWeekStart(nowT); const met=((byWeek[curWk]&&byWeek[curWk].size)||0)>=tgt; let weeks=0; let cur=met?curWk:curWk-WEEK; while(byWeek[cur]&&byWeek[cur].size>=tgt){ weeks++; cur-=WEEK; } return weeks; }
const STREAK_WEEK_MIN_DAYS=2;
function streakTargetN(routines,days){ return Math.max(1,Math.min(planDays(routines,days),STREAK_WEEK_MIN_DAYS)); }
const ACH_RULES=[["fullWeeks",1],["fullWeeks",4],["fullWeeks",12],["bestStreak",4],["bestStreak",12],["bestStreak",24],["bestStreak",52],["total",1],["total",25],["total",50],["total",100],["total",200],["prs",1],["prs",5],["prs",15],["totalVol",10000],["totalVol",50000],["totalVol",100000],["totalVol",250000],["totalVol",1000000]];
function daysByWeek(hist){ const byWeek={}; for(const h of (hist||[])){ const raw=h&&h.date; if(raw==null||raw==='')continue; const t=new Date(raw).getTime(); if(isNaN(t))continue; const wk=bogotaWeekStart(t); (byWeek[wk]=byWeek[wk]||new Set()).add(bogotaDayStart(t)); } return byWeek; }
function fullWeeksN(hist,planN){ const b=daysByWeek(hist); return Object.keys(b).filter(k=>b[Number(k)].size>=planN).length; }
function longestStreakN(hist,tgt){ const b=daysByWeek(hist); const met=Object.keys(b).map(Number).filter(k=>b[k].size>=tgt).sort((a,c)=>a-c); if(!met.length)return 0; const W=7*86400000; let best=1,cur=1; for(let i=1;i<met.length;i++){ if(met[i]-met[i-1]===W){cur++; if(cur>best)best=cur;} else cur=1; } return best; }
function edgeSnapshot(row,nowT){
  const hist=Array.isArray(row&&row.history)?row.history:[];
  const prs=(row&&row.prs)||{};
  const total=hist.length;
  const totalVol=hist.reduce((s,h)=>s+((h&&h.totalVol)||0),0);
  const lvl=gxLevelN(total);
  const prsCount=Object.keys(prs).length;
  const tgt=streakTargetN(row&&row.routines, row&&row.profile&&row.profile.days);
  const streak_weeks=weekStreakWeeks(hist,tgt,nowT);
  const today=bogotaDayStart(nowT);
  const cutoff=today-27*86400000;
  const days4w=new Set(); let trained_today=false; let minDay=null;
  for(const h of hist){ const raw=h&&h.date; if(raw==null||raw==='')continue; const t=new Date(raw).getTime(); if(isNaN(t))continue; const ds=bogotaDayStart(t); if(ds>=cutoff)days4w.add(ds); if(ds===today)trained_today=true; if(minDay===null||ds<minDay)minDay=ds; }
  const pd=planDays(row&&row.routines, row&&row.profile&&row.profile.days);
  const stats={ total, prs: prsCount, totalVol, fullWeeks: fullWeeksN(hist,pd), bestStreak: longestStreakN(hist,tgt) };
  const achievements=ACH_RULES.filter(([m,g])=>(stats[m]||0)>=g).length;
  return { streak_weeks, sessions_4w: days4w.size, level: lvl, achievements, trained_today, total_sessions: total, training_since: minDay===null?null:ymdBogota(minDay) };
}

// ---- fixtures difíciles ----
const D=(y,m,d,h=12,mi=0)=>new Date(y,m-1,d,h,mi,0);
const iso=dt=>dt.toISOString();
const cases=[];
// 1) 4 entrenos + uno viejo (fuera de 4 sem)
cases.push({name:'basico', client:{days:2}, prs:{e1:{},e2:{}}, now:D(2026,6,3,15),
  hist:[{date:iso(D(2026,6,1)),totalVol:6000},{date:iso(D(2026,6,2)),totalVol:6000},{date:iso(D(2026,6,3)),totalVol:6000},{date:iso(D(2026,4,24)),totalVol:3000}]});
// 2) vacío
cases.push({name:'vacio', client:{days:3}, prs:{}, now:D(2026,6,3), hist:[]});
// 3) racha de 3 semanas + fecha inválida mezclada
cases.push({name:'racha3+basura', client:{days:2}, prs:{e1:{}}, now:D(2026,6,3,15),
  hist:[{date:iso(D(2026,5,18)),totalVol:1},{date:iso(D(2026,5,20)),totalVol:1},{date:iso(D(2026,5,25)),totalVol:1},{date:iso(D(2026,5,27)),totalVol:1},{date:iso(D(2026,6,1)),totalVol:1},{date:iso(D(2026,6,3)),totalVol:1},{date:'basura'},{date:null}]});
// 4) medianoche exacta (23:59 y 00:01) — borde de día
cases.push({name:'medianoche', client:{days:1}, prs:{}, now:D(2026,6,3,10),
  hist:[{date:iso(D(2026,6,3,0,1)),totalVol:1},{date:iso(D(2026,6,2,23,59)),totalVol:1}]});
// 5) corte 4 semanas exacto: día 27 atrás (dentro) y 28 atrás (fuera)
cases.push({name:'corte28', client:{days:3}, prs:{}, now:D(2026,6,29,12),
  hist:[{date:iso(D(2026,6,2,12)),totalVol:1},{date:iso(D(2026,6,1,12)),totalVol:1}]});
// 6) planDays por rutinas (no por days)
cases.push({name:'planDays-rutinas', client:{routines:[{day:'Lunes'},{day:'Miércoles'},{day:'Libre'},{day:''}]}, prs:{}, now:D(2026,6,3,15),
  hist:[{date:iso(D(2026,6,1)),totalVol:1},{date:iso(D(2026,6,3)),totalVol:1}]});
// 7) volumen alto → medallas
cases.push({name:'volumen', client:{days:3}, prs:{a:{}}, now:D(2026,6,3),
  hist:Array.from({length:30},()=>({date:iso(D(2026,6,1)),totalVol:2000}))});

// 8) v641: 13 semanas seguidas con el plan entero (3 días) → sem1/sem4/sem12 + racha4/racha12
{ const h=[]; for(let w=0;w<13;w++){ for(const dd of [0,2,4]){ const x=D(2026,3,2+w*7+dd,19); h.push({date:iso(x),totalVol:900}); } }
  cases.push({name:'constancia-13sem', client:{days:3}, prs:{a:{},b:{},c:{},d:{},e:{}}, now:D(2026,6,3,15), hist:h}); }
// 9) racha rota a mitad + null/'' que NO deben contar como la semana de 1970
{ const h=[{date:null},{date:''}]; for(const w of [0,1,2,3,5,6]){ h.push({date:iso(D(2026,4,6+w*7,8))}); h.push({date:iso(D(2026,4,8+w*7,8))}); }
  cases.push({name:'racha-rota+nulos', client:{days:2}, prs:{}, now:D(2026,6,3,15), hist:h}); }

let fails=0;
for(const c of cases){
  const coreOut=core.communitySnapshot(
    c.client.routines?{routines:c.client.routines}:{days:c.client.days},
    c.hist, c.prs, c.now);
  const edgeOut=edgeSnapshot({history:c.hist, prs:c.prs, routines:c.client.routines, profile:{days:c.client.days}}, c.now.getTime());
  const eq=JSON.stringify(coreOut)===JSON.stringify(edgeOut);
  console.log((eq?'PASS ':'FAIL ')+c.name, eq?'':('\n  core:'+JSON.stringify(coreOut)+'\n  edge:'+JSON.stringify(edgeOut)));
  if(!eq)fails++;
}
console.log(fails? ('\n❌ '+fails+' DIVERGENCIAS'):'\n✅ PARIDAD TOTAL core↔edge');
process.exit(fails?1:0);
