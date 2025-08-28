// Dummy Data Generator for QuizMaster Pro PostgreSQL Database
require("dotenv").config();
const { pool } = require("../database");
const bcrypt = require("bcrypt");

async function generateDummyData() {
  try {
    console.log("🚀 Starting dummy data generation...");

    // Clear existing data (optional - comment out to preserve existing data)
    await clearExistingData();

    // Generate dummy data
    await createDummyUsers();
    await createDummyQuizzes();
    await createDummyQuestions();
    await createDummyQuizAssignments();
    await createDummyQuizAttempts();
    await createDummyAccessRequests();

    console.log("🎉 Dummy data generation completed successfully!");
    console.log("\n📊 Summary:");
    await printDataSummary();
  } catch (error) {
    console.error("❌ Error generating dummy data:", error);
    throw error;
  }
}

async function clearExistingData() {
  console.log("🧹 Clearing existing data...");

  // Delete in reverse dependency order
  await pool.query("DELETE FROM access_requests");
  await pool.query("DELETE FROM quiz_access");
  await pool.query("DELETE FROM quiz_assignments");
  await pool.query("DELETE FROM quiz_attempts");
  await pool.query("DELETE FROM questions");
  await pool.query("DELETE FROM quizzes");
  await pool.query("DELETE FROM users WHERE username != 'admin'"); // Keep admin user

  // Reset sequences
  await pool.query("ALTER SEQUENCE users_id_seq RESTART WITH 2"); // Start from 2 to keep admin as 1
  await pool.query("ALTER SEQUENCE quizzes_id_seq RESTART WITH 1");
  await pool.query("ALTER SEQUENCE questions_id_seq RESTART WITH 1");
  await pool.query("ALTER SEQUENCE quiz_attempts_id_seq RESTART WITH 1");
  await pool.query("ALTER SEQUENCE quiz_assignments_id_seq RESTART WITH 1");
  await pool.query("ALTER SEQUENCE quiz_access_id_seq RESTART WITH 1");
  await pool.query("ALTER SEQUENCE access_requests_id_seq RESTART WITH 1");

  console.log("✅ Existing data cleared");
}

async function createDummyUsers() {
  console.log("👥 Creating dummy users...");

  const users = [
    {
      username: "john_doe",
      password: "password123",
      role: "user",
      status: "active",
    },
    {
      username: "jane_smith",
      password: "password123",
      role: "user",
      status: "active",
    },
    {
      username: "mike_wilson",
      password: "password123",
      role: "user",
      status: "active",
    },
    {
      username: "sarah_davis",
      password: "password123",
      role: "user",
      status: "active",
    },
    {
      username: "bob_johnson",
      password: "password123",
      role: "user",
      status: "suspended",
    },
    {
      username: "alice_brown",
      password: "password123",
      role: "user",
      status: "active",
    },
    {
      username: "charlie_white",
      password: "password123",
      role: "user",
      status: "inactive",
    },
    {
      username: "diana_green",
      password: "password123",
      role: "admin",
      status: "active",
    },
    {
      username: "edward_black",
      password: "password123",
      role: "user",
      status: "active",
    },
    {
      username: "fiona_red",
      password: "password123",
      role: "user",
      status: "active",
    },
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await pool.query(
      "INSERT INTO users (username, password, role, status, created_at, last_activity) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        user.username,
        hashedPassword,
        user.role,
        user.status,
        new Date(),
        new Date(),
      ]
    );
  }

  console.log(`✅ Created ${users.length} dummy users`);
}

