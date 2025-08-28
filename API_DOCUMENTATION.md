# QuizMaster Pro - API Documentation

## Overview

This document provides comprehensive documentation for all API endpoints in the QuizMaster Pro application. The backend uses Node.js with Express and PostgreSQL database.

**Base URL:** `http://localhost:4000`
**Database:** PostgreSQL (Railway Cloud)

---

## Authentication Endpoints

### 1. Login

- **Method:** POST
- **Endpoint:** `/api/auth/login`
- **Description:** Authenticate user and return JWT token
- **Request Body:**
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "token": "jwt_token_string",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "status": "active"
    }
  }
  ```
- **Status Codes:** 200 (Success), 401 (Invalid credentials), 500 (Server error)

### 2. Register

- **Method:** POST
- **Endpoint:** `/api/auth/register`
- **Description:** Register a new user account
- **Request Body:**
  ```json
  {
    "username": "string",
    "password": "string",
    "role": "user" // optional, defaults to "user"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "userId": 2,
    "message": "User registered successfully"
  }
  ```
- **Status Codes:** 201 (Created), 409 (Username exists), 500 (Server error)

---

## User Management Endpoints

### 3. Get All Users

- **Method:** GET
- **Endpoint:** `/api/users`
- **Description:** Retrieve all users with online status
- **Response:**
  ```json
  {
    "success": true,
    "users": [
      {
        "id": 1,
        "username": "admin",
        "role": "admin",
        "status": "active",
        "last_activity": "2025-08-28T10:30:00.000Z",
        "isOnline": true
      }
    ]
  }
  ```

### 4. Update User

- **Method:** PUT
- **Endpoint:** `/api/users/:id`
- **Description:** Update user information
- **Parameters:** `id` (user ID)
- **Request Body:**
  ```json
  {
    "username": "string", // optional
    "password": "string", // optional
    "role": "admin|user", // optional
    "status": "active|suspended|inactive" // optional
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "status": "active"
    }
  }
  ```

### 5. Delete User

- **Method:** DELETE
- **Endpoint:** `/api/users/:id`
- **Description:** Delete a user account
- **Parameters:** `id` (user ID)
- **Response:**
  ```json
  {
    "success": true
  }
  ```

### 6. Get User Quizzes

- **Method:** GET
- **Endpoint:** `/api/users/:id/quizzes`
- **Description:** Get quizzes created by a specific user
- **Parameters:** `id` (user ID)

### 7. Get User Assigned Quizzes

- **Method:** GET
- **Endpoint:** `/api/users/:id/assigned-quizzes`
- **Description:** Get quizzes assigned to a specific user
- **Parameters:** `id` (user ID)

### 8. Get User Activity

- **Method:** GET
- **Endpoint:** `/api/users/:id/activity`
- **Description:** Get user activity including attempts and access requests
- **Parameters:** `id` (user ID)
- **Response:**
  ```json
  {
    "success": true,
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "status": "active",
      "isOnline": true
    },
    "activity": {
      "attempts": [],
      "accessRequests": []
    }
  }
  ```

### 9. Get User Quiz Assignments

- **Method:** GET
- **Endpoint:** `/api/users/:id/quiz-assignments`
- **Description:** Get quiz assignments for a specific user
- **Parameters:** `id` (user ID)

### 10. Get User Attempts

- **Method:** GET
- **Endpoint:** `/api/users/:id/attempts`
- **Description:** Get quiz attempts by a specific user
- **Parameters:** `id` (user ID)

### 11. Get User Access Requests

- **Method:** GET
- **Endpoint:** `/api/users/:id/access-requests`
- **Description:** Get access requests made by a specific user
- **Parameters:** `id` (user ID)
- **Query Parameters:** `status` (optional) - filter by request status

---

## Quiz Management Endpoints

### 12. Get All Quizzes

- **Method:** GET
- **Endpoint:** `/api/quizzes`
- **Description:** Retrieve all quizzes
- **Response:**
  ```json
  {
    "success": true,
    "quizzes": [
      {
        "id": 1,
        "title": "Sample Quiz",
        "description": "A sample quiz",
        "time_limit": 15,
        "passing_score": 70,
        "is_active": true,
        "is_public": true,
        "created_by": 1,
        "created_at": "2025-08-28T10:00:00.000Z"
      }
    ]
  }
  ```

### 13. Get Public Quizzes

- **Method:** GET
- **Endpoint:** `/api/quizzes/public`
- **Description:** Retrieve only public quizzes
- **Response:** Same format as Get All Quizzes

### 14. Get Quiz by ID

- **Method:** GET
- **Endpoint:** `/api/quizzes/:id`
- **Description:** Retrieve a specific quiz
- **Parameters:** `id` (quiz ID)

### 15. Create Quiz

- **Method:** POST
- **Endpoint:** `/api/quizzes`
- **Description:** Create a new quiz
- **Request Body:**
  ```json
  {
    "title": "string",
    "description": "string",
    "time_limit": 30,
    "passing_score": 70,
    "is_public": true,
    "created_by": 1,
    "questions": [
      {
        "question": "What is 2+2?",
        "options": ["3", "4", "5", "6"],
        "correct_answer": "4",
        "points": 1
      }
    ]
  }
  ```

### 16. Update Quiz

- **Method:** PUT
- **Endpoint:** `/api/quizzes/:id`
- **Description:** Update an existing quiz
- **Parameters:** `id` (quiz ID)
- **Request Body:** Same as Create Quiz

### 17. Delete Quiz

- **Method:** DELETE
- **Endpoint:** `/api/quizzes/:id`
- **Description:** Delete a quiz
- **Parameters:** `id` (quiz ID)

---

## Question Management Endpoints

### 18. Get Quiz Questions

- **Method:** GET
- **Endpoint:** `/api/quizzes/:id/questions`
- **Description:** Get all questions for a specific quiz
- **Parameters:** `id` (quiz ID)

### 19. Add Question to Quiz

- **Method:** POST
- **Endpoint:** `/api/quizzes/:id/questions`
- **Description:** Add a new question to a quiz
- **Parameters:** `id` (quiz ID)
- **Request Body:**
  ```json
  {
    "text": "What is the capital of France?",
    "options": ["London", "Berlin", "Paris", "Madrid"],
    "correct_answer": "Paris",
    "points": 1,
    "user_id": 1
  }
  ```

### 20. Update Question

- **Method:** PUT
- **Endpoint:** `/api/questions/:id`
- **Description:** Update an existing question
- **Parameters:** `id` (question ID)
- **Request Body:** Same as Add Question

### 21. Delete Question

- **Method:** DELETE
- **Endpoint:** `/api/questions/:id`
- **Description:** Delete a question
- **Parameters:** `id` (question ID)

---

## Quiz Attempt Endpoints

### 22. Create Quiz Attempt

- **Method:** POST
- **Endpoint:** `/api/attempts`
- **Description:** Start a new quiz attempt
- **Request Body:**
  ```json
  {
    "user_id": 1,
    "quiz_id": 1
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "attemptId": 1
  }
  ```

### 23. Submit Answer

- **Method:** POST
- **Endpoint:** `/api/attempts/:id/answers`
- **Description:** Submit an answer for a question
- **Parameters:** `id` (attempt ID)
- **Request Body:**
  ```json
  {
    "question_id": 1,
    "user_answer": "Paris"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "is_correct": true
  }
  ```

### 24. Complete Quiz Attempt

- **Method:** POST
- **Endpoint:** `/api/attempts/:id/complete`
- **Description:** Complete a quiz attempt and calculate score
- **Parameters:** `id` (attempt ID)
- **Response:**
  ```json
  {
    "success": true,
    "attempt": {
      "id": 1,
      "score": 3,
      "total_questions": 3,
      "percentage": 100,
      "passed": true,
      "completed_at": "2025-08-28T10:30:00.000Z"
    }
  }
  ```

---

## Statistics Endpoints

### 25. Get Dashboard Stats

- **Method:** GET
- **Endpoint:** `/api/stats`
- **Description:** Get general dashboard statistics
- **Response:**
  ```json
  {
    "success": true,
    "stats": {
      "totalQuizzes": 5,
      "totalUsers": 10,
      "activeUsers": 8,
      "totalAttempts": 25,
      "completedAttempts": 20,
      "successRate": 85,
      "averageScore": 78.5,
      "recentQuizzes": [],
      "recentAttempts": []
    }
  }
  ```

### 26. Get Admin Metrics

- **Method:** GET
- **Endpoint:** `/api/admin/metrics`
- **Description:** Get detailed admin metrics
- **Response:**
  ```json
  {
    "success": true,
    "metrics": {
      "totalUsers": 10,
      "activeUsers": 8,
      "adminUsers": 2,
      "pendingAccessRequests": 3,
      "systemHealthScore": 95,
      "storageUsed": 15,
      "recentUsers": [],
      "dailyActivity": []
    }
  }
  ```

---

## Quiz Assignment Endpoints

### 27. Get Quiz Assignments

- **Method:** GET
- **Endpoint:** `/api/quiz-assignments`
- **Description:** Get all quiz assignments

### 28. Create Quiz Assignment

- **Method:** POST
- **Endpoint:** `/api/quiz-assignments`
- **Description:** Assign a quiz to a user
- **Request Body:**
  ```json
  {
    "quiz_id": 1,
    "user_id": 2,
    "assigned_by": 1
  }
  ```

### 29. Bulk Update Quiz Assignments

- **Method:** PUT
- **Endpoint:** `/api/quiz-assignments/bulk`
- **Description:** Bulk update quiz assignments for a user
- **Request Body:**
  ```json
  {
    "userId": 2,
    "assignments": [{ "quizId": 1 }, { "quizId": 2 }],
    "assignedBy": 1
  }
  ```

### 30. Delete Quiz Assignment

- **Method:** DELETE
- **Endpoint:** `/api/quiz-assignments/:id`
- **Description:** Delete a quiz assignment
- **Parameters:** `id` (assignment ID)

---

## Access Request Endpoints

### 31. Create Access Request

- **Method:** POST
- **Endpoint:** `/api/access-requests`
- **Description:** Request access to a quiz
- **Request Body:**
  ```json
  {
    "quizId": 1,
    "userId": 2,
    "message": "Please grant access to this quiz"
  }
  ```

### 32. Get Access Requests

- **Method:** GET
- **Endpoint:** `/api/access-requests`
- **Description:** Get all access requests
- **Query Parameters:** `status` (optional) - filter by status

### 33. Update Access Request

- **Method:** PUT
- **Endpoint:** `/api/access-requests/:id`
- **Description:** Approve or reject an access request
- **Parameters:** `id` (request ID)
- **Request Body:**
  ```json
  {
    "status": "approved|rejected",
    "reviewedBy": 1,
    "responseMessage": "Access granted"
  }
  ```

---

## Database Management Endpoints

### 34. Get Database Tables

- **Method:** GET
- **Endpoint:** `/api/database/tables`
- **Description:** Get information about all database tables
- **Response:**
  ```json
  {
    "success": true,
    "tables": [
      {
        "name": "users",
        "count": 10,
        "sql": "CREATE TABLE users (...)"
      }
    ]
  }
  ```

### 35. Execute Database Query

- **Method:** POST
- **Endpoint:** `/api/database/query`
- **Description:** Execute a custom SQL query (Admin only)
- **Request Body:**
  ```json
  {
    "query": "SELECT * FROM users LIMIT 5"
  }
  ```

---

## Database Schema

### Tables:

1. **users** - User accounts and authentication
2. **quizzes** - Quiz definitions and metadata
3. **questions** - Quiz questions with options and answers
4. **quiz_attempts** - User quiz attempts and results
5. **quiz_assignments** - Quiz assignments to users
6. **quiz_access** - Quiz access permissions
7. **access_requests** - User requests for quiz access

### Key Relationships:

- Users can create multiple quizzes
- Quizzes contain multiple questions
- Users can have multiple quiz attempts
- Quiz assignments link users to quizzes
- Access requests are for quiz permissions

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

**Common Status Codes:**

- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Internal Server Error

---

## Authentication & Authorization

- JWT tokens required for protected endpoints
- Role-based access control (admin/user)
- Session management with activity tracking
- Automatic token refresh on valid requests

---

## Notes

- All timestamps are in ISO 8601 format
- Database uses PostgreSQL with JSONB for complex data
- Connection pooling implemented for performance
- Transaction support for data consistency
- Comprehensive error logging and monitoring
