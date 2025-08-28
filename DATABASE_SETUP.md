# QuizMaster Pro - Database Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (local or cloud instance)
- Git

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/raj818487/quizmaster-pro.git
cd quizmaster-pro
```

### 2. Backend Environment Setup

#### Navigate to Backend Directory
```bash
cd backend
```

#### Install Dependencies
```bash
npm install
```

#### Environment Configuration
Create `.env` file in `backend/` directory:
```env
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database_name

# JWT Secret (generate a strong secret)
JWT_SECRET=your_super_secret_jwt_key_here

# Server Configuration
PORT=4000
NODE_ENV=development

# Example for Railway PostgreSQL:
# DATABASE_URL=postgresql://postgres:password@containers-us-west-123.railway.app:5432/railway
```

### 3. Database Schema Creation

#### Option A: Using Prisma/Railway (Recommended)
```bash
# Run the initialization script
node scripts/init-postgres.js
```

#### Option B: Manual SQL Setup
Connect to your PostgreSQL database and run the following schema:

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP
);

-- Quizzes table
CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    config TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT false,
    time_limit INTEGER DEFAULT 30
);

-- Questions table
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'multiple_choice',
    options TEXT,
    correct_answer TEXT NOT NULL,
    points INTEGER DEFAULT 10
);

-- Quiz Assignments table
CREATE TABLE quiz_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    is_assigned BOOLEAN DEFAULT true,
    has_access BOOLEAN DEFAULT false,
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Access Requests table
CREATE TABLE access_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    message TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    responded_by INTEGER REFERENCES users(id)
);

-- Quiz Submissions table
CREATE TABLE quiz_submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    quiz_id INTEGER REFERENCES quizzes(id),
    answers TEXT,
    score INTEGER,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_quizzes_created_by ON quizzes(created_by);
CREATE INDEX idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX idx_quiz_assignments_user_id ON quiz_assignments(user_id);
CREATE INDEX idx_quiz_assignments_quiz_id ON quiz_assignments(quiz_id);
CREATE INDEX idx_access_requests_user_id ON access_requests(user_id);
CREATE INDEX idx_quiz_submissions_user_id ON quiz_submissions(user_id);
```

### 4. Generate Dummy Data

#### Run Data Generation Script
```bash
node scripts/generate-dummy-data.js
```

This script will create:
- Admin user (username: `admin`, password: `admin123`)
- Test user (username: `user`, password: `user123`)
- Sample quizzes with questions
- Sample quiz assignments

#### Manual Data Creation
If you prefer to create data manually, here's the default admin user:

```sql
-- Create admin user (password: admin123)
INSERT INTO users (username, password, role) VALUES 
('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Create test user (password: user123)
INSERT INTO users (username, password, role) VALUES 
('user', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user');
```

### 5. Start Backend Server

```bash
# Development mode
npm start

# Or with nodemon (if installed globally)
nodemon index.js
```

Server will start on `http://localhost:4000`

### 6. Verify Setup

#### Test Database Connection
```bash
# Test API endpoints
curl http://localhost:4000/api/users
```

#### Test Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Error
- Verify `DATABASE_URL` in `.env` file
- Check PostgreSQL server is running
- Ensure database exists and credentials are correct

#### 2. JWT Secret Error
- Ensure `JWT_SECRET` is set in `.env` file
- Use a strong, random secret key

#### 3. Port Already in Use
- Change `PORT` in `.env` file
- Kill any existing processes on port 4000

#### 4. Permission Errors
- Ensure PostgreSQL user has necessary permissions
- Check database connection limits

### Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:port/db` |
| `JWT_SECRET` | Secret key for JWT tokens | `your_secret_key_here` |
| `PORT` | Server port number | `4000` |
| `NODE_ENV` | Environment mode | `development` |

### Database Backup

#### Create Backup
```bash
pg_dump -h hostname -U username -d database_name > backup.sql
```

#### Restore Backup
```bash
psql -h hostname -U username -d database_name < backup.sql
```

## Production Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Configure production database
4. Set appropriate CORS settings
5. Enable HTTPS
6. Configure rate limiting
7. Set up monitoring and logging

### Security Checklist
- [ ] Strong JWT secret
- [ ] Password hashing enabled
- [ ] Input validation implemented
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] HTTPS enabled
- [ ] Database credentials secured
- [ ] Error messages sanitized
