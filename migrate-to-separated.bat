@echo off
echo ===== QuizMaster Pro Migration to Separated Frontend/Backend =====
echo.

echo Step 1: Installing frontend dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Failed to install frontend dependencies
  exit /b %ERRORLEVEL%
)
echo Frontend dependencies installed successfully!
echo.

echo Step 2: Installing backend dependencies...
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Failed to install backend dependencies
  exit /b %ERRORLEVEL%
)
cd ..
echo Backend dependencies installed successfully!
echo.

echo Step 3: Migrating database...
cd backend
call npm run migrate
if %ERRORLEVEL% NEQ 0 (
  echo WARNING: Database migration encountered an issue
  echo This might be normal if you don't have an existing database
)
cd ..
echo Database migration completed!
echo.

echo Step 4: Cleaning up legacy files...
call npm run cleanup
echo Cleanup completed!
echo.

echo ===== Migration Complete! =====
echo.
echo You can now start the application using:
echo - Frontend only: npm start
echo - Backend only: npm run start:api
echo - Both together: npm run start:dev
echo.
echo The API documentation is available at http://localhost:4000/api-docs
echo.
pause