async function createDummyQuizzes() {
  console.log("📝 Creating dummy quizzes...");

  const quizzes = [
    {
      title: "JavaScript Fundamentals",
      description: "Test your knowledge of JavaScript basics",
      time_limit: 30,
      passing_score: 70,
      is_active: true,
      is_public: true,
      created_by: 1, // admin
    },
    {
      title: "React Components",
      description: "Understanding React component lifecycle and hooks",
      time_limit: 45,
      passing_score: 75,
      is_active: true,
      is_public: true,
      created_by: 8, // diana_green (admin)
    },
    {
      title: "Node.js Backend",
      description: "Server-side JavaScript with Node.js",
      time_limit: 60,
      passing_score: 80,
      is_active: true,
      is_public: false,
      created_by: 1,
    },
    {
      title: "Database Design",
      description: "SQL and database normalization principles",
      time_limit: 40,
      passing_score: 70,
      is_active: true,
      is_public: true,
      created_by: 8,
    },
    {
      title: "Web Security",
      description: "Common web vulnerabilities and security practices",
      time_limit: 35,
      passing_score: 85,
      is_active: false,
      is_public: false,
      created_by: 1,
    },
    {
      title: "CSS Flexbox & Grid",
      description: "Modern CSS layout techniques",
      time_limit: 25,
      passing_score: 65,
      is_active: true,
      is_public: true,
      created_by: 8,
    },
    {
      title: "Git Version Control",
      description: "Version control with Git and GitHub",
      time_limit: 20,
      passing_score: 60,
      is_active: true,
      is_public: true,
      created_by: 1,
    },
    {
      title: "API Development",
      description: "RESTful API design and implementation",
      time_limit: 50,
      passing_score: 75,
      is_active: true,
      is_public: false,
      created_by: 8,
    },
  ];

  for (const quiz of quizzes) {
    await pool.query(
      "INSERT INTO quizzes (title, description, time_limit, passing_score, is_active, is_public, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [
        quiz.title,
        quiz.description,
        quiz.time_limit,
        quiz.passing_score,
        quiz.is_active,
        quiz.is_public,
        quiz.created_by,
        new Date(),
      ]
    );
  }

  console.log(`✅ Created ${quizzes.length} dummy quizzes`);
}

async function createDummyQuestions() {
  console.log("❓ Creating dummy questions...");

  const questions = [
    // JavaScript Fundamentals (Quiz 1)
    {
      quiz_id: 1,
      question: "What is the correct way to declare a variable in JavaScript?",
      options: ["var x = 5;", "variable x = 5;", "v x = 5;", "declare x = 5;"],
      correct_answer: "var x = 5;",
      points: 1,
    },
    {
      quiz_id: 1,
      question:
        "Which method is used to add an element to the end of an array?",
      options: ["push()", "add()", "append()", "insert()"],
      correct_answer: "push()",
      points: 1,
    },
    {
      quiz_id: 1,
      question: 'What does "=== " operator do in JavaScript?',
      options: [
        "Assignment",
        "Equality check",
        "Strict equality check",
        "Not equal",
      ],
      correct_answer: "Strict equality check",
      points: 2,
    },
    {
      quiz_id: 1,
      question: "How do you create a function in JavaScript?",
      options: [
        "function myFunction() {}",
        "create myFunction() {}",
        "def myFunction() {}",
        "func myFunction() {}",
      ],
      correct_answer: "function myFunction() {}",
      points: 1,
    },

    // React Components (Quiz 2)
    {
      quiz_id: 2,
      question: "What is a React Hook?",
      options: [
        "A function that lets you use state in functional components",
        "A class method",
        "A CSS property",
        "A database connection",
      ],
      correct_answer:
        "A function that lets you use state in functional components",
      points: 2,
    },
    {
      quiz_id: 2,
      question: "Which hook is used for side effects in React?",
      options: ["useState", "useEffect", "useContext", "useReducer"],
      correct_answer: "useEffect",
      points: 2,
    },
    {
      quiz_id: 2,
      question: "What is JSX?",
      options: [
        "JavaScript XML",
        "Java Syntax Extension",
        "JSON Extended",
        "JavaScript Extension",
      ],
      correct_answer: "JavaScript XML",
      points: 1,
    },

    // Node.js Backend (Quiz 3)
    {
      quiz_id: 3,
      question: "What is Node.js?",
      options: [
        "A JavaScript runtime",
        "A database",
        "A web browser",
        "A CSS framework",
      ],
      correct_answer: "A JavaScript runtime",
      points: 1,
    },
    {
      quiz_id: 3,
      question: "Which module is used to create HTTP servers in Node.js?",
      options: ["http", "server", "express", "web"],
      correct_answer: "http",
      points: 2,
    },
    {
      quiz_id: 3,
      question: "What is npm?",
      options: [
        "Node Package Manager",
        "New Programming Method",
        "Network Protocol Manager",
        "Node Process Manager",
      ],
      correct_answer: "Node Package Manager",
      points: 1,
    },

    // Database Design (Quiz 4)
    {
      quiz_id: 4,
      question: "What does SQL stand for?",
      options: [
        "Structured Query Language",
        "Simple Query Language",
        "Standard Query Language",
        "System Query Language",
      ],
      correct_answer: "Structured Query Language",
      points: 1,
    },
    {
      quiz_id: 4,
      question: "What is a primary key?",
      options: [
        "A unique identifier for a record",
        "The first column in a table",
        "A password",
        "A database name",
      ],
      correct_answer: "A unique identifier for a record",
      points: 2,
    },

    // CSS Flexbox & Grid (Quiz 6)
    {
      quiz_id: 6,
      question: 'What does "display: flex" do?',
      options: [
        "Creates a flexible layout",
        "Hides an element",
        "Changes text color",
        "Adds a border",
      ],
      correct_answer: "Creates a flexible layout",
      points: 1,
    },
    {
      quiz_id: 6,
      question: "Which property is used to align items in a flex container?",
      options: [
        "align-items",
        "align-content",
        "justify-content",
        "flex-align",
      ],
      correct_answer: "align-items",
      points: 2,
    },

    // Git Version Control (Quiz 7)
    {
      quiz_id: 7,
      question: "What command is used to clone a repository?",
      options: ["git clone", "git copy", "git download", "git get"],
      correct_answer: "git clone",
      points: 1,
    },
    {
      quiz_id: 7,
      question: 'What does "git add ." do?',
      options: [
        "Adds all files to staging area",
        "Adds a new file",
        "Deletes files",
        "Creates a branch",
      ],
      correct_answer: "Adds all files to staging area",
      points: 2,
    },
  ];

  for (const question of questions) {
    await pool.query(
      "INSERT INTO questions (quiz_id, question, options, correct_answer, points) VALUES ($1, $2, $3, $4, $5)",
      [
        question.quiz_id,
        question.question,
        JSON.stringify(question.options),
        question.correct_answer,
        question.points,
      ]
    );
  }

  console.log(`✅ Created ${questions.length} dummy questions`);
}

