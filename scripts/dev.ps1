$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envFile = Join-Path $root '.env'
$python = Join-Path $root '.venv\Scripts\python.exe'

if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$' -and $matches[1] -notmatch '^#') {
      $name = $matches[1]
      $value = $matches[2].Trim('"').Trim("'")
      [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
  }
}
$port = if ($env:PORT) { [int]$env:PORT } else { 8000 }
if ($port -lt 1 -or $port -gt 65535) { throw 'PORT must be an integer from 1 to 65535.' }
$env:PORT = "$port"
$localBackendUrl = "http://127.0.0.1:$port"

foreach ($required in @($python, (Join-Path $root 'frontend\node_modules\.bin\next.cmd'))) {
  if (-not (Test-Path $required)) { throw "Missing $required. Follow README.md setup first." }
}
if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) { throw 'Install cloudflared and retry.' }

$runDir = Join-Path ([IO.Path]::GetTempPath()) ("resso-dev-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $runDir | Out-Null
$backend = $null; $tunnel = $null; $frontend = $null
try {
  $backend = Start-Process -FilePath $python -ArgumentList @('-m','uvicorn','src.api.main:app','--host','0.0.0.0','--port',"$port") -WorkingDirectory $root -PassThru -NoNewWindow
  $tunnel = Start-Process -FilePath (Get-Command cloudflared).Source -ArgumentList @('tunnel','--url',$localBackendUrl,'--no-autoupdate') -RedirectStandardOutput (Join-Path $runDir 'tunnel.out') -RedirectStandardError (Join-Path $runDir 'tunnel.err') -PassThru -WindowStyle Hidden

  $tunnelUrl = $null
  for ($i=0; $i -lt 90 -and -not $tunnelUrl; $i++) {
    if ($backend.HasExited -or $tunnel.HasExited) { throw 'Backend or cloudflared exited before the tunnel became ready.' }
    $log = (Get-Content (Join-Path $runDir 'tunnel.out') -Raw -ErrorAction SilentlyContinue) + (Get-Content (Join-Path $runDir 'tunnel.err') -Raw -ErrorAction SilentlyContinue)
    if ($log -match 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com') { $tunnelUrl = $matches[0] }
    if ($tunnelUrl) {
      try { Invoke-RestMethod "$tunnelUrl/health" -TimeoutSec 3 | Out-Null } catch { $tunnelUrl = $null }
    }
    if (-not $tunnelUrl) { Start-Sleep -Seconds 1 }
  }
  if (-not $tunnelUrl) { throw 'Timed out waiting for the Cloudflare Quick Tunnel.' }

  Write-Host "Backend tunnel: $tunnelUrl"
  & $python (Join-Path $root 'scripts\publish_tunnel_config.py') $tunnelUrl
  $env:NEXT_PUBLIC_BACKEND_URL = $tunnelUrl
  $frontend = Start-Process -FilePath (Join-Path $root 'frontend\node_modules\.bin\next.cmd') -ArgumentList @('dev','--hostname','127.0.0.1') -WorkingDirectory (Join-Path $root 'frontend') -PassThru -NoNewWindow
  for ($i=0; $i -lt 120; $i++) {
    if ($frontend.HasExited) { throw 'Frontend stopped before becoming ready.' }
    try { Invoke-WebRequest 'http://127.0.0.1:3000' -TimeoutSec 2 | Out-Null; break } catch { Start-Sleep -Milliseconds 500 }
  }
  Write-Host 'Reso Agent ready at http://127.0.0.1:3000'
  Write-Host "Paste $tunnelUrl in Settings > Backend Connection, or open the mobile app with ?backend=$tunnelUrl"
  Start-Process 'http://127.0.0.1:3000'
  Wait-Process -Id $frontend.Id
} finally {
  foreach ($process in @($frontend, $tunnel, $backend)) {
    if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force }
  }
  Remove-Item $runDir -Recurse -Force -ErrorAction SilentlyContinue
}
