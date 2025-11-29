# Voice Cloning - Full Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Netlify Frontend (React)                                 │  │
│  │  https://your-frontend.netlify.app                        │  │
│  │  - Voice enrollment UI                                    │  │
│  │  - Speech synthesis interface                             │  │
│  │  - Real-time visualizations (FFT, mel-spec)               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTP/HTTPS
                        (API Requests/Responses)
                              
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND SERVER                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Flask API (Python)                                       │  │
│  │  Running on Cloud Platform (Azure, AWS, Heroku, etc.)    │  │
│  │                                                           │  │
│  │  ├─ POST /api/enroll (voice enrollment)                  │  │
│  │  ├─ POST /api/synthesize (text-to-speech)                │  │
│  │  ├─ GET /api/audio/<file> (download audio)               │  │
│  │  ├─ GET /api/spectrogram/<file> (mel-spectrogram)        │  │
│  │  └─ GET /api/voices (list enrolled voices)               │  │
│  │                                                           │  │
│  │  Dependencies:                                            │  │
│  │  - Encoder (speaker embedding extraction)                │  │
│  │  - Synthesizer (Tacotron2 mel-spectrogram generation)     │  │
│  │  - Vocoder (Griffin-Lim / WaveRNN)                        │  │
│  │  - Pre-trained models (~500MB)                            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## FRONTEND DEPLOYMENT (Already Done ✅)

### What You've Done:
- Deployed React app to **Netlify**
- Frontend accessible at: `https://your-frontend.netlify.app`
- Frontend is **static** (no server-side dependencies)

### Frontend Environment Variables:
The frontend needs to know where the backend is. Create a `.env` file in your frontend:

```bash
# Frontend/.env or set in Netlify dashboard
VITE_API_URL=https://your-backend-url.com
```

Then in your React code, use:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

---

## BACKEND DEPLOYMENT OPTIONS

### Option 1: **Azure App Service** (Recommended - Free tier available)

**Pros:**
- Free tier for testing
- Handles large ML models
- Auto-scaling available
- Good for Python Flask apps

**Steps:**

1. **Create Azure Account** (free $200 credit)
   - Go to: https://azure.microsoft.com/free

2. **Create Resource Group:**
   ```bash
   az group create --name voice-cloning --location eastus
   ```

3. **Create App Service Plan:**
   ```bash
   az appservice plan create \
     --name voice-cloning-plan \
     --resource-group voice-cloning \
     --sku B1 --is-linux
   ```

4. **Create Web App:**
   ```bash
   az webapp create \
     --resource-group voice-cloning \
     --plan voice-cloning-plan \
     --name voice-cloning-api \
     --runtime "PYTHON:3.10"
   ```

5. **Deploy Code:**
   ```bash
   cd your-project
   az webapp deployment source config-zip \
     --resource-group voice-cloning \
     --name voice-cloning-api \
     --src deployment.zip
   ```

6. **Backend URL:**
   ```
   https://voice-cloning-api.azurewebsites.net
   ```

---

### Option 2: **AWS Lambda + API Gateway** (Serverless)

**Pros:**
- Pay only for what you use
- Auto-scaling
- Free tier available (1M requests/month)

**Cons:**
- Complex deployment
- Model files need to be packaged (~500MB limit)

**Steps:**
1. Use AWS SAM CLI to package Flask app
2. Deploy to Lambda with container image
3. Use API Gateway to expose endpoints

---

### Option 3: **Heroku** (Simple - But Paid)

**Pros:**
- Simple deployment (just `git push`)
- Good for beginners

**Cons:**
- Paid only now (no free tier)
- ~$5-7/month minimum

**Steps:**
```bash
# Install Heroku CLI
# Login
heroku login

# Create app
heroku create voice-cloning-api

# Deploy
git push heroku main

# Backend URL: https://voice-cloning-api.herokuapp.com
```

---

### Option 4: **DigitalOcean App Platform** (Simple & Affordable)

**Pros:**
- $5-12/month for reliable hosting
- Easy deployment
- Good performance

**Steps:**
1. Create DigitalOcean account
2. Connect GitHub repo
3. DigitalOcean auto-deploys on push
4. Backend URL: `https://your-app-name.ondigitalocean.app`

---

### Option 5: **Docker + Your Own Server** (Advanced)

**Pros:**
- Full control
- Can run on any machine (VPS, local server, etc.)

**Steps:**

1. **Create Dockerfile:**
```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "api_server.py"]
```

2. **Build & Run:**
```bash
docker build -t voice-cloning-api .
docker run -p 5000:5000 voice-cloning-api
```

3. **Deploy to VPS:**
```bash
# Push to Docker Hub
docker tag voice-cloning-api your-username/voice-cloning-api
docker push your-username/voice-cloning-api

# On your server
docker pull your-username/voice-cloning-api
docker run -d -p 5000:5000 your-username/voice-cloning-api
```

---

## CONNECTING FRONTEND + BACKEND

### 1. Update Backend URL in Frontend

**In your React component (e.g., `SpeechSynthesis.tsx`):**

```typescript
// Replace hardcoded localhost with env variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Usage in fetch calls:
const response = await fetch(`${API_URL}/api/synthesize`, {
  method: 'POST',
  body: formData,
  headers: { 'Content-Type': 'application/json' }
});
```

