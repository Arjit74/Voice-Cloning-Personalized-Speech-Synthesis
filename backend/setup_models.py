#!/usr/bin/env python
"""Download models on-demand (runs once on first deployment)."""

import os
import sys
from pathlib import Path

def setup_models():
    """Ensure all required models are available."""
    
    print("[Setup] Checking model requirements...")
    
    # Ensure backend/models directory exists
    models_dir = Path(__file__).parent.parent / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    
    mms_model_dir = models_dir / "tts" / "tts_models--hin--facebook--mms-tts-hin"
    
    if mms_model_dir.exists() and (mms_model_dir / "model.pth").exists():
        print(f"[Setup] ✓ MMS model already present: {mms_model_dir}")
        return True
    
    print("[Setup] Downloading Facebook MMS Hindi model (200MB, first time only)...")
    print("[Setup] This may take 2-3 minutes on first deployment...")
    
    try:
        from TTS.api import TTS
        
        os.environ['TTS_HOME'] = str(models_dir)
        
        # MMS doesn't require TOS, loads directly
        tts = TTS(
            model_name="tts_models/hin/facebook/mms-tts-hin",
            gpu=False,
            progress_bar=False
        )
        print("[Setup] ✓ MMS model downloaded successfully")
        
        # Verify model exists
        if (mms_model_dir / "model.pth").exists():
            print(f"[Setup] ✓ Model verified at: {mms_model_dir}")
            return True
        else:
            print(f"[Setup] ✗ Model not found at expected location: {mms_model_dir}")
            return False
                
    except Exception as e:
        print(f"[Setup] ✗ Failed to download MMS model: {e}")
        print("[Setup] Hindi synthesis will not be available")
        return False

if __name__ == "__main__":
    success = setup_models()
    sys.exit(0 if success else 1)
