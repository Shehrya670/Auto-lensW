#!/bin/bash
set -e

DOCKER_GID=$(stat -c '%g' /var/run/docker.sock)
echo "Docker socket GID: $DOCKER_GID"

# Stop and remove existing jenkins container
docker rm -f jenkins 2>/dev/null || true

# Run Jenkins with all necessary Docker mounts
docker run -d \
  --name jenkins \
  --restart=unless-stopped \
  -p 8080:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /usr/bin/docker:/usr/bin/docker \
  -v /usr/libexec/docker/cli-plugins:/usr/libexec/docker/cli-plugins:ro \
  --group-add "$DOCKER_GID" \
  jenkins/jenkins:lts-jdk21

echo "Waiting 30s for Jenkins to start..."
sleep 30

# Verify
echo "=== Docker access check ==="
docker exec jenkins docker ps --format 'table {{.Names}}\t{{.Status}}'
echo ""
echo "=== Docker compose check ==="
docker exec jenkins docker compose version
echo ""
echo "=== Jenkins admin password ==="
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword 2>/dev/null || echo "(already configured)"
echo ""
echo "Jenkins URL: http://$(curl -s http://checkip.amazonaws.com):8080"
echo "=== DONE ==="
