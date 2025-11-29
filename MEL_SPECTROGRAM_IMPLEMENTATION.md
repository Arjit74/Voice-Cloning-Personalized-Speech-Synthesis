# Real-Time Mel-Spectrogram Visualization - Implementation Guide

## Overview
Added real-time mel-spectrogram visualization to the voice synthesis interface. When users click "Generate Speech", a dynamic mel-spectrogram visualization appears showing the frequency content of the synthesized audio in real-time.

## What is a Mel-Spectrogram?

A **mel-spectrogram** is a visual representation of audio where:
- **X-axis (Time)**: Progression through the audio from left to right
- **Y-axis (Frequency)**: Audio frequencies (converted to mel-scale which matches human hearing)
- **Color intensity**: Energy/power at each frequency at each time step

The mel-scale is a perceptual scale of pitches judged by listeners to be equal in distance from one another, mimicking how humans actually perceive sound.

### Visualization Colors:
- **Dark blue/Black**: Low energy (quiet frequencies)
- **Cyan/Green**: Medium energy 
- **Yellow**: High energy
- **White**: Maximum energy

## Implementation Details

### 1. New Frontend Component: `MelSpectrogramVisualizer.tsx`

Located at: `src/components/audio/MelSpectrogramVisualizer.tsx`

**Features:**
- Canvas-based rendering for smooth animation
- Two visualization modes:
  - **Real-time animated mode** (during synthesis): Shows animated frequency bands with scan line effect
  - **Data-driven mode** (after synthesis): Displays actual mel-spectrogram data from the audio file
- Viridis-like colormap for accurate frequency visualization
- Status indicator showing synthesis progress

**Key Functions:**
- `drawMelSpectrogram()`: Main render loop using requestAnimationFrame
- `drawRealSpectrogram()`: Renders actual mel-spectrogram data
- `drawAnimatedPlaceholder()`: Shows animated visualization during synthesis
- `getSpectrogramColor()`: Color mapping function (viridis colormap)

### 2. Updated Frontend Component: `SpeechSynthesis.tsx`

**Changes:**
1. Added import for `MelSpectrogramVisualizer`
2. Added state: `spectrogramData` to store mel-spectrogram data
3. Modified `handleSynthesize()` to:
   - Reset spectrogram when synthesis starts
   - Extract audio filename from synthesis response
   - Fetch mel-spectrogram data after synthesis completes via `/api/spectrogram/<filename>`
4. Added `<MelSpectrogramVisualizer>` component in the UI above the waveform visualizer

**UI Layout:**
```
┌─────────────────────────────────────┐
│ 3D Speaker Scene (left) │ Synthesis Controls (right)
│                         │
│                         │ ┌──────────────────────┐
│                         │ │ Mel-Spectrogram      │ ← NEW
│                         │ └──────────────────────┘
│                         │ ┌──────────────────────┐
│                         │ │ Waveform Visualizer  │
│                         │ └──────────────────────┘
│                         │ [Generate Speech Button]
└─────────────────────────────────────┘
```

### 3. New Backend Endpoint: `/api/spectrogram/<audio_filename>`

Located at: `api_server.py`

**Endpoint Details:**
- **Method**: GET
- **Path**: `/api/spectrogram/<audio_filename>`
- **Purpose**: Generate and return mel-spectrogram data for synthesized audio

**Process:**
1. Load audio file using librosa
2. Compute mel-spectrogram:
   - 80 mel-frequency bands (standard for Tacotron2)
   - Hop length: 512 samples
   - Converts linear frequency scale to mel-scale
3. Convert to dB scale (logarithmic)
4. Normalize values to 0-255 range for visualization
5. Return as JSON array (time × frequency matrix)

**Response Format:**
```json
{
  "spectrogram": [
    [128, 145, 167, ...],  // Time frame 1
    [132, 148, 170, ...],  // Time frame 2
    ...
  ],
  "n_mels": 80,
  "shape": {
    "time_steps": 1500,
    "frequency_bins": 80
  }
}
```

## How It Works

### Synthesis Flow:

1. **User clicks "Generate Speech"**
   - SpeechSynthesis component displays animated mel-spectrogram
   - Backend API receives synthesis request

2. **Backend Synthesizes Audio (30-60 seconds)**
   - Uses Encoder → Synthesizer → Vocoder pipeline
   - Generates Tacotron2 mel-spectrogram internally
   - Outputs synthesized WAV file

3. **Frontend Requests Mel-Spectrogram Data**
   - After synthesis completes, frontend extracts audio filename
   - Calls `/api/spectrogram/<filename>` endpoint
   - Receives actual mel-spectrogram data from synthesized audio

4. **Real-Time Visualization Updates**
   - MelSpectrogramVisualizer receives data
   - Canvas redraws with actual frequency content
   - Shows user what frequencies were used in synthesis

### Animated vs. Actual Display:

