/**
 * Update Schema Script for QuizMaster Pro
 *
 * This script adds the 'status' and 'last_activity' columns to the users table
 * if they don't already exist.
 */

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Database path - check both root and backend directories
const rootDbPath = path.join(__dirname, "quizmaster.db");
const backendDbPath = path.join(__dirname, "backend", "quizmaster.db");

// Determine which database path to use
const dbPath = fs.existsSync(backendDbPath) ? backendDbPath : rootDbPath;

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error(`Database file doesn't exist at ${dbPath}`);
  process.exit(1);
}

// Connect to the database
const db = new Database(dbPath);

console.log("Starting schema update...");

// Function to check if column exists in a table
function columnExists(table, column) {
  const result = db.prepare(`PRAGMA table_info(${table})`).all();
  return result.some((col) => col.name === column);
}

// Begin transaction
db.prepare("BEGIN TRANSACTION").run();

try {
  // Check and add 'status' column to users table
  if (!columnExists("users", "status")) {
    console.log("Adding 'status' column to users table...");
    db.prepare(
      "ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'"
    ).run();
    console.log("'status' column added successfully");
  } else {
    console.log("'status' column already exists in users table");
  }

  // Check and add 'last_activity' column to users table
  if (!columnExists("users", "last_activity")) {
    console.log("Adding 'last_activity' column to users table...");
    db.prepare("ALTER TABLE users ADD COLUMN last_activity TEXT").run();
    console.log("'last_activity' column added successfully");
  } else {
    console.log("'last_activity' column already exists in users table");
  }

  // Commit changes
  db.prepare("COMMIT").run();
  console.log("Schema update completed successfully");
} catch (error) {
  // Rollback on error
  db.prepare("ROLLBACK").run();
  console.error("Error updating schema:", error);
  process.exit(1);
} finally {
  // Close database connection
  db.close();
}
