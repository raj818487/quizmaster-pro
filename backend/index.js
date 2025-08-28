const express = require("express");
const cors = require("cors");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Import PostgreSQL database service
const { DatabaseService, pool } = require("./database");
const db = DatabaseService;

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize PostgreSQL database
async function initializePostgreSQL() {
  try {
    // Test database connection
    await pool.query("SELECT NOW()");
    console.log("✅ PostgreSQL connection established");

    // Check if tables exist, if not, run initialization
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);

    if (result.rows.length === 0) {
      console.log("🚀 Running database initialization...");
      const { initializeDatabase } = require("./init-postgres");
      await initializeDatabase();
    } else {
      console.log("📊 Database already initialized");
    }
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
    console.log("🔄 Server will start without database connection");
    console.log(
      "💡 Please ensure PostgreSQL is running and configured correctly"
    );
    console.log("📖 See POSTGRESQL_SETUP.md for setup instructions");
  }
}

// Initialize database on startup (non-blocking)
initializePostgreSQL();

// Auth
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const user = await DatabaseService.getUserByUsername(username);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Compare password with bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
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
    await DatabaseService.updateUserActivity(user.id);

    // Get the updated user information
    const updatedUser = await DatabaseService.getUserById(user.id);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token: token,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        status: updatedUser.status,
        last_activity: updatedUser.last_activity,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password, role = "user" } = req.body || {};
    if (!username || !password)
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });

    const existing = await DatabaseService.getUserByUsername(username);
    if (existing)
      return res.status(409).json({ success: false, message: "User exists" });

    const userId = await DatabaseService.createUser(username, password, role);
    return res.status(201).json({
      success: true,
      user: { id: userId, username, role },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

app.get("/api/users", async (_req, res) => {
  try {
    const users = await DatabaseService.getAllUsers();
    // Add online status (simulated for demo)
    const usersWithStatus = users.map((user) => ({
      ...user,
      isOnline: user.last_activity
        ? new Date(user.last_activity).getTime() > Date.now() - 5 * 60 * 1000 // Online if active in last 5 min
        : false,
    }));
    return res.json(usersWithStatus);
  } catch (error) {
    console.error("Get users error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch users" });
  }
});

// Quiz endpoints
// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
}

app.get("/api/quizzes", authenticateToken, async (req, res) => {
  try {
    let quizzes;

    // If user is admin, show all quizzes
    if (req.user && req.user.role === "admin") {
      quizzes = await DatabaseService.getAllQuizzes();
    }
    // If user is logged in but not admin, show public quizzes + their own quizzes
    else if (req.user) {
      const publicQuizzes = await DatabaseService.getPublicQuizzes();
      const userQuizzes = await pool.query(
        "SELECT * FROM quizzes WHERE created_by = $1",
        [req.user.id]
      );

      // Combine and remove duplicates
      const allQuizzes = [...publicQuizzes, ...userQuizzes.rows];
      const uniqueQuizzes = allQuizzes.filter(
        (quiz, index, self) => index === self.findIndex((q) => q.id === quiz.id)
      );
      quizzes = uniqueQuizzes;
    }
    // If not logged in, show only public quizzes
    else {
      quizzes = await DatabaseService.getPublicQuizzes();
    }

    res.json(quizzes);
  } catch (error) {
    console.error("Get quizzes error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch quizzes" });
  }
});

app.get("/api/quizzes/public", async (_req, res) => {
  try {
    const quizzes = await DatabaseService.getPublicQuizzes();
    res.json(quizzes);
  } catch (error) {
    console.error("Get public quizzes error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch public quizzes" });
  }
});

app.get("/api/quizzes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const quiz = await DatabaseService.getQuizById(id);

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

app.get("/api/quizzes/:id/questions", async (req, res) => {
  try {
    const quizId = Number(req.params.id);

    // Validate quiz ID
    if (!quizId || isNaN(quizId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quiz ID",
      });
    }

    const questions = await DatabaseService.getQuestionsByQuizId(quizId);

    // Ensure questions have proper structure
    const formattedQuestions = questions.map((question) => ({
      id: question.id,
      question: question.question,
      options: Array.isArray(question.options)
        ? question.options
        : JSON.parse(question.options || "[]"),
      correct_answer: question.correct_answer,
      points: question.points || 1,
      quiz_id: question.quiz_id,
    }));

    res.json(formattedQuestions);
  } catch (error) {
    console.error("Get questions error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch questions" });
  }
});

