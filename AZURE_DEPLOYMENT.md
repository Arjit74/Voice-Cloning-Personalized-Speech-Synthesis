# Azure App Service Deployment Guide

## Files Created for Deployment

```
rtvc/
├── requirements.txt          ← Python dependencies
├── Dockerfile               ← Docker container config (recommended)
├── Procfile                 ← Heroku-style deployment
├── web.config               ← IIS configuration
├── startup.sh               ← Startup script
└── .dockerignore            ← Files to ignore in Docker build
```

---

## Step-by-Step Deployment to Azure

### Prerequisites

1. **Azure Account** (free tier available)
   - https://azure.microsoft.com/free

2. **Azure CLI installed**
   ```bash
   # Windows (PowerShell)
   $ProgressPreference = 'SilentlyContinue'; iex ((New-Object System.Net.ServicePointManager).SecurityProtocol = 'Tls12'; Invoke-WebRequest -Uri https://aka.ms/installazurecliwindows -OutFile Azure-Cli.msi); & '.\Azure-Cli.msi' /quiet
   
   # Or download from: https://learn.microsoft.com/cli/azure/install-azure-cli-windows
   ```

3. **Docker installed** (optional but recommended)
   - https://www.docker.com/products/docker-desktop

---

## Option A: Deploy Using Docker (Recommended) ⭐

### 1. Build and Push Docker Image

```bash
# Login to Azure Container Registry
az login
az account list  # See your subscription

# Create Azure Container Registry
az acr create --resource-group voice-cloning \
              --name voicecloningacr \
              --sku Basic

# Login to your container registry
az acr login --name voicecloningacr

# Build and push Docker image
az acr build --registry voicecloningacr \
             --image voice-cloning-api:latest \
             .
```

### 2. Create App Service

```bash
# Create resource group
az group create --name voice-cloning --location eastus

# Create App Service Plan (B2 tier for ML workloads)
az appservice plan create \
  --name voice-cloning-plan \
  --resource-group voice-cloning \
  --sku B2 --is-linux

# Create Web App from Docker image
az webapp create \
  --resource-group voice-cloning \
  --plan voice-cloning-plan \
  --name voice-cloning-api \
  --deployment-container-image-name voicecloningacr.azurecr.io/voice-cloning-api:latest

# Configure container registry credentials
az webapp config container set \
  --name voice-cloning-api \
  --resource-group voice-cloning \
  --docker-custom-image-name voicecloningacr.azurecr.io/voice-cloning-api:latest \
  --docker-registry-server-url https://voicecloningacr.azurecr.io \
  --docker-registry-server-user <username> \
  --docker-registry-server-password <password>
```

### 3. Configure Environment Variables

```bash
az webapp config appsettings set \
  --resource-group voice-cloning \
  --name voice-cloning-api \
  --settings FLASK_ENV=production \
              FLASK_DEBUG=False \
              CORS_ORIGINS=https://your-frontend.netlify.app
```

### 4. Check Deployment Status

```bash
# View logs
az webapp log tail --resource-group voice-cloning --name voice-cloning-api

# Get backend URL
echo "Backend URL: https://voice-cloning-api.azurewebsites.net"
```

---

## Option B: Deploy Using Git Integration (Simpler)

### 1. Create App Service

```bash
# Create resource group
az group create --name voice-cloning --location eastus

# Create App Service Plan
az appservice plan create \
  --name voice-cloning-plan \
  --resource-group voice-cloning \
  --sku B2 --is-linux

# Create Web App
az webapp create \
  --resource-group voice-cloning \
  --plan voice-cloning-plan \
  --name voice-cloning-api \
  --runtime "PYTHON:3.10"
```

### 2. Configure Startup Script

```bash
az webapp config set \
  --resource-group voice-cloning \
  --name voice-cloning-api \
  --startup-file startup.sh
```

### 3. Deploy from GitHub

```bash
# Option A: Using ZIP deployment
az webapp deployment source config-zip \
  --resource-group voice-cloning \
  --name voice-cloning-api \
  --src deployment.zip

# Option B: Using Git
cd rtvc
az webapp deployment user set --user-name <username> --user-password <password>

git remote add azure https://<username>@voice-cloning-api.scm.azurewebsites.net/voice-cloning-api.git
git push azure main
```

### 4. View Deployment Logs

```bash
az webapp log tail --resource-group voice-cloning --name voice-cloning-api
```

---

## Option C: Manual Upload via Azure Portal

### 1. Go to Azure Portal
- https://portal.azure.com

