# _sabotaje-dia1.py — matriz de sabotaje de la puerta del día 1 (v531).
#
# Hallazgo H1 de la auditoría de experiencia: el plan cae de lunes a viernes, así que quien se
# registra sábado, domingo o festivo —el 43 % de los días— abría la app y su PRIMERA pantalla era
# «hoy es tu día de descanso». Le pasó a Chema el 22-ago con plan de pago y cero sesiones.
#
# Cada sabotaje rompe una pieza y exige que algo se ponga ROJO. La columna «capa» dice quién lo
# caza: el motor lo cubre la suite, la pantalla el harness (lección v520: un verde explicado con
# «lo cubre la otra capa» hay que EJECUTARLO en la otra capa).
#
#   python scripts/e2e/_sabotaje-dia1.py
import io, os, subprocess, sys

SUITE = ['node', 'avi.test.js']
HARNESS = ['node', 'scripts/e2e/_verify-firstrun.mjs']

SABOTAJES = [
    ('S1 · vuelve el banner de descanso como primera pantalla del día 1', HARNESS, 'app-4-entreno.js',
     "    if(typeof renderFirstRun==='function' && renderFirstRun(client, null, {festivo:_festivoHoy})){\n      con.innerHTML='';\n      return;\n    }\n",
     ""),

    ('S2 · la portada de espera se pinta pero el banner queda APILADO debajo', HARNESS, 'app-4-entreno.js',
     "      con.innerHTML='';\n      return;",
     "      return;"),

    ('S3 · la portada no dice CUÁNDO empieza', HARNESS, 'app-4-entreno.js',
     "' Tu primer entreno es <b>'+esc(cuando)+'</b>.</p>'+",
     "'</p>'+"),

    ('S4 · nextPlanDay cuenta HOY como próximo día (promete un entreno que no hay)', SUITE, 'avi-core.js',
     "  for (let i = 1; i <= NEXT_PLAN_WINDOW_DAYS; i++) {",
     "  for (let i = 0; i <= NEXT_PLAN_WINDOW_DAYS; i++) {"),

    ('S5 · nextPlanDay deja de saltar los festivos', SUITE, 'avi-core.js',
     "    if (esFestivoCO(d)) continue;",
     ""),

    ('S6 · la ventana vuelve a 7 días (el festivo deja a la persona sin respuesta)', SUITE, 'avi-core.js',
     "const NEXT_PLAN_WINDOW_DAYS = 14;",
     "const NEXT_PLAN_WINDOW_DAYS = 7;"),
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
