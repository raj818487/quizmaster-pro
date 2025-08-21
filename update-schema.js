const Database = require("better-sqlite3");
const path = require("path");

// Update database schema for enhanced quiz functionality
const dbPath = path.join(__dirname, "quizmaster.db");
const db = new Database(dbPath);

console.log("Updating database schema...");

// Add columns to questions table for different question types
try {
  db.exec(`
    ALTER TABLE questions ADD COLUMN options TEXT;
  `);
  console.log("Added options column to questions table");
} catch (e) {
  console.log("Options column already exists");
}

try {
  db.exec(`
    ALTER TABLE quizzes ADD COLUMN is_public BOOLEAN DEFAULT 1;
  `);
  console.log("Added is_public column to quizzes table");
} catch (e) {
  console.log("is_public column already exists");
}

try {
  db.exec(`
    ALTER TABLE quizzes ADD COLUMN time_limit INTEGER DEFAULT 0;
  `);
  console.log("Added time_limit column to quizzes table");
} catch (e) {
  console.log("time_limit column already exists");
}

// Create quiz_permissions table
db.exec(`
  CREATE TABLE IF NOT EXISTS quiz_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    permission_type TEXT DEFAULT 'view',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(quiz_id, user_id)
  )
`);

console.log("Database schema updated successfully!");

// Update existing questions to have proper format
const updateQuestion1 = db.prepare(`
  UPDATE questions SET 
    type = 'multiple_choice',
    options = '["A programming language", "A markup language", "A database", "An operating system"]'
  WHERE id = 1
`);

const updateQuestion2 = db.prepare(`
  UPDATE questions SET 
    type = 'multiple_choice',
    options = '["Document Object Model", "Data Object Management", "Dynamic Object Model", "Database Object Model"]'
  WHERE id = 2
`);

const updateQuestion3 = db.prepare(`
  UPDATE questions SET 
    type = 'multiple_choice',
    options = '["A web framework", "A programming language", "A database", "A text editor"]'
  WHERE id = 3
`);

const updateQuestion4 = db.prepare(`
  UPDATE questions SET 
    type = 'text'
  WHERE id = 4
`);

updateQuestion1.run();
updateQuestion2.run();
updateQuestion3.run();
updateQuestion4.run();

console.log("Updated existing questions with proper types and options");

db.close();
console.log("Schema update completed!");
