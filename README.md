# Auto-Lens: Automated CI/CD Deployment

Auto-Lens is a full-stack web application designed for car listings, featuring a React frontend, Node.js/Express backend, and a PostgreSQL database. This repository demonstrates a complete DevOps lifecycle including containerization, automated testing, and CI/CD pipeline integration.

## 🚀 Live Demo
**Application URL:** [http://13.50.105.251:3000](http://13.50.105.251:3000)  
**Jenkins Dashboard:** [http://13.50.105.251:8080](http://13.50.105.251:8080)

## 🛠️ Technology Stack
- **Frontend:** React.js
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **DevOps:** Jenkins, Docker, Docker Compose
- **Testing:** Selenium (Python/Pytest)
- **Deployment:** AWS EC2

## 🏗️ Architecture & Pipeline
The project follows a fully automated CI/CD pipeline defined in the `Jenkinsfile`:

1. **Checkout:** Pulls the latest code from GitHub.
2. **Build:** Builds Docker images for the Backend and Frontend.
3. **Deploy:** Deploys the stack using Docker Compose on the EC2 instance.
4. **Health Check:** Verifies services are healthy before testing.
5. **Test:** Executes 15 automated Selenium test cases covering UI and functional requirements.
6. **Reporting:** Generates JUnit and HTML test reports integrated into the Jenkins UI.
7. **Cleanup:** Manages container lifecycle and system resources.

## 🧪 Automated Testing
The Selenium test suite (`selenium-tests/`) includes 15 test cases:
- Landing page and Navbar validation.
- Hero section and car search functionality.
- Protected routes and authentication redirects.
- Backend API health verification.

## ⚙️ CI/CD Setup
- **GitHub Webhooks:** Automated triggers on every `push` to the main branch.
- **Docker Compose:** Orchestrates multi-container environment.
- **Environment Management:** Dynamically injects `EC2_IP` for environment-aware builds.

---
*Developed for DevOps for Cloud Computing Assignments.*
*Last updated: 2026-05-09*
