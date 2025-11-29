# Deployment Files - Visual Guide

## Files You Need to Add

### ✅ CREATED - 6 Files

```
your-project/
│
├─── 📄 requirements.txt ...................... CREATED ✅
│    Purpose: List of Python packages to install
│    Size: ~500 bytes
│    Usage: `pip install -r requirements.txt`
│
├─── 📄 Dockerfile ........................... CREATED ✅
│    Purpose: Docker container configuration
│    Size: ~800 bytes
│    Usage: `docker build -t myapp .`
│
├─── 📄 Procfile ............................. CREATED ✅
│    Purpose: How to start the app
│    Size: ~100 bytes
│    Usage: For Heroku-style deployments
│
├─── 📄 startup.sh ........................... CREATED ✅
│    Purpose: Bash script to run on startup
│    Size: ~400 bytes
│    Usage: `bash startup.sh`
│
├─── 📄 web.config ........................... CREATED ✅
│    Purpose: IIS configuration (Windows)
│    Size: ~1KB
│    Usage: Windows App Service deployment
│
└─── 📄 .dockerignore ........................ CREATED ✅
     Purpose: Files to exclude from Docker
     Size: ~500 bytes
     Usage: Speeds up Docker builds
```

---

## Deployment Method Flow

### 🐳 Docker Method (Recommended)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  1. Run: az acr build ... (build Docker image)         │
│     └─ Reads: Dockerfile, requirements.txt             │
│     └─ Produces: Docker image (~2GB)                   │
│                                                         │
│  2. Run: az webapp create ... (deploy to Azure)        │
│     └─ Reads: Docker image from registry               │
│     └─ Starts: Container with your app                 │
│                                                         │
│  3. Azure runs: gunicorn api_server:app               │
│     └─ Listens on: 0.0.0.0:8000                       │
│     └─ Your API is live!                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 📤 Git Method (Simplest)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  1. Run: git push azure main                           │
│     └─ Pushes your code to Azure                       │
│                                                         │
│  2. Azure runs: startup.sh                             │
│     └─ Reads: startup.sh script                        │
│     └─ Installs: `pip install -r requirements.txt`    │
│     └─ Starts: gunicorn api_server:app                │
│                                                         │
│  3. Your API is live!                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## What Each File Does

### 1️⃣ requirements.txt
**Like a shopping list for Python**

```
Flask==2.3.3           ← Web framework
torch==2.0.1           ← Machine learning
librosa==0.10.0        ← Audio processing
gunicorn==21.2.0       ← Production server
```

When Azure starts your app:
```
pip install -r requirements.txt
│
├─ Downloads Flask
├─ Downloads PyTorch (500MB)
├─ Downloads librosa
└─ Downloads gunicorn
```

---

### 2️⃣ Dockerfile
**Like a blueprint for creating a container**

```dockerfile
FROM python:3.10-slim
│
├─ Start with Python 3.10 image
│
COPY requirements.txt .
pip install -r requirements.txt
│
├─ Install all Python packages
│
COPY . .
│
├─ Copy your code
│
EXPOSE 8000
│
├─ Listen on port 8000
│
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "api_server:app"]
│
└─ Run this command to start
```

When you run `docker build`:
```
1. Creates a container
2. Installs Python 3.10
3. Copies all your files
4. Installs dependencies
5. Starts gunicorn server
6. Container ready to upload!
```

---

### 3️⃣ startup.sh
**Like a checklist that runs on startup**

```bash
#!/bin/bash
pip install -r requirements.txt    # Install packages
mkdir -p models/default            # Create directories
mkdir -p enrolled_voices
mkdir -p outputs
gunicorn --bind 0.0.0.0:8000 api_server:app  # Start server
```

Azure runs this when your app starts.

---

### 4️⃣ Procfile
**Tells Heroku-like platforms how to start your app**

```
web: gunicorn --bind 0.0.0.0:$PORT api_server:app
```

Simple = "Run this command to start"

---

### 5️⃣ web.config
**Configuration for Windows IIS servers**

If you choose Windows App Service:
- Reads: web.config
- Configures: IIS to run your Python app
- Runs: Your Flask server

(Only needed if using Windows, not Linux)

---

### 6️⃣ .dockerignore
**Tell Docker what files to skip**

```
node_modules/              ← Skip frontend files
__pycache__/              ← Skip Python cache
.git                      ← Skip git history
*.log                     ← Skip log files
```

Without this, Docker includes everything (500MB+ extra!)

