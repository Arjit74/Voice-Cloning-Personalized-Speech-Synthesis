# Azure Deployment Checklist

## Pre-Deployment

- [ ] Azure account created (https://azure.microsoft.com/free)
- [ ] Azure CLI installed
- [ ] Docker installed (if using Docker method)
- [ ] All new files created:
  - [ ] `requirements.txt`
  - [ ] `Dockerfile`
  - [ ] `Procfile`
  - [ ] `web.config`
  - [ ] `startup.sh`
  - [ ] `.dockerignore`
- [ ] Files committed to GitHub:
  ```bash
  git add .
  git commit -m "Add Azure deployment files"
  git push origin Pragyan
  ```

## Deployment Steps

### Option A: Docker Deployment (Recommended)

- [ ] **Step 1**: Azure Login
  ```bash
  az login
  ```

- [ ] **Step 2**: Create Resource Group
  ```bash
  az group create --name voice-cloning --location eastus
  ```

- [ ] **Step 3**: Create App Service Plan
  ```bash
  az appservice plan create `
    --name voice-cloning-plan `
    --resource-group voice-cloning `
    --sku B2 --is-linux
  ```

- [ ] **Step 4**: Create Container Registry
  ```bash
  az acr create `
    --resource-group voice-cloning `
    --name voicecloningacr `
    --sku Basic
  ```

- [ ] **Step 5**: Build & Push Docker Image
  ```bash
  az acr build `
    --registry voicecloningacr `
    --image voice-cloning-api:latest .
  ```
  
  ⏱️ **This takes 5-10 minutes** (building Docker image with PyTorch)

- [ ] **Step 6**: Create Web App
  ```bash
  az acr login --name voicecloningacr
  
  $password = $(az acr credential show --name voicecloningacr `
    --query "passwords[0].value" --output tsv)
  
  az webapp create `
    --resource-group voice-cloning `
    --plan voice-cloning-plan `
    --name voice-cloning-api `
    --deployment-container-image-name voicecloningacr.azurecr.io/voice-cloning-api:latest
  ```

- [ ] **Step 7**: Configure Container Registry
  ```bash
  $username = $(az acr credential show --name voicecloningacr `
    --query username --output tsv)
  $password = $(az acr credential show --name voicecloningacr `
    --query "passwords[0].value" --output tsv)
  
  az webapp config container set `
    --name voice-cloning-api `
    --resource-group voice-cloning `
    --docker-custom-image-name voicecloningacr.azurecr.io/voice-cloning-api:latest `
    --docker-registry-server-url https://voicecloningacr.azurecr.io `
    --docker-registry-server-user $username `
    --docker-registry-server-password $password
  ```

- [ ] **Step 8**: Set Environment Variables
  ```bash
  az webapp config appsettings set `
    --resource-group voice-cloning `
    --name voice-cloning-api `
    --settings `
      FLASK_ENV=production `
      FLASK_DEBUG=False `
      CORS_ORIGINS=https://your-frontend.netlify.app
  ```

- [ ] **Step 9**: Wait for app to start (2-3 minutes)

### Option B: Git Deployment (Simpler)

- [ ] **Step 1**: Azure Login
  ```bash
  az login
  ```

- [ ] **Step 2**: Create Resource Group
  ```bash
  az group create --name voice-cloning --location eastus
  ```

- [ ] **Step 3**: Create App Service Plan
  ```bash
  az appservice plan create `
    --name voice-cloning-plan `
    --resource-group voice-cloning `
    --sku B2 --is-linux
  ```

- [ ] **Step 4**: Create Web App
  ```bash
  az webapp create `
    --resource-group voice-cloning `
    --plan voice-cloning-plan `
    --name voice-cloning-api `
    --runtime "PYTHON:3.10"
  ```

- [ ] **Step 5**: Configure Startup Script
  ```bash
  az webapp config set `
    --resource-group voice-cloning `
    --name voice-cloning-api `
    --startup-file startup.sh
  ```

- [ ] **Step 6**: Set Environment Variables
  ```bash
  az webapp config appsettings set `
    --resource-group voice-cloning `
    --name voice-cloning-api `
    --settings `
      FLASK_ENV=production `
      FLASK_DEBUG=False `
      CORS_ORIGINS=https://your-frontend.netlify.app
  ```

