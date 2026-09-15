# One-command deploy for the Windows VPS. Run from the project folder:
#   .\deploy-windows.ps1
#
# Mirrors deploy.sh (git pull -> npm ci -> build -> pm2 restart) but stops the PM2
# process first — on Windows the running dist/server.cjs keeps native modules
# (like @rollup's win32 binary) file-locked, which makes `npm ci` fail with EPERM
# while the app is still up. Also hard-fails on any step's exit code instead of
# silently reloading PM2 on a stale build when a step errors.

function Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function FailIfError($msg) {
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED: $msg (exit code $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

if (Test-Path .git) {
    Step "Pulling latest code..."
    git pull
    FailIfError "git pull"
} else {
    Step "No git repo detected, skipping pull."
}

pm2 describe social-network-app *> $null
$appExists = ($LASTEXITCODE -eq 0)

if ($appExists) {
    Step "Stopping app to release file locks..."
    pm2 stop social-network-app | Out-Null
}

Step "Installing dependencies..."
npm ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "npm ci failed, retrying with a clean node_modules..." -ForegroundColor Yellow
    if (Test-Path node_modules) { Remove-Item -Recurse -Force node_modules }
    npm install
    FailIfError "npm install"
}

Step "Building project..."
npm run build
FailIfError "npm run build"

Step "Starting app with PM2..."
if ($appExists) {
    pm2 restart ecosystem.config.cjs --env production
} else {
    pm2 start ecosystem.config.cjs --env production
}
FailIfError "pm2 start/restart"

pm2 save

Step "Deploy complete."
pm2 status
