// Paridad avi-core.communitySnapshot (JS, local=UTC-5) vs port de refresh_snapshot (edge, Bogota fijo).
// Máquina en UTC-5 → ambas bases coinciden → deben dar EXACTAMENTE lo mismo.
const core = require('../../avi-core.js');

// ---- Port EXACTO de la edge (copiado de supabase/functions/refresh_snapshot/index.ts, sin tipos) ----
const BOGOTA_OFFSET_MS = 5 * 3600 * 1000;
const GX_MINS = [0, 10, 30, 60, 120];
function bogotaDayStart(t){ const s=new Date(t-BOGOTA_OFFSET_MS); s.setUTCHours(0,0,0,0); return s.getTime()+BOGOTA_OFFSET_MS; }
function bogotaWeekStart(t){ const s=new Date(t-BOGOTA_OFFSET_MS); s.setUTCHours(0,0,0,0); const dow=s.getUTCDay(); s.setUTCDate(s.getUTCDate()-((dow+6)%7)); return s.getTime()+BOGOTA_OFFSET_MS; }
function planDays(routines, days){ const fromR=(routines||[]).filter(r=>r&&r.day&&r.day!=='Libre').length; const d=fromR||parseInt(days)||3; return Math.max(1,Math.min(7,d)); }
function gxLevelN(total){ let n=1; for(let i=0;i<GX_MINS.length;i++){ if(total>=GX_MINS[i]) n=i+1; } return n; }
function weekStreakWeeks(hist,tgt,nowT){ const byWeek={}; for(const h of (hist||[])){ const t=new Date(h&&h.date).getTime(); if(isNaN(t))continue; const wk=bogotaWeekStart(t); (byWeek[wk]=byWeek[wk]||new Set()).add(bogotaDayStart(t)); } const WEEK=7*86400000; const curWk=bogotaWeekStart(nowT); const met=((byWeek[curWk]&&byWeek[curWk].size)||0)>=tgt; let weeks=0; let cur=met?curWk:curWk-WEEK; while(byWeek[cur]&&byWeek[cur].size>=tgt){ weeks++; cur-=WEEK; } return weeks; }
function edgeSnapshot(row,nowT){
  const hist=Array.isArray(row&&row.history)?row.history:[];
  const prs=(row&&row.prs)||{};
  const total=hist.length;
  const totalVol=hist.reduce((s,h)=>s+((h&&h.totalVol)||0),0);
  const lvl=gxLevelN(total);
  const prsCount=Object.keys(prs).length;
  const tgt=planDays(row&&row.routines, row&&row.profile&&row.profile.days);
  const streak_weeks=weekStreakWeeks(hist,tgt,nowT);
  const today=bogotaDayStart(nowT);
  const cutoff=today-27*86400000;
  const days4w=new Set(); let trained_today=false;
  for(const h of hist){ const t=new Date(h&&h.date).getTime(); if(isNaN(t))continue; const ds=bogotaDayStart(t); if(ds>=cutoff)days4w.add(ds); if(ds===today)trained_today=true; }
  const badges=[prsCount>=1,total>=10,total>=30,totalVol>=10000,totalVol>=50000,totalVol>=20000,lvl>=3,lvl>=4];
  return { streak_weeks, sessions_4w: days4w.size, level: lvl, achievements: badges.filter(Boolean).length, trained_today };
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
