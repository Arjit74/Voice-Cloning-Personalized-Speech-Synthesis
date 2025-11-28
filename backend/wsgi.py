"""Gunicorn entry point for the voice cloning backend."""

import sys
from pathlib import Path

# Ensure backend directory is in the path for imports
backend_dir = Path(__file__).parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app import app


if __name__ == "__main__":
    app.run()
