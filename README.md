# AVI — Entrenamiento con nombre propio

[![CI](https://github.com/Kronos-apex/apex-app/actions/workflows/ci.yml/badge.svg)](https://github.com/Kronos-apex/apex-app/actions/workflows/ci.yml)

Plataforma de entrenamiento personal en formato **PWA instalable**, para un entrenador y sus
asesorados. El coach arma rutinas, planes de nutrición y seguimiento; cada asesorado entrena desde
su celular, **con o sin conexión**, y su progreso se sincroniza cuando vuelve la red.

**En producción:** <https://kronos-apex.github.io/apex-app/> · Sitio de venta: <https://avientrena.com>

> *English summary at the bottom.*

---

## Qué la hace distinta por dentro

| | |
|---|---|
| **Sin construcción** | Vanilla JS. No hay npm, ni empaquetador, ni transpilador en producción. Se abre el `index.html` y funciona. |
| **Sin dependencias en el cliente** | Ni una librería de JS. Las gráficas son SVG dibujado a mano; los lienzos compartibles son Canvas. |
| **Offline-first de verdad** | `localStorage` es la fuente de verdad del dispositivo y Supabase el punto de encuentro. Entrenar nunca depende de la red. |
| **Motor separado de la pantalla** | `avi-core.js` son funciones **puras** (generador de rutinas, nutrición, progresión de carga, filtros de lesión). Se prueban sin navegador. |
| **Móvil primero, estricto** | Mínimo 360 px, objetivos táctiles ≥ 36 px, tema claro y oscuro con tokens, y un ajuste de tamaño de texto que llega a todas las superficies. |

---

## Mapa del repositorio

```
index.html            la app (marcado, tokens de diseño y arranque)
avi-core.js           MOTOR PURO — sin DOM, sin red. Todo lo que se puede probar solo.
app-1-infra.js        persistencia, sincronización con la nube, iconos
app-2-login.js        autenticación, registro y arranque
app-3-coach.js        panel del entrenador (6 paneles)
app-4-entreno.js      entrenamiento en vivo, historial, imágenes compartibles
app-5-salud.js        nutrición, medidas, fotos de progreso, hábitos
app-6-extra.js        instalación de la PWA, novedades, ayuda
app-7-community.js    comunidad (congelada por decisión de producto)
styles.css            sistema de diseño (tokens, 3 bloques :root)
sw.js                 service worker ESTÁTICO (nunca blob)

avi.test.js           suite de negocio — corre con `node`, sin framework
scripts/hooks/        audit de 12 controles que corre en CADA commit
scripts/e2e/          harnesses de navegador (CDP) y matrices de sabotaje
supabase/             migraciones SQL y funciones de borde (Deno)
docs/                 bitácora de versiones, planes vivos y dictámenes
legal/                política de tratamiento de datos y consentimientos
```

---

## Datos y seguridad

- **Postgres (Supabase)** con una fila por persona en `user_data` y el dato de dominio en columnas
  `jsonb` (perfil, rutinas, historial, récords, peso, medidas, nutrición, fotos, mensajes).
- **RLS en todas las tablas**, por dueño: `auth.uid() = user_id OR auth.uid() = coach_id`. Las
  tablas sensibles llevan permisos **por columna**, no por tabla.
- **Las funciones de borde exigen identidad real** (JWT del usuario o un secreto que vive en la
  base), nunca una llave pública.
- **Ningún secreto en el repositorio.** Las credenciales de prueba y la llave de servicio viven
  fuera, en `~/.avi/`. Un control del pre-commit lo bloquea.
- **Respaldo doble y probado:** `pg_cron` diario dentro de la base + exportación diaria fuera de
  Supabase. El procedimiento de restauración está **ejecutado**, no solo escrito
  (`docs/runbook-restore.md`).
- **Datos de menores:** el consentimiento del acudiente es un campo propio y verificable; ningún
  dato de un menor sale a una superficie pública, y el porcentaje de grasa corporal no sale de su
  pantalla ni con permiso.

---

## Cómo se corre

```bash
# la app (cualquier servidor estático)
python -m http.server 8080      # → http://localhost:8080

# la suite de negocio (no necesita nada instalado)
node avi.test.js

# el audit completo: los 12 controles que corren antes de cada commit
python scripts/hooks/pre-commit

# un harness de navegador (necesitan Chrome y `ws`)
node scripts/e2e/_verify-compartir-sesion.mjs
```

El hook vive en el repositorio: al clonar, `git config core.hooksPath scripts/hooks`.

---

## Cómo se prueba (la parte inusual)

Cuatro capas, y cada una existe porque algo se escapó de la anterior:

1. **Suite de negocio** — **1.226 pruebas** sobre las funciones puras. Corre en `node` sin
   framework y **tres veces en cada commit**: en el huso local, en UTC y sobre un árbol
   normalizado a LF, porque dos defectos reales solo aparecían en uno de los tres.
2. **Audit estático** — **12 controles** antes de cada commit: sintaxis de los 11 módulos,
   funciones duplicadas, identificadores del DOM que el JS busca y no existen, manejadores sin
   función, escapado de HTML en cada campo que teclea una persona, secretos, y que la versión del
   `index.html` y la del service worker vayan juntas.
3. **Harnesses de navegador** — **126**, sobre Chrome real por CDP. No hacen capturas: **afirman**.
   Cada uno lleva sus propios *controles de montaje y de cobertura*, porque una sonda que mide
   sobre una pantalla apagada sale verde sobre nada.
4. **Matrices de sabotaje** — **66**. Rompen el código a propósito, una línea a la vez, y exigen
   que la suite se ponga **roja**. Un candado que no muerde no es un candado: así se han
   encontrado docenas de pruebas que pasaban por casualidad.

Nada se da por terminado sin verificarlo **en producción**: cada despliegue corre
`node scripts/e2e/_prodcheck.mjs <versión>`, que arranca la app contra la URL real y comprueba la
versión servida, que el arranque llegue al final y que no haya ni un error de JavaScript.

---

## Cómo se despliega

1. Si cambió JS o CSS, subir **el par**: `?v=NNN` en `index.html` **y** `CACHE_NAME` en `sw.js`
   (un control del hook lo exige: si van desparejos, la caché sirve una mezcla de dos versiones).
2. `git commit` → el hook corre los 12 controles y **bloquea** si algo falla.
3. `git push origin main` → GitHub Pages publica.
4. `curl` a la versión servida **y** `node scripts/e2e/_prodcheck.mjs NNN`. Sin esos dos, no se
   dice que está en producción.

---

## Documentación

- **`docs/bitacora.md`** — historial completo por versión: qué se cambió, **qué se midió antes** y
  qué enseñó. Es el documento más útil del repositorio.
- **`CLAUDE.md`** — contexto vivo y doctrina de trabajo, incluida una sección larga de lecciones
  que no expiran (cada una con el defecto real que la originó).
- **`docs/plan-*.md`** — planes vivos de los frentes en curso.
- **`legal/`** — política de tratamiento de datos y textos de consentimiento.

---

## Estado

Versión en producción: **v624** (septiembre de 2026). En uso diario con asesorados reales.

Producto y decisiones: **Andrés Martínez**, entrenador personal — Guaduas, Cundinamarca, Colombia.

---

## English summary

**AVI** is an installable PWA for personal training: one coach, many trainees. Routine builder,
nutrition planning, live workout tracking, body measurements and progress photos — all
**offline-first**, syncing to Supabase when the network comes back.

Deliberately **no build step and no client-side dependencies**: plain JavaScript, hand-drawn SVG
charts, a static service worker. Domain logic lives in `avi-core.js` as **pure functions** and is
tested without a browser.

Testing is the unusual part: **1,226 business tests** (run three times per commit — local timezone,
UTC, and LF-normalised), a **12-check static audit** enforced by a pre-commit hook, **126 asserting
browser harnesses** driven over CDP, and **66 sabotage matrices** that mutate the source and require
the suite to turn red. Every deploy is verified against the live URL before it is called done.

Data lives in Postgres with **row-level security on every table**, column-level grants on the
sensitive ones, and edge functions that verify a real JWT. No secrets in the repository. Backups
run in two independent layers and the restore procedure has been executed, not just written.

---

© 2026 Andrés Martínez. Todos los derechos reservados. Ver [LICENSE](LICENSE).
