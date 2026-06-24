---
name: avi-generate
description: Genera rutina personalizada + plan nutricional para un asesorado leyendo su perfil directamente desde Supabase. Úsalo cuando el usuario diga "genera rutina para [nombre]", "crea plan para [nombre]", "asigna rutina a [nombre]", o cuando un asesorado nuevo no tiene rutina. Orquesta automáticamente el equipo correcto según sexo, objetivo, nivel y limitaciones físicas.
---

# avi-generate — Generador automático de rutina + nutrición

## Invocación
```
/avi-generate [nombre del asesorado]
```
El nombre puede ser parcial ("Miguel", "Kathe") — se busca el match más cercano en `ax_c`.

---

## PASO 1 — Leer perfil del asesorado desde Supabase

Ejecutar este script Python para obtener todos los clientes:

```python
import urllib.request, json, re

# Leer anon key desde index.html
with open('index.html', encoding='utf-8') as f:
    html = f.read()
anon_key = re.search(r"SB_KEY='([^']+)'", html).group(1)

url = "https://eoebhrxbokyllqalyecj.supabase.co/rest/v1/apex_data?key=eq.ax_c&select=value"
req = urllib.request.Request(url, headers={
    "apikey": anon_key,
    "Authorization": f"Bearer {anon_key}"
})
with urllib.request.urlopen(req) as r:
    clients = json.loads(json.loads(r.read())[0]['value'])

# Buscar cliente por nombre (case-insensitive, match parcial)
nombre_buscado = "[NOMBRE_DEL_ARGUMENTO]"
matches = [c for c in clients if nombre_buscado.lower() in c['name'].lower()]
if not matches:
    print("❌ Cliente no encontrado.")
else:
    cliente = matches[0]
    print(json.dumps(cliente, indent=2, ensure_ascii=False))
```

Extraer del perfil del cliente:
- `name` — nombre completo
- `sex` — 'Hombre' | 'Mujer' | 'Otro'
- `age` — número o null
- `goal` — objetivo declarado
- `level` — 'Principiante' | 'Intermedio' | 'Avanzado'
- `days` — número de días por semana
- `activity` — nivel de actividad (para TDEE)
- `weight` — peso en kg (para TDEE)
- `notes` — ⚠️ buscar palabras clave de limitación: rodilla, hombro, columna, cadera, tobillo, operado, cirugía, dolor, hernia, lesión

---

## PASO 2 — Routing automático por perfil

Aplicar esta lógica en orden estricto:

```
¿notes menciona limitación física?
    SÍ → Activar protocolo Laura PRIMERO (ver Paso 3)
    NO → Saltar al Paso 4 directamente

¿sex == 'Mujer'?
    SÍ → Valery diseña la rutina

¿sex == 'Hombre' AND goal contiene 'músculo' o 'masa' o 'hipertrofia' o 'bulk'?
    AND level IN ['Intermedio', 'Avanzado']?
        SÍ → Andrés Hyp diseña la rutina
    AND level == 'Principiante'?
        SÍ → Coach Pro diseña la rutina

¿sex == 'Hombre' AND goal contiene 'grasa' o 'perder' o 'recomposición' o 'definir'?
    SÍ → Coach Pro diseña la rutina

¿age < 16?
    SÍ → Coach Pro diseña (sin carga axial, Full Body, máx 3 días)
```

| Perfil | Diseña rutina | Nutrición |
|---|---|---|
| Mujer (cualquier objetivo) | Valery | Andrés Hyp |
| Hombre · ganar músculo · Inter/Avanzado | Andrés Hyp | Andrés Hyp |
| Hombre · ganar músculo · Principiante | Coach Pro | Andrés Hyp |
| Hombre · perder grasa / recomposición | Coach Pro | Andrés Hyp |
| Menor de 16 | Coach Pro | — (no prescribir sin médico) |
| Cualquiera con limitación física | Laura → agente correspondiente | Andrés Hyp + terapéutico |

---

## PASO 3 — Protocolo Laura (solo si hay limitación física)

Si el perfil tiene limitación:

1. Presentar al equipo el intake clínico del asesorado con toda la info disponible en `notes`
2. Laura emite veredicto por zona afectada (ver `.claude/agents/laura-physio.md`)
3. Laura entrega lista de:
   - Ejercicios ❌ CONTRAINDICADOS (no incluir bajo ninguna circunstancia)
   - Ejercicios 🟡 MODIFICAR (incluir con parámetros específicos)
   - Cardio seguro recomendado
   - Criterios de carga (rango ROM, % peso corporal, dolor máximo tolerable)
