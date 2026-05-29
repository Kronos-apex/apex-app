---
name: apex-audit
description: Auditoría profunda completa de APEX. Úsalo cuando el usuario diga "audita APEX", "corre el audit", "verifica que todo funciona", o después de cualquier cambio importante. Ejecuta los 7 checks de calidad y devuelve un reporte con ✅/❌.
---

# APEX Audit — Auditoría profunda automatizada

Este skill ejecuta la suite completa de auditoría sobre `index.html` en 7 pasos. Devuelve un reporte limpio para confirmar que APEX está listo para producción.

## Cuándo activar este skill

- "Corre el audit de APEX"
- "Verifica que todo está bien"
- "Audita el código"
- "¿Hay errores?"
- Después de cualquier cambio importante por Camila

## Procedimiento

Ejecuta este script Python completo. NO simplifiques los checks — corre los 7.
IMPORTANTE: usa siempre `encoding='utf-8'` y el path de temp correcto para Windows.

```bash
python3 << 'EOF'
import re, subprocess, os, tempfile
from collections import Counter

c = open('index.html', encoding='utf-8').read()
js = c[c.find('<script>')+8:c.find('</script>', c.find('<script>'))]
html = c[:c.find('<script>')]

# apex-core.js — lógica de negocio pura cargada vía <script src>. Es código
# ejecutable, así que el audit la cubre igual que el JS inline.
core_js = open('apex-core.js', encoding='utf-8').read() if os.path.exists('apex-core.js') else ''

print("APEX - AUDITORIA AUTOMATICA\n")

# ━━━ CHECK 1: Sintaxis JS (inline + apex-core.js, sin truncar) ━━━
tmp = os.path.join(tempfile.gettempdir(), 'apex_audit.js')
with open(tmp, 'w', encoding='utf-8') as f: f.write(js)
syntax_ok = True
checks = [('inline', tmp)] + ([('apex-core.js', 'apex-core.js')] if core_js else [])
for label, path in checks:
    r = subprocess.run(['node','--check', path], capture_output=True, text=True)
    if r.returncode != 0:
        syntax_ok = False
        print(f"  ERR 1. Sintaxis JS ({label}): {r.stderr.strip()[:200]}")
print(f"  {'OK' if syntax_ok else 'ERR'} 1. Sintaxis JS ({len(js)//1000}K inline + {len(core_js)//1000}K core auditados)")

# ━━━ CHECK 2: Funciones duplicadas (inline + apex-core.js) ━━━
# Detecta duplicados dentro de un archivo Y entre archivos.
fns = re.findall(r'function (\w+)\(', js) + re.findall(r'function (\w+)\(', core_js)
dupes = {k:v for k,v in Counter(fns).items() if v>1}
print(f"  {'OK' if not dupes else 'ERR'} 2. Funciones duplicadas: {len(dupes)}")
if dupes:
    for fn, count in dupes.items():
        print(f"     - {fn}: {count} veces")

# ━━━ CHECK 3: IDs JS sin HTML ━━━
get_ids = set(re.findall(r"getElementById\('([^']+)'\)", js))
declared = set(re.findall(r'id="([^"]+)"', html))
missing_static = [i for i in get_ids if i not in declared and '${' not in i]
real_missing = [i for i in missing_static if f'"{i}"' not in c and f"'{i}'" not in c]
print(f"  {'OK' if not real_missing else 'ERR'} 3. IDs rotos: {len(real_missing)}")
if real_missing:
    for i in real_missing[:5]: print(f"     - {i}")

# ━━━ CHECK 4: Handlers onclick sin función ━━━
handlers = set(re.findall(r'on(?:click|input|change)="(\w+)\(', c))
ignore = {'cm','om','event','close'}
missing_h = [f for f in handlers if f'function {f}(' not in js and f not in ignore]
print(f"  {'OK' if not missing_h else 'ERR'} 4. Handlers sin funcion: {len(missing_h)}")
if missing_h:
    for h in missing_h: print(f"     - {h}")

# ━━━ CHECK 5: SB_KEYS — lógica real, sin límite de caracteres ━━━
# syncFromCloud puede usar SB_KEYS.includes() (loop dinámico) o referenciar cada key.
# Ambas formas son válidas. Se audita la función COMPLETA sin truncar.
sb_match = re.search(r'SB_KEYS=\[([^\]]+)\]', js)
sb_keys = [k.strip().strip("'") for k in sb_match.group(1).split(',')] if sb_match else []
ax_data_keys = [k for k in sb_keys if k not in ['ax_ce','ax_cp','ax_cn','ax_rem']]

sync_start = js.find('async function syncFromCloud')
if sync_start > -1:
    # Extraer función completa contando llaves (sin límite de chars)
    depth, i, sync_fn = 0, sync_start, ''
    for idx in range(sync_start, len(js)):
        if js[idx] == '{': depth += 1
        elif js[idx] == '}':
            depth -= 1
            if depth == 0:
                sync_fn = js[sync_start:idx+1]
                break
    # Forma 1: loop dinámico con SB_KEYS.includes — cubre TODAS las keys
    uses_dynamic = 'SB_KEYS.includes' in sync_fn or 'SB_KEYS' in sync_fn
    # Forma 2: recarga explícita de DB tras sync (ld('ax_c') etc.)
    not_reloaded = [k for k in ax_data_keys if k not in sync_fn] if not uses_dynamic else []
    sb_ok = uses_dynamic or not not_reloaded
    method = 'loop dinamico SB_KEYS' if uses_dynamic else 'keys explicitas'
    print(f"  {'OK' if sb_ok else 'ERR'} 5. SB_KEYS sync ({method}): {len(ax_data_keys)}/{len(ax_data_keys) if sb_ok else len(ax_data_keys)-len(not_reloaded)}")
    if not sb_ok:
        for k in not_reloaded: print(f"     - {k} no referenciada en syncFromCloud")
else:
    sb_ok = False
    print(f"  ERR 5. syncFromCloud no encontrada")

# ━━━ CHECK 6: Ejercicios duplicados ━━━
ex_ids = re.findall(r"id:'(e\d+)'", js)
ex_dupes = {k:v for k,v in Counter(ex_ids).items() if v>1}
print(f"  {'OK' if not ex_dupes else 'ERR'} 6. Ejercicios duplicados: {len(ex_dupes)}")
print(f"     Total: {len(ex_ids)} ({len(set(ex_ids))} unicos)")

# ━━━ CHECK 7: Objetos globales de la app usados pero no definidos ━━━
# Detecta el patrón MS.getStatus() cuando MS nunca fue definido (bug crítico real).
# Técnica: elimina comentarios JS primero, luego busca OBJETO.minúscula para
# evitar falsos positivos de strings ("APEX...") o comentarios ("// SW.show").
js_no_comments = re.sub(r'//[^\n]*', '', js)
defined_consts = set(re.findall(r'(?:const|let|var)\s+([A-Z][A-Z0-9_]{1,})\s*=', js))
ok_globals = {
    'Math','Date','Object','Array','JSON','Promise','URL','Blob',
    'AbortController','FileReader','TextEncoder','RegExp','Error',
    'TypeError','Symbol','Notification','Deno',
}
app_objs_used = set(re.findall(r'\b([A-Z][A-Z]{1,})\.[a-z]', js_no_comments))
undefined_objs = [o for o in app_objs_used
                  if o not in defined_consts and o not in ok_globals]
objs_ok = not undefined_objs
print(f"  {'OK' if objs_ok else 'ERR'} 7. Objetos globales indefinidos: {len(undefined_objs)}")
if undefined_objs:
    for o in undefined_objs:
        idx = js_no_comments.find(o + '.')
        ctx = js_no_comments[max(0,idx-30):idx+60].replace('\n',' ')
        print(f"     - {o}: ...{ctx}...")

# ━━━ RESUMEN ━━━
total_checks = 7
passed = sum([syntax_ok, not dupes, not real_missing, not missing_h, sb_ok, not ex_dupes, objs_ok])
status = "PRODUCCION OK" if passed == total_checks else ("ATENCION" if passed >= 5 else "NO DESPLEGAR")
print(f"\nResultado: {passed}/{total_checks} - {status}")
print(f"Lineas: {c.count(chr(10)):,} | Funciones: {len(set(fns))} | Tamano: {len(c)/1024:.1f} KB")
EOF
```

## Cómo interpretar el resultado

- **🟢 PRODUCCIÓN OK (7/7)** — Listo para deploy. Push a main.
- **🟡 ATENCIÓN (5-6/7)** — Hay algo. Revisa los ❌ antes de deploy.
- **🔴 NO DESPLEGAR (0-4/7)** — Bug crítico. Llamar a Camila inmediatamente.

## Después del reporte

Si hay errores, **NO los arregles tú**. Reporta al miembro del equipo correspondiente:
- Sintaxis / duplicados → Camila
- IDs rotos / handlers → Camila
- SB_KEYS → Andrés DBA
- Ejercicios duplicados → Camila
- Objetos globales indefinidos → Camila (bug crítico — detiene renderAll)

El skill solo audita. La corrección la hace quien corresponda.
