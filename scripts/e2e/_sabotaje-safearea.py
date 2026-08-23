# _sabotaje-safearea.py — matriz de sabotaje del lote «Volver bajo el área segura» (v526).
#
# Cada sabotaje revierte UNA pieza del arreglo y exige que el harness se ponga ROJO.
# Reglas que este runner respeta (aprendidas a golpes en el repo):
#   - se AFIRMA que el texto aparece exactamente 1 vez antes de sustituir; si no, grita
#     «NO SE APLICÓ» en vez de contarse como candado probado (v490/v524);
#   - el veredicto se lee del CÓDIGO DE SALIDA, jamás del mensaje impreso (v524);
#   - el archivo se restaura pase lo que pase.
#
#   python scripts/e2e/_sabotaje-safearea.py
import io, os, subprocess, sys

CSS = 'styles.css'
HARNESS = ['node', 'scripts/e2e/_repro-safearea-volver.mjs']

SABOTAJES = [
    ('S1 · la barra de las habitaciones vuelve a ignorar el área segura',
     'padding:13px 16px;padding-top:max(13px,env(safe-area-inset-top));',
     'padding:13px 16px;'),

    ('S2 · «Volver» pierde su área pulsable ampliada',
     ".sroom-back::after{content:'';position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);height:44px}",
     ".sroom-back::after{content:'';position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);height:1px}"),

    ('S3 · el nav del panel del coach vuelve a ignorar el área segura',
     '  padding-top:max(16px,env(safe-area-inset-top));\n',
     ''),
]

orig = io.open(CSS, encoding='utf-8', newline='').read()
fallos = []

def correr():
    r = subprocess.run(HARNESS, capture_output=True, text=True, encoding='utf-8', errors='replace')
    return r.returncode

print('  Control: el harness tiene que estar VERDE antes de sabotear nada.')
base = correr()
if base != 0:
    print(f'  NO SE PUEDE MEDIR: el harness ya sale en rojo (codigo {base}) sin sabotaje.')
    sys.exit(1)
print('  OK, verde (codigo 0).\n')

try:
    for nombre, viejo, nuevo in SABOTAJES:
        n = orig.count(viejo)
        if n != 1:
            print(f'  NO SE APLICO  {nombre}  -> el texto aparece {n} veces, se esperaba 1')
            fallos.append(nombre + ' (no se aplico)')
            continue
        io.open(CSS, 'w', encoding='utf-8', newline='').write(orig.replace(viejo, nuevo))
        code = correr()
        io.open(CSS, 'w', encoding='utf-8', newline='').write(orig)
        if code == 0:
            print(f'  VERDE (malo)  {nombre}  -> el harness NO lo caza')
            fallos.append(nombre)
        else:
            print(f'  MUERDE        {nombre}  -> codigo {code}')
finally:
    io.open(CSS, 'w', encoding='utf-8', newline='').write(orig)

print()
if fallos:
    print(f'  {len(fallos)} de {len(SABOTAJES)} sabotajes NO muerden:')
    for f in fallos:
        print('    - ' + f)
    sys.exit(1)
print(f'  {len(SABOTAJES)} de {len(SABOTAJES)} sabotajes muerden.')
