FROM python:3.10-slim

# Avoid prompts from apt during build
ENV DEBIAN_FRONTEND=noninteractive

# ── Install Chromium and ChromeDriver ─────────────────────────────────────────
RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends \
       chromium \
       chromium-driver \
    && rm -rf /var/lib/apt/lists/*

# ── Python dependencies ────────────────────────────────────────────────────────
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Application code ───────────────────────────────────────────────────────────
COPY . .

# Set webdriver-manager environment variables to use system chromium if necessary
ENV CHROME_EXECUTABLE_PATH=/usr/bin/chromium

CMD ["pytest", "test_autolens.py", "-v", "--html=report.html", "--self-contained-html"]
