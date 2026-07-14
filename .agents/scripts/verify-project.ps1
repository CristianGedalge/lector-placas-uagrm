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
$runtime = Join-Path $backend ".runtime"
$matplotlibRuntime = Join-Path $runtime "matplotlib"
$ultralyticsRuntime = Join-Path $runtime "ultralytics"
New-Item -ItemType Directory -Force -Path $matplotlibRuntime, $ultralyticsRuntime | Out-Null
$env:MPLCONFIGDIR = $matplotlibRuntime
$env:YOLO_CONFIG_DIR = $ultralyticsRuntime

Write-Host "[1/5] Compilando Python"
& $Python -m compileall -q (Join-Path $backend "app") (Join-Path $backend "ml\scripts")
if ($LASTEXITCODE -ne 0) { throw "compileall fallo" }

Write-Host "[2/5] Verificando APIs de Supervision"
$smoke = @'
import supervision as sv
required = {
    "Detections.from_ultralytics": hasattr(sv.Detections, "from_ultralytics"),
    "Detections.from_inference": hasattr(sv.Detections, "from_inference"),
    "crop_image": hasattr(sv, "crop_image"),
}
missing = [name for name, available in required.items() if not available]
if missing:
    raise SystemExit("APIs faltantes: " + ", ".join(missing))
sv.BoxAnnotator(thickness=2)
sv.LabelAnnotator(text_scale=0.5)
print(f"supervision={sv.__version__}; APIs=OK")
'@
$smoke | & $Python -
if ($LASTEXITCODE -ne 0) { throw "smoke test de Supervision fallo" }

Write-Host "[3/5] Comprobando versiones instaladas"
if ($SkipVersionCheck) {
    Write-Warning "verificacion estricta de versiones omitida por parametro"
} else {
$versions = @'
from importlib import metadata
expected = {
    "supervision": "0.29.1",
    "inference-sdk": "1.2.6",
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
if errors:
    raise SystemExit("Matriz incompatible: " + "; ".join(errors))
'@
$versions | & $Python -
if ($LASTEXITCODE -ne 0) { throw "las dependencias instaladas no coinciden con requirements.txt" }
}

Write-Host "[4/5] Inventariando dataset y modelos"
$dataset = Join-Path $backend "ml\datasets\blpr"
foreach ($split in @("train", "valid", "test")) {
    $images = @(Get-ChildItem (Join-Path $dataset "$split\images") -File -ErrorAction SilentlyContinue).Count
    $labels = @(Get-ChildItem (Join-Path $dataset "$split\labels") -File -ErrorAction SilentlyContinue).Count
    if ($images -eq 0 -or $labels -eq 0) { throw "$split incompleto: images=$images labels=$labels" }
    Write-Host "$split images=$images labels=$labels"
}
if (-not (Test-Path (Join-Path $dataset "data.yaml"))) { throw "falta data.yaml" }
if (-not (Test-Path (Join-Path $backend "ml\models\best.pt"))) {
    Write-Warning "best.pt no existe: la inferencia local entrenada no esta habilitada"
}

Write-Host "[5/5] Construyendo frontend"
Push-Location $frontend
try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw "build frontend fallo" }
} finally { Pop-Location }

Write-Host "Verificacion completada correctamente"
