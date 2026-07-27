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
const cat = [];
for (const m of html.matchAll(/\{id:'(e\d+)',name:'([^']+)'/g)) cat.push({ id: m[1], name: m[2] });
const catIds = new Set(cat.map(e => e.id));

// IDs duplicados
const idc = {}; cat.forEach(e => idc[e.id] = (idc[e.id] || 0) + 1);
Object.entries(idc).filter(([, v]) => v > 1).forEach(([k, v]) => P('BLOCK', `ID duplicado en catálogo: ${k} (${v}×)`));

// Nombres duplicados (caza e15/e38)
const nm = {}; cat.forEach(e => { const n = nf(e.name); (nm[n] = nm[n] || []).push(e.id); });
Object.entries(nm).filter(([, v]) => v.length > 1).forEach(([k, v]) => P('MAJOR', `Nombre duplicado: "${k}" → ${v.join(', ')}`));

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
// por el default de exLevel() — y entonces un PRINCIPIANTE no lo recibe JAMÁS. No es una decisión,
// es un descuido silencioso. Se reporta el CONTEO en una sola línea (hoy hay deuda heredada) para
// que sea visible y no pueda crecer sin que nadie se entere.
const lvlIds = new Set([...html.matchAll(/(e[0-9]+):'[PIA]'/g)].map(m => m[1]));
const sinNivel = cat.filter(e => {
  if (lvlIds.has(e.id)) return false;
  const line = lines.find(l => l.includes(`id:'${e.id}',name:`)) || '';
  return !/level:'[PIA]'/.test(line);
});
if (sinNivel.length) P('MAJOR', `${sinNivel.length} ejercicios sin nivel explícito → caen a 'Intermedio' por defecto y un principiante NUNCA los recibe (${sinNivel.slice(0,5).map(e=>e.id).join(', ')}…)`);

// Cobertura de foto
cat.forEach(e => { if (!has(`${exDir}/${e.id}.jpg`)) P('MAJOR', `${e.id} (${e.name}) sin foto`); });

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
