# Libera los puertos de un harness antes de correrlo. Una corrida que CRASHEA deja el servidor
# python y el Chrome de depuración vivos; la siguiente se conecta a ELLOS y da fallos fantasma
# («showScreen is not defined» con la app sana). Uso: powershell -File scripts/e2e/_freeports.ps1 8799 9308
foreach ($arg in $args) {
  $p = [int]$arg
  for ($i = 0; $i -lt 8; $i++) {
    $ids = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if (-not $ids) { break }
    $ids | ForEach-Object { try { Stop-Process -Id $_ -Force -ErrorAction Stop } catch {} }
    Start-Sleep -Milliseconds 400
  }
}