app.post("/api/quizzes", async (req, res) => {
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
    const quizId = await DatabaseService.createQuizWithQuestions({
      title,
      description: description || "",
      created_by: created_by || null,
      is_public: is_public ? 1 : 0,
      time_limit: time_limit || 0,
      questions,
    });

    const newQuiz = await DatabaseService.getQuizById(quizId);
    res.status(201).json({ success: true, quiz: newQuiz });
  } catch (error) {
    console.error("Create quiz error:", error);
    res.status(500).json({ success: false, message: "Failed to create quiz" });
  }
});

app.put("/api/quizzes/:id", async (req, res) => {
  const quizId = Number(req.params.id);
  const { title, description, is_public, time_limit, user_id } = req.body || {};

  try {
    const quiz = await DatabaseService.getQuizById(quizId);

    if (!quiz) {
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });
    }

    // Check if user has permission to edit quiz
    if (user_id && quiz.created_by !== user_id) {
      const user = await DatabaseService.getUserById(user_id);
      if (!user || user.role !== "admin") {
        return res
          .status(403)
          .json({ success: false, message: "Unauthorized to edit this quiz" });
      }
    }

    await DatabaseService.updateQuiz(quizId, {
      title: title !== undefined ? title : quiz.title,
      description: description !== undefined ? description : quiz.description,
      is_public: is_public !== undefined ? (is_public ? 1 : 0) : quiz.is_public,
      time_limit: time_limit !== undefined ? time_limit : quiz.time_limit,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Update quiz error:", error);
    res.status(500).json({ success: false, message: "Failed to update quiz" });
  }
});

app.delete("/api/quizzes/:id", async (req, res) => {
  const quizId = Number(req.params.id);
  const userId = Number(req.query.user_id);

  try {
    const quiz = await DatabaseService.getQuizById(quizId);

    if (!quiz) {
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });
    }

    // Check if user has permission to delete quiz
    if (userId && quiz.created_by !== userId) {
      const user = await DatabaseService.getUserById(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to delete this quiz",
        });
      }
    }

    await DatabaseService.deleteQuiz(quizId);

    res.json({ success: true });
  } catch (error) {
    console.error("Delete quiz error:", error);
    res.status(500).json({ success: false, message: "Failed to delete quiz" });
  }
});

// Question endpoints
app.post("/api/quizzes/:id/questions", async (req, res) => {
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
    const quiz = await DatabaseService.getQuizById(quizId);

    if (!quiz) {
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });
    }

    // Check if user has permission to add question
    if (user_id && quiz.created_by !== user_id) {
      const isAdminResult = await pool.query(
        "SELECT role FROM users WHERE id = $1 AND role = 'admin'",
        [user_id]
      );
      const isAdmin = isAdminResult.rows[0];
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to add question to this quiz",
        });
      }
    }

    const result = await pool.query(
      "INSERT INTO questions (quiz_id, question, correct_answer, options, points) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [
        quizId,
        text,
        correct_answer,
        options ? JSON.stringify(options) : null,
        points,
      ]
    );

    const question = result.rows[0];

    res.status(201).json({ success: true, question });
  } catch (error) {
    console.error("Add question error:", error);
    res.status(500).json({ success: false, message: "Failed to add question" });
  }
});

