#!/bin/bash

# Azure App Service startup script
# This runs when the app starts

echo "Starting Voice Cloning Backend..."

# Install/upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Create necessary directories
mkdir -p models/default
mkdir -p enrolled_voices
mkdir -p outputs

# Download models if they don't exist (optional - can be done manually)
# python -c "from utils.default_models import ensure_default_models; ensure_default_models(Path('models'))"

echo "Setup complete. Starting Flask app..."

# Start the Flask app with gunicorn
gunicorn --bind 0.0.0.0:8000 \
         --workers 1 \
         --timeout 300 \
         --access-logfile - \
         --error-logfile - \
         api_server:app
