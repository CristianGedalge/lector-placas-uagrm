param(
    [string]$Python = "python",
    [switch]$SkipVersionCheck
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
if (-not (Test-Path (Join-Path $backend "app"))) { throw "Backend no encontrado en $backend" }
if (-not (Test-Path (Join-Path $frontend "package.json"))) { throw "Frontend no encontrado o incompleto en $frontend" }
if (Test-Path $Python) { $Python = (Resolve-Path $Python).Path }
$runtime = Join-Path $backend ".runtime"
$matplotlibRuntime = Join-Path $runtime "matplotlib"
New-Item -ItemType Directory -Force -Path $matplotlibRuntime | Out-Null
$env:MPLCONFIGDIR = $matplotlibRuntime

Write-Host "[1/5] Compilando Python"
& $Python -m compileall -q (Join-Path $backend "app") (Join-Path $backend "tests")
if ($LASTEXITCODE -ne 0) { throw "compileall fallo" }

Write-Host "[2/5] Verificando APIs OCR de Supervision"
$smoke = @'
import supervision as sv
required = {
    "Detections.from_easyocr": hasattr(sv.Detections, "from_easyocr"),
    "crop_image": hasattr(sv, "crop_image"),
    "ColorLookup.INDEX": hasattr(sv.ColorLookup, "INDEX"),
}
missing = [name for name, available in required.items() if not available]
if missing:
    raise SystemExit("APIs faltantes: " + ", ".join(missing))
sv.BoxAnnotator(thickness=2, color_lookup=sv.ColorLookup.INDEX)
sv.LabelAnnotator(text_scale=0.5, color_lookup=sv.ColorLookup.INDEX)
print(f"supervision={sv.__version__}; OCR_APIs=OK")
'@
$smoke | & $Python -
if ($LASTEXITCODE -ne 0) { throw "smoke test de Supervision fallo" }

Write-Host "[3/5] Comprobando dependencias locales"
if ($SkipVersionCheck) {
    Write-Warning "verificacion estricta de versiones omitida por parametro"
} else {
$versions = @'
from importlib import metadata
expected = {
    "supervision": "0.29.1",
    "opencv-python": "4.10.0.84",
    "opencv-python-headless": "4.10.0.84",
}
errors = []
for package, wanted in expected.items():
    try:
        current = metadata.version(package)
    except metadata.PackageNotFoundError:
        errors.append(f"{package}: no instalado")
        continue
    print(f"{package}={current}")
    if current != wanted:
        errors.append(f"{package}: esperado {wanted}, actual {current}")
for required in ("easyocr", "numpy", "httpx"):
    try:
        print(f"{required}={metadata.version(required)}")
    except metadata.PackageNotFoundError:
        errors.append(f"{required}: no instalado")
if errors:
    raise SystemExit("Dependencias incompatibles: " + "; ".join(errors))
'@
$versions | & $Python -
if ($LASTEXITCODE -ne 0) { throw "las dependencias instaladas no coinciden con la arquitectura OCR" }
}

Write-Host "[4/5] Ejecutando pruebas unitarias del backend"
Push-Location $backend
try {
    & $Python -m unittest discover -s tests -v
    if ($LASTEXITCODE -ne 0) { throw "pruebas unitarias del backend fallaron" }
} finally { Pop-Location }

Write-Host "[5/5] Construyendo frontend"
Push-Location $frontend
try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw "build frontend fallo" }
} finally { Pop-Location }

Write-Host "Verificacion completada correctamente"
