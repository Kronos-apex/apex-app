// ─────────────────────────────────────────────────────────────────────────────
// publicar-hogar.mjs — publica la app en el HOGAR NUEVO (app.avientrena.com).
//
// Por qué existe: la mudanza de v658 necesita que las DOS direcciones estén vivas a la vez.
// GitHub Pages con dominio propio OBLIGA a redirigir github.io, y un teléfono que no haya
// actualizado vería una PANTALLA DE ERROR (medido en `_verify-mudanza-instalada`). Así que el
// hogar nuevo se sirve aparte (Vercel, proyecto `avi-app`) y el viejo se queda intacto.
//
// Qué se sube: solo la app (5 MB). `media/` (115 MB de fotos y videos de ejercicio) NO viaja:
// `scripts/hogar-vercel.json` la reenvía a github.io, así que para el navegador sigue siendo
// del mismo origen (sin CORS y sin teñir ningún lienzo).
//
// Corre: node scripts/publicar-hogar.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { cpSync, mkdirSync, rmSync, copyFileSync, readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEST = join(process.env.TEMP || '/tmp', 'avi-home');
const ARCHIVOS = ['index.html', 'sw.js', 'manifest.json', 'styles.css', 'foods.json', 'avi-core.js', 'muscle-map.js',
  'exercise-muscles.js', 'app-1-infra.js', 'app-2-login.js', 'app-3-coach.js', 'app-4-entreno.js', 'app-5-salud.js',
  'app-6-extra.js', 'app-7-community.js'];
const CARPETAS = ['icons', 'splash', 'screenshots', 'legal'];

// 🔴 El enlace con el proyecto de Vercel vive en `DEST/.vercel`: si se borra con el resto, el
//    deploy se va a un proyecto NUEVO (o a ninguno) y app.avientrena.com se queda en la versión
//    anterior — pasó al publicar v659 y solo lo delató el prodcheck contra el hogar nuevo.
const LINK = join(DEST, '.vercel');
const linkTmp = join(process.env.TEMP || '/tmp', 'avi-home-vercel-link');
rmSync(linkTmp, { recursive: true, force: true });
if (existsSync(LINK)) cpSync(LINK, linkTmp, { recursive: true });
rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });
if (existsSync(linkTmp)) cpSync(linkTmp, LINK, { recursive: true });
else console.log('⚠️  Sin enlace previo: `npx vercel link --yes --project avi-app` en ' + DEST);
for (const f of ARCHIVOS) copyFileSync(join(ROOT, f), join(DEST, f));
for (const d of CARPETAS) cpSync(join(ROOT, d), join(DEST, d), { recursive: true });
copyFileSync(join(ROOT, 'scripts', 'hogar-vercel.json'), join(DEST, 'vercel.json'));
// La señal de arranque de la mudanza va APARTE (`mudanza.json`): mientras no exista, ningún
// teléfono salta. Se publica el día del cambio, con `--mudanza`.
if (process.argv.includes('--mudanza')) {
  copyFileSync(join(ROOT, 'scripts', 'hogar-mudanza.json'), join(DEST, 'mudanza.json'));
  console.log('⚠️  Con SEÑAL DE MUDANZA: los teléfonos en v662+ (salvo iPhone instalado) van a saltar al hogar nuevo.');
} else {
  console.log('Sin señal de mudanza (nadie salta). Para encenderla: --mudanza');
}
const v = (readFileSync(join(ROOT, 'sw.js'), 'utf8').match(/avi-v(\d+)/) || [])[1];
console.log(`Publicando v${v} en app.avientrena.com…`);
execSync('npx -y vercel deploy --prod --yes', { cwd: DEST, stdio: 'inherit' });
console.log('\nVerifica: node scripts/e2e/_prodcheck.mjs v' + v + ' https://app.avientrena.com/');