4. Con el veredicto de Laura, continuar al Paso 4 con las restricciones ya aplicadas

---

## PASO 4 — Generación de rutina

### Reglas universales de diseño (aplicar siempre)

**Orden dentro de cada sesión:** Compuesto → Funcional → Aislamiento → Cardio/Core

**restSec por tipo de ejercicio:**
- Compuesto pesado (sentadilla, peso muerto, press banca, remo): 90-120s
- Funcional / semi-compuesto: 75-90s
- Aislamiento: 60s

**Volumen por nivel:**
| Nivel | Series | Reps (hipertrofia) | Días |
|---|---|---|---|
| Principiante | 2-3 | 12-15 | 3 |
| Intermedio | 3-4 | 8-12 | 4 |
| Avanzado | 4-5 | 6-12 | 5 |

**Splits recomendados por días:**
- 3 días → Full Body (Lu/Mi/Vi)
- 4 días → Upper/Lower o Push/Pull adaptado
- 5 días → PPL + día especializado

### Catálogo de ejercicios válidos por músculo

Solo usar IDs de esta lista — extraídos directamente de `defaultExercises` en `index.html`. IDs fuera de esta lista no existen y rompen la rutina.

**Pecho:**
e1 Press de Banca · e2 Press Inclinado Mancuernas · e3 Aperturas con Cable · e71 Press de Banca con Mancuernas · e83 Lagartijas (Push-up) · e84 Press en Máquina Hammer · e85 Aperturas en Polea Alta · e86 Aperturas en Polea Baja · e77 Flexiones en Pared · e78 Flexiones en Rodillas

**Espalda:**
e4 Dominadas · e5 Remo con Barra · e6 Jalón al Pecho · e24 Pullover en Polea · e25 Remo en Polea a una Mano · e26 Jalón al Pecho Agarre Amplio · e27 Jalón al Pecho Agarre Neutro · e28 Jalón al Pecho Agarre Cerrado · e34 Peso Muerto Convencional · e50 Buenos Días con Barra · e51 Remo Gironda en Polea · e52 Remo con Mancuerna a una Mano · e82 Superman · fb01 Remo Australiano

**Hombros:**
e7 Press Militar con Barra · e8 Elevaciones Laterales · e21 Face Pull en Polea · e22 Press Militar con Mancuerna · e23 Press Militar en Máquina · e53 Elevaciones Frontales · e54 Pájaro / Elevaciones Posteriores

**Bíceps:**
e9 Curl con Barra · e10 Curl Martillo · e29 Curl Bíceps con Mancuerna · e55 Curl en Polea Baja · e56 Curl Scott / Predicador

**Tríceps:**
e11 Extensión en Polea Alta · e12 Skull Crushers · e19 Fondos en Paralelas · e30 Extensión de Tríceps Trasnuca · e31 Extensión a una Mano en Polea · e32 Fondos Gironda · e57 Press Francés con Mancuernas · e79 Fondos en Banco

**Piernas — Cuádriceps:**
e13 Sentadilla con Barra · e33 Sentadilla en Smith · e35 Desplantes / Zancada · e36 Prensa de Pierna · e37 Extensión de Cuádriceps en Máquina · e40 Zancada Búlgara · e41 Step-up con Mancuernas · e58 Sentadilla Hack · e70 Sentadilla Goblet · e80 Sentadilla de Peso Corporal · e93 Sentadilla con Banda de Resistencia

**Piernas — Femoral / Isquios:**
e14 Peso Muerto Rumano · e15 Curl Femoral Tumbado · e38 Curl Femoral Acostado en Máquina · e39 Curl Femoral de Pie en Máquina · e95 Peso Muerto Rumano a Una Pierna · fb04 Peso Muerto Rumano Mancuernas

**Glúteo:**
e42 Hip Thrust con Barra · e43 Hip Thrust en Máquina · e44 Patada de Glúteo en Polea · e45 Abducción de Cadera en Máquina · e46 Peso Muerto Piernas Rígidas · e60 Aducción de Cadera en Máquina · e61 Sentadilla Sumo · e68 Peso Muerto Sumo · e73 Puente de Glúteo · e87 Patada Lateral en Polea · e88 Patada en Polea Rodilla Doblada · e89 Clamshell con Banda · e90 Fire Hydrant · e91 Frog Pump · e92 Hip Thrust Unilateral · e94 Abducción de Cadera de Pie con Banda · e96 Kickback con Banda

**Gemelos:**
e16 Elevación de Talones de Pie · e59 Elevación de Talones Sentado

