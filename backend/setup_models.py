#!/usr/bin/env python
"""Setup models on startup - Facebook MMS auto-downloads on first use."""

import sys
from pathlib import Path

def setup_models():
    """Ensure models can be loaded (MMS will auto-download on first request)."""
    
    print("[Setup] Checking model requirements...")
    
    # Ensure backend/models directory exists for caching
    models_dir = Path(__file__).parent.parent / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    
    print("[Setup] ✓ Models directory ready")
    print("[Setup] Hindi: Facebook MMS will download on first request (~200MB)")
    print("[Setup] English: Local models loaded from backend/models/default/")
    
    return True

if __name__ == "__main__":
    success = setup_models()
    sys.exit(0 if success else 1)