With this:
- Smaller image size ✅
- Faster builds ✅
- Cleaner deployment ✅

---

## Deployment Comparison Table

| Aspect | Docker | Git | ZIP |
|--------|--------|-----|-----|
| **Setup Time** | 20 min | 15 min | 10 min |
| **Files Needed** | Dockerfile, requirements | requirements, startup.sh | All code |
| **Deploy Time** | 15 min (build) | 10 min | 5 min |
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Easy to Update** | Medium | Easy | Hard |
| **Good for ML** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

---

## Your Deployment Path

### Path A: Docker (Recommended) 🐳

```
You have files:
├─ requirements.txt ✅
├─ Dockerfile ✅
├─ api_server.py ✅
└─ models/ ✅
        ↓
    1. Build Docker image
        ↓
    2. Push to Azure Container Registry
        ↓
    3. Deploy to App Service
        ↓
    Your API is live! 🎉
```

### Path B: Git (Easiest) 📤

```
You have files:
├─ requirements.txt ✅
├─ startup.sh ✅
├─ api_server.py ✅
└─ models/ ✅
        ↓
    1. Push code: git push azure main
        ↓
    2. Azure runs startup.sh
        ↓
    3. Your API is live! 🎉
```

---

## What Happens After Deployment

### Your Backend Server
```
┌──────────────────────────────────────────┐
│ Azure App Service (Your Backend)         │
│ https://voice-cloning-api.azurewebsites.net
│                                          │
│  ┌──────────────────────────────────┐  │
│  │ Port 8000                        │  │
│  │ ├─ POST /api/enroll             │  │
│  │ ├─ POST /api/synthesize         │  │
│  │ ├─ GET /api/audio/<file>        │  │
│  │ └─ GET /api/spectrogram/<file>  │  │
│  └──────────────────────────────────┘  │
│                ↕                        │
│  ┌──────────────────────────────────┐  │
│  │ Files (Models, Voices, Output)   │  │
│  │ ├─ models/default/               │  │
│  │ │  ├─ encoder.pt                 │  │
│  │ │  ├─ synthesizer.pt             │  │
│  │ │  └─ vocoder.pt                 │  │
│  │ ├─ enrolled_voices/              │  │
│  │ └─ outputs/                      │  │
│  └──────────────────────────────────┘  │
│                                         │
│  Listening for requests from Frontend   │
└──────────────────────────────────────────┘
```

### Your Frontend (Already Running)
```
┌──────────────────────────────────────────┐
│ Netlify (Your Frontend)                  │
│ https://your-frontend.netlify.app       │
│                                          │
│  ┌──────────────────────────────────┐  │
│  │ React App                        │  │
│  │ ├─ Voice Enrollment              │  │
│  │ ├─ Speech Synthesis              │  │
│  │ └─ Real-time Visualizations      │  │
│  └──────────────────────────────────┘  │
│                ↕                        │
│  Sends requests to Backend API →   │
└──────────────────────────────────────────┘
```

### Communication
```
Frontend (Netlify) ←→ Backend (Azure)
   ↓                      ↓
User Browser         Voice Cloning
(Port 80/443)        (Port 8000)
                     
POST /api/enroll
  Frontend → Backend → Process voice → Save
                       ← Return response

GET /api/synthesize
  Frontend → Backend → Run ML models → Generate audio
                       ← Return audio file

GET /api/audio/file
  Frontend ← Backend ← Read from disk
  Play audio in browser
```

---

## Quick Command Reference

### Docker Method
```bash
# Build
az acr build --registry myregistry --image voice-cloning-api:latest .

# Deploy
az webapp create --deployment-container-image-name myregistry...
```

### Git Method
```bash
# Add remote
git remote add azure https://...

# Deploy
git push azure main
```

### View Logs
```bash
az webapp log tail --resource-group voice-cloning --name voice-cloning-api
```

### Test
```bash
curl https://voice-cloning-api.azurewebsites.net/api/health
```

---

## Files Summary

```
Total Files Created: 6
├─ requirements.txt (500 B)
├─ Dockerfile (800 B)
├─ Procfile (100 B)
├─ startup.sh (400 B)
├─ web.config (1 KB)
└─ .dockerignore (500 B)

Total Size: ~4 KB (negligible)
All committed to Git: ✅
Ready to deploy: ✅
```

---

**Next Step: Choose a deployment method and follow DEPLOYMENT_CHECKLIST.md! 🚀**