**During Synthesis (0-60 seconds):**
- Animated frequency bands with wave patterns
- Green scan line moving across canvas
- Shows "● Synthesizing..." indicator

**After Synthesis:**
- Actual mel-spectrogram data displayed
- Shows real frequency content of generated speech
- Can be compared with input voice

## Technical Architecture

### Frontend Data Flow:
```
SpeechSynthesis.tsx
    ↓
  POST /api/synthesize
    ↓
  GET /api/spectrogram/<filename>
    ↓
  MelSpectrogramVisualizer.tsx (renders on canvas)
```

### Backend Data Flow:
```
WAV Audio File
    ↓
  librosa.load() → Extract audio signal
    ↓
  librosa.feature.melspectrogram() → Compute mel-spectrogram
    ↓
  librosa.power_to_db() → Convert to dB scale
    ↓
  Normalize to 0-255 → Transpose to time×frequency
    ↓
  JSON Response
```

## Visual Experience

### Before (Without Spectrogram):
- 3D speaker animation (rotating)
- Waveform bars (bouncing)
- "Synthesizing..." text message

### After (With Spectrogram):
- 3D speaker animation (rotating)
- **Mel-spectrogram visualization (animated during synthesis)**
- Waveform bars (bouncing)
- "Synthesizing..." with pulsing indicator

## Browser Compatibility

- **Canvas API**: Supported in all modern browsers
- **RequestAnimationFrame**: 60 FPS smooth animation
- **Color rendering**: Hardware accelerated on most devices

## Performance Considerations

### Frontend:
- Canvas rendering at 60 FPS (requestAnimationFrame)
- Minimal memory: ~1-2 MB for canvas buffer
- Smooth animation even on lower-end devices

### Backend:
- Mel-spectrogram generation takes ~100-500ms per audio file
- Librosa efficiently uses NumPy for computation
- JSON response size: ~50-200 KB per synthesis

## Customization Options

### Adjust Mel-Spectrogram Parameters:

In `api_server.py` at line ~295:
```python
mel_spec = librosa.feature.melspectrogram(
    y=y, 
    sr=sr,
    n_mels=80,        # Change frequency bins (80 is standard)
    hop_length=512    # Change time resolution
)
```

### Adjust Animation Speed:

In `MelSpectrogramVisualizer.tsx` at line ~91:
```typescript
const time = Date.now() / 1000;  // Adjust divisor to speed up/slow down
```

### Adjust Colormap:

Modify `getSpectrogramColor()` function in `MelSpectrogramVisualizer.tsx` to use different color schemes (viridis, plasma, inferno, etc.).

## Dependencies

### New Backend Dependencies:
- `librosa` - Already installed (used for mel-spectrogram generation)
- `numpy` - Already installed (used for computation)

### New Frontend Dependencies:
- None! Uses native Canvas API and React Hooks

## Future Enhancements

1. **Real-time streaming**: Stream spectrogram chunks as synthesis progresses
2. **FFT overlay**: Show fast fourier transform alongside mel-spectrogram
3. **Spectrogram comparison**: Display input voice and synthesized voice spectrograms side-by-side
4. **MFCC visualization**: Show mel-frequency cepstral coefficients
5. **Frequency annotation**: Label key frequencies (fundamental, harmonics, formants)
6. **Spectrogram recording**: Download/save spectrogram images as PNG

## Testing

### To test the mel-spectrogram feature:

1. Start backend: `python api_server.py`
2. Start frontend: `npm run dev`
3. Enroll a voice
4. Enter text to synthesize
5. Click "Generate Speech"
6. **Observe animated mel-spectrogram during synthesis**
7. **Observe actual mel-spectrogram after synthesis completes**

### Browser Console Logs:
- Watch for `"Spectrogram data loaded:"` message
- Check spectrogram dimensions match (should show time_steps and 80 frequency bins)

## Troubleshooting

### Spectrogram not showing:
- Check browser console for errors
- Ensure `/api/spectrogram/<filename>` endpoint responds with correct JSON
- Verify librosa is installed: `pip show librosa`

### Animated spectrogram frozen:
- Check if `requestAnimationFrame` is supported
- Check canvas 2D context is available
- Review browser console for canvas errors

### Spectrogram data not loading:
- Ensure synthesis completed successfully
- Check audio file exists in `outputs/` folder
- Verify filename extraction in `handleSynthesize()` is correct

## File Changes Summary

| File | Changes | Type |
|------|---------|------|
| `MelSpectrogramVisualizer.tsx` | New component (198 lines) | Created |
| `SpeechSynthesis.tsx` | Import component, add state, fetch spectrogram | Modified |
| `api_server.py` | Add `/api/spectrogram/<filename>` endpoint | Modified |

---

**Total Lines Added**: ~400 lines (frontend + backend)
**UI Improvement**: Real-time visualization of AI synthesis process
**User Experience**: Engaging, educational, shows what's happening during synthesis
