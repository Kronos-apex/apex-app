# _sabotaje-gracia.py — matriz de sabotaje del período de gracia (v528).
#
# Cada sabotaje rompe UNA pieza y exige que algo se ponga ROJO. La columna «capa» dice QUIÉN
# tiene que cazarlo: el motor lo cubre la suite, la pantalla la cubre el harness. Un sabotaje
# que solo caza «la otra capa» hay que EJECUTARLO en la otra capa y dejar anotado cuál lo caza
# — si no, es exactamente el gate que se aprende a ignorar (lección de v520).
#
# Reglas que respeta este runner (aprendidas a golpes en el repo):
#   - se AFIRMA que el texto aparece exactamente 1 vez antes de sustituir; si no, grita
#     «NO SE APLICÓ» en vez de contarse como candado probado (v490/v524);
#   - el veredicto se lee del CÓDIGO DE SALIDA, jamás del mensaje impreso (v524);
#   - los archivos se restauran pase lo que pase.
#
#   python scripts/e2e/_sabotaje-gracia.py
import io, os, subprocess, sys

SUITE = ['node', 'avi.test.js']
HARNESS = ['node', 'scripts/e2e/_verify-gracia.mjs']

# (nombre, capa, archivo, viejo, nuevo)
SABOTAJES = [
    ('S1 · la gracia no deja entrar (vuelve el bloqueo del mismo día)', SUITE, 'avi-core.js',
     "return s === 'active' || s === 'expiring' || s === 'pending' || s === 'grace';",
     "return s === 'active' || s === 'expiring' || s === 'pending';"),

    ('S2 · la gracia no tiene FIN (nadie vuelve a quedar bloqueado nunca)', SUITE, 'avi-core.js',
     "    if (daysLeft < -MS_GRACE_DAYS) return 'overdue';\n    if (daysLeft < 0) return 'grace';",
     "    if (daysLeft < 0) return 'grace';"),

    ('S3 · el que está en gracia DESAPARECE de la lista de atención del coach', SUITE, 'avi-core.js',
     "  if (st === 'grace')    return { tier: 1, sev: MS.daysOverdue(c, nowTs), reason: 'grace', label: '\U0001f7e0 Por renovar' };",
     ""),

    ('S4 · la banda existe pero no se pinta (la gracia se vuelve un muro mudo)', HARNESS, 'app-4-entreno.js',
     "  if(typeof renderGraceBand==='function')renderGraceBand(client);",
     ""),

    ('S5 · la banda se pinta DEBAJO de los `return` (desaparece en día de descanso)', HARNESS, 'app-4-entreno.js',
     "  if(typeof renderGraceBand==='function')renderGraceBand(client);\n  if(!_dia1 && typeof renderPushNudge==='function')renderPushNudge();",
     "  if(!_dia1 && typeof renderPushNudge==='function')renderPushNudge();"),

    ('S6 · la banda no dice cuántos días quedan (deja de ser un margen)', HARNESS, 'app-4-entreno.js',
     "  const margen = quedan<=0 ? 'Hoy es el último día que puedes entrenar con este plan.'",
     "  const margen = quedan>=0 ? ''"),
]

ARCHIVOS = sorted({s[2] for s in SABOTAJES})
orig = {a: io.open(a, encoding='utf-8', newline='').read() for a in ARCHIVOS}
fallos = []


def correr(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    return r.returncode


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
        # Los finales de linea de este repo NO son estables: se prueban las dos formas.
        texto, n = viejo, orig[arch].count(viejo)
        if n != 1:
            alt = viejo.replace('\n', '\r\n')
            if orig[arch].count(alt) == 1:
                texto, n = alt, 1
                nuevo = nuevo.replace('\n', '\r\n')
        if n != 1:
            print(f'  NO SE APLICO  {nombre}  -> el texto aparece {n} veces en {arch}, se esperaba 1')
            fallos.append(nombre + ' (no se aplico)')
            continue
        io.open(arch, 'w', encoding='utf-8', newline='').write(orig[arch].replace(texto, nuevo))
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
