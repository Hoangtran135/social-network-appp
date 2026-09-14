# One-time setup for a fresh Windows Server VPS. Run in an elevated (Administrator) PowerShell.
# Usage (from the project folder on the VPS): .\setup-vps-windows.ps1 -Domain a2t.io.vn

param(
    [string]$Domain = "a2t.io.vn",
    [string]$AppPort = "3000"
)

$ErrorActionPreference = "Stop"

function Test-Admin {
    $id = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    $p = New-Object System.Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Admin)) {
    Write-Error "Please run this script in an elevated (Run as Administrator) PowerShell window."
    exit 1
}

Write-Host "==> Checking for Node.js..." -ForegroundColor Cyan
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "Node.js not found. Download and install the LTS installer from https://nodejs.org/ first, then re-run this script." -ForegroundColor Yellow
    exit 1
} else {
    node -v
}

Write-Host "==> Installing PM2 globally..." -ForegroundColor Cyan
npm install -g pm2

Write-Host "==> Installing Nginx for Windows to C:\nginx (if not already present)..." -ForegroundColor Cyan
if (-not (Test-Path "C:\nginx\nginx.exe")) {
    $zipUrl = "http://nginx.org/download/nginx-1.26.2.zip"
    $zipPath = "$env:TEMP\nginx.zip"
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath
    if (Test-Path "$env:TEMP\nginx_extract") { Remove-Item "$env:TEMP\nginx_extract" -Recurse -Force }
    Expand-Archive -Path $zipPath -DestinationPath "$env:TEMP\nginx_extract" -Force
    $extracted = Get-ChildItem "$env:TEMP\nginx_extract" | Select-Object -First 1
    New-Item -ItemType Directory -Force -Path "C:\nginx" | Out-Null
    robocopy "$($extracted.FullName)" "C:\nginx" /E /NFL /NDL /NJH /NJS | Out-Null
    $global:LASTEXITCODE = 0
    Write-Host "Nginx installed to C:\nginx" -ForegroundColor Green
} else {
    Write-Host "Nginx already present at C:\nginx" -ForegroundColor Green
}

Write-Host "==> Writing Nginx reverse-proxy config for $Domain..." -ForegroundColor Cyan
$conf = @"
worker_processes  1;
events { worker_connections  1024; }
http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;

    server {
        listen       80;
        server_name  $Domain www.$Domain;

        location / {
            proxy_pass         http://127.0.0.1:$AppPort;
            proxy_http_version 1.1;
            proxy_set_header   Upgrade `$http_upgrade;
            proxy_set_header   Connection "upgrade";
            proxy_set_header   Host `$host;
            proxy_set_header   X-Real-IP `$remote_addr;
            proxy_set_header   X-Forwarded-For `$proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto `$scheme;
        }

        error_page   500 502 503 504  /50x.html;
        location = /50x.html { root html; }
    }
}
"@
Set-Content -Path "C:\nginx\conf\nginx.conf" -Value $conf -Encoding ASCII
Write-Host "Nginx config written." -ForegroundColor Green

Write-Host "==> Opening Windows Firewall ports 80/443..." -ForegroundColor Cyan
New-NetFirewallRule -DisplayName "HTTP-80-Inbound" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName "HTTPS-443-Inbound" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow -ErrorAction SilentlyContinue | Out-Null

Write-Host "==> Testing Nginx config..." -ForegroundColor Cyan
Push-Location C:\nginx
.\nginx.exe -t
Write-Host "==> Starting Nginx..." -ForegroundColor Cyan
Start-Process -FilePath ".\nginx.exe" -WorkingDirectory "C:\nginx"
Pop-Location

Write-Host ""
Write-Host "==> Base setup complete." -ForegroundColor Green
Write-Host "Next steps:"
Write-Host "  1. Copy your project into a folder on this VPS (e.g. C:\www\social-network-app)"
Write-Host "  2. cd into that folder, run: npm ci; npm run build; pm2 start ecosystem.config.cjs; pm2 save"
Write-Host "  3. Make sure DNS A record for $Domain points to this VPS public IP"
Write-Host "  4. For SSL on Windows, use win-acme (https://www.win-acme.com/) since Certbot is Linux-only:"
Write-Host "     - Download win-acme, run wacs.exe, choose IIS/manual binding for $Domain, it can output certs for Nginx"
