const bcrypt = require("bcrypt");

// PostgreSQL database configuration
require("dotenv").config();
const { Pool } = require("pg");

// Database configuration
const dbConfig = {
  development: {
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "quizmaster_dev",
    password: process.env.DB_PASSWORD || "",
    port: process.env.DB_PORT || 5432,
  },
  production: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  },
};

// Create connection pool
const isProduction = process.env.NODE_ENV === "production";
const config = isProduction ? dbConfig.production : dbConfig.development;

const pool = new Pool(config);

// Test connection
pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL connection error:", err);
});

// Database helper functions with proper async/await and parameterized queries
class DatabaseService {
  // User operations
  static async getUsers() {
    const result = await pool.query("SELECT * FROM users ORDER BY id");
    return result.rows;
  }

  static async getAllUsers() {
    const result = await pool.query(
      "SELECT id, username, role, status, last_activity FROM users ORDER BY id"
    );
    return result.rows;
  }

  static async getUserById(id) {
    const result = await pool.query(
      "SELECT id, username, role, status, last_activity FROM users WHERE id = $1",
      [id]
    );
    console.log("Retrieved user by ID:", id, result.rows[0]);
    return result.rows[0];
  }

  static async getUserByUsername(username) {
    const result = await pool.query(
      "SELECT id, username, password, role, status, last_activity FROM users WHERE username = $1",
      [username]
    );
    return result.rows[0];
  }

