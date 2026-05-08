#!/bin/bash
set -e

# Get docker socket GID from host
DOCKER_GID=$(stat -c '%g' /var/run/docker.sock)
echo "Docker socket GID: $DOCKER_GID"

# Add group inside jenkins container and add jenkins user to it
docker exec -u root jenkins bash -c "groupadd -g $DOCKER_GID docker_host 2>/dev/null || true; usermod -aG docker_host jenkins"

# Restart jenkins to pick up group change
docker restart jenkins
echo "Waiting 25s for Jenkins to restart..."
sleep 25

# Verify
echo "=== Verifying Docker access ==="
docker exec jenkins docker ps --format 'table {{.Names}}\t{{.Status}}'
echo "=== SUCCESS: Jenkins can use Docker ==="
