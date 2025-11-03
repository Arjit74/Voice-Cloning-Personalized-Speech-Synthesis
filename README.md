# Real-Time Voice Cloning (RTVC)

A complete PyTorch implementation of real-time voice cloning that can synthesize speech in anyone's voice from just a few seconds of audio reference.

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-red.svg)](https://pytorch.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Features

- **Voice Cloning**: Clone any voice with just 3-10 seconds of audio
- **Real-Time Generation**: Generate speech at 2-3x real-time speed on CPU
- **High Quality**: Natural-sounding synthetic speech using state-of-the-art models
- **Easy to Use**: Simple Python script - just edit voice path and text
- **Multiple Formats**: Supports WAV, MP3, M4A, FLAC input audio

## Table of Contents

- [Demo](#demo)
- [How It Works](#how-it-works)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)
- [Technical Details](#technical-details)
- [Credits](#credits)

## Demo

Input: 5 seconds of reference audio + "Hello, this is a cloned voice!"
Output: Synthetic speech in the reference voice

## How It Works

The system uses a 3-stage pipeline based on the SV2TTS (Speaker Verification to Text-to-Speech) architecture:

```
Reference Audio → [Encoder] → Speaker Embedding (256-d vector)
                                       ↓
Text Input → [Synthesizer (Tacotron)] → Mel-Spectrogram
                                       ↓
                    [Vocoder (WaveRNN)] → Audio Output
```

### Pipeline Stages:

1. **Speaker Encoder** - Extracts a unique voice "fingerprint" from reference audio
2. **Synthesizer** - Generates mel-spectrograms from text conditioned on speaker embedding
3. **Vocoder** - Converts mel-spectrograms to high-quality audio waveforms

## Installation

### Prerequisites

- Python 3.11 or higher
- Windows/Linux/macOS
- ~2 GB disk space for models
- 4 GB RAM minimum (8 GB recommended)

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/rtvc.git
cd rtvc
```

### Step 2: Install Dependencies

```bash
pip install torch numpy librosa scipy soundfile webrtcvad tqdm unidecode inflect matplotlib numba
```

Or install PyTorch with CUDA for GPU acceleration:

```bash
pip install torch --index-url https://download.pytorch.org/whl/cu118
pip install numpy librosa scipy soundfile webrtcvad tqdm unidecode inflect matplotlib numba
```

### Step 3: Download Pretrained Models

Download the pretrained models from [Google Drive](https://drive.google.com/drive/folders/1fU6umc5uQAVR2udZdHX-lDgXYzTyqG_j):

| Model | Size | Description |
|-------|------|-------------|
| encoder.pt | 17 MB | Speaker encoder model |
| synthesizer.pt | 370 MB | Tacotron synthesizer model |
| vocoder.pt | 53 MB | WaveRNN vocoder model |

Place all three files in the `models/default/` directory.

### Step 4: Verify Installation

```bash
python clone_my_voice.py
```

If you see errors about missing models, check that all three `.pt` files are in `models/default/`.

## Quick Start

### Method 1: Simple Script (Recommended)

1. Open `clone_my_voice.py`
2. Edit these lines:

```python
# Your voice sample file
VOICE_FILE = r"sample\your_voice.mp3"

# The text you want to be spoken
TEXT_TO_CLONE = """
Your text here. Can be multiple sentences or even paragraphs!
"""

# Output location
OUTPUT_FILE = r"outputs\cloned_voice.wav"
```

3. Run it:

```bash
python clone_my_voice.py
```

### Method 2: Command Line

```bash
python run_cli.py --voice "path/to/voice.wav" --text "Text to synthesize" --out "output.wav"
```

### Method 3: Advanced Runner Script

```bash
python run_voice_cloning.py
```

Edit the paths and text inside the script before running.

## Project Structure

```
rtvc/
├── clone_my_voice.py          # Simple script - EDIT THIS to clone your voice!
├── run_cli.py                 # Command-line interface
├── run_voice_cloning.py       # Advanced runner with validation
├── HOW_TO_RUN.md              # Detailed usage guide
│
├── encoder/                   # Speaker Encoder Module
│   ├── __init__.py
│   ├── audio.py                  # Audio preprocessing for encoder
│   ├── inference.py              # Encoder inference functions
│   ├── model.py                  # SpeakerEncoder neural network
│   ├── params_data.py            # Data hyperparameters
│   └── params_model.py           # Model hyperparameters
│
├── synthesizer/               # Tacotron Synthesizer Module
│   ├── __init__.py
│   ├── audio.py                  # Audio processing for synthesizer
│   ├── hparams.py                # All synthesizer hyperparameters
│   ├── inference.py              # Synthesizer inference class
│   │
│   ├── models/
│   │   └── tacotron.py           # Tacotron 2 architecture
│   │
│   └── utils/
│       ├── cleaners.py           # Text cleaning functions
│       ├── numbers.py            # Number-to-text conversion
│       ├── symbols.py            # Character/phoneme symbols
│       └── text.py               # Text-to-sequence conversion
│
├── vocoder/                   # WaveRNN Vocoder Module
│   ├── audio.py                  # Audio utilities for vocoder
│   ├── display.py                # Progress display utilities
│   ├── distribution.py           # Probability distributions
│   ├── hparams.py                # Vocoder hyperparameters
│   ├── inference.py              # Vocoder inference functions
│   │
│   └── models/
│       └── fatchord_version.py   # WaveRNN architecture
│
├── utils/
│   └── default_models.py         # Model download utilities
│
├── models/
│   └── default/               # Pretrained models go here
│       ├── encoder.pt            # (17 MB)
│       ├── synthesizer.pt        # (370 MB) - Must download!
│       └── vocoder.pt            # (53 MB)
│
├── sample/                    # Put your voice samples here
│   └── your_voice.mp3
│
└── outputs/                   # Generated audio outputs
    └── cloned_voice.wav
```

### Key Files Explained

| File | Purpose |
|------|---------|
| `clone_my_voice.py` | **START HERE** - Simplest way to clone your voice |
| `run_cli.py` | Command-line tool for voice cloning |
| `encoder/inference.py` | Loads encoder and extracts speaker embeddings |
| `synthesizer/inference.py` | Loads synthesizer and generates mel-spectrograms |
| `vocoder/inference.py` | Loads vocoder and generates waveforms |
| `**/hparams.py` | Configuration files for each module |

## Usage Examples

### Example 1: Basic Voice Cloning

```bash
python clone_my_voice.py
```

Edit `clone_my_voice.py` first:
```python
VOICE_FILE = r"sample\my_voice.mp3"
TEXT_TO_CLONE = "Hello, this is my cloned voice!"
```

### Example 2: Multiple Outputs

```bash
# Generate first output
python run_cli.py --voice "voice.wav" --text "First message" --out "output1.wav"

# Generate second output with same voice
python run_cli.py --voice "voice.wav" --text "Second message" --out "output2.wav"
```

### Example 3: Long Text

```bash
python run_cli.py --voice "voice.wav" --text "This is a very long text that spans multiple sentences. The voice cloning system will synthesize all of it in the reference voice. You can make it as long as you need."
```

### Example 4: Different Voice Samples

```bash
# Clone voice A
python run_cli.py --voice "person_a.wav" --text "Message from person A"

# Clone voice B
python run_cli.py --voice "person_b.wav" --text "Message from person B"
```

## Troubleshooting

### Common Issues

#### "Model file not found"

**Solution**: Download the models from Google Drive and place them in `models/default/`:
- https://drive.google.com/drive/folders/1fU6umc5uQAVR2udZdHX-lDgXYzTyqG_j

Verify file sizes:
```bash
# Windows
dir models\default\*.pt

# Linux/Mac
ls -lh models/default/*.pt
```

Expected sizes:
- encoder.pt: 17,090,379 bytes (17 MB)
- synthesizer.pt: 370,554,559 bytes (370 MB) - Most common issue!
- vocoder.pt: 53,845,290 bytes (53 MB)

#### "Reference voice file not found"

**Solution**: Use absolute paths or check current directory:
```python
# Use absolute path
VOICE_FILE = r"C:\Users\YourName\Desktop\voice.mp3"

# Or relative from project root
VOICE_FILE = r"sample\voice.mp3"
```

#### Output sounds robotic or unclear

**Solutions**:
- Use a higher quality voice sample (16kHz+ sample rate)
- Ensure voice sample is 3-10 seconds long
- Remove background noise from voice sample
- Speak clearly and naturally in the reference audio

#### "AttributeError: module 'numpy' has no attribute 'cumproduct'"

**Solution**: This is already fixed in the code. If you see this:
```bash
pip install --upgrade numpy
```

#### Slow generation on CPU

**Solutions**:
- Normal speed: 2-3x real-time on modern CPUs
- For faster generation, install PyTorch with CUDA:
```bash
pip install torch --index-url https://download.pytorch.org/whl/cu118
```

Then the system will automatically use GPU if available.

### Getting Help

If you encounter other issues:
1. Check the `HOW_TO_RUN.md` file for detailed instructions
2. Verify all models are downloaded correctly
3. Ensure Python 3.11+ is installed
4. Check that all dependencies are installed

## Technical Details

### Audio Specifications

| Parameter | Value |
|-----------|-------|
| Sample Rate | 16,000 Hz |
| Channels | Mono |
| Bit Depth | 16-bit |
| FFT Size | 800 samples (50ms) |
| Hop Size | 200 samples (12.5ms) |
| Mel Channels | 80 (synthesizer/vocoder), 40 (encoder) |

### Model Architectures

#### Speaker Encoder
- **Type**: LSTM + Linear Projection
- **Input**: 40-channel mel-spectrogram
- **Output**: 256-dimensional speaker embedding
- **Parameters**: ~5M

#### Synthesizer (Tacotron 2)
- **Encoder**: CBHG (Convolution Bank + Highway + GRU)
- **Decoder**: Attention-based LSTM
- **PostNet**: 5-layer Residual CNN
- **Parameters**: ~31M

#### Vocoder (WaveRNN)
- **Type**: Recurrent Neural Vocoder
- **Mode**: Raw 9-bit with mu-law
- **Upsample Factors**: (5, 5, 8)
- **Parameters**: ~4.5M

### Text Processing

The system includes sophisticated text normalization:
- **Numbers**: "123" → "one hundred twenty three"
- **Currency**: "$5.50" → "five dollars, fifty cents"
- **Ordinals**: "1st" → "first"
- **Abbreviations**: "Dr." → "doctor"
- **Unicode**: Automatic transliteration to ASCII

### Performance

| Hardware | Generation Speed |
|----------|------------------|
| CPU (Intel i7) | 2-3x real-time |
| GPU (GTX 1060) | 10-15x real-time |
| GPU (RTX 3080) | 30-50x real-time |

Example: Generating 10 seconds of audio takes ~3-5 seconds on CPU.

## How to Use for Different Applications

### Podcast/Narration
```python
TEXT_TO_CLONE = """
Welcome to today's episode. In this podcast, we'll be discussing
the fascinating world of artificial intelligence and voice synthesis.
Let's dive right in!
"""
```

### Audiobook
```python
TEXT_TO_CLONE = """
Chapter One: The Beginning.
It was a dark and stormy night when everything changed.
The old house stood alone on the hill, its windows dark and unwelcoming.
"""
```

### Voiceover
```python
TEXT_TO_CLONE = """
Introducing the all-new product that will change your life.
With advanced features and intuitive design, it's the perfect solution.
"""
```

### Multiple Languages
The system supports English out of the box. For other languages:
1. Use English transliteration for best results
2. Or modify `synthesizer/utils/cleaners.py` for your language

## Comparison with Other Methods

| Method | Quality | Speed | Setup |
|--------|---------|-------|-------|
| Traditional TTS | Low | Fast | Easy |
| Commercial APIs | High | Fast | API Key Required |
| **This Project** | High | Medium | One-time Setup |
| Training from Scratch | High | Slow | Very Complex |

## Best Practices

### For Best Voice Quality:

1. **Reference Audio**:
   - 3-10 seconds long
   - Clear speech, no background noise
   - Natural speaking tone (not reading/singing)
   - 16kHz+ sample rate if possible

2. **Text Input**:
   - Use proper punctuation for natural pauses
   - Break very long texts into paragraphs
   - Avoid excessive special characters

3. **Output**:
   - Generate shorter clips for better quality
   - Concatenate multiple clips if needed
   - Post-process with audio editing software for polish

## Known Limitations

- Works best with English text
- Requires good quality reference audio
- May not perfectly capture very unique voice characteristics
- Background noise in reference affects output quality
- Very short reference audio (<3 seconds) may produce inconsistent results

## Future Improvements

- [ ] Add GUI interface
- [ ] Support for multiple languages
- [ ] Real-time streaming mode
- [ ] Voice mixing/morphing capabilities
- [ ] Fine-tuning on custom datasets
- [ ] Mobile app version

## Credits

This implementation is based on:
- **SV2TTS**: Transfer Learning from Speaker Verification to Multispeaker Text-To-Speech Synthesis
- **Tacotron 2**: Natural TTS Synthesis by Conditioning WaveNet on Mel Spectrogram Predictions
- **WaveRNN**: Efficient Neural Audio Synthesis

Original research papers:
- [SV2TTS Paper](https://arxiv.org/abs/1806.04558)
- [Tacotron 2 Paper](https://arxiv.org/abs/1712.05884)
- [WaveRNN Paper](https://arxiv.org/abs/1802.08435)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Show Your Support

If this project helped you, please give it a star!

## Contact

For questions or support, please open an issue on GitHub.

---

**Made with love by the Voice Cloning Community**

*Last Updated: October 30, 2025*
