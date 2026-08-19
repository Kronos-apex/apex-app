// ¿Con cuántos asesorados REALES se apilan las tarjetas de «Hoy»?
// Fuente: backup local del 19-ago (user_data), NO producción. Se evalúan las MISMAS
// funciones puras que usa la app (avi-core.js), con los mismos gates que renderClientToday.
// Lo que depende del DISPOSITIVO (permiso de push, novedades ya descartadas, snoozes y
// mutes en localStorage) NO se puede medir desde la nube: se cuenta aparte y solo SUMA.
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const core = require('C:/Users/KRONOS/Desktop/AVI/apex-app/avi-core.js');
const bk = JSON.parse(fs.readFileSync('C:/Users/KRONOS/Desktop/AVI/backups/avi-backup-2026-08-19.json','utf8'));

const NOW = new Date();
const rows = bk.user_data.filter(r => r.role === 'client');

const localDayStart = ts => { const d = new Date(ts); d.setHours(0,0,0,0); return +d; };
const hoy = localDayStart(NOW);

const filas = [];
for (const r of rows) {
  const p = r.profile || {};
  const client = Object.assign({}, p, { id: r.user_id, routines: r.routines || [] });
  const hist = Array.isArray(r.history) ? r.history : [];
  const bw   = Array.isArray(r.bodyweight) ? r.bodyweight : [];
  const prs  = r.prs || {};
  const libre = core.isFreeClient(client);

  // DÍA 1: apaga ONCE tarjetas. Se mide primero porque manda sobre todo lo demás.
  const dia1 = core.firstSessionMode(hist);

  const on = {};
  on['cn-firstrun'] = !!dia1;
  if (!dia1) {
    on['cn-habits']       = true;                                   // siempre (agua/pasos)
    on['qw-entry']        = true;                                   // estático en el HTML
    on['cn-today-upsell'] = libre;                                  // solo tier libre
    on['cn-meals']        = !libre && !!(r.nutrition && Object.keys(r.nutrition).length);
    on['cn-deload']       = !!core.deloadCardText(client, +NOW);
    let ins = null;
    try { ins = core.coachInsight(client, hist, prs, NOW, { bw, waterGoal: core.waterGoalGlasses(p.weight) }); } catch(e){}
    on['cn-coach-card']   = !!ins;
    const entrenoHoy = hist.some(s => s && localDayStart(s.date) === hoy);
    on['cn-missday']      = !entrenoHoy && (core.weeklyMissed(client, hist, NOW) || []).length > 0;
    on['cn-share']        = core.shareBannerEligible(hist, +NOW, 0);
  }
  const visibles = Object.keys(on).filter(k => on[k]);
  filas.push({
    nombre: (p.name || '(sin nombre)').split(' ')[0],
    tier: libre ? 'libre' : 'premium',
    sesiones: hist.length,
    dia1,
    n: visibles.length,
    cuales: visibles.map(x => x.replace('cn-','')).join(', ')
  });
}

filas.sort((a,b) => b.n - a.n || a.nombre.localeCompare(b.nombre));
console.log('ASESORADOS REALES:', filas.length, '· fecha de la medición:', NOW.toISOString().slice(0,10));
console.log('');
console.log('n  quién        tier     ses  tarjetas');
console.log('-- ------------ -------- ---- ' + '-'.repeat(60));
filas.forEach(f => console.log(
  String(f.n).padStart(2) + ' ' + f.nombre.padEnd(12) + ' ' + f.tier.padEnd(8) + ' ' +
  String(f.sesiones).padStart(4) + '  ' + f.cuales));

const dist = {};
filas.forEach(f => dist[f.n] = (dist[f.n]||0)+1);
console.log('');
console.log('DISTRIBUCIÓN (tarjetas simultáneas → cuánta gente)');
Object.keys(dist).map(Number).sort((a,b)=>a-b).forEach(k =>
  console.log('  ' + String(k).padStart(2) + ' tarjetas → ' + String(dist[k]).padStart(2) + ' persona(s)  ' + '█'.repeat(dist[k])));
const ns = filas.map(f=>f.n).sort((a,b)=>a-b);
console.log('');
console.log('máximo:', ns[ns.length-1], '· mediana:', ns[Math.floor(ns.length/2)], '· día 1 (todo apagado menos la portada):', filas.filter(f=>f.dia1).length);
console.log('');
console.log('NO MEDIBLE DESDE LA NUBE (vive en el teléfono, solo puede SUMAR a las cifras de arriba):');
console.log('  cn-push-nudge  — depende del permiso de notificaciones');
console.log('  cn-news        — depende de si ya descartó la tanda');
console.log('  cn-cmty-nudge  — depende de la sonda de comunidad cacheada en el dispositivo');
console.log('  y los mutes locales de coach-card / missday / share, que solo RESTAN');
