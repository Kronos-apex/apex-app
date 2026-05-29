# Git hooks de APEX

Los hooks de Git viven en `.git/hooks/`, que **no se versiona**. Esta carpeta
guarda la copia canónica para que el hook sea recuperable si se reinstala el
repo.

## Instalar

```bash
cp scripts/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit   # en Linux/macOS
```

## `pre-commit`

Corre la auditoría de APEX (8 checks) y **aborta el commit** si algo falla.
Saltarlo solo en emergencias: `git commit --no-verify`.

### Nota de mantenimiento

El check de "handlers sin función" extrae el JS inline de `index.html`. Como
ahora hay un `<script src="apex-core.js">` antes del `<script>` inline, el cierre
del bloque debe buscarse **después** del `<script>` inline:

```python
script_start = src.find('<script>')
script_end   = src.find('</script>', script_start)   # NO src.find('</script>')
```

Buscar el primer `</script>` a secas devuelve el cierre del `<script src>` y deja
el JS vacío → falso positivo de "todos los handlers rotos". Misma corrección
aplicada a los agentes Camila/Julián/Lucas y al skill `apex-audit`.
