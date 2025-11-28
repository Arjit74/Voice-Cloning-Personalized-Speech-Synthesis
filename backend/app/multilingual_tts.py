"""Multilingual TTS Service - Supports English (WaveRNN) and Hindi (XTTS)."""

import gc
import torch
import numpy as np
from pathlib import Path
from typing import Optional, Union
from enum import Enum
import sys


class Language(str, Enum):
    """Supported languages."""
    ENGLISH = "english"
    HINDI = "hindi"


class MultilingualTTSService:
    """
    Unified TTS service supporting multiple languages.
    
    - English: Uses existing WaveRNN vocoder + Tacotron2 synthesizer + encoder
    - Hindi: Uses XTTS (Coqui TTS) model
    """
    
    def __init__(self, models_dir: Path, hindi_model_dir: Optional[Path] = None):
        """
        Initialize multilingual TTS service.
        
        Args:
            models_dir: Directory with English models (encoder.pt, synthesizer.pt, vocoder.pt)
            hindi_model_dir: Directory with XTTS Hindi model. If None, Hindi support disabled.
        """
        self.models_dir = Path(models_dir)
        self.hindi_model_dir = Path(hindi_model_dir) if hindi_model_dir else None
        
        # Track loaded models
        self._encoder_model = None
        self._synthesizer_model = None
        self._vocoder_model = None
        self._xtts_model = None
        
        self.sr = 16000
        
        print("[MultilingualTTSService] Initialized")
        print(f"[MultilingualTTSService] English models dir: {self.models_dir}")
        if self.hindi_model_dir:
            print(f"[MultilingualTTSService] Hindi XTTS dir: {self.hindi_model_dir}")
        else:
            print("[MultilingualTTSService] Hindi support: DISABLED (no model path)")
    
    def _load_english_models(self):
        """Load English voice cloning models (lazy load)."""
        if self._encoder_model is None:
            print("[MultilingualTTSService] Loading English encoder...")
            from encoder import inference as encoder_infer
            enc_path = self.models_dir / "default" / "encoder.pt"
            if not enc_path.exists():
                raise RuntimeError(f"English encoder model missing: {enc_path}")
            encoder_infer.load_model(enc_path)
            self._encoder_model = True
            print("[MultilingualTTSService] ✓ English encoder loaded")
        
        if self._synthesizer_model is None:
            print("[MultilingualTTSService] Loading English synthesizer...")
            from synthesizer import inference as synthesizer_infer
            syn_path = self.models_dir / "default" / "synthesizer.pt"
            if not syn_path.exists():
                raise RuntimeError(f"English synthesizer model missing: {syn_path}")
            self._synthesizer_model = synthesizer_infer.Synthesizer(syn_path)
            print("[MultilingualTTSService] ✓ English synthesizer loaded")
        
        if self._vocoder_model is None:
            print("[MultilingualTTSService] Loading English vocoder...")
            from app.vocoder import inference as vocoder_infer
            voc_path = self.models_dir / "default" / "vocoder.pt"
            if not voc_path.exists():
                raise RuntimeError(f"English vocoder model missing: {voc_path}")
            vocoder_infer.load_model(voc_path)
            self._vocoder_model = True
            print("[MultilingualTTSService] ✓ English vocoder loaded")
    
    def _load_hindi_models(self):
        """Load Hindi XTTS model (lazy load with auto-download)."""
        if not self.hindi_model_dir:
            raise RuntimeError("Hindi model not configured. Set hindi_model_dir path.")
        
        if self._xtts_model is None:
            print("[MultilingualTTSService] Loading Hindi XTTS model...")
            try:
                from TTS.api import TTS
            except ImportError:
                raise ImportError(
                    "TTS library required for Hindi support. "
                    "Install with: pip install TTS>=0.21.0"
                )
            
            config_path = self.hindi_model_dir / "config.json"
            
            # Auto-download from HuggingFace Hub if model files missing
            if not config_path.exists():
                print("[MultilingualTTSService] Model files not found. Downloading from HuggingFace Hub...")
                try:
                    from huggingface_hub import snapshot_download
                    
                    # Download XTTS-v2 model from HF Hub
                    snapshot_download(
                        repo_id="coqui/XTTS-v2",
                        cache_dir=str(self.hindi_model_dir.parent),
                        local_dir=str(self.hindi_model_dir),
                        local_dir_use_symlinks=False,  # Avoid symlinks for HF Spaces
                    )
                    print("[MultilingualTTSService] ✓ Model downloaded from HuggingFace Hub")
                except ImportError:
                    raise ImportError(
                        "huggingface_hub library required for auto-download. "
                        "Install with: pip install huggingface_hub"
                    )
                except Exception as e:
                    raise RuntimeError(f"Failed to download Hindi model: {e}")
            
            # Load XTTS model
            self._xtts_model = TTS(
                model_path=str(self.hindi_model_dir.resolve().as_posix()),
                config_path=str(config_path),
                gpu=False  # Set to True if CUDA available and needed
            )
            print("[MultilingualTTSService] ✓ Hindi XTTS loaded")
    
    def synthesize(self, text: str, voice_sample_path: Union[str, Path],
                  language: str = "english") -> np.ndarray:
        """
        Synthesize speech in specified language.
        
        Args:
            text: Text to synthesize
            voice_sample_path: Path to reference voice sample
            language: "english" or "hindi"
            
        Returns:
            Audio waveform as numpy array
        """
        language = language.lower()
        
        if language == Language.ENGLISH:
            return self._synthesize_english(text, voice_sample_path)
        elif language == Language.HINDI:
            return self._synthesize_hindi(text, voice_sample_path)
        else:
            raise ValueError(f"Unsupported language: {language}")
    
    def _synthesize_english(self, text: str, voice_sample_path: Union[str, Path]) -> np.ndarray:
        """Synthesize English speech using WaveRNN + Tacotron2."""
        from encoder import inference as encoder_infer
        from app.vocoder import inference as vocoder_infer
        
        self._load_english_models()
        
        print(f"[MultilingualTTSService] Synthesizing English: {text[:50]}...")
        
        # Embed voice
        wav = encoder_infer.preprocess_wav(voice_sample_path)
        embed = encoder_infer.embed_utterance(wav)
        
        # Generate mel
        mels = self._synthesizer_model.synthesize_spectrograms([text], [embed])
        mel = mels[0]
        
        # Vocalize
        try:
            synthesized = vocoder_infer.infer_waveform(
                mel, normalize=True, batched=False, target=8000, overlap=800
            ).astype(np.float32)
        except Exception as e:
            print(f"[MultilingualTTSService] Vocoder failed: {e}, using Griffin-Lim fallback")
            synthesized = self._synthesizer_model.griffin_lim(mel).astype(np.float32)
        
        # Normalize
        max_val = np.max(np.abs(synthesized))
        if max_val > 0:
            target_level = 0.707
            synthesized = synthesized * (target_level / max_val)
        
        return np.clip(synthesized, -1.0, 1.0)
    
    def _synthesize_hindi(self, text: str, voice_sample_path: Union[str, Path]) -> np.ndarray:
        """Synthesize Hindi speech using XTTS model."""
        self._load_hindi_models()
        
        print(f"[MultilingualTTSService] Synthesizing Hindi: {text[:50]}...")
        
        # XTTS synthesize
        audio = self._xtts_model.tts(
            text=text,
            speaker_wav=str(voice_sample_path),
            language="hi"
        )
        
        # Convert to float32 if needed
        audio = np.asarray(audio, dtype=np.float32)
        
        # Normalize
        max_val = np.max(np.abs(audio))
        if max_val > 0:
            target_level = 0.707
            audio = audio * (target_level / max_val)
        
        return np.clip(audio, -1.0, 1.0)
    
    def synthesize_and_save(self, text: str, voice_sample_path: Union[str, Path],
                           output_path: Union[str, Path], language: str = "english") -> Path:
        """
        Synthesize and save to file.
        
        Args:
            text: Text to synthesize
            voice_sample_path: Path to reference voice
            output_path: Where to save audio
            language: "english" or "hindi"
            
        Returns:
            Path to output file
        """
        import soundfile as sf
        
        output_path = Path(output_path)
        
        try:
            audio = self.synthesize(text, voice_sample_path, language)
            
            # Determine sample rate based on language
            sr = 24000 if language.lower() == Language.HINDI else 16000
            
            sf.write(output_path, audio, sr)
            print(f"[MultilingualTTSService] Audio saved: {output_path}")
            return output_path
            
        except Exception as e:
            print(f"[MultilingualTTSService] Error during synthesis: {e}")
            raise
    
    def cleanup(self):
        """Release model memory."""
        print("[MultilingualTTSService] Cleaning up models...")
        try:
            self._encoder_model = None
            self._synthesizer_model = None
            self._vocoder_model = None
            self._xtts_model = None
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except Exception as e:
            print(f"[MultilingualTTSService] Cleanup warning: {e}")
