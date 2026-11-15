// hogar-candado.mjs — revisa la carpeta que se va a publicar ANTES de llamar a Vercel.
// Nació del incidente del 15-nov-2026: la copia en %TEMP% quedó vacía (otro proceso limpió la
// carpeta temporal), Vercel subió la carpeta casi vacía y app.avientrena.com dio 404 varios minutos.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const MIN_ARCHIVOS = 500; // la copia mide ~605 (15-nov-2026); margen para no abortar por poco

const versionHtml = (carpeta) => {
  try { return (readFileSync(join(carpeta, 'index.html'), 'utf8').match(/\?v=(\d+)/) || [])[1] || null; } catch { return null; }
};
const versionSw = (carpeta) => {
  try { return (readFileSync(join(carpeta, 'sw.js'), 'utf8').match(/avi-v(\d+)/) || [])[1] || null; } catch { return null; }
};

export function contarArchivos(dir) {
  let n = 0;
  if (!existsSync(dir)) return 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.vercel') continue;
    const p = join(dir, e.name);
    n += e.isDirectory() ? contarArchivos(p) : 1;
  }
  return n;
}

// Devuelve la lista de problemas (vacía = se puede publicar).
export function revisarCarpeta(dest, root, archivos) {
  const p = [];
  for (const f of archivos) {
    const ruta = join(dest, f);
    if (!existsSync(ruta) || statSync(ruta).size === 0) p.push(`falta o está vacío: ${f}`);
  }
  const ex = join(dest, 'media', 'exercises');
  if (!existsSync(ex) || readdirSync(ex).length === 0) p.push('falta media/exercises/ (o está vacía)');
  const vh = versionHtml(dest), vs = versionSw(dest);
  const rh = versionHtml(root), rs = versionSw(root);
  if (!vh || vh !== rh) p.push(`la versión de index.html (${vh || 'ninguna'}) no es la del repo (${rh})`);
  if (!vs || vs !== rs) p.push(`la versión de sw.js (${vs || 'ninguna'}) no es la del repo (${rs})`);
  const n = contarArchivos(dest);
  if (n < MIN_ARCHIVOS) p.push(`solo hay ${n} archivos (se esperan al menos ${MIN_ARCHIVOS})`);
  return p;
}
