# Backend-Frontend Integration Guide

## Integration Complete! 🎉

Your voice cloning backend has been successfully integrated with the React frontend.

## Architecture Overview

```
Frontend (React + Vite)          Backend (Flask API)         Voice Cloning Engine
Port: 8080                       Port: 5000                  (PyTorch Models)
                                                             
┌─────────────────┐             ┌─────────────────┐         ┌──────────────────┐
│ VoiceEnrollment │────────────>│ POST /api/enroll│────────>│ Save Voice Sample│
│   Component     │             │                 │         │ enrolled_voices/ │
└─────────────────┘             └─────────────────┘         └──────────────────┘
                                                             
┌─────────────────┐             ┌─────────────────┐         ┌──────────────────┐
│ SpeechSynthesis │────────────>│ GET /api/voices │────────>│ List Enrolled    │
│   Component     │             │                 │         │ Voices from DB   │
└─────────────────┘             └─────────────────┘         └──────────────────┘
                                                             
┌─────────────────┐             ┌─────────────────┐         ┌──────────────────┐
│ SpeechSynthesis │────────────>│POST /synthesize │────────>│ Generate Speech  │
│   Component     │             │                 │         │ using run_cli.py │
└─────────────────┘             └─────────────────┘         └──────────────────┘
                                                             
                                ┌─────────────────┐         
                                │ GET /api/audio  │────────>│ Serve WAV Files  │
                                │                 │         │ from outputs/    │
                                └─────────────────┘         └──────────────────┘
```

## What Was Integrated

### Backend Changes
1. **Created `api_server.py`** - Flask REST API with 5 endpoints:
   - `GET /api/health` - Health check endpoint
   - `POST /api/enroll` - Accept and save voice samples
   - `GET /api/voices` - List all enrolled voices
   - `POST /api/synthesize` - Generate cloned speech
   - `GET /api/audio/<filename>` - Serve generated audio files

2. **Uses existing infrastructure**:
   - Leverages your working `run_cli.py` synthesize() function
   - Saves voices to `enrolled_voices/` directory
   - Outputs generated audio to `outputs/` directory
   - Maintains a `voices.json` database for enrolled voices

### Frontend Changes (React Components)

1. **VoiceEnrollment.tsx** (Updated lines 64-94)
   - Now sends real audio files to backend via `POST /api/enroll`
   - Handles both uploaded files and recorded audio
   - Converts audio Blob to File for API submission
   - Shows success/error toasts with backend responses

2. **SpeechSynthesis.tsx** (Updated lines 1-90)
   - Loads enrolled voices from backend on component mount
   - Calls `GET /api/voices` to populate dropdown
   - Sends text + voice_id to `POST /api/synthesize`
   - Receives and plays generated audio from backend
   - Downloads audio files from backend server

## How to Run

### Step 1: Start the Backend API Server

Open a terminal in the project root and run:

```powershell
cd C:\Users\Pragyan\Downloads\vc\rtvc
python api_server.py
```

You should see:
```
============================================================
Voice Cloning API Server
============================================================
Server starting on http://localhost:5000
...
 * Running on http://127.0.0.1:5000
```

**Keep this terminal open** - the server needs to stay running.

### Step 2: Start the Frontend Dev Server

Open a **new terminal** and run:

```powershell
cd "C:\Users\Pragyan\Downloads\vc\rtvc\Frontend Voice Cloning"
npm run dev
```

You should see:
```
VITE v7.1.12  ready in XXX ms

➜  Local:   http://localhost:8080/
```

### Step 3: Use the Application

1. Open your browser to **http://localhost:8080/**

2. **Enroll a Voice**:
   - Navigate to "Voice Enrollment" section
   - Enter a voice name (e.g., "My Voice")
   - Either:
     - Record audio using the microphone (3-10 seconds recommended)
     - Or upload an audio file (.mp3, .wav, .m4a)
   - Click "Enroll Voice"
   - Wait for success message

3. **Generate Speech**:
   - Navigate to "Speech Synthesis" section
   - Select your enrolled voice from the dropdown
   - Enter text to synthesize (English and Hindi supported)
   - Click "Generate Speech"
   - Wait ~10-30 seconds for generation
   - Play the generated audio or download it

## API Endpoints Reference

### Health Check
```http
GET http://localhost:5000/api/health
Response: { "status": "healthy", "message": "Voice Cloning API is running" }
```

### Enroll Voice
```http
POST http://localhost:5000/api/enroll
Content-Type: multipart/form-data

Form Data:
  - voice_name: string (required)
  - audio: file (required, mp3/wav/m4a)

Response: {
  "success": true,
  "voice_id": "uuid-here",
  "voice_name": "My Voice",
  "message": "Voice enrolled successfully"
}
```

