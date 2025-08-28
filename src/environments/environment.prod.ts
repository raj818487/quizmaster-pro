// QuizMaster Pro - Production Environment Configuration
export const environment = {
  production: true,
  
  // Backend API Configuration (Update with your deployed backend URL)
  apiUrl: 'https://your-backend-railway-domain.up.railway.app/api',
  
  // Application Settings
  appName: 'QuizMaster Pro',
  appVersion: '1.0.0',
  
  // Feature Flags
  features: {
    enablePWA: true,
    enableOfflineMode: true,
    enableDebugMode: false,
    enableAnalytics: true,
    enableNotifications: true,
  },
  
  // UI Configuration
  ui: {
    theme: 'default',
    pageSize: 20,
    animationDuration: 200,
    toastDuration: 4000,
  },
  
  // API Configuration
  api: {
    timeout: 60000, // 60 seconds for production
    retryAttempts: 2,
    cacheTimeout: 10 * 60 * 1000, // 10 minutes
  },
  
  // Authentication Configuration
  auth: {
    tokenKey: 'quizmaster_token',
    userKey: 'quizmaster_user',
    sessionTimeout: 2 * 60 * 60 * 1000, // 2 hours
  },
  
  // Database Configuration (if needed for offline mode)
  database: {
    name: 'quizmaster_prod',
    version: 1,
  },
  
  // Legacy Turso Configuration (if still needed)
  turso: {
    url: 'libsql://exam-test-raj818487.aws-ap-south-1.turso.io',
    token: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NTU3NjI5NDEsImlkIjoiMmE4MDY1MjctMjE1Mi00MzAzLWJiZGUtMWJiNzY4NTA4YmM3IiwicmlkIjoiY2Y3MGJmMmItNjAxNS00MWM3LTg4ODMtODc5OTBmNmQwZWIyIn0.L5U_3Q0dOL2Bb3Zi-55PviFE4pIO4U-DffkudHxB9XQfiIhgV5aW-8_bBbxuPHadsstEkTTNs6ZIwcMirjjNAw',
  },
  
  // Production-specific settings
  productionSettings: {
    logLevel: 'error',
    enableSourceMaps: false,
    enableHotReload: false,
    mockData: false,
    enableCompression: true,
    enableCaching: true,
  },
  
  // Cloud Provider Examples (uncomment and configure as needed):
  
  // Vercel Backend:
  // apiUrl: 'https://your-app.vercel.app/api',
  
  // Netlify Backend:
  // apiUrl: 'https://your-app.netlify.app/api',
  
  // Railway Backend:
  // apiUrl: 'https://your-app.up.railway.app/api',
  
  // Heroku Backend:
  // apiUrl: 'https://your-app.herokuapp.com/api',
  
  // Custom Domain:
  // apiUrl: 'https://api.your-domain.com/api',
};
