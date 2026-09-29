// Matriz de sabotaje de v691 — cada tarjeta pública atada a su persona (sin publicarlo).
// Cada fila devuelve UN defecto y la suite TIENE que ponerse roja. Lo que pasa en el servidor de verdad
// (la tarjeta de la tocaya sobrevive) lo prueba `_verify-borrado-por-coach.mjs --si-borrar`.
// Reemplazos con FUNCIÓN y escritura ATÓMICA.
//   node scripts/e2e/_sabotaje-v691.mjs   (COMMITEAR o respaldar antes: una matriz muta archivos)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = { core: join(ROOT, 'avi-core.js'), c3: join(ROOT, 'app-3-coach.js'),
  edge: join(ROOT, 'supabase/functions/delete-account/index.ts'), sql: join(ROOT, 'supabase/community/s3_showcase_dueno.sql') };
const escribir = (ruta, txt) => { writeFileSync(ruta + '.tmp', txt); renameSync(ruta + '.tmp', ruta); };

const SABOTAJES = [
  ['la atadura se ignora (vuelve a mandar el nombre)', 'core', '  if (card.dueno) {', '  if (false) {'],
  ['la de quien se fue se le asigna a su tocaya', 'core', "    return c ? { estado: 'duena', cliente: c } : { estado: 'huerfana' };", "    if (c) return { estado: 'duena', cliente: c };"],
  ['dos con el mismo nombre se desempatan a dedo', 'core', "  if (cand.length > 1) return { estado: 'ambigua', cuantos: cand.length };", ''],
  ['la ficha vuelve a elegir por nombre', 'c3', "  const ya=(typeof showcaseCardFor==='function')?showcaseCardFor(CUR.clientId,filas,DB.clients):filas.find(f=>f.nombre===st.nombre);", '  const ya=filas.find(f=>f.nombre===st.nombre);'],
  ['la app no trae de quién es cada tarjeta', 'c3', "if(m[f.id])f.dueno=m[f.id];", ''],
  ['publicar no ata la tarjeta', 'c3', "      const {error:eD}=await c.from('avi_showcase_dueno').insert({showcase_id:nueva.id,user_id:_cid,coach_id:u.id});", '      const eD=null;'],
  ['si la atadura falla, la tarjeta queda a medias', 'c3', "        try{ await c.from('avi_showcase').delete().eq('id',nueva.id); }catch(_e){}", ''],
  ['al eliminar no se avisa de la tarjeta dudosa', 'c3', '  if(data.tarjetasDudosas>0) _delTarjetaDudosa=true;', ''],
  ['el borrado vuelve a ir por nombre', 'edge', '      .from("avi_showcase").delete().in("id", [...ids]).select("id");', '      .from("avi_showcase").delete().eq("coach_id", mio?.coach_id).eq("nombre", primerNombre).select("id");'],
  ['se borra la tarjeta atada a OTRA persona', 'edge', '      const sinAtar = cand.filter((id: string) => !deOtro.has(id));', '      const sinAtar = cand;'],
  ['no se dice cuándo la vieja puede ser de otra persona', 'edge', '        if (otros > 0) tarjetasDudosas = sinAtar.length;', ''],
  ['la atadura se puede leer sin cuenta', 'sql', 'grant select, insert, delete on public.avi_showcase_dueno to authenticated;', 'grant select, insert, delete on public.avi_showcase_dueno to anon, authenticated;'],
  ['la atadura se puede editar', 'sql', 'grant select, insert, delete on public.avi_showcase_dueno to authenticated;', 'grant select, insert, update, delete on public.avi_showcase_dueno to authenticated;'],
  ['el relleno ata aunque el nombre se repita', 'sql', "         and lower(split_part(btrim(coalesce(u2.profile->>'name', '')), ' ', 1)) = lower(s.nombre)) = 1", "         and lower(split_part(btrim(coalesce(u2.profile->>'name', '')), ' ', 1)) = lower(s.nombre)) >= 1"],
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
