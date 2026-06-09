# Deploy Data Analyzer to mirekdev.pl/analyzer
# Run from data-analyzer/ root in PowerShell.

[CmdletBinding()]
param(
    [string]$RemoteHost = "root@64.226.68.115",
    [string]$RemotePath = "/var/www/analyzer"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "==> 1/6 Building frontend..." -ForegroundColor Cyan
Push-Location frontend
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
Pop-Location

Write-Host "==> 2/6 Preparing remote directories..." -ForegroundColor Cyan
ssh $RemoteHost "mkdir -p $RemotePath/uploads $RemotePath/backend $RemotePath/frontend/dist $RemotePath/deploy && chmod 700 $RemotePath/uploads"

Write-Host "==> 3/6 Packing tarball..." -ForegroundColor Cyan
$tar = Join-Path $root "deploy.tar.gz"
if (Test-Path $tar) { Remove-Item $tar -Force }
tar -czf $tar `
    --exclude=node_modules `
    --exclude=.venv `
    --exclude=__pycache__ `
    --exclude=*.pyc `
    --exclude=.local-uploads `
    --exclude=.git `
    --exclude=.env `
    backend frontend/dist deploy
if ($LASTEXITCODE -ne 0) { throw "tar failed" }

Write-Host "==> 4/6 Uploading tarball..." -ForegroundColor Cyan
scp $tar "${RemoteHost}:${RemotePath}/deploy.tar.gz"
if ($LASTEXITCODE -ne 0) { throw "scp failed" }
ssh $RemoteHost "cd $RemotePath && tar -xzf deploy.tar.gz && rm deploy.tar.gz"
if ($LASTEXITCODE -ne 0) { throw "remote tar -xzf failed" }
Remove-Item $tar -Force

Write-Host "==> 5/6 Backend venv + deps on server..." -ForegroundColor Cyan
$bootstrap = @'
set -e
cd /var/www/analyzer/backend
if [ ! -d .venv ]; then python3 -m venv .venv; fi
.venv/bin/pip install --upgrade pip --quiet
.venv/bin/pip install -r requirements.txt --quiet
echo "backend deps ready"
'@
ssh $RemoteHost $bootstrap

Write-Host "==> 6/6 PM2 start/reload..." -ForegroundColor Cyan
ssh $RemoteHost "cd $RemotePath && pm2 startOrReload deploy/ecosystem.config.cjs && pm2 save"

Write-Host ""
Write-Host "==> Smoke test:" -ForegroundColor Green
ssh $RemoteHost "curl -s http://127.0.0.1:8101/api/health"
Write-Host ""
Write-Host "Deploy finished." -ForegroundColor Green
Write-Host "After the first deploy you must ALSO edit Nginx ONCE." -ForegroundColor Yellow
Write-Host "  See: deploy/nginx-snippet.conf and the README." -ForegroundColor Yellow
