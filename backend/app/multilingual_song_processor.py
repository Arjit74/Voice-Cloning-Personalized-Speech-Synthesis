"""Multilingual song processing - English and Hindi support."""

import gc
import torch
import numpy as np
from pathlib import Path
from typing import Optional
import sys

from app.song_conversion.vocal_separator import VocalSeparator
from app.song_conversion.audio_mixer import AudioMixer
from app.multilingual_tts import MultilingualTTSService, Language


class MultilingualSongProcessor:
    """
    Orchestrates song voice conversion for multiple languages.
    
    - English songs: Uses WaveRNN voice cloning
    - Hindi songs: Uses XTTS Hindi model
    """
    
    def __init__(self, models_dir: Path, hindi_model_dir: Optional[Path] = None):
        """
        Initialize multilingual song processor.
        
        Args:
            models_dir: Directory with English models
            hindi_model_dir: Directory with Hindi XTTS model
        """
        self.models_dir = Path(models_dir)
        self.hindi_model_dir = Path(hindi_model_dir) if hindi_model_dir else None
        self.separator = None
        self.tts_service = None
        self.sr = 16000
    
    def _ensure_separator(self) -> VocalSeparator:
        """Lazy load vocal separator."""
        if self.separator is None:
            print("[MultilingualSongProcessor] Initializing vocal separator...")
            self.separator = VocalSeparator(model_name="htdemucs")
        return self.separator
    
    def _ensure_tts_service(self) -> MultilingualTTSService:
        """Lazy load TTS service."""
        if self.tts_service is None:
            print("[MultilingualSongProcessor] Initializing multilingual TTS service...")
            self.tts_service = MultilingualTTSService(
                models_dir=self.models_dir,
                hindi_model_dir=self.hindi_model_dir
            )
        return self.tts_service
    
    def _extract_lyrics_from_audio(self, audio_path: Path) -> str:
        """
        Extract lyrics from audio (placeholder).
        In production, would use Whisper with language detection.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Extracted or placeholder lyrics
        """
        print("[MultilingualSongProcessor] Extracting lyrics from audio...")
        
        # Placeholder: return generic phonetically rich text
        # In production, use: whisper_model.transcribe(str(audio_path), language='en'/'hi')
        lyrics = "The music is playing so well with this song today"
        
        print(f"[MultilingualSongProcessor] Using default lyrics: {lyrics}")
        return lyrics
    
    def convert_song(self, song_path: Path, voice_path: Path, output_path: Path,
                    language: str = 'english', add_effects: bool = True) -> Path:
        """
        Convert song to user's voice (multilingual support).
        
        Pipeline:
        1. Separate vocals from instrumental (Demucs)
        2. Extract lyrics (placeholder or Whisper)
        3. Synthesize with user's voice (language-aware)
        4. Mix synthesized vocals with instrumental
        5. Add audio effects
        
        Args:
            song_path: Path to input song
            voice_path: Path to reference voice sample
            output_path: Path for output song
            language: 'english' or 'hindi'
            add_effects: Whether to add reverb/compression
            
        Returns:
            Path to output song
        """
        song_path = Path(song_path)
        voice_path = Path(voice_path)
        output_path = Path(output_path)
        language = language.lower()
        
        try:
            print(f"\n[MultilingualSongProcessor] ========== SONG CONVERSION START ==========")
            print(f"[MultilingualSongProcessor] Language: {language.upper()}")
            print(f"[MultilingualSongProcessor] Song: {song_path}")
            print(f"[MultilingualSongProcessor] Voice: {voice_path}")
            print(f"[MultilingualSongProcessor] Output: {output_path}")
            
            # Step 1: Separate vocals
            print(f"\n[MultilingualSongProcessor] STEP 1: Separating vocals...")
            separator = self._ensure_separator()
            vocals, instrumental = separator.separate(song_path, sr=self.sr)
            
            # Step 2: Extract/prepare lyrics
            print(f"\n[MultilingualSongProcessor] STEP 2: Preparing lyrics...")
            lyrics = self._extract_lyrics_from_audio(song_path)
            
            # Step 3-4: Synthesize and mix using multilingual TTS
            print(f"\n[MultilingualSongProcessor] STEP 3-4: Synthesizing vocals with {language.upper()} model...")
            tts_service = self._ensure_tts_service()
            
            try:
                synthesized_vocal = tts_service.synthesize(lyrics, voice_path, language)
            except Exception as e:
                print(f"[MultilingualSongProcessor] Synthesis error: {e}")
                raise
            
            # Resample if needed (XTTS uses 24kHz, we need 16kHz for mixing)
            if len(synthesized_vocal.shape) > 1:
                synthesized_vocal = np.mean(synthesized_vocal, axis=1)
            
            if language == Language.HINDI.value:
                # XTTS uses 24kHz, resample to 16kHz for consistency
                from scipy import signal
                num_samples = int(len(synthesized_vocal) * (self.sr / 24000))
                synthesized_vocal = signal.resample(synthesized_vocal, num_samples)
            
            synthesized_vocal = synthesized_vocal.astype(np.float32)
            print(f"[MultilingualSongProcessor] Synthesized vocal shape: {synthesized_vocal.shape}")
            
            # Step 5: Mix with instrumental
            print(f"\n[MultilingualSongProcessor] STEP 5: Mixing vocals with instrumental...")
            final_audio = AudioMixer.mix_and_save(
                synthesized_vocal, instrumental,
                output_path, sr=self.sr,
                add_effects=add_effects
            )
            
            # Cleanup
            print(f"\n[MultilingualSongProcessor] Cleaning up models...")
            try:
                gc.collect()
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except Exception as e:
                print(f"[MultilingualSongProcessor] Warning during cleanup: {e}")
            
            print(f"\n[MultilingualSongProcessor] ========== SONG CONVERSION COMPLETE ==========")
            print(f"[MultilingualSongProcessor] Output saved to: {final_audio}")
            
            return final_audio
            
        except Exception as e:
            print(f"\n[MultilingualSongProcessor] ✗ ERROR: {e}")
            import traceback
            traceback.print_exc()
            sys.stdout.flush()
            raise