app.put("/api/questions/:id", async (req, res) => {
  const questionId = Number(req.params.id);
  const { text, type, correct_answer, options, points, user_id } =
    req.body || {};

  try {
    const question = (
      await pool.query("SELECT * FROM questions WHERE id = $1", [questionId])
    ).rows[0];

    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    if (user_id) {
      const quiz = await DatabaseService.getQuizById(question.quiz_id);

      if (quiz && quiz.created_by !== user_id) {
        const isAdmin = (
          await pool.query(
            "SELECT role FROM users WHERE id = $1 AND role = 'admin'",
            [user_id]
          )
        ).rows[0];
        if (!isAdmin) {
          return res.status(403).json({
            success: false,
            message: "Unauthorized to edit this question",
          });
        }
      }
    }

    await pool.query(
      "UPDATE questions SET question = $1, correct_answer = $2, options = $3, points = $4 WHERE id = $5",
      [
        text !== undefined ? text : question.question,
        correct_answer !== undefined ? correct_answer : question.correct_answer,
        options !== undefined ? JSON.stringify(options) : question.options,
        points !== undefined ? points : question.points,
        questionId,
      ]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Update question error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update question" });
  }
});

app.delete("/api/questions/:id", async (req, res) => {
  const questionId = Number(req.params.id);
  const userId = Number(req.query.user_id);

  try {
    const question = (
      await pool.query("SELECT * FROM questions WHERE id = $1", [questionId])
    ).rows[0];

    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    if (userId) {
      const quiz = await DatabaseService.getQuizById(question.quiz_id);

      if (quiz && quiz.created_by !== userId) {
        const isAdmin = (
          await pool.query(
            "SELECT role FROM users WHERE id = $1 AND role = 'admin'",
            [userId]
          )
        ).rows[0];
        if (!isAdmin) {
          return res.status(403).json({
            success: false,
            message: "Unauthorized to delete this question",
          });
        }
      }
    }

    await pool.query("DELETE FROM questions WHERE id = $1", [questionId]);

    res.json({ success: true });
  } catch (error) {
    console.error("Delete question error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete question" });
  }
});

// User-specific endpoints
app.get("/api/users/:id/quizzes", authenticateToken, async (req, res) => {
  const userId = Number(req.params.id);

  try {
    let quizzes;

    // If requesting user is admin, show all quizzes created by the specified user
    // If requesting user is the same as the specified user, show their quizzes
    // Otherwise, show only public quizzes created by the specified user
    if (req.user && (req.user.role === "admin" || req.user.id === userId)) {
      quizzes = (
        await pool.query(
          "SELECT * FROM quizzes WHERE created_by = $1 ORDER BY created_at DESC",
          [userId]
        )
      ).rows;
    } else {
      quizzes = (
        await pool.query(
          "SELECT * FROM quizzes WHERE created_by = $1 AND is_public = true ORDER BY created_at DESC",
          [userId]
        )
      ).rows;
    }

    res.json(quizzes);
  } catch (error) {
    console.error("Get user quizzes error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch user quizzes" });
  }
});

app.get("/api/users/:id/assigned-quizzes", async (req, res) => {
  const userId = Number(req.params.id);

  try {
    const quizzes = (
      await pool.query(
        `
      SELECT q.*, qa.assigned_at 
      FROM quizzes q
      JOIN quiz_assignments qa ON q.id = qa.quiz_id
      WHERE qa.user_id = $1
    `,
        [userId]
      )
    ).rows;

    res.json({ success: true, quizzes });
  } catch (error) {
    console.error("Get user assigned quizzes error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch assigned quizzes" });
  }
});