async function createDummyQuizAssignments() {
  console.log("📋 Creating dummy quiz assignments...");

  const assignments = [
    { user_id: 2, quiz_id: 1, assigned_by: 1 }, // john_doe -> JavaScript Fundamentals
    { user_id: 2, quiz_id: 2, assigned_by: 1 }, // john_doe -> React Components
    { user_id: 3, quiz_id: 1, assigned_by: 8 }, // jane_smith -> JavaScript Fundamentals
    { user_id: 3, quiz_id: 4, assigned_by: 8 }, // jane_smith -> Database Design
    { user_id: 4, quiz_id: 2, assigned_by: 1 }, // mike_wilson -> React Components
    { user_id: 4, quiz_id: 6, assigned_by: 1 }, // mike_wilson -> CSS Flexbox & Grid
    { user_id: 5, quiz_id: 1, assigned_by: 8 }, // sarah_davis -> JavaScript Fundamentals
    { user_id: 6, quiz_id: 7, assigned_by: 1 }, // alice_brown -> Git Version Control
    { user_id: 9, quiz_id: 3, assigned_by: 8 }, // edward_black -> Node.js Backend
    { user_id: 10, quiz_id: 4, assigned_by: 1 }, // fiona_red -> Database Design
  ];

  for (const assignment of assignments) {
    await pool.query(
      "INSERT INTO quiz_assignments (user_id, quiz_id, assigned_by, assigned_at) VALUES ($1, $2, $3, $4)",
      [
        assignment.user_id,
        assignment.quiz_id,
        assignment.assigned_by,
        new Date(),
      ]
    );
  }

  console.log(`✅ Created ${assignments.length} dummy quiz assignments`);
}

