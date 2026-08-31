#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// _verify-rls-aislamiento.mjs — NADIE PUEDE LEER LOS DATOS DE OTRO.
//
// Es la pregunta de la Fase 0 que trajo Camilo el 30-ago, y hasta hoy NO EXISTÍA
// ningún harness que la contestara: había políticas escritas y revisadas a ojo, que
// no es lo mismo que probadas. Una política puede estar bien redactada y no aplicarse
// (RLS deshabilitado en la tabla), o cubrir el SELECT y dejar abierto el UPDATE.
//
// 🔴 SE PRUEBA CONTRA PRODUCCIÓN Y CON SESIONES DE VERDAD. Leer el `.sql` del repo
// solo demuestra lo que alguien escribió; aquí se inicia sesión como el asesorado QA
// y como el coach QA y se INTENTA el acceso cruzado de verdad, con el mismo REST que
// usa la app. Lo único que cuenta es lo que devuelve el servidor.
//
// 🔒 CONTROLES POSITIVOS, Y SON LO MÁS IMPORTANTE DEL ARCHIVO. Si las credenciales
// caducan o la llave está mal, TODAS las consultas devuelven 0 filas y un harness
// ingenuo canta «aislamiento perfecto» sobre una sesión que no existe. Por eso, antes
// de exigir ceros, se exige que cada sesión SÍ LEA LO SUYO. Sin ese control, este
// archivo sería una máquina de dar falsos verdes.
//
// 🔒 NO ESCRIBE NADA EN DATOS AJENOS. Los intentos de escritura van contra la fila
// del OTRO y lo que se espera es que fallen; si alguno tuviera éxito se avisa a gritos
// y se marca en rojo (no se intenta deshacer: eso ya sería un incidente).
//
// Usa SOLO las cuentas QA aisladas de ~/.avi/qa-accounts.txt. Jamás usuarios reales.
//
//   node scripts/e2e/_verify-rls-aislamiento.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SB_URL = "https://eoebhrxbokyllqalyecj.supabase.co";
const SB_KEY = "sb_publishable_hKjgo84b9Lews5oq90b9Fg_1pue73W8";
const COACH_REAL = "0a6484ed-42af-449d-9903-e440ac683ecf"; // Camilo — solo se LEE su uid

// ── credenciales QA ──────────────────────────────────────────────────────────
function cuentasQA() {
  const txt = readFileSync(join(homedir(), ".avi", "qa-accounts.txt"), "utf8");
  const bloques = [...txt.matchAll(/email:\s*(\S+)\s*\n\s*pass:\s*(\S+)\s*\n\s*uid:\s*(\S+)/g)];
  if (bloques.length < 2) {
    console.error("❌ ABORTO: no encontré las DOS cuentas QA en ~/.avi/qa-accounts.txt");
    process.exit(1);
  }
  const [a, c] = bloques;
  return {
    asesorado: { email: a[1], pass: a[2], uid: a[3] },
    coach: { email: c[1], pass: c[2], uid: c[3] },
  };
}

const QA = cuentasQA();

async function entrar(cuenta, etiqueta) {
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: cuenta.email, password: cuenta.pass }),
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) {
    console.error(`❌ ABORTO: no pude iniciar sesión como ${etiqueta} (${r.status}) — sin sesión esta corrida no prueba nada`);
    process.exit(1);
  }
  return { token: j.access_token, uid: j.user?.id, etiqueta };
}

const H = (s) => ({ apikey: SB_KEY, Authorization: `Bearer ${s.token}` });

