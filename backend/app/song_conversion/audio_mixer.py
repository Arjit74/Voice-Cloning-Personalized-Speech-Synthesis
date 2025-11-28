"""Audio mixing and effects for song generation."""

import numpy as np
import soundfile as sf
from pathlib import Path
from typing import Tuple, Optional
import subprocess
import sys


class AudioMixer:
    """Mixes vocals with instrumental and applies effects."""
    
    @staticmethod
    def normalize_audio(audio: np.ndarray, target_db: float = -3.0) -> np.ndarray:
        """
        Normalize audio to target dB level.
        
        Args:
            audio: Audio array
            target_db: Target peak level in dB (default -3dB is professional standard)
            
        Returns:
            Normalized audio
        """
        # Convert dB to linear
        target_linear = 10 ** (target_db / 20.0)
        
        # Find current peak
        current_peak = np.max(np.abs(audio))
        
        if current_peak > 0:
            # Scale to target
            audio = audio * (target_linear / current_peak)
        
        # Clip to prevent distortion
        audio = np.clip(audio, -1.0, 1.0)
        
        return audio
    
    @staticmethod
    def add_reverb(audio: np.ndarray, sr: int = 16000, room_scale: float = 0.3, 
                   delay_ms: float = 50) -> np.ndarray:
        """
        Add simple reverb effect.
        
        Args:
            audio: Input audio
            sr: Sample rate
            room_scale: Reverb amount (0-1)
            delay_ms: Delay in milliseconds
            
        Returns:
            Audio with reverb
        """
        delay_samples = int((delay_ms / 1000.0) * sr)
        
        # Create delayed version
        delayed = np.zeros_like(audio)
        if delay_samples < len(audio):
            delayed[delay_samples:] = audio[:-delay_samples]
        
        # Mix original with delayed
        reverb = audio + room_scale * delayed
        
        return reverb
    
    @staticmethod
    def compress_audio(audio: np.ndarray, threshold: float = 0.6, ratio: float = 4.0) -> np.ndarray:
        """
        Apply dynamic range compression.
        
        Args:
            audio: Input audio
            threshold: Compression threshold (0-1)
            ratio: Compression ratio
            
        Returns:
            Compressed audio
        """
        # Simple peak compression
        abs_audio = np.abs(audio)
        
        # Find samples above threshold
        mask = abs_audio > threshold
        
        # Apply compression to loud parts
        audio[mask] = np.sign(audio[mask]) * (threshold + (abs_audio[mask] - threshold) / ratio)
        
        return audio
    
    @staticmethod
    def mix_audio(vocal: np.ndarray, instrumental: np.ndarray, 
                  vocal_level: float = 0.7, instrumental_level: float = 0.3,
                  add_reverb: bool = True, add_compression: bool = True,
                  sr: int = 16000) -> np.ndarray:
        """
        Mix vocals and instrumental with effects.
        
        Args:
            vocal: Vocal audio
            instrumental: Instrumental audio
            vocal_level: Vocal volume level (0-1)
            instrumental_level: Instrumental volume level (0-1)
            add_reverb: Whether to add reverb to vocals
            add_compression: Whether to add compression
            sr: Sample rate
            
        Returns:
            Mixed audio
        """
        print("[AudioMixer] Normalizing tracks...")
        
        # Normalize individual tracks
        vocal = AudioMixer.normalize_audio(vocal, -6.0)  # Vocals a bit quieter initially
        instrumental = AudioMixer.normalize_audio(instrumental, -6.0)
        
        print("[AudioMixer] Adding effects...")
        
        # Add reverb to vocals
        if add_reverb:
            vocal = AudioMixer.add_reverb(vocal, sr, room_scale=0.2, delay_ms=40)
        
        # Apply compression
        if add_compression:
            vocal = AudioMixer.compress_audio(vocal, threshold=0.5, ratio=3.0)
        
        print("[AudioMixer] Mixing tracks...")
        
        # Ensure same length
        min_len = min(len(vocal), len(instrumental))
        vocal = vocal[:min_len]
        instrumental = instrumental[:min_len]
        
        # Mix with specified levels
        mixed = vocal_level * vocal + instrumental_level * instrumental
        
        # Normalize final mix
        mixed = AudioMixer.normalize_audio(mixed, -3.0)
        
        print(f"[AudioMixer] Mix complete - Peak: {np.max(np.abs(mixed)):.4f}")
        
        return mixed
    
    @staticmethod
    def save_audio(audio: np.ndarray, output_path: Path, sr: int = 16000) -> None:
        """
        Save audio to file.
        
        Args:
            audio: Audio array
            output_path: Output file path
            sr: Sample rate
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        print(f"[AudioMixer] Saving to {output_path}")
        sf.write(output_path, audio, sr)
        print(f"[AudioMixer] Saved successfully")
    
    @staticmethod
    def mix_and_save(vocal: np.ndarray, instrumental: np.ndarray, 
                     output_path: Path, sr: int = 16000,
                     add_effects: bool = True) -> Path:
        """
        Mix audio and save to file.
        
        Args:
            vocal: Vocal audio
            instrumental: Instrumental audio
            output_path: Output file path
            sr: Sample rate
            add_effects: Whether to add effects
            
        Returns:
            Output file path
        """
        mixed = AudioMixer.mix_audio(
            vocal, instrumental,
            add_reverb=add_effects,
            add_compression=add_effects,
            sr=sr
        )
        
        AudioMixer.save_audio(mixed, output_path, sr)
        
        return Path(output_path)
