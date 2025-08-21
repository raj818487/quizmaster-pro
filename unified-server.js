const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SQLite database
const dbPath = path.join(__dirname, "quizmaster.db");
const db = new Database(dbPath);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files from Angular build
const browserDistFolder = path.join(__dirname, "dist/quizmaster-pro");
app.use(express.static(browserDistFolder));

// Database helper functions
const getUsers = () => db.prepare("SELECT * FROM users").all();
const getUserById = (id) =>
  db.prepare("SELECT * FROM users WHERE id = ?").get(id);
const getUserByUsername = (username) =>
  db.prepare("SELECT * FROM users WHERE username = ?").get(username);
const getQuizzes = () => db.prepare("SELECT * FROM quizzes").all();
const getQuizById = (id) =>
  db.prepare("SELECT * FROM quizzes WHERE id = ?").get(id);
const getQuestionsByQuizId = (quizId) =>
  db.prepare("SELECT * FROM questions WHERE quiz_id = ?").all(quizId);

// Initialize database tables if they don't exist
const initializeDatabase = () => {
  try {
    // Create tables
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
    `);

    // Create default admin user if doesn't exist
    const adminExists = getUserByUsername("admin");
    if (!adminExists) {
      const insertUser = db.prepare(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)"
      );
      insertUser.run("admin", "admin123", "admin");
      console.log(
        "Default admin user created (username: admin, password: admin123)"
      );
    }

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
  }
};

// Initialize database on startup
initializeDatabase();

// ===================== API ROUTES =====================

// Auth endpoints
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const user = getUserByUsername(username);
  if (!user || user.password !== password) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }
  res.json({
    success: true,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

app.post("/api/auth/register", (req, res) => {
  const { username, password, role = "user" } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  // Check if user already exists
  const existingUser = getUserByUsername(username);
  if (existingUser) {
    return res
      .status(409)
      .json({ success: false, message: "Username already exists" });
  }

  try {
    const insertUser = db.prepare(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)"
    );
    const result = insertUser.run(username, password, role);
    const newUser = { id: result.lastInsertRowid, username, role };
    res.json({ success: true, user: newUser });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, message: "Failed to create user" });
  }
});

// Users endpoints (admin)
app.get("/api/users", (_req, res) => {
  try {
    const users = getUsers();
    res.json(
      users.map((u) => ({ id: u.id, username: u.username, role: u.role }))
    );
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

app.put("/api/users/:id", (req, res) => {
  const id = Number(req.params.id);
  const { username, password, role } = req.body || {};
  const user = getUserById(id);

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  try {
    const updateUser = db.prepare(
      "UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?"
    );
    updateUser.run(
      username || user.username,
      password || user.password,
      role || user.role,
      id
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ success: false, message: "Failed to update user" });
  }
});

app.delete("/api/users/:id", (req, res) => {
  const id = Number(req.params.id);
  const user = getUserById(id);

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  try {
    const deleteUser = db.prepare("DELETE FROM users WHERE id = ?");
    const result = deleteUser.run(id);
    if (result.changes === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
});

// Quiz endpoints
app.get("/api/quizzes", (_req, res) => {
  try {
    const quizzes = getQuizzes();
    res.json(quizzes);
  } catch (error) {
    console.error("Get quizzes error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch quizzes" });
  }
});

app.get("/api/quizzes/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const quiz = getQuizById(id);
    if (!quiz) {
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });
    }
    res.json(quiz);
  } catch (error) {
    console.error("Get quiz error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch quiz" });
  }
});

app.get("/api/quizzes/:id/questions", (req, res) => {
  try {
    const id = Number(req.params.id);
    const questions = getQuestionsByQuizId(id);
    // Parse options from JSON string
    const parsedQuestions = questions.map((q) => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : null,
    }));
    res.json(parsedQuestions);
  } catch (error) {
    console.error("Get questions error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch questions" });
  }
});

app.post("/api/quizzes", (req, res) => {
  const {
    title,
    description,
    created_by,
    questions: qs,
    is_public,
    time_limit,
  } = req.body || {};

  if (!title) {
    return res.status(400).json({ success: false, message: "Missing title" });
  }

  try {
    const insertQuiz = db.prepare(`
      INSERT INTO quizzes (title, description, created_by, is_public, time_limit) 
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = insertQuiz.run(
      title,
      description || "",
      created_by || 1,
      is_public !== undefined ? is_public : 1,
      time_limit || 0
    );
    const quizId = result.lastInsertRowid;

    // Add questions if provided
    if (Array.isArray(qs) && qs.length > 0) {
      const insertQuestion = db.prepare(`
        INSERT INTO questions (quiz_id, text, type, correct_answer, points, options) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const q of qs) {
        insertQuestion.run(
          quizId,
          q.text,
          q.type || "multiple_choice",
          q.correct_answer,
          q.points || 1,
          q.options ? JSON.stringify(q.options) : null
        );
      }
    }

    const quiz = {
      id: quizId,
      title,
      description: description || "",
      created_by: created_by || 1,
      is_public: is_public !== undefined ? is_public : 1,
      time_limit: time_limit || 0,
    };
    res.json({ success: true, quiz });
  } catch (error) {
    console.error("Quiz creation error:", error);
    res.status(500).json({ success: false, message: "Failed to create quiz" });
  }
});

app.put("/api/quizzes/:id", (req, res) => {
  const id = Number(req.params.id);
  const { title, description, is_public, time_limit, user_id } = req.body || {};

  try {
    const quiz = getQuizById(id);
    if (!quiz) {
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });
    }

    // Check permissions
    const user = getUserById(user_id);
    if (!user || (quiz.created_by !== user_id && user.role !== "admin")) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const updateQuiz = db.prepare(`
      UPDATE quizzes 
      SET title = ?, description = ?, is_public = ?, time_limit = ?
      WHERE id = ?
    `);
    updateQuiz.run(
      title || quiz.title,
      description !== undefined ? description : quiz.description,
      is_public !== undefined ? is_public : quiz.is_public,
      time_limit !== undefined ? time_limit : quiz.time_limit,
      id
    );

    res.json({ success: true, message: "Quiz updated successfully" });
  } catch (error) {
    console.error("Quiz update error:", error);
    res.status(500).json({ success: false, message: "Failed to update quiz" });
  }
});

app.delete("/api/quizzes/:id", (req, res) => {
  const id = Number(req.params.id);
  const { user_id } = req.query;

  try {
    const quiz = getQuizById(id);
    if (!quiz) {
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });
    }

    // Check permissions
    const user = getUserById(Number(user_id));
    if (
      !user ||
      (quiz.created_by !== Number(user_id) && user.role !== "admin")
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Delete related data first
    db.prepare("DELETE FROM questions WHERE quiz_id = ?").run(id);
    db.prepare("DELETE FROM quiz_permissions WHERE quiz_id = ?").run(id);
    db.prepare(
      "DELETE FROM user_answers WHERE attempt_id IN (SELECT id FROM quiz_attempts WHERE quiz_id = ?)"
    ).run(id);
    db.prepare("DELETE FROM quiz_attempts WHERE quiz_id = ?").run(id);

    // Delete quiz
    const deleteQuiz = db.prepare("DELETE FROM quizzes WHERE id = ?");
    const result = deleteQuiz.run(id);

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });
    }

    res.json({ success: true, message: "Quiz deleted successfully" });
  } catch (error) {
    console.error("Quiz deletion error:", error);
    res.status(500).json({ success: false, message: "Failed to delete quiz" });
  }
});

// Question endpoints
app.post("/api/quizzes/:id/questions", (req, res) => {
  const quizId = Number(req.params.id);
  const { text, type, correct_answer, points, options, user_id } =
    req.body || {};

  try {
    const quiz = getQuizById(quizId);
    if (!quiz) {
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });
    }

    const user = getUserById(user_id);
    if (!user || (quiz.created_by !== user_id && user.role !== "admin")) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const insertQuestion = db.prepare(`
      INSERT INTO questions (quiz_id, text, type, correct_answer, points, options) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = insertQuestion.run(
      quizId,
      text,
      type || "multiple_choice",
      correct_answer,
      points || 1,
      options ? JSON.stringify(options) : null
    );

    const question = {
      id: result.lastInsertRowid,
      quiz_id: quizId,
      text,
      type: type || "multiple_choice",
      correct_answer,
      points: points || 1,
      options: options || null,
    };

    res.json({ success: true, question });
  } catch (error) {
    console.error("Question creation error:", error);
    res.status(500).json({ success: false, message: "Failed to add question" });
  }
});

app.put("/api/questions/:id", (req, res) => {
  const id = Number(req.params.id);
  const { text, type, correct_answer, points, options, user_id } =
    req.body || {};

  try {
    const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(id);
    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    const quiz = getQuizById(question.quiz_id);
    const user = getUserById(user_id);
    if (!user || (quiz.created_by !== user_id && user.role !== "admin")) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const updateQuestion = db.prepare(`
      UPDATE questions 
      SET text = ?, type = ?, correct_answer = ?, points = ?, options = ?
      WHERE id = ?
    `);
    updateQuestion.run(
      text || question.text,
      type || question.type,
      correct_answer || question.correct_answer,
      points !== undefined ? points : question.points,
      options ? JSON.stringify(options) : question.options,
      id
    );

    res.json({ success: true, message: "Question updated successfully" });
  } catch (error) {
    console.error("Question update error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update question" });
  }
});

