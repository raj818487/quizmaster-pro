import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { QuizService } from '../../../core/quiz.service';
import { ToastService } from '../../../core/toast.service';
import { Quiz, Question, User } from '../../../core/models';
import { ToastComponent } from '../../../shared/toast/toast.component';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  templateUrl: './admin-page.html',
  styleUrls: ['./admin-page.scss'],
})
export class AdminPage implements OnInit {
  activeTab: 'users' | 'quizzes' = 'users';

  // Existing user management properties
  users: any[] = [];
  newUsername = '';
  newPassword = '';
  newRole: 'user' | 'admin' = 'user';

  // Quiz Management Properties
  userQuizzes: Quiz[] = [];
  currentUser: User | null = null;

  newQuiz: Partial<Quiz> = {
    title: '',
    description: '',
    is_public: false,
  };

  newQuestion: Partial<Question> = {
    text: '',
    type: 'multiple_choice',
    correct_answer: '',
    options: ['', '', '', ''],
    points: 10,
    quiz_id: 0,
  };

  editingQuiz: Quiz | null = null;
  editingQuestion: Question | null = null;
  showNewQuizForm: boolean = false;
  showNewQuestionForm: boolean = false;
  selectedQuiz: Quiz | null = null;
  selectedQuizQuestions: Question[] = [];
  loadingQuestions: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private quizService: QuizService,
    private toastService: ToastService
  ) {
    this.loadUsers();
  }

  ngOnInit(): void {
    this.loadUserQuizzes();
    this.currentUser = this.authService.getCurrentUser();
  }

  async loadUserQuizzes(): Promise<void> {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (currentUser?.id) {
        this.userQuizzes = await this.quizService.getUserQuizzes(
          currentUser.id
        );
      }
    } catch (error) {
      console.error('Error loading quizzes:', error);
      this.toastService.error('Failed to load quizzes');
    }
  }

  setActiveTab(tab: 'users' | 'quizzes') {
    this.activeTab = tab;
  }

  openQuizManagement() {
    // Navigate to the quiz management route
    this.router.navigate(['/admin/quiz-management']);
  }

  async loadUsers() {
    this.users = await this.authService.getAllUsers();
  }

  async addUser() {
    const result = await this.authService.register(
      this.newUsername,
      this.newPassword,
      this.newRole
    );
    if (result.success) {
      alert('User created successfully');
      this.newUsername = '';
      this.newPassword = '';
      this.newRole = 'user';
      await this.loadUsers();
    } else {
      alert(result.message);
    }
  }

  async deleteUser(userId: number) {
    const result = await this.authService.deleteUser(userId);
    if (result.success) {
      alert('User deleted successfully');
      await this.loadUsers();
    } else {
      alert(result.message);
    }
  }

  addQuiz(): void {
    this.setActiveTab('quizzes');
  }

  manageUsers(): void {
    this.setActiveTab('users');
  }

  // Quiz Management Methods
  async createQuiz(): Promise<void> {
    try {
      if (!this.newQuiz.title || !this.newQuiz.description) {
        this.toastService.error('Please fill in all required fields');
        return;
      }

      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.id) {
        this.toastService.error('User not authenticated');
        return;
      }

      const result = await this.quizService.createQuiz(
        {
          title: this.newQuiz.title,
          description: this.newQuiz.description,
          created_by: currentUser.id,
        },
        [],
        currentUser.id
      );

      if (result.success && result.quiz) {
        this.userQuizzes.push(result.quiz);
        this.resetNewQuiz();
        this.showNewQuizForm = false;
        this.toastService.success('Quiz created successfully!');
      } else {
        this.toastService.error(result.message);
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      this.toastService.error('Failed to create quiz');
    }
  }

  async updateQuiz(): Promise<void> {
    if (!this.editingQuiz) return;

    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.id) {
        this.toastService.error('User not authenticated');
        return;
      }

      const result = await this.quizService.updateQuiz(
        this.editingQuiz.id!,
        this.editingQuiz,
        currentUser.id
      );

      if (result.success) {
        const index = this.userQuizzes.findIndex(
          (q) => q.id === this.editingQuiz!.id
        );
        if (index !== -1) {
          this.userQuizzes[index] = { ...this.editingQuiz };
        }
        this.editingQuiz = null;
        this.toastService.success('Quiz updated successfully!');
      } else {
        this.toastService.error(result.message);
      }
    } catch (error) {
      console.error('Error updating quiz:', error);
      this.toastService.error('Failed to update quiz');
    }
  }

  async deleteQuiz(quiz: Quiz): Promise<void> {
    if (!confirm('Are you sure you want to delete this quiz?')) return;

    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.id) {
        this.toastService.error('User not authenticated');
        return;
      }

      const result = await this.quizService.deleteQuiz(
        quiz.id!,
        currentUser.id
      );

      if (result.success) {
        this.userQuizzes = this.userQuizzes.filter((q) => q.id !== quiz.id);
        this.toastService.success('Quiz deleted successfully!');
      } else {
        this.toastService.error(result.message);
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      this.toastService.error('Failed to delete quiz');
    }
  }

  async createQuestion(): Promise<void> {
    if (!this.selectedQuiz) return;

    try {
      if (!this.newQuestion.text || !this.newQuestion.correct_answer) {
        this.toastService.error('Please fill in all required fields');
        return;
      }

      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.id) {
        this.toastService.error('User not authenticated');
        return;
      }

      // Validate multiple choice options
      if (this.newQuestion.type === 'multiple_choice') {
        const optionsArray = Array.isArray(this.newQuestion.options)
          ? this.newQuestion.options
          : [];
        const nonEmptyOptions = optionsArray.filter(
          (opt: string) => opt.trim() !== ''
        );
        if (nonEmptyOptions.length < 2) {
          this.toastService.error(
            'Multiple choice questions need at least 2 options'
          );
          return;
        }
        if (!nonEmptyOptions.includes(this.newQuestion.correct_answer)) {
          this.toastService.error('Correct answer must be one of the options');
          return;
        }
        this.newQuestion.options = nonEmptyOptions;
      }

      const result = await this.quizService.addQuestion(
        this.selectedQuiz.id!,
        {
          text: this.newQuestion.text,
          type: this.newQuestion.type!,
          correct_answer: this.newQuestion.correct_answer,
          options: this.newQuestion.options,
          points: this.newQuestion.points,
        },
        currentUser.id
      );

      if (result.success) {
        this.resetNewQuestion();
        this.showNewQuestionForm = false;
        this.toastService.success('Question added successfully!');
        // Reload questions to show the new question
        await this.loadQuizQuestions();
      } else {
        this.toastService.error(result.message);
      }
    } catch (error) {
      console.error('Error creating question:', error);
      this.toastService.error('Failed to create question');
    }
  }

  async updateQuestion(): Promise<void> {
    if (!this.editingQuestion) return;

    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.id) {
        this.toastService.error('User not authenticated');
        return;
      }

      const result = await this.quizService.updateQuestion(
        this.editingQuestion.id!,
        this.editingQuestion,
        currentUser.id
      );

      if (result.success) {
        this.editingQuestion = null;
        this.toastService.success('Question updated successfully!');
        // Reload questions to show the updated question
        await this.loadQuizQuestions();
      } else {
        this.toastService.error(result.message);
      }
    } catch (error) {
      console.error('Error updating question:', error);
      this.toastService.error('Failed to update question');
    }
  }

  async deleteQuestion(questionId: number): Promise<void> {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.id) {
        this.toastService.error('User not authenticated');
        return;
      }

      const result = await this.quizService.deleteQuestion(
        questionId,
        currentUser.id
      );

      if (result.success) {
        this.toastService.success('Question deleted successfully!');
        // Reload questions to remove the deleted question
        await this.loadQuizQuestions();
      } else {
        this.toastService.error(result.message);
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      this.toastService.error('Failed to delete question');
    }
  }

  // Form Management Methods
  resetNewQuiz(): void {
    this.newQuiz = {
      title: '',
      description: '',
    };
  }

  resetNewQuestion(): void {
    this.newQuestion = {
      text: '',
      type: 'multiple_choice',
      correct_answer: '',
      options: ['', '', '', ''],
      points: 10,
      quiz_id: 0,
    };
  }

  editQuiz(quiz: Quiz): void {
    this.editingQuiz = { ...quiz };
  }

  editQuestion(question: Question): void {
    this.editingQuestion = { ...question };
  }

  cancelEdit(): void {
    this.editingQuiz = null;
    this.editingQuestion = null;
  }

  selectQuiz(quiz: Quiz): void {
    this.selectedQuiz = quiz;
    this.editingQuiz = null; // Close any edit forms
    this.showNewQuizForm = false; // Close new quiz form
    this.showNewQuestionForm = false; // Close new question form
    this.editingQuestion = null; // Close edit question form
    this.loadQuizQuestions();
  }

  async loadQuizQuestions(): Promise<void> {
    if (!this.selectedQuiz?.id) return;

    try {
      this.loadingQuestions = true;
      this.selectedQuizQuestions = await this.quizService.getQuestions(
        this.selectedQuiz.id
      );
    } catch (error) {
      console.error('Error loading questions:', error);
      this.toastService.error('Failed to load questions');
    } finally {
      this.loadingQuestions = false;
    }
  }

  closeQuestionManagement(): void {
    this.selectedQuiz = null;
    this.selectedQuizQuestions = [];
    this.showNewQuestionForm = false;
    this.editingQuestion = null;
  }

  cancelNewQuiz(): void {
    this.showNewQuizForm = false;
    this.resetNewQuiz();
  }

  cancelNewQuestion(): void {
    this.showNewQuestionForm = false;
    this.resetNewQuestion();
  }

  addOption(): void {
    if (!Array.isArray(this.newQuestion.options)) {
      this.newQuestion.options = [];
    }
    this.newQuestion.options.push('');
  }

  removeOption(index: number): void {
    if (Array.isArray(this.newQuestion.options)) {
      this.newQuestion.options.splice(index, 1);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  get newQuestionOptionsArray(): string[] {
    return Array.isArray(this.newQuestion.options)
      ? this.newQuestion.options
      : [];
  }

  getQuestionOptionsArray(question: Question): string[] {
    return Array.isArray(question.options) ? question.options : [];
  }

  updateOptionAt(index: number, value: string): void {
    if (Array.isArray(this.newQuestion.options)) {
      this.newQuestion.options[index] = value;
    }
  }

  formatQuestionType(type: string): string {
    switch (type) {
      case 'multiple_choice':
        return 'Multiple Choice';
      case 'true_false':
        return 'True/False';
      case 'text':
        return 'Text Answer';
      default:
        return type;
    }
  }
}
