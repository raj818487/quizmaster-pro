require("dotenv").config();
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
let libsqlClient = null;
try {
  libsqlClient = require("@libsql/client");
} catch (_) {
  // optional; continue without it
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  // Use hash route to avoid server-side redirects during dev
  mainWindow.loadURL("http://localhost:4200/#/auth");
}

app.on("ready", () => {
  createWindow();
  // DB mode: Turso/libsql if env set, else local sqlite3
  const TURSO_URL = process.env.TURSO_URL;
  const TURSO_TOKEN = process.env.TURSO_TOKEN;

  let dbMode = "local";
  let db = null;
  let turso = null;

  if (libsqlClient && TURSO_URL && TURSO_TOKEN) {
    dbMode = "turso";
    turso = libsqlClient.createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    });
  } else {
    db = new sqlite3.Database(
      path.join(app.getPath("userData"), "quizmaster.db")
    );
  }
  console.log("[DB] Mode:", dbMode, "| TURSO_URL set:", Boolean(TURSO_URL));

  const runLocal = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes, lastID: this.lastID });
      });
    });
  const allLocal = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });
  const execTurso = async (sql, params = []) =>
    turso.execute({ sql, args: params });

  const ensureSchema = async () => {
    const stmts = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        config TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER,
        text TEXT,
        type TEXT,
        options TEXT,
        correct TEXT,
        FOREIGN KEY(quiz_id) REFERENCES quizzes(id)
      )`,
      `CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        quiz_id INTEGER,
        answers TEXT,
        score INTEGER,
        submitted_at TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(quiz_id) REFERENCES quizzes(id)
      )`,
      `CREATE TABLE IF NOT EXISTS meta (
         key TEXT PRIMARY KEY,
         value TEXT
       )`,
    ];
    if (dbMode === "turso") {
      for (const s of stmts) await execTurso(s);
    } else {
      await new Promise((resolve) => db.serialize(resolve));
      for (const s of stmts) await runLocal(s);
    }
  };

  const seedIfEmpty = async () => {
    if (dbMode === "turso") {
      const res = await execTurso("SELECT COUNT(1) as cnt FROM users");
      const first = res.rows?.[0] || {};
      const cnt = first.cnt ?? first["COUNT(1)"] ?? 0;
      if (Number(cnt) === 0) {
        await execTurso(
          "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
          ["admin", "admin123", "admin"]
        );
        await execTurso(
          "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
          ["user1", "user123", "user"]
        );
      }
    } else {
      const row = await allLocal("SELECT COUNT(1) as cnt FROM users");
      const cnt = row?.[0]?.cnt ?? 0;
      if (Number(cnt) === 0) {
        await runLocal(
          "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
          ["admin", "admin123", "admin"]
        );
        await runLocal(
          "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
          ["user1", "user123", "user"]
        );
      }
    }
  };

  // Removed auto init. Use IPC actions below to initialize/backup/restore/migrate.
  // IPC handlers for CRUD operations
  ipcMain.handle("execute-query", async (event, query, params) => {
    try {
      if (dbMode === "turso") {
        const res = await execTurso(query, params);
        if (query.trim().toUpperCase().startsWith("SELECT")) {
          return res.rows ?? [];
        } else {
          return {
            changes: res.rowsAffected ?? 0,
            lastInsertRowid: res.lastInsertRowid,
          };
        }
      } else {
        if (query.trim().toUpperCase().startsWith("SELECT")) {
          return await allLocal(query, params);
        } else {
          return await runLocal(query, params);
        }
      }
    } catch (e) {
      console.error("DB error", e);
      throw e;
    }
  });

  // --- DB management helpers ---
  const listTables = async () => {
    const sql =
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name";
    if (dbMode === "turso") {
      const res = await execTurso(sql);
      return res.rows?.map((r) => r.name || r.NAME) || [];
    } else {
      const rows = await allLocal(sql);
      return rows.map((r) => r.name);
    }
  };

  const getMeta = async (key) => {
    try {
      const sql = "SELECT value FROM meta WHERE key = ?";
      if (dbMode === "turso") {
        const res = await execTurso(sql, [key]);
        return res.rows?.[0]?.value || null;
      }
      const rows = await allLocal(sql, [key]);
      return rows?.[0]?.value || null;
    } catch {
      return null;
    }
  };

  const setMeta = async (key, value) => {
    const sql = "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)";
    if (dbMode === "turso") return execTurso(sql, [key, value]);
    return runLocal(sql, [key, value]);
  };

  ipcMain.handle("db-get-status", async () => {
    try {
      // ensure schema for meta visibility, but do not seed
      await ensureSchema();
      const tables = await listTables();
      const initialized = (await getMeta("initialized")) === "1";
      const schemaVersion = Number((await getMeta("schema_version")) || 0);
      return { success: true, dbMode, initialized, schemaVersion, tables };
    } catch (e) {
      return { success: false, message: String(e) };
    }
  });

  ipcMain.handle("db-init", async (_evt, { seed = true } = {}) => {
    try {
      await ensureSchema();
      if (seed) await seedIfEmpty();
      await setMeta("initialized", "1");
      if (!(await getMeta("schema_version")))
        await setMeta("schema_version", "1");
      return { success: true };
    } catch (e) {
      return { success: false, message: String(e) };
    }
  });

  ipcMain.handle("db-backup", async () => {
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const backupDir = path.join(app.getPath("userData"), "backups");
      if (!fs.existsSync(backupDir))
        fs.mkdirSync(backupDir, { recursive: true });
      if (dbMode === "local") {
        const dbPath = path.join(app.getPath("userData"), "quizmaster.db");
        const backupPath = path.join(backupDir, `quizmaster-${ts}.sqlite`);
        fs.copyFileSync(dbPath, backupPath);
        return { success: true, path: backupPath };
      } else {
        const dump = {};
        const tables = ["users", "quizzes", "questions", "submissions"];
        for (const t of tables) {
          const res = await execTurso(`SELECT * FROM ${t}`);
          dump[t] = res.rows || [];
        }
        const backupPath = path.join(backupDir, `quizmaster-${ts}.json`);
        fs.writeFileSync(backupPath, JSON.stringify(dump, null, 2), "utf-8");
        return { success: true, path: backupPath };
      }
    } catch (e) {
      return { success: false, message: String(e) };
    }
  });

  ipcMain.handle("db-restore", async (_evt, filePath) => {
    try {
      if (!filePath) {
        const res = await dialog.showOpenDialog({ properties: ["openFile"] });
        if (res.canceled || !res.filePaths?.[0])
          return { success: false, message: "Cancelled" };
        filePath = res.filePaths[0];
      }
      if (dbMode === "local") {
        const dbPath = path.join(app.getPath("userData"), "quizmaster.db");
        fs.copyFileSync(filePath, dbPath);
        return { success: true };
      } else {
        const text = fs.readFileSync(filePath, "utf-8");
        const dump = JSON.parse(text);
        const tables = ["submissions", "questions", "quizzes", "users"];
        for (const t of tables) await execTurso(`DELETE FROM ${t}`);
        for (const row of dump.users || []) {
          await execTurso(
            "INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)",
            [row.id, row.username, row.password, row.role]
          );
        }
        for (const row of dump.quizzes || []) {
          await execTurso(
            "INSERT INTO quizzes (id, title, description, config) VALUES (?, ?, ?, ?)",
            [row.id, row.title, row.description, row.config]
          );
        }
        for (const row of dump.questions || []) {
          await execTurso(
            "INSERT INTO questions (id, quiz_id, text, type, options, correct) VALUES (?, ?, ?, ?, ?, ?)",
            [row.id, row.quiz_id, row.text, row.type, row.options, row.correct]
          );
        }
        for (const row of dump.submissions || []) {
          await execTurso(
            "INSERT INTO submissions (id, user_id, quiz_id, answers, score, submitted_at) VALUES (?, ?, ?, ?, ?, ?)",
            [
              row.id,
              row.user_id,
              row.quiz_id,
              row.answers,
              row.score,
              row.submitted_at,
            ]
          );
        }
        return { success: true };
      }
    } catch (e) {
      return { success: false, message: String(e) };
    }
  });

  ipcMain.handle("db-migrate", async () => {
    try {
      const current = Number((await getMeta("schema_version")) || 0);
      const target = 1; // bump when migrations are added
      if (current >= target) return { success: true, message: "Up to date" };
      // future migration steps go here
      await setMeta("schema_version", String(target));
      return { success: true, message: "Migrated" };
    } catch (e) {
      return { success: false, message: String(e) };
    }
  });
  ipcMain.on("get-quizzes", (event) => {
    db.all("SELECT * FROM quizzes", (err, rows) => {
      event.reply("quizzes", rows);
    });
  });

  ipcMain.on("get-questions", (event, quizId) => {
    db.all(
      "SELECT * FROM questions WHERE quiz_id = ?",
      [quizId],
      (err, rows) => {
        event.reply("questions", rows);
      }
    );
  });

  ipcMain.on("submit-quiz", (event, submission) => {
    const { user_id, quiz_id, answers, score, submitted_at } = submission;
    db.run(
      "INSERT INTO submissions (user_id, quiz_id, answers, score, submitted_at) VALUES (?, ?, ?, ?, ?)",
      [user_id, quiz_id, JSON.stringify(answers), score, submitted_at],
      function (err) {
        event.reply("quiz-result", { success: !err, id: this.lastID });
      }
    );
  });

  ipcMain.on("login", (event, { username, password }) => {
    db.get(
      "SELECT * FROM users WHERE username = ? AND password = ?",
      [username, password],
      (err, row) => {
        event.reply("login-response", row || null);
      }
    );
  });

  ipcMain.on("register", (event, { username, password, role }) => {
    db.run(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      [username, password, role],
      function (err) {
        event.reply("register-response", { success: !err, id: this.lastID });
      }
    );
  });

  // Add more handlers for admin CRUD as needed
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
