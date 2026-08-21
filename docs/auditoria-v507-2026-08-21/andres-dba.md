Audit complete. Everything measured against the real row and the real functions; nothing written.

---

# Auditoría de la escritura en producción — fila del PO (coach)

**Alcance:** solo lectura. No escribí, no borré, no apliqué migraciones, no toqué edge functions. `git status` limpio al inicio y al final (Lucas no tenía sabotajes puestos mientras medí).

## 1. 🟢 La escritura está bien hecha y completa

Diff profundo backup vs. nube de hoy (recursivo, clave por clave, incluidos los anidados):

```
claves ANTES: 19 | AHORA: 20
perdidas : []          nuevas : ['updatedAt']
DIFERENCIAS: 2
  profile/goal       'Ganar músculo'  ==>  'Perder grasa'
  profile/updatedAt  —                ==>  "2026-08-20T20:49:15.941Z"
```

Nada más se movió. `deload` (2.373 B), `habits` (18 días de pasos + 20 de agua), `foodlog` (6.476 B, 2 días), `painCare`, `startDate`, `activityFactor`, `tier`, `isSelf` — **byte-idénticos**. Cero cambios de tipo. `role='coach'` y `coach_id=null` intactos. Las otras 14 columnas (routines 5, history 64, prs 38, nutrition, templates, coach_settings…) están presentes y bien formadas.

`updatedAt` **no es una clave extraña**: la app la escribe ella misma (`app-3-coach.js:1305`, `saveClient`). No introduce nada ajeno al esquema.

⚠️ **Una salvedad de método:** el respaldo solo cubre `user_id/role/profile/updated_at`. Las otras 11 columnas **no tienen imagen previa** con la que comparar. El PATCH estaba acotado a `profile`, así que no hay motivo para sospechar — pero la próxima escritura directa debería respaldar **la fila entera**, no una columna.

## 2. 🟢 Radio de impacto: nada se regenera solo

- **Rutinas:** los 4 llamadores de `generarRutinas` son explícitos (botón «✨ Generar semana», alta de cliente). El único auto-regen (`app-3:253`) exige `isFreeClient(existing)`, y su cliente-self no lleva `tier` → no es libre. **Además sus 5 rutinas traen `restSec` horneado por rutina** (90/120/90/120/60) → el cambio **no las reescribe**. Solo un «✨ Generar» futuro daría otra cosa (`genSchemeFor`: descanso 90 s → 55 s, cubeta `hipertrofia` → `resistencia`).
- **Nutrición:** su plan guardado manda tal cual. `nutFillSuggested` auto-rellena solo si el plan está **vacío** (el suyo no lo está) y solo toca el **formulario** — guardar exige `saveNutrition()`. No se reescribe nada.
- **`nutProtPerKg`: 2,2 g/kg con los DOS objetivos** → el veredicto de proteína no se mueve.
- **`coachInsight`: idéntico en ambos casos** (`agua`). La rama de peso no dispara: su última pesada es del 3-jul, 49 días atrás, fuera de ventana.
- **`weekEditorial` sí CAMBIA** — es lo único visible: `FUERZA Y CRECIMIENTO · Esta semana construimos músculo` → `QUEMA Y CONSTANCIA · Esta semana, cada gota cuenta`. Es lo que él pidió.

## 3. 🔴 El riesgo offline-first es REAL — y no necesita estar offline

Con el código delante:

- Su fila propia se lee de la nube **exactamente una vez por sesión**, en `_enterCoachAuth` (`app-3-coach.js:779`). Después `COACH_OWN_ROW` solo se re-asigna desde **memoria** (`backToCoachPanel:852`, vía `_snapshotAuthRow`) o desde el **caché local** (`openMyTraining:839`). El poll de 15 s re-lee sus **asesorados**, nunca su propia fila.
- `_primeCoachSnap` fija la foto base y `_persistCoachWrite` (`app-1-infra.js:971`) escribe su perfil **solo si difiere** de esa foto.

**Escenario reproducible:** si la app quedó **abierta en cualquier dispositivo desde antes de las 20:49 UTC de hoy**, esa sesión sigue con «Ganar músculo» en memoria. Cualquier acción que toque su propio perfil — editarse desde el panel, tocar el vaso de agua, anotar pasos, registrar comida — reescribe el `profile` completo **con el objetivo viejo**. No hace falta estar sin señal. El arranque offline (`loadOwn` → null → `_readAuthRow`, `app-3:533`) es una segunda puerta al mismo sitio.

**Estado hoy: NO se ha revertido.** `updated_at` sigue siendo `20:49:34`, el PATCH mismo. Nada ha escrito después.

