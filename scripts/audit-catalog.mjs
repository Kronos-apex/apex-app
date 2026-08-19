// AVI · Auditoría integral del catálogo + media + registros.
// Corre TODAS las invariantes de una pasada para no dejar errores sueltos.
// Uso: node scripts/audit-catalog.mjs
import fs from 'fs';
// El catálogo y sus registros (EX_IMG_NAME, EX_VID, EX_COACHTIP…) viven en app-1-infra.js desde
// que la app se partió en módulos; esta auditoría seguía leyendo SOLO index.html y por eso
// llevaba tiempo reportando «0 ejercicios · sin problemas»: un check 9 del hook en verde sobre
// NADA. Misma familia que la sonda muerta del smoke y que los harnesses de solo-capturas.
// Se leen los dos y se concatenan: da igual en qué módulo esté cada registro (2026-07-27).
const FUENTES = ['index.html', 'app-1-infra.js', 'app-2-login.js', 'app-3-coach.js',
                 'app-4-entreno.js', 'app-5-salud.js', 'app-6-extra.js', 'avi-core.js'];
const html = FUENTES.filter(f => fs.existsSync(f)).map(f => fs.readFileSync(f, 'utf8')).join(String.fromCharCode(10));
// Candado permanente: si el catálogo vuelve a mudarse de archivo, esto grita en vez de dar
// un verde vacío. Un catálogo con menos de 100 ejercicios es que NO lo estamos leyendo.
const _CAT_MIN = 100;
const exDir = 'media/exercises';
const has = f => fs.existsSync(f);
const nf = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const out = [];
const P = (sev, msg) => out.push({ sev, msg });

