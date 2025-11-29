FROM python:3.11-slim

# Install system dependencies including BLAS/LAPACK for scipy
RUN apt-get update && apt-get install -y \
    build-essential \
    libsndfile1 \
    libsndfile1-dev \
    ffmpeg \
    git \
    libblas-dev liblapack-dev gfortran \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend requirements first
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn

# Copy entire application
COPY . .

# Expose port for HuggingFace Spaces (uses 7860)
EXPOSE 7860

# Setup models on startup (download if needed)
RUN echo "#!/bin/bash\npython /app/backend/setup_models.py\ngunicorn --bind 0.0.0.0:7860 --workers 2 --timeout 300 --access-logfile - --error-logfile - backend.wsgi:app" > /app/start.sh && chmod +x /app/start.sh

# Run startup script
CMD ["/app/start.sh"]
