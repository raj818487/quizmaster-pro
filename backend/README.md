# QuizMaster Pro Backend

This is the standalone Express backend server for the QuizMaster Pro application, providing all API endpoints for the frontend to interact with.

## Features

- RESTful API for quiz management
- SQLite database for data storage (`quizmaster.db` in backend folder)
- Swagger documentation for API endpoints
- User authentication and management
- Quiz creation and management
- Question management
- Quiz attempt tracking and scoring
- User access controls and permissions
- Quiz and question CRUD operations
- Quiz attempts and submissions tracking
- Quiz assignments and access control management
- Statistics endpoints

## Prerequisites

- Node.js (v20.0.0 or higher)
- NPM (v10.0.0 or higher)

## Quick Start

1. From project root, install backend dependencies:

```powershell
cd backend
npm install
```

2. Run the backend server:

```powershell
npm run start
# or
npm run dev # for development with auto-reload
```

3. Access the API:
   - API Documentation: http://localhost:4000/api-docs
   - API Base URL: http://localhost:4000/api

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/register` - Register a new user

### Users
- `GET /api/users` - List all users
- `PUT /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user
- `GET /api/users/:id/quizzes` - Get quizzes created by a user
- `GET /api/users/:id/attempts` - Get quiz attempts by a user
- `GET /api/users/:id/assigned-quizzes` - Get quizzes assigned to a user

### Quizzes
- `GET /api/quizzes` - List all quizzes
- `GET /api/quizzes/public` - List public quizzes
- `GET /api/quizzes/:id` - Get quiz details
- `POST /api/quizzes` - Create a new quiz
- `PUT /api/quizzes/:id` - Update a quiz
- `DELETE /api/quizzes/:id` - Delete a quiz
- `GET /api/quizzes/:id/questions` - Get questions for a quiz

### Questions
- `POST /api/quizzes/:id/questions` - Add a question to a quiz
- `PUT /api/questions/:id` - Update a question
- `DELETE /api/questions/:id` - Delete a question

### Quiz Attempts
- `POST /api/attempts` - Start a new quiz attempt
- `POST /api/attempts/:id/answers` - Submit an answer
- `POST /api/attempts/:id/complete` - Complete a quiz attempt

### Quiz Assignments
- `POST /api/assignments` - Assign a quiz to a user
- `DELETE /api/assignments/:id` - Remove a quiz assignment

### Access Requests
- `GET /api/access-requests` - List access requests
- `POST /api/access-requests` - Request access to a quiz
- `PUT /api/access-requests/:id` - Approve/reject access request

### Statistics
- `GET /api/stats` - Get system-wide statistics

## Running with Frontend

From the project root directory, you can run both servers simultaneously:

```powershell
# Install dependencies for both frontend and backend
npm install
npm run install:backend

# Run both servers together
npm run start:dev

# Or migrate database and start backend only
cd backend
npm run migrate
npm run start
npm run start:dev
```

## Production Notes

- This backend uses a local SQLite file `quizmaster.db`. For production, you should:
  - Migrate to a cloud database service like Turso, PlanetScale, or Supabase
  - Implement proper authentication with password hashing and JWT tokens
  - Add rate limiting and other security measures
  - Use HTTPS in production

## Environment Variables

- `PORT` - The port the server will listen on (default: 4000)
