// Matriz de sabotaje del TOPE DE AVISOS DEL INICIO DEL COACH (v581).
// Veredicto por CÓDIGO DE SALIDA, jamás por el mensaje impreso (lección v524).
//
// Corre: node scripts/e2e/_sabotaje-tope-coach.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CORE = new URL('../../avi-core.js', import.meta.url);
const APP2 = new URL('../../app-2-login.js', import.meta.url);

const SABOTAJES = [
  [CORE, '1· la conducta ANTERIOR: no se topa nada, vuelven los 5 avisos',
    '  const max = (opts.max === undefined) ? COACH_MAX_NOTICES : opts.max;',
    '  const max = 99;'],
  [CORE, '2· el orden deja de mandar: el pulso puede quitarle el sitio a los vencimientos',
    "  'h-expiry-banner',\n  'h-adherence-banner',\n  'h-deload',",
    "  'h-pulse',\n  'h-deload',\n  'h-adherence-banner',"],
  [CORE, '3· un aviso sin puesto en la lista DESAPARECE en silencio',
    '  const sinRango = (presentes || []).filter(id => prioridad.indexOf(id) === -1);',
    '  const sinRango = [];'],
  [CORE, '4· el reparto se re-implementa en vez de compartirse (dos definiciones del orden)',
    '  return _capPlan(presentes, COACH_NOTICE_PRIORITY, max);',
    '  return { visibles: (presentes||[]).slice(0, max), ocultas: (presentes||[]).slice(max) };'],
  [APP2, '5· CABLEADO: el tope deja de aplicarse (el nombre sigue ahí)',
    '  _applyCoachCap();',
    '  if(false) _applyCoachCap();'],
  [APP2, '6· el tope apaga con style.display y se pisa con el dueño de cada banner (v505)',
    "  plan.ocultas.forEach(id=>{const e=document.getElementById(id); if(e)e.classList.add('cap-off');});",
    "  plan.ocultas.forEach(id=>{const e=document.getElementById(id); if(e)e.style.display='none';});"],
  [APP2, '7· se pierde la restauración del orden: abrir y cerrar descoloca la pantalla',
    '  _coachRestoreOrder();',
    '  if(false) _coachRestoreOrder();'],
];

const ORIGINALES = new Map([[CORE.href, readFileSync(CORE, 'utf8')], [APP2.href, readFileSync(APP2, 'utf8')]]);
const restaurar = () => { for (const [href, txt] of ORIGINALES) writeFileSync(new URL(href), txt, 'utf8'); };

let muerden = 0;
try {
  for (const [ruta, nombre, buscar, poner] of SABOTAJES) {
    const original = ORIGINALES.get(ruta.href);
    // Los finales de línea de este repo NO son estables: el patrón se vuelve regex con \r?\n.
    const rx = new RegExp(buscar.split('\n').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\r?\\n'), 'g');
    const veces = (original.match(rx) || []).length;
    if (veces !== 1) {
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto aparece ${veces} veces (esperaba 1)`);
      continue;
    }
    writeFileSync(ruta, original.replace(rx, poner.replace(/\$/g, '$$$$')), 'utf8');
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
