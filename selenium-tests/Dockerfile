# ── Selenium Test Runner Image ────────────────────────────────────────────────
# Python 3.11 + Google Chrome stable + matching ChromeDriver
# Built for linux/amd64 (AWS EC2 t2/t3)
# ──────────────────────────────────────────────────────────────────────────────

FROM python:3.11-slim

# ── System dependencies ───────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        wget curl gnupg unzip ca-certificates \
        fonts-liberation libatk-bridge2.0-0 libatk1.0-0 \
        libcairo2 libcups2 libdbus-1-3 libdrm2 libexpat1 libgbm1 \
        libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 \
        libpangocairo-1.0-0 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
        libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 \
        libxrender1 libxss1 libxtst6 xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# ── Google Chrome stable ───────────────────────────────────────────────────────
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub \
        | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] \
       http://dl.google.com/linux/chrome/deb/ stable main" \
       > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# ── ChromeDriver (version-matched) ────────────────────────────────────────────
RUN CHROME_VER=$(google-chrome --version | grep -oP '\d+' | head -1) \
    && echo "Chrome major version: ${CHROME_VER}" \
    && DRIVER_URL=$(curl -fsSL \
         "https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json" \
         | python3 -c "
import sys, json
data = json.load(sys.stdin)
major = '${CHROME_VER}'
# Find latest entry whose version starts with our major
matches = [v for v in data['versions'] if v['version'].startswith(major + '.')]
entry   = matches[-1] if matches else data['versions'][-1]
drivers = [d for d in entry['downloads'].get('chromedriver', []) if d['platform'] == 'linux64']
print(drivers[0]['url'] if drivers else '')
") \
    && echo "ChromeDriver URL: ${DRIVER_URL}" \
    && if [ -n "${DRIVER_URL}" ]; then \
         wget -q -O /tmp/chromedriver.zip "${DRIVER_URL}" \
         && unzip -q /tmp/chromedriver.zip -d /tmp/chromedriver_dir \
         && find /tmp/chromedriver_dir -name "chromedriver" -exec mv {} /usr/bin/chromedriver \; \
         && chmod +x /usr/bin/chromedriver \
         && rm -rf /tmp/chromedriver.zip /tmp/chromedriver_dir; \
       else \
         echo "WARNING: ChromeDriver URL empty, webdriver-manager will be used at runtime"; \
       fi

# ── Python dependencies ────────────────────────────────────────────────────────
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Test files ────────────────────────────────────────────────────────────────
COPY . .
RUN mkdir -p test-results

# ── Runtime env (overridden by Jenkins -e flags) ──────────────────────────────
ENV APP_URL=http://localhost:3000
ENV BACKEND_URL=http://localhost:5000
ENV CHROMEDRIVER_PATH=/usr/bin/chromedriver
ENV WAIT_TIMEOUT=20

CMD ["pytest", "test_autolens.py", "-v", \
     "--tb=short", \
     "--html=test-results/report.html", "--self-contained-html", \
     "--junit-xml=test-results/results.xml"]
