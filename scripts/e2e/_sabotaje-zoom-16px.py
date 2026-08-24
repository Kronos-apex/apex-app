# _sabotaje-zoom-16px.py — matriz de sabotaje del piso de 16px (v527).
#
# Cada sabotaje devuelve UN campo por debajo de 16px y exige que el harness se ponga ROJO.
# Los tres tocan una VÍA DISTINTA de darle tamaño a un campo, que es justo lo que el candado
# de v526 no sabía mirar: una regla de descendencia, un `style=` en línea, y una clase.
#
# Reglas que este runner respeta (aprendidas a golpes en el repo):
#   - se AFIRMA que el texto aparece exactamente 1 vez antes de sustituir; si no, grita
#     «NO SE APLICÓ» en vez de contarse como candado probado (v490/v524);
#   - el veredicto se lee del CÓDIGO DE SALIDA, jamás del mensaje impreso (v524);
#   - los archivos se restauran pase lo que pase.
#
# El CONTROL DE COBERTURA del harness no lleva sabotaje aquí porque ya mordió de verdad: en la
# primera corrida vio 94 campos donde el archivo tenía 96 y puso la corrida en rojo por su cuenta.
#
#   python scripts/e2e/_sabotaje-zoom-16px.py
import io, os, subprocess, sys

HARNESS = ['node', 'scripts/e2e/_repro-zoom-16px.mjs']

# (nombre, archivo, texto viejo, texto nuevo)
SABOTAJES = [
    ('S1 · el compositor del chat vuelve a 14px (regla de descendencia)',
     'styles.css',
     '.cchat-composer textarea{flex:1;resize:none;max-height:120px;border:1.5px solid var(--br);border-radius:20px;padding:9px 14px;font-size:16px;',
     '.cchat-composer textarea{flex:1;resize:none;max-height:120px;border:1.5px solid var(--br);border-radius:20px;padding:9px 14px;font-size:14px;'),

    ('S2 · el mensaje de aviso del coach vuelve a 13px (font-size en línea)',
     'index.html',
     'id="notif-msg" rows="3" placeholder="Escribe el mensaje aquí... usa {nombre} para personalizar" style="width:100%;padding:10px 12px;border-radius:var(--rsm);border:1.5px solid var(--br);font-family:inherit;font-size:16px;resize:vertical"',
     'id="notif-msg" rows="3" placeholder="Escribe el mensaje aquí... usa {nombre} para personalizar" style="width:100%;padding:10px 12px;border-radius:var(--rsm);border:1.5px solid var(--br);font-family:inherit;font-size:13px;resize:vertical"'),

    ('S3 · el chat del asesorado con su coach vuelve a 13px (por clase — lo que arregló v526)',
     'styles.css',
     '.mta{flex:1;padding:8px 12px;border:1.5px solid var(--br);border-radius:var(--rsm);font-family:inherit;font-size:16px;',
     '.mta{flex:1;padding:8px 12px;border:1.5px solid var(--br);border-radius:var(--rsm);font-family:inherit;font-size:13px;'),
]

ARCHIVOS = sorted({s[1] for s in SABOTAJES})
orig = {a: io.open(a, encoding='utf-8', newline='').read() for a in ARCHIVOS}
fallos = []


def correr():
    r = subprocess.run(HARNESS, capture_output=True, text=True, encoding='utf-8', errors='replace')
    return r.returncode


def restaurar():
    for a in ARCHIVOS:
        io.open(a, 'w', encoding='utf-8', newline='').write(orig[a])


print('  Control: el harness tiene que estar VERDE antes de sabotear nada.')
base = correr()
if base != 0:
    print(f'  NO SE PUEDE MEDIR: el harness ya sale en rojo (codigo {base}) sin sabotaje.')
    sys.exit(1)
print('  OK, verde (codigo 0).\n')

try:
    for nombre, arch, viejo, nuevo in SABOTAJES:
        n = orig[arch].count(viejo)
        if n != 1:
            print(f'  NO SE APLICO  {nombre}  -> el texto aparece {n} veces en {arch}, se esperaba 1')
            fallos.append(nombre + ' (no se aplico)')
            continue
        io.open(arch, 'w', encoding='utf-8', newline='').write(orig[arch].replace(viejo, nuevo))
        code = correr()
        restaurar()
        if code == 0:
            print(f'  VERDE (malo)  {nombre}  -> el harness NO lo caza')
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
