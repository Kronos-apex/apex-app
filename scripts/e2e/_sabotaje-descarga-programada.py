# _sabotaje-descarga-programada.py — matriz de sabotaje de la descarga programada (v532).
#
# Pedido del PO (24-ago): «necesito poder programar las semanas de descarga a asesorados que según
# mi criterio la necesiten». El botón de v434 arrancaba HOY y duraba 7 días fijos.
#
# 🔴 El riesgo de esta feature NO está en la UI: AVI es offline-first y no hay cron, así que una
# descarga con fecha futura la aplica la primera app que se abra —la del coach o la del asesorado—
# y eso solo es seguro si `applyDueDeload` es idempotente. Los sabotajes atacan justo eso.
#
# Reglas del runner: se afirma que el texto aparece 1 vez antes de sustituir; el veredicto sale del
# CÓDIGO DE SALIDA; los finales de línea no son estables y se prueban las dos formas; se restaura
# pase lo que pase.
#
#   python scripts/e2e/_sabotaje-descarga-programada.py
import io, os, subprocess, sys

SUITE = ['node', 'avi.test.js']
HARNESS = ['node', 'scripts/e2e/_verify-deload.mjs']

SABOTAJES = [
    ('S1 · deja de ser idempotente: una descarga se aplica SOBRE otra', SUITE, 'avi-core.js',
     "  if (client.deload) return null;                 // ya hay una activa: jamás una descarga sobre otra",
     ""),

    ('S2 · aplica la descarga ANTES de la fecha programada', SUITE, 'avi-core.js',
     "  if (!st || !st.vencida) return null;            // todavía no le toca",
     "  if (!st) return null;"),

    ('S3 · cuenta desde HOY y no desde la fecha programada (abrir tarde alarga la descarga)', SUITE, 'avi-core.js',
     "  return startDeload(client, st.from, st.days);",
     "  return startDeload(client, now, st.days);"),

    ('S4 · la duración deja de acotarse (un dedo gordo deja a alguien medio año en descarga)', SUITE, 'avi-core.js',
     "  const dias = Math.max(DELOAD_MIN_DAYS, Math.min(DELOAD_MAX_DAYS, parseInt(days) || DELOAD_DAYS));\n  const d = desde ? new Date(desde) : null;",
     "  const dias = parseInt(days) || DELOAD_DAYS;\n  const d = desde ? new Date(desde) : null;"),

    ('S5 · el asesorado deja de aplicarla (no arranca hasta que el coach abra su app)', SUITE, 'app-4-entreno.js',
     "      const _dl=applyDueDeload(client,Date.now());",
     "      const _dl=null;"),

    ('S6 · `deloadPlan` deja de viajar en la vista del coach-como-asesorado', SUITE, 'avi-core.js',
     "    deloadPlan: p.deloadPlan || null,",
     ""),

    ('S7 · programar a futuro recorta el plan de una (deja de ser «programar»)', HARNESS, 'app-3-coach.js',
     "    const res=(typeof applyDueDeload==='function')?applyDueDeload(cl,hoy):null;",
     "    const res=(typeof startDeload==='function')?startDeload(cl,hoy,dias):null;"),

    ('S8 · la ficha no muestra que hay una descarga programada', HARNESS, 'app-3-coach.js',
     "  const pl=(typeof deloadPlanState==='function')?deloadPlanState(c,Date.now()):null;",
     "  const pl=null;"),

    ('S9 · «también para» deja de aplicar a los seleccionados', HARNESS, 'app-3-coach.js',
     "  const ids=[cid].concat([...document.querySelectorAll('.dlm-otro:checked')].map(x=>x.value));",
     "  const ids=[cid];"),
]

ARCHIVOS = sorted({s[2] for s in SABOTAJES})
orig = {a: io.open(a, encoding='utf-8', newline='').read() for a in ARCHIVOS}
fallos = []


def correr(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace').returncode


def restaurar():
    for a in ARCHIVOS:
        io.open(a, 'w', encoding='utf-8', newline='').write(orig[a])


print('  Control: las DOS capas tienen que estar VERDES antes de sabotear nada.')
b1, b2 = correr(SUITE), correr(HARNESS)
if b1 != 0 or b2 != 0:
    print(f'  NO SE PUEDE MEDIR: suite={b1} harness={b2} sin sabotaje.')
    sys.exit(1)
print('  OK, las dos en verde.\n')

try:
    for nombre, capa, arch, viejo, nuevo in SABOTAJES:
        texto, nue, n = viejo, nuevo, orig[arch].count(viejo)
        if n != 1:
            alt = viejo.replace('\n', '\r\n')
            if orig[arch].count(alt) == 1:
                texto, nue, n = alt, nuevo.replace('\n', '\r\n'), 1
        if n != 1:
            print(f'  NO SE APLICO  {nombre}  -> el texto aparece {n} veces en {arch}, se esperaba 1')
            fallos.append(nombre + ' (no se aplico)')
            continue
        io.open(arch, 'w', encoding='utf-8', newline='').write(orig[arch].replace(texto, nue))
        code = correr(capa)
        restaurar()
        cual = 'suite' if capa is SUITE else 'harness'
        if code == 0:
            print(f'  VERDE (malo)  {nombre}  -> el {cual} NO lo caza')
            fallos.append(nombre)
        else:
            print(f'  MUERDE        {nombre}  -> {cual}, codigo {code}')
finally:
    restaurar()

print()
if fallos:
    print(f'  {len(fallos)} de {len(SABOTAJES)} sabotajes NO muerden:')
    for f in fallos:
        print('    - ' + f)
    sys.exit(1)
print(f'  {len(SABOTAJES)} de {len(SABOTAJES)} sabotajes muerden.')
