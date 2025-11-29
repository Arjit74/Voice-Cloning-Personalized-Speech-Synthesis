"""Vocal separation using Demucs model."""

import torch
import numpy as np
import librosa
import soundfile as sf
from pathlib import Path
from typing import Tuple
import sys

try:
    from demucs.pretrained import get_model
    DEMUCS_AVAILABLE = True
except ImportError:
    DEMUCS_AVAILABLE = False
    print("[Warning] Demucs not available. Song conversion will not work.")


class VocalSeparator:
    """Separates vocals from instrumental music using Demucs."""
    
    def __init__(self, model_name: str = "htdemucs", device: str = None):
        """
        Initialize vocal separator.
        
        Args:
            model_name: Demucs model to use ('htdemucs', 'mdx_extra', etc.)
            device: 'cuda' or 'cpu'. Auto-detects if None.
        """
        if not DEMUCS_AVAILABLE:
            raise RuntimeError("Demucs not installed. Install with: pip install demucs")
        
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"[VocalSeparator] Loading {model_name} on {self.device}...")
        
        self.model = get_model(model_name)
        self.model = self.model.to(self.device)
        self.model.eval()
        
        print(f"[VocalSeparator] Model loaded successfully")
    
    def separate(self, audio_path: Path, sr: int = 16000) -> Tuple[np.ndarray, np.ndarray]:
        """
        Separate vocals and instrumental from audio file.
        
        Args:
            audio_path: Path to audio file
            sr: Sample rate (default 16000)
            
        Returns:
            Tuple of (vocals, instrumental) as numpy arrays
        """
        print(f"[VocalSeparator] Loading audio: {audio_path}")
        
        # Load audio
        if isinstance(audio_path, str):
            audio_path = Path(audio_path)
        
        # Use librosa to load and resample
        wav, original_sr = librosa.load(str(audio_path), sr=None, mono=True)
        
        # Resample if needed
        if original_sr != sr:
            wav = librosa.resample(wav, orig_sr=original_sr, target_sr=sr)
        
        print(f"[VocalSeparator] Audio loaded: {len(wav)} samples at {sr}Hz")
        
        # Convert to tensor (Demucs expects shape: [1, channels, samples])
        wav_tensor = torch.from_numpy(wav).float().unsqueeze(0).unsqueeze(0)
        wav_tensor = wav_tensor.to(self.device)
        
        print(f"[VocalSeparator] Separating vocals and instrumental...")
        sys.stdout.flush()
        
        # Perform separation using Demucs
        with torch.no_grad():
            # Demucs model expects shape [batch, channels, samples]
            # apply() returns a list of sources: [drums, bass, other, vocals]
            sources = self.model.apply(wav_tensor)
        
        # sources is a list: [drums, bass, other, vocals]
        # We want vocals as the vocal track
        if len(sources) >= 4:
            vocals = sources[3].cpu().numpy().squeeze()  # vocals is at index 3
            instrumental = np.zeros_like(wav)
            for i in range(3):  # drums, bass, other
                instrumental += sources[i].cpu().numpy().squeeze()
        else:
            # Fallback if source count differs
            vocals = sources[-1].cpu().numpy().squeeze()
            instrumental = np.zeros_like(wav)
            for i in range(len(sources) - 1):
                instrumental += sources[i].cpu().numpy().squeeze()
        
        print(f"[VocalSeparator] Separation complete")
        print(f"[VocalSeparator] Vocals shape: {vocals.shape}")
        print(f"[VocalSeparator] Instrumental shape: {instrumental.shape}")
        
        return vocals, instrumental
    
    def separate_and_save(self, audio_path: Path, output_dir: Path, sr: int = 16000) -> Tuple[Path, Path]:
        """
        Separate vocals and save to files.
        
        Args:
            audio_path: Input audio file
            output_dir: Directory to save separated audio
            sr: Sample rate
            
        Returns:
            Tuple of (vocals_path, instrumental_path)
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        vocals, instrumental = self.separate(audio_path, sr)
        
        vocals_path = output_dir / "vocals.wav"
        instrumental_path = output_dir / "instrumental.wav"
        
        print(f"[VocalSeparator] Saving vocals to {vocals_path}")
        sf.write(vocals_path, vocals, sr)
        
        print(f"[VocalSeparator] Saving instrumental to {instrumental_path}")
        sf.write(instrumental_path, instrumental, sr)
        
        return vocals_path, instrumental_path