// ── Catálogo: ids + names ──
const catLines = html.split('\n');
const cat = [];
for (const m of html.matchAll(/\{id:'(e\d+)',name:'([^']+)'/g)) cat.push({ id: m[1], name: m[2] });
const catIds = new Set(cat.map(e => e.id));

// IDs duplicados
const idc = {}; cat.forEach(e => idc[e.id] = (idc[e.id] || 0) + 1);
Object.entries(idc).filter(([, v]) => v > 1).forEach(([k, v]) => P('BLOCK', `ID duplicado en catálogo: ${k} (${v}×)`));

// Nombres duplicados (caza e15/e38)
const nm = {}; cat.forEach(e => { const n = nf(e.name); (nm[n] = nm[n] || []).push(e.id); });
Object.entries(nm).filter(([, v]) => v.length > 1).forEach(([k, v]) => P('MAJOR', `Nombre duplicado: "${k}" → ${v.join(', ')}`));

// ── DUPLICADOS DE MOVIMIENTO ─────────────────────────────────────────────────────────────
// El catálogo se repobló dos veces (e165-e214 en junio, e215-e227 el 2026-07-27) y las dos
// veces entró el MISMO ejercicio con otro nombre: «Escaladores» = «Mountain Climbers»,
// «Curl de Bíceps en Banco Inclinado» = «Curl Inclinado con Mancuernas», «Caminata del
// Granjero» × 2. El check de nombre EXACTO no los vio, y medir parecido de nombres tampoco
// sirve: 140 pares del catálogo comparten palabras siendo variantes legítimas («Elevaciones
// Laterales» con banda / en polea / con botellas). Un check así viviría en rojo y dejaría de
// ser señal. Estos dos SÍ son deterministas y dieron CERO falsos positivos sobre el catálogo
// real (2026-07-28). Son un piso, no un techo: al añadir ejercicios hay que comparar por
// MOVIMIENTO+EQUIPO contra el catálogo entero, no fiarse de esto.
const sinParen = s => nf(s.replace(/\([^)]*\)/g, ''));
// (a) Mismo nombre una vez quitado el paréntesis aclaratorio: «Caminata del Granjero
//     (Farmers Walk)» y «Caminata del Granjero» son el mismo ejercicio dos veces.
const nmp = {}; cat.forEach(e => { const n = sinParen(e.name); (nmp[n] = nmp[n] || []).push(e); });
Object.entries(nmp).forEach(([k, v]) => {
  if (v.length < 2) return;
  // Si TODOS tienen además el mismo nombre exacto, el check de arriba ya lo dijo: no repetir.
  if (new Set(v.map(e => nf(e.name))).size < 2) return;
  P('MAJOR', `Mismo ejercicio con paréntesis distinto: "${k}" → ${v.map(e => e.id).join(', ')}`);
});
// (b) El ytQuery de A menciona el nombre COMPLETO de B y A no se declara variante de B (su
//     propio nombre no contiene el de B). Ahí el ytQuery está confesando que buscan el mismo
//     video: «Escaladores» → yt «escaladores mountain climbers».
const ytOf = {};
cat.forEach(e => { const l = catLines.find(x => x.includes(`id:'${e.id}',name:`)) || ''; ytOf[e.id] = (l.match(/ytQuery:'([^']*)'/) || [])[1] || ''; });
const vistos = new Set();
cat.forEach(a => cat.forEach(b => {
  if (a.id === b.id) return;
  const bn = sinParen(b.name);
  if (bn.split(' ').length < 2) return;
  if (!nf(ytOf[a.id]).includes(bn)) return;
  if (nf(a.name).includes(bn)) return;            // «... con Banda» declara que es variante
  const par = [a.id, b.id].sort().join('+');
  if (vistos.has(par)) return; vistos.add(par);
  P('MAJOR', `Posible duplicado: ${a.id} (${a.name}) busca el mismo video que ${b.id} (${b.name})`);
}));

// Campos obligatorios por ejercicio
const lines = html.split('\n');
cat.forEach(e => {
  const line = lines.find(l => l.includes(`id:'${e.id}',name:`)) || '';
  ['descSimple', 'muscleLabel', 'ytQuery'].forEach(f => { if (!line.includes(f + ':')) P('MAJOR', `${e.id} (${e.name}) sin ${f}`); });
});

// ── Registros (Sets + EX_IMG_NAME + EX_COACHTIP) ──
const getSet = name => { const mm = html.match(new RegExp(`${name}=new Set\\(\\[([^\\]]*)\\]`)); return mm ? [...mm[1].matchAll(/'(e\d+)'/g)].map(x => x[1]) : []; };
const exVid = getSet('EX_VID'), exVidF = getSet('EX_VID_F'), exVidBoth = getSet('EX_VID_BOTH'), exImgHide = getSet('EX_IMG_HIDE');
const imgNameVals = [...new Set([...html.matchAll(/"[^"]+":"(e\d+)"/g)].map(x => x[1]))];
const tipKeys = [...new Set([...html.matchAll(/^\s*(e\d+):"/gm)].map(x => x[1]))];

imgNameVals.forEach(id => { if (!catIds.has(id)) P('BLOCK', `EX_IMG_NAME mapea a id inexistente: ${id}`); });
tipKeys.forEach(id => { if (!catIds.has(id)) P('MAJOR', `EX_COACHTIP para id inexistente: ${id}`); });
exVid.forEach(id => { if (!catIds.has(id)) P('BLOCK', `EX_VID id inexistente: ${id}`); else if (!has(`${exDir}/${id}.mp4`)) P('BLOCK', `EX_VID ${id} sin archivo .mp4`); });
exVidF.forEach(id => { if (!has(`${exDir}/${id}_f.mp4`)) P('MAJOR', `EX_VID_F ${id} sin _f.mp4`); });
exVidBoth.forEach(id => { if (!has(`${exDir}/${id}.mp4`) || !has(`${exDir}/${id}_f.mp4`)) P('MAJOR', `EX_VID_BOTH ${id}: falta .mp4 o _f.mp4`); });
exImgHide.forEach(id => { if (!catIds.has(id)) P('MINOR', `EX_IMG_HIDE id inexistente: ${id}`); });

// Nivel explícito: un ejercicio sin entrada en EX_LEVEL y sin `level:` propio cae a 'Intermedio'
// por el default de exLevel(). CORRECCIÓN (2026-07-28, medida contra el generador): eso NO es
// «un principiante no lo recibe jamás» —como decía antes esta línea—; el principiante agota
// primero todo lo de nivel P y solo entonces echa mano de lo 'I', así que un ejercicio sin nivel
// queda de ÚLTIMO recurso. Lo que sí se bloquea de verdad es 'A'. Sigue siendo un descuido: el
// nivel lo decide el entrenador, no el default. Se reporta el CONTEO en una línea para que sea
// visible y no pueda crecer sin que nadie se entere.
const lvlIds = new Set([...html.matchAll(/(e[0-9]+):'[PIA]'/g)].map(m => m[1]));
const sinNivel = cat.filter(e => {
  if (lvlIds.has(e.id)) return false;
  const line = lines.find(l => l.includes(`id:'${e.id}',name:`)) || '';
  return !/level:'[PIA]'/.test(line);
});
if (sinNivel.length) P('MAJOR', `${sinNivel.length} ejercicios sin nivel explícito → caen a 'Intermedio' por defecto: un principiante solo los recibe cuando se le acaban los de su nivel (${sinNivel.slice(0,5).map(e=>e.id).join(', ')}…)`);

// Cobertura de foto
cat.forEach(e => { if (!has(`${exDir}/${e.id}.jpg`)) P('MAJOR', `${e.id} (${e.name}) sin foto`); });

// MAPA MUSCULAR: la ficha del ejercicio pinta el muñeco con MM_EX (exercise-muscles.js). Los 13
// del repoblado entraron SIN entrada ahí y nadie se dio cuenta —la ficha simplemente no mostraba
// qué músculo trabaja—, igual que el lote de junio con las fotos. Los de `muscle:'cardio'` no
// llevan muñeco a propósito (correr no tiene músculo objetivo que pintar).
if (has('exercise-muscles.js')) {
  const mm = fs.readFileSync('exercise-muscles.js', 'utf8');
  const mmIds = new Set([...mm.matchAll(/"(e\d+)":\{/g)].map(m => m[1]));
  cat.forEach(e => {
    const line = catLines.find(l => l.includes(`id:'${e.id}',name:`)) || '';
    if (/muscle:'cardio'/.test(line) || mmIds.has(e.id)) return;
    P('MAJOR', `${e.id} (${e.name}) sin mapa muscular en MM_EX → la ficha no dice qué músculo trabaja`);
  });
}

// FOTO QUE NO SE VE: exImgSrc solo resuelve por id si el id está en EX_IMG_IDS (que se arma con
// los valores de EX_IMG_NAME + las listas sueltas de abajo). Tener el archivo NO basta — ya pasó
// con e97, con e126 y con los 50 del lote de junio, que estuvieron subidos sin mostrarse. Aquí
// se cruza al revés: si el .jpg existe y el id no está registrado, la foto es invisible.
const idsRegistrados = new Set(imgNameVals);
for (const m of html.matchAll(/\[([^\]]*)\]\.forEach\(\s*id\s*=>\s*EX_IMG_IDS\.add\(id\)\s*\)/g))
  for (const x of m[1].matchAll(/'(e\d+)'/g)) idsRegistrados.add(x[1]);
cat.forEach(e => {
  if (!has(`${exDir}/${e.id}.jpg`) || idsRegistrados.has(e.id)) return;
  P('MAJOR', `${e.id} (${e.name}) TIENE foto pero no está registrado en EX_IMG_IDS → no se muestra`);
});

// FOTO ROTA: el cruce anterior solo miraba UNA dirección (archivo sin registrar = invisible) y
// por eso dejó pasar la contraria durante 3 versiones. v498 BORRÓ media/exercises/e222.jpg —
// mostraba otro ejercicio— pero el id se quedó en la lista de EX_IMG_IDS, así que exImgSrc
// seguía devolviendo la ruta: <img> con src que da 404. Y no cae al ícono, porque exImgTag no
// tiene onerror. Un ejercicio SIN foto enseña su ícono; un id registrado sin archivo enseña una
// imagen rota, que es peor. Tercer daño: renderClientRoutines elige la foto de cabecera con
// `.find(Boolean)` sobre exImgSrc, así que un id fantasma se queda con el puesto y la tarjeta
// pierde la foto del ejercicio que SÍ la tiene. BLOCK a propósito: llega al usuario.
// Se registran ids que no son del catálogo (fb01…fb04, feedback), así que el patrón es amplio.
const idsRegAll = new Set(imgNameVals);
for (const m of html.matchAll(/\[([^\]]*)\]\.forEach\(\s*id\s*=>\s*EX_IMG_IDS\.add\(id\)\s*\)/g))
  for (const x of m[1].matchAll(/'([a-z]+\d+)'/g)) idsRegAll.add(x[1]);
const _nombreDe = id => (cat.find(e => e.id === id) || {}).name || '(fuera del catálogo)';
[...idsRegAll].sort().forEach(id => {
  if (has(`${exDir}/${id}.jpg`)) return;
  P('BLOCK', `${id} (${_nombreDe(id)}) está registrado en EX_IMG_IDS y NO existe ${exDir}/${id}.jpg → imagen ROTA en la app`);
});
// Misma clase por el lado de la variante mujer: EX_IMG_F desvía a {id}_f.jpg solo para ellas,
// así que un archivo que falte ahí rompe la foto SOLO en las cuentas de mujer — invisible para
// quien prueba con una cuenta de hombre.
const mF = html.match(/const EX_IMG_F=new Set\(\[([^\]]*)\]/);
if (mF) [...mF[1].matchAll(/'([a-z]+\d+)'/g)].map(x => x[1]).forEach(id => {
  if (has(`${exDir}/${id}_f.jpg`)) return;
  P('BLOCK', `${id} (${_nombreDe(id)}) está en EX_IMG_F y NO existe ${exDir}/${id}_f.jpg → imagen ROTA para las mujeres`);
});

// ── Reporte ──
const order = { BLOCK: 0, MAJOR: 1, MINOR: 2 };
out.sort((a, b) => order[a.sev] - order[b.sev]);
if (cat.length < _CAT_MIN) {
  console.log('══ AUDITORÍA CATÁLOGO ══'); console.log(`[BLOCK] Solo se leyeron ${cat.length} ejercicios (mínimo esperado ${_CAT_MIN}).`);
  console.log('El catálogo cambió de archivo y esta auditoría está mirando al lugar equivocado:');
  console.log('un verde aquí no valdría nada. Añade el módulo a FUENTES en scripts/audit-catalog.mjs.');
  process.exit(1);
}
console.log(`══ AUDITORÍA CATÁLOGO · ${cat.length} ejercicios ══`);
const counts = { BLOCK: 0, MAJOR: 0, MINOR: 0 };
out.forEach(p => { counts[p.sev]++; console.log(`[${p.sev}] ${p.msg}`); });
console.log(out.length ? `\n🔴 ${counts.BLOCK} BLOCK · 🟡 ${counts.MAJOR} MAJOR · 🟢 ${counts.MINOR} MINOR` : '✅ Sin problemas de estructura/registros');
process.exit(counts.BLOCK > 0 ? 1 : 0);