**Core:**
e17 Plancha Frontal · e18 Crunch Abdominal · e47 Rueda Abdominal (Ab Wheel) · e48 Elevación de Piernas Colgado · e49 Plancha Lateral · e62 Russian Twist · e63 Hollow Body · e72 Dead Bug · e81 Mountain Climbers

**Cardio / Funcional:**
e20 Carrera / Caminata · e64 Bicicleta Estática · e65 Remo Ergómetro · e66 Salto a la Cuerda · e67 Elíptica · e74 HIIT / Intervalos · e75 Burpees · e76 Saltos de Tijera · e69 Clean & Press ⚠️ solo Avanzado · fb02 Swing Mancuerna · fb03 Thruster

### Formato OBLIGATORIO de cada ejercicio en la rutina

```json
{
  "id": "e41",
  "name": "Hip Thrust con Barra",
  "muscle": "Glúteo",
  "type": "Compuesto",
  "sets": 4,
  "reps": 10,
  "icon": "🍑",
  "desc": "Descripción técnica breve del movimiento"
}
```

⚠️ **Crítico:**
- `reps` SIEMPRE es un **número entero**, jamás string ("10" → error, 10 → correcto)
- `sets` SIEMPRE es un número entero
- `id` debe existir en el catálogo de arriba
- No inventar IDs — si el ejercicio no está en el catálogo, elegir el más cercano que sí esté

### Formato OBLIGATORIO de cada rutina

```json
{
  "id": "ru_[clientePrefix][random4]",
  "name": "Nombre descriptivo del día",
  "day": "Lunes",
  "restSec": 90,
  "note": "Indicación breve para el asesorado",
  "why": "Justificación del enfoque de esta sesión",
  "exercises": []
}
```

- `id`: prefijo de 2 letras del nombre del cliente + 4 caracteres aleatorios (ej: "mi7k2pxq" para Miguel)
- `day`: nombre del día en español con mayúscula inicial

---

## PASO 5 — Plan nutricional (Andrés Hyp)

Calcular TDEE con Mifflin-St Jeor:

```
TMB (Hombre) = (10 × kg) + (6.25 × cm) + (5 × edad) + 5
TMB (Mujer)  = (10 × kg) + (6.25 × cm) − (5 × edad) − 161

Factor de actividad:
  Sedentario           → × 1.2
  Ligeramente activo   → × 1.375
  Moderadamente        → × 1.55
  Muy activo           → × 1.725
  Extremadamente       → × 1.9

Si no hay datos de talla (cm): asumir 170cm hombre / 160cm mujer
```

**Ajuste por objetivo:**
| Objetivo | Ajuste kcal | Proteína | Carbos | Grasa |
|---|---|---|---|---|
| Ganar músculo (bulk limpio) | TDEE + 200-300 | 2.0g/kg | rellenar | 0.8-1g/kg |
| Recomposición | TDEE | 2.0-2.2g/kg | rellenar | 0.8g/kg |
| Perder grasa | TDEE − 300-500 | 2.2g/kg | rellenar | 0.7g/kg |

Verificar: `prot×4 + carbs×4 + fat×9` debe sumar dentro de ±50 kcal del target.

**Si hay limitación en articulación de carga:** agregar en `note`:
> "Tomar 15g de colágeno hidrolizado + 200mg Vitamina C, 30-60 min antes del entrenamiento de [zona]. Favorece síntesis de cartílago y tendón."

Formato de salida para `ax_nut`:
```json
{
  "kcal": 2800,
  "prot": 165,
  "carbs": 320,
  "fat": 75,
  "water": 10,
  "meals": "4",
  "plan": "Descripción del enfoque nutricional",
  "avoid": "Alimentos o hábitos a evitar",
  "note": "Notas especiales (colágeno, suplementos, etc.)",
  "examples": "Ejemplo de distribución de comidas",
  "updatedAt": "[ISO timestamp actual]"
}
```

---

## PASO 6 — Validación antes de escribir

Antes de tocar Supabase, verificar:

- [ ] Todos los `reps` son números enteros (no strings)
- [ ] Todos los `sets` son números enteros
- [ ] Todos los `id` de ejercicios existen en el catálogo del Paso 4
- [ ] Cada rutina tiene al menos 4 ejercicios
- [ ] El número de rutinas coincide con `days` del cliente
- [ ] `prot×4 + carbs×4 + fat×9` suma dentro de ±50 kcal del target
- [ ] No hay ejercicios ❌ de Laura incluidos (si aplica)
- [ ] Los IDs de rutinas son únicos entre sí

Si algún check falla: corregir antes de continuar.

---

## PASO 7 — Escribir en Supabase (REPLACE TOTAL)

⚠️ Confirmar con Andrés que la app no está abierta en ningún dispositivo del asesorado antes de ejecutar.

