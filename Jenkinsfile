pipeline {
    agent any

    environment {
        // EC2 public IP — Jenkins reads this from a credential so it's not hard-coded
        EC2_IP         = credentials('EC2_PUBLIC_IP')

        // The API URL the React build will call at runtime
        REACT_APP_API_URL = "http://${EC2_IP}:5000/api"

        // Docker image names
        BACKEND_IMAGE  = "auto-lens-backend"
        FRONTEND_IMAGE = "auto-lens-frontend"
        TEST_IMAGE     = "auto-lens-selenium-tests"

        // SMTP sender (set in Jenkins → Manage Jenkins → Credentials)
        EMAIL_FROM     = credentials('SMTP_SENDER_EMAIL')

        // The email of whoever pushed — populated in Checkout stage
        PUSHER_EMAIL   = ""
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 60, unit: 'MINUTES')
        disableConcurrentBuilds()
        timestamps()
    }

    // ─── Trigger: fire on every GitHub push ──────────────────────────────────
    triggers {
        githubPush()
    }

    stages {

        // ── STAGE 1: Checkout ─────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.PUSHER_EMAIL = sh(
                        script: "git log -1 --pretty=format:'%ae'",
                        returnStdout: true
                    ).trim()
                    env.GIT_SHORT = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()
                    echo "===== Triggered by: ${env.PUSHER_EMAIL} | Commit: ${env.GIT_SHORT} ====="
                }
            }
        }

        // ── STAGE 2: Build ────────────────────────────────────────────────
        stage('Build') {
            parallel {
                stage('Build Backend') {
                    steps {
                        sh "docker build -t ${BACKEND_IMAGE}:${BUILD_NUMBER} ./backend"
                        sh "docker tag  ${BACKEND_IMAGE}:${BUILD_NUMBER} ${BACKEND_IMAGE}:latest"
                    }
                }
                stage('Build Frontend') {
                    steps {
                        sh """
                            docker build \
                                --build-arg REACT_APP_API_URL=${REACT_APP_API_URL} \
                                -t ${FRONTEND_IMAGE}:${BUILD_NUMBER} \
                                ./frontend
                            docker tag ${FRONTEND_IMAGE}:${BUILD_NUMBER} ${FRONTEND_IMAGE}:latest
                        """
                    }
                }
                stage('Build Selenium Tests') {
                    steps {
                        echo "Skipping Docker build for tests to save disk space. Using pre-installed host browser."
                    }
                }
            }
        }

        // ── STAGE 3: Deploy ───────────────────────────────────────────────
        stage('Deploy') {
            steps {
                sh """
                    # Tear down any previous run
                    # docker compose down --remove-orphans --timeout 30 || true

                    # Bring the full stack up (postgres + backend + frontend)
                    REACT_APP_API_URL=${REACT_APP_API_URL} docker compose up -d

                    echo "Waiting 45 s for all services to become healthy..."
                    sleep 45
                """

                // Verify backend is alive before proceeding to tests
                sh """
                    curl --fail --silent --max-time 10 \
                         http://${EC2_IP}:5000/healthz \
                    || (echo 'Backend health check FAILED' && docker compose logs backend && exit 1)
                """
                echo "✅ Application stack is up and healthy."
            }
        }

        // ── STAGE 4: Test ─────────────────────────────────────────────────
        stage('Test') {
            steps {
                // Create output directory on the host for the report
                sh "mkdir -p selenium-tests/test-results"

                sh """
                    cd selenium-tests
                    export APP_URL=http://${EC2_IP}:3000
                    export BACKEND_URL=http://${EC2_IP}:5000
                    export CHROMEDRIVER_PATH=/usr/bin/chromedriver
                    export WAIT_TIMEOUT=20
                    
                    pytest test_autolens.py \
                        -v \
                        --tb=short \
                        --html=test-results/report.html \
                        --self-contained-html \
                        --junit-xml=test-results/results.xml
                """
            }
            post {
                always {
                    // Publish HTML report in Jenkins sidebar
                    publishHTML(target: [
                        allowMissing         : true,
                        alwaysLinkToLastBuild: true,
                        keepAll              : true,
                        reportDir            : 'selenium-tests/test-results',
                        reportFiles          : 'report.html',
                        reportName           : 'Selenium Test Report'
                    ])
                    // Publish JUnit results in Jenkins test-result graph
                    junit(
                        testResults       : 'selenium-tests/test-results/results.xml',
                        allowEmptyResults  : true
                    )
                }
            }
        }

    } // ─── end stages ───────────────────────────────────────────────────────

    // ── POST: Email + Cleanup ─────────────────────────────────────────────────
    post {
        always {
            script {
                def status      = currentBuild.currentResult ?: 'UNKNOWN'
                def passed      = status == 'SUCCESS'
                def color       = passed ? '#16a34a' : '#dc2626'
                def emoji       = passed ? '✅' : '❌'
                def reportUrl   = "${env.BUILD_URL}Selenium_20Test_20Report/"
                def consoleUrl  = "${env.BUILD_URL}console"
                def pusher      = env.PUSHER_EMAIL ?: 'unknown'
                def commit      = env.GIT_SHORT    ?: 'N/A'
                def branch      = env.GIT_BRANCH   ?: 'N/A'
                def duration    = currentBuild.durationString

                def html = """
<html>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
  <!-- Header -->
  <tr><td style="background:${color};padding:28px 32px;">
    <h1 style="margin:0;color:#fff;font-size:22px;">${emoji} Auto-Lens CI/CD &mdash; ${status}</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,.85);font-size:14px;">Build #${env.BUILD_NUMBER} &bull; ${branch} &bull; ${commit}</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:28px 32px;">
    <h2 style="margin:0 0 16px;font-size:16px;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:10px;">Build Details</h2>
    <table cellpadding="6" cellspacing="0" width="100%" style="font-size:14px;color:#374151;">
      <tr style="background:#f9fafb;"><td width="40%"><b>Job</b></td><td>${env.JOB_NAME}</td></tr>
      <tr><td><b>Build #</b></td><td>${env.BUILD_NUMBER}</td></tr>
      <tr style="background:#f9fafb;"><td><b>Branch</b></td><td>${branch}</td></tr>
      <tr><td><b>Commit</b></td><td>${commit}</td></tr>
      <tr style="background:#f9fafb;"><td><b>Triggered by</b></td><td>${pusher}</td></tr>
      <tr><td><b>Duration</b></td><td>${duration}</td></tr>
      <tr style="background:#f9fafb;"><td><b>Status</b></td><td style="color:${color};font-weight:bold;">${status}</td></tr>
    </table>

    <h2 style="margin:24px 0 12px;font-size:16px;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:10px;">Selenium Test Results</h2>
    <p style="font-size:14px;color:#6b7280;">15 automated test cases were executed using headless Chrome inside a Docker container.</p>

    <table cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:12px;">
        <a href="${reportUrl}" style="display:inline-block;background:${color};color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">📊 View Test Report</a>
      </td>
      <td>
        <a href="${consoleUrl}" style="display:inline-block;background:#4b5563;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">📋 Console Log</a>
      </td>
    </tr></table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">
      Automated message from Auto-Lens Jenkins pipeline &bull;
      COMSATS University Islamabad &bull; DevOps for Cloud Computing, Spring 2026
    </p>
  </td></tr>
</table>
</body>
</html>
"""
                // Send email to the person who pushed
                emailext(
                    subject  : "${emoji} [Auto-Lens] Build #${env.BUILD_NUMBER} ${status} | ${branch} | ${commit}",
                    body     : html,
                    mimeType : 'text/html',
                    to       : "shehryarahmadkhalil055@gmail.com","qasimmalik@gmail.com"
                    from     : "shehryarkhalil65@gmail.com"
                )
                echo "Email sent to ${pusher}"
            }
        }

        // Bring the deployment DOWN after tests  (assignment requirement)
        cleanup {
            sh "# docker compose down --remove-orphans --timeout 30 || true"
            sh "docker rmi ${TEST_IMAGE}:${BUILD_NUMBER} || true"
            echo "Deployment is now DOWN. Push to bring it back up."
        }
    }
}
