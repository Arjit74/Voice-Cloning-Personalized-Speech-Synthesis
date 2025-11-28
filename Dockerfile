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

# Note: Models will be downloaded on first request
# Skipping download_models.py to avoid build timeout on HF Spaces
# - English models: Downloaded via hf_hub_download on first voice enrollment/synthesis
# - Hindi XTTS: Downloaded via TTS library on first Hindi synthesis request

# Expose port for HuggingFace Spaces (uses 7860)
EXPOSE 7860

# Run gunicorn with optimized settings for limited memory
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--workers", "2", "--timeout", "300", "--access-logfile", "-", "--error-logfile", "-", "backend.wsgi:app"]
