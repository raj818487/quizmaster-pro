import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Quiz, Question, Submission } from './models';

export interface QuizAttempt {
  id?: number;
  user_id: number;
  quiz_id: number;
  score: number;
  total_questions: number;
  started_at?: Date;
  completed_at?: Date;
}

export interface UserAnswer {
  id?: number;
  attempt_id: number;
  question_id: number;
  user_answer: string;
  is_correct: boolean;
}

export interface QuizResult {
  attempt: QuizAttempt;
  answers: UserAnswer[];
  percentage: number;
  passed: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class QuizService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  async getAllQuizzes(): Promise<Quiz[]> {
    try {
      const quizzes =
        (await firstValueFrom(
          this.http.get<Quiz[]>(`${this.apiUrl}/quizzes`)
        )) || [];
      return quizzes;
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      return [];
    }
  }

  async getQuizById(id: number): Promise<Quiz | null> {
    try {
      const quiz = await firstValueFrom(
        this.http.get<Quiz>(`${this.apiUrl}/quizzes/${id}`)
      );
      return quiz || null;
    } catch (error) {
      console.error('Error fetching quiz:', error);
      return null;
    }
  }

  async getQuestions(quizId: number): Promise<Question[]> {
    try {
      const qs =
        (await firstValueFrom(
          this.http.get<Question[]>(`/api/quizzes/${quizId}/questions`)
        )) || [];
      return qs;
    } catch (error) {
      console.error('Error fetching questions:', error);
      return [];
    }
  }

  async createQuiz(
    quiz: Omit<Quiz, 'id'>,
    questions: Omit<Question, 'id' | 'quiz_id'>[],
    userId: number
  ): Promise<{ success: boolean; quiz?: Quiz; message: string }> {
    try {
      const resp: any = await firstValueFrom(
        this.http.post(`${this.apiUrl}/quizzes`, {
          ...quiz,
          questions,
          created_by: userId,
        })
      );
      if (resp?.success) {
        return {
          success: true,
          quiz: resp.quiz as Quiz,
          message: 'Quiz created successfully',
        };
      }
      return {
        success: false,
        message: resp?.message || 'Failed to create quiz',
      };
    } catch (error) {
      console.error('Error creating quiz:', error);
      return {
        success: false,
        message: 'Failed to create quiz',
      };
    }
  }

