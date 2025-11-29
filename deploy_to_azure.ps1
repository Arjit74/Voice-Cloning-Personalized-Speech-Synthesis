# Azure App Service Deployment Script
# Copy-paste these commands to deploy your backend

# ============================================================
# STEP 1: Install Azure CLI
# ============================================================
# Download from: https://learn.microsoft.com/cli/azure/install-azure-cli

# ============================================================
# STEP 2: Login to Azure
# ============================================================
az login

# ============================================================
# STEP 3: Set Variables
# ============================================================
$resourceGroup = "voice-cloning"
$appServicePlan = "voice-cloning-plan"
$webAppName = "voice-cloning-api"
$location = "eastus"
$containerRegistry = "voicecloningacr"
$frontendUrl = "https://your-frontend.netlify.app"  # UPDATE THIS

# ============================================================
# STEP 4: Create Resource Group
# ============================================================
az group create --name $resourceGroup --location $location

# ============================================================
# STEP 5: Create App Service Plan (B2 tier recommended)
# ============================================================
az appservice plan create `
  --name $appServicePlan `
  --resource-group $resourceGroup `
  --sku B2 `
  --is-linux

# ============================================================
# STEP 6A: Deploy with Docker (RECOMMENDED)
# ============================================================

# Create Container Registry
az acr create `
  --resource-group $resourceGroup `
  --name $containerRegistry `
  --sku Basic

# Login to registry
az acr login --name $containerRegistry

# Build and push Docker image
az acr build `
  --registry $containerRegistry `
  --image voice-cloning-api:latest `
  .

# Get login credentials
$loginServer = az acr show --resource-group $resourceGroup --name $containerRegistry --query loginServer --output tsv
$username = az acr credential show --name $containerRegistry --query username --output tsv
$password = az acr credential show --name $containerRegistry --query "passwords[0].value" --output tsv

# Create Web App from Docker image
az webapp create `
  --resource-group $resourceGroup `
  --plan $appServicePlan `
  --name $webAppName `
  --deployment-container-image-name "${containerRegistry}.azurecr.io/voice-cloning-api:latest"

# Configure container credentials
az webapp config container set `
  --name $webAppName `
  --resource-group $resourceGroup `
  --docker-custom-image-name "${containerRegistry}.azurecr.io/voice-cloning-api:latest" `
  --docker-registry-server-url "https://${containerRegistry}.azurecr.io" `
  --docker-registry-server-user $username `
  --docker-registry-server-password $password

# ============================================================
# STEP 6B: Alternative - Deploy with Git (SIMPLER)
# ============================================================

# Uncomment to use Git instead of Docker
<#
# Create Web App
az webapp create `
  --resource-group $resourceGroup `
  --plan $appServicePlan `
  --name $webAppName `
  --runtime "PYTHON:3.10"

# Configure startup script
az webapp config set `
  --resource-group $resourceGroup `
  --name $webAppName `
  --startup-file startup.sh

# Deploy from Git
git remote add azure "https://${webAppName}.scm.azurewebsites.net/${webAppName}.git"
git push azure main
#>

# ============================================================
# STEP 7: Set Environment Variables
# ============================================================
az webapp config appsettings set `
  --resource-group $resourceGroup `
  --name $webAppName `
  --settings `
    FLASK_ENV=production `
    FLASK_DEBUG=False `
    CORS_ORIGINS=$frontendUrl

# ============================================================
# STEP 8: Get Backend URL
# ============================================================
$backendUrl = "https://${webAppName}.azurewebsites.net"
Write-Host "Backend URL: $backendUrl"

# ============================================================
# STEP 9: Test Health Endpoint
# ============================================================
Write-Host "Testing backend health..."
Start-Sleep -Seconds 10  # Wait for app to start

$healthCheck = Invoke-WebRequest -Uri "${backendUrl}/api/health" -ErrorAction SilentlyContinue
if ($healthCheck.StatusCode -eq 200) {
    Write-Host "✅ Backend is healthy!"
    $healthCheck.Content | ConvertFrom-Json | Format-List
} else {
    Write-Host "❌ Health check failed. Check logs:"
    Write-Host "az webapp log tail --resource-group $resourceGroup --name $webAppName"
}

# ============================================================
# STEP 10: View Logs
# ============================================================
Write-Host ""
Write-Host "To view deployment logs, run:"
Write-Host "az webapp log tail --resource-group $resourceGroup --name $webAppName"

# ============================================================
# STEP 11: Update Frontend
# ============================================================
Write-Host ""
Write-Host "========== IMPORTANT =========="
Write-Host "1. Go to Netlify Dashboard"
Write-Host "2. Settings → Build & Deploy → Environment"
Write-Host "3. Add variable:"
Write-Host "   VITE_API_URL = $backendUrl"
Write-Host "4. Trigger rebuild: git push origin main"
Write-Host "================================"

# ============================================================
# CLEANUP (if needed)
# ============================================================
<#
# Delete everything (careful!)
az group delete --name $resourceGroup
#>