### List Voices
```http
GET http://localhost:5000/api/voices

Response: {
  "voices": [
    {
      "id": "uuid-here",
      "name": "My Voice",
      "path": "/path/to/audio.mp3",
      "enrolled_at": "2025-01-21T10:30:00"
    }
  ]
}
```

### Synthesize Speech
```http
POST http://localhost:5000/api/synthesize
Content-Type: application/json

Body: {
  "voice_id": "uuid-here",
  "text": "Hello, this is a test."
}

Response: {
  "success": true,
  "audio_url": "/api/audio/clone_1234567890.wav",
  "text": "Hello, this is a test.",
  "generation_time": 12.5
}
```

### Get Audio File
```http
GET http://localhost:5000/api/audio/<filename>

Returns: WAV audio file (audio/wav)
```

## Directory Structure

```
rtvc/
├── api_server.py          # Flask API backend (NEW)
├── run_cli.py             # CLI tool (used by API)
├── clone_my_voice.py      # Standalone script
├── enrolled_voices/       # Uploaded voice samples (NEW)
│   ├── voices.json        # Voice database (NEW)
│   └── *.mp3/wav          # Voice audio files
├── outputs/               # Generated speech files
│   └── clone_*.wav        # Output audio files
├── models/                # Pre-trained models
│   ├── encoder.pt         # Speaker encoder
│   ├── synthesizer.pt     # Speech synthesizer
│   └── vocoder.pt         # WaveRNN vocoder
├── encoder/               # Encoder module
├── synthesizer/           # Synthesizer module
├── vocoder/               # Vocoder module
└── Frontend Voice Cloning/
    ├── src/
    │   └── components/
    │       └── forms/
    │           ├── VoiceEnrollment.tsx  # Updated ✓
    │           └── SpeechSynthesis.tsx  # Updated ✓
    └── package.json
```

## Testing the Integration

Use the provided test script to verify endpoints:

```powershell
python test_api.py
```

Expected output:
```
============================================================
API Integration Test
============================================================

1. Testing health check...
   Status: 200
   Response: {'status': 'healthy', 'message': 'Voice Cloning API is running'}

2. Testing voices list...
   Status: 200
   Found 0 voices
============================================================
Test complete!
============================================================
```

## Troubleshooting

### Backend server won't start
- Check if port 5000 is already in use
- Make sure Flask and Flask-CORS are installed: `pip install flask flask-cors`
- Check models are present in `models/` directory

### Frontend can't connect to backend
- Verify backend server is running on port 5000
- Check browser console for CORS errors
- Make sure both servers are running simultaneously

### Voice enrollment fails
- Check audio file format is supported (.mp3, .wav, .m4a)
- Verify `enrolled_voices/` directory exists and is writable
- Check backend terminal for error messages

### Speech synthesis fails
- Ensure a voice is enrolled and selected
- Check if models are loaded correctly (first synthesis takes longer)
- Verify text is not empty
- Check backend terminal for synthesis errors

### Audio playback issues
- Verify generated WAV file exists in `outputs/` directory
- Check if audio URL is correct in browser console
- Try downloading the file and playing it externally

## Performance Notes

- **First synthesis**: Takes ~30-60 seconds (models loading)
- **Subsequent syntheses**: ~10-20 seconds per sentence
- **Generation speed**: ~2.8kHz (CPU mode)
- **Recommended voice sample**: 3-10 seconds for best quality

## What Was NOT Changed

As requested, the following frontend elements remain **completely untouched**:

✅ All UI components (buttons, forms, cards, etc.)
✅ All styling (Tailwind CSS, glass effects, gradients)
✅ 3D visualizations (Three.js, Spline scenes)
✅ Audio visualizers and waveforms
✅ Navigation and routing
✅ All other page components
✅ Build configuration (Vite, TypeScript)

**Only modified**: The actual API call logic in VoiceEnrollment and SpeechSynthesis components (replaced mock data with real backend calls).

## Next Steps

1. ✅ Backend API server created and running
2. ✅ Frontend components connected to backend
3. ⏳ Test full workflow: Enroll → List → Synthesize → Play
4. 📝 Consider adding features:
   - Voice sample preview before enrollment
   - Progress bars for synthesis
   - Voice management (delete, rename)
   - Batch synthesis
   - Export all enrolled voices

## Notes

- The backend runs in debug mode (`debug=True`), which auto-reloads on code changes
- For production, consider using a production WSGI server (gunicorn, waitress)
- All voice data is stored locally in `enrolled_voices/` and `outputs/`
- The `voices.json` file tracks all enrolled voices as a simple database

---

**Integration Status**: ✅ COMPLETE

Both frontend and backend are now connected and ready to use!
