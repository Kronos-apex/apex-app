# _sabotaje-consolidacion.py — matriz de sabotaje de la consolidación de carga (v529).
#
# Reporte del PO (24-ago): «¿cómo es posible que si hoy le pongo 40 en hack squat, a la siguiente
# sesión ya le quieras subir 5 kilos si ni siquiera se ha adaptado al peso que le acabo de poner?»
# La doble progresión de v482 subía con UNA serie buena. Ahora exige consolidar el peso en ≥2
# sesiones. Cada sabotaje devuelve una pieza y exige que la suite se ponga ROJA.
#
# Reglas que respeta este runner:
#   - se AFIRMA que el texto aparece exactamente 1 vez antes de sustituir; si no, grita
#     «NO SE APLICÓ» en vez de contarse como candado probado (v490/v524);
#   - el veredicto se lee del CÓDIGO DE SALIDA, jamás del mensaje impreso (v524);
#   - los finales de línea de este repo NO son estables: se prueban las dos formas;
#   - los archivos se restauran pase lo que pase.
#
#   python scripts/e2e/_sabotaje-consolidacion.py
import io, os, subprocess, sys

SUITE = ['node', 'avi.test.js']

SABOTAJES = [
    ('S1 · vuelve a subir con UNA sola sesión (el defecto que reportó el PO)', 'avi-core.js',
     "    if (ses < LOAD_CONSOLIDATE_SESSIONS) return kg;   // mismo peso: aún se está adaptando\n",
     ""),

    ('S2 · el default deja de ser el conservador (sin dato, dispara el peso)', 'avi-core.js',
     "    const ses = (opts && opts.sesionesEnPeso != null) ? (parseInt(opts.sesionesEnPeso) || 0) : 1;",
     "    const ses = (opts && opts.sesionesEnPeso != null) ? (parseInt(opts.sesionesEnPeso) || 0) : 99;"),

    ('S3 · el umbral baja a 1: consolidar deja de significar nada', 'avi-core.js',
     "const LOAD_CONSOLIDATE_SESSIONS = 2;",
     "const LOAD_CONSOLIDATE_SESSIONS = 1;"),

    ('S4 · `_suggestKg` deja de pasar el conteo (la app no subiría el peso NUNCA)', 'app-4-entreno.js',
     "    return suggestFromPR(pr,reps,{sesionesEnPeso:_ses});",
     "    return suggestFromPR(pr,reps);"),

    ('S5 · sessionsAtLoad cuenta SERIES en vez de días (dos series del mismo día ya consolidan)', 'avi-core.js',
     "        if (k >= peso && r >= objetivo) dias.add(dia);",
     "        if (k >= peso && r >= objetivo) dias.add(dia + Math.random());"),

    # El ancla lleva la línea de abajo a propósito: `if (!st || !st.done) return;` aparece DOS
    # veces en avi-core.js y el runner lo gritó («NO SE APLICÓ») en vez de contarlo como candado.
    ('S6 · sessionsAtLoad cuenta series NO hechas (anotar el peso valdría como levantarlo)', 'avi-core.js',
     "        if (!st || !st.done) return;\n        const k = parseFloat(st.kg), r = parseFloat(st.reps);",
     "        if (!st) return;\n        const k = parseFloat(st.kg), r = parseFloat(st.reps);"),
]

ARCHIVOS = sorted({s[1] for s in SABOTAJES})
orig = {a: io.open(a, encoding='utf-8', newline='').read() for a in ARCHIVOS}
fallos = []


def correr():
    r = subprocess.run(SUITE, capture_output=True, text=True, encoding='utf-8', errors='replace')
    return r.returncode


def restaurar():
    for a in ARCHIVOS:
        io.open(a, 'w', encoding='utf-8', newline='').write(orig[a])


print('  Control: la suite tiene que estar VERDE antes de sabotear nada.')
base = correr()
if base != 0:
    print(f'  NO SE PUEDE MEDIR: la suite ya sale en rojo (codigo {base}) sin sabotaje.')
    sys.exit(1)
print('  OK, verde (codigo 0).\n')

try:
    for nombre, arch, viejo, nuevo in SABOTAJES:
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
        code = correr()
        restaurar()
        if code == 0:
            print(f'  VERDE (malo)  {nombre}  -> la suite NO lo caza')
            fallos.append(nombre)
        else:
            print(f'  MUERDE        {nombre}  -> codigo {code}')
finally:
    restaurar()

print()
if fallos:
    print(f'  {len(fallos)} de {len(SABOTAJES)} sabotajes NO muerden:')
    for f in fallos:
        print('    - ' + f)
    sys.exit(1)
print(f'  {len(SABOTAJES)} de {len(SABOTAJES)} sabotajes muerden.')
