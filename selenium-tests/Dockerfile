FROM selenium/standalone-chrome:latest

USER root

# Install Python and pip
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Create a virtual environment and install dependencies
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy tests
COPY . .

# Run pytest
CMD ["pytest", "test_autolens.py", "-v", "--html=report.html", "--self-contained-html"]