// Get user activity endpoint
app.get("/api/users/:id/activity", async (req, res) => {
  const userId = Number(req.params.id);

  try {
    // Get basic user info
    const user = await DatabaseService.getUserById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Get quiz attempts
    const attempts = (
      await pool.query(
        `
      SELECT qa.*, q.title as quiz_title 
      FROM quiz_attempts qa 
      JOIN quizzes q ON qa.quiz_id = q.id
      WHERE qa.user_id = $1
      ORDER BY qa.started_at DESC
      LIMIT 10
    `,
        [userId]
      )
    ).rows;

    // Get access requests
    const accessRequests = (
      await pool.query(
        `
      SELECT ar.*, q.title as quiz_title
      FROM access_requests ar
      JOIN quizzes q ON ar.quiz_id = q.id
      WHERE ar.user_id = $1
      ORDER BY ar.requested_at DESC
      LIMIT 10
    `,
        [userId]
      )
    ).rows;

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

app.put("/api/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { username, password, role, status } = req.body || {};

  try {
    console.log("Updating user:", id, "with data:", req.body);
    const user = await DatabaseService.getUserById(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // For updates that include username, check for duplicates
    if (username && username !== user.username) {
      const existingUser = (
        await pool.query("SELECT id FROM users WHERE username = $1", [username])
      ).rows[0];
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
    let paramIndex = 1;

    if (username) {
      updateFields.push(`username = $${paramIndex++}`);
      params.push(username);
    }

    if (password) {
      // Hash the password before storing
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push(`password = $${paramIndex++}`);
      params.push(hashedPassword);
    }

    if (role) {
      updateFields.push(`role = $${paramIndex++}`);
      params.push(role);
    }

    if (status) {
      updateFields.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    // Always update last_activity
    updateFields.push(`last_activity = $${paramIndex++}`);
    params.push(new Date());

    // Add the user ID at the end of params array
    params.push(id);

    if (updateFields.length > 0) {
      const updateQuery = `UPDATE users SET ${updateFields.join(
        ", "
      )} WHERE id = $${paramIndex}`;
      console.log("Running update query:", updateQuery, "with params:", params);

      const result = await pool.query(updateQuery, params);
      console.log("Update result:", result);

      // Get the updated user
      const updatedUser = await DatabaseService.getUserById(id);
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
    return res.status(500).json({
      success: false,
      message: "Failed to update user: " + error.message,
    });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const user = await DatabaseService.getUserById(id);
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });
  await pool.query("DELETE FROM users WHERE id = $1", [id]);
  return res.json({ success: true });
});

// Quiz attempt endpoints
app.post("/api/attempts", async (req, res) => {
  const { user_id, quiz_id } = req.body || {};

  if (!user_id || !quiz_id) {
    return res
      .status(400)
      .json({ success: false, message: "User ID and Quiz ID are required" });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO quiz_attempts (user_id, quiz_id, started_at) 
      VALUES ($1, $2, $3) RETURNING id
    `,
      [user_id, quiz_id, new Date()]
    );

    res.status(201).json({ success: true, attemptId: result.rows[0].id });
  } catch (error) {
    console.error("Create attempt error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create attempt" });
  }
});

app.post("/api/attempts/:id/answers", async (req, res) => {
  const attemptId = Number(req.params.id);
  const { question_id, user_answer } = req.body || {};

  if (!question_id || user_answer === undefined) {
    return res
      .status(400)
      .json({ success: false, message: "Question ID and answer are required" });
  }

  try {
    const question = (
      await pool.query("SELECT * FROM questions WHERE id = $1", [question_id])
    ).rows[0];

    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    const is_correct =
      String(user_answer).trim().toLowerCase() ===
      String(question.correct_answer).trim().toLowerCase();

    // Get current attempt to update answers
    const attempt = (
      await pool.query("SELECT answers FROM quiz_attempts WHERE id = $1", [
        attemptId,
      ])
    ).rows[0];
    let answers = attempt.answers || {};
    answers[question_id] = {
      user_answer: user_answer,
      is_correct: is_correct,
    };

    // Update the attempt with the new answer
    await pool.query("UPDATE quiz_attempts SET answers = $1 WHERE id = $2", [
      JSON.stringify(answers),
      attemptId,
    ]);

    res.status(201).json({ success: true, is_correct });
  } catch (error) {
    console.error("Answer submission error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to submit answer" });
  }
});

app.post("/api/attempts/:id/complete", async (req, res) => {
  const attemptId = Number(req.params.id);

  try {
    const attempt = (
      await pool.query("SELECT * FROM quiz_attempts WHERE id = $1", [attemptId])
    ).rows[0];

    if (!attempt) {
      return res
        .status(404)
        .json({ success: false, message: "Attempt not found" });
    }

    // Get answers from the attempt
    const answers = attempt.answers || {};
    const answerValues = Object.values(answers);
    const correctCount = answerValues.filter(
      (a) => a.is_correct === true
    ).length;
    const totalQuestions = answerValues.length;
    const percentage = totalQuestions
      ? (correctCount / totalQuestions) * 100
      : 0;
    const passed = percentage >= 60;

    await pool.query(
      `
      UPDATE quiz_attempts 
      SET score = $1, total_questions = $2, completed_at = $3, status = 'completed'
      WHERE id = $4
    `,
      [correctCount, totalQuestions, new Date(), attemptId]
    );

    const updatedAttempt = (
      await pool.query("SELECT * FROM quiz_attempts WHERE id = $1", [attemptId])
    ).rows[0];

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

app.get("/api/users/:id/attempts", async (req, res) => {
  const userId = Number(req.params.id);

  try {
    const attempts = (
      await pool.query(
        `
      SELECT qa.*, q.title as quiz_title 
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      WHERE qa.user_id = $1
      ORDER BY qa.started_at DESC
    `,
        [userId]
      )
    ).rows;

    res.json({ success: true, attempts });
  } catch (error) {
    console.error("Get user attempts error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch user attempts" });
  }
});

// Enhanced stats endpoint for dashboard
app.get("/api/stats", async (_req, res) => {
  try {
    // Basic counts
    const totalQuizzes = (
      await pool.query("SELECT COUNT(*) as count FROM quizzes", [])
    ).rows[0].count;

    const totalUsers = (
      await pool.query("SELECT COUNT(*) as count FROM users", [])
    ).rows[0].count;

    const activeUsers = (
      await pool.query(
        "SELECT COUNT(*) as count FROM users WHERE status = 'active'",
        []
      )
    ).rows[0].count;

    const totalAttempts = (
      await pool.query("SELECT COUNT(*) as count FROM quiz_attempts", [])
    ).rows[0].count;

    const completedAttempts = (
      await pool.query(
        "SELECT COUNT(*) as count FROM quiz_attempts WHERE completed_at IS NOT NULL",
        []
      )
    ).rows[0].count;

    // Calculate success rate (percentage of completed attempts with passing scores)
    const passingAttempts = (
      await pool.query(
        `
        SELECT COUNT(*) as count 
        FROM quiz_attempts 
        WHERE completed_at IS NOT NULL 
        AND (score * 100.0 / total_questions) >= 60
      `,
        []
      )
    ).rows[0].count;

    const successRate =
      completedAttempts > 0
        ? Math.round((passingAttempts / completedAttempts) * 100)
        : 0;

    // Calculate average score
    const avgScoreResult = (
      await pool.query(
        `
        SELECT AVG(score * 100.0 / total_questions) as avgScore 
        FROM quiz_attempts 
        WHERE completed_at IS NOT NULL AND total_questions > 0
      `,
        []
      )
    ).rows[0];

    const averageScore = avgScoreResult.avgscore
      ? Math.round(avgScoreResult.avgscore * 10) / 10
      : 0;

    // Recent activity data
    const recentQuizzes = (
      await pool.query(
        `
        SELECT q.title, q.created_at, u.username as created_by
        FROM quizzes q
        LEFT JOIN users u ON q.created_by = u.id
        ORDER BY q.created_at DESC
        LIMIT 5
      `,
        []
      )
    ).rows;

    const recentAttempts = (
      await pool.query(
        `
        SELECT qa.completed_at, qa.score, qa.total_questions,
               u.username, q.title as quiz_title
        FROM quiz_attempts qa
        JOIN users u ON qa.user_id = u.id
        JOIN quizzes q ON qa.quiz_id = q.id
        WHERE qa.completed_at IS NOT NULL
        ORDER BY qa.completed_at DESC
        LIMIT 5
      `,
        []
      )
    ).rows;

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
        recentAttempts,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
});

// Admin metrics endpoint (requires admin access)
app.get("/api/admin/metrics", async (req, res) => {
  try {
    // User statistics
    const totalUsers = (
      await pool.query("SELECT COUNT(*) as count FROM users", [])
    ).rows[0].count;

    const activeUsers = (
      await pool.query(
        "SELECT COUNT(*) as count FROM users WHERE status = 'active'",
        []
      )
    ).rows[0].count;

    const adminUsers = (
      await pool.query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin'",
        []
      )
    ).rows[0].count;

    // Access requests
    const pendingAccessRequests = (
      await pool.query(
        "SELECT COUNT(*) as count FROM access_requests WHERE status = 'pending'",
        []
      )
    ).rows[0].count;

    // System health calculation (based on recent activity)
    const recentActivity = (
      await pool.query(
        `
        SELECT COUNT(*) as count 
        FROM quiz_attempts 
        WHERE started_at >= NOW() - INTERVAL '7 days'
      `,
        []
      )
    ).rows[0].count;

    const systemHealthScore = Math.min(
      100,
      Math.max(70, 70 + recentActivity * 2)
    );

    // Storage calculation (estimate based on data volume)
    const totalRecords = (
      await pool.query(
        `
        SELECT 
          (SELECT COUNT(*) FROM users) +
          (SELECT COUNT(*) FROM quizzes) +
          (SELECT COUNT(*) FROM questions) +
          (SELECT COUNT(*) FROM quiz_attempts) as total
      `,
        []
      )
    ).rows[0].total;

    const storageUsed = Math.min(100, Math.round((totalRecords / 10000) * 100));

    // Recent user registrations
    const recentUsers = (
      await pool.query(
        `
        SELECT username, role, last_activity 
        FROM users 
        WHERE id > (SELECT MAX(id) - 10 FROM users)
        ORDER BY id DESC
        LIMIT 5
      `,
        []
      )
    ).rows;

    // Quiz activity by day (last 7 days)
    const dailyActivity = (
      await pool.query(
        `
        SELECT 
          DATE(started_at) as date,
          COUNT(*) as attempts
        FROM quiz_attempts 
        WHERE started_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(started_at)
        ORDER BY date DESC
      `,
        []
      )
    ).rows;

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
        dailyActivity,
      },
    });
  } catch (error) {
    console.error("Admin metrics error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch admin metrics" });
  }
});

// Quiz assignments endpoints
app.get("/api/quiz-assignments", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM quiz_assignments");
    const assignments = result.rows;

    res.json({ success: true, assignments });
  } catch (error) {
    console.error("Error getting assignments:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get quiz assignments" });
  }
});

app.post("/api/quiz-assignments", async (req, res) => {
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
    // Check if assignment already exists
    const existingAssignment = (
      await pool.query(
        `
      SELECT * FROM quiz_assignments 
      WHERE quiz_id = $1 AND user_id = $2
    `,
        [quiz_id, user_id]
      )
    ).rows[0];

    if (existingAssignment) {
      await pool.query(
        `
        UPDATE quiz_assignments 
        SET assigned_by = $1, assigned_at = $2 
        WHERE id = $3
      `,
        [assigned_by, new Date(), existingAssignment.id]
      );

      // Get the updated assignment
      const updatedAssignment = (
        await pool.query(
          `
        SELECT * FROM quiz_assignments WHERE id = $1
      `,
          [existingAssignment.id]
        )
      ).rows[0];

      return res.json({ success: true, assignment: updatedAssignment });
    } else {
      const result = await pool.query(
        `
        INSERT INTO quiz_assignments (quiz_id, user_id, assigned_by, assigned_at)
        VALUES ($1, $2, $3, $4) RETURNING *
      `,
        [quiz_id, user_id, assigned_by, new Date()]
      );

      return res.status(201).json({
        success: true,
        assignment: result.rows[0],
      });
    }
  } catch (error) {
    console.error("Quiz assignment error:", error);
    res.status(500).json({ success: false, message: "Failed to assign quiz" });
  }
});

// Bulk quiz assignment endpoint
app.put("/api/quiz-assignments/bulk", async (req, res) => {
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
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      for (const assignment of assignments) {
        const { quizId } = assignment;

        // Check if an assignment already exists for this user and quiz
        const existingAssignment = (
          await client.query(
            `
          SELECT qa.*, q.title as quiz_title, q.description as quiz_description
          FROM quiz_assignments qa
          JOIN quizzes q ON qa.quiz_id = q.id
          WHERE qa.quiz_id = $1 AND qa.user_id = $2
        `,
            [quizId, userId]
          )
        ).rows[0];

        if (existingAssignment) {
          // Update existing assignment
          await client.query(
            `
            UPDATE quiz_assignments 
            SET assigned_by = $1, assigned_at = $2 
            WHERE id = $3
          `,
            [assignedBy, new Date(), existingAssignment.id]
          );

          // Get the updated assignment with quiz details
          const updated = (
            await client.query(
              `
            SELECT qa.*, q.title as quiz_title, q.description as quiz_description,
                   u.username as assigned_by_username
            FROM quiz_assignments qa
            JOIN quizzes q ON qa.quiz_id = q.id
            LEFT JOIN users u ON qa.assigned_by = u.id
            WHERE qa.id = $1
          `,
              [existingAssignment.id]
            )
          ).rows[0];
          updatedAssignments.push(updated);
        } else {
          // Insert new assignment
          const result = await client.query(
            `
            INSERT INTO quiz_assignments (quiz_id, user_id, assigned_by, assigned_at)
            VALUES ($1, $2, $3, $4) RETURNING *
          `,
            [quizId, userId, assignedBy, new Date()]
          );

          // Get the full assignment details with quiz info
          const fullAssignment = (
            await client.query(
              `
            SELECT qa.*, q.title as quiz_title, q.description as quiz_description,
                   u.username as assigned_by_username
            FROM quiz_assignments qa
            JOIN quizzes q ON qa.quiz_id = q.id
            LEFT JOIN users u ON qa.assigned_by = u.id
            WHERE qa.id = $1
          `,
              [result.rows[0].id]
            )
          ).rows[0];

          updatedAssignments.push(fullAssignment);
        }
      }

      await client.query("COMMIT");

      // Also return the updated user with all their assignments
      const userAssignments = (
        await client.query(
          `
        SELECT qa.*, q.title as quiz_title, q.description as quiz_description,
               u.username as assigned_by_username
        FROM quiz_assignments qa
        JOIN quizzes q ON qa.quiz_id = q.id
        LEFT JOIN users u ON qa.assigned_by = u.id
        WHERE qa.user_id = $1
        ORDER BY qa.assigned_at DESC
      `,
          [userId]
        )
      ).rows;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      assignments: updatedAssignments,
      userAssignments: userAssignments,
      message: `Successfully updated ${updatedAssignments.length} quiz assignments`,
    });
  } catch (error) {
    console.error("Bulk assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process bulk assignment update",
    });
  }
});

app.get("/api/users/:id/quiz-assignments", async (req, res) => {
  const userId = Number(req.params.id);

  try {
    const assignments = (
      await pool.query(
        `
      SELECT * FROM quiz_assignments WHERE user_id = $1
    `,
        [userId]
      )
    ).rows;

    res.json({ success: true, assignments });
  } catch (error) {
    console.error("Error getting user assignments:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get user quiz assignments" });
  }
});

app.delete("/api/quiz-assignments/:id", async (req, res) => {
  const assignmentId = Number(req.params.id);

  try {
    const result = await pool.query(
      "DELETE FROM quiz_assignments WHERE id = $1",
      [assignmentId]
    );

    if (result.rowCount === 0) {
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
app.post("/api/access-requests", async (req, res) => {
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
    const existingRequest = (
      await pool.query(
        `
      SELECT * FROM access_requests 
      WHERE quiz_id = $1 AND user_id = $2 AND status = 'pending'
    `,
        [quiz_id, user_id]
      )
    ).rows[0];

    console.log("Existing request check result:", existingRequest);

    if (existingRequest) {
      console.log("Found existing pending request");
      return res.status(409).json({
        success: false,
        message: "You already have a pending request for this quiz",
      });
    }

    console.log("Preparing insert statement...");
    const result = await pool.query(
      `
      INSERT INTO access_requests (quiz_id, user_id, reason, requested_at, status)
      VALUES ($1, $2, $3, $4, 'pending') RETURNING id
    `,
      [quiz_id, user_id, message || null, new Date()]
    );

    console.log("Insert result:", result);
    res.status(201).json({
      success: true,
      requestId: result.rows[0].id,
    });
  } catch (error) {
    console.error("Access request error (detailed):", error);
    console.error("Error stack:", error.stack);
    res
      .status(500)
      .json({ success: false, message: "Failed to create access request" });
  }
});

app.get("/api/access-requests", async (req, res) => {
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
      query += " WHERE ar.status = $1";
      params.push(status);
    }

    query += " ORDER BY ar.requested_at DESC";

    const requests = (await pool.query(query, params)).rows;

    res.json({ success: true, requests });
  } catch (error) {
    console.error("Get access requests error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch access requests" });
  }
});

// Get access requests for a specific user
app.get("/api/users/:id/access-requests", async (req, res) => {
  const userId = Number(req.params.id);
  const { status } = req.query;

  try {
    let query = `
      SELECT ar.*, q.title as quiz_title
      FROM access_requests ar
      JOIN quizzes q ON ar.quiz_id = q.id
      WHERE ar.user_id = $1
    `;

    let params = [userId];
    if (status) {
      query += " AND ar.status = $2";
      params.push(status);
    }

    query += " ORDER BY ar.requested_at DESC";

    const requests = (await pool.query(query, params)).rows;

    res.json({ success: true, requests });
  } catch (error) {
    console.error("Get user access requests error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user access requests",
    });
  }
});

app.put("/api/access-requests/:id", async (req, res) => {
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
    const request = (
      await pool.query("SELECT * FROM access_requests WHERE id = $1", [
        requestId,
      ])
    ).rows[0];

    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Access request not found" });
    }

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Update access request
      await client.query(
        `
        UPDATE access_requests 
        SET status = $1, reviewed_at = $2, reviewed_by = $3
        WHERE id = $4
      `,
        [status, new Date(), resolved_by, requestId]
      );

      // If approved, create quiz assignment
      if (status === "approved") {
        // Check if assignment exists
        const existingAssignment = (
          await client.query(
            `
          SELECT * FROM quiz_assignments 
          WHERE quiz_id = $1 AND user_id = $2
        `,
            [request.quiz_id, request.user_id]
          )
        ).rows[0];

        if (existingAssignment) {
          await client.query(
            `
            UPDATE quiz_assignments 
            SET assigned_by = $1, assigned_at = $2
            WHERE id = $3
          `,
            [resolved_by, new Date(), existingAssignment.id]
          );
        } else {
          await client.query(
            `
            INSERT INTO quiz_assignments (quiz_id, user_id, assigned_by, assigned_at)
            VALUES ($1, $2, $3, $4)
          `,
            [request.quiz_id, request.user_id, resolved_by, new Date()]
          );
        }

        // Update the request with response message if provided
        if (responseMessage) {
          await client.query(
            `
            UPDATE access_requests 
            SET reason = $1 
            WHERE id = $2
          `,
            [responseMessage, requestId]
          );
        }
      }

      await client.query("COMMIT");

      res.json({
        success: true,
        message: "Access request updated successfully",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Update access request error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update access request" });
  }
});

// Database Management Endpoints
// Get all tables with row counts
app.get("/api/database/tables", async (req, res) => {
  try {
    // Get all table names from PostgreSQL information_schema
    const result = await pool.query(`
      SELECT table_name as name
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    // Get row count for each table
    const tablesWithCounts = await Promise.all(
      result.rows.map(async (table) => {
        try {
          const countResult = await pool.query(
            `SELECT COUNT(*) as count FROM ${table.name}`
          );
          const schemaResult = await pool.query(
            `
            SELECT 
              'CREATE TABLE ' || table_name || ' (' ||
              array_to_string(
                array_agg(column_name || ' ' || data_type || 
                  CASE 
                    WHEN character_maximum_length IS NOT NULL 
                    THEN '(' || character_maximum_length || ')' 
                    ELSE '' 
                  END ||
                  CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END
                ), ', '
              ) || ');' as sql
            FROM information_schema.columns 
            WHERE table_name = $1 
            GROUP BY table_name
          `,
            [table.name]
          );

          return {
            name: table.name,
            rowCount: parseInt(countResult.rows[0].count),
            sql: schemaResult.rows[0]?.sql || "Schema not available",
          };
        } catch (error) {
          console.error(`Error getting info for table ${table.name}:`, error);
          return {
            name: table.name,
            rowCount: 0,
            sql: "Error retrieving schema",
          };
        }
      })
    );

    res.json({
      success: true,
      tables: tablesWithCounts,
    });
  } catch (error) {
    console.error("Error getting database tables:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get database tables",
    });
  }
});

// Execute SQL query
app.post("/api/database/query", async (req, res) => {
  const { query } = req.body;

  if (!query || !query.trim()) {
    return res.status(400).json({
      success: false,
      error: "Query is required",
    });
  }

  try {
    const trimmedQuery = query.trim();
    console.log("Executing query:", trimmedQuery);

    // Determine if this is a SELECT query or a modification query
    const isSelectQuery =
      trimmedQuery.toLowerCase().startsWith("select") ||
      trimmedQuery.toLowerCase().startsWith("with") ||
      trimmedQuery.toLowerCase().startsWith("explain");

    if (isSelectQuery) {
      // For SELECT queries, return the data
      const result = await pool.query(trimmedQuery);

      // Get column names
      let columns = [];
      if (result.rows.length > 0) {
        columns = Object.keys(result.rows[0]);
      } else if (result.fields) {
        columns = result.fields.map((field) => field.name);
      }

      res.json({
        success: true,
        data: result.rows,
        columns: columns,
        rowCount: result.rows.length,
        message: `Query returned ${result.rows.length} rows`,
      });
    } else {
      // For modification queries (INSERT, UPDATE, DELETE, CREATE, etc.)
      const result = await pool.query(trimmedQuery);

      res.json({
        success: true,
        rowCount: result.rowCount || 0,
        message: `Query executed successfully. ${
          result.rowCount || 0
        } rows affected.`,
      });
    }
  } catch (error) {
    console.error("SQL Query error:", error);
    res.json({
      success: false,
      error: error.message,
      message: "Query execution failed",
    });
  }
});

// Serve Swagger UI
const swaggerDoc = YAML.load(path.join(__dirname, "swagger.yaml"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

app.listen(PORT, () =>
  console.log(`Backend listening on http://localhost:${PORT}`)
);