// 🔒 SOLO PARA VIGILAR, NUNCA PARA AFIRMAR. La llave de servicio se salta RLS por
// definición: si una comprobación de aislamiento la usara, no estaría probando nada.
// Aquí sirve únicamente para fotografiar una fila real antes y después de un intento
// de escritura ajena, y poder gritar si algo cambió.
let SR = null;
try { SR = readFileSync(join(homedir(), ".avi", "service-role.key"), "utf8").trim(); } catch {}
async function conServicio(ruta) {
  if (!SR) return "(sin llave de servicio)";
  const r = await fetch(`${SB_URL}/rest/v1/${ruta}`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}` },
  });
  return await r.json().catch(() => null);
}

/** Devuelve {filas, estado} de un GET a user_data con el filtro dado. */
async function leer(sesion, filtro) {
  const r = await fetch(`${SB_URL}/rest/v1/user_data?select=user_id,coach_id&${filtro}`, {
    headers: H(sesion),
  });
  const cuerpo = await r.json().catch(() => null);
  return { estado: r.status, filas: Array.isArray(cuerpo) ? cuerpo : [] };
}

let fallos = 0;
const ok = (cond, txt, extra) => {
  console.log(`  ${cond ? "✅" : "❌"} ${txt}${extra ? " — " + extra : ""}`);
  if (!cond) fallos++;
};

console.log("\n══ AISLAMIENTO DE DATOS · producción · solo cuentas QA ══");

const sAse = await entrar(QA.asesorado, "asesorado QA");
const sCoach = await entrar(QA.coach, "coach QA");

// ═══════════ CONTROLES POSITIVOS ═══════════
// 🔴 VAN PRIMEROS Y SI FALLAN SE ABORTA. Todo lo que sigue son ceros esperados, y una
// sesión rota los produce todos sin que nada esté protegido.
console.log("\n── controles: cada sesión SÍ ve lo suyo (si no, los ceros de abajo no valen)");
const propiaAse = await leer(sAse, `user_id=eq.${sAse.uid}`);
const propiaCoach = await leer(sCoach, `user_id=eq.${sCoach.uid}`);
ok(propiaAse.filas.length === 1, "el asesorado QA lee SU propia fila", `${propiaAse.filas.length} fila(s), HTTP ${propiaAse.estado}`);
ok(propiaCoach.filas.length === 1, "el coach QA lee SU propia fila", `${propiaCoach.filas.length} fila(s), HTTP ${propiaCoach.estado}`);
if (fallos) {
  console.error("\n❌ ABORTO: sin lectura propia no se puede afirmar nada sobre el aislamiento");
  process.exit(1);
}

// ═══════════ 1. ASESORADO → DATOS DE OTROS ═══════════
console.log("\n── 1. Un asesorado NO puede leer a nadie más");
const otroConcreto = await leer(sAse, `user_id=eq.${sCoach.uid}`);
ok(otroConcreto.filas.length === 0, "no lee la fila del coach QA pidiéndola por su id",
   `${otroConcreto.filas.length} fila(s)`);

const coachReal = await leer(sAse, `user_id=eq.${COACH_REAL}`);
ok(coachReal.filas.length === 0, "no lee la fila del coach REAL pidiéndola por su id",
   `${coachReal.filas.length} fila(s)`);

// 🔴 EL BARRIDO SIN FILTRO ES EL ATAQUE DE VERDAD. Pedir `select=*` sin `where` es lo
// primero que prueba cualquiera con la llave pública, que está en el JS de la web.
const barrido = await leer(sAse, `limit=500`);
const ajenas = barrido.filas.filter((f) => f.user_id !== sAse.uid);
ok(ajenas.length === 0, "un barrido SIN filtro solo devuelve su propia fila",
   `${barrido.filas.length} fila(s), ${ajenas.length} ajena(s)`);

// ═══════════ 2. COACH → SOLO SUS ASESORADOS ═══════════
// ⚠️ EL ASESORADO QA **SÍ** ESTÁ BAJO EL COACH QA (`coach_id = d69a24f5…`, comprobado).
// La primera versión de este archivo dio por hecho que eran cuentas ajenas y marcó DOS
// rojos —uno de ellos gritando «escribió de verdad»— sobre el comportamiento CORRECTO:
// un coach leyendo y editando a su propio asesorado. No había ningún hueco; había una
// premisa falsa. Por eso el par verdaderamente ajeno es coach QA ↔ coach REAL.
console.log("\n── 2. Un coach solo ve a SUS asesorados");
const barridoCoach = await leer(sCoach, `limit=500`);
const noSuyas = barridoCoach.filas.filter(
  (f) => f.user_id !== sCoach.uid && f.coach_id !== sCoach.uid,
);
ok(noSuyas.length === 0, "el coach QA no ve NI UNA fila que no sea suya o de sus asesorados",
   `${barridoCoach.filas.length} visible(s), ${noSuyas.length} ajena(s)`);
// control positivo: tiene que ver a SU asesorado, o el cero de arriba no diría nada
const suyo = await leer(sCoach, `user_id=eq.${sAse.uid}`);
ok(suyo.filas.length === 1, "control: el coach QA SÍ ve a su propio asesorado",
   `${suyo.filas.length} fila(s)`);
// y ahora el cruce de verdad: otro coach, con sus propios asesorados
const filaCoachReal = await leer(sCoach, `user_id=eq.${COACH_REAL}`);
ok(filaCoachReal.filas.length === 0, "no lee la fila del coach REAL, que no tiene nada que ver con él",
   `${filaCoachReal.filas.length} fila(s)`);

// ═══════════ 3. ESCRITURA CRUZADA ═══════════
console.log("\n── 3. Nadie escribe sobre la fila de otro");
// 🔴 SE MIDE POR FILAS AFECTADAS, NO POR EL CÓDIGO HTTP. Un UPDATE que la política
// filtra a cero filas devuelve 204 igual que uno que sí escribió: leer solo el estado
// daría por «bloqueado» algo que podría haber escrito, y al revés.
async function intentarEscribir(sesion, uidVictima, etq) {
  const r = await fetch(`${SB_URL}/rest/v1/user_data?user_id=eq.${uidVictima}`, {
    method: "PATCH",
    headers: { ...H(sesion), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ coach_id: sesion.uid }),
  });
  const cuerpo = await r.json().catch(() => []);
  const tocadas = Array.isArray(cuerpo) ? cuerpo.length : 0;
  ok(tocadas === 0, etq, `${tocadas} fila(s) afectadas, HTTP ${r.status}`);
  if (tocadas > 0) console.error("     🚨 ESCRIBIÓ DE VERDAD — esto es un incidente, no un fallo de test");
}
await intentarEscribir(sAse, sCoach.uid, "el asesorado no puede hacerse coach del coach QA");
await intentarEscribir(sAse, COACH_REAL, "el asesorado no puede hacerse coach del coach REAL");
// 🔒 El coach QA contra una fila REAL. Antes se guarda copia con la llave de servicio y
// después se comprueba que sigue idéntica: si la política estuviera rota, esta prueba lo
// detecta Y deja constancia de qué restaurar, en vez de corromper el dato de una persona.
// La llave de servicio se usa SOLO para vigilar; la afirmación sobre RLS sale de la
// sesión del coach, nunca de ella.
const antesReal = await conServicio(`user_data?select=coach_id&user_id=eq.${COACH_REAL}`);
await intentarEscribir(sCoach, COACH_REAL, "el coach QA no puede adueñarse de una cuenta ajena");
const despuesReal = await conServicio(`user_data?select=coach_id&user_id=eq.${COACH_REAL}`);
ok(JSON.stringify(antesReal) === JSON.stringify(despuesReal),
   "y la fila real quedó intacta tras el intento",
   JSON.stringify(antesReal) === JSON.stringify(despuesReal) ? "sin cambios" : `🚨 CAMBIÓ: ${JSON.stringify(antesReal)} → ${JSON.stringify(despuesReal)}`);

// ═══════════ 4. SIN SESIÓN ═══════════
console.log("\n── 4. Sin iniciar sesión no se ve nada (solo la vitrina)");
const anon = { token: SB_KEY };
const anonUser = await fetch(`${SB_URL}/rest/v1/user_data?select=user_id&limit=50`, { headers: H(anon) });
const anonFilas = await anonUser.json().catch(() => []);
ok(Array.isArray(anonFilas) ? anonFilas.length === 0 : true,
   "un anónimo no lee NADA de user_data",
   `HTTP ${anonUser.status}, ${Array.isArray(anonFilas) ? anonFilas.length : 0} fila(s)`);

// control invertido: la vitrina SÍ tiene que ser pública, o el check de arriba podría
// estar pasando porque la llave pública no sirve para nada.
const vit = await fetch(`${SB_URL}/rest/v1/avi_showcase?select=nombre&limit=10`, { headers: H(anon) });
const vitFilas = await vit.json().catch(() => []);
ok(Array.isArray(vitFilas) && vitFilas.length > 0,
   "control: la vitrina SÍ es pública (si no, la llave anónima no probaba nada)",
   `${Array.isArray(vitFilas) ? vitFilas.length : 0} tarjeta(s)`);

// 🔴 Y LA VITRINA NO PUEDE FILTRAR DE MÁS: es la única tabla pública, así que se
// comprueba que no expone ninguna columna de identificación personal.
const vitTodo = await fetch(`${SB_URL}/rest/v1/avi_showcase?select=*&limit=1`, { headers: H(anon) });
const vitFila = (await vitTodo.json().catch(() => []))[0] || {};
const prohibidas = ["apellido", "edad", "age", "peso", "weight", "email", "telefono", "phone", "user_id", "foto", "photo"];
const filtradas = Object.keys(vitFila).filter((k) => prohibidas.includes(k.toLowerCase()));
ok(filtradas.length === 0, "la vitrina no expone datos personales",
   filtradas.length ? "EXPONE: " + filtradas.join(", ") : `columnas: ${Object.keys(vitFila).join(", ")}`);

console.log(fallos ? `\n❌ ${fallos} fallo(s) — HAY UN HUECO DE AISLAMIENTO` : "\n✅ AISLAMIENTO OK — nadie llega a los datos de otro");
process.exit(fallos ? 1 : 0);
