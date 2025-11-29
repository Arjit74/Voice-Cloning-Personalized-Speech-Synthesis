# Azure Deployment - Complete Summary

## What Files Do You Need?

### **Core Files (Required) ✅**

| File | Purpose | Status |
|------|---------|--------|
| `requirements.txt` | Python dependencies | ✅ Created |
| `Dockerfile` | Docker container config | ✅ Created |
| `api_server.py` | Flask app (already exists) | ✅ Exists |
| `models/default/` | Pre-trained models (already exists) | ✅ Exists |

### **Supporting Files (Recommended) ✅**

| File | Purpose | Use Case |
|------|---------|----------|
| `Procfile` | Heroku-style config | Git deployment method |
| `startup.sh` | Bash startup script | Git deployment method |
| `web.config` | IIS configuration | Windows App Service |
| `.dockerignore` | Docker build exclusions | Docker method |

---

## How It Works

### **Your Frontend (Already Deployed ✅)**
```
Netlify: https://your-frontend.netlify.app
- React app running in browser
- Calls backend API
```

### **Your Backend (To Deploy)**
```
Azure App Service: https://voice-cloning-api.azurewebsites.net
- Flask Python API
- Processes voice cloning
- Returns audio files
```

### **Data Flow**
```
1. User opens frontend
2. Enrolls a voice (uploads audio)
3. Frontend sends to: POST /api/enroll
4. Backend processes:
   - Extracts voice embedding
   - Saves to database
5. User generates speech
6. Frontend sends: POST /api/synthesize
7. Backend processes:
   - Encoder: 3 seconds
   - Synthesizer: 45 seconds
   - Vocoder: 12 seconds
8. Returns audio file
9. Frontend plays audio
```

---

## Deployment Method Comparison

### **Method 1: Docker (Recommended for Production)**

**Best For**: Production, scaling, reliability

```bash
# Build Docker image
az acr build --registry myregistry --image voice-cloning-api:latest .

# Deploy
az webapp create --deployment-container-image-name myregistry.azurecr.io/voice-cloning-api:latest
```

**Pros:**
- ✅ Most reliable
- ✅ Easiest to scale
- ✅ Best for ML workloads
- ✅ Works on any platform

**Cons:**
- ⚠️ Slower initial deployment (5-10 min for Docker build)
- ⚠️ Requires understanding of containers

**Time**: ~20 minutes (first time)

---

### **Method 2: Git Deployment (Easiest)**

**Best For**: Quick testing, development

```bash
# Setup Git deployment
git remote add azure https://...
git push azure main
```

**Pros:**
- ✅ Simplest setup
- ✅ Automatic redeploys on git push
- ✅ No Docker knowledge needed

**Cons:**
- ⚠️ Slower deployments (5-10 min each)
- ⚠️ More memory usage
- ⚠️ Less reliable for large models

**Time**: ~15 minutes (first time)

---

### **Method 3: ZIP Upload (One-time)**

**Best For**: Quick demo, testing

```bash
# Create and upload ZIP
Compress-Archive -Path . -DestinationPath deployment.zip
az webapp deployment source config-zip --src deployment.zip
```

**Pros:**
- ✅ Very simple
- ✅ No Git needed

**Cons:**
- ⚠️ One-time deployment
- ⚠️ Can't easily update
- ⚠️ No automatic rebuilds

**Time**: ~10 minutes

---

## File-by-File Guide

### 1️⃣ `requirements.txt` - What Python Packages to Install
```
Flask==2.3.3              # Web framework
Flask-CORS==4.0.0         # Cross-origin requests
torch==2.0.1              # PyTorch for ML
librosa==0.10.0           # Audio processing
gunicorn==21.2.0          # Production server
```

**Used by**: All deployment methods

---

### 2️⃣ `Dockerfile` - How to Package Your App
```dockerfile
FROM python:3.10-slim
RUN apt-get install libsndfile1 ffmpeg
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "api_server:app"]
```

**Used by**: Docker deployment method

**Key settings:**
- Port: `8000` (not 5000 for production)
- Workers: `1` (ML synthesis is CPU-intensive)
- Timeout: `300` seconds (synthesis takes 60-90s)

---

### 3️⃣ `startup.sh` - Bash Startup Script
```bash
#!/bin/bash
pip install -r requirements.txt
mkdir -p models/default enrolled_voices outputs
gunicorn --bind 0.0.0.0:8000 api_server:app
```

**Used by**: Git deployment method

---

### 4️⃣ `Procfile` - How to Start Your App
```
web: gunicorn --bind 0.0.0.0:$PORT api_server:app
```

**Used by**: Heroku-style deployments

---

### 5️⃣ `.dockerignore` - What NOT to Include in Docker
```
node_modules/
*.pyc
__pycache__/
.git
```

**Used by**: Docker method (speeds up builds)

---

## Quick Start (Choose One)

### 🚀 I want the easiest method
→ Use **Git Deployment**
1. Azure CLI
2. Create resource group, app service
3. Push code with `git push azure main`
4. Done!

### 🚀 I want the most reliable method
→ Use **Docker**
1. Azure CLI
2. Create container registry
3. Build Docker image
4. Deploy to app service
5. Done!

