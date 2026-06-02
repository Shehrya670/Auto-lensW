#!/bin/bash
set -e

EC2_IP="16.16.196.245"
APP_DIR="/home/ubuntu/Auto-lensW"

echo "=============================================="
echo " Auto-Lens Kubernetes Deployment Script"
echo "=============================================="

# ── 1. Create swap if not exists ──────────────────────────────────────────────
if ! swapon --show | grep -q '/swapfile'; then
    echo "[1/8] Creating 1GB swap file..."
    sudo dd if=/dev/zero of=/swapfile bs=1M count=1024 status=progress
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo "[+] Swap enabled."
else
    echo "[1/8] Swap already exists."
fi
free -h

# ── 2. Stop old Docker Compose containers ─────────────────────────────────────
echo "[2/8] Stopping old Docker Compose containers..."
cd "$APP_DIR"
docker compose down 2>/dev/null || true
docker stop jenkins 2>/dev/null || true
echo "[+] Old containers stopped."

# ── 3. Prune Docker to free disk ──────────────────────────────────────────────
echo "[3/8] Pruning Docker..."
docker system prune -a -f
echo "[+] Docker pruned."
df -h /

# ── 4. Build backend image on host Docker ─────────────────────────────────────
echo "[4/8] Building backend Docker image..."
docker build -t shehryar670/auto-lens-backend:latest ./backend
echo "[+] Backend image built."

# ── 5. Build frontend image on host Docker ────────────────────────────────────
echo "[5/8] Building frontend Docker image..."
docker build -t shehryar670/auto-lens-frontend:latest \
    --build-arg REACT_APP_API_URL="" \
    ./frontend
echo "[+] Frontend image built."

# ── 6. Load images into minikube ──────────────────────────────────────────────
echo "[6/8] Loading images into minikube..."
minikube image load shehryar670/auto-lens-backend:latest
minikube image load shehryar670/auto-lens-frontend:latest
echo "[+] Images loaded into minikube."

# ── 7. Apply Kubernetes manifests ─────────────────────────────────────────────
echo "[7/8] Applying Kubernetes manifests..."
kubectl apply -f kubernetes/postgres-pvc.yaml
kubectl apply -f kubernetes/postgres-deployment.yaml
kubectl apply -f kubernetes/backend-deployment.yaml
kubectl apply -f kubernetes/frontend-deployment.yaml
kubectl apply -f kubernetes/hpa.yaml
kubectl apply -f kubernetes/ingress.yaml
echo "[+] All manifests applied."

# ── 8. Wait for pods ─────────────────────────────────────────────────────────
echo "[8/8] Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres --timeout=120s 2>/dev/null || echo "  Postgres still starting..."
kubectl wait --for=condition=ready pod -l app=backend --timeout=120s 2>/dev/null || echo "  Backend still starting..."
kubectl wait --for=condition=ready pod -l app=frontend --timeout=120s 2>/dev/null || echo "  Frontend still starting..."

echo ""
echo "=============================================="
echo " DEPLOYMENT STATUS"
echo "=============================================="
kubectl get pods -o wide
echo ""
kubectl get svc
echo ""
kubectl get hpa
echo ""
kubectl get pvc
echo "=============================================="
