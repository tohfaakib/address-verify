# ---------- Base image for Selenium + Chromium ----------
    FROM python:3.9-slim-bookworm AS base

    # Set environment variables
    ENV PYTHONUNBUFFERED=1 \
        PYTHONDONTWRITEBYTECODE=1 \
        CHROME_BIN=/usr/bin/chromium
    
    # Install system dependencies
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        build-essential \
        git \
        chromium \
        chromium-driver \
        firefox-esr \
        wget \
        unzip \
        xvfb \
        curl \
        ca-certificates \
        gnupg \
        supervisor \
    ; \
    rm -rf /var/lib/apt/lists/*
    
    # Create required dirs
    RUN mkdir -p /usr/local/uc && cp /usr/bin/chromedriver /usr/local/uc/chromedriver
    
    # ---------- Set up working directory ----------
    WORKDIR /app
    
    # ---------- Install Node.js (v18 LTS via NodeSource) ----------
    RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
        apt-get install -y nodejs && node -v && npm -v
    
    # ---------- Copy app code ----------
    COPY . /app
    
    # ---------- Install Node.js deps ----------
    RUN npm install
    
    # ---------- Install Python deps ----------
    COPY scraper/requirements.txt /app/scraper/requirements.txt
    RUN pip install --no-cache-dir -r /app/scraper/requirements.txt
    
    # ---------- Supervisor config ----------
    COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
    
    # Expose ports
    EXPOSE 3000 8000
    
    # ---------- Start supervisor ----------
    CMD ["/usr/bin/supervisord"]
    
    # If you truly need chromedriver copied elsewhere:
RUN mkdir -p /usr/local/uc && cp /usr/bin/chromedriver /usr/local/uc/chromedriver