#!/usr/bin/env pwsh
# deploy-to-ec2.ps1
# Run this script from the Auto-lensW directory AFTER your EC2 instance is running.
# Usage: .\deploy-to-ec2.ps1 -EC2IP "13.50.17.82"

param(
    [string]$EC2IP = "13.50.17.82",
    [string]$KeyFile = "Autolens.pem",
    [string]$RepoURL = "https://github.com/Shehrya670/Auto-lensW.git"
)

$SSH_OPTS = "-o StrictHostKeyChecking=no -o ConnectTimeout=30"
$SSH = "ssh $SSH_OPTS -i `"$KeyFile`" ubuntu@$EC2IP"
$SCP = "scp $SSH_OPTS -i `"$KeyFile`""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Auto-Lens Full Deployment to EC2" -ForegroundColor Cyan
Write-Host " EC2 IP : $EC2IP" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# ── Step 1: Copy setup script to EC2 ─────────────────────────────────────────
Write-Host "`n[1/5] Copying setup script to EC2..." -ForegroundColor Yellow
Invoke-Expression "$SCP setup-ec2.sh ubuntu@${EC2IP}:~/setup-ec2.sh"

# ── Step 2: Run setup script on EC2 ──────────────────────────────────────────
Write-Host "`n[2/5] Running setup script on EC2 (this takes ~5 minutes)..." -ForegroundColor Yellow
Invoke-Expression "$SSH 'chmod +x ~/setup-ec2.sh && bash ~/setup-ec2.sh $RepoURL $EC2IP'"

# ── Step 3: Verify deployment ─────────────────────────────────────────────────
Write-Host "`n[3/5] Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

try {
    $health = Invoke-WebRequest -Uri "http://${EC2IP}:5000/healthz" -TimeoutSec 15 -UseBasicParsing
    if ($health.Content -match "ok") {
        Write-Host "[+] Backend is HEALTHY" -ForegroundColor Green
    }
} catch {
    Write-Host "[!] Backend health check failed: $_" -ForegroundColor Red
}

try {
    $frontend = Invoke-WebRequest -Uri "http://${EC2IP}:3000" -TimeoutSec 15 -UseBasicParsing
    Write-Host "[+] Frontend is REACHABLE (status: $($frontend.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "[!] Frontend not reachable: $_" -ForegroundColor Red
}

# ── Step 4: Get Jenkins initial password ──────────────────────────────────────
Write-Host "`n[4/5] Getting Jenkins admin password..." -ForegroundColor Yellow
$jenkinsPwd = Invoke-Expression "$SSH 'sudo cat /var/lib/jenkins/secrets/initialAdminPassword 2>/dev/null || echo NOT_READY'"
Write-Host "Jenkins initial admin password: $jenkinsPwd" -ForegroundColor Cyan

# ── Step 5: Configure Jenkins credential for EC2 IP ──────────────────────────
Write-Host "`n[5/5] Printing Jenkins setup instructions..." -ForegroundColor Yellow

Write-Host @"

========================================= 
 DEPLOYMENT COMPLETE
=========================================
 Frontend  : http://${EC2IP}:3000
 Backend   : http://${EC2IP}:5000
 Health    : http://${EC2IP}:5000/healthz
 Jenkins   : http://${EC2IP}:8080

 JENKINS SETUP (do once in browser):
 1. Open http://${EC2IP}:8080
 2. Paste password: $jenkinsPwd
 3. Install suggested plugins
 4. Create admin user
 5. Install extra plugins:
    - GitHub Integration
    - Email Extension (EmailExt)
    - HTML Publisher
    - Docker Pipeline

 JENKINS CREDENTIALS (add these):
    ID: EC2_PUBLIC_IP    → Value: $EC2IP
    ID: SMTP_SENDER_EMAIL → Value: your Gmail address

 GITHUB WEBHOOK:
    URL: http://${EC2IP}:8080/github-webhook/
    Content-type: application/json
    Trigger: Just the push event

 COLLABORATOR:
    Add qasimalik@gmail.com to your GitHub repo

=========================================
"@ -ForegroundColor Green
