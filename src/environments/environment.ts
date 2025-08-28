// QuizMaster Pro - Development Environment Configuration
export const environment = {
  production: false,
  
  // Backend API Configuration (Railway hosted backend)
  apiUrl: 'http://localhost:4000/api',
  
  // Application Settings
  appName: 'QuizMaster Pro',
  appVersion: '1.0.0',
  
  // Feature Flags
  features: {
    enablePWA: true,
    enableOfflineMode: false,
    enableDebugMode: true,
    enableAnalytics: false,
    enableNotifications: true,
  },
  
  // UI Configuration
  ui: {
    theme: 'default',
    pageSize: 10,
    animationDuration: 300,
    toastDuration: 5000,
  },
  
  // API Configuration
  api: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
  },
  
  // Authentication Configuration
  auth: {
    tokenKey: 'quizmaster_token',
    userKey: 'quizmaster_user',
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // Database Configuration (if needed for offline mode)
  database: {
    name: 'quizmaster_dev',
    version: 1,
  },
  
  // Legacy Turso Configuration (if still needed)
  turso: {
    url: 'libsql://exam-test-raj818487.aws-ap-south-1.turso.io',
    token: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NTU3NjI5NDEsImlkIjoiMmE4MDY1MjctMjE1Mi00MzAzLWJiZGUtMWJiNzY4NTA4YmM3IiwicmlkIjoiY2Y3MGJmMmItNjAxNS00MWM3LTg4ODMtODc5OTBmNmQwZWIyIn0.L5U_3Q0dOL2Bb3Zi-55PviFE4pIO4U-DffkudHxB9XQfiIhgV5aW-8_bBbxuPHadsstEkTTNs6ZIwcMirjjNAw',
  },
  
  // Development-specific settings
  development: {
    logLevel: 'debug',
    enableSourceMaps: true,
    enableHotReload: true,
    mockData: false,
  },
};