app.delete("/api/questions/:id", (req, res) => {
  const id = Number(req.params.id);
  const { user_id } = req.query;

  try {
    const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(id);
    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    const quiz = getQuizById(question.quiz_id);
    const user = getUserById(Number(user_id));
    if (
      !user ||
      (quiz.created_by !== Number(user_id) && user.role !== "admin")
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const deleteQuestion = db.prepare("DELETE FROM questions WHERE id = ?");
    const result = deleteQuestion.run(id);

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    res.json({ success: true, message: "Question deleted successfully" });
  } catch (error) {
    console.error("Question deletion error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete question" });
  }
});

// Quiz attempt endpoints
app.post("/api/attempts", (req, res) => {
  const { user_id, quiz_id } = req.body || {};

  try {
    const insertAttempt = db.prepare(`
      INSERT INTO quiz_attempts (user_id, quiz_id, started_at) 
      VALUES (?, ?, ?)
    `);
    const result = insertAttempt.run(
      user_id,
      quiz_id,
      new Date().toISOString()
    );

    res.json({ success: true, attemptId: result.lastInsertRowid });
  } catch (error) {
    console.error("Attempt creation error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create attempt" });
  }
});

app.post("/api/attempts/:id/answers", (req, res) => {
  const attemptId = Number(req.params.id);
  const { question_id, user_answer } = req.body || {};

  try {
    const question = db
      .prepare("SELECT * FROM questions WHERE id = ?")
      .get(question_id);
    const is_correct = question
      ? String(user_answer).trim().toLowerCase() ===
        String(question.correct_answer).trim().toLowerCase()
      : false;

    const insertAnswer = db.prepare(`
      INSERT INTO user_answers (attempt_id, question_id, user_answer, is_correct) 
      VALUES (?, ?, ?, ?)
    `);
    insertAnswer.run(attemptId, question_id, user_answer, is_correct ? 1 : 0);

    res.json({ success: true, is_correct });
  } catch (error) {
    console.error("Answer submission error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to submit answer" });
  }
});

