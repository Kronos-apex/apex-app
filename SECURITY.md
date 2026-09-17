# Política de seguridad

AVI guarda **datos de salud de personas reales** —peso, medidas, lesiones declaradas, planes de
alimentación— y algunas de esas personas son **menores de edad** con autorización de su acudiente.
Un hallazgo de seguridad aquí no es un detalle técnico: se toma en serio y se agradece.

## Cómo reportar un hallazgo

**No abras un issue público ni un pull request describiendo el problema.**

Usa el reporte privado de vulnerabilidades de GitHub:
**Security → Report a vulnerability** en este repositorio. Llega solo a quien mantiene el proyecto.

Ayuda mucho incluir:

- qué dato queda expuesto o qué acción puede hacer alguien que no debería;
- los pasos mínimos para reproducirlo (una petición `curl` basta y es preferible a un video);
- si lo probaste contra producción, **contra qué cuenta** — hay cuentas de prueba para eso y no hay
  ninguna razón para tocar la fila de un asesorado real.

Respuesta esperada: **72 horas** para confirmar que se recibió. Los hallazgos que expongan datos de
un tercero o de un menor se atienden antes que cualquier otro trabajo en curso.

## Por favor, NO

- probar con datos de personas reales: no las toques, hay cuentas de prueba;
- borrar, modificar o descargar datos que no sean tuyos para «demostrar» el hallazgo — describirlo
  es suficiente;
- pruebas de carga o de denegación de servicio contra producción;
- ingeniería social al entrenador ni a sus asesorados.

Si un hallazgo se reporta así, no se toman represalias y se acredita a quien lo encontró en la
bitácora del proyecto, si quiere.

## Qué NO es un hallazgo aquí

Para no gastar tiempo de nadie, esto es conocido y está decidido:

- **La llave `anon` de Supabase está en el código del cliente.** Es pública por diseño: lo que
  protege los datos es la seguridad por fila (RLS), no esa llave. Si encuentras una fila que se
  puede leer o escribir **sin ser su dueño ni su entrenador**, eso sí es un hallazgo, y de los
  graves.
- **El código fuente es legible.** El repositorio es público a propósito; no hay ningún secreto
  dentro y un control del pre-commit lo verifica en cada commit.
- **La política de contraseñas filtradas de Supabase aparece como advertencia.** Ese control es
  del plan de pago y está descartado por decisión de producto; los requisitos de contraseña sí
  están activos en el servidor.
- **Avisos de RLS sobre tablas sin permisos otorgados.** Hay tablas que escribe solo un
  disparador interno y a las que ningún rol tiene permisos: Postgres evalúa los permisos antes que
  la RLS, así que el aviso automático es un falso positivo ya verificado.

## Alcance

Dentro: la app en `kronos-apex.github.io/apex-app`, este repositorio, las funciones de borde y el
esquema de base de datos en `supabase/`.

Fuera: el sitio de venta (otro repositorio), las cuentas de redes sociales del entrenador y la
infraestructura de terceros (GitHub, Supabase, Vercel), que tienen sus propios programas.
