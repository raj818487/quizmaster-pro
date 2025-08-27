// Simple in-memory mock DB for demo purposes
// Persists across invocations during the same server instance using global.

function initDb() {
  return {
    users: [
      { id: 1, username: "admin", password: "admin", role: "admin" },
      { id: 2, username: "user", password: "user", role: "user" },
    ],
    nextUserId: 3,
    quizzes: [],
  };
}

export function getDb() {
  if (!global.__QUIZMASTER_DB) {
    global.__QUIZMASTER_DB = initDb();
  }
  return global.__QUIZMASTER_DB;
}