app.post("/api/attempts/:id/complete", (req, res) => {
  const attemptId = Number(req.params.id);

  try {
    const answers = db
      .prepare("SELECT * FROM user_answers WHERE attempt_id = ?")
      .all(attemptId);
    const correctCount = answers.filter((a) => a.is_correct === 1).length;
    const totalQuestions = answers.length;
    const percentage = totalQuestions
      ? (correctCount / totalQuestions) * 100
      : 0;
    const passed = percentage >= 60;

    // Update attempt
    const updateAttempt = db.prepare(`
      UPDATE quiz_attempts 
      SET score = ?, total_questions = ?, completed_at = ?
      WHERE id = ?
    `);
    updateAttempt.run(
      correctCount,
      totalQuestions,
      new Date().toISOString(),
      attemptId
    );

    const attempt = db
      .prepare("SELECT * FROM quiz_attempts WHERE id = ?")
      .get(attemptId);

    res.json({
      success: true,
      result: { attempt, answers, percentage, passed },
    });
  } catch (error) {
    console.error("Complete attempt error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to complete attempt" });
  }
});

// Stats endpoint
app.get("/api/stats", (_req, res) => {
  try {
    const totalQuizzes = db
      .prepare("SELECT COUNT(*) as count FROM quizzes")
      .get().count;
    const totalAttempts = db
      .prepare("SELECT COUNT(*) as count FROM quiz_attempts")
      .get().count;
    const completedAttempts = db
      .prepare("SELECT * FROM quiz_attempts WHERE completed_at IS NOT NULL")
      .all();

    const averageScore = completedAttempts.length
      ? completedAttempts.reduce(
          (sum, a) => sum + (a.score * 100) / (a.total_questions || 1),
          0
        ) / completedAttempts.length
      : 0;

    res.json({ totalQuizzes, totalAttempts, averageScore });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
});

// Get user's attempts
app.get("/api/users/:id/attempts", (req, res) => {
  const userId = Number(req.params.id);

  try {
    const attempts = db
      .prepare("SELECT * FROM quiz_attempts WHERE user_id = ?")
      .all(userId);
    res.json(attempts);
  } catch (error) {
    console.error("Get attempts error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch attempts" });
  }
});

