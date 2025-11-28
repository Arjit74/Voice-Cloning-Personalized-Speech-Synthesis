"""Gunicorn entry point for the voice cloning backend."""

import sys
from pathlib import Path

# Add the backend directory to Python path for imports
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app import app


if __name__ == "__main__":
    app.run()
