// Verificación del dictamen de Laura del 27-ago (codo · muñeca · pecho) ANTES de escribirlo en
// avi-core.js. Doctrina: un reporte de subagente se MIDE antes de ejecutarlo. Ella exigió esta
// misma verificación en su §6: que cada término atrape lo que dice, que ningún calentamiento de
// muñeca ni de manguito caiga, que sus 5 controles sobrevivan, y que el pool se imprima POR
// MÚSCULO Y POR ENTORNO — «el hueco del tríceps solo se ve mirando corporal».
//
// Corre: node scripts/verificar-dictamen-laura.mjs
import { readFileSync } from 'node:fs';

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const src = readFileSync(new URL('../app-1-infra.js', import.meta.url), 'utf8');

// Catálogo con env (el env vive en el mismo objeto).
const cat = [];
for (const m of src.matchAll(/\{id:'(e\d+)',name:'([^']*)'[\s\S]{0,700}?muscle:'([^']*)'[\s\S]{0,200}?type:'([^']*)'/g)) {
  const bloque = src.slice(m.index, m.index + 900);
  const env = (/env:\[([^\]]*)\]/.exec(bloque) || [, ''])[1].replace(/'/g, '').split(',').map(s => s.trim()).filter(Boolean);
  cat.push({ id: m[1], name: m[2], muscle: m[3], type: m[4], env: env.length ? env : ['gym'] });
}
// Calentamientos (WARMUP_LIBRARY + activación) — viven en app-6.
const src6 = readFileSync(new URL('../app-6-extra.js', import.meta.url), 'utf8');
const wu = [...src6.matchAll(/\{id:'(w[a-z0-9]+)',name:'([^']*)'/g)].map(m => ({ id: m[1], name: m[2] }));

const R = {
  codo: /extension de triceps|press frances|skull|trasnuca|tras ?nuca|fondos|diamante|flexion cerrada|banca agarre cerrado|curl de muneca|rotaciones de muneca|curl invertido|zottman|scott|predicador|colgarse|colgad|dominada|chin ?-?up|azote|cuerdas de batalla|clean|man maker|lanzamiento|burpee|sprawl|escaladores|mountain climber|toques? de hombro|plancha saltarina|plancha a flexion|caminata del oso|caminata del cangrejo|caminata del granjero|farmer|paseo del camarero|camarero/,
  muneca: /flexiones|flexion cerrada|lagartija|push ?-?up|pike|plancha saltarina|plancha a flexion|toques? de hombro|caminata del oso|caminata del cangrejo|burpee|sprawl|escaladores|mountain climber|oruga|man maker|clean|azote|cuerdas de batalla|lanzamiento|colgarse|colgad|dominada|chin ?-?up|curl de muneca|rotaciones de muneca|curl invertido|zottman|caminata del granjero|farmer|paseo del camarero|camarero|fondos|rueda abdominal|ab wheel/,
  pecho: /aperturas|apertura de pecho|contractora|fondos|lanzamiento|azote/,
};
// §1.6: `codo` nació VACÍO —Laura barrió las 244 descripciones y no encontró ninguno que el nombre
// no delatara—. Dejó de estarlo con el LOTE 1 (v547): tres ejercicios NUEVOS cuyo nombre no lleva
// ninguno de sus términos (`e275` Press JM, `e276` Press Tate, `e264` Curl Araña). No es criterio
// nuevo, es su mecanismo aplicado a ejercicios que entonces no existían.
const IDS = { muneca: ['e127'], codo: ['e264', 'e275', 'e276'] };
const WU_IDS = { muneca: ['we4'] };

const cae = (z, e) => R[z].test(norm(e.name)) || (IDS[z] || []).includes(e.id);
const caeWu = (z, w) => R[z].test(norm(w.name)) || (WU_IDS[z] || []).includes(w.id);

let fallos = 0;
const ok = (cond, txt) => { console.log(`  ${cond ? '✅' : '🔴'} ${txt}`); if (!cond) fallos++; };

for (const z of ['codo', 'muneca', 'pecho']) {
  const hit = cat.filter(e => cae(z, e));
  const hitWu = wu.filter(w => caeWu(z, w));
  console.log(`\n━━━━━━ ${z.toUpperCase()} ━━━━━━`);
  console.log(`  caen ${hit.length} ejercicios · ${hitWu.length} calentamientos${hitWu.length ? ' (' + hitWu.map(w => w.id).join(', ') + ')' : ''}`);

  // Pool superviviente POR MÚSCULO Y POR ENTORNO — lo que ella exige imprimir.
  const ENTORNOS = ['gym', 'casa', 'parque', 'corporal'];
  const musculos = [...new Set(cat.map(e => e.muscle))].sort();
  const huecos = [];
  for (const m of musculos) for (const en of ENTORNOS) {
    const pool = cat.filter(e => e.muscle === m && e.env.includes(en));
    if (!pool.length) continue;                                  // ese músculo no existe ahí
    const vivos = pool.filter(e => !cae(z, e)).length;
    if (vivos === 0) huecos.push(`${m}/${en} (0 de ${pool.length})`);
    else if (vivos <= 2) huecos.push(`🟠 ${m}/${en} (${vivos} de ${pool.length})`);
  }
  console.log(`  pools en 0 o ≤2: ${huecos.length ? huecos.join(' · ') : 'ninguno'}`);
}

// ── LOS 5 CONTROLES DE LAURA: si alguno cae, el regex se ensanchó ──
console.log(`\n━━━━━━ LOS 5 CONTROLES DE LAURA ━━━━━━`);
const porId = id => cat.find(e => e.id === id) || { id, name: '(no existe)' };
ok(!cae('codo', porId('e119')) && !cae('pecho', porId('e119')), 'e119 Pec Deck INVERSO (deltoides posterior) sobrevive a codo y a pecho');
ok(!cae('codo', porId('e28')), 'e28 Jalón al Pecho Agarre Cerrado sobrevive a codo');
ok(!cae('codo', porId('e96')) && !cae('muneca', porId('e96')), 'e96 Kickback con Banda (GLÚTEO) sobrevive');
ok(!cae('codo', porId('e135')) && !cae('muneca', porId('e135')), 'e135 Escaladora (máquina de piernas) sobrevive');
// 🔒 Las planchas de ANTEBRAZO son e17/e49/e164, por id. Mi primera versión de este control las
// filtraba por NOMBRE y se llevaba dentro «Toques de Hombro en Plancha» (e157) y «Plancha Toque de
// Hombro» (e188), que se apoyan en la MANO y sí deben caer: el control marcaba en rojo la regla
// correcta. Un control más ancho que lo que controla acusa a lo sano.
const planchasAntebrazo = ['e17', 'e49', 'e164'].map(porId);
ok(planchasAntebrazo.every(e => !cae('codo', e) && !cae('muneca', e)),
  'las 3 planchas de ANTEBRAZO (e17/e49/e164) sobreviven a codo y muñeca');
ok(['e157', 'e188', 'e189', 'e201'].map(porId).every(e => cae('codo', e) && cae('muneca', e)),
  'y las 4 planchas de MANO (toques de hombro, saltarina, a flexión) sí caen');

// ── Sus otras afirmaciones verificables ──
console.log(`\n━━━━━━ OTRAS AFIRMACIONES DEL DICTAMEN ━━━━━━`);
const wuMuneca = wu.filter(w => /muneca/.test(norm(w.name)));
ok(wuMuneca.length > 0 && wuMuneca.every(w => !caeWu('codo', w)),
  `los ${wuMuneca.length} calentamientos de muñeca sobreviven a codo (son el tratamiento)`);
// 🔒 Su cifra se ancla al catálogo QUE ELLA MIDIÓ (los 247 de entonces, id ≤ e254). Anclarla al
// catálogo completo la haría caducar con cada lote de repoblación y el rojo no diría nada: el de
// hoy sería «43 → 57», que es el lote 1 haciendo su trabajo, no una regla que se ensanchó.
const delDictamen = cat.filter(e => +e.id.slice(1) <= 254);
ok(delDictamen.filter(e => cae('codo', e)).length === 43,
  `§1.4: dice 43 ejercicios en codo sobre los 247 que midió → mide ${delDictamen.filter(e => cae('codo', e)).length}`);
console.log(`  ℹ️  con el catálogo de hoy (${cat.length}) son ${cat.filter(e => cae('codo', e)).length}`);
ok(wu.filter(w => caeWu('codo', w)).length === 0, `§1.4: dice 0 calentamientos en codo → mide ${wu.filter(w => caeWu('codo', w)).length}`);
ok((IDS.codo || []).length === 3, '§1.6: GEN_EXCL_IDS.codo lleva los 3 del lote 1 que el nombre no delata');
const e127 = porId('e127');
ok(cae('muneca', e127) && !cae('codo', e127), 'e127 Sentadilla Frontal cae en muñeca (por id) y NO en codo');

// El hueco del tríceps que ella declara (§1.7)
console.log(`\n━━━━━━ §1.7 EL HUECO DEL TRÍCEPS (codo) ━━━━━━`);
for (const en of ['gym', 'casa', 'parque', 'corporal']) {
  const pool = cat.filter(e => e.muscle === 'triceps' && e.env.includes(en));
  const vivos = pool.filter(e => !cae('codo', e));
  console.log(`  ${en.padEnd(9)} ${vivos.length} de ${pool.length}  ${vivos.map(e => e.id).join(', ') || '🔴 CERO'}`);
}

console.log(`\n${fallos ? '🔴 ' + fallos + ' comprobaciones FALLARON' : '✅ el dictamen se sostiene medido'}\n`);
process.exit(fallos ? 1 : 0);
