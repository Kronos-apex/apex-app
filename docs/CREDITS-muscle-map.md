# Créditos — Mapa muscular anatómico (`muscle-map.js`)

El mapa muscular anatómico de AVI (siluetas de frente y espalda con resaltado por
sub-región) deriva de los datos de:

**Body Muscles** — por Ivan Vulović
https://github.com/vulovix/body-muscles

## Licencia

Licenciado bajo **Apache License 2.0**.

```
Copyright 2024 Ivan Vulović

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

Este producto incluye software desarrollado por Ivan Vulović.

## Modificaciones de AVI

- Empaquetado para uso vanilla (sin framework), expuesto como `muscleMapSVG()`.
- Función de render con resaltado **primario** (color fuerte) y **secundario** (tenue)
  por ejercicio.
- Músculos añadidos por AVI: braquial y braquiorradial.
- Mapeo ejercicio→músculo en `exercise-muscles.js`, validado con criterio de coach.

La licencia Apache-2.0 exige conservar el aviso de copyright y esta nota de
atribución; ambos se mantienen en el header de `muscle-map.js` y en este archivo.
