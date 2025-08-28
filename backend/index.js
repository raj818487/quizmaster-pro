const express = require("express");
const cors = require("cors");
const path = require("path");
const Database = require("better-sqlite3");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create and use the database file in the backend folder
const dbPath = path.join(__dirname, "quizmaster.db");
console.log(`Using database at: ${dbPath}`);
const db = new Database(dbPath);

// Database helper functions
const getUsers = () => db.prepare("SELECT * FROM users").all();
const getUserById = (id) => {
  const user = db
    .prepare(
      "SELECT id, username, role, status, last_activity FROM users WHERE id = ?"
    )
    .get(id);
  console.log("Retrieved user by ID:", id, user);
  return user;
};
const getUserByUsername = (username) =>
  db
    .prepare(
      "SELECT id, username, password, role, status, last_activity FROM users WHERE username = ?"
    )
    .get(username);
const getQuizzes = () => db.prepare("SELECT * FROM quizzes").all();
const getQuizById = (id) =>
  db.prepare("SELECT * FROM quizzes WHERE id = ?").get(id);
const getQuestionsByQuizId = (quizId) =>
  db.prepare("SELECT * FROM questions WHERE quiz_id = ?").all(quizId);

// Initialize schema (same as unified-server.js)
function initializeDatabase() {
  db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        status TEXT DEFAULT 'active',
        last_activity TEXT
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
        has_access INTEGER DEFAULT 0,
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
        message TEXT,
        status TEXT DEFAULT 'pending',
        requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        resolved_by INTEGER,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (resolved_by) REFERENCES users(id)
      );
    `);

  // Add message column to access_requests table if it doesn't exist
  try {
    db.exec(`ALTER TABLE access_requests ADD COLUMN message TEXT;`);
  } catch (error) {
    // Column might already exist, ignore error
    console.log("Message column may already exist in access_requests table");
  }

  const admin = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get("admin");
  if (!admin) {
    db.prepare(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)"
    ).run("admin", "admin123", "admin");
    console.log("Default admin created: admin/admin123");
  }
}

initializeDatabase();

// Auth
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const user = getUserByUsername(username);

  if (!user || user.password !== password) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }

  // Check if the user is suspended
  if (user.status === "suspended") {
    return res
      .status(403)
      .json({ success: false, message: "Your account has been suspended" });
  }

  // Update last activity
  db.prepare("UPDATE users SET last_activity = ? WHERE id = ?").run(
    new Date().toISOString(),
    user.id
  );

  // Get the updated user information
  const updatedUser = getUserById(user.id);

  return res.json({
    success: true,
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
      status: updatedUser.status,
      last_activity: updatedUser.last_activity,
    },
  });
});

app.post("/api/auth/register", (req, res) => {
  const { username, password, role = "user" } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ success: false, message: "Missing fields" });
  const existing = getUserByUsername(username);
  if (existing)
    return res.status(409).json({ success: false, message: "User exists" });
  const result = db
    .prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)")
    .run(username, password, role);
  return res.status(201).json({
    success: true,
    user: { id: result.lastInsertRowid, username, role },
  });
});

app.get("/api/users", (_req, res) => {
  try {
    const rows = db
      .prepare("SELECT id, username, role, status, last_activity FROM users")
      .all();
    // Add online status (simulated for demo)
    const users = rows.map((user) => ({
      ...user,
      isOnline: user.last_activity
        ? new Date(user.last_activity).getTime() > Date.now() - 5 * 60 * 1000 // Online if active in last 5 min
        : false,
    }));
    return res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch users" });
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

app.get("/api/quizzes/public", (_req, res) => {
  try {
    const quizzes = db
      .prepare("SELECT * FROM quizzes WHERE is_public = 1")
      .all();
    res.json(quizzes);
  } catch (error) {
    console.error("Get public quizzes error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch public quizzes" });
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
    const quizId = Number(req.params.id);
    const questions = getQuestionsByQuizId(quizId);
    res.json(questions);
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
    is_public = 1,
    time_limit = 0,
    questions = [],
  } = req.body || {};

  if (!title) {
    return res
      .status(400)
      .json({ success: false, message: "Quiz title is required" });
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
        description || "",
        created_by || null,
        is_public ? 1 : 0,
        time_limit || 0
      );

      const quizId = quizResult.lastInsertRowid;

      if (questions && Array.isArray(questions) && questions.length > 0) {
        questions.forEach((q) => {
          insertQuestion.run(
            quizId,
            q.text,
            q.type || "multiple_choice",
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
    console.error("Create quiz error:", error);
    res.status(500).json({ success: false, message: "Failed to create quiz" });
  }
});

app.put("/api/quizzes/:id", (req, res) => {
  const quizId = Number(req.params.id);
  const { title, description, is_public, time_limit, user_id } = req.body || {};

  try {
    const quiz = getQuizById(quizId);

    if (!quiz) {
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });
    }

    // Check if user has permission to edit quiz
    if (user_id && quiz.created_by !== user_id) {
      const isAdmin = db
        .prepare("SELECT role FROM users WHERE id = ? AND role = 'admin'")
        .get(user_id);
      if (!isAdmin) {
        return res
          .status(403)
          .json({ success: false, message: "Unauthorized to edit this quiz" });
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
    console.error("Update quiz error:", error);
    res.status(500).json({ success: false, message: "Failed to update quiz" });
  }
});

app.delete("/api/quizzes/:id", (req, res) => {
  const quizId = Number(req.params.id);
  const userId = Number(req.query.user_id);

  try {
    const quiz = getQuizById(quizId);

    if (!quiz) {
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });
    }

    // Check if user has permission to delete quiz
    if (userId && quiz.created_by !== userId) {
      const isAdmin = db
        .prepare("SELECT role FROM users WHERE id = ? AND role = 'admin'")
        .get(userId);
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to delete this quiz",
        });
      }
    }

    const deleteQuiz = db.prepare("DELETE FROM quizzes WHERE id = ?");
    deleteQuiz.run(quizId);

    res.json({ success: true });
  } catch (error) {
    console.error("Delete quiz error:", error);
    res.status(500).json({ success: false, message: "Failed to delete quiz" });
  }
});

// Question endpoints
app.post("/api/quizzes/:id/questions", (req, res) => {
  const quizId = Number(req.params.id);
  const {
    text,
    type = "multiple_choice",
    correct_answer,
    options,
    points = 1,
    user_id,
  } = req.body || {};

  if (!text || !correct_answer) {
    return res.status(400).json({
      success: false,
      message: "Question text and correct answer are required",
    });
  }

  try {
    const quiz = getQuizById(quizId);

    if (!quiz) {
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });
    }

    // Check if user has permission to add question
    if (user_id && quiz.created_by !== user_id) {
      const isAdmin = db
        .prepare("SELECT role FROM users WHERE id = ? AND role = 'admin'")
        .get(user_id);
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to add question to this quiz",
        });
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
    const question = db
      .prepare("SELECT * FROM questions WHERE id = ?")
      .get(questionId);

    res.status(201).json({ success: true, question });
  } catch (error) {
    console.error("Add question error:", error);
    res.status(500).json({ success: false, message: "Failed to add question" });
  }
});

app.put("/api/questions/:id", (req, res) => {
  const questionId = Number(req.params.id);
  const { text, type, correct_answer, options, points, user_id } =
    req.body || {};

  try {
    const question = db
      .prepare("SELECT * FROM questions WHERE id = ?")
      .get(questionId);

    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    if (user_id) {
      const quiz = getQuizById(question.quiz_id);

      if (quiz && quiz.created_by !== user_id) {
        const isAdmin = db
          .prepare("SELECT role FROM users WHERE id = ? AND role = 'admin'")
          .get(user_id);
        if (!isAdmin) {
          return res.status(403).json({
            success: false,
            message: "Unauthorized to edit this question",
          });
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
    console.error("Update question error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update question" });
  }
});

app.delete("/api/questions/:id", (req, res) => {
  const questionId = Number(req.params.id);
  const userId = Number(req.query.user_id);

  try {
    const question = db
      .prepare("SELECT * FROM questions WHERE id = ?")
      .get(questionId);

    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    if (userId) {
      const quiz = getQuizById(question.quiz_id);

      if (quiz && quiz.created_by !== userId) {
        const isAdmin = db
          .prepare("SELECT role FROM users WHERE id = ? AND role = 'admin'")
          .get(userId);
        if (!isAdmin) {
          return res.status(403).json({
            success: false,
            message: "Unauthorized to delete this question",
          });
        }
      }
    }

    const deleteQuestion = db.prepare("DELETE FROM questions WHERE id = ?");
    deleteQuestion.run(questionId);

    res.json({ success: true });
  } catch (error) {
    console.error("Delete question error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete question" });
  }
});

// User-specific endpoints
app.get("/api/users/:id/quizzes", (req, res) => {
  const userId = Number(req.params.id);

  try {
    const quizzes = db
      .prepare("SELECT * FROM quizzes WHERE created_by = ?")
      .all(userId);
    res.json(quizzes);
  } catch (error) {
    console.error("Get user quizzes error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch user quizzes" });
  }
});

app.get("/api/users/:id/assigned-quizzes", (req, res) => {
  const userId = Number(req.params.id);

  try {
    const quizzes = db
      .prepare(
        `
      SELECT q.*, qa.is_assigned, qa.has_access 
      FROM quizzes q
      JOIN quiz_assignments qa ON q.id = qa.quiz_id
      WHERE qa.user_id = ? AND qa.is_assigned = 1
    `
      )
      .all(userId);

    res.json({ success: true, quizzes });
  } catch (error) {
    console.error("Get user assigned quizzes error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch assigned quizzes" });
  }
});

// Get user activity endpoint
app.get("/api/users/:id/activity", (req, res) => {
  const userId = Number(req.params.id);

  try {
    // Get basic user info
    const user = getUserById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Get quiz attempts
    const attempts = db
      .prepare(
        `
      SELECT qa.*, q.title as quiz_title 
      FROM quiz_attempts qa 
      JOIN quizzes q ON qa.quiz_id = q.id
      WHERE qa.user_id = ?
      ORDER BY qa.started_at DESC
      LIMIT 10
    `
      )
      .all(userId);

    // Get access requests
    const accessRequests = db
      .prepare(
        `
      SELECT ar.*, q.title as quiz_title
      FROM access_requests ar
      JOIN quizzes q ON ar.quiz_id = q.id
      WHERE ar.user_id = ?
      ORDER BY ar.requested_at DESC
      LIMIT 10
    `
      )
      .all(userId);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        last_activity: user.last_activity,
        isOnline: user.last_activity
          ? new Date(user.last_activity).getTime() > Date.now() - 5 * 60 * 1000
          : false,
      },
      activity: {
        attempts,
        accessRequests,
      },
    });
  } catch (error) {
    console.error("Get user activity error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch user activity" });
  }
});

app.put("/api/users/:id", (req, res) => {
  const id = Number(req.params.id);
  const { username, password, role, status } = req.body || {};

  try {
    console.log("Updating user:", id, "with data:", req.body);
    const user = getUserById(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // For updates that include username, check for duplicates
    if (username && username !== user.username) {
      const existingUser = db
        .prepare("SELECT id FROM users WHERE username = ?")
        .get(username);
      if (existingUser) {
        return res
          .status(409)
          .json({ success: false, message: "Username already exists" });
      }
    }

    console.log("Current user status:", user.status, "New status:", status);

    // Build the update SQL dynamically based on provided fields
    let updateFields = [];
    let params = [];

    if (username) {
      updateFields.push("username = ?");
      params.push(username);
    }

    if (password) {
      updateFields.push("password = ?");
      params.push(password);
    }

    if (role) {
      updateFields.push("role = ?");
      params.push(role);
    }

    if (status) {
      updateFields.push("status = ?");
      params.push(status);
    }

    // Always update last_activity
    updateFields.push("last_activity = ?");
    params.push(new Date().toISOString());

    // Add the user ID at the end of params array
    params.push(id);

    if (updateFields.length > 0) {
      const updateQuery = `UPDATE users SET ${updateFields.join(
        ", "
      )} WHERE id = ?`;
      console.log("Running update query:", updateQuery, "with params:", params);

      const result = db.prepare(updateQuery).run(...params);
      console.log("Update result:", result);

      // Get the updated user
      const updatedUser = getUserById(id);
      console.log("Updated user:", updatedUser);

      return res.json({ success: true, user: updatedUser });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }
  } catch (error) {
    console.error("Update user error:", error);
    console.error("Request body:", req.body);
    console.error("Update fields:", updateFields);
    console.error("Update params:", params);
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to update user: " + error.message,
      });
  }
});

app.delete("/api/users/:id", (req, res) => {
  const id = Number(req.params.id);
  const user = getUserById(id);
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return res.json({ success: true });
});

// Quiz attempt endpoints
app.post("/api/attempts", (req, res) => {
  const { user_id, quiz_id } = req.body || {};

  if (!user_id || !quiz_id) {
    return res
      .status(400)
      .json({ success: false, message: "User ID and Quiz ID are required" });
  }

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

    res.status(201).json({ success: true, attemptId: result.lastInsertRowid });
  } catch (error) {
    console.error("Create attempt error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create attempt" });
  }
});

app.post("/api/attempts/:id/answers", (req, res) => {
  const attemptId = Number(req.params.id);
  const { question_id, user_answer } = req.body || {};

  if (!question_id || user_answer === undefined) {
    return res
      .status(400)
      .json({ success: false, message: "Question ID and answer are required" });
  }

  try {
    const question = db
      .prepare("SELECT * FROM questions WHERE id = ?")
      .get(question_id);

    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    const is_correct =
      String(user_answer).trim().toLowerCase() ===
      String(question.correct_answer).trim().toLowerCase();

    const insertAnswer = db.prepare(`
      INSERT INTO user_answers (attempt_id, question_id, user_answer, is_correct) 
      VALUES (?, ?, ?, ?)
    `);
    insertAnswer.run(attemptId, question_id, user_answer, is_correct ? 1 : 0);

    res.status(201).json({ success: true, is_correct });
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
    const attempt = db
      .prepare("SELECT * FROM quiz_attempts WHERE id = ?")
      .get(attemptId);

    if (!attempt) {
      return res
        .status(404)
        .json({ success: false, message: "Attempt not found" });
    }

    const answers = db
      .prepare("SELECT * FROM user_answers WHERE attempt_id = ?")
      .all(attemptId);
    const correctCount = answers.filter((a) => a.is_correct === 1).length;
    const totalQuestions = answers.length;
    const percentage = totalQuestions
      ? (correctCount / totalQuestions) * 100
      : 0;
    const passed = percentage >= 60;

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

    const updatedAttempt = db
      .prepare("SELECT * FROM quiz_attempts WHERE id = ?")
      .get(attemptId);

    res.json({
      success: true,
      result: {
        attempt: updatedAttempt,
        answers,
        percentage,
        passed,
      },
    });
  } catch (error) {
    console.error("Complete attempt error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to complete attempt" });
  }
});

app.get("/api/users/:id/attempts", (req, res) => {
  const userId = Number(req.params.id);

  try {
    const attempts = db
      .prepare(
        `
      SELECT qa.*, q.title as quiz_title 
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      WHERE qa.user_id = ?
      ORDER BY qa.started_at DESC
    `
      )
      .all(userId);

    res.json({ success: true, attempts });
  } catch (error) {
    console.error("Get user attempts error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch user attempts" });
  }
});

// Enhanced stats endpoint for dashboard
app.get("/api/stats", (_req, res) => {
  try {
    // Basic counts
    const totalQuizzes = db
      .prepare("SELECT COUNT(*) as count FROM quizzes")
      .get().count;
    
    const totalUsers = db
      .prepare("SELECT COUNT(*) as count FROM users")
      .get().count;
    
    const activeUsers = db
      .prepare("SELECT COUNT(*) as count FROM users WHERE status = 'active'")
      .get().count;
    
    const totalAttempts = db
      .prepare("SELECT COUNT(*) as count FROM quiz_attempts")
      .get().count;
    
    const completedAttempts = db
      .prepare("SELECT COUNT(*) as count FROM quiz_attempts WHERE completed_at IS NOT NULL")
      .get().count;

    // Calculate success rate (percentage of completed attempts with passing scores)
    const passingAttempts = db
      .prepare(`
        SELECT COUNT(*) as count 
        FROM quiz_attempts 
        WHERE completed_at IS NOT NULL 
        AND (score * 100.0 / total_questions) >= 60
      `)
      .get().count;

    const successRate = completedAttempts > 0 
      ? Math.round((passingAttempts / completedAttempts) * 100) 
      : 0;

    // Calculate average score
    const avgScoreResult = db
      .prepare(`
        SELECT AVG(score * 100.0 / total_questions) as avgScore 
        FROM quiz_attempts 
        WHERE completed_at IS NOT NULL AND total_questions > 0
      `)
      .get();
    
    const averageScore = avgScoreResult.avgScore 
      ? Math.round(avgScoreResult.avgScore * 10) / 10 
      : 0;

    // Recent activity data
    const recentQuizzes = db
      .prepare(`
        SELECT q.title, q.created_at, u.username as created_by
        FROM quizzes q
        LEFT JOIN users u ON q.created_by = u.id
        ORDER BY q.created_at DESC
        LIMIT 5
      `)
      .all();

    const recentAttempts = db
      .prepare(`
        SELECT qa.completed_at, qa.score, qa.total_questions,
               u.username, q.title as quiz_title
        FROM quiz_attempts qa
        JOIN users u ON qa.user_id = u.id
        JOIN quizzes q ON qa.quiz_id = q.id
        WHERE qa.completed_at IS NOT NULL
        ORDER BY qa.completed_at DESC
        LIMIT 5
      `)
      .all();

    res.json({
      success: true,
      stats: {
        totalQuizzes,
        totalUsers,
        activeUsers,
        totalAttempts,
        completedAttempts,
        successRate,
        averageScore,
        recentQuizzes,
        recentAttempts
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
});

// Admin metrics endpoint (requires admin access)
app.get("/api/admin/metrics", (req, res) => {
  try {
    // User statistics
    const totalUsers = db
      .prepare("SELECT COUNT(*) as count FROM users")
      .get().count;
    
    const activeUsers = db
      .prepare("SELECT COUNT(*) as count FROM users WHERE status = 'active'")
      .get().count;
    
    const adminUsers = db
      .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
      .get().count;

    // Access requests
    const pendingAccessRequests = db
      .prepare("SELECT COUNT(*) as count FROM access_requests WHERE status = 'pending'")
      .get().count;

    // System health calculation (based on recent activity)
    const recentActivity = db
      .prepare(`
        SELECT COUNT(*) as count 
        FROM quiz_attempts 
        WHERE created_at >= datetime('now', '-7 days')
      `)
      .get().count;
    
    const systemHealthScore = Math.min(100, Math.max(70, 70 + (recentActivity * 2)));

    // Storage calculation (estimate based on data volume)
    const totalRecords = db
      .prepare(`
        SELECT 
          (SELECT COUNT(*) FROM users) +
          (SELECT COUNT(*) FROM quizzes) +
          (SELECT COUNT(*) FROM questions) +
          (SELECT COUNT(*) FROM quiz_attempts) +
          (SELECT COUNT(*) FROM user_answers) as total
      `)
      .get().total;
    
    const storageUsed = Math.min(100, Math.round((totalRecords / 10000) * 100));

    // Recent user registrations
    const recentUsers = db
      .prepare(`
        SELECT username, role, last_activity 
        FROM users 
        WHERE id > (SELECT MAX(id) - 10 FROM users)
        ORDER BY id DESC
        LIMIT 5
      `)
      .all();

    // Quiz activity by day (last 7 days)
    const dailyActivity = db
      .prepare(`
        SELECT 
          DATE(started_at) as date,
          COUNT(*) as attempts
        FROM quiz_attempts 
        WHERE started_at >= datetime('now', '-7 days')
        GROUP BY DATE(started_at)
        ORDER BY date DESC
      `)
      .all();

    res.json({
      success: true,
      metrics: {
        totalUsers,
        activeUsers,
        adminUsers,
        pendingAccessRequests,
        systemHealthScore,
        storageUsed,
        recentUsers,
        dailyActivity
      },
    });
  } catch (error) {
    console.error("Admin metrics error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch admin metrics" });
  }
});

// Quiz assignments endpoints
app.get("/api/quiz-assignments", (req, res) => {
  try {
    const assignments = db
      .prepare(
        `
      SELECT * FROM quiz_assignments
    `
      )
      .all();

    res.json({ success: true, assignments });
  } catch (error) {
    console.error("Error getting assignments:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get quiz assignments" });
  }
});

app.post("/api/quiz-assignments", (req, res) => {
  const {
    quizId: quiz_id,
    userId: user_id,
    assignedBy: assigned_by,
    isAssigned,
    hasAccess,
  } = req.body || {};

  if (!quiz_id || !user_id || !assigned_by) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    // Convert boolean values to integers for SQLite
    const is_assigned = isAssigned !== undefined ? (isAssigned ? 1 : 0) : 1;
    const has_access = hasAccess !== undefined ? (hasAccess ? 1 : 0) : 0; // Default to no access

    // Check if assignment already exists
    const existingAssignment = db
      .prepare(
        `
      SELECT * FROM quiz_assignments 
      WHERE quiz_id = ? AND user_id = ?
    `
      )
      .get(quiz_id, user_id);

    if (existingAssignment) {
      const updateAssignment = db.prepare(`
        UPDATE quiz_assignments 
        SET is_assigned = ?, has_access = ?, assigned_by = ?, assigned_at = ? 
        WHERE id = ?
      `);

      updateAssignment.run(
        is_assigned,
        has_access,
        assigned_by,
        new Date().toISOString(),
        existingAssignment.id
      );

      // Get the updated assignment
      const updatedAssignment = db
        .prepare(
          `
        SELECT * FROM quiz_assignments WHERE id = ?
      `
        )
        .get(existingAssignment.id);

      return res.json({ success: true, assignment: updatedAssignment });
    } else {
      const insertAssignment = db.prepare(`
        INSERT INTO quiz_assignments (quiz_id, user_id, is_assigned, has_access, assigned_by, assigned_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const result = insertAssignment.run(
        quiz_id,
        user_id,
        is_assigned,
        has_access,
        assigned_by,
        new Date().toISOString()
      );

      // Get the newly created assignment
      const newAssignment = db
        .prepare(
          `
        SELECT * FROM quiz_assignments WHERE id = ?
      `
        )
        .get(result.lastInsertRowid);

      return res.status(201).json({
        success: true,
        assignment: newAssignment,
      });
    }
  } catch (error) {
    console.error("Quiz assignment error:", error);
    res.status(500).json({ success: false, message: "Failed to assign quiz" });
  }
});

