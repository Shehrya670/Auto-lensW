pipeline {
    agent any

    // ── Environment ──────────────────────────────────────────────────────────
    environment {
        // Docker image tags
        BACKEND_IMAGE  = "auto-lens-backend:${BUILD_NUMBER}"
        TEST_IMAGE     = "auto-lens-selenium:${BUILD_NUMBER}"

        // Application URLs reachable from within the Jenkins Docker network
        APP_URL        = "http://auto-lens-frontend:3000"
        BACKEND_URL    = "http://auto-lens-backend:5000"

        // Email: sender configured in Jenkins → Manage Jenkins → Extended E-mail
        EMAIL_SENDER   = credentials('SMTP_SENDER_EMAIL')

        // GitHub pusher email extracted from git log
        PUSHER_EMAIL   = ""
    }

    // ── Options ──────────────────────────────────────────────────────────────
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 45, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    // ── Triggers: build on every GitHub push ─────────────────────────────────
    triggers {
        githubPush()
    }

    // ═════════════════════════════════════════════════════════════════════════
    stages {

        // ── Stage 1: Checkout ─────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    // Capture the email of whoever pushed this commit
                    env.PUSHER_EMAIL = sh(
                        script: "git log -1 --pretty=format:'%ae'",
                        returnStdout: true
                    ).trim()
                    echo "Build triggered by: ${env.PUSHER_EMAIL}"
                    echo "Branch: ${env.GIT_BRANCH} | Commit: ${env.GIT_COMMIT?.take(8)}"
                }
            }
        }

        // ── Stage 2: Build ────────────────────────────────────────────────
        stage('Build') {
            steps {
                echo "Building backend Docker image: ${BACKEND_IMAGE}"
                sh "docker build -t ${BACKEND_IMAGE} ./backend"
                echo "Build complete."
            }
        }

        // ── Stage 3: Deploy ───────────────────────────────────────────────
        stage('Deploy') {
            steps {
                echo "Bringing up application stack with Docker Compose..."
                sh """
                    docker compose down --remove-orphans || true
                    docker compose up -d --build
                    echo "Waiting for services to become healthy..."
                    sleep 30
                """
                // Verify backend is alive
                sh "curl -sf ${BACKEND_URL}/healthz || (echo 'Backend health check FAILED' && exit 1)"
                echo "Application stack is up and healthy."
            }
        }

        // ── Stage 4: Test ─────────────────────────────────────────────────
        stage('Test') {
            steps {
                echo "Building Selenium test Docker image: ${TEST_IMAGE}"
                sh "docker build -t ${TEST_IMAGE} ./selenium-tests"

                echo "Running 15 Selenium test cases in headless Chrome..."
                sh """
                    docker run --rm \
                        --name auto-lens-selenium-runner \
                        --network host \
                        -e APP_URL=http://localhost:3000 \
                        -e BACKEND_URL=http://localhost:5000 \
                        -e CHROMEDRIVER_PATH=/usr/bin/chromedriver \
                        -v \$(pwd)/selenium-tests/test-results:/app/test-results \
                        ${TEST_IMAGE} \
                        pytest test_autolens.py -v --tb=short \
                            --html=test-results/report.html \
                            --self-contained-html \
                            --junit-xml=test-results/results.xml
                """
            }
            post {
                always {
                    // Archive HTML report and JUnit XML for Jenkins UI
                    publishHTML(target: [
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'selenium-tests/test-results',
                        reportFiles: 'report.html',
                        reportName: 'Selenium Test Report'
                    ])
                    junit(
                        testResults: 'selenium-tests/test-results/results.xml',
                        allowEmptyResults: true
                    )
                }
            }
        }

    } // end stages

    // ═════════════════════════════════════════════════════════════════════════
    // Post-build: email test results to the collaborator who pushed
    // ═════════════════════════════════════════════════════════════════════════
    post {
        always {
            script {
                def buildStatus  = currentBuild.currentResult ?: 'UNKNOWN'
                def buildColor   = (buildStatus == 'SUCCESS') ? '#2ecc71' : '#e74c3c'
                def statusEmoji  = (buildStatus == 'SUCCESS') ? '✅' : '❌'
                def reportLink   = "${env.BUILD_URL}Selenium_20Test_20Report/"
                def consoleLink  = "${env.BUILD_URL}console"
                def commitShort  = env.GIT_COMMIT?.take(8) ?: 'N/A'
                def branch       = env.GIT_BRANCH ?: 'N/A'
                def pusherEmail  = env.PUSHER_EMAIL ?: 'unknown'

                def emailBody = """
<html>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 700px; margin: auto;">
  <div style="background: ${buildColor}; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">
      ${statusEmoji} Auto-Lens CI/CD Pipeline – ${buildStatus}
    </h1>
  </div>
  <div style="border: 1px solid #ddd; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">

    <h2 style="color: #555; border-bottom: 1px solid #eee; padding-bottom: 8px;">Build Details</h2>
    <table style="border-collapse: collapse; width: 100%;">
      <tr><td style="padding: 6px 12px; font-weight: bold; width: 160px;">Job</td>
          <td style="padding: 6px 12px;">${env.JOB_NAME}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding: 6px 12px; font-weight: bold;">Build #</td>
          <td style="padding: 6px 12px;">${env.BUILD_NUMBER}</td></tr>
      <tr><td style="padding: 6px 12px; font-weight: bold;">Branch</td>
          <td style="padding: 6px 12px;">${branch}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding: 6px 12px; font-weight: bold;">Commit</td>
          <td style="padding: 6px 12px;">${commitShort}</td></tr>
      <tr><td style="padding: 6px 12px; font-weight: bold;">Triggered by</td>
          <td style="padding: 6px 12px;">${pusherEmail}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding: 6px 12px; font-weight: bold;">Duration</td>
          <td style="padding: 6px 12px;">${currentBuild.durationString}</td></tr>
      <tr><td style="padding: 6px 12px; font-weight: bold;">Status</td>
          <td style="padding: 6px 12px; font-weight: bold; color: ${buildColor};">${buildStatus}</td></tr>
    </table>

    <h2 style="color: #555; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-top: 24px;">
      Selenium Test Results (15 Test Cases)
    </h2>
    <p>View the full interactive HTML test report here:</p>
    <a href="${reportLink}"
       style="display:inline-block; background:${buildColor}; color:white;
              padding:10px 20px; border-radius:4px; text-decoration:none; font-weight:bold;">
      📊 Open Test Report
    </a>
    &nbsp;
    <a href="${consoleLink}"
       style="display:inline-block; background:#555; color:white;
              padding:10px 20px; border-radius:4px; text-decoration:none; font-weight:bold;">
      📋 Console Log
    </a>

    <p style="margin-top: 24px; font-size: 12px; color: #999;">
      This is an automated message from the Auto-Lens Jenkins CI/CD pipeline.<br/>
      COMSATS University Islamabad – DevOps for Cloud Computing (Spring 2026)
    </p>
  </div>
</body>
</html>
"""
                // Send to the pusher and always CC the instructor
                emailext(
                    subject: "${statusEmoji} [Auto-Lens CI] Build #${env.BUILD_NUMBER} – ${buildStatus} | Branch: ${branch}",
                    body: emailBody,
                    mimeType: 'text/html',
                    to: "${pusherEmail}",
                    from: "${env.EMAIL_SENDER}",
                    attachLog: false,
                    compressLog: false
                )
                echo "Test result email sent to: ${pusherEmail}"
            }
        }

        // Tear down the stack after the pipeline (instructor will re-trigger to bring up)
        cleanup {
            echo "Stopping Docker Compose stack..."
            sh "docker compose down --remove-orphans || true"
            sh "docker rmi ${TEST_IMAGE} || true"
            echo "Cleanup complete. Deployment is now down (as required by assignment)."
        }
    }
}
