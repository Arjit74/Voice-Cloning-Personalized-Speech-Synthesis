"""Multilingual TTS Service - Supports English (WaveRNN) and Hindi (XTTS)."""

import os
import sys
import shutil
import subprocess

# Set environment variables BEFORE any TTS imports to bypass CPML prompt
os.environ['TTS_HOME'] = '/tmp/tts_models'
os.environ['TTS_CPML'] = '1'
os.environ['TTS_SKIP_TOS'] = '1'
os.environ['TTS_DISABLE_WEB_VERSION_PROMPT'] = '1'
os.environ['COQUI_TOS_AGREED'] = '1'

# Google Drive folder containing XTTS v2 model
# https://drive.google.com/drive/folders/15g0ICOEAAy5mJhsvoEjCHAXNfttkwp_K?usp=drive_link
GOOGLE_DRIVE_FOLDER_ID = "15g0ICOEAAy5mJhsvoEjCHAXNfttkwp_K"
XTTS_MODEL_DIR = "/tmp/tts_models/tts_models--multilingual--multi-dataset--xtts_v2"

def _download_from_google_drive(folder_id: str, output_dir: str) -> bool:
    """
    Download XTTS v2 model from Google Drive using gdown.
    
    Args:
        folder_id: Google Drive folder ID
        output_dir: Directory to save files
        
    Returns:
        True if successful, False otherwise
    """
    try:
        import gdown
        
        output_dir = os.path.expanduser(output_dir)
        os.makedirs(output_dir, exist_ok=True)
        
        print(f"\n[XTTS Download] Starting download from Google Drive...")
        print(f"[XTTS Download] Folder ID: {folder_id}")
        print(f"[XTTS Download] Output: {output_dir}")
        print(f"[XTTS Download] This may take 3-5 minutes...")
        sys.stdout.flush()
        
        # Download entire folder
        gdown.download_folder(
            id=folder_id,
            output=output_dir,
            quiet=False,
            use_cookies=False
        )
        
        print(f"\n[XTTS Download] ✓ Download completed successfully!")
        sys.stdout.flush()
        return True
        
    except ImportError:
        print("[XTTS Download] gdown not installed. Attempting pip install...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "gdown", "-q"])
            print("[XTTS Download] gdown installed. Retrying download...")
            return _download_from_google_drive(folder_id, output_dir)
        except Exception as e:
            print(f"[XTTS Download] Failed to install gdown: {e}")
            return False
    except Exception as e:
        print(f"[XTTS Download] Error downloading model: {e}")
        import traceback
        traceback.print_exc()
        return False

def _check_xtts_model_exists() -> bool:
    """Check if XTTS v2 model files exist locally."""
    required_files = [
        "model.pth",
        "config.json",
        "vocab.json",
        "speakers_xtts.pth"
    ]
    
    model_dir = XTTS_MODEL_DIR
    if not os.path.exists(model_dir):
        return False
    
    for filename in required_files:
        if not os.path.exists(os.path.join(model_dir, filename)):
            print(f"[XTTS Check] Missing: {filename}")
            return False
    
    print(f"[XTTS Check] ✓ All XTTS v2 model files present")
    return True

# Create a silent TTS manager that handles model initialization without prompts
def _create_silent_tts_manager():
    """Create a TTS manager configured to skip all interactive prompts."""
    try:
        from TTS.utils.manage import ModelManager
        from pathlib import Path
        
        # Set model manager to use our TTS_HOME directory
        model_dir = Path(os.environ.get('TTS_HOME', '/tmp/tts_models'))
        model_dir.mkdir(parents=True, exist_ok=True)
        
        manager = ModelManager(model_name="tts_models/multilingual/multi-dataset/xtts_v2")
        # Mark TOS as agreed in the manager to prevent prompts
        manager.tos_agreed = True
        
        return manager, model_dir
    except Exception as e:
        print(f"[WARNING] Could not create silent TTS manager: {e}")
        return None, None

import gc
import torch
import numpy as np
from pathlib import Path
from typing import Optional, Union
from enum import Enum


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
        """Load Hindi XTTS model - supports voice cloning. Downloads from Google Drive on first use."""
        if self._xtts_model is None:
            print("[MultilingualTTSService] Loading Hindi XTTS model...")
            
            # Check if model exists locally
            if not _check_xtts_model_exists():
                print("[MultilingualTTSService] XTTS v2 model not found locally. Downloading...")
                if not _download_from_google_drive(GOOGLE_DRIVE_FOLDER_ID, XTTS_MODEL_DIR):
                    raise RuntimeError(
                        "Failed to download XTTS v2 model from Google Drive. "
                        "Please try again later."
                    )
            
            try:
                from TTS.api import TTS
                
                # XTTS v2: Multilingual TTS with voice cloning support
                # Supports 13+ languages including Hindi
                # No prompts - all environment variables set at top
                print("[MultilingualTTSService] Initializing XTTS v2...")
                self._xtts_model = TTS(
                    model_name="tts_models/multilingual/multi-dataset/xtts_v2",
                    gpu=False,
                    progress_bar=False,
                    in_memory=True
                )
                print("[MultilingualTTSService] ✓ Hindi XTTS v2 loaded successfully")
                print("[MultilingualTTSService]   Model: XTTS v2 (Multilingual)")
                print("[MultilingualTTSService]   Language: Hindi with voice cloning")
                print("[MultilingualTTSService]   Voice Cloning: YES - uses enrolled voice")
                print("[MultilingualTTSService]   Ready for synthesis!")
                    
            except ImportError:
                raise ImportError(
                    "TTS library required for Hindi support. "
                    "Install with: pip install TTS>=0.21.0"
                )
            except Exception as e:
                print(f"[MultilingualTTSService] Error loading Hindi XTTS: {e}")
                import traceback
                traceback.print_exc()
                raise RuntimeError(f"Failed to load Hindi XTTS model: {e}")
    
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
        """Synthesize Hindi speech using XTTS with voice cloning from enrolled voice."""
        self._load_hindi_models()
        
        print(f"[MultilingualTTSService] Synthesizing Hindi with voice cloning: {text[:50]}...")
        print(f"[MultilingualTTSService] Using voice sample: {voice_sample_path}")
        
        try:
            # XTTS supports voice cloning with speaker_wav parameter
            # Language is detected automatically from text (Hindi Devanagari)
            audio = self._xtts_model.tts(
                text=text,
                speaker_wav=str(voice_sample_path),  # Use enrolled voice characteristics
                language="hi"  # Explicitly specify Hindi
            )
            
            # Convert to numpy array
            audio = np.asarray(audio, dtype=np.float32)
            
            # Normalize
            max_val = np.max(np.abs(audio))
            if max_val > 0:
                target_level = 0.707
                audio = audio * (target_level / max_val)
            
            return np.clip(audio, -1.0, 1.0)
            
        except Exception as e:
            print(f"[MultilingualTTSService] Error during Hindi synthesis: {e}")
            raise RuntimeError(f"Hindi synthesis failed: {e}")
    
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