### 2. CORS Configuration (Already Done ✅)

Your Flask backend already has CORS enabled:
```python
from flask_cors import CORS
app = Flask(__name__)
CORS(app)  # Allows requests from any frontend
```

For production, restrict to your domain:
```python
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://your-frontend.netlify.app"],
        "methods": ["GET", "POST", "OPTIONS"]
    }
})
```

### 3. Environment Variables Setup

**Frontend (.env):**
```
VITE_API_URL=https://your-backend.azurewebsites.net
```

**Backend (.env):**
```
FLASK_ENV=production
FLASK_DEBUG=False
CORS_ORIGINS=https://your-frontend.netlify.app
```

---

## DATA FLOW EXAMPLE: Voice Enrollment

```
1. User uploads voice file (frontend)
   ↓
2. Frontend sends to backend: POST /api/enroll
   Content: { voiceFile, voiceLabel }
   ↓
3. Backend receives file
   - Extract speaker embedding (Encoder)
   - Save to enrolled_voices/
   - Store metadata in voices.json
   ↓
4. Backend responds: { success: true, voiceId: "uuid" }
   ↓
5. Frontend stores voiceId and shows success message
   ↓
6. User can now use this voice for synthesis
```

---

## DATA FLOW: Speech Synthesis

```
1. User enters text + selects voice (frontend)
   ↓
2. Frontend sends: POST /api/synthesize
   { text: "Hello", voiceId: "uuid" }
   ↓
3. Backend processes:
   - Load voice embedding from enrolled_voices/
   - Generate mel-spectrogram (Synthesizer) - 45 seconds
   - Convert to audio (Vocoder) - 12 seconds
   - Save to outputs/synthesis_<uuid>.wav
   ↓
4. Backend responds: { audioFile: "synthesis_uuid.wav", status: "complete" }
   ↓
5. Frontend fetches audio: GET /api/audio/synthesis_uuid.wav
   ↓
6. Frontend plays audio to user
   ↓
7. User can download or re-synthesize
```

---

## RECOMMENDED DEPLOYMENT FLOW

### Step 1: Test Locally ✅ (Already Done)
- Frontend running on http://localhost:8080
- Backend running on http://localhost:5000
- Everything works locally

### Step 2: Deploy Backend (Choose One)
**Easiest: Azure App Service**
- Takes 15 minutes
- Free tier available
- Handles large models

### Step 3: Update Frontend Environment
```bash
# In Netlify Dashboard:
# Settings → Build & Deploy → Environment
# Add: VITE_API_URL=https://your-backend.azurewebsites.net
```

### Step 4: Redeploy Frontend (Auto on Git Push)
```bash
git push origin main
# Netlify automatically rebuilds and redeploys
```

### Step 5: Test End-to-End
- Go to https://your-frontend.netlify.app
- Enroll a voice
- Synthesize speech
- Verify audio plays

---

## IMPORTANT CONSIDERATIONS

### Performance:
- **Synthesis takes ~60 seconds** (Encoder 3s + Synthesizer 45s + Vocoder 12s)
- Use long-polling or WebSockets for real-time updates
- Frontend already polls every 3 seconds (good balance)

### Storage:
- **Models directory: ~500MB** (must be included in deployment)
- **Per synthesis output: ~100KB** (audio files)
- Consider cleanup job to delete old files

### Scaling:
- Add **load balancer** if traffic grows
- Use **database** (MongoDB, PostgreSQL) to store voice enrollments
- Consider **background job queue** (Celery) for synthesis

### Security:
- ✅ CORS configured for your domain
- ✅ File upload validation (only audio files)
- Add API key authentication for production
- Use HTTPS only (automatic with Netlify + cloud providers)

---

## QUICK START: Deploy to Azure (Recommended)

```bash
# 1. Install Azure CLI
# From: https://learn.microsoft.com/cli/azure/install-azure-cli

# 2. Login
az login

# 3. Create resource group
az group create --name voice-cloning --location eastus

# 4. Create App Service Plan
az appservice plan create \
  --name voice-cloning-plan \
  --resource-group voice-cloning \
  --sku B1 --is-linux

# 5. Create Web App for Python
az webapp create \
  --resource-group voice-cloning \
  --plan voice-cloning-plan \
  --name voice-cloning-backend \
  --runtime "PYTHON:3.10"

# 6. Configure deployment from GitHub
az webapp deployment source config-zip \
  --resource-group voice-cloning \
  --name voice-cloning-backend \
  --src <(git archive --format zip HEAD)

# 7. Get backend URL
# https://voice-cloning-backend.azurewebsites.net

# 8. Update frontend .env
VITE_API_URL=https://voice-cloning-backend.azurewebsites.net

# 9. Push to trigger rebuild
git push origin main
```

---

## SUMMARY TABLE

| Component | Location | Status | URL |
|-----------|----------|--------|-----|
| Frontend | Netlify | ✅ Deployed | https://your-site.netlify.app |
| Backend | ⏳ To Deploy | Need to choose | https://your-backend.* |
| Models | With Backend | Included | Local storage |
| Database | Optional | Not needed yet | - |

**Next Step:** Choose a backend option and let me help you deploy! 🚀
