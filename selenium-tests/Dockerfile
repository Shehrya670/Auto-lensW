# ── Selenium Test Runner ──────────────────────────────────────────────────────
# Base image: Python 3.11 slim with Chrome + ChromeDriver pre-installed
# Compatible with the markhobson/maven-chrome approach but using Python/pytest
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.11-slim

# Install system deps: Chrome, ChromeDriver, and supporting libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
        wget \
        gnupg \
        curl \
        unzip \
        ca-certificates \
        fonts-liberation \
        libnss3 \
        libatk-bridge2.0-0 \
        libx11-xcb1 \
        libxcomposite1 \
        libxcursor1 \
        libxdamage1 \
        libxi6 \
        libxtst6 \
        libxrandr2 \
        libasound2 \
        libpangocairo-1.0-0 \
        libpango-1.0-0 \
        libcairo2 \
        libgbm1 \
        libxss1 \
        libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome (stable)
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
       > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Install matching ChromeDriver
RUN CHROME_VERSION=$(google-chrome --version | awk '{print $3}' | cut -d. -f1) \
    && DRIVER_URL=$(curl -fsSL "https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json" \
         | python3 -c "import sys,json; data=json.load(sys.stdin); versions=[v for v in data['versions'] if v['version'].startswith('${CHROME_VERSION}.')]; entry=versions[-1] if versions else data['versions'][-1]; dl=[d for d in entry['downloads'].get('chromedriver',[]) if d['platform']=='linux64']; print(dl[0]['url'] if dl else '')") \
    && if [ -n "$DRIVER_URL" ]; then \
         wget -q -O /tmp/chromedriver.zip "$DRIVER_URL" \
         && unzip -q /tmp/chromedriver.zip -d /tmp/ \
         && find /tmp -name "chromedriver" -exec mv {} /usr/bin/chromedriver \; \
         && chmod +x /usr/bin/chromedriver \
         && rm /tmp/chromedriver.zip; \
       else \
         echo "ChromeDriver URL not found, will use webdriver-manager at runtime"; \
       fi

WORKDIR /app

# Install Python test dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy test files
COPY . .

# Create output directory for HTML report
RUN mkdir -p test-results

# Default environment (overridden at runtime by Jenkins)
ENV APP_URL=http://auto-lens-frontend:3000
ENV BACKEND_URL=http://backend:5000
ENV CHROMEDRIVER_PATH=/usr/bin/chromedriver

# Run tests and produce HTML report
CMD ["pytest", "test_autolens.py", "-v", "--tb=short", "--html=test-results/report.html", "--self-contained-html"]
