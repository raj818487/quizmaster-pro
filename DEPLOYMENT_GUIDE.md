# Deployment Guide - QuizMaster Pro

This guide covers deploying QuizMaster Pro as a full-stack application with separate frontend and backend hosting.

## Architecture Overview

- **Frontend**: Angular 17 application (Static hosting)
- **Backend**: Node.js Express API server
- **Database**: PostgreSQL (Railway hosted)

## Database Configuration

The application is configured to use Railway PostgreSQL:
```
DATABASE_URL=postgresql://postgres:WDjzRpZFbTSYsetmsemUYxCJbGKoWUzM@gondola.proxy.rlwy.net:45394/railway
```

### PSQL Access
```bash
PGPASSWORD=WDjzRpZFbTSYsetmsemUYxCJbGKoWUzM psql -h gondola.proxy.rlwy.net -U postgres -p 45394 -d railway
```

## Deployment Options

### Option 1: Railway (Recommended)

#### Backend Deployment on Railway:

1. **Create Railway Account**: Sign up at [railway.app](https://railway.app)

2. **Deploy Backend**:
   ```bash
   # In your terminal
   cd backend
   railway login
   railway init
   railway up
   ```

3. **Set Environment Variables in Railway Dashboard**:
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://postgres:WDjzRpZFbTSYsetmsemUYxCJbGKoWUzM@gondola.proxy.rlwy.net:45394/railway
   JWT_SECRET=railway-prod-jwt-secret-key-strong-32-chars-minimum-2025
   PORT=4000
   HOST=0.0.0.0
   CORS_ORIGIN=https://your-frontend-domain.com
   ```

#### Frontend Deployment (Choose one):

**Railway (Static Site)**:
1. Create new Railway service
2. Connect your frontend code
3. Set build command: `npm run frontend:build`
4. Set output directory: `dist/quizmaster-pro`

**Vercel**:
1. Connect repository to Vercel
2. Set build command: `npm run frontend:build`
3. Set output directory: `dist/quizmaster-pro`
4. Update `environment.prod.ts` with Railway backend URL

**Netlify**:
1. Connect repository to Netlify
2. Set build command: `npm run frontend:build`
3. Set publish directory: `dist/quizmaster-pro`

### Option 2: Full Stack on Single Platform

**Railway Monorepo**:
```bash
# Root package.json already configured
npm run railway:build
```

**Heroku**:
```bash
# Heroku buildpack will use heroku-postbuild script
git push heroku main
```

## Environment Setup

### Development
```bash
npm run env:dev
npm run start:dev
```

### Production
```bash
npm run env:prod
npm run deploy:build
npm run deploy:start
```

## Build Commands Reference

```bash
# Frontend only
npm run frontend:build

# Backend only  
npm run backend:build

# Full deployment build
npm run deploy:build

# Start production
npm run start:prod
```

## Environment Variables

### Backend (.env.production)
```bash
NODE_ENV=production
DATABASE_URL=postgresql://postgres:WDjzRpZFbTSYsetmsemUYxCJbGKoWUzM@gondola.proxy.rlwy.net:45394/railway
JWT_SECRET=railway-prod-jwt-secret-key-strong-32-chars-minimum-2025
PORT=4000
HOST=0.0.0.0
CORS_ORIGIN=https://your-frontend-domain.com
BCRYPT_ROUNDS=12
JWT_EXPIRES_IN=2h
```

### Frontend (environment.prod.ts)
```typescript
apiUrl: 'https://your-backend-railway-domain.up.railway.app/api'
```

## SSL/HTTPS Configuration

Most modern hosting platforms (Railway, Vercel, Netlify) provide SSL certificates automatically.

### Custom Domain Setup:
1. Add custom domain in hosting platform dashboard
2. Update DNS records
3. Update CORS_ORIGIN in backend environment
4. Update apiUrl in frontend environment

## Health Checks

Backend includes health check endpoint:
```
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-08-28T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "database": "connected"
}
```

## Monitoring

### Recommended Monitoring:
- **Uptime**: Use UptimeRobot or similar
- **Logs**: Railway/Vercel built-in logging
- **Performance**: Built-in platform analytics

### Log Access:
```bash
# Railway
railway logs

# Heroku  
heroku logs --tail
```

## Troubleshooting

### Common Issues:

1. **CORS Errors**:
   - Check CORS_ORIGIN matches frontend domain
   - Ensure no trailing slashes

2. **Database Connection**:
   - Verify DATABASE_URL format
   - Check Railway database status

3. **Build Failures**:
   - Check Node.js version (requires 20.19+)
   - Verify all dependencies installed

4. **Environment Variables**:
   - Ensure all required vars are set
   - Check JWT_SECRET is strong enough

### Debug Commands:
```bash
# Test database connection
npm run backend:dev

# Check environment
node -e "console.log(process.env)"

# Test API endpoints
curl https://your-backend-domain.com/api/health
```

## Performance Optimization

### Backend:
- Use production NODE_ENV
- Enable compression middleware
- Implement proper caching headers
- Use connection pooling for database

### Frontend:
- Build with --prod flag
- Enable service worker for PWA
- Implement lazy loading
- Optimize images and assets

## Security Checklist

- ✅ Strong JWT_SECRET (32+ characters)
- ✅ HTTPS only in production
- ✅ Proper CORS configuration
- ✅ Environment variables secured
- ✅ Database credentials protected
- ✅ Input validation on all endpoints
- ✅ Rate limiting enabled
- ✅ SQL injection protection (parameterized queries)

## Scaling Considerations

### Horizontal Scaling:
- Use load balancers
- Implement session storage (Redis)
- Database connection pooling
- CDN for static assets

### Vertical Scaling:
- Monitor resource usage
- Optimize database queries
- Implement caching strategies
- Use database indexing

## Backup Strategy

### Database Backups:
- Railway provides automatic backups
- Consider additional backup solutions for critical data
- Test restore procedures regularly

### Code Backups:
- Git repository (GitHub/GitLab)
- Regular commits and tags
- Environment configuration documented
