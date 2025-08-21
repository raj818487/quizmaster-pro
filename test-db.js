const Database = require("better-sqlite3");
const path = require("path");

// Test database connection
const dbPath = path.join(__dirname, "quizmaster.db");
const db = new Database(dbPath);

console.log("Testing database connection...");

// Test users
console.log("\n--- USERS ---");
const users = db.prepare("SELECT * FROM users").all();
users.forEach((user) => {
  console.log(`ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
});

// Test quizzes
console.log("\n--- QUIZZES ---");
const quizzes = db.prepare("SELECT * FROM quizzes").all();
quizzes.forEach((quiz) => {
  console.log(
    `ID: ${quiz.id}, Title: ${quiz.title}, Description: ${quiz.description}`
  );
});

// Test questions
console.log("\n--- QUESTIONS ---");
const questions = db.prepare("SELECT * FROM questions").all();
questions.forEach((question) => {
  console.log(
    `ID: ${question.id}, Quiz ID: ${question.quiz_id}, Text: ${question.text}`
  );
});

// Test login function
console.log("\n--- LOGIN TEST ---");
const testUser = db
  .prepare("SELECT * FROM users WHERE username = ? AND password = ?")
  .get("admin", "admin123");
if (testUser) {
  console.log("✅ Login test successful:", {
    id: testUser.id,
    username: testUser.username,
    role: testUser.role,
  });
} else {
  console.log("❌ Login test failed");
}

db.close();
console.log("\nDatabase test completed!");
