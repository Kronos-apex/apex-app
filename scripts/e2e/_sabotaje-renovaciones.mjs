// Matriz de sabotaje de LA NOTA DE RENOVACIONES PENDIENTES (v583).
// Veredicto por CÓDIGO DE SALIDA, jamás por el mensaje impreso (lección v524).
//
// Corre: node scripts/e2e/_sabotaje-renovaciones.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CORE = new URL('../../avi-core.js', import.meta.url);
const APP2 = new URL('../../app-2-login.js', import.meta.url);

const SABOTAJES = [
  [CORE, '1· la conducta ANTERIOR: no hay nota que explique la cifra del día 6',
    "    if (MS.getStatus(c, t) !== 'grace') return;",
    '    return;'],
  [CORE, '2· entra el vencido de hace un mes (infla plata que no va a llegar)',
    "    if (MS.getStatus(c, t) !== 'grace') return;",
    "    if (['active','expiring'].indexOf(MS.getStatus(c, t)) >= 0) return;"],
  [CORE, '3· la cortesía entra a lo que se cobra',
    '    if (!c || !clientIsBillable(c)) return;',
    '    if (!c) return;'],
  [CORE, '4· la estimación deja de ser lo que esa persona pagó la última vez',
    '    amount += (parseFloat(pays[0] && pays[0].amount) || 0);',
    '    amount += 100000;'],
  [CORE, '5· las dos notas dejan de derivarse de lo mismo y pueden contradecirse',
    'function coachInGrace(clients, now) { return coachPendingRenewals(clients, now).count; }',
    'function coachInGrace(clients, now) { return (clients||[]).length; }'],
  [APP2, '6· CABLEADO: la nota deja de calcularse',
    "  const _pend=(typeof coachPendingRenewals==='function')?coachPendingRenewals(DB.clients,now.getTime()):{count:0,amount:0};",
    '  const _pend={count:0,amount:0};'],
  [APP2, '7· 🔴 lo pendiente se SUMA a la caja real (plata que nadie pagó)',
    "  const elIngr=document.getElementById('h-ingr');if(elIngr)elIngr.textContent='$'+ingr.toLocaleString('es-CO');",
    "  const elIngr=document.getElementById('h-ingr');if(elIngr)elIngr.textContent='$'+(ingr+_pend.amount).toLocaleString('es-CO');"],
  [APP2, '8· 🔴 la gracia entra a «Activos» (lo que v528 dejó prohibido)',
    "  const activos=DB.clients.filter(c=>{ if(!clientIsBillable(c))return false; const s=MS.getStatus(c); return s==='active'||s==='expiring'; }).length;",
    "  const activos=DB.clients.filter(c=>{ if(!clientIsBillable(c))return false; const s=MS.getStatus(c); return s!=='inactive'; }).length;"],
  [APP2, '9· el monto pierde el «≈» y se lee como plata que ya entró',
    "      ? `+ ${_pend.count} por renovar${_pend.amount>0?` · ≈$${Math.round(_pend.amount).toLocaleString('es-CO')}`:''}`",
    "      ? `+ ${_pend.count} por renovar${_pend.amount>0?` · $${Math.round(_pend.amount).toLocaleString('es-CO')}`:''}`"],
];

const ORIGINALES = new Map([[CORE.href, readFileSync(CORE, 'utf8')], [APP2.href, readFileSync(APP2, 'utf8')]]);
const restaurar = () => { for (const [href, txt] of ORIGINALES) writeFileSync(new URL(href), txt, 'utf8'); };

let muerden = 0;
try {
  for (const [ruta, nombre, buscar, poner] of SABOTAJES) {
    const original = ORIGINALES.get(ruta.href);
    const veces = original.split(buscar).length - 1;
    if (veces !== 1) {
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto aparece ${veces} veces (esperaba 1)`);
      continue;
    }
    // ⚠️ `poner` va como FUNCIÓN, no como cadena: en `String.replace` un `$` en el texto de
    //    reemplazo es un patrón especial (`$'` = todo lo que va DESPUÉS del match), y varias
    //    líneas de este archivo llevan `'$'+ingr`. Con la cadena a pelo el sabotaje escribía
    //    basura y salía VERDE sin haber roto nada.
    writeFileSync(ruta, original.replace(buscar, () => poner), 'utf8');
    let rojo = false, linea = '';
    try {
      const out = execSync('node avi.test.js', { cwd: new URL('../..', import.meta.url), encoding: 'utf8', stdio: 'pipe' });
      linea = (out.match(/AVI Tests: .*/) || [''])[0];
    } catch (e) {
      rojo = true;
      linea = ((e.stdout || '').match(/AVI Tests: .*/) || [''])[0];
    }
    restaurar();
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite ni corrió'}`);
    if (rojo) muerden++;
  }
} finally {
  restaurar();
}
console.log(`\n${muerden === SABOTAJES.length ? '✅' : '🔴'} Sabotajes que muerden: ${muerden}/${SABOTAJES.length}`);
process.exit(muerden === SABOTAJES.length ? 0 : 1);
