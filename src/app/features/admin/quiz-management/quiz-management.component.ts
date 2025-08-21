import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuizService } from '../../../core/quiz.service';
import { AuthService } from '../../../core/auth.service';
import { ToastService } from '../../../core/toast.service';
import { Quiz, Question, User } from '../../../core/models';

@Component({
  selector: 'app-quiz-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quiz-management.component.html',
  styleUrls: ['./quiz-management.component.scss'],
})
export class QuizManagementComponent implements OnInit {
  userQuizzes: Quiz[] = [];
  currentUser: User | null = null;

  newQuiz: Partial<Quiz> = {
    title: '',
    description: '',
    is_public: true,
    time_limit: 0,
  };

  editingQuiz: Quiz | null = null;
  editingQuizQuestions: Question[] = [];

  currentQuestion: Partial<Question> = {
    text: '',
    type: 'text',
    correct_answer: '',
    points: 1,
    options: [],
  };

  editingQuestion: Question | null = null;

  constructor(
    private quizService: QuizService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  // Helper method to get options as array
  getCurrentQuestionOptionsAsArray(): string[] {
    if (!this.currentQuestion.options) {
      return [];
    }
    if (typeof this.currentQuestion.options === 'string') {
      try {
        return JSON.parse(this.currentQuestion.options);
      } catch {
        return [];
      }
    }
    return this.currentQuestion.options || [];
  }

  // Helper method to update a specific option
  updateOption(index: number, value: string) {
    const currentOptions = this.getCurrentQuestionOptionsAsArray();
    if (index >= 0 && index < currentOptions.length) {
      currentOptions[index] = value;
      this.setCurrentQuestionOptions(currentOptions);
    }
  }

  // Handle option input change
  onOptionChange(index: number, event: Event) {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.updateOption(index, target.value);
    }
  }

