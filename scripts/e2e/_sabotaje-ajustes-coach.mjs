// Matriz de sabotaje de LA ESCRITURA PARCIAL DE AJUSTES DEL COACH (v589, hallazgo D2-2).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: el defecto que esto mata NO SE VE. Subir 237 KB en vez de 438 B
// funciona perfectamente: el ajuste se guarda igual. Solo se nota en la factura de datos del
// coach y en lo que tarda en abrir un chat, así que nada avisaría si alguien devuelve el
// `upsertOwn` del objeto entero «por simplificar».
//
// Corre: node scripts/e2e/_sabotaje-ajustes-coach.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const INFRA = new URL('../../app-1-infra.js', import.meta.url);
const SQL = new URL('../../supabase/migrations/20260908_coach_settings_patch.sql', import.meta.url);

const SABOTAJES = [
  [INFRA, '1· vuelve el objeto ENTERO: cada «leído» sube otra vez los 374 ejercicios',
    '    try{ await UD.patchCoachSettings(patch); }',
    '    try{ await UD.upsertOwn({coach_settings:_coachSettingsObj()}); }'],
  [INFRA, '2· el patch se arma con TODO en vez de con la clave que cambió',
    '    const patch={}; patch[_COACH_SETTINGS_COL[k]]=v;',
    '    const patch=_coachSettingsObj();'],
  [INFRA, '3· la lista de claves se escribe a mano y se separa del mapa',
    'const _COACH_SETTINGS_KEYS=Object.keys(_COACH_SETTINGS_COL);',
    "const _COACH_SETTINGS_KEYS=['ax_e','ax_nequi','ax_cn','ax_ce','ax_site','ax_msgreads','ax_leadsdone'];"],
  [INFRA, '4· `_coachSettingsObj` vuelve a escribir los nombres cortos a mano',
    "  Object.keys(_COACH_SETTINGS_COL).forEach(k=>{ o[_COACH_SETTINGS_COL[k]]=ld(k,_COACH_SETTINGS_DEF[k]); });",
    "  o.e=ld('ax_e',[]); o.nequi=ld('ax_nequi',''); o.cn=ld('ax_cn',''); o.ce=ld('ax_ce',''); o.site=ld('ax_site',''); o.mr=ld('ax_msgreads',{}); o.ld=ld('ax_leadsdone',{});"],
  [INFRA, '5· el cliente llama a una función que la migración no define (el ajuste no se guardaría)',
    "    const {error}=await c.rpc('coach_settings_patch',{p:patch||{}});",
    "    const {error}=await c.rpc('coach_settings_merge',{p:patch||{}});"],
  [SQL, '6· la función pasa a DEFINER: escribiría sin que la RLS opine',
    'language sql\nsecurity invoker',
    'language sql\nsecurity definer'],
  [SQL, '7· se va el cinturón: la función podría tocar la fila de otro',
    '   where user_id = auth.uid();',
    '   where user_id is not null;'],
  [SQL, '8· `anon` recupera el permiso de ejecutarla',
    'revoke execute on function public.coach_settings_patch(jsonb) from public, anon;',
    '-- (revoke retirado)'],
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
