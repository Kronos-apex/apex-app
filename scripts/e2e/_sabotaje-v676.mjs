// Matriz de sabotaje de v676 — R13 lesiones: las NOTAS del coach reconocen las 11 zonas, la marca
// del coach sale en el editor y en la ficha, la rodilla ya no se lleva el wall-sit ni el
// sit-to-stand, y el aviso dice lo que quita en cada zona. Cada fila devuelve UN defecto y la suite
// TIENE que ponerse roja. Reemplazos con FUNCIÓN y escritura ATÓMICA.
// node scripts/e2e/_sabotaje-v676.mjs   (COMMITEAR antes)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), coach: join(ROOT, 'app-3-coach.js') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  // ── Las notas ──
  ['las notas vuelven a ignorar los codos', 'core',
    "  { area: 'codo', re: /\\bcodos?\\b|epicondil|epitrocle/ },\n", ''],
  ['«codo» sin límite de palabra (se come «codorniz»)', 'core',
    "re: /\\bcodos?\\b|epicondil|epitrocle/", "re: /codo|epicondil|epitrocle/"],
  ['«ingle» sin límite de palabra (se come «inglés»)', 'core',
    "re: /cadera|\\bingle\\b|inguinal", "re: /cadera|ingle|inguinal"],
  ['«me duele la espalda alta» vuelve a caer en lumbar', 'core',
    "|me duele la espalda(?! alta)|", "|me duele la espalda|"],
  ['las palabras nuevas dejan de heredar las reglas de su área', 'core',
    "(k.area ? painExclZones(k.area) : [k.zone])", "[k.zone || k.area]"],
  ['«espalda alta» apunta a lumbar en vez de a su área', 'core',
    "{ area: 'espalda alta', re:", "{ zone: 'lumbar', re:"],
  // ── El aviso por zona ──
  ['el aviso vuelve a describir la columna para cualquier zona', 'core',
    "'Quitamos lo que suele molestar ahí — ' + _zonasQueQuita(uniq) + '.",
    "'Quitamos lo que suele molestar ahí: flexión y carga sobre la columna, giros cargados e impacto."],
  ['una zona con reglas se queda sin frase', 'core',
    "  pecho: 'pecho: aperturas, contractora, fondos y lanzamientos',\n", ''],
  // ── La excepción de rodilla ──
  ['la excepción desaparece de la puerta común', 'core',
    "    if (keep && ex.id && keep.indexOf(ex.id) >= 0) return false;\n", ''],
  ['la excepción se ensancha a la goblet (🟡 condicional)', 'core',
    "  rodilla: ['e128', 'e158'],", "  rodilla: ['e128', 'e158', 'e70'],"],
  ['el generador vuelve a la regex cruda (la excepción no le llega)', 'core',
    "    if (zonas.length && exerciseContraindicated(ex, zonas)) return true;",
    "    if (zonas.length && zonas.some(z => GEN_ZONE_EXCL[z] && GEN_ZONE_EXCL[z].test(_norm(ex.name)))) return true;"],
  ['el plan de choque vuelve a la regex cruda', 'core',
    "    && !exerciseContraindicated(x, [...excludeZones]));",
    "    && ![...excludeZones].some(z => GEN_ZONE_EXCL[z].test(_norm(x.name))));"],
  // ── La marca del coach ──
  ['la marca deja de resolver el nombre del catálogo', 'core',
    "(limKeys || []).filter(z => exerciseContraindicated(ex, [z], lib)).map(_zoneLabelCoach)",
    "(limKeys || []).filter(z => exerciseContraindicated(ex, [z])).map(_zoneLabelCoach)"],
  ['isquios vuelve a hablarle a la persona en la marca del coach', 'core',
    "const GEN_ZONE_LABEL_COACH = { isquios: 'muslo por detrás' };", "const GEN_ZONE_LABEL_COACH = {};"],
  ['el editor (y la plantilla aplicada) deja de marcar', 'coach',
    "          ${_exWarnChip(e,_lim.keys,_lim.propio)}\n", ''],
  ['el editor marca con una lista vacía', 'coach',
    "  const _lim=_rfWarmLim();", "  const _lim={keys:[],propio:false};"],
  ['la ficha deja de marcar', 'coach',
    "${_exWarnChip(e,_limKeys,c.id==='_self')}", ''],
  ['la marca devuelve vacío siempre (if(false) disfrazado)', 'coach',
    "  if(!keys||!keys.length||typeof exerciseWarnZones!=='function') return '';",
    "  return '';"],
  ['la marca pinta sin escapar', 'coach',
    "⚠️ ${esc(warmupWarnText(z,propio))}", "⚠️ ${warmupWarnText(z,propio)}"],
  ['la vista previa del generador también marca (ya está filtrada)', 'coach',
    "${bisetInfo(_arr,_ei).biset?' · <span class=\"biset-tag\">'+_coIco('link',10,'🔗')+' biserie</span>':''}</div></div><div class=\"exsets\">${exSetsCellHTML(e)}</div></div>`).join('');\n    return `<div class=\"rc open\"",
    "${bisetInfo(_arr,_ei).biset?' · <span class=\"biset-tag\">'+_coIco('link',10,'🔗')+' biserie</span>':''}</div>${_exWarnChip(e,[],false)}</div><div class=\"exsets\">${exSetsCellHTML(e)}</div></div>`).join('');\n    return `<div class=\"rc open\""],
];

const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
let muerden = 0, noAplican = 0;
for (const [nombre, archivo, buscar0, poner0] of SABOTAJES) {
  const src = orig[archivo];
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const buscar = buscar0.replace(/\n/g, eol), poner = poner0.replace(/\n/g, eol);
  const veces = src.split(buscar).length - 1;
  if (veces !== 1) { noAplican++; console.log(`⚠️  NO SE APLICÓ — «${nombre}»: el ancla aparece ${veces} veces.`); continue; }
  escribir(F[archivo], src.replace(buscar, () => poner));
  let rojo = false;
  try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' }); } catch { rojo = true; } finally { escribir(F[archivo], orig[archivo]); }
  if (rojo) { muerden++; console.log(`✅ MUERDE — «${nombre}»`); } else console.log(`🔴 VERDE CON SABOTAJE — «${nombre}»`);
}
let base = true;
try { execSync('node avi.test.js', { cwd: ROOT, stdio: 'pipe' }); } catch { base = false; }
console.log(`\nControl: suite sin sabotaje ${base ? 'VERDE ✅' : 'ROJA 🔴'}`);
console.log(`Resultado: ${muerden}/${SABOTAJES.length} muerden · ${noAplican} sin aplicar.`);
process.exit(base && !noAplican && muerden === SABOTAJES.length ? 0 : 1);
