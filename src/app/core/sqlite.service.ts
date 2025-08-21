import { Injectable } from '@angular/core';
import { User, Quiz, Question } from './models';

// SQLite Database Service
@Injectable({
  providedIn: 'root',
})
export class SqliteService {
  private db: any;
  private isInitialized = false;

  constructor() {
    // Use in-memory mock database (Electron API removed)
    this.db = this.createInMemoryDB();
    this.isInitialized = true;
  }

  private createInMemoryDB() {
    // Mock database for web environment
    return {
      users: [
        { id: 1, username: 'admin', password: 'admin123', role: 'admin' },
        { id: 2, username: 'user1', password: 'user123', role: 'user' },
      ],
      quizzes: [
        {
          id: 1,
          title: 'JavaScript Basics',
          description: 'Test your JavaScript knowledge',
          created_by: 1,
        },
        {
          id: 2,
          title: 'Angular Fundamentals',
          description: 'Angular framework basics',
          created_by: 1,
        },
      ],
      questions: [
        {
          id: 1,
          quiz_id: 1,
          text: 'What is JavaScript?',
          type: 'text',
          correct_answer: 'A programming language',
        },
        {
          id: 2,
          quiz_id: 1,
          text: 'What does DOM stand for?',
          type: 'text',
          correct_answer: 'Document Object Model',
        },
        {
          id: 3,
          quiz_id: 2,
          text: 'What is Angular?',
          type: 'text',
          correct_answer: 'A web framework',
        },
      ],
      quiz_attempts: [],
      user_answers: [],
    };
  }

  private async createTables(): Promise<void> {
    // No-op in mock mode
    return;
  }

  private async seedData() {
    // No-op in mock mode
  }

  async executeQuery(query: string, params: any[] = []): Promise<any> {
    return this.mockQueryExecution(query, params);
  }

  private mockQueryExecution(query: string, params: any[]): any {
    const db = this.db;

    if (query.includes('SELECT id, username, role FROM users')) {
      return db.users.map((u: any) => ({
        id: u.id,
        username: u.username,
        role: u.role,
      }));
    }

    if (
      query.includes('SELECT * FROM users WHERE username = ? AND password = ?')
    ) {
      const [username, password] = params;
      return db.users.filter(
        (u: any) => u.username === username && u.password === password
      );
    }

    if (query.includes('SELECT * FROM users WHERE username = ?')) {
      const [username] = params;
      return db.users.filter((u: any) => u.username === username);
    }

    if (query.includes('INSERT INTO users')) {
      const [username, password, role] = params;
      const newUser = {
        id: db.users.length + 1,
        username,
        password,
        role: role || 'user',
      };
      db.users.push(newUser);
      return { lastInsertRowid: newUser.id };
    }

    if (
      query.includes(
        'UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?'
      )
    ) {
      const [username, password, role, id] = params;
      const idx = db.users.findIndex((u: any) => u.id === id);
      if (idx >= 0) {
        db.users[idx] = { ...db.users[idx], username, password, role };
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (
      query.includes('UPDATE users SET username = ?, role = ? WHERE id = ?')
    ) {
      const [username, role, id] = params;
      const idx = db.users.findIndex((u: any) => u.id === id);
      if (idx >= 0) {
        db.users[idx] = { ...db.users[idx], username, role };
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (query.includes('DELETE FROM users WHERE id = ?')) {
      const userId = params[0];
      const before = db.users.length;
      db.users = db.users.filter((u: User) => u.id !== userId);
      return { changes: before - db.users.length };
    }

    if (query.includes('SELECT * FROM quizzes')) {
      return db.quizzes;
    }

    if (query.includes('SELECT * FROM questions WHERE quiz_id')) {
      const quizId = params[0];
      return db.questions.filter((q: Question) => q.quiz_id === quizId);
    }

    if (query.includes('INSERT INTO quizzes')) {
      const [title, description, created_by] = params;
      const newQuiz = {
        id: db.quizzes.length + 1,
        title,
        description,
        created_by,
      };
      db.quizzes.push(newQuiz);
      return newQuiz;
    }

    if (query.includes('INSERT INTO questions')) {
      const [quiz_id, text, correct_answer] = params;
      const newQuestion = {
        id: db.questions.length + 1,
        quiz_id,
        text,
        type: 'text',
        correct_answer,
      };
      db.questions.push(newQuestion);
      return newQuestion;
    }

    if (query.includes('DELETE FROM quizzes WHERE id')) {
      const quizId = params[0];
      db.quizzes = db.quizzes.filter((q: Quiz) => q.id !== quizId);
      db.questions = db.questions.filter((q: Question) => q.quiz_id !== quizId);
      return { changes: 1 };
    }

    return [];
  }

  // CRUD methods for user management (access restricted to admin users)
  async getUsers(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users';
      // TODO: Execute the SQLite query and resolve with the results
      // For now, return sample data
      resolve([{ id: 1, username: 'admin', role: 'admin' }]);
    });
  }

  async createUser(
    username: string,
    password: string,
    role: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const query =
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
      // TODO: Execute the SQLite query with parameters [username, password, role]
      // For now, simulate the insertion
      resolve({ success: true, message: 'User created successfully' });
    });
  }

  async updateUser(
    id: number,
    username: string,
    password: string,
    role: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const query =
        'UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?';
      // TODO: Execute the SQLite query with parameters [username, password, role, id]
      // For now, simulate the update
      resolve({ success: true, message: 'User updated successfully' });
    });
  }

  async deleteUser(id: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const query = 'DELETE FROM users WHERE id = ?';
      // TODO: Execute the SQLite query with parameter [id]
      // For now, simulate the deletion
      resolve({ success: true, message: 'User deleted successfully' });
    });
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}
