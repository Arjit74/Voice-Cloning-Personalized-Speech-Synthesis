"""
Download models from HuggingFace on startup
Run this once or on container startup for Render
"""

from pathlib import Path
from huggingface_hub import hf_hub_download
import shutil
import sys

MODEL_SPECS = {
    "encoder.pt": ("AJ50/voice-clone-encoder", "encoder.pt"),
    "synthesizer.pt": ("AJ50/voice-clone-synthesizer", "synthesizer.pt"),
    "vocoder.pt": ("AJ50/voice-clone-vocoder", "vocoder.pt"),
}

def download_models(models_dir: Path) -> None:
    """Download required models from HuggingFace if missing"""
    
    target_dir = models_dir / "default"
    target_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"[Models] Target directory: {target_dir}")
    
    for filename, (repo_id, repo_filename) in MODEL_SPECS.items():
        destination = target_dir / filename
        
        # Skip if already exists
        if destination.exists():
            size_mb = destination.stat().st_size / (1024 * 1024)
            print(f"✓ {filename} already exists ({size_mb:.1f} MB)")
            continue
        
        print(f"[Models] Downloading {filename} from {repo_id}...")
        try:
            downloaded_path = Path(
                hf_hub_download(repo_id=repo_id, filename=repo_filename)
            )
            shutil.copy2(downloaded_path, destination)
            size_mb = destination.stat().st_size / (1024 * 1024)
            print(f"✓ Saved {filename} ({size_mb:.1f} MB) to {destination}")
        except Exception as e:
            print(f"✗ Failed to download {filename}: {e}")
            return False
    
    print("[Models] All models downloaded successfully!")
    return True

if __name__ == "__main__":
    backend_dir = Path(__file__).parent / "backend"
    models_dir = backend_dir / "models"
    
    success = download_models(models_dir)
    sys.exit(0 if success else 1)
