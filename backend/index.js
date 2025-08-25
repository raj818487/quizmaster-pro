const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create and use the database file in the backend folder
const dbPath = path.join(__dirname, 'quizmaster.db');
console.log(`Using database at: ${dbPath}`);
const db = new Database(dbPath);

// Database helper functions
const getUsers = () => db.prepare("SELECT * FROM users").all();
const getUserById = (id) => db.prepare("SELECT * FROM users WHERE id = ?").get(id);
const getUserByUsername = (username) => db.prepare("SELECT * FROM users WHERE username = ?").get(username);
const getQuizzes = () => db.prepare("SELECT * FROM quizzes").all();
const getQuizById = (id) => db.prepare("SELECT * FROM quizzes WHERE id = ?").get(id);
const getQuestionsByQuizId = (quizId) => db.prepare("SELECT * FROM questions WHERE quiz_id = ?").all(quizId);

// Initialize schema (same as unified-server.js)
function initializeDatabase() {
  db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user'
      );

      CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        created_by INTEGER,
        is_public INTEGER DEFAULT 1,
        time_limit INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        type TEXT DEFAULT 'multiple_choice',
        correct_answer TEXT NOT NULL,
        points INTEGER DEFAULT 1,
        options TEXT,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        quiz_id INTEGER NOT NULL,
        score INTEGER DEFAULT 0,
        total_questions INTEGER DEFAULT 0,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
      );

      CREATE TABLE IF NOT EXISTS user_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attempt_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        user_answer TEXT,
        is_correct INTEGER DEFAULT 0,
        FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id)
      );

      CREATE TABLE IF NOT EXISTS quiz_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        permission_type TEXT DEFAULT 'view',
        granted_by INTEGER NOT NULL,
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (granted_by) REFERENCES users(id)
      );
      
      CREATE TABLE IF NOT EXISTS quiz_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        is_assigned INTEGER DEFAULT 1,
        has_access INTEGER DEFAULT 1,
        assigned_by INTEGER NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (assigned_by) REFERENCES users(id)
      );
      
      CREATE TABLE IF NOT EXISTS access_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        resolved_by INTEGER,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (resolved_by) REFERENCES users(id)
      );
    `);

  const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  if (!admin) {
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', 'admin123', 'admin');
    console.log('Default admin created: admin/admin123');
  }
}

initializeDatabase();

// Auth
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = getUserByUsername(username);
  if (!user || user.password !== password) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  return res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, role = 'user' } = req.body || {};
  if (!username || !password) return res.status(400).json({ success: false, message: 'Missing fields' });
  const existing = getUserByUsername(username);
  if (existing) return res.status(409).json({ success: false, message: 'User exists' });
  const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, password, role);
  return res.status(201).json({ success: true, user: { id: result.lastInsertRowid, username, role } });
});

app.get('/api/users', (_req, res) => {
  const rows = db.prepare('SELECT id, username, role FROM users').all();
  return res.json(rows);
});

// Quiz endpoints
app.get('/api/quizzes', (_req, res) => {
  try {
    const quizzes = getQuizzes();
    res.json(quizzes);
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch quizzes' });
  }
});

app.get('/api/quizzes/public', (_req, res) => {
  try {
    const quizzes = db.prepare("SELECT * FROM quizzes WHERE is_public = 1").all();
    res.json(quizzes);
  } catch (error) {
    console.error('Get public quizzes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch public quizzes' });
  }
});

app.get('/api/quizzes/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const quiz = getQuizById(id);
    
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }
    
    res.json(quiz);
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch quiz' });
  }
});

app.get('/api/quizzes/:id/questions', (req, res) => {
  try {
    const quizId = Number(req.params.id);
    const questions = getQuestionsByQuizId(quizId);
    res.json(questions);
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch questions' });
  }
});

app.post('/api/quizzes', (req, res) => {
  const { title, description, created_by, is_public = 1, time_limit = 0, questions = [] } = req.body || {};
  
  if (!title) {
    return res.status(400).json({ success: false, message: 'Quiz title is required' });
  }
  
  try {
    // Begin transaction
    const insertQuiz = db.prepare(
      "INSERT INTO quizzes (title, description, created_by, is_public, time_limit) VALUES (?, ?, ?, ?, ?)"
    );
    
    const insertQuestion = db.prepare(
      "INSERT INTO questions (quiz_id, text, type, correct_answer, options, points) VALUES (?, ?, ?, ?, ?, ?)"
    );
    
    const result = db.transaction(() => {
      const quizResult = insertQuiz.run(
        title, 
        description || '', 
        created_by || null, 
        is_public ? 1 : 0, 
        time_limit || 0
      );
      
      const quizId = quizResult.lastInsertRowid;
      
      if (questions && Array.isArray(questions) && questions.length > 0) {
        questions.forEach(q => {
          insertQuestion.run(
            quizId,
            q.text,
            q.type || 'multiple_choice',
            q.correct_answer,
            q.options ? JSON.stringify(q.options) : null,
            q.points || 1
          );
        });
      }
      
      return quizId;
    })();
    
    const newQuiz = getQuizById(result);
    res.status(201).json({ success: true, quiz: newQuiz });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ success: false, message: 'Failed to create quiz' });
  }
});

app.put('/api/quizzes/:id', (req, res) => {
  const quizId = Number(req.params.id);
  const { title, description, is_public, time_limit, user_id } = req.body || {};
  
  try {
    const quiz = getQuizById(quizId);
    
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }
    
    // Check if user has permission to edit quiz
    if (user_id && quiz.created_by !== user_id) {
      const isAdmin = db.prepare("SELECT role FROM users WHERE id = ? AND role = 'admin'").get(user_id);
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: 'Unauthorized to edit this quiz' });
      }
    }
    
    const updateQuiz = db.prepare(
      "UPDATE quizzes SET title = ?, description = ?, is_public = ?, time_limit = ? WHERE id = ?"
    );
    
    updateQuiz.run(
      title !== undefined ? title : quiz.title,
      description !== undefined ? description : quiz.description,
      is_public !== undefined ? (is_public ? 1 : 0) : quiz.is_public,
      time_limit !== undefined ? time_limit : quiz.time_limit,
      quizId
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ success: false, message: 'Failed to update quiz' });
  }
});

app.delete('/api/quizzes/:id', (req, res) => {
  const quizId = Number(req.params.id);
  const userId = Number(req.query.user_id);
  
  try {
    const quiz = getQuizById(quizId);
    
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }
    
    // Check if user has permission to delete quiz
    if (userId && quiz.created_by !== userId) {
      const isAdmin = db.prepare("SELECT role FROM users WHERE id = ? AND role = 'admin'").get(userId);
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: 'Unauthorized to delete this quiz' });
      }
    }
    
    const deleteQuiz = db.prepare("DELETE FROM quizzes WHERE id = ?");
    deleteQuiz.run(quizId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete quiz' });
  }
});

// Question endpoints
app.post('/api/quizzes/:id/questions', (req, res) => {
  const quizId = Number(req.params.id);
  const { text, type = 'multiple_choice', correct_answer, options, points = 1, user_id } = req.body || {};
  
  if (!text || !correct_answer) {
    return res.status(400).json({ success: false, message: 'Question text and correct answer are required' });
  }
  
  try {
    const quiz = getQuizById(quizId);
    
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }
    
    // Check if user has permission to add question
    if (user_id && quiz.created_by !== user_id) {
      const isAdmin = db.prepare("SELECT role FROM users WHERE id = ? AND role = 'admin'").get(user_id);
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: 'Unauthorized to add question to this quiz' });
      }
    }
    
    const insertQuestion = db.prepare(
      "INSERT INTO questions (quiz_id, text, type, correct_answer, options, points) VALUES (?, ?, ?, ?, ?, ?)"
    );
    
    const result = insertQuestion.run(
      quizId,
      text,
      type,
      correct_answer,
      options ? JSON.stringify(options) : null,
      points
    );
    
    const questionId = result.lastInsertRowid;
    const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(questionId);
    
    res.status(201).json({ success: true, question });
  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({ success: false, message: 'Failed to add question' });
  }
});

app.put('/api/questions/:id', (req, res) => {
  const questionId = Number(req.params.id);
  const { text, type, correct_answer, options, points, user_id } = req.body || {};
  
  try {
    const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(questionId);
    
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    
    if (user_id) {
      const quiz = getQuizById(question.quiz_id);
      
      if (quiz && quiz.created_by !== user_id) {
        const isAdmin = db.prepare("SELECT role FROM users WHERE id = ? AND role = 'admin'").get(user_id);
        if (!isAdmin) {
          return res.status(403).json({ success: false, message: 'Unauthorized to edit this question' });
        }
      }
    }
    
    const updateQuestion = db.prepare(
      "UPDATE questions SET text = ?, type = ?, correct_answer = ?, options = ?, points = ? WHERE id = ?"
    );
    
    updateQuestion.run(
      text !== undefined ? text : question.text,
      type !== undefined ? type : question.type,
      correct_answer !== undefined ? correct_answer : question.correct_answer,
      options !== undefined ? JSON.stringify(options) : question.options,
      points !== undefined ? points : question.points,
      questionId
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ success: false, message: 'Failed to update question' });
  }
});

app.delete('/api/questions/:id', (req, res) => {
  const questionId = Number(req.params.id);
  const userId = Number(req.query.user_id);
  
  try {
    const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(questionId);
    
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    
    if (userId) {
      const quiz = getQuizById(question.quiz_id);
      
      if (quiz && quiz.created_by !== userId) {
        const isAdmin = db.prepare("SELECT role FROM users WHERE id = ? AND role = 'admin'").get(userId);
        if (!isAdmin) {
          return res.status(403).json({ success: false, message: 'Unauthorized to delete this question' });
        }
      }
    }
    
    const deleteQuestion = db.prepare("DELETE FROM questions WHERE id = ?");
    deleteQuestion.run(questionId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete question' });
  }
});

// User-specific endpoints
app.get('/api/users/:id/quizzes', (req, res) => {
  const userId = Number(req.params.id);
  
  try {
    const quizzes = db.prepare("SELECT * FROM quizzes WHERE created_by = ?").all(userId);
    res.json(quizzes);
  } catch (error) {
    console.error('Get user quizzes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user quizzes' });
  }
});

app.get('/api/users/:id/assigned-quizzes', (req, res) => {
  const userId = Number(req.params.id);
  
  try {
    const quizzes = db.prepare(`
      SELECT q.* FROM quizzes q
      JOIN quiz_assignments qa ON q.id = qa.quiz_id
      WHERE qa.user_id = ? AND qa.is_assigned = 1 AND qa.has_access = 1
    `).all(userId);
    
    res.json({ success: true, quizzes });
  } catch (error) {
    console.error('Get user assigned quizzes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch assigned quizzes' });
  }
});

app.put('/api/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const { username, password, role } = req.body || {};
  const user = getUserById(id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  db.prepare('UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?').run(username || user.username, password || user.password, role || user.role, id);
  return res.json({ success: true });
});

app.delete('/api/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const user = getUserById(id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return res.json({ success: true });
});

// Quiz attempt endpoints
app.post('/api/attempts', (req, res) => {
  const { user_id, quiz_id } = req.body || {};
  
  if (!user_id || !quiz_id) {
    return res.status(400).json({ success: false, message: 'User ID and Quiz ID are required' });
  }
  
  try {
    const insertAttempt = db.prepare(`
      INSERT INTO quiz_attempts (user_id, quiz_id, started_at) 
      VALUES (?, ?, ?)
    `);
    const result = insertAttempt.run(user_id, quiz_id, new Date().toISOString());
    
    res.status(201).json({ success: true, attemptId: result.lastInsertRowid });
  } catch (error) {
    console.error('Create attempt error:', error);
    res.status(500).json({ success: false, message: 'Failed to create attempt' });
  }
});

app.post('/api/attempts/:id/answers', (req, res) => {
  const attemptId = Number(req.params.id);
  const { question_id, user_answer } = req.body || {};
  
  if (!question_id || user_answer === undefined) {
    return res.status(400).json({ success: false, message: 'Question ID and answer are required' });
  }
  
  try {
    const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(question_id);
    
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    
    const is_correct = String(user_answer).trim().toLowerCase() === 
      String(question.correct_answer).trim().toLowerCase();
    
    const insertAnswer = db.prepare(`
      INSERT INTO user_answers (attempt_id, question_id, user_answer, is_correct) 
      VALUES (?, ?, ?, ?)
    `);
    insertAnswer.run(attemptId, question_id, user_answer, is_correct ? 1 : 0);
    
    res.status(201).json({ success: true, is_correct });
  } catch (error) {
    console.error('Answer submission error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit answer' });
  }
});

app.post('/api/attempts/:id/complete', (req, res) => {
  const attemptId = Number(req.params.id);
  
  try {
    const attempt = db.prepare("SELECT * FROM quiz_attempts WHERE id = ?").get(attemptId);
    
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }
    
    const answers = db.prepare("SELECT * FROM user_answers WHERE attempt_id = ?").all(attemptId);
    const correctCount = answers.filter(a => a.is_correct === 1).length;
    const totalQuestions = answers.length;
    const percentage = totalQuestions ? (correctCount / totalQuestions) * 100 : 0;
    const passed = percentage >= 60;
    
    const updateAttempt = db.prepare(`
      UPDATE quiz_attempts 
      SET score = ?, total_questions = ?, completed_at = ?
      WHERE id = ?
    `);
    
    updateAttempt.run(correctCount, totalQuestions, new Date().toISOString(), attemptId);
    
    const updatedAttempt = db.prepare("SELECT * FROM quiz_attempts WHERE id = ?").get(attemptId);
    
    res.json({
      success: true,
      result: {
        attempt: updatedAttempt,
        answers,
        percentage,
        passed
      }
    });
  } catch (error) {
    console.error('Complete attempt error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete attempt' });
  }
});

app.get('/api/users/:id/attempts', (req, res) => {
  const userId = Number(req.params.id);
  
  try {
    const attempts = db.prepare(`
      SELECT qa.*, q.title as quiz_title 
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      WHERE qa.user_id = ?
      ORDER BY qa.started_at DESC
    `).all(userId);
    
    res.json({ success: true, attempts });
  } catch (error) {
    console.error('Get user attempts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user attempts' });
  }
});

// Stats endpoint
app.get('/api/stats', (_req, res) => {
  try {
    const totalQuizzes = db.prepare("SELECT COUNT(*) as count FROM quizzes").get().count;
    const totalAttempts = db.prepare("SELECT COUNT(*) as count FROM quiz_attempts").get().count;
    const completedAttempts = db.prepare("SELECT * FROM quiz_attempts WHERE completed_at IS NOT NULL").all();
    
    const averageScore = completedAttempts.length 
      ? completedAttempts.reduce((sum, a) => sum + (a.score * 100) / (a.total_questions || 1), 0) / completedAttempts.length 
      : 0;
    
    res.json({ 
      success: true, 
      stats: { 
        totalQuizzes, 
        totalAttempts, 
        averageScore: Math.round(averageScore * 10) / 10 
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// Quiz assignments endpoints
app.post('/api/assignments', (req, res) => {
  const { quiz_id, user_id, assigned_by } = req.body || {};
  
  if (!quiz_id || !user_id || !assigned_by) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  
  try {
    // Check if assignment already exists
    const existingAssignment = db.prepare(`
      SELECT * FROM quiz_assignments 
      WHERE quiz_id = ? AND user_id = ?
    `).get(quiz_id, user_id);
    
    if (existingAssignment) {
      const updateAssignment = db.prepare(`
        UPDATE quiz_assignments 
        SET is_assigned = 1, has_access = 1, assigned_by = ?, assigned_at = ? 
        WHERE id = ?
      `);
      
      updateAssignment.run(assigned_by, new Date().toISOString(), existingAssignment.id);
      
      return res.json({ success: true, message: 'Assignment updated' });
    } else {
      const insertAssignment = db.prepare(`
        INSERT INTO quiz_assignments (quiz_id, user_id, is_assigned, has_access, assigned_by, assigned_at)
        VALUES (?, ?, 1, 1, ?, ?)
      `);
      
      const result = insertAssignment.run(quiz_id, user_id, assigned_by, new Date().toISOString());
      
      return res.status(201).json({ 
        success: true, 
        assignmentId: result.lastInsertRowid 
      });
    }
  } catch (error) {
    console.error('Quiz assignment error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign quiz' });
  }
});

app.delete('/api/assignments/:id', (req, res) => {
  const assignmentId = Number(req.params.id);
  
  try {
    const deleteAssignment = db.prepare("DELETE FROM quiz_assignments WHERE id = ?");
    const result = deleteAssignment.run(assignmentId);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete assignment' });
  }
});

// Access request endpoints
app.post('/api/access-requests', (req, res) => {
  const { quiz_id, user_id } = req.body || {};
  
  if (!quiz_id || !user_id) {
    return res.status(400).json({ success: false, message: 'Quiz ID and User ID are required' });
  }
  
  try {
    // Check if there's already a pending request
    const existingRequest = db.prepare(`
      SELECT * FROM access_requests 
      WHERE quiz_id = ? AND user_id = ? AND status = 'pending'
    `).get(quiz_id, user_id);
    
    if (existingRequest) {
      return res.status(409).json({ 
        success: false, 
        message: 'You already have a pending request for this quiz' 
      });
    }
    
    const insertRequest = db.prepare(`
      INSERT INTO access_requests (quiz_id, user_id, requested_at)
      VALUES (?, ?, ?)
    `);
    
    const result = insertRequest.run(quiz_id, user_id, new Date().toISOString());
    
    res.status(201).json({ 
      success: true, 
      requestId: result.lastInsertRowid 
    });
  } catch (error) {
    console.error('Access request error:', error);
    res.status(500).json({ success: false, message: 'Failed to create access request' });
  }
});

app.get('/api/access-requests', (req, res) => {
  const { status } = req.query;
  
  try {
    let query = `
      SELECT ar.*, u.username as requester_username, q.title as quiz_title
      FROM access_requests ar
      JOIN users u ON ar.user_id = u.id
      JOIN quizzes q ON ar.quiz_id = q.id
    `;
    
    let params = [];
    if (status) {
      query += " WHERE ar.status = ?";
      params.push(status);
    }
    
    query += " ORDER BY ar.requested_at DESC";
    
    const requests = db.prepare(query).all(...params);
    
    res.json({ success: true, requests });
  } catch (error) {
    console.error('Get access requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch access requests' });
  }
});

app.put('/api/access-requests/:id', (req, res) => {
  const requestId = Number(req.params.id);
  const { status, resolved_by } = req.body || {};
  
  if (!status || !resolved_by) {
    return res.status(400).json({ success: false, message: 'Status and resolver ID are required' });
  }
  
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be "approved" or "rejected"' });
  }
  
  try {
    const request = db.prepare("SELECT * FROM access_requests WHERE id = ?").get(requestId);
    
    if (!request) {
      return res.status(404).json({ success: false, message: 'Access request not found' });
    }
    
    // Begin transaction
    const result = db.transaction(() => {
      // Update access request
      db.prepare(`
        UPDATE access_requests 
        SET status = ?, resolved_at = ?, resolved_by = ?
        WHERE id = ?
      `).run(status, new Date().toISOString(), resolved_by, requestId);
      
      // If approved, create quiz assignment
      if (status === 'approved') {
        // Check if assignment exists
        const existingAssignment = db.prepare(`
          SELECT * FROM quiz_assignments 
          WHERE quiz_id = ? AND user_id = ?
        `).get(request.quiz_id, request.user_id);
        
        if (existingAssignment) {
          db.prepare(`
            UPDATE quiz_assignments 
            SET is_assigned = 1, has_access = 1, assigned_by = ?, assigned_at = ?
            WHERE id = ?
          `).run(resolved_by, new Date().toISOString(), existingAssignment.id);
        } else {
          db.prepare(`
            INSERT INTO quiz_assignments (quiz_id, user_id, is_assigned, has_access, assigned_by, assigned_at)
            VALUES (?, ?, 1, 1, ?, ?)
          `).run(request.quiz_id, request.user_id, resolved_by, new Date().toISOString());
        }
      }
      
      return { success: true };
    })();
    
    res.json(result);
  } catch (error) {
    console.error('Update access request error:', error);
    res.status(500).json({ success: false, message: 'Failed to update access request' });
  }
});

// Serve Swagger UI
const swaggerDoc = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