```python
import urllib.request, json, re

with open('index.html', encoding='utf-8') as f:
    html = f.read()
anon_key = re.search(r"SB_KEY='([^']+)'", html).group(1)
sb_url = "https://eoebhrxbokyllqalyecj.supabase.co"

# 1. Leer ax_c actual
url = f"{sb_url}/rest/v1/apex_data?key=eq.ax_c&select=value"
req = urllib.request.Request(url, headers={"apikey": anon_key, "Authorization": f"Bearer {anon_key}"})
with urllib.request.urlopen(req) as r:
    clients = json.loads(json.loads(r.read())[0]['value'])

# 2. Reemplazar routines del cliente específico
client_id = "[ID_DEL_CLIENTE]"
for i, c in enumerate(clients):
    if c['id'] == client_id:
        clients[i]['routines'] = [RUTINAS_GENERADAS]
        break

# 3. Escribir ax_c completo de vuelta
payload = json.dumps({"key": "ax_c", "value": json.dumps(clients)}).encode()
req = urllib.request.Request(
    f"{sb_url}/rest/v1/apex_data?key=eq.ax_c",
    data=payload,
    method="PATCH",
    headers={
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
)
urllib.request.urlopen(req)
print("✅ Rutinas guardadas")

# 4. Escribir ax_nut (si se generó plan nutricional)
nut_read = urllib.request.Request(
    f"{sb_url}/rest/v1/apex_data?key=eq.ax_nut&select=value",
    headers={"apikey": anon_key, "Authorization": f"Bearer {anon_key}"}
)
with urllib.request.urlopen(nut_read) as r:
    nutrition = json.loads(json.loads(r.read())[0]['value'])

nutrition[client_id] = {PLAN_NUTRICIONAL}
payload = json.dumps({"key": "ax_nut", "value": json.dumps(nutrition)}).encode()
req = urllib.request.Request(
    f"{sb_url}/rest/v1/apex_data?key=eq.ax_nut",
    data=payload,
    method="PATCH",
    headers={
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
)
urllib.request.urlopen(req)
print("✅ Nutrición guardada")
```

---

## PASO 8 — Verificación post-escritura

Volver a leer `ax_c` de Supabase y confirmar que:
- Las rutinas nuevas están presentes
- El número de rutinas es correcto
- No hay rutinas viejas mezcladas

```python
# Leer y confirmar
with urllib.request.urlopen(urllib.request.Request(
    f"{sb_url}/rest/v1/apex_data?key=eq.ax_c&select=value",
    headers={"apikey": anon_key, "Authorization": f"Bearer {anon_key}"}
)) as r:
    clients_check = json.loads(json.loads(r.read())[0]['value'])
    cliente_check = next(c for c in clients_check if c['id'] == client_id)
    print(f"Rutinas en Supabase: {len(cliente_check['routines'])}")
    for rt in cliente_check['routines']:
        print(f"  - {rt['name']} ({rt['day']}) — {len(rt['exercises'])} ejercicios")
```

---

## PASO 9 — Confirmación final

Presentar a Andrés:

```
✅ avi-generate completado — [Nombre del asesorado]

Agentes activos:
  [Laura si aplicó] — veredicto fisioterapéutico ✅
  [Valery / Coach Pro / Andrés Hyp] — rutina diseñada ✅
  Andrés Hyp — nutrición calculada ✅

Rutinas generadas ([N] días):
  [Día]: [Nombre] — [X] ejercicios
  ...

Plan nutricional:
  [X] kcal · [P]g prot · [C]g carbs · [F]g grasa
  [Nota especial si hay]

✅ Supabase actualizado — [N] rutinas en ax_c, nutrición en ax_nut

⚠️ Pedir al asesorado que abra la app para que sincronice los cambios.

¿Quieres que le envíe un mensaje a [nombre] explicando su nuevo plan?
```

---

## Errores comunes y solución

| Error | Causa | Solución |
|---|---|---|
| `reps` no renderiza | reps como string (`"10"`) | Asegurar `reps: 10` (int) |
| Rutina no aparece en la app | Sync sobrescribió Supabase | Pedirle al asesorado que abra y cierre la app |
| Ejercicio ID no encontrado | ID inventado o fuera de catálogo | Reemplazar con ID válido del catálogo del Paso 4 |
| `ax_nut` vacío | Cliente nuevo sin entrada en nutrition | Crear la entrada nueva en el dict antes de hacer PATCH |
| anon_key no encontrada | Regex falló en index.html | Buscar manualmente: `grep -o "SB_KEY='[^']*'" index.html` |
