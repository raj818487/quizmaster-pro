// PostgreSQL schema initialization
require("dotenv").config();
const { pool } = require("./database");

async function initializeDatabase() {
  try {
    console.log("🚀 Initializing PostgreSQL database schema...");

    // Drop existing tables if they exist (for clean migration)
    await pool.query(`
      DROP TABLE IF EXISTS access_requests CASCADE;
      DROP TABLE IF EXISTS quiz_access CASCADE;
      DROP TABLE IF EXISTS quiz_assignments CASCADE;
      DROP TABLE IF EXISTS quiz_attempts CASCADE;
      DROP TABLE IF EXISTS questions CASCADE;
      DROP TABLE IF EXISTS quizzes CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // Create users table
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create quizzes table
    await pool.query(`
      CREATE TABLE quizzes (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        time_limit INTEGER DEFAULT 30,
        passing_score INTEGER DEFAULT 70,
        is_active BOOLEAN DEFAULT true,
        is_public BOOLEAN DEFAULT false,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create questions table
    await pool.query(`
      CREATE TABLE questions (
        id SERIAL PRIMARY KEY,
        quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        options JSONB NOT NULL,
        correct_answer TEXT NOT NULL,
        points INTEGER DEFAULT 1
      )
    `);

    // Create quiz_attempts table
    await pool.query(`
      CREATE TABLE quiz_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
        answers JSONB,
        score INTEGER,
        total_questions INTEGER,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'in_progress'
      )
    `);

    // Create quiz_assignments table
    await pool.query(`
      CREATE TABLE quiz_assignments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
        assigned_by INTEGER REFERENCES users(id),
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, quiz_id)
      )
    `);

    // Create quiz_access table
    await pool.query(`
      CREATE TABLE quiz_access (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
        granted_by INTEGER REFERENCES users(id),
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, quiz_id)
      )
    `);

    // Create access_requests table
    await pool.query(`
      CREATE TABLE access_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX idx_users_username ON users(username);
      CREATE INDEX idx_quiz_attempts_user_id ON quiz_attempts(user_id);
      CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
      CREATE INDEX idx_quiz_assignments_user_id ON quiz_assignments(user_id);
      CREATE INDEX idx_quiz_access_user_id ON quiz_access(user_id);
      CREATE INDEX idx_access_requests_status ON access_requests(status);
      CREATE INDEX idx_questions_quiz_id ON questions(quiz_id);
    `);

    console.log("✅ Database schema created successfully!");

    // Insert default admin user
    await createDefaultAdmin();

    // Insert sample data
    await insertSampleData();

    console.log("🎉 Database initialization completed!");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}

async function createDefaultAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      ["admin"]
    );

    if (existingAdmin.rows.length === 0) {
      // Create default admin user (password: admin123)
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash("admin123", 10);

      await pool.query(
        "INSERT INTO users (username, password, role, status) VALUES ($1, $2, $3, $4)",
        ["admin", hashedPassword, "admin", "active"]
      );

      console.log(
        "✅ Default admin user created (username: admin, password: admin123)"
      );
    } else {
      console.log("ℹ️ Admin user already exists");
    }
  } catch (error) {
    console.error("❌ Failed to create admin user:", error);
  }
}

async function insertSampleData() {
  try {
    // Check if sample data already exists
    const existingQuizzes = await pool.query(
      "SELECT COUNT(*) as count FROM quizzes"
    );

    if (parseInt(existingQuizzes.rows[0].count) === 0) {
      // Get admin user ID for created_by
      const adminUser = await pool.query(
        "SELECT id FROM users WHERE username = $1",
        ["admin"]
      );
      const adminId = adminUser.rows[0]?.id || 1;

      // Insert sample quiz
      const quizResult = await pool.query(
        `
        INSERT INTO quizzes (title, description, time_limit, passing_score, is_active, is_public, created_by) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
      `,
        [
          "Sample Quiz",
          "A sample quiz to get you started",
          15,
          70,
          true,
          true,
          adminId,
        ]
      );

      const quizId = quizResult.rows[0].id;

      // Insert sample questions
      const questions = [
        {
          question: "What is the capital of France?",
          options: ["London", "Berlin", "Paris", "Madrid"],
          correct_answer: "Paris",
        },
        {
          question: "Which planet is known as the Red Planet?",
          options: ["Venus", "Mars", "Jupiter", "Saturn"],
          correct_answer: "Mars",
        },
        {
          question: "What is 2 + 2?",
          options: ["3", "4", "5", "6"],
          correct_answer: "4",
        },
      ];

      for (const q of questions) {
        await pool.query(
          "INSERT INTO questions (quiz_id, question, options, correct_answer, points) VALUES ($1, $2, $3, $4, $5)",
          [quizId, q.question, JSON.stringify(q.options), q.correct_answer, 1]
        );
      }

      console.log("✅ Sample quiz and questions created");
    } else {
      console.log("ℹ️ Sample data already exists");
    }
  } catch (error) {
    console.error("❌ Failed to insert sample data:", error);
  }
}

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log("Database initialization completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Database initialization failed:", error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
