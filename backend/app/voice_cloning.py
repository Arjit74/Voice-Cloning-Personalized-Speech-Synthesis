"""Core voice cloning logic shared by the API routes."""

from __future__ import annotations

import shutil
import gc
import torch
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import soundfile as sf
from huggingface_hub import hf_hub_download

from encoder import inference as encoder_infer
from synthesizer import inference as synthesizer_infer
from synthesizer.hparams import hparams as syn_hp
from app.vocoder import inference as vocoder_infer


MODEL_SPECS: Dict[str, Tuple[str, str]] = {
    "encoder.pt": ("AJ50/voice-clone-encoder", "encoder.pt"),
    "synthesizer.pt": ("AJ50/voice-clone-synthesizer", "synthesizer.pt"),
    "vocoder.pt": ("AJ50/voice-clone-vocoder", "vocoder.pt"),
}


def ensure_default_models(models_dir: Path) -> None:
    """Download the required pretrained weights if they are missing."""

    target_dir = models_dir / "default"
    target_dir.mkdir(parents=True, exist_ok=True)

    for filename, (repo_id, repo_filename) in MODEL_SPECS.items():
        destination = target_dir / filename
        if destination.exists():
            continue

        print(f"[Models] Downloading {filename} from {repo_id}...")
        downloaded_path = Path(
            hf_hub_download(repo_id=repo_id, filename=repo_filename)
        )
        shutil.copy2(downloaded_path, destination)
        print(f"[Models] Saved to {destination}")


def synthesize(voice_path: Path, text: str, models_dir: Path, out_path: Path) -> Path:
    """Run end-to-end voice cloning and return the generated audio path."""

    ensure_default_models(models_dir)

    enc_path = models_dir / "default" / "encoder.pt"
    syn_path = models_dir / "default" / "synthesizer.pt"
    voc_path = models_dir / "default" / "vocoder.pt"

    for model_path in (enc_path, syn_path, voc_path):
        if not model_path.exists():
            raise RuntimeError(f"Model file missing: {model_path}")

    print("[VoiceCloning] Loading encoder...")
    encoder_infer.load_model(enc_path)
    print("[VoiceCloning] Loading synthesizer...")
    synthesizer = synthesizer_infer.Synthesizer(syn_path)
    print("[VoiceCloning] Loading vocoder...")
    vocoder_infer.load_model(voc_path)

    if not voice_path.exists():
        raise RuntimeError(f"Reference voice file not found: {voice_path}")

    print("[VoiceCloning] Preprocessing reference audio...")
    wav = encoder_infer.preprocess_wav(voice_path)
    embed = encoder_infer.embed_utterance(wav)

    print("[VoiceCloning] Generating mel-spectrogram...")
    mels = synthesizer.synthesize_spectrograms([text], [embed])
    mel = mels[0]

    print("[VoiceCloning] Vocoding waveform...")
    try:
        waveform = synthesizer.griffin_lim(mel).astype(np.float32)
    except Exception:
        waveform = vocoder_infer.infer_waveform(
            mel, normalize=True, batched=False, target=8000, overlap=800
        ).astype(np.float32)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out_path.as_posix(), waveform, syn_hp.sample_rate)
    print(f"[VoiceCloning] Audio saved to {out_path}")
    
    # Memory optimization for Render free tier
    print("[VoiceCloning] Cleaning up models to free memory...")
    try:
        # Clear model caches
        if hasattr(encoder_infer, '_model'):
            encoder_infer._model = None
        if hasattr(synthesizer_infer, '_model'):
            synthesizer_infer._model = None
        if hasattr(vocoder_infer, '_model'):
            vocoder_infer._model = None
        
        # Force garbage collection
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except Exception as e:
        print(f"[VoiceCloning] Warning during cleanup: {e}")

    return out_path
