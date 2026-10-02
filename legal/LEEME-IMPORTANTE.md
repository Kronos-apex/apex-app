# ⚖️ AVI — Documentos legales

> **No es asesoría legal.** Son documentos escritos contra lo que la web y la app hacen de verdad, para que un abogado
> colombiano los revise. Las preguntas abiertas están en `notas-para-el-abogado.md`.

## Qué se publica y dónde

| Documento | Archivo | En la web | En la app |
|---|---|---|---|
| Política de Tratamiento de Datos | `politica-tratamiento-datos.md` | avientrena.com/privacidad | visor del registro (`LEGAL_DOCS.politica`) |
| Términos y Condiciones | `terminos-y-condiciones.md` | avientrena.com/terminos | visor del registro (`LEGAL_DOCS.terminos`) |
| Política de Cookies y Almacenamiento Local | `politica-cookies.md` | avientrena.com/cookies | — |
| Aviso de Privacidad | `aviso-privacidad.md` | dentro de /privacidad | — |

Documentos de uso interno o para enviar por WhatsApp: `autorizacion-consentimiento.md` (casillas del registro),
`autorizacion-uso-imagen.md` (fotos y resultados en web y redes) y `declaracion-salud-entrenamiento.md`.

## Reglas

- **Una sola fuente:** estos archivos. La web los copia con `avi-web/scripts/sync-legal.mjs`; no se editan allá.
- Solo se usan títulos `#`/`##`, párrafos, listas con `- `, citas con `> ` y `**negrita**`: es lo que entienden el visor
  de la app (`_legalMdToHtml`) y la web.
- **Nada se publica con «PENDIENTE: …»:** la web se niega a construir si queda uno.
- Al cambiar la Política o los Términos: subir `LEGAL_V` (app-3-coach.js) y la versión del documento.
- Ninguna nota interna, historia de versiones ni comentario de desarrollo va dentro de un documento público: van en
  `notas-para-el-abogado.md` o en la bitácora.
