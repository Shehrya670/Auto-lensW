#!/bin/bash
set -e

JENKINS_URL="http://localhost:8080"
JENKINS_USER="admin"
JENKINS_PASS="admin123"
EC2_IP="13.50.105.251"

echo "[*] Getting Jenkins crumb..."
# Use grep and sed to extract crumb, avoiding python/jq dependency
CRUMB_JSON=$(curl -sf -u "$JENKINS_USER:$JENKINS_PASS" "$JENKINS_URL/crumbIssuer/api/json")
CRUMB_HEADER=$(echo "$CRUMB_JSON" | grep -o '"crumbRequestField":"[^"]*' | cut -d'"' -f4)
CRUMB_VALUE=$(echo "$CRUMB_JSON" | grep -o '"crumb":"[^"]*' | cut -d'"' -f4)

echo "  Crumb Header: $CRUMB_HEADER"
echo "  Crumb Value: $CRUMB_VALUE"

# ── Add EC2_PUBLIC_IP credential ──
echo "[*] Adding EC2_PUBLIC_IP credential..."
curl -sf -u "$JENKINS_USER:$JENKINS_PASS" \
  -H "$CRUMB_HEADER:$CRUMB_VALUE" \
  -H "Content-Type: application/xml" \
  -d "<org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl>
    <scope>GLOBAL</scope>
    <id>EC2_PUBLIC_IP</id>
    <description>EC2 Public IP Address</description>
    <secret>$EC2_IP</secret>
  </org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl>" \
  "$JENKINS_URL/manage/credentials/store/system/domain/_/createCredentials" \
  && echo "  OK" || echo "  (may already exist)"

# ── Add SMTP_SENDER_EMAIL credential ──
echo "[*] Adding SMTP_SENDER_EMAIL credential..."
curl -sf -u "$JENKINS_USER:$JENKINS_PASS" \
  -H "$CRUMB_HEADER:$CRUMB_VALUE" \
  -H "Content-Type: application/xml" \
  -d "<org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl>
    <scope>GLOBAL</scope>
    <id>SMTP_SENDER_EMAIL</id>
    <description>SMTP Sender Email</description>
    <secret>autolens.cicd@gmail.com</secret>
  </org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl>" \
  "$JENKINS_URL/manage/credentials/store/system/domain/_/createCredentials" \
  && echo "  OK" || echo "  (may already exist)"

# ── Create Pipeline Job ──
echo "[*] Creating Assignment3-Pipeline job..."
curl -sf -u "$JENKINS_USER:$JENKINS_PASS" \
  -H "$CRUMB_HEADER:$CRUMB_VALUE" \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0" encoding="UTF-8"?>
<flow-definition plugin="workflow-job">
  <description>Auto-Lens CI/CD Pipeline - Assignment 3</description>
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
</flow-definition>' \
  "$JENKINS_URL/createItem?name=Assignment3-Pipeline" \
  && echo "  OK" || echo "  (may already exist)"

echo "======================================"
echo " Jenkins Setup Complete!"
echo " URL: http://$EC2_IP:8080"
echo " Job: Assignment3-Pipeline"
echo "======================================"