  static async createUser(username, password, role = "user") {
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (username, password, role, status, created_at, last_activity) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id",
      [username, hashedPassword, role, "active"]
    );
    return result.rows[0].id;
  }

  static async updateUserActivity(userId) {
    await pool.query("UPDATE users SET last_activity = NOW() WHERE id = $1", [
      userId,
    ]);
  }

  // Quiz operations
  static async getQuizzes() {
    const result = await pool.query("SELECT * FROM quizzes ORDER BY id");
    return result.rows;
  }

  static async getAllQuizzes() {
    const result = await pool.query("SELECT * FROM quizzes ORDER BY id");
    return result.rows;
  }

  static async getPublicQuizzes() {
    const result = await pool.query(
      "SELECT * FROM quizzes WHERE is_public = true ORDER BY id"
    );
    return result.rows;
  }

  static async getQuizById(id) {
    const result = await pool.query("SELECT * FROM quizzes WHERE id = $1", [
      id,
    ]);
    return result.rows[0];
  }

  static async createQuiz(
    title,
    description,
    timeLimit,
    passingScore,
    isActive = true
  ) {
    const result = await pool.query(
      "INSERT INTO quizzes (title, description, time_limit, passing_score, is_active, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *",
      [title, description, timeLimit, passingScore, isActive]
    );
    return result.rows[0];
  }

  static async updateQuiz(id, updates) {
    const { title, description, is_public, time_limit } = updates;
    const result = await pool.query(
      "UPDATE quizzes SET title = $1, description = $2, is_public = $3, time_limit = $4 WHERE id = $5 RETURNING *",
      [title, description, is_public, time_limit, id]
    );
    return result.rows[0];
  }

  static async deleteQuiz(id) {
    await pool.query("DELETE FROM quizzes WHERE id = $1", [id]);
  }

  static async createQuizWithQuestions(quizData) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Create quiz
      const quizResult = await client.query(
        "INSERT INTO quizzes (title, description, created_by, is_public, time_limit, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id",
        [
          quizData.title,
          quizData.description,
          quizData.created_by,
          quizData.is_public,
          quizData.time_limit,
        ]
      );

      const quizId = quizResult.rows[0].id;

      // Create questions if provided
      if (
        quizData.questions &&
        Array.isArray(quizData.questions) &&
        quizData.questions.length > 0
      ) {
        for (const q of quizData.questions) {
          await client.query(
            "INSERT INTO questions (quiz_id, question, options, correct_answer, points) VALUES ($1, $2, $3, $4, $5)",
            [
              quizId,
              q.question || q.text,
              JSON.stringify(q.options),
              q.correct_answer,
              q.points || 1,
            ]
          );
        }
      }

      await client.query("COMMIT");
      return quizId;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Question operations
  static async getQuestionsByQuizId(quizId) {
    const result = await pool.query(
      "SELECT * FROM questions WHERE quiz_id = $1 ORDER BY id",
      [quizId]
    );
    return result.rows;
  }

  static async createQuestion(
    quizId,
    question,
    options,
    correctAnswer,
    points = 1
  ) {
    const result = await pool.query(
      "INSERT INTO questions (quiz_id, question, options, correct_answer, points) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [quizId, question, JSON.stringify(options), correctAnswer, points]
    );
    return result.rows[0];
  }

  static async updateQuestion(id, question, options, correctAnswer, points) {
    const result = await pool.query(
      "UPDATE questions SET question = $1, options = $2, correct_answer = $3, points = $4 WHERE id = $5 RETURNING *",
      [question, JSON.stringify(options), correctAnswer, points, id]
    );
    return result.rows[0];
  }

  static async deleteQuestion(id) {
    await pool.query("DELETE FROM questions WHERE id = $1", [id]);
  }

  // Quiz attempts
  static async createQuizAttempt(userId, quizId) {
    const result = await pool.query(
      "INSERT INTO quiz_attempts (user_id, quiz_id, started_at, status) VALUES ($1, $2, NOW(), $3) RETURNING *",
      [userId, quizId, "in_progress"]
    );
    return result.rows[0];
  }

  static async getQuizAttempt(id) {
    const result = await pool.query(
      "SELECT * FROM quiz_attempts WHERE id = $1",
      [id]
    );
    return result.rows[0];
  }

  static async completeQuizAttempt(attemptId, answers, score, totalQuestions) {
    const result = await pool.query(
      "UPDATE quiz_attempts SET answers = $1, score = $2, total_questions = $3, completed_at = NOW(), status = $4 WHERE id = $5 RETURNING *",
      [JSON.stringify(answers), score, totalQuestions, "completed", attemptId]
    );
    return result.rows[0];
  }

  // Quiz assignments and access
  static async getQuizAssignments(userId) {
    const result = await pool.query(
      "SELECT qa.*, q.title, q.description FROM quiz_assignments qa JOIN quizzes q ON qa.quiz_id = q.id WHERE qa.user_id = $1",
      [userId]
    );
    return result.rows;
  }

  static async createQuizAssignment(userId, quizId, assignedBy) {
    const result = await pool.query(
      "INSERT INTO quiz_assignments (user_id, quiz_id, assigned_by, assigned_at) VALUES ($1, $2, $3, NOW()) RETURNING *",
      [userId, quizId, assignedBy]
    );
    return result.rows[0];
  }

  static async getQuizAccess(userId, quizId) {
    const result = await pool.query(
      "SELECT * FROM quiz_access WHERE user_id = $1 AND quiz_id = $2",
      [userId, quizId]
    );
    return result.rows[0];
  }

  static async createQuizAccess(userId, quizId, grantedBy) {
    const result = await pool.query(
      "INSERT INTO quiz_access (user_id, quiz_id, granted_by, granted_at) VALUES ($1, $2, $3, NOW()) RETURNING *",
      [userId, quizId, grantedBy]
    );
    return result.rows[0];
  }

  // Access requests
  static async createAccessRequest(userId, quizId, reason) {
    const result = await pool.query(
      "INSERT INTO access_requests (user_id, quiz_id, reason, status, requested_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *",
      [userId, quizId, reason, "pending"]
    );
    return result.rows[0];
  }

  static async getAccessRequests() {
    const result = await pool.query(`
      SELECT ar.*, u.username, q.title as quiz_title 
      FROM access_requests ar 
      JOIN users u ON ar.user_id = u.id 
      JOIN quizzes q ON ar.quiz_id = q.id 
      ORDER BY ar.requested_at DESC
    `);
    return result.rows;
  }

  static async updateAccessRequestStatus(id, status, reviewedBy) {
    const result = await pool.query(
      "UPDATE access_requests SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3 RETURNING *",
      [status, reviewedBy, id]
    );
    return result.rows[0];
  }

  // Database management operations
  static async getTables() {
    const result = await pool.query(`
      SELECT table_name as name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    // Get row counts for each table
    const tablesWithCounts = await Promise.all(
      result.rows.map(async (table) => {
        try {
          const countResult = await pool.query(
            `SELECT COUNT(*) as count FROM ${table.name}`
          );
          return {
            name: table.name,
            rowCount: parseInt(countResult.rows[0].count),
          };
        } catch (error) {
          return {
            name: table.name,
            rowCount: 0,
          };
        }
      })
    );

    return tablesWithCounts;
  }

  static async getTableSchema(tableName) {
    const result = await pool.query(
      `
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `,
      [tableName]
    );
    return result.rows;
  }

  static async executeQuery(query) {
    // Security: Only allow SELECT statements for safety
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery.startsWith("select")) {
      throw new Error("Only SELECT queries are allowed for security reasons");
    }

    const result = await pool.query(query);
    return {
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields?.map((field) => field.name) || [],
    };
  }

  // Generic query execution (for admin use)
  static async executeAdminQuery(query) {
    const result = await pool.query(query);
    return {
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields?.map((field) => field.name) || [],
    };
  }
}

module.exports = { pool, DatabaseService };
