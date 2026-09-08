// Matriz de sabotaje de LA COLA DE ESCRITURAS DEL COACH (v588, hallazgo D1-2).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: lo que esta versión mata es un fallo SILENCIOSO — el catch
// solo hacía `warn()` — y un fallo silencioso no da error al volver. Si alguien deshace una de
// estas piezas, la app sigue funcionando perfectamente hasta el día en que alguien escriba con
// mala señal, que es justo el día en que nadie está mirando.
//
// 🔒 Los tres candados del REINTENTO son los más delicados: reenviar una columna entera PISA lo
// que la otra punta escribió mientras tanto, así que aquí la pérdida de datos no desaparece,
// CAMBIA DE BANDO. Por eso hay un sabotaje por cada regla y no uno por la función.
//
// Corre: node scripts/e2e/_sabotaje-cola-coach.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CORE = new URL('../../avi-core.js', import.meta.url);
const INFRA = new URL('../../app-1-infra.js', import.meta.url);
const COACH = new URL('../../app-3-coach.js', import.meta.url);

const SABOTAJES = [
  [CORE, '1· los mensajes se de-duplican por TEXTO: se come el «ok» que se manda dos veces',
    '  const key = m => JSON.stringify([m && m.from, m && m.date, m && m.text]);',
    '  const key = m => JSON.stringify([m && m.text]);'],
  [CORE, '2· el reintento REEMPLAZA en vez de fusionar: borra lo que el asesorado escribió',
    '  for (const m of [].concat(Array.isArray(cloud) ? cloud : [], Array.isArray(pend) ? pend : [])) {',
    '  for (const m of [].concat(Array.isArray(pend) ? pend : [])) {'],
  [CORE, '3· la cola apila en vez de reemplazar: reenviaría la versión VIEJA del hilo',
    '  const otras = (Array.isArray(list) ? list : []).filter(x => x && !(x.col === e.col && x.id === e.id));',
    '  const otras = (Array.isArray(list) ? list : []);'],
  [CORE, '4· lo que no cabe se DESCARTA en silencio (el defecto de v587 con otra cara)',
    "    return { list: otras.concat([{ col: e.col, id: e.id, name: e.name, ts: e.ts, val: null, bytes: 0, tooBig: true }]), tooBig: true };",
    '    return { list: otras, tooBig: true };'],
  [CORE, '5· lo que no cabe se guarda IGUAL: revienta la cuota de localStorage',
    '  if (!(bytes <= max) || usado + bytes > total) {',
    '  if (false) {'],
  [CORE, '6· el reintento pisa SIEMPRE: borraría el entreno que ella registró hoy',
    "  if (entry.col === 'msgs') return true;",
    '  return true;'],
  [CORE, '7· una fila sin `updated_at` legible se da por vieja y se PISA (la trampa de v517)',
    "  if (rowUpdatedAt == null || rowUpdatedAt === '') return false;",
    "  if (rowUpdatedAt == null || rowUpdatedAt === '') return true;"],
  [CORE, '8· lo que no cupo se reenvía igual: subiría null y BORRARÍA la columna',
    '  if (!entry || entry.tooBig) return false;',
    '  if (!entry) return false;'],
  [INFRA, '9· el mensaje del coach vuelve a morir en un warn() (el hallazgo D1-2, tal cual)',
    "    catch(e){ _cwqAdd(col,id,slice); warn('AVI coach persist '+k+' falló, en cola para reintentar:',id,e&&e.message); }",
    "    catch(e){ warn('AVI coach persist '+k+' falló:',id,e&&e.message); }"],
  [INFRA, '10· la escritura confirmada NO sale de la cola: se reenviarían datos viejos para siempre',
    '    try{ await UD.updateClientRow(id,{[col]:slice}); _coachSnap[sk]=val; _cwqDrop(col,id); }',
    '    try{ await UD.updateClientRow(id,{[col]:slice}); _coachSnap[sk]=val; }'],
  [COACH, '11· «Mensaje enviado» vuelve a cantarse pase lo que pase',
    "  if(_enCola){ toast('📴 Sin conexión: guardé el mensaje y lo envío al reconectar'); return; }",
    '  if(false){ return; }'],
  [COACH, '12· el chat vuelve a mandar a ciegas: nadie se entera de si la nube aceptó',
    "  try{ await svNow('ax_m',DB.msgs); }catch(e){ warn('AVI: enviar mensaje falló:',e&&e.message); }",
    "  try{ sv('ax_m',DB.msgs); }catch(e){ warn('AVI: enviar mensaje falló:',e&&e.message); }"],
  [COACH, '13· el reintento de mensajes REEMPLAZA la columna en vez de fusionarla',
    '        const fus=mergeCoachMsgs(fila.msgs||[],e.val||[]);',
    '        const fus=(e.val||[]);'],
  [COACH, '14· el reintento deja de preguntar si puede pisar',
    '      if(!coachQueueCanReplay(e,fila.updated_at)){ held++; continue; }',
    '      if(false){ held++; continue; }'],
  [COACH, '15· lo que quedó de la sesión anterior no se reintenta nunca',
    '  _renderCoachSync(); _flushCoachWrites();',
    '  _renderCoachSync();'],
  [COACH, '16· el mensaje que no salió se pinta igual que el entregado',
    "    const _env=isC&&_cchatSending[m.date]?' · ⏳ enviando…':(isC&&_cwqHasMsg(clientId,m.date)?' · ⚠️ sin enviar':'');",
    "    const _env='';"],
];

const ORIG = new Map();
for (const [ruta] of SABOTAJES) if (!ORIG.has(ruta.href)) ORIG.set(ruta.href, readFileSync(ruta, 'utf8'));

let muerden = 0;
try {
  for (const [ruta, nombre, buscar, poner] of SABOTAJES) {
    const original = ORIG.get(ruta.href);
    const veces = original.split(buscar).length - 1;
    if (veces !== 1) {
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto aparece ${veces} veces (esperaba 1)`);
      continue;
    }
    // Reemplazo con FUNCIÓN: un `$` en el reemplazo es un patrón especial (v583).
    writeFileSync(ruta, original.replace(buscar, () => poner), 'utf8');
    let rojo = false, linea = '';
    try {
      const out = execSync('node avi.test.js', { cwd: new URL('../..', import.meta.url), encoding: 'utf8', stdio: 'pipe' });
      linea = (out.match(/AVI Tests: .*/) || [''])[0];
    } catch (e) {
      rojo = true;
      linea = ((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló';
    }
    writeFileSync(ruta, original, 'utf8');
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite ni corrió'}`);
    if (rojo) muerden++;
  }
} finally {
  for (const [href, txt] of ORIG) writeFileSync(new URL(href), txt, 'utf8');
}
console.log(`\n${muerden === SABOTAJES.length ? '✅' : '🔴'} Sabotajes que muerden: ${muerden}/${SABOTAJES.length}`);
process.exit(muerden === SABOTAJES.length ? 0 : 1);
