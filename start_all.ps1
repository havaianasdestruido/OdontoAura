[CmdletBinding()]
param(
    [switch]$Stop,
    [ValidateSet('dev', 'prod')]
    [string]$Mode = 'dev'
)
$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$logsDir = Join-Path $root '.logs'
$nmRoot = Join-Path $env:APPDATA 'npm'
$backend = Join-Path $root 'apps\backend'
$frontend = Join-Path $root 'apps\frontend'
$pgStart = Join-Path $root '.pg\start.ps1'
$pgStop = Join-Path $root '.pg\stop.ps1'

function Test-Port([int]$port) {
    return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

function Get-ListenerPid([int]$port) {
    $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($c) { return $c[0].OwningProcess }
    return $null
}

function Stop-All {
    Get-ChildItem $logsDir -Filter '*.pid' -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_ -match '\.pid$') {
            try { Get-Content $_.FullName | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } } catch {}
        }
        Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $pgStop) { & $pgStop }
    Write-Host "All services stopped."
}

function Start-AppServer {
    param([string]$Name, [string]$Cwd, [string]$Script, [int]$Port)

    $out = Join-Path $logsDir ("$Name.out.log")
    $err = Join-Path $logsDir ("$Name.err.log")
    Remove-Item $out, $err -ErrorAction SilentlyContinue

    $cmd = "set `"PATH=$nmRoot;%PATH%`" && cd /d `"$Cwd`" && $Script > `"$out`" 2>&1"
    $p = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $cmd -WorkingDirectory $root -WindowStyle Hidden -PassThru

    $ready = $false
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Milliseconds 500
        $pid2 = Get-ListenerPid $Port
        if ($pid2) { $ready = $true; break }
        if ($p.HasExited) { break }
    }

    if (-not $ready) {
        Write-Warning "$Name failed to listen on port $Port (exit=$($p.ExitCode)). Log tail:"
        Get-Content $err -Tail 8 -ErrorAction SilentlyContinue
        Get-Content $out -Tail 8 -ErrorAction SilentlyContinue
        return $false
    }

    $pidFile = Join-Path $logsDir "$Name.pid"
    Set-Content -Path $pidFile -Value $pid2 -Encoding ascii
    Write-Host "$Name up on port $Port (PID $pid2) -> logs in $logsDir"
    return $true
}

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

if ($Stop) {
    Stop-All
    exit 0
}

Write-Host "=== OdontoAura start_all (mode: $Mode) ==="

# 1) PostgreSQL
if (Test-Port 5432) {
    Write-Host "PostgreSQL already listening on 5432."
} else {
    if (-not (Test-Path $pgStart)) { Write-Error "PostgreSQL not installed: missing $pgStart. Run .pg setup first."; exit 1 }
    & $pgStart
    if (-not (Test-Port 5432)) { Write-Error "PostgreSQL failed to start. See .pg\server.err.log"; exit 1 }
    Write-Host "PostgreSQL ready."
}

# 2) Backend
if ($Mode -eq 'prod') {
    if (-not (Test-Path (Join-Path $backend 'dist\main.js'))) { Write-Error "Backend not built. Run 'pnpm build' or use -Mode dev."; exit 1 }
    $beScript = "pnpm run start:prod"
} else {
    $beScript = "pnpm run dev"
}
Write-Host "Starting backend ($Mode)..."
if (-not (Start-AppServer -Name backend -Cwd $backend -Script $beScript -Port 3001)) { exit 1 }

# 3) Frontend
if ($Mode -eq 'prod') {
    if (-not (Test-Path (Join-Path $frontend '.next\BUILD_ID'))) { Write-Error "Frontend not built. Run 'pnpm build' or use -Mode dev."; exit 1 }
    $feScript = "pnpm run start"
} else {
    $feScript = "pnpm run dev"
}
Write-Host "Starting frontend ($Mode)..."
if (-not (Start-AppServer -Name frontend -Cwd $frontend -Script $feScript -Port 3000)) { exit 1 }

Write-Host ""
Write-Host "All up:"
Write-Host "  API       http://localhost:3001/api        (Swagger: /api/docs)"
Write-Host "  Frontend  http://localhost:3000"
Write-Host ""
Write-Host "Stop everything with:  powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Stop"