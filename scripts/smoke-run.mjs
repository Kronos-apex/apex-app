// smoke-run.mjs — Levanta APEX en un navegador headless y confirma que arranca.
// Uso:  node scripts/smoke-run.mjs        (desde apex-app/)
//   o:  node apex-app/scripts/smoke-run.mjs
//
// Qué verifica:
//   1. apex-core.js carga en el navegador real → las 7 funciones de negocio
//      existen en el window y devuelven valores correctos.
//   2. La app renderiza (no pantalla en blanco).
//   3. No hay errores de consola/página relevantes.
// Sale con código 1 si algo falla (apto para CI / gates).
//
// Sirve la carpeta bajo el prefijo /apex-app/ para que las rutas absolutas de
// producción (manifest.json, icons/) resuelvan igual que en GitHub Pages.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = normalize(join(SCRIPT_DIR, '..'));   // apex-app/
const PORT = 8099;
const PREFIX = '/apex-app';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
               '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon',
               '.webmanifest':'application/manifest+json' };

const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.startsWith(PREFIX)) p = p.slice(PREFIX.length);   // /apex-app/x → /x
    if (p === '/' || p === '') p = '/index.html';
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('not found'); }
});

await new Promise(r => server.listen(PORT, r));

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
const http404 = [];
page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('response', r => { if (r.status() >= 400) http404.push(`${r.status()} ${r.url()}`); });

const URL = `http://localhost:${PORT}${PREFIX}/index.html`;
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 1500));   // dejar inicializar el script principal

// 1) apex-core.js en el window real
const core = await page.evaluate(() => {
  const fns = ['getIccLabel','getSexCode','calcMacrosSugeridos','migrateRoutineIds',
               'shouldPostPush','delClientGuard','cnTodayGuard'];
  const present = {}; fns.forEach(f => present[f] = typeof globalThis[f]);
  const out = { present };
  try { out.icc = getIccLabel(0.90,'M').label; } catch (e) { out.iccErr = e.message; }
  try { out.macro = calcMacrosSugeridos({ weight:70, activityFactor:1.55, goal:'salud' }).kcal; } catch (e) { out.macroErr = e.message; }
  return out;
});

// 2) Render
const bodyText = (await page.evaluate(() => document.body.innerText || '')).trim();

// 3) Screenshot
const shot = join(SCRIPT_DIR, 'apex-smoke.png');
await page.screenshot({ path: shot, fullPage: false });

await browser.close();
server.close();

// ── Evaluación ──
const allFns = Object.values(core.present).every(t => t === 'function');
const coreWorks = core.icc === 'Riesgo moderado' && core.macro === 2520;
const rendered = bodyText.length > 50;
// favicon.ico es una petición automática del navegador, no un recurso de la app.
const benign = u => /favicon\.ico/i.test(u);
const realHttp = http404.filter(u => !benign(u));
// El "Failed to load resource" genérico ya está cubierto por realHttp (con URL).
const realErrors = errors.filter(e => !/favicon/i.test(e) && !/Failed to load resource/i.test(e));

console.log('\n━━━ APEX smoke run ━━━');
console.log(`URL: ${URL}`);
console.log(`\n[1] apex-core.js en window: ${allFns ? '✅ las 7 funciones presentes' : '❌ faltan funciones'}`);
console.log('    ' + JSON.stringify(core.present));
console.log(`    getIccLabel(0.90,'M') = "${core.icc}"  ·  calcMacrosSugeridos = ${core.macro}  ${coreWorks ? '✅' : '❌'}`);
console.log(`\n[2] Render: ${rendered ? '✅' : '❌'} ${bodyText.length} chars visibles`);
console.log('    ' + bodyText.slice(0, 120).replace(/\n/g,' / '));
const totalProblems = realErrors.length + realHttp.length;
console.log(`\n[3] Errores relevantes (${totalProblems}): ${totalProblems ? '❌' : '✅ ninguno'}`);
realErrors.forEach(e => console.log('    • ' + e));
realHttp.forEach(u => console.log('    ↳ ' + u));
const benignHttp = http404.filter(benign);
if (benignHttp.length) console.log(`    (ignorados: ${benignHttp.join(', ')})`);
console.log(`\nScreenshot: ${shot}`);

const okAll = allFns && coreWorks && rendered && totalProblems === 0;
console.log(`\n${okAll ? '🟢 SMOKE OK' : '🔴 SMOKE FALLÓ'}`);
process.exit(okAll ? 0 : 1);
