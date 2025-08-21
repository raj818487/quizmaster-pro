const Database = require("better-sqlite3");
const path = require("path");

// Create database file
const dbPath = path.join(__dirname, "quizmaster.db");
const db = new Database(dbPath);

console.log("Creating database tables...");

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create quizzes table
db.exec(`
  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )
`);

// Create questions table
db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    correct_answer TEXT NOT NULL,
    points INTEGER DEFAULT 1,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
  )
`);

// Create quiz_attempts table
db.exec(`
  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    quiz_id INTEGER NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    score INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
  )
`);

// Create user_answers table
db.exec(`
  CREATE TABLE IF NOT EXISTS user_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    answer TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
  )
`);

// Insert default admin user
const insertUser = db.prepare(`
  INSERT OR REPLACE INTO users (id, username, password, role) 
  VALUES (?, ?, ?, ?)
`);

insertUser.run(1, "admin", "admin123", "admin");
insertUser.run(2, "user1", "user123", "user");

// Insert default quizzes
const insertQuiz = db.prepare(`
  INSERT OR REPLACE INTO quizzes (id, title, description, created_by) 
  VALUES (?, ?, ?, ?)
`);

insertQuiz.run(1, "JavaScript Basics", "Test your JS knowledge", 1);
insertQuiz.run(2, "Angular Fundamentals", "Angular basics", 1);

// Insert default questions
const insertQuestion = db.prepare(`
  INSERT OR REPLACE INTO questions (id, quiz_id, text, type, correct_answer, points) 
  VALUES (?, ?, ?, ?, ?, ?)
`);

insertQuestion.run(
  1,
  1,
  "What is JavaScript?",
  "text",
  "A programming language",
  1
);
insertQuestion.run(
  2,
  1,
  "What does DOM stand for?",
  "text",
  "Document Object Model",
  1
);
insertQuestion.run(3, 2, "What is Angular?", "text", "A web framework", 1);
insertQuestion.run(
  4,
  2,
  "What is a component in Angular?",
  "text",
  "A reusable piece of UI",
  1
);

console.log("Database created successfully!");
console.log("Database location:", dbPath);

// Show created data
console.log("\nUsers:");
const users = db.prepare("SELECT * FROM users").all();
users.forEach((user) => console.log(`- ${user.username} (${user.role})`));

console.log("\nQuizzes:");
const quizzes = db.prepare("SELECT * FROM quizzes").all();
quizzes.forEach((quiz) => console.log(`- ${quiz.title}: ${quiz.description}`));

db.close();
