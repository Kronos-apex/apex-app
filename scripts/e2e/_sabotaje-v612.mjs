// Matriz de sabotaje de «UN PENDIENTE PARA ALGUIEN QUE YA NO EXISTE NO ES SIN CONEXIÓN» (v612).
// Rompe cada candado y exige que la suite se ponga ROJA.
//
// Por qué hace falta versionada: el defecto que mata esta versión NO DABA ERROR. El aviso
// «1 sin guardar» del PO llevaba una semana clavado, y al tocarlo respondía «Sigo sin conexión»
// con WiFi y datos a la vista — porque una escritura pendiente para un asesorado que él mismo
// había ELIMINADO se reintentaba para siempre. Nada falla, nada se pierde: lo único que pasa es
// que la señal que avisa de que algo suyo de verdad no subió se vuelve ruido permanente.
//
// Corre: node scripts/e2e/_sabotaje-v612.mjs
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

// 🔴 ESCRITURA ATÓMICA (13-sep-2026): un corte de luz a mitad de un `writeFileSync` deja el
// archivo con su tamaño nuevo y el contenido en CEROS. `.tmp` + `rename` es todo-o-nada.
const escribir = (url, texto) => {
  const p = fileURLToPath(url), tmp = p + '.tmp';
  writeFileSync(tmp, texto, 'utf8');
  renameSync(tmp, p);
};

const F = {
  core: new URL('../../avi-core.js', import.meta.url),
  app1: new URL('../../app-1-infra.js', import.meta.url),
  app3: new URL('../../app-3-coach.js', import.meta.url),
};
const RAIZ = new URL('../..', import.meta.url);
const suiteRoja = () => {
  try { execSync('node avi.test.js', { cwd: RAIZ, encoding: 'utf8', stdio: 'pipe' }); return ['', false]; }
  catch (e) { return [((e.stdout || '').match(/AVI Tests: .*/) || [''])[0] || 'la suite ni compiló', true]; }
};
const orig = Object.fromEntries(Object.entries(F).map(([k, u]) => [k, readFileSync(u, 'utf8')]));
const eolDe = s => (s.includes('\r\n') ? '\r\n' : '\n');   // ni se asume ni se mezcla (v600)
let muerden = 0, total = 0, inertes = 0;

const matriz = [
  // ── EL DEFECTO ORIGINAL, en sus dos mitades ──────────────────────────────────────────
  ['1· la lectura vuelve a devolver null para TODO: «no hay fila» y «no hay red» otra vez iguales',
    'app1', [["      return data?{estado:'ok',row:data}:{estado:'ausente',row:null};",
      "      return data?{estado:'ok',row:data}:{estado:'mudo',row:null};"]]],
  ['2· la huérfana vuelve a contarse como fallo de red (el aviso clavado del PO)',
    'app3', [["      if(v==='huerfana'){ _cwqMarkOrphan(e.col,e.id); orphan++; continue; }",
      "      if(v==='huerfana'){ fail++; continue; }"]]],
  ['3· eliminar la ficha deja de soltar sus pendientes (así nació el fantasma)',
    'app3', [["  if(typeof _cwqDropClient==='function')_cwqDropClient(delId);", '']]],

  // ── EL MOTOR PURO ────────────────────────────────────────────────────────────────────
  ['4· el veredicto confunde «no pude preguntar» con «la fila no está»',
    'core', [["  if (estado === 'mudo') return 'mudo';\n  if (estado === 'ausente') return 'huerfana';",
      "  if (estado === 'mudo') return 'mudo';\n  if (estado === 'ausente') return 'mudo';"]]],
  ['5· el veredicto deja de preguntar si PISA: vuelve a poder borrar el entreno de alguien',
    'core', [["  return coachQueueCanReplay(entry, lectura && lectura.updatedAt) ? 'subir' : 'retener';",
      "  return 'subir';"]]],
  ['6· una SEGUNDA definición de «puedo pisar» dentro del veredicto (el bug de v448 otra vez)',
    'core', [["  return coachQueueCanReplay(entry, lectura && lectura.updatedAt) ? 'subir' : 'retener';",
      "  return (new Date(lectura && lectura.updatedAt).getTime() <= (entry.ts || 0)) ? 'subir' : 'retener';"]]],
  ['7· el ORDEN se invierte: un pendiente GORDO de alguien borrado se queda clavado igual',
    'core', [["  if (estado === 'ausente') return 'huerfana';\n  if (entry.tooBig) return 'retener';",
      "  if (entry.tooBig) return 'retener';\n  if (estado === 'ausente') return 'huerfana';"]]],
  ['8· sin lectura se asume que la fila está (escribiría a ciegas)',
    'core', [["  const estado = (lectura && lectura.estado) || 'mudo';",
      "  const estado = (lectura && lectura.estado) || 'ok';"]]],
  ['9· el borrado se lleva por delante los pendientes de OTROS asesorados',
    'core', [['  return (Array.isArray(list) ? list : []).filter(x => !(x && x.id === clientId));',
      '  return [];']]],
  ['10· el borrado no suelta nada (la función queda inerte)',
    'core', [['  return (Array.isArray(list) ? list : []).filter(x => !(x && x.id === clientId));',
      '  return (Array.isArray(list) ? list : []).slice();']]],

  // ── LO QUE LE DA SALIDA AL AVISO ─────────────────────────────────────────────────────
  ['11· «Sigo sin conexión» se suelta de su causa y vuelve a salir siempre',
    'app3', [["  if(r.fail) toast('\u{1F4F4} Sigo sin conexi\u00f3n \u2014 lo vuelvo a intentar al reconectar');",
      "  if(true) toast('\u{1F4F4} Sigo sin conexi\u00f3n \u2014 lo vuelvo a intentar al reconectar');"]]],
  ['12· la huérfana se queda sin rama propia: el aviso vuelve a no tener salida',
    'app3', [['  if(r.orphan){', '  if(false){']]],
  ['13· el botón de descartar se queda ARMADO para siempre (la trampa de v568)',
    'app3', [['    _cwqArmT=setTimeout(_cwqDisarm,8000);', '    _cwqArmT=null;']]],
  ['14· el flush vuelve a reintentar lo ya marcado como huérfano (bucle infinito silencioso)',
    'app3', [["    if(e.huerfana){ orphan++; continue; }   // ya se pregunt\u00f3: su fila no est\u00e1. No se reintenta.", '']]],
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
    escribir(F[cual], roto);
    const [linea, rojo] = suiteRoja();
    escribir(F[cual], orig[cual]);
    console.log(`  ${rojo ? '✅' : '🔴'} ${nombre}\n      ${linea || 'la suite quedó VERDE'}`);
    if (rojo) muerden++;
  }
} finally {
  for (const [k, u] of Object.entries(F)) escribir(u, orig[k]);
}

console.log(`\nMuerden ${muerden}/${total}` + (inertes ? ` · ${inertes} no se pudieron aplicar` : ''));
process.exitCode = (muerden === total) ? 0 : 1;
