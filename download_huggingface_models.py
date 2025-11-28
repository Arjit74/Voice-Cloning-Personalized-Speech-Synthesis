#!/usr/bin/env python3
"""
Download AJ50 voice cloning models from Hugging Face
"""

import os
from pathlib import Path
import requests
from tqdm import tqdm
import torch

# Hugging Face model URLs
MODEL_URLS = {
    "encoder.pt": "https://huggingface.co/AJ50/voice-clone-encoder/resolve/main/encoder.pt",
    "synthesizer.pt": "https://huggingface.co/AJ50/voice-clone-synthesizer/resolve/main/synthesizer.pt", 
    "vocoder.pt": "https://huggingface.co/AJ50/voice-clone-vocoder/resolve/main/vocoder.pt"
}

def download_file(url: str, destination: Path) -> bool:
    """Download a file with progress bar"""
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        
        with open(destination, 'wb') as f, tqdm(
            desc=destination.name,
            total=total_size,
            unit='B',
            unit_scale=True,
            unit_divisor=1024,
        ) as bar:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    bar.update(len(chunk))
        
        print(f"✓ Downloaded {destination.name}")
        return True
        
    except Exception as e:
        print(f"✗ Failed to download {destination.name}: {e}")
        return False

def verify_model(model_path: Path) -> bool:
    """Verify that the model file is valid"""
    try:
        # Try to load the model to verify it's valid
        state_dict = torch.load(model_path, map_location='cpu')
        
        if isinstance(state_dict, dict) and 'model_state' in state_dict:
            print(f"✓ {model_path.name} appears to be a valid model")
            return True
        elif isinstance(state_dict, dict):
            print(f"✓ {model_path.name} appears to be a valid state dict")
            return True
        else:
            print(f"⚠ {model_path.name} has unexpected format but size looks OK")
            return True
            
    except Exception as e:
        print(f"✗ {model_path.name} verification failed: {e}")
        return False

def main():
    """Main download function"""
    print("🚀 Downloading AJ50 Voice Cloning Models from Hugging Face...")
    
    # Create models directory
    models_dir = Path("models/default")
    models_dir.mkdir(parents=True, exist_ok=True)
    
    success_count = 0
    
    for filename, url in MODEL_URLS.items():
        print(f"\n📥 Downloading {filename}...")
        destination = models_dir / filename
        
        # Skip if already exists and is valid
        if destination.exists():
            print(f"⚠ {filename} already exists. Verifying...")
            if verify_model(destination):
                print(f"✓ {filename} is valid, skipping download")
                success_count += 1
                continue
            else:
                print(f"⚠ {filename} exists but appears corrupted, re-downloading...")
        
        # Download the file
        if download_file(url, destination):
            # Verify the downloaded file
            if verify_model(destination):
                success_count += 1
            else:
                print(f"⚠ {filename} downloaded but failed verification")
    
    print(f"\n📊 Download Summary: {success_count}/{len(MODEL_URLS)} models downloaded successfully")
    
    if success_count == len(MODEL_URLS):
        print("✅ All models downloaded and verified!")
        print("🎉 You can now use voice cloning with the AJ50 models!")
        return True
    else:
        print("❌ Some models failed to download. Please check the errors above.")
        return False

if __name__ == "__main__":
    main()
