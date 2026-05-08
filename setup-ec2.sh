#!/bin/bash
# =============================================================================
# Auto-Lens EC2 Full Setup Script
# Covers: Assignment 1 (IaaS EC2 deployment) + Assignment 2 (Docker + Jenkins)
# Run as ubuntu user: bash setup-ec2.sh <GITHUB_REPO_URL> <EC2_PUBLIC_IP>
# =============================================================================
set -e

REPO_URL="${1:-https://github.com/Shehrya670/Auto-lensW.git}"
EC2_IP="${2:-$(curl -s http://checkip.amazonaws.com)}"
APP_DIR="/home/ubuntu/Auto-lensW"
JENKINS_PORT=8080

echo "=============================================="
echo " Auto-Lens EC2 Setup"
echo " Repo  : $REPO_URL"
echo " EC2 IP: $EC2_IP"
echo "=============================================="

# ── 1. System updates ─────────────────────────────────────────────────────────
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y git curl wget unzip ca-certificates gnupg lsb-release

# ── 2. Install Docker ─────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "[*] Installing Docker..."
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo usermod -aG docker ubuntu
  sudo systemctl enable docker
  sudo systemctl start docker
  echo "[+] Docker installed."
else
  echo "[+] Docker already installed."
fi

# ── 3. Install Jenkins ────────────────────────────────────────────────────────
if ! command -v jenkins &>/dev/null; then
  echo "[*] Installing Jenkins..."
  sudo wget -O /usr/share/keyrings/jenkins-keyring.asc \
    https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key
  echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
    https://pkg.jenkins.io/debian-stable binary/" \
    | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
  sudo apt-get update -y
  sudo apt-get install -y fontconfig openjdk-17-jre jenkins
  sudo systemctl enable jenkins
  sudo systemctl start jenkins
  # Allow jenkins user to run docker
  sudo usermod -aG docker jenkins
  sudo systemctl restart jenkins
  echo "[+] Jenkins installed on port ${JENKINS_PORT}."
else
  echo "[+] Jenkins already installed."
fi

# ── 4. Clone / update repo ────────────────────────────────────────────────────
if [ -d "$APP_DIR" ]; then
  echo "[*] Updating existing repo..."
  cd "$APP_DIR" && git pull origin main
else
  echo "[*] Cloning repo..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi
cd "$APP_DIR"

# ── 5. Write production backend .env ─────────────────────────────────────────
cat > backend/.env << EOF
NODE_ENV=production
PORT=5000
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRE=7d
CLIENT_URLS=http://${EC2_IP}:3000
DB_HOST=postgres
DB_PORT=5432
DB_NAME=auto_lens
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false
DB_MAX_POOL_SIZE=10
DB_CONNECTION_TIMEOUT_MS=5000
DB_IDLE_TIMEOUT_MS=30000
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
EOF
echo "[+] backend/.env written."

# ── 6. Write production frontend .env ────────────────────────────────────────
cat > frontend/.env << EOF
REACT_APP_API_URL=http://${EC2_IP}:5000/api
EOF
echo "[+] frontend/.env written."

# ── 7. Launch the app stack (Assignment 1 Part I + Assignment 2 Part I) ───────
echo "[*] Starting application stack (docker compose up)..."
REACT_APP_API_URL="http://${EC2_IP}:5000/api" \
  docker compose up -d --build

echo "[*] Waiting 60s for services to become healthy..."
sleep 60

# ── 8. Health check ───────────────────────────────────────────────────────────
echo "[*] Running health checks..."
curl -sf "http://localhost:5000/healthz" \
  && echo "[+] Backend is healthy!" \
  || echo "[!] Backend health check failed - check logs: docker compose logs backend"

curl -sf "http://localhost:3000" \
  && echo "[+] Frontend is reachable!" \
  || echo "[!] Frontend not reachable - check: docker compose logs frontend"

# ── 9. DB schema bootstrap (if first run) ─────────────────────────────────────
echo "[*] Running DB schema setup..."
docker compose exec -T postgres psql -U postgres -d auto_lens -c "\dt" 2>/dev/null \
  | grep -q "users" \
  && echo "[+] Schema already exists." \
  || (cd backend && npm run db:setup 2>/dev/null && echo "[+] Schema created." || echo "[!] db:setup not found, schema may need manual creation.")

# ── 10. Print summary ─────────────────────────────────────────────────────────
echo ""
echo "=============================================="
echo " DEPLOYMENT COMPLETE"
echo "=============================================="
echo " Frontend  : http://${EC2_IP}:3000"
echo " Backend   : http://${EC2_IP}:5000"
echo " Health    : http://${EC2_IP}:5000/healthz"
echo " Jenkins   : http://${EC2_IP}:${JENKINS_PORT}"
echo ""
echo " Jenkins initial admin password:"
sudo cat /var/lib/jenkins/secrets/initialAdminPassword 2>/dev/null || echo "  (Jenkins may still be starting)"
echo "=============================================="
