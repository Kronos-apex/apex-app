# AUTORIZACIÓN / CONSENTIMIENTO + AVISO DE PRIVACIDAD — AVI

> **BORRADOR — pendiente de revisión legal.** Para mostrar en el registro de la app.

## A. Texto del checkbox de registro (consentimiento general)
*(Casilla NO pre-marcada. El usuario debe marcarla activamente.)*

> ☐ He leído y acepto los **[Términos y Condiciones]** y la **[Política de Tratamiento de
> Datos Personales]**, y **autorizo** a AVI a tratar mis datos personales para crear mi
> cuenta, generar y guardar mis rutinas y mi progreso, según las finalidades allí descritas.

## B. Consentimiento explícito para datos sensibles (salud/fitness)
*(Segunda casilla, separada, también NO pre-marcada. Solo si el usuario va a registrar peso,
medidas, lesiones o fotos.)*

> ☐ **Autorizo de forma expresa** el tratamiento de mis **datos de salud y estado físico**
> (peso, medidas, edad, sexo, lesiones y fotos de progreso) con la finalidad de personalizar
> mis rutinas y seguir mi evolución. Entiendo que esta autorización es **voluntaria** y que
> puedo **revocarla** y solicitar eliminar mis datos en cualquier momento.

## C. Edad — DOS caminos, no uno (corregido 2026-09-02, v565)

*(Tercera casilla. La app enseña **una sola** de las dos, decidida por la edad que la
persona acaba de declarar en el paso anterior. Nunca las dos a la vez: ofrecer ambas
sería pedirle a un menor que elija si miente.)*

### C.1 · Si declara 18 años o más

> ☐ Declaro que soy **mayor de 18 años**.

### C.2 · Si declara menos de 18 — autorización del representante legal

> ☐ Soy **menor de 18 años** y **mi papá, mamá o acudiente** conoce esta autorización y está
> de acuerdo con que yo entrene y con que se guarden mis datos.
>
> **Nombre del acudiente:** ____________________  ·  **Teléfono (opcional):** ____________

**Por qué existe esta sección.** Hasta el 2026-09-02 la app solo tenía C.1 y era
**obligatoria**: un menor no tenía más salida que declarar algo falso, y esa declaración
quedaba archivada como prueba de que había autorizado siendo adulto. Medido en producción
ese día: **dos personas menores de edad** tenían `adulto:true` guardado. El régimen de la
Ley 1581/2012 para menores es reforzado y esa evidencia no lo cumplía.

**Lo que la app garantiza por construcción** (no depende de que el formulario acierte):
la función que emite la evidencia **no puede firmar `adulto:true` con una edad de menor**,
y sin el nombre del acudiente **no emite nada** — una autorización de representante sin
representante identificable no es una autorización.

**Lo que la app NO puede garantizar, y por eso se avisa:** que el acudiente exista y esté
de acuerdo lo declara el menor, no el acudiente. Por eso el coach recibe un aviso con el
nombre y el teléfono, y **le corresponde a él hablar con el acudiente antes de que la
persona empiece a entrenar**. La app lo dice así, sin fingir una verificación que no hace.

⚠️ **Pendiente de abogado:** si esta declaración indirecta basta, o si hace falta que el
acudiente firme por un canal propio (correo o WhatsApp al número registrado).

## D. Aviso de Privacidad (versión corta — para mostrar al inicio o enlazar)

> **Tu privacidad en AVI.** Recolectamos tu nombre, correo y los datos de tu entrenamiento
> (incluidos datos de salud como peso, medidas y fotos, que son sensibles) **solo para darte
> el servicio**: crear tu cuenta, armar tus rutinas y guardar tu progreso. **No vendemos tus
> datos.** Puedes ver, corregir o **eliminar tus datos** cuando quieras. Tus datos se guardan
> en servidores seguros (Supabase) que pueden estar fuera de Colombia.
>
> Responsable: [NOMBRE] · Contacto: [CORREO]. Lee la [Política de Tratamiento de Datos] completa.

## E. Notas de implementación (para las Fases 1-2)
- Guardar **evidencia del consentimiento**: fecha, hora y versión de la política aceptada
  (campo en el registro del usuario). Esto es la "prueba de autorización" que exige la ley.
- Las tres casillas deben poder marcarse por separado; no usar una sola casilla "acepto todo".
- Incluir enlaces reales a los documentos publicados (no solo texto).
- **La evidencia guarda la EDAD con la que se autorizó** (`edad`): el perfil se puede editar
  después, y sin ese dato nadie podría saber con qué edad se dio la autorización.
- **Ambas rutas de alta capturan consentimiento** (corregido 2026-09-02): la de la persona
  que se registra sola **y la del coach**, que hasta entonces no capturaba nada — medido el
  2026-09-02, de **24 personas reales solo 5 tenían autorización guardada, y las 5 venían
  del auto-registro**. En la ruta del coach la evidencia queda marcada `por:'coach'`,
  porque la recogió él en persona.
