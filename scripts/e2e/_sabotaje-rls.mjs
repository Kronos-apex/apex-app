#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// _sabotaje-rls.mjs — ¿`_verify-rls-aislamiento.mjs` DISTINGUE algo?
//
// 🔴 AQUÍ NO SE PUEDE SABOTEAR LO DE SIEMPRE. En los demás harness se estropea el
// código y se exige rojo. Aquí «el código» son las POLÍTICAS DE PRODUCCIÓN: apagar
// RLS en `user_data` para ver si la sonda se entera dejaría, durante esos segundos,
// los datos de 22 personas reales al alcance de cualquiera con la llave pública, que
// está en el JS de la web. Eso no se hace ni con una ventana de un segundo.
//
// Lo que sí se puede —y demuestra lo mismo— es COMPROBAR QUE LAS ASERCIONES
// DISCRIMINAN: se apuntan los checks de «esto tiene que dar CERO filas» a filas que
// esa misma sesión SÍ puede ver. Si la sonda sigue en verde, es que no está mirando
// lo que dice mirar, y sus ceros de siempre podrían venir de una consulta rota, de
// una sesión caducada o de un filtro mal escrito — que es exactamente cómo un
// harness de seguridad se vuelve decorativo.
//
// 🔒 NO TOCA NI UNA POLÍTICA, NI UNA FILA. Solo reescribe a qué uid apunta la sonda.
// 🔴 SE JUZGA POR CÓDIGO DE SALIDA, no por el texto impreso.
//
//   node scripts/e2e/_sabotaje-rls.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const SONDA = join(import.meta.dirname, "_verify-rls-aislamiento.mjs");
const original = readFileSync(SONDA, "utf8");

const CASOS = [
  {
    nombre: "DEBE PASAR — sin tocar nada, la sonda sale en verde",
    debeFallar: false,
    parches: [],
  },
  {
    nombre: "S1 · el check de «un asesorado no lee a nadie más» apunta a SU PROPIA fila",
    debeFallar: true,
    // si el check no distingue, dará 0 igual apuntando a algo que SÍ existe
    parches: [[`const otroConcreto = await leer(sAse, \`user_id=eq.\${sCoach.uid}\`);`,
               `const otroConcreto = await leer(sAse, \`user_id=eq.\${sAse.uid}\`);`]],
  },
  {
    nombre: "S2 · el barrido sin filtro cuenta como «ajena» hasta la fila propia",
    debeFallar: true,
    parches: [[`const ajenas = barrido.filas.filter((f) => f.user_id !== sAse.uid);`,
               `const ajenas = barrido.filas.filter(() => true);`]],
  },
  {
    nombre: "S3 · el cruce entre coaches apunta al asesorado que el coach SÍ tiene",
    debeFallar: true,
    parches: [[`const filaCoachReal = await leer(sCoach, \`user_id=eq.\${COACH_REAL}\`);`,
               `const filaCoachReal = await leer(sCoach, \`user_id=eq.\${sAse.uid}\`);`]],
  },
  {
    nombre: "S4 · el intento de escritura ajena se dirige a la fila PROPIA del asesorado",
    debeFallar: true,
    // el asesorado SÍ puede escribir su propia fila → tiene que salir «afectó 1»
    parches: [[`await intentarEscribir(sAse, sCoach.uid, "el asesorado no puede hacerse coach del coach QA");`,
               `await intentarEscribir(sAse, sAse.uid, "el asesorado no puede hacerse coach del coach QA");`]],
  },
  {
    nombre: "S5 · el check de la vitrina pública deja de mirar las columnas prohibidas",
    debeFallar: true,
    parches: [[`const prohibidas = ["apellido", "edad", "age", "peso", "weight", "email", "telefono", "phone", "user_id", "foto", "photo"];`,
               `const prohibidas = ["nombre", "entrenos"];`]],
  },
];

let detectados = 0, fallos = 0;
console.log("");

for (const caso of CASOS) {
  let s = original, aplicado = true;
  for (const [busca, pone] of caso.parches) {
    if (!s.includes(busca)) {
      console.log(`  ⚠️  ${caso.nombre}\n      NO SE APLICÓ: no encontré el ancla`);
      aplicado = false;
      break;
    }
    s = s.replace(busca, pone);
  }

  if (aplicado) {
    writeFileSync(SONDA, s, "utf8");
    const r = spawnSync("node", [SONDA], { stdio: "pipe", encoding: "utf8" });
    const rojo = r.status !== 0;
    const bien = rojo === caso.debeFallar;
    if (bien) { detectados++; console.log(`  ✅ ${caso.nombre}\n      → salió ${rojo ? "EN ROJO (discrimina)" : "en verde, como debía"}`); }
    else { fallos++; console.log(`  ❌ ${caso.nombre}\n      → salió ${rojo ? "EN ROJO cuando no debía" : "EN VERDE: la aserción NO distingue"}`); }
  } else fallos++;

  writeFileSync(SONDA, original, "utf8"); // restaurar SIEMPRE
}

console.log(`\n${fallos ? "❌" : "✅"} ${detectados}/${CASOS.length} como se esperaba${fallos ? ` · ${fallos} fallo(s)` : ""}`);
process.exit(fallos ? 1 : 0);