async function createDummyQuizAttempts() {
  console.log("🎯 Creating dummy quiz attempts...");

  const attempts = [
    // Completed attempts with scores
    {
      user_id: 2,
      quiz_id: 1,
      answers: {
        1: { user_answer: "var x = 5;", is_correct: true },
        2: { user_answer: "push()", is_correct: true },
        3: { user_answer: "Equality check", is_correct: false },
        4: { user_answer: "function myFunction() {}", is_correct: true },
      },
      score: 3,
      total_questions: 4,
      status: "completed",
    },
    {
      user_id: 3,
      quiz_id: 1,
      answers: {
        1: { user_answer: "var x = 5;", is_correct: true },
        2: { user_answer: "add()", is_correct: false },
        3: { user_answer: "Strict equality check", is_correct: true },
        4: { user_answer: "function myFunction() {}", is_correct: true },
      },
      score: 3,
      total_questions: 4,
      status: "completed",
    },
    {
      user_id: 4,
      quiz_id: 2,
      answers: {
        5: {
          user_answer:
            "A function that lets you use state in functional components",
          is_correct: true,
        },
        6: { user_answer: "useEffect", is_correct: true },
        7: { user_answer: "JavaScript XML", is_correct: true },
      },
      score: 3,
      total_questions: 3,
      status: "completed",
    },
    {
      user_id: 5,
      quiz_id: 1,
      answers: {
        1: { user_answer: "variable x = 5;", is_correct: false },
        2: { user_answer: "push()", is_correct: true },
        3: { user_answer: "Strict equality check", is_correct: true },
        4: { user_answer: "def myFunction() {}", is_correct: false },
      },
      score: 2,
      total_questions: 4,
      status: "completed",
    },
    // In-progress attempts
    {
      user_id: 6,
      quiz_id: 7,
      answers: {
        15: { user_answer: "git clone", is_correct: true },
      },
      score: null,
      total_questions: null,
      status: "in_progress",
    },
    {
      user_id: 9,
      quiz_id: 3,
      answers: {},
      score: null,
      total_questions: null,
      status: "in_progress",
    },
  ];

  for (const attempt of attempts) {
    const completed_at = attempt.status === "completed" ? new Date() : null;
    const started_at = new Date(
      Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
    ); // Random date within last week

    await pool.query(
      "INSERT INTO quiz_attempts (user_id, quiz_id, answers, score, total_questions, started_at, completed_at, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [
        attempt.user_id,
        attempt.quiz_id,
        JSON.stringify(attempt.answers),
        attempt.score,
        attempt.total_questions,
        started_at,
        completed_at,
        attempt.status,
      ]
    );
  }

  console.log(`✅ Created ${attempts.length} dummy quiz attempts`);
}

async function createDummyAccessRequests() {
  console.log("🔐 Creating dummy access requests...");

  const accessRequests = [
    {
      user_id: 2,
      quiz_id: 3,
      reason: "I need access to Node.js quiz for my learning path",
      status: "pending",
    },
    {
      user_id: 3,
      quiz_id: 3,
      reason: "Required for backend development course",
      status: "approved",
      reviewed_by: 1,
    },
    {
      user_id: 4,
      quiz_id: 8,
      reason: "API development is part of my current project",
      status: "pending",
    },
    {
      user_id: 5,
      quiz_id: 5,
      reason: "Security knowledge needed for web development",
      status: "rejected",
      reviewed_by: 8,
    },
    {
      user_id: 6,
      quiz_id: 3,
      reason: "Learning backend development",
      status: "pending",
    },
    {
      user_id: 9,
      quiz_id: 8,
      reason: "Need to understand RESTful APIs better",
      status: "approved",
      reviewed_by: 1,
    },
    {
      user_id: 10,
      quiz_id: 5,
      reason: "Security training requirement",
      status: "pending",
    },
  ];

  for (const request of accessRequests) {
    const requested_at = new Date(
      Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000
    ); // Random date within last 2 weeks
    const reviewed_at =
      request.status !== "pending"
        ? new Date(requested_at.getTime() + Math.random() * 24 * 60 * 60 * 1000)
        : null;

    await pool.query(
      "INSERT INTO access_requests (user_id, quiz_id, reason, status, requested_at, reviewed_by, reviewed_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [
        request.user_id,
        request.quiz_id,
        request.reason,
        request.status,
        requested_at,
        request.reviewed_by || null,
        reviewed_at,
      ]
    );
  }

  console.log(`✅ Created ${accessRequests.length} dummy access requests`);
}

async function printDataSummary() {
  const tables = [
    "users",
    "quizzes",
    "questions",
    "quiz_attempts",
    "quiz_assignments",
    "access_requests",
  ];

  for (const table of tables) {
    const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
    console.log(`📊 ${table}: ${result.rows[0].count} records`);
  }
}

// Test credentials for dummy users
function printTestCredentials() {
  console.log("\n🔑 Test User Credentials:");
  console.log("Admin: admin / admin123");
  console.log("Users: john_doe, jane_smith, mike_wilson, etc. / password123");
  console.log("\n📱 You can now test the application with these users!");
}

// Run the script
if (require.main === module) {
  generateDummyData()
    .then(() => {
      printTestCredentials();
      console.log("\n✨ Dummy data generation completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Failed to generate dummy data:", error);
      process.exit(1);
    });
}

module.exports = { generateDummyData };
