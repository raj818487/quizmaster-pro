# QuizMaster Pro Backend Deployment Guide

## Current Status
- ✅ Frontend deployed: https://quizmaster-pro-lemon.vercel.app
- 🔄 Backend needs deployment
- ✅ Database configured: Railway PostgreSQL

## Quick Deploy Backend to Railway

### 1. Deploy to Railway
```bash
# Install Railway CLI (if not installed)
npm install -g @railway/cli

# Login to Railway
railway login

# Navigate to backend folder
cd backend

# Initialize Railway project
railway init

# Deploy
railway up
```

### 2. Set Environment Variables in Railway Dashboard
```bash
NODE_ENV=production
DATABASE_URL=postgresql://postgres:WDjzRpZFbTSYsetmsemUYxCJbGKoWUzM@gondola.proxy.rlwy.net:45394/railway
JWT_SECRET=railway-prod-jwt-secret-key-strong-32-chars-minimum-2025
PORT=4000
HOST=0.0.0.0
CORS_ORIGIN=https://quizmaster-pro-lemon.vercel.app
```

### 3. Alternative: Deploy Backend to Other Platforms

#### Heroku
```bash
# Create Heroku app
heroku create quizmaster-pro-backend

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=postgresql://postgres:WDjzRpZFbTSYsetmsemUYxCJbGKoWUzM@gondola.proxy.rlwy.net:45394/railway
heroku config:set JWT_SECRET=railway-prod-jwt-secret-key-strong-32-chars-minimum-2025
heroku config:set CORS_ORIGIN=https://quizmaster-pro-lemon.vercel.app

# Deploy
git subtree push --prefix=backend heroku main
```

#### Render
1. Connect your GitHub repository
2. Select `backend` folder as root directory
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables in dashboard

#### Vercel (API Routes)
```bash
# In backend folder
vercel --prod
```

### 4. Update Frontend After Backend Deployment

Once your backend is deployed (e.g., `https://your-backend.railway.app`), update:

```bash
# Update environment.prod.ts
apiUrl: 'https://your-actual-backend-url.railway.app/api'

# Redeploy frontend
npm run build:prod
# Then deploy to Vercel
```

## Environment Variables Needed

### Backend (Railway/Heroku/Render)
```
NODE_ENV=production
DATABASE_URL=postgresql://postgres:WDjzRpZFbTSYsetmsemUYxCJbGKoWUzM@gondola.proxy.rlwy.net:45394/railway
JWT_SECRET=railway-prod-jwt-secret-key-strong-32-chars-minimum-2025
PORT=4000
HOST=0.0.0.0
CORS_ORIGIN=https://quizmaster-pro-lemon.vercel.app
```

### Frontend (Vercel)
- No additional environment variables needed (built into bundle)

## Testing Backend Health

After deployment, test these endpoints:
- `GET /api/health` - Health check
- `GET /api-docs` - API documentation
- `POST /api/auth/login` - Test authentication

## Deployment Commands

```bash
# For Railway
cd backend && railway up

# For Heroku
git subtree push --prefix=backend heroku main

# For Render
# Use GitHub integration in Render dashboard

# For Vercel
cd backend && vercel --prod
```

## Post-Deployment Checklist

1. ✅ Backend deployed and accessible
2. ✅ Database connection working
3. ✅ CORS configured for frontend domain
4. ✅ Environment variables set
5. ✅ Health check endpoint responding
6. ✅ Frontend updated with backend URL
7. ✅ Frontend redeployed
8. ✅ End-to-end testing completed

## Troubleshooting

### Common Issues:
1. **CORS errors**: Ensure CORS_ORIGIN matches frontend URL exactly
2. **Database connection**: Verify DATABASE_URL is correct
3. **Authentication issues**: Check JWT_SECRET is set
4. **Port binding**: Ensure PORT environment variable is used
5. **Health check fails**: Check if /api/health endpoint works

### Quick Fixes:
```bash
# Test local backend with production DB
npm run env:prod
npm run backend:dev

# Test CORS locally
curl -H "Origin: https://quizmaster-pro-lemon.vercel.app" https://your-backend-url.com/api/health
```