  async updateQuiz(
    quizId: number,
    quiz: Partial<Quiz>,
    userId: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const resp: any = await firstValueFrom(
        this.http.put(`/api/quizzes/${quizId}`, {
          ...quiz,
          user_id: userId,
        })
      );
      if (resp?.success)
        return { success: true, message: 'Quiz updated successfully' };
      return {
        success: false,
        message: resp?.message || 'Failed to update quiz',
      };
    } catch (error) {
      console.error('Error updating quiz:', error);
      return {
        success: false,
        message: 'Failed to update quiz',
      };
    }
  }

  async deleteQuiz(
    quizId: number,
    userId: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const resp: any = await firstValueFrom(
        this.http.delete(`/api/quizzes/${quizId}?user_id=${userId}`)
      );
      if (resp?.success)
        return { success: true, message: 'Quiz deleted successfully' };
      return { success: false, message: resp?.message || 'Quiz not found' };
    } catch (error) {
      console.error('Error deleting quiz:', error);
      return {
        success: false,
        message: 'Failed to delete quiz',
      };
    }
  }

  async addQuestion(
    quizId: number,
    question: Omit<Question, 'id' | 'quiz_id'>,
    userId: number
  ): Promise<{ success: boolean; question?: Question; message: string }> {
    try {
      const resp: any = await firstValueFrom(
        this.http.post(`/api/quizzes/${quizId}/questions`, {
          ...question,
          user_id: userId,
        })
      );
      if (resp?.success) {
        return {
          success: true,
          question: resp.question as Question,
          message: 'Question added successfully',
        };
      }
      return {
        success: false,
        message: resp?.message || 'Failed to add question',
      };
    } catch (error) {
      console.error('Error adding question:', error);
      return {
        success: false,
        message: 'Failed to add question',
      };
    }
  }

  async updateQuestion(
    questionId: number,
    question: Partial<Question>,
    userId: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const resp: any = await firstValueFrom(
        this.http.put(`/api/questions/${questionId}`, {
          ...question,
          user_id: userId,
        })
      );
      if (resp?.success)
        return { success: true, message: 'Question updated successfully' };
      return {
        success: false,
        message: resp?.message || 'Failed to update question',
      };
    } catch (error) {
      console.error('Error updating question:', error);
      return {
        success: false,
        message: 'Failed to update question',
      };
    }
  }

  async deleteQuestion(
    questionId: number,
    userId: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const resp: any = await firstValueFrom(
        this.http.delete(`/api/questions/${questionId}?user_id=${userId}`)
      );
      if (resp?.success)
        return { success: true, message: 'Question deleted successfully' };
      return {
        success: false,
        message: resp?.message || 'Failed to delete question',
      };
    } catch (error) {
      console.error('Error deleting question:', error);
      return {
        success: false,
        message: 'Failed to delete question',
      };
    }
  }

  async getUserQuizzes(userId: number): Promise<Quiz[]> {
    try {
      const quizzes = await firstValueFrom(
        this.http.get<Quiz[]>(`/api/users/${userId}/quizzes`)
      );
      return quizzes || [];
    } catch (error) {
      console.error('Error fetching user quizzes:', error);
      return [];
    }
  }

  async getPublicQuizzes(): Promise<Quiz[]> {
    try {
      const quizzes = await firstValueFrom(
        this.http.get<Quiz[]>(`/api/quizzes/public`)
      );
      return quizzes || [];
    } catch (error) {
      console.error('Error fetching public quizzes:', error);
      return [];
    }
  }

  async startQuizAttempt(
    userId: number,
    quizId: number
  ): Promise<{ success: boolean; attemptId?: number; message: string }> {
    try {
      const resp: any = await firstValueFrom(
        this.http.post(`${this.apiUrl}/attempts`, {
          user_id: userId,
          quiz_id: quizId,
        })
      );
      if (resp?.success)
        return {
          success: true,
          attemptId: resp.attemptId,
          message: 'Quiz attempt started',
        };
      return {
        success: false,
        message: resp?.message || 'Failed to start quiz attempt',
      };
    } catch (error) {
      console.error('Error starting quiz attempt:', error);
      return {
        success: false,
        message: 'Failed to start quiz attempt',
      };
    }
  }

  async submitAnswer(
    attemptId: number,
    questionId: number,
    userAnswer: string,
    correctAnswer: string
  ): Promise<boolean> {
    try {
      const resp: any = await firstValueFrom(
        this.http.post(`/api/attempts/${attemptId}/answers`, {
          question_id: questionId,
          user_answer: userAnswer,
        })
      );
      return !!resp?.is_correct;
    } catch (error) {
      console.error('Error submitting answer:', error);
      return false;
    }
  }

  async completeQuizAttempt(
    attemptId: number
  ): Promise<{ success: boolean; result?: QuizResult; message: string }> {
    try {
      const resp: any = await firstValueFrom(
        this.http.post(`/api/attempts/${attemptId}/complete`, {})
      );
      if (resp?.success)
        return {
          success: true,
          result: resp.result as QuizResult,
          message: 'Quiz completed successfully',
        };
      return {
        success: false,
        message: resp?.message || 'Failed to complete quiz',
      };
    } catch (error) {
      console.error('Error completing quiz attempt:', error);
      return {
        success: false,
        message: 'Failed to complete quiz',
      };
    }
  }

  async getUserQuizHistory(userId: number): Promise<QuizAttempt[]> {
    try {
      const attempts =
        (await firstValueFrom(
          this.http.get<QuizAttempt[]>(`/api/users/${userId}/attempts`)
        )) || [];
      return attempts;
    } catch (error) {
      console.error('Error fetching quiz history:', error);
      return [];
    }
  }

  async getQuizStatistics(): Promise<{
    totalQuizzes: number;
    totalAttempts: number;
    averageScore: number;
  }> {
    try {
      const stats = (await firstValueFrom(
        this.http.get<any>(`${this.apiUrl}/stats`)
      )) || { totalQuizzes: 0, totalAttempts: 0, averageScore: 0 };
      return stats;
    } catch (error) {
      console.error('Error fetching quiz statistics:', error);
      return {
        totalQuizzes: 0,
        totalAttempts: 0,
        averageScore: 0,
      };
    }
  }

  // Legacy methods for backward compatibility
  getQuizzes(callback: (quizzes: Quiz[]) => void): void {
    this.getAllQuizzes().then(callback);
  }

  submitQuiz(submission: Submission, callback: (result: any) => void) {
    // Implementation for legacy compatibility
    console.log('Legacy submitQuiz called', submission);
    callback({ success: true });
  }
}