- [ ] **Step 7**: Deploy from Git
  ```bash
  az webapp deployment user set `
    --user-name your-username `
    --user-password your-password
  
  git remote add azure https://your-username@voice-cloning-api.scm.azurewebsites.net/voice-cloning-api.git
  git push azure main
  ```

  ⏱️ **This takes 5-10 minutes** (installing dependencies)

## Post-Deployment

- [ ] **Step 1**: Get Backend URL
  ```bash
  $backendUrl = "https://voice-cloning-api.azurewebsites.net"
  Write-Host "Backend URL: $backendUrl"
  ```

- [ ] **Step 2**: Test Health Endpoint
  ```bash
  curl https://voice-cloning-api.azurewebsites.net/api/health
  
  # Expected response:
  # {"status": "healthy", "message": "API is running"}
  ```

- [ ] **Step 3**: Check Logs
  ```bash
  az webapp log tail --resource-group voice-cloning --name voice-cloning-api
  ```

- [ ] **Step 4**: Update Netlify Frontend
  
  1. Go to https://app.netlify.com
  2. Select your site
  3. Go to **Settings → Build & Deploy → Environment**
  4. Add new variable:
     - Key: `VITE_API_URL`
     - Value: `https://voice-cloning-api.azurewebsites.net`
  5. Trigger rebuild:
     ```bash
     git push origin main
     ```

- [ ] **Step 5**: Test End-to-End
  1. Open frontend: `https://your-frontend.netlify.app`
  2. Go to "Voice Enrollment"
  3. Upload a voice sample (or record one)
  4. Click "Enroll Voice"
  5. Go to "Generate Speech"
  6. Select the enrolled voice
  7. Enter text
  8. Click "Generate"
  9. Wait ~60 seconds
  10. Listen to generated audio
  11. ✅ If it works, deployment is successful!

## Troubleshooting

### 🔴 Health check fails
```bash
# View logs
az webapp log tail --resource-group voice-cloning --name voice-cloning-api

# Common issues:
# - Port mismatch (should be 8000)
# - Missing models in Dockerfile
# - Python version mismatch
```

### 🔴 Synthesis timeout (>5 minutes)
```bash
# Increase App Service tier
az appservice plan update `
  --resource-group voice-cloning `
  --name voice-cloning-plan `
  --sku B3

# Or check system resources
az webapp list-metrics `
  --resource-group voice-cloning `
  --name voice-cloning-api
```

### 🔴 CORS errors in frontend
```bash
# Check CORS setting
az webapp config appsettings list `
  --resource-group voice-cloning `
  --name voice-cloning-api

# Update if needed (exact URL match required)
az webapp config appsettings set `
  --resource-group voice-cloning `
  --name voice-cloning-api `
  --settings CORS_ORIGINS=https://your-exact-frontend-url.netlify.app
```

### 🔴 Files/models not found
```bash
# SSH into container
az webapp create-remote-connection `
  --resource-group voice-cloning `
  --name voice-cloning-api

# Check directory structure
cd /app
ls -la models/default/
```

## Cost Monitoring

```bash
# Estimate monthly cost for your resources
az consumption budget create `
  --name voice-cloning-budget `
  --amount 100 `
  --time-period Monthly

# View current spending
az consumption usage list `
  --resource-group voice-cloning
```

## Cleanup (Delete Everything)

```bash
# ⚠️ This deletes all resources and cannot be undone!
az group delete --name voice-cloning

# Or just delete the web app
az webapp delete `
  --resource-group voice-cloning `
  --name voice-cloning-api
```

## File References

- **Deployment Guide**: See `AZURE_DEPLOYMENT.md`
- **Files Readme**: See `DEPLOYMENT_FILES_README.md`
- **Setup Script**: Run `deploy_to_azure.ps1`
- **Frontend Setup**: See `DEPLOYMENT_GUIDE.md`

## Estimated Timeline

| Task | Time |
|------|------|
| Azure account setup | 5 min |
| Azure CLI installation | 5 min |
| Resource creation | 5 min |
| Docker build & push | 10 min |
| App Service creation | 2 min |
| App startup | 3 min |
| Frontend update | 5 min |
| End-to-end testing | 5 min |
| **Total** | **~40 minutes** |

## Success Indicators

- ✅ Backend URL accessible in browser
- ✅ `/api/health` returns 200 OK
- ✅ Voice enrollment works
- ✅ Speech synthesis works
- ✅ Audio plays in frontend
- ✅ No CORS errors in console
- ✅ Synthesis takes ~60 seconds

---

**Next Step**: Start with your chosen deployment method above! 🚀
