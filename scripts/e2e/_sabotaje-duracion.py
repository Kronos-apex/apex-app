# _sabotaje-duracion.py — matriz de sabotaje de la duración honesta (v533).
#
# Dos áreas de la auditoría lo midieron por separado: la app prometía «~43 min» y «te toma menos de
# una hora», y la sesión real dura 56,4 de mediana con el 45 % pasando de la hora.
#
# 🔴 La conclusión que costó medirla: **el número se arregla, la FRASE no**. Contra 172 sesiones
# emparejadas con su rutina, «menos de una hora» se incumplía en el 48 %; con la constante
# recalibrada, 43 %; con margen, 40 %; y calibrando por persona el error mediano sigue en 13,4 min.
# Por eso los sabotajes protegen las dos cosas: la constante Y que la frase no vuelva.
#
#   python scripts/e2e/_sabotaje-duracion.py
import io, os, subprocess, sys

SUITE = ['node', 'avi.test.js']
HARNESS = ['node', 'scripts/e2e/_verify-firstrun.mjs']

SABOTAJES = [
    ('S1 · vuelve la promesa «menos de una hora» al héroe', SUITE, 'app-4-entreno.js',
     "    .concat(m.mins?['~'+m.mins+' min']:[]).join(' · ');       // sin estimación fiable no se inventa",
     "    .concat(m.mins?['~'+m.mins+' min']:[]).concat(['te toma menos de una hora']).join(' · ');"),

    ('S2 · `underHour` vuelve a decir que sí', SUITE, 'avi-core.js',
     "    underHour: false,",
     "    underHour: mins != null && mins < 60,"),

    ('S3 · el ritmo propio deja de llegar al héroe (vuelve el promedio de todos)', SUITE, 'avi-core.js',
     "  const mins = estimateWorkoutMinutes(routine, { secsPerSet: opts.secsPerSet });",
     "  const mins = estimateWorkoutMinutes(routine);"),

    ('S4 · el motor le suma el descanso AL ritmo propio (que ya lo incluye)', SUITE, 'avi-core.js',
     "  const porSerie = (isFinite(sps) && sps > 0) ? sps : (SET_WORK_SECONDS + rest);",
     "  const porSerie = (isFinite(sps) && sps > 0) ? (sps + rest) : (SET_WORK_SECONDS + rest);"),

    ('S5 · `personalSecsPerSet` se fía de UNA sola sesión', SUITE, 'avi-core.js',
     "  if (vals.length < SECS_PER_SET_MIN_SESSIONS) return null;",
     ""),

    ('S6 · `personalSecsPerSet` cuenta la app olvidada abierta (sesiones de horas)', SUITE, 'avi-core.js',
     "    if (!isFinite(dur) || dur < 300 || dur > 10800) return;   // ni un toque suelto ni la app olvidada abierta",
     "    if (!isFinite(dur)) return;"),

    ('S7 · la portada del día 1 deja de pintar el número del motor', HARNESS, 'app-4-entreno.js',
     "  const mins=(typeof estimateWorkoutMinutes==='function')?estimateWorkoutMinutes(routine,{secsPerSet:_secsPerSetDe(client)}):null;",
     "  const mins=99;"),
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
