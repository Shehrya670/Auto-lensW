#!/bin/bash
# fix-pipeline.sh — Run on EC2 to fix the Jenkins pipeline build issue
# Usage: bash fix-pipeline.sh
set -e

JENKINS_URL="http://localhost:8080"
JENKINS_USER="admin"
JENKINS_PASS="admin123"
EC2_IP=$(curl -s http://checkip.amazonaws.com)

echo "======================================================"
echo " Auto-Lens Pipeline Fix Script"
echo " EC2 IP: $EC2_IP"
echo "======================================================"

# ── 1. Ensure Jenkins container is running ────────────────────────────────────
echo "[*] Checking Jenkins container..."
if ! docker ps --format '{{.Names}}' | grep -q "^jenkins$"; then
    echo "[!] Jenkins container not running. Starting it..."
    bash /home/ubuntu/Auto-lensW/start-jenkins.sh
    sleep 30
fi
echo "[+] Jenkins is running."

# ── 2. Fix git safe.directory inside Jenkins container ───────────────────────
echo "[*] Fixing git safe.directory in Jenkins container..."
# Use a Python heredoc trick to write the value correctly
docker exec -u root jenkins bash -c "
git config --global --unset-all safe.directory 2>/dev/null || true
git config --global --add safe.directory /var/jenkins_home/workspace/Assignment3-Pipeline
git config --global --add safe.directory /var/jenkins_home/workspace/Assignment3-Pipeline@tmp
git config --global --list | grep safe
"
echo "[+] Git safe.directory fixed."

# ── 3. Wait for Jenkins API to be ready ───────────────────────────────────────
echo "[*] Waiting for Jenkins API..."
until curl -sf -u "$JENKINS_USER:$JENKINS_PASS" "$JENKINS_URL/api/json" > /dev/null 2>&1; do
    sleep 5
    echo "  Waiting..."
done
echo "[+] Jenkins API ready."

# ── 4. Download jenkins-cli.jar ───────────────────────────────────────────────
echo "[*] Getting jenkins-cli.jar..."
docker exec jenkins bash -c "
  if [ ! -f /tmp/jenkins-cli.jar ]; then
    curl -sf -o /tmp/jenkins-cli.jar $JENKINS_URL/jnlpJars/jenkins-cli.jar
  fi
"
echo "[+] jenkins-cli.jar ready."

# ── 5. Fix the pipeline job — set lightweight=false ───────────────────────────
echo "[*] Fixing pipeline job configuration (lightweight=false)..."

# Get current job config
docker exec jenkins bash -c "
java -jar /tmp/jenkins-cli.jar -s $JENKINS_URL -auth $JENKINS_USER:$JENKINS_PASS \
  get-job Assignment3-Pipeline > /tmp/job-config.xml 2>/dev/null || echo 'Job not found'
"

# Check if we got the config
JOB_EXISTS=$(docker exec jenkins bash -c "test -s /tmp/job-config.xml && echo yes || echo no")

if [ "$JOB_EXISTS" = "yes" ]; then
    echo "  Job found, updating configuration..."
    # Fix lightweight flag and update job
    docker exec jenkins bash -c "
sed -i 's|<lightweight>true</lightweight>|<lightweight>false</lightweight>|g' /tmp/job-config.xml
cat /tmp/job-config.xml | java -jar /tmp/jenkins-cli.jar -s $JENKINS_URL -auth $JENKINS_USER:$JENKINS_PASS \
  update-job Assignment3-Pipeline
"
    echo "[+] Job updated with lightweight=false."
else
    echo "  Job not found, creating it..."
    cat > /tmp/job-config.xml << 'XML'
<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>Auto-Lens CI/CD - Assignment 3</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
      <triggers>
        <com.cloudbees.jenkins.GitHubPushTrigger plugin="github">
          <spec></spec>
        </com.cloudbees.jenkins.GitHubPushTrigger>
      </triggers>
    </org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition" plugin="workflow-cps">
    <scm class="hudson.plugins.git.GitSCM" plugin="git">
      <configVersion>2</configVersion>
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>https://github.com/Shehrya670/Auto-lensW.git</url>
        </hudson.plugins.git.UserRemoteConfig>
      </userRemoteConfigs>
      <branches>
        <hudson.plugins.git.BranchSpec>
          <name>*/main</name>
        </hudson.plugins.git.BranchSpec>
      </branches>
    </scm>
    <scriptPath>Jenkinsfile</scriptPath>
    <lightweight>false</lightweight>
  </definition>
</flow-definition>
XML
    scp /tmp/job-config.xml jenkins:/tmp/job-config.xml 2>/dev/null || \
    docker cp /tmp/job-config.xml jenkins:/tmp/job-config.xml
    docker exec jenkins bash -c "
cat /tmp/job-config.xml | java -jar /tmp/jenkins-cli.jar -s $JENKINS_URL -auth $JENKINS_USER:$JENKINS_PASS \
  create-job Assignment3-Pipeline
"
    echo "[+] Job created."
fi

# ── 6. Update EC2_PUBLIC_IP credential ───────────────────────────────────────
echo "[*] Updating EC2_PUBLIC_IP credential to: $EC2_IP"
CRUMB_JSON=$(curl -sf -u "$JENKINS_USER:$JENKINS_PASS" "$JENKINS_URL/crumbIssuer/api/json")
CRUMB_FIELD=$(echo "$CRUMB_JSON" | grep -o '"crumbRequestField":"[^"]*' | cut -d'"' -f4)
CRUMB_VALUE=$(echo "$CRUMB_JSON" | grep -o '"crumb":"[^"]*' | cut -d'"' -f4)

# Delete and recreate the credential
curl -sf -u "$JENKINS_USER:$JENKINS_PASS" \
  -H "$CRUMB_FIELD:$CRUMB_VALUE" \
  -X DELETE \
  "$JENKINS_URL/manage/credentials/store/system/domain/_/credential/EC2_PUBLIC_IP" \
  > /dev/null 2>&1 || true

curl -sf -u "$JENKINS_USER:$JENKINS_PASS" \
  -H "$CRUMB_FIELD:$CRUMB_VALUE" \
  -H "Content-Type: application/xml" \
  -d "<org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl>
    <scope>GLOBAL</scope>
    <id>EC2_PUBLIC_IP</id>
    <description>EC2 Public IP Address</description>
    <secret>$EC2_IP</secret>
  </org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl>" \
  "$JENKINS_URL/manage/credentials/store/system/domain/_/createCredentials" \
  > /dev/null 2>&1 && echo "[+] EC2_PUBLIC_IP credential updated." || echo "[!] Could not update credential (may already be up to date)"

# ── 7. Clean up old workspace ──────────────────────────────────────────────────
echo "[*] Cleaning up old workspace..."
docker exec -u root jenkins bash -c "rm -rf /var/jenkins_home/workspace/Assignment3-Pipeline"
echo "[+] Workspace cleaned."

# ── 8. Trigger a build ────────────────────────────────────────────────────────
echo "[*] Triggering Assignment3-Pipeline build..."
docker exec jenkins bash -c "
java -jar /tmp/jenkins-cli.jar -s $JENKINS_URL -auth $JENKINS_USER:$JENKINS_PASS \
  build Assignment3-Pipeline
"
echo "[+] Build triggered!"

echo ""
echo "======================================================"
echo " DONE! Monitor build at:"
echo " http://$EC2_IP:8080/job/Assignment3-Pipeline/"
echo "======================================================"
