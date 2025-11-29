# Files Needed for Azure App Service Deployment

## Summary

You need **5 key files** to deploy your backend to Azure. All have been created in your project root.

---

## Files Created

### 1. **requirements.txt** ✅
- **Purpose**: Specifies all Python dependencies
- **Location**: `/rtvc/requirements.txt`
- **Contains**: Flask, PyTorch, librosa, scipy, etc.
- **Usage**: Azure uses this to install dependencies

### 2. **Dockerfile** ✅
- **Purpose**: Creates a Docker container for your app
- **Location**: `/rtvc/Dockerfile`
- **Includes**: Python 3.10 base image, dependencies, system packages
- **Usage**: Azure builds and runs this container
- **Recommended** for deployment

### 3. **Procfile** ✅
- **Purpose**: Defines how to start your app
- **Location**: `/rtvc/Procfile`
- **Contains**: `gunicorn --bind 0.0.0.0:$PORT api_server:app`
- **Usage**: For Heroku-style deployments

### 4. **web.config** ✅
- **Purpose**: IIS configuration for Windows-based deployment
- **Location**: `/rtvc/web.config`
- **Usage**: If deploying on Windows App Service

### 5. **startup.sh** ✅
- **Purpose**: Bash script that runs on app startup
- **Location**: `/rtvc/startup.sh`
- **Usage**: Creates directories, installs packages, starts Flask

### 6. **.dockerignore** ✅
- **Purpose**: Specifies files to exclude from Docker builds
- **Location**: `/rtvc/.dockerignore`
- **Usage**: Keeps Docker image smaller and faster

---

## Deployment Methods

### **Method 1: Docker (Recommended)** ⭐⭐⭐
```bash
# Build Docker image
docker build -t voice-cloning-api .

# Test locally
docker run -p 8000:8000 voice-cloning-api

# Push to Azure Container Registry
az acr build --registry voicecloningacr \
             --image voice-cloning-api:latest \
             .

# Deploy to App Service
az webapp create --name voice-cloning-api \
                 --deployment-container-image-name ...
```

**Pros:**
- Most reliable
- Works on any platform
- Best for production
- Easy to scale

---

### **Method 2: Git Push** ⭐⭐
```bash
# Create App Service
az webapp create --name voice-cloning-api \
                 --runtime "PYTHON:3.10"

# Configure startup
az webapp config set \
  --startup-file startup.sh

# Push code
git push azure main
```

**Pros:**
- Simple deployment
- Automatic builds
- Uses `requirements.txt` and `startup.sh`

---

### **Method 3: ZIP Upload** ⭐
```bash
# Create ZIP file
Compress-Archive -Path . -DestinationPath deployment.zip

# Deploy
az webapp deployment source config-zip \
  --resource-group voice-cloning \
  --name voice-cloning-api \
  --src deployment.zip
```

**Pros:**
- One-time deployment
- No Git needed

---

## Quick Start (Copy-Paste Commands)

### Step 1: Login to Azure
```bash
az login
```

### Step 2: Create Resources
```bash
# Create resource group
az group create --name voice-cloning --location eastus

# Create App Service Plan
az appservice plan create \
  --name voice-cloning-plan \
  --resource-group voice-cloning \
  --sku B2 --is-linux
```

### Step 3: Deploy with Docker (Recommended)
```bash
# Create Container Registry
az acr create --resource-group voice-cloning \
              --name voicecloningacr \
              --sku Basic

# Build and push Docker image
az acr build --registry voicecloningacr \
             --image voice-cloning-api:latest .

# Create Web App
az webapp create \
  --resource-group voice-cloning \
  --plan voice-cloning-plan \
  --name voice-cloning-api \
  --deployment-container-image-name voicecloningacr.azurecr.io/voice-cloning-api:latest
```

### Step 4: Configure Environment
```bash
az webapp config appsettings set \
  --resource-group voice-cloning \
  --name voice-cloning-api \
  --settings FLASK_ENV=production \
              CORS_ORIGINS=https://your-frontend.netlify.app
```

### Step 5: Update Frontend
In Netlify dashboard → Settings → Environment:
```
VITE_API_URL = https://voice-cloning-api.azurewebsites.net
```

### Step 6: Test
```bash
curl https://voice-cloning-api.azurewebsites.net/api/health
```

---

## File Checklist

- ✅ `requirements.txt` - Python dependencies
- ✅ `Dockerfile` - Docker container
- ✅ `Procfile` - App startup config
- ✅ `web.config` - IIS configuration
- ✅ `startup.sh` - Bash startup script
- ✅ `.dockerignore` - Docker build exclusions
- ✅ `api_server.py` - Your Flask app (already exists)
- ✅ `run_cli.py` - Voice cloning logic (already exists)
- ✅ `encoder/`, `synthesizer/`, `vocoder/` - ML modules (already exist)
- ✅ `models/default/` - Pre-trained models (already exists)

---

## Important Notes

### ⚠️ Models Size
- Your models directory is ~500MB
- Must be included in Docker build
- Takes ~5 minutes to build Docker image
- Build happens on Azure side

### ⚠️ Synthesis Time
- Synthesis takes **60-90 seconds** per request
- App Service B2 tier minimum recommended
- Don't upgrade plan immediately - test first

### ⚠️ Storage
- Files created during synthesis are temporary
- Use Azure Blob Storage for permanent storage
- Or accept files are deleted after 24 hours

### ⚠️ Memory/CPU
- Starts with 1 worker (gunicorn)
- Increase if you get timeout errors
- Monitor App Service Insights

---

## Next Steps

1. **Commit files to GitHub**
   ```bash
   git add .
   git commit -m "Add Azure deployment files"
   git push origin Pragyan
   ```

2. **Follow Quick Start guide above** (5-10 minutes)

3. **Test end-to-end**:
   - Open frontend URL
   - Enroll a voice
   - Generate speech
   - Verify audio works

4. **Monitor logs**:
   ```bash
   az webapp log tail --resource-group voice-cloning \
                      --name voice-cloning-api
   ```

---

## Detailed Documentation

- Full guide: See `AZURE_DEPLOYMENT.md` in this directory
- Docker docs: https://docs.docker.com/
- Azure App Service: https://learn.microsoft.com/azure/app-service/
- Flask deployment: https://flask.palletsprojects.com/deployment/

---

## Cost Breakdown (Monthly)

| Item | Cost |
|------|------|
| B2 App Service Plan | ~$50 |
| Container Registry | ~$5 |
| Blob Storage (if used) | ~$2 |
| **Total** | **~$57/month** |

Azure free tier gives $200 credit for first month - enough for testing!

---

## Support

Need help? Check:
1. `AZURE_DEPLOYMENT.md` - Detailed setup guide
2. `DEPLOYMENT_GUIDE.md` - Architecture overview
3. Flask logs: `az webapp log tail ...`
4. Azure Portal: https://portal.azure.com
