# _sabotaje-arranque.py — matriz de sabotaje del gate del arranque (v534).
#
# 🔴 POR QUÉ EXISTE ESTA MATRIZ: la auditoría de código del 24-ago encontró que
# `_verify-arranque-modulos.mjs` —el gate que existe para que nadie se quede mirando una pantalla
# pegada en su Android— **aprobaba exactamente ese caso**. Su criterio era «`#s-login` existe y no
# está display:none», y `#s-login` es marcado ESTÁTICO que vive DEBAJO del splash
# (`position:fixed;z-index:9999`). Bloqueando `app-2-login.js` imprimía OK con `cargaFuera:false`
# en su propia línea de salida: el dato que lo delataba, medido y descartado.
#
# Un gate que no puede fallar no es un gate. Esta matriz es la prueba de que ahora sí.
#
#   python scripts/e2e/_sabotaje-arranque.py
import io, os, subprocess, sys

GATE = ['node', 'scripts/e2e/_verify-arranque-modulos.mjs']

# (nombre, [(archivo, viejo, nuevo), ...], espera)  ·  espera: 'rojo' (muerde) | 'verde' (documentado)
SABOTAJES = [
    ('S1 · sin red de última instancia: el splash se queda congelado para siempre',
     [('index.html', "    if (!o) return;                       // el arranque terminó y ya lo quitó: nada que hacer",
       "    if (!o) return; return;")],
     'rojo'),

    ('S2 · la red quita el splash pero no pinta NADA (pantalla muerta en vez de congelada)',
     [('index.html', "    d.id = 'avi-bootfail';   // el gate lo busca por id: «pantalla honesta» no es «cualquier DIV»",
       "    d.id = 'avi-bootfail'; return;")],
     'rojo'),

    ('S3 · el aviso honesto pierde su id (el gate no puede distinguirlo de una capa muda)',
     [('index.html', "    d.id = 'avi-bootfail';   // el gate lo busca por id: «pantalla honesta» no es «cualquier DIV»",
       "    d.id = 'otra-cosa';")],
     'rojo'),

    # 🎓 EL COMBINADO, que es el que demuestra dónde estaba el agujero (patrón S2b de v485).
    # Con la red puesta, revertir el criterio del gate NO cambia nada — la app arranca bien y los
    # dos criterios la aprueban. El agujero solo se ve cuando la app ESTÁ rota: quitando la red Y
    # el criterio nuevo, el gate vuelve a imprimir OK sobre un splash congelado. Ese VERDE es la
    # prueba del defecto original, no un fallo de la matriz: por eso se espera verde y se anota.
    ('S4 · COMBINADO — sin red y con el criterio VIEJO, el gate vuelve a aprobar el splash congelado',
     [('index.html', "    if (!o) return;                       // el arranque terminó y ya lo quitó: nada que hacer",
       "    if (!o) return; return;"),
      ('scripts/e2e/_verify-arranque-modulos.mjs',
       "    ok = !!(estado && estado.cargaFuera && estado.alcanzable && fatales.length === 0\n            && (degradado || (estado.login && estado.loginVivo && (!exigeInitPWA || estado.initPWA))));",
       "    ok = !!(estado && estado.login && (!exigeInitPWA || estado.initPWA) && fatales.length === 0);")],
     'verde'),
]

ARCHIVOS = sorted({a for _, eds, _ in SABOTAJES for a, _, _ in eds})
orig = {a: io.open(a, encoding='utf-8', newline='').read() for a in ARCHIVOS}
fallos = []


def correr():
    return subprocess.run(GATE, capture_output=True, text=True, encoding='utf-8', errors='replace').returncode


def restaurar():
    for a in ARCHIVOS:
        io.open(a, 'w', encoding='utf-8', newline='').write(orig[a])


print('  Control: el gate tiene que estar VERDE antes de sabotear nada.')
base = correr()
if base != 0:
    print(f'  NO SE PUEDE MEDIR: el gate ya sale en rojo (codigo {base}) sin sabotaje.')
    sys.exit(1)
print('  OK, verde (codigo 0).\n')

try:
    for nombre, edits, espera in SABOTAJES:
        aplicados, roto = {}, False
        for arch, viejo, nuevo in edits:
            texto, nue, n = viejo, nuevo, orig[arch].count(viejo)
            if n != 1:
                alt = viejo.replace('\n', '\r\n')
                if orig[arch].count(alt) == 1:
                    texto, nue, n = alt, nuevo.replace('\n', '\r\n'), 1
            if n != 1:
                print(f'  NO SE APLICO  {nombre}  -> el texto aparece {n} veces en {arch}, se esperaba 1')
                fallos.append(nombre + ' (no se aplico)')
                roto = True
                break
            aplicados[arch] = aplicados.get(arch, orig[arch]).replace(texto, nue)
        if roto:
            restaurar()
            continue
        for arch, contenido in aplicados.items():
            io.open(arch, 'w', encoding='utf-8', newline='').write(contenido)
        code = correr()
        restaurar()
        real = 'verde' if code == 0 else 'rojo'
        if real == espera:
            marca = 'MUERDE      ' if espera == 'rojo' else 'VERDE (esperado)'
            print(f'  {marca}  {nombre}  -> codigo {code}')
        else:
            print(f'  INESPERADO    {nombre}  -> se esperaba {espera} y salio {real} (codigo {code})')
            fallos.append(nombre)
finally:
    restaurar()

print()
if fallos:
    print(f'  {len(fallos)} de {len(SABOTAJES)} sabotajes NO se comportan como se espera:')
    for f in fallos:
        print('    - ' + f)
    sys.exit(1)
print(f'  {len(SABOTAJES)} de {len(SABOTAJES)} se comportan como se espera '
      f'({sum(1 for _,_,e in SABOTAJES if e=="rojo")} muerden · '
      f'{sum(1 for _,_,e in SABOTAJES if e=="verde")} verde documentado).')
