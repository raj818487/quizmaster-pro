# Railway Environment Variables Setup

## Option 1: Copy-Paste JSON in Railway Dashboard

Go to Railway Dashboard → Your Project → Variables → Raw Editor

Paste this JSON:

```json
{
  "NODE_ENV": "production",
  "DB_HOST": "gondola.proxy.rlwy.net",
  "DB_PORT": "45394",
  "DB_NAME": "railway",
  "DB_USER": "postgres",
  "DB_PASSWORD": "WDjzRpZFbTSYsetmsemUYxCJbGKoWUzM",
  "JWT_SECRET": "railway-prod-jwt-secret-key-strong-32-chars-minimum-2025",
  "JWT_EXPIRES_IN": "2h",
  "BCRYPT_ROUNDS": "12",
  "PORT": "4000",
  "HOST": "0.0.0.0",
  "CORS_ORIGIN": "https://quizmaster-pro-lemon.vercel.app",
  "API_PREFIX": "/api",
  "API_VERSION": "v1",
  "LOG_LEVEL": "info",
  "LOG_FILE": "logs/production.log",
  "RATE_LIMIT_WINDOW_MS": "900000",
  "RATE_LIMIT_MAX_REQUESTS": "100"
}
```

## Option 2: Railway CLI Commands

```bash
railway variables --set "NODE_ENV=production"
railway variables --set "DB_HOST=gondola.proxy.rlwy.net"
railway variables --set "DB_PORT=45394"
railway variables --set "DB_NAME=railway"
railway variables --set "DB_USER=postgres"
railway variables --set "DB_PASSWORD=WDjzRpZFbTSYsetmsemUYxCJbGKoWUzM"
railway variables --set "JWT_SECRET=railway-prod-jwt-secret-key-strong-32-chars-minimum-2025"
railway variables --set "JWT_EXPIRES_IN=2h"
railway variables --set "BCRYPT_ROUNDS=12"
railway variables --set "PORT=4000"
railway variables --set "HOST=0.0.0.0"
railway variables --set "CORS_ORIGIN=https://quizmaster-pro-lemon.vercel.app"
railway variables --set "API_PREFIX=/api"
railway variables --set "API_VERSION=v1"
railway variables --set "LOG_LEVEL=info"
railway variables --set "LOG_FILE=logs/production.log"
railway variables --set "RATE_LIMIT_WINDOW_MS=900000"
railway variables --set "RATE_LIMIT_MAX_REQUESTS=100"
```

## Essential Variables (Minimum Required)

```json
{
  "NODE_ENV": "production",
  "DB_HOST": "gondola.proxy.rlwy.net",
  "DB_PORT": "45394",
  "DB_NAME": "railway",
  "DB_USER": "postgres",
  "DB_PASSWORD": "WDjzRpZFbTSYsetmsemUYxCJbGKoWUzM",
  "JWT_SECRET": "railway-prod-jwt-secret-key-strong-32-chars-minimum-2025",
  "CORS_ORIGIN": "https://quizmaster-pro-lemon.vercel.app"
}
```

## Steps to Update in Railway:

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Select your project** (should be the one with your backend)
3. **Click on your service** 
4. **Go to "Variables" tab**
5. **Click "Raw Editor"**
6. **Paste the JSON above**
7. **Click "Save"**
8. **Service will automatically redeploy**

## After Setting Variables:

1. Check deployment logs for any errors
2. Test health endpoint: `https://your-service-url/api/health`
3. Verify CORS is working with your frontend
4. Update frontend with your Railway backend URL