  // Helper method to set options as array
  setCurrentQuestionOptions(options: string[]) {
    this.currentQuestion.options = options;
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      if (user) {
        this.loadUserQuizzes();
      }
    });
  }

  async loadUserQuizzes() {
    if (!this.currentUser?.id) return;

    try {
      this.userQuizzes = await this.quizService.getUserQuizzes(
        this.currentUser.id
      );
    } catch (error) {
      this.toastService.error('Failed to load quizzes');
    }
  }

  async createQuiz() {
    if (!this.currentUser?.id) return;

    if (!this.newQuiz.title?.trim()) {
      this.toastService.warning('Please enter a quiz title');
      return;
    }

    try {
      const result = await this.quizService.createQuiz(
        this.newQuiz as Omit<Quiz, 'id'>,
        [],
        this.currentUser.id
      );

      if (result.success) {
        this.toastService.success(
          'Quiz created successfully! You can now add questions to it.'
        );
        this.newQuiz = {
          title: '',
          description: '',
          is_public: true,
          time_limit: 0,
        };
        await this.loadUserQuizzes();
      } else {
        this.toastService.error(result.message || 'Failed to create quiz');
      }
    } catch (error) {
      this.toastService.error('Failed to create quiz');
    }
  }

  editQuiz(quiz: Quiz) {
    this.editingQuiz = { ...quiz };
    this.loadQuizQuestions(quiz.id!);
  }

  async loadQuizQuestions(quizId: number) {
    try {
      this.editingQuizQuestions = await this.quizService.getQuestions(quizId);
    } catch (error) {
      this.toastService.error('Failed to load questions');
    }
  }

  async updateQuiz() {
    if (!this.editingQuiz?.id || !this.currentUser?.id) return;

    if (!this.editingQuiz.title?.trim()) {
      this.toastService.warning('Please enter a quiz title');
      return;
    }

    try {
      const result = await this.quizService.updateQuiz(
        this.editingQuiz.id,
        this.editingQuiz,
        this.currentUser.id
      );

      if (result.success) {
        this.toastService.success('Quiz updated successfully!');
        await this.loadUserQuizzes();
      } else {
        this.toastService.error(result.message || 'Failed to update quiz');
      }
    } catch (error) {
      this.toastService.error('Failed to update quiz');
    }
  }

  cancelEdit() {
    this.editingQuiz = null;
    this.editingQuizQuestions = [];
    this.currentQuestion = {
      text: '',
      type: 'text',
      correct_answer: '',
      points: 1,
      options: [],
    };
    this.editingQuestion = null;
  }

  async deleteQuizConfirm(quiz: Quiz) {
    if (!confirm(`Are you sure you want to delete "${quiz.title}"?`)) return;

    if (!this.currentUser?.id || !quiz.id) return;

    try {
      const result = await this.quizService.deleteQuiz(
        quiz.id,
        this.currentUser.id
      );

      if (result.success) {
        this.toastService.success('Quiz deleted successfully!');
        await this.loadUserQuizzes();
        if (this.editingQuiz?.id === quiz.id) {
          this.cancelEdit();
        }
      } else {
        this.toastService.error(result.message || 'Failed to delete quiz');
      }
    } catch (error) {
      this.toastService.error('Failed to delete quiz');
    }
  }

  onQuestionTypeChange() {
    if (this.currentQuestion.type === 'multiple_choice') {
      // Initialize with 4 empty options for multiple choice
      this.setCurrentQuestionOptions([
        'Option A',
        'Option B',
        'Option C',
        'Option D',
      ]);
      this.currentQuestion.correct_answer = 'Option A';
    } else if (this.currentQuestion.type === 'true_false') {
      this.setCurrentQuestionOptions(['True', 'False']);
      this.currentQuestion.correct_answer = 'True';
    } else {
      // For text questions, clear options
      this.setCurrentQuestionOptions([]);
      this.currentQuestion.correct_answer = '';
    }
  }

  addOption() {
    const currentOptions = this.getCurrentQuestionOptionsAsArray();
    currentOptions.push(
      `Option ${String.fromCharCode(65 + currentOptions.length)}`
    );
    this.setCurrentQuestionOptions(currentOptions);
  }

  removeOption(index: number) {
    const currentOptions = this.getCurrentQuestionOptionsAsArray();
    if (currentOptions.length > 2) {
      // Don't allow removing if it would leave less than 2 options
      currentOptions.splice(index, 1);
      this.setCurrentQuestionOptions(currentOptions);

      // Update correct answer if it was the removed option
      if (this.currentQuestion.correct_answer === currentOptions[index]) {
        this.currentQuestion.correct_answer = currentOptions[0] || '';
      }
    }
  }

  async saveQuestion() {
    if (!this.editingQuiz?.id || !this.currentUser?.id) return;

    if (!this.currentQuestion.text?.trim()) {
      this.toastService.warning('Please enter a question text');
      return;
    }

    if (!this.currentQuestion.correct_answer?.trim()) {
      this.toastService.warning('Please specify the correct answer');
      return;
    }

    // Validate multiple choice questions
    if (this.currentQuestion.type === 'multiple_choice') {
      const options = this.getCurrentQuestionOptionsAsArray();
      if (options.length < 2) {
        this.toastService.warning(
          'Multiple choice questions must have at least 2 options'
        );
        return;
      }

      if (!options.includes(this.currentQuestion.correct_answer)) {
        this.toastService.warning(
          'The correct answer must be one of the available options'
        );
        return;
      }
    }

    try {
      if (this.editingQuestion) {
        // Update existing question
        const result = await this.quizService.updateQuestion(
          this.editingQuestion.id!,
          this.currentQuestion,
          this.currentUser.id
        );

        if (result.success) {
          this.toastService.success('Question updated successfully!');
          this.loadQuizQuestions(this.editingQuiz.id);
          this.cancelQuestionEdit();
        } else {
          this.toastService.error(
            result.message || 'Failed to update question'
          );
        }
      } else {
        // Add new question
        const result = await this.quizService.addQuestion(
          this.editingQuiz.id,
          this.currentQuestion as Omit<Question, 'id' | 'quiz_id'>,
          this.currentUser.id
        );

        if (result.success) {
          this.toastService.success('Question added successfully!');
          this.loadQuizQuestions(this.editingQuiz.id);
          this.currentQuestion = {
            text: '',
            type: 'text',
            correct_answer: '',
            points: 1,
            options: [],
          };
        } else {
          this.toastService.error(result.message || 'Failed to add question');
        }
      }
    } catch (error) {
      this.toastService.error('Failed to save question');
    }
  }

  editQuestion(question: Question) {
    this.editingQuestion = question;
    this.currentQuestion = {
      ...question,
      options:
        typeof question.options === 'string'
          ? JSON.parse(question.options)
          : question.options || [],
    };
  }

  cancelQuestionEdit() {
    this.editingQuestion = null;
    this.currentQuestion = {
      text: '',
      type: 'text',
      correct_answer: '',
      points: 1,
      options: [],
    };
  }

  async deleteQuestion(questionId: number) {
    if (!confirm('Are you sure you want to delete this question?')) return;

    if (!this.currentUser?.id || !this.editingQuiz?.id) return;

    try {
      const result = await this.quizService.deleteQuestion(
        questionId,
        this.currentUser.id
      );

      if (result.success) {
        this.toastService.success('Question deleted successfully!');
        this.loadQuizQuestions(this.editingQuiz.id);
      } else {
        this.toastService.error(result.message || 'Failed to delete question');
      }
    } catch (error) {
      this.toastService.error('Failed to delete question');
    }
  }

  getOptionsDisplay(options: string[] | string | undefined): string {
    if (!options) return '';
    if (typeof options === 'string') {
      try {
        const parsed = JSON.parse(options);
        return Array.isArray(parsed) ? parsed.join(', ') : options;
      } catch {
        return options;
      }
    }
    return Array.isArray(options) ? options.join(', ') : '';
  }

  getQuestionTypeDisplay(type: string): string {
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