### 🚀 I want to test quickly
→ Use **ZIP Upload**
1. Zip up code
2. Upload via `az webapp deployment source config-zip`
3. Done!

---

## Environment Variables Required

These must be set in Azure for your backend to work:

```
FLASK_ENV              = production
FLASK_DEBUG            = False
CORS_ORIGINS           = https://your-frontend.netlify.app
```

**How to set:**
```bash
az webapp config appsettings set \
  --resource-group voice-cloning \
  --name voice-cloning-api \
  --settings FLASK_ENV=production FLASK_DEBUG=False CORS_ORIGINS=https://your-frontend.netlify.app
```

---

## Deployment Timeline

### **Docker Method**
```
Step 1: Create resources ...................... 5 min
Step 2: Build Docker image .................... 10 min  ← longest
Step 3: Deploy to App Service ................ 2 min
Step 4: App startup .......................... 3 min
Total ......................................... ~20 min
```

### **Git Method**
```
Step 1: Create resources ...................... 5 min
Step 2: Setup Git remote ...................... 1 min
Step 3: Push code (git push) .................. 10 min  ← downloads & installs deps
Step 4: App startup .......................... 3 min
Total ......................................... ~19 min
```

---

## Testing After Deployment

### 1. Check Health
```bash
curl https://voice-cloning-api.azurewebsites.net/api/health
# Expected: {"status": "healthy", "message": "API is running"}
```

### 2. Test From Frontend
1. Open https://your-frontend.netlify.app
2. Enroll a voice
3. Generate speech
4. Listen to result

### 3. Check Logs
```bash
az webapp log tail --resource-group voice-cloning --name voice-cloning-api
```

---

## Common Issues & Fixes

### ❌ "CORS error" in frontend
**Cause**: Frontend URL doesn't match CORS_ORIGINS setting

**Fix**:
```bash
az webapp config appsettings set \
  --resource-group voice-cloning \
  --name voice-cloning-api \
  --settings CORS_ORIGINS=https://your-exact-frontend-url.netlify.app
```

### ❌ "Synthesis timeout"
**Cause**: App service tier too low (B1) or workers misconfigured

**Fix**: Upgrade to B2 or higher
```bash
az appservice plan update \
  --resource-group voice-cloning \
  --name voice-cloning-plan \
  --sku B2
```

### ❌ "Models not found"
**Cause**: Models directory not included in deployment

**Fix**: Ensure `models/default/*.pt` files are in your deployment package

### ❌ "API won't start"
**Cause**: Python version mismatch or missing dependencies

**Fix**: Check logs
```bash
az webapp log tail --resource-group voice-cloning --name voice-cloning-api
```

---

## File Checklist

Before deploying, make sure you have:

```
rtvc/
├── ✅ api_server.py
├── ✅ run_cli.py
├── ✅ requirements.txt               ← NEW
├── ✅ Dockerfile                     ← NEW
├── ✅ Procfile                       ← NEW
├── ✅ startup.sh                     ← NEW
├── ✅ web.config                     ← NEW
├── ✅ .dockerignore                  ← NEW
├── ✅ encoder/
├── ✅ synthesizer/
├── ✅ vocoder/
├── ✅ models/default/
│   ├── encoder.pt
│   ├── synthesizer.pt
│   └── vocoder.pt
└── ✅ utils/
```

---

## Cost

| Item | Monthly Cost |
|------|--------------|
| B2 App Service | $50 |
| Container Registry (optional) | $5 |
| Blob Storage (optional) | $2 |
| **Total** | **~$50-60** |

**Azure Free Tier**: $200 credit for first month = Free testing!

---

## Next Steps

### 1. Commit Files
```bash
git add .
git commit -m "Add deployment files"
git push origin Pragyan
```

### 2. Choose Deployment Method

**Docker (Recommended)**:
```bash
# Full guide in AZURE_DEPLOYMENT.md
az acr build --registry myregistry --image voice-cloning-api:latest .
```

**Git (Easiest)**:
```bash
# Full guide in AZURE_DEPLOYMENT.md
git push azure main
```

### 3. Update Frontend
- Go to Netlify Dashboard
- Settings → Build & Deploy → Environment
- Add: `VITE_API_URL = https://voice-cloning-api.azurewebsites.net`

### 4. Test End-to-End
- Enroll a voice
- Generate speech
- Download audio

---

## Additional Resources

- **Full Deployment Guide**: `AZURE_DEPLOYMENT.md`
- **Deployment Checklist**: `DEPLOYMENT_CHECKLIST.md`
- **Files Readme**: `DEPLOYMENT_FILES_README.md`
- **Architecture Overview**: `DEPLOYMENT_GUIDE.md`
- **Deployment Script**: `deploy_to_azure.ps1`

---

## Support

Need help? Check:
1. Deployment logs: `az webapp log tail ...`
2. `DEPLOYMENT_CHECKLIST.md` - step-by-step instructions
3. `AZURE_DEPLOYMENT.md` - detailed troubleshooting
4. Azure Portal: https://portal.azure.com

---

**Ready to deploy? Pick a method above and follow the checklist! 🚀**
