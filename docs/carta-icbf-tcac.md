# Carta al ICBF — condiciones de uso de la TCAC 2018

> **Para qué es:** desbloquear F1b del registro de alimentos (estipulación **E14** de Fable). Sin
> respuesta escrita del ICBF no se ingiere la tabla. El plazo que corre es de **3 semanas** desde
> el envío; si no contestan, el PO decide entre citar la fuente como obra oficial o irse al plan B
> (USDA FoodData Central, dominio público, perdiendo las preparaciones típicas colombianas).

## A dónde enviarla

| | |
|---|---|
| **Correo** | **atencionalciudadano@icbf.gov.co** |
| **Alternativa (deja radicado)** | Formulario PQRS: https://www.icbf.gov.co/servicios/solicitudes-pqrds |
| **Asunto** | Solicitud de información pública — condiciones de reúso de la Tabla de Composición de Alimentos Colombianos (TCAC 2018) |

**Recomendación: manda el correo Y radica el formulario.** El formulario entrega **número de
radicado**, que es lo que sirve para hacer seguimiento y lo que cuenta si hay que insistir.
Guarda ese número.

**Por qué está redactada como «solicitud de acceso a información pública»:** encuadrada así, bajo
la Ley 1712 de 2014, la entidad tiene un plazo legal para responder (y la Ley 1755 de 2015 regula
el derecho de petición). Una consulta informal se puede quedar sin contestar para siempre; esta no.

## Antes de enviar — rellena esto
- `[NOMBRE COMPLETO]` y `[NÚMERO DE CÉDULA]` (obligatorio para radicar)
- Confirma que el correo de contacto es el que quieres usar
- El resto va tal cual

---

## Texto de la carta (copiar desde aquí)

Señores
**INSTITUTO COLOMBIANO DE BIENESTAR FAMILIAR — ICBF**
Grupo de Atención al Ciudadano
Ciudad

**Asunto:** Solicitud de acceso a información pública — condiciones de reúso de la Tabla de Composición de Alimentos Colombianos (TCAC 2018)

Respetados señores:

[NOMBRE COMPLETO], mayor de edad, identificado con cédula de ciudadanía No. [NÚMERO DE CÉDULA], entrenador personal independiente con domicilio en Guaduas (Cundinamarca), actuando en nombre propio y en ejercicio del derecho de petición y de acceso a la información pública consagrado en el artículo 23 de la Constitución Política, la Ley 1712 de 2014 y la Ley 1755 de 2015, me permito formular la siguiente solicitud.

**Contexto**

Desarrollo una aplicación móvil de entrenamiento personal y acompañamiento nutricional dirigida a mis asesorados. La aplicación incluye un módulo en el que la persona registra los alimentos que consume y la aplicación calcula sus aportes nutricionales.

Para que ese cálculo refleje la alimentación real de la población colombiana —incluidas nuestras preparaciones típicas—, la fuente idónea es la **Tabla de Composición de Alimentos Colombianos (TCAC), versión 2018**, publicada por el ICBF. Considero importante utilizar la fuente oficial colombiana y no tablas extranjeras que no recogen nuestros alimentos ni nuestras preparaciones.

**Peticiones concretas**

1. Indicar **bajo qué condiciones puede reutilizarse el contenido de la TCAC 2018** (nombres de alimentos y sus valores de composición nutricional) dentro de una aplicación digital, incluyendo el caso de una aplicación de carácter comercial o que se ofrezca mediante suscripción.

2. Informar si la TCAC 2018 se encuentra amparada por alguna **licencia de datos abiertos** o si su contenido puede considerarse de libre reutilización con la debida atribución, en los términos de la política de datos abiertos del Estado colombiano.

3. Señalar la **forma correcta de citar** la tabla y al ICBF como fuente dentro de la aplicación, para darles el crédito que corresponde.

4. Informar si la TCAC 2018 está disponible en algún **formato de datos estructurado** (por ejemplo CSV, Excel o servicio de datos), adicional al documento PDF publicado en el portal, y en caso afirmativo indicar cómo obtenerlo.

5. En caso de que el uso descrito requiera una **autorización expresa, convenio o trámite** ante el ICBF, indicar cuál es el procedimiento y ante qué dependencia debe adelantarse.

**Fundamento**

La solicitud recae sobre información pública producida por una entidad estatal y publicada en su portal institucional. No se solicita información reservada ni datos personales de ninguna naturaleza.

**Notificaciones**

Solicito que la respuesta sea remitida al correo electrónico: **[CORREO]**
Teléfono de contacto: **[TELÉFONO]**
Dirección: Guaduas, Cundinamarca.

Agradezco de antemano su atención y quedo atento a su respuesta dentro de los términos de ley.

Cordialmente,

**[NOMBRE COMPLETO]**
C.C. [NÚMERO DE CÉDULA]
Entrenador personal independiente

---

## Cuando llegue la respuesta

| Respuesta | Qué se hace |
|---|---|
| Autoriza / es datos abiertos | Arranca **F1b**: ingesta de los 773 alimentos por `scripts/build-foods.mjs`, con la muestra de ≥15 verificada contra el PDF (E7). |
| Da la tabla en CSV/Excel | Ahorra la parte más costosa: se salta la extracción del PDF. |
| Exige convenio o niega | **Plan B**: USDA FoodData Central (dominio público). Se pierden sancocho, tamal y las preparaciones típicas — el buscador queda notoriamente peor para Colombia, y hay que decírselo al PO antes de ejecutarlo. |
| No responde en 3 semanas | Decisión del PO (E14): publicar citando la fuente como obra oficial, asumiendo el riesgo documentado, o irse al plan B. |

*Escrita el 2026-08-05 · canal verificado ese día en el portal del ICBF.*
