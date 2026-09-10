// Matriz de sabotaje de «LAS FOTOS SÍ LLEGAN AL BUCKET» (v600).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: este bug vivió 3 meses y medio SIN DAR UN ERROR. La foto se
// guardaba, se veía en la pantalla, y nadie noto que estaba viajando como base64 dentro de la fila
// de cada persona (838 KB entre 6). El único rastro era un `warn` en una consola que nadie abre, y
// la migración reintentaba en cada arranque, fallando siempre, en silencio.
//
// Corre: node scripts/e2e/_sabotaje-v600.mjs
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';

const F = {
  app5: new URL('../../app-5-salud.js', import.meta.url),
  app4: new URL('../../app-4-entreno.js', import.meta.url),
  sql: new URL('../../supabase/migrations/20260910_apex_photos_select_policy.sql', import.meta.url),
  av: new URL('../../supabase/community/c2_avatars_bucket.sql', import.meta.url),
};
const RAIZ = new URL('../..', import.meta.url);
const suiteRoja = () => {
  try { execSync('node avi.test.js', { cwd: RAIZ, encoding: 'utf8', stdio: 'pipe' }); return ['', false]; }
  catch (e) { return [((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló', true]; }
};
const orig = Object.fromEntries(Object.entries(F).map(([k, u]) => [k, readFileSync(u, 'utf8')]));
// El fin de línea se deriva del archivo (CRLF local, LF en CI): la lección de v597.
const eolDe = s => (s.includes('\r\n') ? '\r\n' : '\n');
let muerden = 0, total = 0, inertes = 0;

const matriz = [
  ['1· la carpeta vuelve a ser el id de cliente de la app (la policy no matchea nunca)',
    'app5', [['const path=_photoPath(uid,photoId);', 'const path=`${photoId}/${photoId}.jpg`;']]],
  ['2· sin sesión se sigue intentando subir (a una ruta que la RLS va a rechazar)',
    'app5', [["  if(!uid)throw new Error('Storage upload: sin sesión');\n", '']]],
  ['3· el avatar deja de llevar el id del asesorado (se sobrescriben entre ellos)',
    'app5', [["function avatarObjId(clientId){ return 'avatar-'+String(clientId||''); }",
      "function avatarObjId(clientId){ return 'avatar'; }"]]],
  ['4· el borrado deja de usar la URL guardada (archivos viejos huérfanos para siempre)',
    'app5', [['const path=_photoPathFromUrl(url)||(uid?_photoPath(uid,photoId):null);',
      'const path=uid?_photoPath(uid,photoId):null;']]],
  ['5· `deletePhoto` deja de pasar la URL de la entrada que está borrando',
    'app5', [['deletePhotoFromStorage(photoId,_ent&&_ent.src);', 'deletePhotoFromStorage(photoId);']]],
  ['6· la llamada entre módulos pierde su guarda typeof (lo que reventó 3 veces en Android)',
    'app4', [["      if(typeof uploadPhotoToStorage!=='function'||typeof avatarObjId!=='function')throw new Error('modulo de fotos no cargado');\n",
      ''], ["  if(typeof deletePhotoFromStorage==='function'&&typeof avatarObjId==='function')deletePhotoFromStorage(avatarObjId(clientId),_prev);",
      '  deletePhotoFromStorage(avatarObjId(clientId),_prev);']]],
  ['7· la policy SELECT queda ANCHA (arregla el upsert y habilita enumerar el bucket)',
    'sql', [["  using (bucket_id = 'apex-photos' and (storage.foldername(name))[1] = auth.uid()::text);",
      "  using (bucket_id = 'apex-photos');"]]],
  ['8· se cae `avatars_select_own` del bucket hermano (vuelve el 400 de los avatares)',
    'av', [['create policy avatars_select_own on storage.objects for select to authenticated',
      'create policy avatars_select_otra on storage.objects for select to authenticated']]],
];

try {
  for (const [nombre, cual, pares] of matriz) {
    total++;
    const EOL = eolDe(orig[cual]);
    const eol = s => s.split('\n').join(EOL);
    let roto = orig[cual], aplicable = true;
    for (const [b, p] of pares) {
      const buscar = eol(b), poner = eol(p);
      if (roto.split(buscar).length - 1 !== 1) { aplicable = false; break; }
      roto = roto.split(buscar).join(poner);
    }
    if (!aplicable) {
      inertes++;
      console.log(`  ⚠️  ${nombre}\n      NO SE APLICÓ: el texto no aparece exactamente 1 vez (¿cambió el código?)`);
      continue;
    }
    writeFileSync(F[cual], roto, 'utf8');
    const [linea, rojo] = suiteRoja();
    writeFileSync(F[cual], orig[cual], 'utf8');
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite quedó VERDE'}`);
    if (rojo) muerden++;
  }

  // 9· el sabotaje que no es una sustitución: BORRAR la migración entera. Es el caso real (un
  //    archivo que nadie echa de menos), y el candado tiene que cazarlo igual.
  total++;
  const tmp = F.sql.pathname.replace(/^\//, '') + '.sabotaje';
  renameSync(F.sql, tmp);
  const [l9, r9] = suiteRoja();
  renameSync(tmp, F.sql);
  console.log(`  ${r9 ? '✅' : '🔴'} 9· se BORRA el archivo de la migración\n      ${l9 || 'la suite quedó VERDE'}`);
  if (r9) muerden++;
} finally {
  for (const [k, u] of Object.entries(F)) writeFileSync(u, orig[k], 'utf8');
  if (!existsSync(F.sql)) console.log('⚠️  OJO: revisa la migración a mano');
}

console.log(`\nMuerden ${muerden}/${total}` + (inertes ? ` · ${inertes} no se pudieron aplicar` : ''));
process.exitCode = (muerden === total) ? 0 : 1;