// Get user's accessible quizzes
app.get("/api/users/:id/quizzes", (req, res) => {
  const userId = Number(req.params.id);

  try {
    const publicQuizzes = db
      .prepare("SELECT * FROM quizzes WHERE is_public = 1")
      .all();
    const ownQuizzes = db
      .prepare("SELECT * FROM quizzes WHERE created_by = ?")
      .all(userId);
    const permittedQuizzes = db
      .prepare(
        `
      SELECT q.* FROM quizzes q 
      JOIN quiz_permissions p ON q.id = p.quiz_id 
      WHERE p.user_id = ?
    `
      )
      .all(userId);

    // Combine and deduplicate
    const allQuizzes = [...publicQuizzes, ...ownQuizzes, ...permittedQuizzes];
    const uniqueQuizzes = allQuizzes.filter(
      (quiz, index, self) => index === self.findIndex((q) => q.id === quiz.id)
    );

    res.json(uniqueQuizzes);
  } catch (error) {
    console.error("Get user quizzes error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch user quizzes" });
  }
});

// ===================== STATIC FILE SERVING =====================

// Serve Angular app for all non-API routes
app.get("*", (req, res) => {
  // Skip API routes
  if (req.path.startsWith("/api/")) {
    return res
      .status(404)
      .json({ success: false, message: "API endpoint not found" });
  }

  const indexPath = path.join(browserDistFolder, "index.html");

  // Check if the built Angular app exists
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <h1>QuizMaster Pro</h1>
      <p>Angular application not built yet.</p>
      <p>Run <code>ng build</code> to build the frontend.</p>
      <p>API is available at <a href="/api/users">/api/*</a></p>
    `);
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 QuizMaster Pro Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api/*`);
  console.log(`🌐 Web app available at http://localhost:${PORT}`);
  console.log(`📁 Database location: ${dbPath}`);
});

module.exports = app;