// Bulk quiz assignment endpoint
app.put("/api/quiz-assignments/bulk", (req, res) => {
  const { userId, assignments, assignedBy } = req.body;

  if (!userId || !Array.isArray(assignments) || !assignedBy) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid request. Required: userId, assignments array, and assignedBy",
    });
  }

  try {
    // Begin a transaction for bulk update
    const updatedAssignments = [];
    db.transaction(() => {
      for (const assignment of assignments) {
        const { quizId, isAssigned, hasAccess } = assignment;

        // Convert boolean values to integers for SQLite
        const isAssignedValue = isAssigned ? 1 : 0;
        const hasAccessValue = hasAccess ? 1 : 0;

        // Check if an assignment already exists for this user and quiz
        const existingAssignment = db
          .prepare(
            `
          SELECT * FROM quiz_assignments 
          WHERE quiz_id = ? AND user_id = ?
        `
          )
          .get(quizId, userId);

        if (existingAssignment) {
          // Update existing assignment
          const updateStmt = db.prepare(`
            UPDATE quiz_assignments 
            SET is_assigned = ?, has_access = ?, assigned_by = ?, assigned_at = ? 
            WHERE id = ?
          `);
          updateStmt.run(
            isAssignedValue,
            hasAccessValue,
            assignedBy,
            new Date().toISOString(),
            existingAssignment.id
          );

          // Get the updated assignment
          const updated = db
            .prepare(
              `
            SELECT * FROM quiz_assignments WHERE id = ?
          `
            )
            .get(existingAssignment.id);
          updatedAssignments.push(updated);
        } else {
          // Insert new assignment
          const insertStmt = db.prepare(`
            INSERT INTO quiz_assignments (quiz_id, user_id, is_assigned, has_access, assigned_by, assigned_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          const result = insertStmt.run(
            quizId,
            userId,
            isAssignedValue,
            hasAccessValue,
            assignedBy,
            new Date().toISOString()
          );

          // Get the new assignment
          const newAssignment = db
            .prepare(
              `
            SELECT * FROM quiz_assignments WHERE id = ?
          `
            )
            .get(result.lastInsertRowid);
          updatedAssignments.push(newAssignment);
        }
      }
    })();

    res.json({ success: true, assignments: updatedAssignments });
  } catch (error) {
    console.error("Bulk assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process bulk assignment update",
    });
  }
});

app.get("/api/users/:id/quiz-assignments", (req, res) => {
  const userId = Number(req.params.id);

  try {
    const assignments = db
      .prepare(
        `
      SELECT * FROM quiz_assignments WHERE user_id = ?
    `
      )
      .all(userId);

    res.json({ success: true, assignments });
  } catch (error) {
    console.error("Error getting user assignments:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get user quiz assignments" });
  }
});

app.delete("/api/quiz-assignments/:id", (req, res) => {
  const assignmentId = Number(req.params.id);

  try {
    const deleteAssignment = db.prepare(
      "DELETE FROM quiz_assignments WHERE id = ?"
    );
    const result = deleteAssignment.run(assignmentId);

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Delete assignment error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete assignment" });
  }
});

// Access request endpoints
app.post("/api/access-requests", (req, res) => {
  console.log("Access request POST received:", req.body);
  const { quizId: quiz_id, userId: user_id, message } = req.body || {};

  console.log("Parsed values:", { quiz_id, user_id, message });

  if (!quiz_id || !user_id) {
    console.log("Missing required fields:", { quiz_id, user_id });
    return res
      .status(400)
      .json({ success: false, message: "Quiz ID and User ID are required" });
  }

  try {
    // Check if there's already a pending request
    console.log("Checking for existing request...");
    const existingRequest = db
      .prepare(
        `
      SELECT * FROM access_requests 
      WHERE quiz_id = ? AND user_id = ? AND status = 'pending'
    `
      )
      .get(quiz_id, user_id);

    console.log("Existing request check result:", existingRequest);

    if (existingRequest) {
      console.log("Found existing pending request");
      return res.status(409).json({
        success: false,
        message: "You already have a pending request for this quiz",
      });
    }

    console.log("Preparing insert statement...");
    const insertRequest = db.prepare(`
      INSERT INTO access_requests (quiz_id, user_id, message, requested_at, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);

    console.log("Executing insert with values:", [quiz_id, user_id, message || null, new Date().toISOString()]);
    const result = insertRequest.run(
      quiz_id,
      user_id,
      message || null,
      new Date().toISOString()
    );

    console.log("Insert result:", result);
    res.status(201).json({
      success: true,
      requestId: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("Access request error (detailed):", error);
    console.error("Error stack:", error.stack);
    res
      .status(500)
      .json({ success: false, message: "Failed to create access request" });
  }
});

app.get("/api/access-requests", (req, res) => {
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
    console.error("Get access requests error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch access requests" });
  }
});

// Get access requests for a specific user
app.get("/api/users/:id/access-requests", (req, res) => {
  const userId = Number(req.params.id);
  const { status } = req.query;

  try {
    let query = `
      SELECT ar.*, q.title as quiz_title
      FROM access_requests ar
      JOIN quizzes q ON ar.quiz_id = q.id
      WHERE ar.user_id = ?
    `;

    let params = [userId];
    if (status) {
      query += " AND ar.status = ?";
      params.push(status);
    }

    query += " ORDER BY ar.requested_at DESC";

    const requests = db.prepare(query).all(...params);

    res.json({ success: true, requests });
  } catch (error) {
    console.error("Get user access requests error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user access requests",
    });
  }
});

app.put("/api/access-requests/:id", (req, res) => {
  const requestId = Number(req.params.id);
  const { status, reviewedBy: resolved_by, responseMessage } = req.body || {};

  if (!status || !resolved_by) {
    return res
      .status(400)
      .json({ success: false, message: "Status and reviewer ID are required" });
  }

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Status must be "approved" or "rejected"',
    });
  }

  try {
    const request = db
      .prepare("SELECT * FROM access_requests WHERE id = ?")
      .get(requestId);

    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Access request not found" });
    }

    // Begin transaction
    const result = db.transaction(() => {
      // Update access request
      db.prepare(
        `
        UPDATE access_requests 
        SET status = ?, reviewed_at = ?, reviewed_by = ?
        WHERE id = ?
      `
      ).run(status, new Date().toISOString(), resolved_by, requestId);

      // If approved, create quiz assignment
      if (status === "approved") {
        // Check if assignment exists
        const existingAssignment = db
          .prepare(
            `
          SELECT * FROM quiz_assignments 
          WHERE quiz_id = ? AND user_id = ?
        `
          )
          .get(request.quiz_id, request.user_id);

        if (existingAssignment) {
          db.prepare(
            `
            UPDATE quiz_assignments 
            SET is_assigned = 1, has_access = 1, assigned_by = ?, assigned_at = ?
            WHERE id = ?
          `
          ).run(resolved_by, new Date().toISOString(), existingAssignment.id);
        } else {
          db.prepare(
            `
            INSERT INTO quiz_assignments (quiz_id, user_id, is_assigned, has_access, assigned_by, assigned_at)
            VALUES (?, ?, 1, 1, ?, ?)
          `
          ).run(
            request.quiz_id,
            request.user_id,
            resolved_by,
            new Date().toISOString()
          );
        }

        // Update the request with response message if provided
        if (responseMessage) {
          db.prepare(
            `
            UPDATE access_requests 
            SET response_message = ? 
            WHERE id = ?
          `
          ).run(responseMessage, requestId);
        }
      }

      return { success: true };
    })();

    res.json(result);
  } catch (error) {
    console.error("Update access request error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update access request" });
  }
});

