param(
    [string]$Python = "",
    [int]$Port = 8010
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$backend = Join-Path $root "backend"
if (-not $Python) { $Python = Join-Path $backend ".venv\Scripts\python.exe" }
if (-not (Test-Path $Python)) { throw "Python no encontrado: $Python" }
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
    throw "El puerto $Port ya esta ocupado; no se iniciara una instancia adicional"
}

$runtime = Join-Path $backend ".runtime"
New-Item -ItemType Directory -Force -Path $runtime | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss-fff"
$stdout = Join-Path $runtime "uvicorn-$stamp.out.log"
$stderr = Join-Path $runtime "uvicorn-$stamp.err.log"
$process = $null

try {
    $process = Start-Process -FilePath $Python `
        -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "$Port") `
        -WorkingDirectory $backend -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr -WindowStyle Hidden -PassThru

    $health = $null
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        if ($process.HasExited) { break }
        try {
            $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/v1/plates/health" -TimeoutSec 2
            break
        } catch { Start-Sleep -Seconds 1 }
    }
    if (-not $health) {
        $errorLog = if (Test-Path $stderr) { Get-Content $stderr -Raw } else { "sin log" }
        throw "El backend no quedo listo. Log: $errorLog"
    }
    if ($health.status -notin @("ok", "degraded")) {
        throw "Health inesperado: $($health | ConvertTo-Json -Compress)"
    }

    $openapi = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/openapi.json" -TimeoutSec 5
    $pathCount = @($openapi.paths.PSObject.Properties).Count
    if ($pathCount -lt 1) { throw "OpenAPI no contiene rutas" }

    $env:SMOKE_ANALYZE_URL = "http://127.0.0.1:$Port/api/v1/plates/analyze"
    $analyzeSmoke = @'
import json
import os
import uuid
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import cv2
import numpy as np

ok, encoded = cv2.imencode(".jpg", np.zeros((32, 64, 3), dtype=np.uint8))
if not ok:
    raise SystemExit("no se pudo crear imagen de smoke")
boundary = "----smoke-" + uuid.uuid4().hex
body = (
    f"--{boundary}\r\n"
    'Content-Disposition: form-data; name="file"; filename="smoke.jpg"\r\n'
    "Content-Type: image/jpeg\r\n\r\n"
).encode("ascii") + encoded.tobytes() + f"\r\n--{boundary}--\r\n".encode("ascii")
request = Request(
    os.environ["SMOKE_ANALYZE_URL"],
    data=body,
    method="POST",
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
)
try:
    with urlopen(request, timeout=30) as response:
        status_code = response.status
        payload = json.loads(response.read().decode("utf-8"))
except HTTPError as exc:
    status_code = exc.code
    payload = json.loads(exc.read().decode("utf-8"))
if status_code not in {200, 422, 503}:
    raise SystemExit(f"analyze devolvio HTTP inesperado: {status_code}")
if payload.get("estado") not in {"DETECTADO", "BAJA_CONFIANZA", "ERROR", "MANUAL"}:
    raise SystemExit(f"contrato analyze inesperado: {payload}")
print(f"analyze_http={status_code}; analyze_status={payload.get('estado')}")
'@
    $analyzeSmoke | & $Python -
    if ($LASTEXITCODE -ne 0) { throw "smoke del endpoint analyze fallo" }

    Write-Host "health=$($health.status); pipeline=$($health.pipeline_mode); ocr=$($health.ocr_available); supervision=$($health.supervision_available); openapi_paths=$pathCount; pid=$($process.Id)"
} finally {
    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id
        $process.WaitForExit()
    }
    Start-Sleep -Milliseconds 500
    if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
        throw "El puerto $Port continuo ocupado despues del smoke test"
    }
}

Write-Host "Smoke test local completado; puerto $Port liberado"