### 2. Create App Service
- Click "Create a resource"
- Search "App Service"
- Select "Python 3.10"
- Fill in details:
  - Resource Group: Create new "voice-cloning"
  - Name: "voice-cloning-api"
  - Region: East US
  - Pricing: B2 (recommended for ML)

### 3. Upload Code via Kudu
- Go to `https://voice-cloning-api.scm.azurewebsites.net`
- Use Debug console to upload files
- Or use FTP deployment

### 4. Configure Startup Script
- Go to App Service → Configuration → Startup command
- Enter: `python -m gunicorn --bind 0.0.0.0:8000 api_server:app`

---

## Important Configuration for Azure

### 1. Update CORS in api_server.py

```python
from flask_cors import CORS

# Production CORS configuration
if os.environ.get('FLASK_ENV') == 'production':
    CORS(app, resources={
        r"/api/*": {
            "origins": [os.environ.get('CORS_ORIGINS', 'https://your-frontend.netlify.app')],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type"]
        }
    })
else:
    CORS(app)  # Allow all origins in development
```

### 2. Update API URL in Frontend

In Netlify Dashboard:
1. Go to Site settings → Build & Deploy → Environment
2. Add variable:
   ```
   VITE_API_URL = https://voice-cloning-api.azurewebsites.net
   ```
3. Trigger rebuild: `git push origin main`

### 3. Storage Configuration

Azure App Service has ephemeral storage. Files are deleted when app restarts.

**Solutions:**

**Option 1: Azure Blob Storage** (Recommended)
```bash
# Create storage account
az storage account create \
  --resource-group voice-cloning \
  --name voicecloningstorage \
  --kind StorageV2 \
  --sku Standard_LRS

# Create container
az storage container create \
  --account-name voicecloningstorage \
  --name enrolled-voices
```

**Option 2: Keep files (Small number)**
- Files persist for 24 hours in `/home/site/wwwroot`
- Recommended only for demo/testing

---

## Monitoring & Troubleshooting

### 1. View Logs

```bash
# Real-time logs
az webapp log tail --resource-group voice-cloning --name voice-cloning-api

# Stream logs
az webapp log stream --resource-group voice-cloning --name voice-cloning-api
```

### 2. Check Health Status

```bash
# Test API
curl https://voice-cloning-api.azurewebsites.net/api/health

# Expected response:
# {"status": "healthy", "message": "API is running"}
```

### 3. Common Issues

**Issue: Container won't start**
- Check Docker logs: `az webapp log tail`
- Verify port is 8000 (not 5000)
- Check file permissions

**Issue: Models not found**
- Models must be in the deployment package
- Or download on startup
- Check `/home/site/wwwroot/models/default/`

**Issue: Memory/CPU high**
- Upgrade to B3 or higher
- Reduce number of workers in gunicorn
- Add caching

**Issue: CORS errors in frontend**
- Check `CORS_ORIGINS` environment variable
- Ensure it matches frontend URL exactly
- Rebuild frontend after changing

---

## Cost Estimation

| Tier | Monthly Cost | Good For |
|------|-------------|----------|
| B1 | ~$12 | Development/testing |
| B2 | ~$50 | Production small load |
| B3 | ~$100 | Production medium load |
| P1V2 | ~$100 | Production high performance |

---

## Deployment Checklist

- [ ] Create Azure account
- [ ] Install Azure CLI
- [ ] Create resource group
- [ ] Create App Service Plan
- [ ] Create Web App
- [ ] Push code (Docker or Git)
- [ ] Configure environment variables
- [ ] Update frontend API URL
- [ ] Test `/api/health` endpoint
- [ ] Enroll a voice
- [ ] Synthesize speech
- [ ] Download audio

---

## Next Steps

1. **Push to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Add Azure deployment files"
   git push origin Pragyan
   ```

2. **Deploy to Azure** (choose one option above)

3. **Update Frontend** with backend URL

4. **Test End-to-End**:
   - Open frontend
   - Enroll a voice
   - Generate speech
   - Verify audio plays

---

## Useful Commands

```bash
# List all apps
az webapp list

# Get app details
az webapp show --resource-group voice-cloning --name voice-cloning-api

# Restart app
az webapp restart --resource-group voice-cloning --name voice-cloning-api

# Delete app (careful!)
az group delete --name voice-cloning

# SSH into container
az webapp create-remote-connection --resource-group voice-cloning --name voice-cloning-api
```

---

## Support

- Azure Documentation: https://learn.microsoft.com/azure/app-service/
- Flask Deployment: https://flask.palletsprojects.com/deployment/
- Docker Documentation: https://docs.docker.com/