**👉 Qué tiene que hacer el PO:** **cerrar del todo y volver a abrir la app** (recarga real / re-login, no cambiar de pestaña) **en cada dispositivo donde la tenga abierta, antes de tocar nada suyo.** Con eso la fila fresca entra en memoria y el riesgo desaparece. Si solo la usa en un teléfono, basta una recarga.

## 4. 🔴 La «vía correcta» (cambiarlo desde la app) habría DESTRUIDO datos

Medido con su fila real y las funciones reales:

```
profile HOY en la nube                          : 20 claves
profile que ESCRIBIRÍA la app desde el panel    : 14 claves
SE PERDERÍAN: ['deload','foodlog','foodlogOk','painCare','tier','updatedAt']
```

Causa: `selfClientFromRow` (`avi-core.js:3210`) es una **lista blanca de 16 claves**; `clientToRow` copia el objeto tal cual; y `upsertOwn({profile})` **REEMPLAZA** la columna jsonb entera. Editarse desde el panel del coach le borraría el `deload`, los **2 días de comida registrada** y el **registro de dolor de codo del 17-ago**.

Asimetría fea: **«Mi entrenamiento» es seguro** (usa `rowToClient`, que preserva todo); el que pierde es el **panel del coach**. Es preexistente, no lo causó esta escritura, y es la misma familia de «puerta cerrada, ventana abierta». **Conclusión incómoda: en este caso la escritura directa por SQL fue la vía MÁS segura.**

*Propuesta (no aplicada):* que `selfClientFromRow` arrastre las claves desconocidas del perfil, o que `_persistCoachWrite` **fusione** en vez de reemplazar el `profile` del `_self`.

## 5. 🟢 Coherencia perfil ↔ plan: la escritura CERRÓ una contradicción viva

Con la ruta de producción (`nutWeightFor` = **92 kg** por fecha, no los 90 de la ficha):

| | `Ganar músculo` (antes) | `Perder grasa` (hoy) |
|---|---|---|
| status | **`desviado`** | **`ok`** |
| gap | **−850 kcal** | **0** |
| riesgo | `come_de_menos_para_subir` | — |
| proteína | 183 vs 183 (2,2 g/kg) | 183 vs 183 (2,2 g/kg) |

Titular 2.343 = macros 2.343 → **desfase 0**, la ficha del coach no pinta nada. **Tu afirmación se verifica exacta.** Y no solo no rompió nada: **antes del cambio su propia ficha le estaba marcando el plan en rojo** por 850 kcal.

⚠️ Detalle de medición que vale la pena: mi primera corrida dio **gap +31**, porque usé el peso de la ficha (90 kg). El 0 solo sale por la función **por fecha**, que es la de producción. El número correcto depende de correr la ruta real.

## 6. 🟡 Advisors: ningún `rls_disabled` — pero `apex_data` se sostiene en UN solo mecanismo

No hay ni un `rls_disabled`, así que el gotcha del template mentiroso no aplica hoy. Comprobé privilegios antes de acusar:

| tabla | anon/authenticated | RLS | policies |
|---|---|---|---|
| `apex_data_backups` | **sin grants** | on | 0 |
| `community_resolve_attempts` | **sin grants** | on | 0 |
| **`apex_data`** | **SELECT/INSERT/UPDATE/DELETE ✔** | on | 0 |

Sondeado como `anon`: el SELECT **no da error, devuelve 0 filas** — o sea que lo cierra la RLS, no el privilegio. Hoy está cerrada, pero **por un solo mecanismo**, con 18 filas reales / 424 kB dentro. Es el inverso exacto del gotcha documentado. *Propuesta (no aplicada):* `revoke all on public.apex_data from anon, authenticated;` para dejarla como su hermana.

Lo demás, sin acción: 13× `authenticated_security_definer_function_executable` (lint nuevo) — las 8 sensibles tienen `search_path=''` y están gateadas; **`fb_verify` sí valida moderador**, inline contra `community_moderators`, aunque no use el helper `_is_moderator` (mi proxy de detección se equivocó, leí el cuerpo). `cmty_my_secrets` devuelve lo propio del que llama, por diseño. `pg_net` en public y `auth_leaked_password_protection` (Pro-only) → ignorar, ya está decidido en CLAUDE.md. Performance: solo INFO/WARN preexistentes (FKs sin índice, `auth_rls_initplan`) — irrelevantes a 18-25 filas. **Nada de esto lo causó la escritura** (fue un PATCH de fila, sin DDL).

---

### Lo que haría a continuación
1. **Decirle al PO que recargue la app** en sus dispositivos (punto 3). Es lo único con ventana de tiempo.
2. Volver a leer `updated_at` después de que la abra, para confirmar que no revirtió.
3. Abrir tarea por el **punto 4** — que el coach se edite a sí mismo desde el panel le borra comida, descarga y dolor. Eso le puede pasar cualquier día sin que nadie escriba SQL.
