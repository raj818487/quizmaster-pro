// Electron API removed; no window augmentation

export interface User {
  id?: number;
  username: string;
  password?: string;
  role: 'user' | 'admin';
  created_at?: Date;
  status?: 'active' | 'inactive' | 'suspended';
  last_activity?: string;
  isOnline?: boolean;
}

export interface Quiz {
  id?: number;
  title: string;
  description: string;
  config?: string;
  created_by?: number;
  created_at?: Date;
  is_public?: boolean;
  time_limit?: number;
  user_permission?: 'owner' | 'edit' | 'view';
  has_access?: boolean | number; // For quiz assignment API responses (can be 0/1 from SQLite)
  is_assigned?: boolean | number; // For quiz assignment API responses (can be 0/1 from SQLite)
  assigned_at?: string; // When the quiz was assigned
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'text';

export interface Question {
  id?: number;
  quiz_id: number;
  text: string;
  type: QuestionType;
  options?: string[] | string;
  correct_answer: string;
  points?: number;
  correct?: string | string[]; // Legacy field for backward compatibility
}

export interface Submission {
  id?: number;
  user_id: number;
  quiz_id: number;
  answers: any;
  score: number;
  submitted_at: string;
}

export interface QuizAttempt {
  id?: number;
  user_id: number;
  quiz_id: number;
  score?: number;
  total_questions?: number;
  started_at: string;
  completed_at?: string;
  status: 'in_progress' | 'completed';
}

export interface UserAnswer {
  id?: number;
  attempt_id: number;
  question_id: number;
  answer: string;
  is_correct?: boolean;
  answered_at: string;
}
