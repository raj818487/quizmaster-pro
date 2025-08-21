const http = require("http");
const url = require("url");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const PORT = process.env.PORT || 3000;

// Initialize SQLite database
const dbPath = path.join(__dirname, "quizmaster.db");
const db = new Database(dbPath);

// Initialize database tables
const initializeDatabase = () => {
  try {
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
    `);

    // Create default admin user if doesn't exist
    const adminExists = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get("admin");
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

// Helper functions
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

// MIME types
const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

// Read request body
const readBody = (req) => {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
};

// Set CORS headers
const setCORSHeaders = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
};

// Send JSON response
const sendJSON = (res, statusCode, data) => {
  setCORSHeaders(res);
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
};

// Serve static files
const serveStaticFile = (res, filePath) => {
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || "text/plain";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("File not found");
      return;
    }
    setCORSHeaders(res);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
};

// API handlers
const handleAPI = async (req, res, parsedUrl) => {
  const pathname = parsedUrl.pathname;
  const method = req.method;
  const query = parsedUrl.query;

  console.log(`API Handler - ${method} ${pathname}`);

  // Handle OPTIONS requests
  if (method === "OPTIONS") {
    setCORSHeaders(res);
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    // Auth endpoints
    if (pathname === "/api/auth/login" && method === "POST") {
      const { username, password } = await readBody(req);
      const user = getUserByUsername(username);
      if (!user || user.password !== password) {
        return sendJSON(res, 401, {
          success: false,
          message: "Invalid credentials",
        });
      }
      return sendJSON(res, 200, {
        success: true,
        user: { id: user.id, username: user.username, role: user.role },
      });
    }

    if (pathname === "/api/auth/register" && method === "POST") {
      const { username, password, role = "user" } = await readBody(req);
      if (!username || !password) {
        return sendJSON(res, 400, {
          success: false,
          message: "Missing fields",
        });
      }

      const existingUser = getUserByUsername(username);
      if (existingUser) {
        return sendJSON(res, 409, {
          success: false,
          message: "Username already exists",
        });
      }

      const insertUser = db.prepare(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)"
      );
      const result = insertUser.run(username, password, role);
      const newUser = { id: result.lastInsertRowid, username, role };
      return sendJSON(res, 200, { success: true, user: newUser });
    }

    // Users endpoints
    if (pathname === "/api/users" && method === "GET") {
      const users = getUsers();
      return sendJSON(
        res,
        200,
        users.map((u) => ({ id: u.id, username: u.username, role: u.role }))
      );
    }

    // User's quizzes endpoint
    if (pathname.match(/^\/api\/users\/\d+\/quizzes$/) && method === "GET") {
      const userId = Number(pathname.split("/")[3]);
      const userQuizzes = db
        .prepare("SELECT * FROM quizzes WHERE created_by = ?")
        .all(userId);
      return sendJSON(res, 200, userQuizzes);
    }

    // Quiz endpoints
    if (pathname === "/api/quizzes" && method === "GET") {
      const quizzes = getQuizzes();
      return sendJSON(res, 200, quizzes);
    }

    // Public quizzes endpoint
    if (pathname === "/api/quizzes/public" && method === "GET") {
      const publicQuizzes = db
        .prepare("SELECT * FROM quizzes WHERE is_public = 1")
        .all();
      return sendJSON(res, 200, publicQuizzes);
    }

    // User-specific quizzes endpoint
    if (
      pathname.startsWith("/api/users/") &&
      pathname.endsWith("/quizzes") &&
      method === "GET"
    ) {
      const userIdMatch = pathname.match(/\/api\/users\/(\d+)\/quizzes/);
      if (userIdMatch) {
        const userId = parseInt(userIdMatch[1]);

        // Get quizzes created by this user or assigned to them
        // For now, we'll return quizzes created by the user
        const userQuizzes = db
          .prepare("SELECT * FROM quizzes WHERE created_by = ?")
          .all(userId);

        return sendJSON(res, 200, userQuizzes);
      }
      return sendJSON(res, 400, { success: false, message: "Invalid user ID" });
    }

    if (pathname === "/api/quizzes" && method === "POST") {
      try {
        const {
          title,
          description,
          created_by,
          questions: qs,
          is_public,
          time_limit,
        } = await readBody(req);

        if (!title) {
          return sendJSON(res, 400, {
            success: false,
            message: "Missing title",
          });
        }

        const insertQuiz = db.prepare(`
          INSERT INTO quizzes (title, description, created_by, is_public, time_limit) 
          VALUES (?, ?, ?, ?, ?)
        `);
        const result = insertQuiz.run(
          String(title),
          String(description || ""),
          Number(created_by || 1),
          Number(is_public !== undefined ? (is_public ? 1 : 0) : 1),
          Number(time_limit || 0)
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
              Number(quizId),
              String(q.text || ""),
              String(q.type || "multiple_choice"),
              String(q.correct_answer || ""),
              Number(q.points || 1),
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
        return sendJSON(res, 200, { success: true, quiz });
      } catch (error) {
        console.error("Error creating quiz:", error);
        return sendJSON(res, 500, {
          success: false,
          message: `Failed to create quiz: ${error.message}`,
        });
      }
    }

    // Quiz by ID
    if (pathname.match(/^\/api\/quizzes\/\d+$/) && method === "GET") {
      const id = Number(pathname.split("/")[3]);
      const quiz = getQuizById(id);
      if (!quiz) {
        return sendJSON(res, 404, {
          success: false,
          message: "Quiz not found",
        });
      }
      return sendJSON(res, 200, quiz);
    }

    // Update quiz
    if (pathname.match(/^\/api\/quizzes\/\d+$/) && method === "PUT") {
      try {
        const quizId = Number(pathname.split("/")[3]);
        const { title, description, is_public, time_limit } = await readBody(
          req
        );

        // Check if quiz exists
        const existingQuiz = getQuizById(quizId);
        if (!existingQuiz) {
          return sendJSON(res, 404, {
            success: false,
            message: "Quiz not found",
          });
        }

        // Update quiz
        const updateQuiz = db.prepare(`
          UPDATE quizzes 
          SET title = ?, description = ?, is_public = ?, time_limit = ?
          WHERE id = ?
        `);

        const result = updateQuiz.run(
          String(title || existingQuiz.title),
          String(
            description !== undefined ? description : existingQuiz.description
          ),
          Number(
            is_public !== undefined
              ? is_public
                ? 1
                : 0
              : existingQuiz.is_public
          ),
          Number(
            time_limit !== undefined ? time_limit : existingQuiz.time_limit
          ),
          Number(quizId)
        );

        if (result.changes === 0) {
          return sendJSON(res, 404, {
            success: false,
            message: "Quiz not found",
          });
        }

        // Get updated quiz
        const updatedQuiz = getQuizById(quizId);
        return sendJSON(res, 200, { success: true, quiz: updatedQuiz });
      } catch (error) {
        console.error("Error updating quiz:", error);
        return sendJSON(res, 500, {
          success: false,
          message: `Failed to update quiz: ${error.message}`,
        });
      }
    }

    // Questions for quiz
    if (
      pathname.match(/^\/api\/quizzes\/\d+\/questions$/) &&
      method === "GET"
    ) {
      const id = Number(pathname.split("/")[3]);
      const questions = getQuestionsByQuizId(id);
      const parsedQuestions = questions.map((q) => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : null,
      }));
      return sendJSON(res, 200, parsedQuestions);
    }

    // Add question to quiz
    if (
      pathname.match(/^\/api\/quizzes\/\d+\/questions$/) &&
      method === "POST"
    ) {
      try {
        const quizId = Number(pathname.split("/")[3]);
        const { text, type, correct_answer, points, options } = await readBody(
          req
        );

        if (!text || !correct_answer) {
          return sendJSON(res, 400, {
            success: false,
            message: "Missing required fields: text and correct_answer",
          });
        }

        // Check if quiz exists
        const quiz = getQuizById(quizId);
        if (!quiz) {
          return sendJSON(res, 404, {
            success: false,
            message: "Quiz not found",
          });
        }

        const insertQuestion = db.prepare(`
          INSERT INTO questions (quiz_id, text, type, correct_answer, points, options) 
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = insertQuestion.run(
          Number(quizId),
          String(text),
          String(type || "multiple_choice"),
          String(correct_answer),
          Number(points || 1),
          options ? JSON.stringify(options) : null
        );

        const question = {
          id: result.lastInsertRowid,
          quiz_id: quizId,
          text,
          type: type || "multiple_choice",
          correct_answer,
          points: points || 1,
          options,
        };

        return sendJSON(res, 200, { success: true, question });
      } catch (error) {
        console.error("Error adding question:", error);
        return sendJSON(res, 500, {
          success: false,
          message: `Failed to add question: ${error.message}`,
        });
      }
    }

    // Delete quiz
    if (pathname.match(/^\/api\/quizzes\/\d+$/) && method === "DELETE") {
      try {
        const quizId = Number(pathname.split("/")[3]);
        const query = parsedUrl.query;
        const userId = query.user_id ? Number(query.user_id) : null;

        // Check if quiz exists
        const quiz = getQuizById(quizId);
        if (!quiz) {
          return sendJSON(res, 404, {
            success: false,
            message: "Quiz not found",
          });
        }

        // Check if user has permission to delete (owner or admin)
        if (userId && quiz.created_by !== userId) {
          // Would need to check if user is admin, but for now allow deletion
          // In a real app, you'd verify user role here
        }

        // Delete questions first (foreign key constraint)
        const deleteQuestions = db.prepare(
          "DELETE FROM questions WHERE quiz_id = ?"
        );
        deleteQuestions.run(quizId);

        // Delete quiz
        const deleteQuiz = db.prepare("DELETE FROM quizzes WHERE id = ?");
        const result = deleteQuiz.run(quizId);

        if (result.changes === 0) {
          return sendJSON(res, 404, {
            success: false,
            message: "Quiz not found",
          });
        }

        return sendJSON(res, 200, {
          success: true,
          message: "Quiz deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting quiz:", error);
        return sendJSON(res, 500, {
          success: false,
          message: `Failed to delete quiz: ${error.message}`,
        });
      }
    }

    // Stats endpoint
    if (pathname === "/api/stats" && method === "GET") {
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

      return sendJSON(res, 200, { totalQuizzes, totalAttempts, averageScore });
    }

    // Default API 404
    return sendJSON(res, 404, {
      success: false,
      message: "API endpoint not found",
    });
  } catch (error) {
    console.error("API error:", error);
    return sendJSON(res, 500, {
      success: false,
      message: "Internal server error",
    });
  }
};

// Main server
const server = http.createServer(async (req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Handle API routes
  if (pathname.startsWith("/api/")) {
    console.log(`API request: ${pathname}`);
    return handleAPI(req, res, parsedUrl);
  }

  // Serve static files
  const browserDistFolder = path.join(__dirname, "dist/quizmaster-pro");
  let filePath = path.join(
    browserDistFolder,
    pathname === "/" ? "index.html" : pathname
  );

  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File doesn't exist, serve index.html (SPA fallback)
      filePath = path.join(browserDistFolder, "index.html");
    }

    // Check if index.html exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        // Angular app not built
        setCORSHeaders(res);
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end(`
          <h1>QuizMaster Pro</h1>
          <p>Angular application not built yet.</p>
          <p>Run <code>ng build</code> to build the frontend.</p>
          <p>API is available at <a href="/api/users">/api/*</a></p>
        `);
        return;
      }

      serveStaticFile(res, filePath);
    });
  });
});

server.listen(PORT, () => {
  console.log(`🚀 QuizMaster Pro Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api/*`);
  console.log(`🌐 Web app available at http://localhost:${PORT}`);
  console.log(`📁 Database location: ${dbPath}`);
});

module.exports = server;