// Database Management Endpoints
// Get all tables with row counts
app.get("/api/database/tables", (req, res) => {
  try {
    // Get all table names
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
      .all();
    
    // Get row count for each table
    const tablesWithCounts = tables.map(table => {
      try {
        const countResult = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        const schemaResult = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(table.name);
        
        return {
          name: table.name,
          rowCount: countResult.count,
          sql: schemaResult.sql
        };
      } catch (error) {
        console.error(`Error getting info for table ${table.name}:`, error);
        return {
          name: table.name,
          rowCount: 0,
          sql: 'Error retrieving schema'
        };
      }
    });

    res.json({ 
      success: true, 
      tables: tablesWithCounts 
    });
  } catch (error) {
    console.error("Error getting database tables:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get database tables" 
    });
  }
});

// Execute SQL query
app.post("/api/database/query", (req, res) => {
  const { query } = req.body;
  
  if (!query || !query.trim()) {
    return res.status(400).json({ 
      success: false, 
      error: "Query is required" 
    });
  }

  try {
    const trimmedQuery = query.trim();
    console.log("Executing query:", trimmedQuery);
    
    // Determine if this is a SELECT query or a modification query
    const isSelectQuery = trimmedQuery.toLowerCase().startsWith('select') || 
                         trimmedQuery.toLowerCase().startsWith('pragma') ||
                         trimmedQuery.toLowerCase().startsWith('explain');
    
    if (isSelectQuery) {
      // For SELECT queries, return the data
      const stmt = db.prepare(trimmedQuery);
      const result = stmt.all();
      
      // Get column names
      let columns = [];
      if (result.length > 0) {
        columns = Object.keys(result[0]);
      } else {
        // Try to get columns from the statement info (limited support)
        try {
          const mockResult = stmt.get();
          if (mockResult) columns = Object.keys(mockResult);
        } catch (e) {
          // If no data, we can't determine columns easily
        }
      }
      
      res.json({
        success: true,
        data: result,
        columns: columns,
        rowCount: result.length,
        message: `Query returned ${result.length} rows`
      });
    } else {
      // For modification queries (INSERT, UPDATE, DELETE, CREATE, etc.)
      const stmt = db.prepare(trimmedQuery);
      const result = stmt.run();
      
      res.json({
        success: true,
        rowCount: result.changes,
        lastInsertRowid: result.lastInsertRowid,
        message: `Query executed successfully. ${result.changes} rows affected.`
      });
    }
  } catch (error) {
    console.error("SQL Query error:", error);
    res.json({
      success: false,
      error: error.message,
      message: "Query execution failed"
    });
  }
});

// Serve Swagger UI
const swaggerDoc = YAML.load(path.join(__dirname, "swagger.yaml"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

app.listen(PORT, () =>
  console.log(`Backend listening on http://localhost:${PORT}`)
);
