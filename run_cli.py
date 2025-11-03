import argparse
from pathlib import Path
import sys

import numpy as np
import soundfile as sf

# Local modules
from utils.default_models import ensure_default_models
from encoder import inference as encoder_infer
from synthesizer.inference import Synthesizer
from vocoder import inference as vocoder_infer


def synthesize(voice_path: Path, text: str, models_dir: Path, out_path: Path):
    """
    End-to-end TTS with voice cloning.

    Contract:
        - Inputs: reference voice WAV path, input text,
            models_dir (contains default/*.pt), out_path
    - Output: writes a WAV file at out_path
    - Errors: raises RuntimeError on missing files or loading/synthesis errors
    """
    # 1) Ensure default pretrained models are present
    ensure_default_models(models_dir)

    enc_path = models_dir / "default" / "encoder.pt"
    syn_path = models_dir / "default" / "synthesizer.pt"
    voc_path = models_dir / "default" / "vocoder.pt"

    for p in (enc_path, syn_path, voc_path):
        if not p.exists():
            raise RuntimeError(
                f"Model file not found: {p}. If auto-download failed, "
                f"download manually."
            )

    # 2) Load models
    encoder_infer.load_model(enc_path)
    synthesizer = Synthesizer(syn_path)
    vocoder_infer.load_model(voc_path)

    # 3) Process reference audio to speaker embedding
    if not voice_path.exists():
        raise RuntimeError(f"Reference voice file not found: {voice_path}")
    wav = encoder_infer.preprocess_wav(voice_path)
    embed = encoder_infer.embed_utterance(wav)

    # 4) Synthesize mel spectrogram from text + speaker embedding
    specs = synthesizer.synthesize_spectrograms([text], [embed])
    mel = specs[0]

    # 5) Vocoder to waveform
    wav_out = vocoder_infer.infer_waveform(mel)
    wav_out = (
        wav_out.squeeze() if hasattr(wav_out, "shape") else np.asarray(wav_out)
    )
    wav_out = wav_out.astype(np.float32)

    # 6) Save
    out_path.parent.mkdir(parents=True, exist_ok=True)
    # Use synthesizer sample rate for output
    from synthesizer.hparams import hparams as syn_hp
    sr = syn_hp.sample_rate
    sf.write(out_path.as_posix(), wav_out, sr)

    return out_path


def main(argv=None):
    parser = argparse.ArgumentParser(
        description=(
            "Voice cloning: synthesize text in a target voice."
        )
    )
    parser.add_argument(
        "--voice",
        required=True,
        type=Path,
        help=("Path to a short reference WAV/MP3/M4A, etc."),
    )
    parser.add_argument(
        "--text",
        required=True,
        type=str,
        help=("Text to speak in the target voice."),
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("outputs/clone.wav"),
        help=("Output WAV path."),
    )
    parser.add_argument(
        "--models-dir",
        type=Path,
        default=Path("models"),
        help=("Directory to cache/download pretrained models."),
    )
    args = parser.parse_args(argv)

    out_fpath = synthesize(args.voice, args.text, args.models_dir, args.out)
    print(f"Saved cloned speech to {out_fpath}")


if __name__ == "__main__":
    sys.exit(main())
