"""Main song processing orchestrator."""

import gc
import torch
import numpy as np
from pathlib import Path
from typing import Optional
import sys

from app.song_conversion.vocal_separator import VocalSeparator
from app.song_conversion.audio_mixer import AudioMixer
from encoder import inference as encoder_infer
from synthesizer import inference as synthesizer_infer
from app.vocoder import inference as vocoder_infer
from synthesizer.hparams import hparams as syn_hp


class SongProcessor:
    """Orchestrates the complete song voice conversion process."""
    
    def __init__(self, models_dir: Path):
        """
        Initialize song processor.
        
        Args:
            models_dir: Directory containing pre-trained models
        """
        self.models_dir = Path(models_dir)
        self.separator = None
        self.sr = 16000
    
    def _ensure_separator(self) -> VocalSeparator:
        """Lazy load vocal separator."""
        if self.separator is None:
            print("[SongProcessor] Initializing vocal separator...")
            self.separator = VocalSeparator(model_name="htdemucs")
        return self.separator
    
    def _load_voice_models(self, models_dir: Path, language: str = 'english') -> None:
        """Load voice cloning models."""
        print(f"[SongProcessor] Loading {language} voice models...")
        
        enc_path = models_dir / "default" / "encoder.pt"
        syn_path = models_dir / "default" / "synthesizer.pt"
        voc_path = models_dir / "default" / "vocoder.pt"
        
        for path in [enc_path, syn_path, voc_path]:
            if not path.exists():
                raise RuntimeError(f"Model missing: {path}")
        
        encoder_infer.load_model(enc_path)
        print("[SongProcessor] Encoder loaded")
        
        synthesizer = synthesizer_infer.Synthesizer(syn_path)
        print("[SongProcessor] Synthesizer loaded")
        
        vocoder_infer.load_model(voc_path)
        print("[SongProcessor] Vocoder loaded")
        
        return synthesizer
    
    def _extract_lyrics_from_audio(self, audio_path: Path, voice_sample_path: Path) -> str:
        """
        Simple lyrics extraction (placeholder - returns generic text).
        In production, would use speech-to-text.
        
        Args:
            audio_path: Path to vocal audio
            voice_sample_path: Path to reference voice
            
        Returns:
            Extracted lyrics text
        """
        print("[SongProcessor] Extracting lyrics from audio...")
        
        # Placeholder: return generic phonetically rich text
        # In production, use Whisper or other STT model
        lyrics = "The music is playing so well with this song today"
        
        print(f"[SongProcessor] Using default lyrics: {lyrics}")
        return lyrics
    
    def convert_song(self, song_path: Path, voice_path: Path, output_path: Path,
                    language: str = 'english', add_effects: bool = True,
                    models_dir: Optional[Path] = None) -> Path:
        """
        Convert song to user's voice.
        
        Complete pipeline:
        1. Separate vocals from instrumental
        2. Extract lyrics from vocals (or use placeholder)
        3. Synthesize vocals using user's voice
        4. Mix synthesized vocals with instrumental
        5. Add audio effects
        
        Args:
            song_path: Path to input song
            voice_path: Path to reference voice sample
            output_path: Path for output song
            language: 'english' or 'hindi'
            add_effects: Whether to add reverb/compression
            models_dir: Directory with models (uses self.models_dir if None)
            
        Returns:
            Path to output song
        """
        if models_dir is None:
            models_dir = self.models_dir
        
        song_path = Path(song_path)
        voice_path = Path(voice_path)
        output_path = Path(output_path)
        
        try:
            print(f"\n[SongProcessor] ========== SONG CONVERSION START ==========")
            print(f"[SongProcessor] Song: {song_path}")
            print(f"[SongProcessor] Voice: {voice_path}")
            print(f"[SongProcessor] Language: {language}")
            print(f"[SongProcessor] Output: {output_path}")
            
            # Step 1: Separate vocals
            print(f"\n[SongProcessor] STEP 1: Separating vocals...")
            separator = self._ensure_separator()
            vocals, instrumental = separator.separate(song_path, sr=self.sr)
            
            # Step 2: Extract/prepare lyrics (using placeholder for now)
            print(f"\n[SongProcessor] STEP 2: Preparing lyrics...")
            lyrics = self._extract_lyrics_from_audio(song_path, voice_path)
            
            # Step 3: Load voice models
            print(f"\n[SongProcessor] STEP 3: Loading voice models...")
            synthesizer = self._load_voice_models(models_dir, language)
            
            # Step 4: Synthesize voice with your voice
            print(f"\n[SongProcessor] STEP 4: Synthesizing vocals with your voice...")
            wav = encoder_infer.preprocess_wav(voice_path)
            embed = encoder_infer.embed_utterance(wav)
            
            mels = synthesizer.synthesize_spectrograms([lyrics], [embed])
            mel = mels[0]
            
            print("[SongProcessor] Vocoding...")
            try:
                synthesized_vocal = vocoder_infer.infer_waveform(
                    mel, normalize=True, batched=False, target=8000, overlap=800
                ).astype(np.float32)
            except Exception as e:
                print(f"[SongProcessor] Vocoder failed: {e}, using Griffin-Lim fallback")
                synthesized_vocal = synthesizer.griffin_lim(mel).astype(np.float32)
            
            # Normalize synthesized vocal
            max_val = np.max(np.abs(synthesized_vocal))
            if max_val > 0:
                target_level = 0.707
                synthesized_vocal = synthesized_vocal * (target_level / max_val)
            synthesized_vocal = np.clip(synthesized_vocal, -1.0, 1.0)
            
            print(f"[SongProcessor] Synthesized vocal shape: {synthesized_vocal.shape}")
            
            # Step 5: Mix with instrumental
            print(f"\n[SongProcessor] STEP 5: Mixing vocals with instrumental...")
            final_audio = AudioMixer.mix_and_save(
                synthesized_vocal, instrumental,
                output_path, sr=self.sr,
                add_effects=add_effects
            )
            
            # Cleanup
            print(f"\n[SongProcessor] Cleaning up models...")
            try:
                encoder_infer._model = None
                synthesizer_infer._model = None
                vocoder_infer._model = None
                gc.collect()
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except Exception as e:
                print(f"[SongProcessor] Warning during cleanup: {e}")
            
            print(f"\n[SongProcessor] ========== SONG CONVERSION COMPLETE ==========")
            print(f"[SongProcessor] Output saved to: {final_audio}")
            
            return final_audio
            
        except Exception as e:
            print(f"\n[SongProcessor] ✗ ERROR: {e}")
            import traceback
            traceback.print_exc()
            sys.stdout.flush()
            raise
