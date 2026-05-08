#!/bin/bash
# jenkins-setup.sh — Run ON the EC2 instance after Jenkins is installed
# Usage: bash jenkins-setup.sh <EC2_IP> <ADMIN_PASSWORD> <SMTP_EMAIL> <SMTP_APP_PASSWORD> <GITHUB_REPO_URL>

EC2_IP="${1:?EC2_IP required}"
ADMIN_PASS="${2:?Jenkins admin password required}"
SMTP_EMAIL="${3:?SMTP email required}"
SMTP_APP_PASS="${4:?SMTP app password required}"
REPO_URL="${5:-https://github.com/Shehrya670/Auto-lensW.git}"

JENKINS_URL="http://localhost:8080"
CRUMB=""

echo "[*] Waiting for Jenkins to be fully up..."
until curl -sf "${JENKINS_URL}/login" > /dev/null; do sleep 5; echo "  Still waiting..."; done
echo "[+] Jenkins is up."

# ── Get crumb for CSRF ────────────────────────────────────────────────────────
CRUMB=$(curl -sf -u "admin:${ADMIN_PASS}" \
  "${JENKINS_URL}/crumbIssuer/api/json" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['crumbRequestField']+':'+d['crumb'])")
echo "[+] Got CSRF crumb."

# ── Install required plugins ──────────────────────────────────────────────────
echo "[*] Installing Jenkins plugins..."
for plugin in \
  "github" \
  "github-branch-source" \
  "workflow-aggregator" \
  "docker-workflow" \
  "email-ext" \
  "htmlpublisher" \
  "junit" \
  "git" \
  "credentials-binding" \
  "pipeline-stage-view"; do
  curl -sf -X POST \
    -u "admin:${ADMIN_PASS}" \
    -H "$CRUMB" \
    "${JENKINS_URL}/pluginManager/installNecessaryPlugins" \
    -d "<jenkins><install plugin='${plugin}@latest' /></jenkins>" \
    -H "Content-Type: text/xml" > /dev/null
  echo "  Queued: $plugin"
done
echo "[+] Plugins queued. Jenkins will restart..."
sleep 30

# ── Wait for Jenkins to restart ───────────────────────────────────────────────
until curl -sf "${JENKINS_URL}/login" > /dev/null; do sleep 5; echo "  Waiting for restart..."; done
CRUMB=$(curl -sf -u "admin:${ADMIN_PASS}" \
  "${JENKINS_URL}/crumbIssuer/api/json" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['crumbRequestField']+':'+d['crumb'])")
echo "[+] Jenkins restarted."

# ── Add EC2_PUBLIC_IP credential ──────────────────────────────────────────────
echo "[*] Adding EC2_PUBLIC_IP credential..."
curl -sf -X POST \
  -u "admin:${ADMIN_PASS}" \
  -H "$CRUMB" \
  "${JENKINS_URL}/credentials/store/system/domain/_/createCredentials" \
  --data-urlencode "json={
    \"\": \"0\",
    \"credentials\": {
      \"scope\": \"GLOBAL\",
      \"id\": \"EC2_PUBLIC_IP\",
      \"description\": \"EC2 Public IP\",
      \"secret\": \"${EC2_IP}\",
      \"\$class\": \"org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl\"
    }
  }" > /dev/null
echo "[+] EC2_PUBLIC_IP credential added."

# ── Add SMTP_SENDER_EMAIL credential ─────────────────────────────────────────
echo "[*] Adding SMTP_SENDER_EMAIL credential..."
curl -sf -X POST \
  -u "admin:${ADMIN_PASS}" \
  -H "$CRUMB" \
  "${JENKINS_URL}/credentials/store/system/domain/_/createCredentials" \
  --data-urlencode "json={
    \"\": \"0\",
    \"credentials\": {
      \"scope\": \"GLOBAL\",
      \"id\": \"SMTP_SENDER_EMAIL\",
      \"description\": \"SMTP Sender Email\",
      \"secret\": \"${SMTP_EMAIL}\",
      \"\$class\": \"org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl\"
    }
  }" > /dev/null
echo "[+] SMTP_SENDER_EMAIL credential added."

# ── Configure Extended Email ──────────────────────────────────────────────────
echo "[*] Configuring SMTP email settings..."
cat > /tmp/email-config.groovy << GROOVY
import jenkins.model.*
import hudson.plugins.emailext.*

def desc = Jenkins.instance.getDescriptor(ExtendedEmailPublisher.class)
desc.smtpAuthUsername = "${SMTP_EMAIL}"
desc.smtpAuthPassword = "${SMTP_APP_PASS}"
desc.smtpHost = "smtp.gmail.com"
desc.smtpPort = "587"
desc.useSsl = false
desc.useTls = true
desc.defaultSuffix = "@gmail.com"
desc.defaultReplyTo = "${SMTP_EMAIL}"
desc.save()
println "Email configured."
GROOVY

curl -sf -X POST \
  -u "admin:${ADMIN_PASS}" \
  -H "$CRUMB" \
  "${JENKINS_URL}/scriptText" \
  --data-urlencode "script@/tmp/email-config.groovy" > /dev/null
echo "[+] Email configured."

# ── Create Assignment 3 Pipeline Job ─────────────────────────────────────────
echo "[*] Creating Assignment3-Pipeline job..."
cat > /tmp/job-config.xml << XML
<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>Auto-Lens CI/CD - Assignment 3 (Build + Test + Email)</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <com.coravy.hudson.plugins.github.GithubProjectProperty plugin="github">
      <projectUrl>${REPO_URL}</projectUrl>
    </com.coravy.hudson.plugins.github.GithubProjectProperty>
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
          <url>${REPO_URL}</url>
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

curl -sf -X POST \
  -u "admin:${ADMIN_PASS}" \
  -H "$CRUMB" \
  "${JENKINS_URL}/createItem?name=Assignment3-Pipeline" \
  -H "Content-Type: application/xml" \
  --data-binary @/tmp/job-config.xml > /dev/null
echo "[+] Assignment3-Pipeline job created."

echo ""
echo "=============================================="
echo " JENKINS SETUP COMPLETE"
echo " Jenkins : http://${EC2_IP}:8080"
echo " Job     : Assignment3-Pipeline"
echo ""
echo " NEXT: Add GitHub webhook:"
echo "   URL: http://${EC2_IP}:8080/github-webhook/"
echo "   Trigger: push events"
echo "=============================================="
