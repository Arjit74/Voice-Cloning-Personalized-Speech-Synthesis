import argparse
from pathlib import Path
import sys
import signal

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
    try:
        # 1) Ensure default pretrained models are present
        print("[1/6] Ensuring models are present...")
        ensure_default_models(models_dir)
        print("✓ Models checked")

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
        print("[2/6] Loading encoder model...")
        encoder_infer.load_model(enc_path)
        print("✓ Encoder loaded")
        
        print("[3/6] Loading synthesizer model...")
        synthesizer = Synthesizer(syn_path)
        print("✓ Synthesizer loaded")
        
        print("[4/6] Loading vocoder model...")
        vocoder_infer.load_model(voc_path)
        print("✓ Vocoder loaded")

        # 3) Process reference audio to speaker embedding
        if not voice_path.exists():
            raise RuntimeError(f"Reference voice file not found: {voice_path}")
        
        print("[5/6] Processing voice and extracting embedding...")
        wav = encoder_infer.preprocess_wav(voice_path)
        print(f"  ✓ Voice preprocessed, shape: {wav.shape}")
        
        embed = encoder_infer.embed_utterance(wav)
        print(f"  ✓ Embedding extracted, shape: {embed.shape}")

        # 4) Synthesize mel spectrogram from text + speaker embedding
        print("[6/6] Synthesizing speech...")
        print(f"  Text: '{text}'")
        try:
            specs = synthesizer.synthesize_spectrograms([text], [embed])
            mel = specs[0]
            print(f"  ✓ Mel-spectrogram generated, shape: {mel.shape}")
        except Exception as syn_err:
            print(f"  ✗ Synthesizer error during mel-spec generation: {syn_err}")
            import traceback
            traceback.print_exc()
            raise RuntimeError(f"Mel-spectrogram synthesis failed: {syn_err}")

        # 5) Vocoder to waveform
        try:
            print("  Converting mel-spectrogram to waveform (vocoding)...")
            print(f"    Mel shape: {mel.shape}, dtype: {mel.dtype}")
            
            # Use Griffin-Lim by default (fast, CPU-only)
            # Fall back to WaveRNN only if needed
            try:
                print("  ✓ Using Griffin-Lim vocoder (fast, CPU-optimized)...")
                sys.stdout.flush()
                wav_out = synthesizer.griffin_lim(mel)
                wav_out = wav_out.astype(np.float32)
                print("  ✓ Waveform generated with Griffin-Lim")
            except Exception as gl_err:
                print(f"  ⚠ Griffin-Lim failed ({gl_err}), trying WaveRNN...")
                # Fallback to WaveRNN vocoder
                try:
                    sys.stdout.flush()
                    wav_out = vocoder_infer.infer_waveform(
                        mel, 
                        normalize=True, 
                        batched=False, 
                        target=8000, 
                        overlap=800
                    )
                    wav_out = (
                        wav_out.squeeze() if hasattr(wav_out, "shape")
                        else np.asarray(wav_out)
                    )
                    wav_out = wav_out.astype(np.float32)
                    print("  ✓ Waveform generated with WaveRNN")
                except Exception as rnn_err:
                    print(f"  ✗ Both vocoders failed: GL: {gl_err}, WR: {rnn_err}")
                    raise RuntimeError(
                        f"Vocoding failed. Griffin-Lim: {gl_err}, "
                        f"WaveRNN: {rnn_err}"
                    )
        except Exception as voc_err:
            print(f"  ✗ Vocoder error: {voc_err}")
            import traceback
            traceback.print_exc()
            sys.stdout.flush()
            raise RuntimeError(f"Vocoder synthesis failed: {voc_err}")

        # 6) Save
        print("  Saving audio file...")
        out_path.parent.mkdir(parents=True, exist_ok=True)
        # Use synthesizer sample rate for output
        from synthesizer.hparams import hparams as syn_hp
        sr = syn_hp.sample_rate
        sf.write(out_path.as_posix(), wav_out, sr)
        print(f"  ✓ Audio saved to {out_path}")

        print("✓ Synthesis completed successfully!")
        return out_path
    
    except Exception as e:
        print(f"✗ Synthesis failed: {e}")
        import traceback
        traceback.print_exc()
        raise


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
