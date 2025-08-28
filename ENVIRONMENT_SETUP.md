# Environment Configuration Guide

This document explains how to configure environment variables for both development and production deployment of QuizMaster Pro.

## Backend Environment Files

### .env.development
- Used for local development
- Points to local PostgreSQL database
- Relaxed security settings for development ease

### .env.production  
- Used for production deployment
- Enhanced security configurations
- Cloud database support

### .env.example
- Template file with all available configuration options
- Copy to `.env` and customize for your environment

## Backend Environment Variables

### Required Variables
```bash
NODE_ENV=development|production
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your-jwt-secret-key
```

### Optional Variables
```bash
# Database (Alternative to individual DB_* variables)
DATABASE_URL=postgresql://username:password@host:port/database

# Server Configuration
PORT=4000
HOST=localhost|0.0.0.0

# Security
BCRYPT_ROUNDS=10
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=http://localhost:4200

# Logging
LOG_LEVEL=debug|info|error
LOG_FILE=logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Frontend Environment Files

### environment.ts (Development)
- Points to local backend server (http://localhost:4000/api)
- Debug mode enabled
- Relaxed timeouts and caching

### environment.prod.ts (Production)
- Points to production backend URL
- Optimized performance settings
- Enhanced security configurations

## Setup Instructions

### Development Setup

1. **Backend Environment**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your local database credentials
   ```

2. **Database Setup**:
   ```bash
   # Install PostgreSQL locally
   # Create database: quizmaster_dev
   # Update .env with your credentials
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

### Production Deployment

1. **Backend Environment**:
   - Set environment variables in your hosting platform
   - Use DATABASE_URL for cloud databases
   - Generate strong JWT_SECRET
   - Set appropriate CORS_ORIGIN

2. **Frontend Environment**:
   - Update apiUrl in environment.prod.ts
   - Set your production backend URL

3. **Build and Deploy**:
   ```bash
   # Backend
   npm run build
   npm start

   # Frontend  
   npm run build:prod
   ```

## Cloud Provider Examples

### Railway
```bash
DATABASE_URL=postgresql://postgres:password@containers-us-west-123.railway.app:5432/railway
```

### Heroku
```bash
DATABASE_URL=postgres://username:password@hostname:port/database_name
```

### Vercel (with Neon)
```bash
DATABASE_URL=postgresql://username:password@hostname:port/database_name?sslmode=require
```

### Render
```bash
DATABASE_URL=postgres://username:password@hostname:port/database_name
```

## Security Notes

1. **Never commit `.env` files** - They contain sensitive information
2. **Use strong JWT secrets** - Minimum 32 characters, random string
3. **Set appropriate CORS origins** - Don't use `*` in production
4. **Use HTTPS in production** - All API URLs should use https://
5. **Rotate secrets regularly** - Update JWT secrets periodically

## Environment Variable Validation

The application includes environment validation to ensure all required variables are set. Missing variables will cause startup errors with clear messages.

## Troubleshooting

### Common Issues:

1. **Database Connection Failed**:
   - Check DATABASE_URL format
   - Verify database credentials
   - Ensure database server is running

2. **CORS Errors**:
   - Check CORS_ORIGIN matches frontend URL
   - Ensure no trailing slashes in URLs

3. **Authentication Issues**:
   - Verify JWT_SECRET is set
   - Check token expiration settings

4. **Port Conflicts**:
   - Ensure PORT is available
   - Check for other services using the same port
