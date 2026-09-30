# R17 · Lo construido del 28 al 30-sep (v681 → v692) — veredicto consolidado (30-sep)

Dos áreas: **A1** entrar y abrir (`A1-entrar.md`, completa) y **A2** datos, servidor y repo (`A2-datos.md`: el agente
respondió Q1-Q3 y se cortó por el límite de uso; Q4-Q6 las midió el orquestador). Cada hallazgo de abajo lo comprobó el
orquestador en el código o en la base antes de escribirlo aquí.

## Veredicto en una frase
Lo nuevo funciona y no pierde datos; lo que falla es **avisar**: una sesión que el servidor cerró deja a la persona
adentro sin decírselo, y dos números del entreno (el 1RM «con barra» y el aviso de salto) dicen o guardan menos de lo que
parece. Y al repo público todavía le quedaban un teléfono y 4 identificadores de cuenta reales.

## Los hallazgos que quedan en pie (medidos)

### 🟡 1. Una sesión cerrada desde el servidor deja a la persona adentro, sin aviso (A1 Q1)
- **Qué pasa:** al cambiar una contraseña (o borrar la cuenta, o cerrar sesión en otro aparato) el servidor revoca las
  sesiones. Si el teléfono tenía el token aún vivo, o la red está colgada, lenta o ausente, la app entra «como sin red» con
  la copia local — y cuando la red vuelve y la librería borra la sesión, **nadie se entera**: `AUTH.onChange`
  (`app-1-infra.js:593`) no lo llama ningún módulo (comprobado: 0 llamadas), y `_enterAuthSession` (`app-3-coach.js:743`)
  trata «la nube no me reconoce» igual que «no hay red».
- **Lo que ve la persona:** registra su peso y ve «⚖️ Peso registrado»; la subida falla con «Sin sesión» solo en la
  consola. **No se pierde** (queda en la copia local con la bandera de pendiente y se fusiona al volver a entrar, por
  lectura de código), pero **el coach no lo ve** hasta que ella cierre, abra y entre de nuevo. Con red buena y token
  vencido ve el login en 1,5 s, sin una frase que le diga por qué.
- **Hoy:** las 6 personas a las que se cambió la contraseña el 30-sep (13:15-13:18 hora Colombia) tienen 0 sesiones y no
  han subido nada desde entonces; sus tokens ya vencieron, así que con red verán el login. Solo quien tuviera la app
  abierta desde antes del cambio puede estar en esa zona. Mitigación de hoy: pedirles que cierren y abran la app.

### 🟡 2. «≈ N kg · 1RM est. con barra» puede inflar el récord de principiantes (A2 Q2)
- La línea suma la barra del catálogo (20 kg por defecto) a lo anotado: **16 récords de 11 personas** que movieron menos
  de 20 kg muestran un 1RM **2,6 a 3,2 veces** lo anotado. Es cierto si usaron una barra olímpica, falso si fue una barra
  liviana o una mancuerna. El más sospechoso: Clean & Press (`e69`), 7 de 7 personas por debajo de 13 kg.
- Además el 1RM de TODOS los récords se recalcula con la barra MÁS RECIENTE, no con la del día del récord.
- Nadie confirmó nunca «sin barra» en un ejercicio de barra olímpica. **Decisión del PO con Coach Pro.**

### 🟡 3. Datos reales en el repo público (A2 Q5)
- **1 teléfono real** (de una asesorada adulta) y **4 uid de cuentas reales, 2 de ellas de menores**, en informes viejos
  de `docs/`. v690 no buscaba teléfonos ni uid. Correos reales: 0 de 28; nombres reales de asesorados: 0.
- La historia del menor de 15 años sigue contada con su seudónimo (261 menciones): alguien del gimnasio podría
  reconocerlo. El arreglo de fondo es el repo privado (decidido, pendiente del pago).

### 🟡 4. El aviso de salto solo guarda el «sí» (A2 Q3)
- El «sí» sí llega a la nube (`saveSessionToHistory` copia `corte`). Pero «lo corrijo» y «no lo vio» se borran con el día
  (`_wipeSessionFlags` `app-4-entreno.js:2304`): la curva de noviembre no sabrá qué saltos se preguntaron. Desde el 29-sep
  hubo 1 salto (de 55 comparaciones posibles) y no lo contestaron con «sí». **Decisión de Coach Pro / PO.**

### 🟢 5. Menores, sin víctima
- **Tres ajustes del catálogo nunca corren al arrancar en el teléfono del asesorado** desde el 22-jun: `migrateExTypes`,
  `migrateEnv` y `healExerciseEnv` se llaman en `syncFromCloud` (`app-1-infra.js:1757-1761`) antes de que exista app-4
  (comprobado: sin `await` entre el comienzo de `syncFromCloud` y esas llamadas; los scripts cargan en orden). El
  `try/catch` lo esconde. Antes de hacerlas correr hay que medir qué cambiarían.
- **`reg.update()` sin `.catch`** (`app-6-extra.js:95`): los «Failed to update a ServiceWorker» son ruido de red flaca
  desde el 1-sep (11 de 41 filas de `app_errors`), no teléfonos atascados ni culpa de v687.
- **Borrada por el coach o suspendida**: la copia de salud completa queda en el teléfono de la persona y no se le dice
  nada; solo el auto-borrado la limpia. Es su propio dato en su propio teléfono: **pregunta para el abogado** (¿basta
  borrar del servidor?).
- **El festivo del 19 de marzo** quedó con el nombre de otro santo por el cambio de nombres de v690 (lo halló el
  orquestador; la fecha está bien).

## Lo que se TUMBÓ
- «v687 dejó teléfonos atascados en una versión vieja»: falso (A1 Q3). Los errores existen desde v563 y el intento se repite.
- «v690 cambió más código que se ejecuta»: falso fuera del festivo (A2 Q1).
- «El sí del aviso de salto se pierde»: falso; el camino existe y hubo un solo salto (A2 Q3).
- «Hay tarjetas públicas sin atar o atadas a quien ya no está»: 4 de 4 atadas a personas vivas (Q4).
- «La regla de contraseñas de v692 rechaza claves buenas»: 0 de 1.200 (Q6).

## Lo que está SANO (con números)
`_verify-arranque-modulos` 6/6 · el video y la foto del login cargan tras un cierre forzado · sin la librería del login va
al login en 1,5 s (no se queda en blanco) · cabeceras del SW equivalentes en las dos direcciones · lo desplegado =
el repo (`delete-account` v10, `coach-create-client` v6) · RLS de `avi_showcase_dueno` 0 / 4 con control.

## Orden recomendado
1. **Lote técnico** (sin decisión de producto): el aviso de sesión cerrada (1) · quitar el teléfono y los uid del repo y
   que el hook los bloquee (3) · `reg.update().catch` · el festivo · medir y luego activar las 3 migraciones (5).
2. **Decisiones del PO:** la barra del 1RM (2) · guardar también «lo corrijo» del aviso de salto (4).
3. **Para el abogado (3-oct):** la copia local de quien fue borrado por el coach (5).

## Qué NO se miró
- Ningún teléfono real (como en las 16 rondas anteriores).
- La cuenta del COACH con sesión revocada (mismo patrón por lectura, `app-3-coach.js:728-736, 1248-1253`; no se midió).
- La fusión al volver a entrar tras la «zona zombi» (`mergeAuthRow`): solo por código, porque ejercitarla escribe en producción.
- La mudanza `#avimv=` llevando una sesión revocada.
