FROM python:3.10-slim

# Avoid prompts from apt during build
ENV DEBIAN_FRONTEND=noninteractive

# ── Install Chromium and ChromeDriver ─────────────────────────────────────────
RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends \
       chromium \
       chromium-driver \
       curl \
    && rm -rf /var/lib/apt/lists/*

# Verify installation
RUN chromium --version && chromedriver --version

# ── Python dependencies ────────────────────────────────────────────────────────
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Application code ───────────────────────────────────────────────────────────
COPY . .

# ── Chromedriver environment ───────────────────────────────────────────────────
ENV CHROME_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROMEDRIVER_PATH=/usr/bin/chromedriver

# ── Default command ───────────────────────────────────────────────────────────
CMD ["pytest", "test_autolens.py", "-v", "--tb=short", \
     "--html=test-results/report.html", "--self-contained-html", \
     "--junit-xml=test-results/results.xml"]
