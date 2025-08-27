import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { QuizService } from '../../../core/quiz.service';
import { ToastService } from '../../../core/toast.service';
import { Quiz, Question, User } from '../../../core/models';
import { ToastComponent } from '../../../shared/toast/toast.component';

@Component({
  selector: 'app-quiz-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  templateUrl: './quiz-management.component.html',
  styleUrls: ['./quiz-management.component.scss'],
})
export class QuizManagementComponent implements OnInit {
  // Quiz Management Properties
  userQuizzes: Quiz[] = [];
  currentUser: User | null = null;
  currentQuestion: Partial<Question> = {
    text: '',
    type: 'multiple_choice',
    correct_answer: '',
    options: ['', '', '', ''],
    points: 10,
    quiz_id: 0,
  };
  
  // Helper method to check if an object is an array
  isArray(obj: any): boolean {
    return Array.isArray(obj);
  }
  
  // Ensure options are properly initialized
  ensureOptionsArray(): void {
    if (!this.currentQuestion.options) {
      this.currentQuestion.options = ['', '', '', ''];
    } else if (typeof this.currentQuestion.options === 'string') {
      try {
        const parsed = JSON.parse(this.currentQuestion.options);
        if (Array.isArray(parsed)) {
          this.currentQuestion.options = parsed;
        } else {
          this.currentQuestion.options = ['', '', '', ''];
        }
      } catch (e) {
        this.currentQuestion.options = ['', '', '', ''];
      }
    } else if (!Array.isArray(this.currentQuestion.options)) {
      this.currentQuestion.options = ['', '', '', ''];
    }
  }
  
  // Get options as string array for template
  getOptionsAsStringArray(): string[] {
    this.ensureOptionsArray();
    return this.currentQuestion.options as string[];
  }
  
  // Update option value from input event
  updateOption(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    
    this.ensureOptionsArray();
    const options = this.currentQuestion.options as string[];
    
    // Update the correct answer if it was the old value
    if (this.currentQuestion.correct_answer === options[index]) {
      this.currentQuestion.correct_answer = value;
    }
    
    options[index] = value;
  }
  getCurrentQuestionOptionsAsArray(): string[] {
    if (this.currentQuestion.options) {
      if (Array.isArray(this.currentQuestion.options)) {
        return this.currentQuestion.options;
      } else if (typeof this.currentQuestion.options === 'string') {
        try {
          const parsed = JSON.parse(this.currentQuestion.options);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch (e) {
          console.error('Error parsing options:', e);
          // If string but not valid JSON, return empty array
        }
      }
    }
    return [];
  }
  
  onQuestionTypeChange(): void {
    const type = this.currentQuestion.type;
    
    if (type === 'multiple_choice') {
      // Ensure we have at least 4 options for multiple choice
      const options = this.getOptionsAsStringArray();
      while (options.length < 4) {
        options.push('');
      }
    } else if (type === 'true_false') {
      this.currentQuestion.options = ['True', 'False'];
      if (!['True', 'False'].includes(this.currentQuestion.correct_answer || '')) {
        this.currentQuestion.correct_answer = 'True';
      }
    } else {
      // Text type
      this.currentQuestion.options = [];
      this.currentQuestion.correct_answer = '';
    }
  }
  
  addOption(): void {
    const options = this.getOptionsAsStringArray();
    options.push('');
  }
  
  removeOption(index: number): void {
    const options = this.getOptionsAsStringArray();
    // Don't remove if it would leave fewer than 2 options
    if (options.length > 2) {
      // If removing the correct answer, reset it
      if (this.currentQuestion.correct_answer === options[index]) {
        this.currentQuestion.correct_answer = '';
      }
      options.splice(index, 1);
    }
  }
  
  // Method to set the correct answer
  setCorrectAnswer(option: string): void {
    this.currentQuestion.correct_answer = option;
  }

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
  
  // Helper for tracking in ngFor loops
  trackByIndex(index: number): number {
    return index;
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private quizService: QuizService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadUserQuizzes();
    this.currentUser = this.authService.getCurrentUser();
    
    // Ensure options are properly initialized
    this.getOptionsAsStringArray();
    
    // Check for fragment to show create quiz form
    this.route.fragment.subscribe(fragment => {
      if (fragment === 'create-quiz') {
        this.showNewQuizForm = true;
      }
    });
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

  deleteConfirmation: { visible: boolean; quiz: Quiz | null } = {
    visible: false,
    quiz: null
  };

  showDeleteConfirmation(quiz: Quiz): void {
    this.deleteConfirmation.quiz = quiz;
    this.deleteConfirmation.visible = true;
  }

  hideDeleteConfirmation(): void {
    this.deleteConfirmation.visible = false;
    this.deleteConfirmation.quiz = null;
  }
  
  async deleteQuiz(quiz: Quiz): Promise<void> {
    this.hideDeleteConfirmation();

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
        if (this.selectedQuiz?.id === quiz.id) {
          this.selectedQuiz = null;
          this.selectedQuizQuestions = [];
        }
        this.toastService.success('Quiz deleted successfully!');
      } else {
        this.toastService.error(result.message);
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      this.toastService.error('Failed to delete quiz');
    }
  }

  selectQuiz(quiz: Quiz): void {
    this.selectedQuiz = quiz;
    this.loadQuizQuestions();
  }
  
  editQuiz(quiz: Quiz): void {
    this.editingQuiz = { ...quiz };
  }

  resetNewQuiz(): void {
    this.newQuiz = {
      title: '',
      description: '',
      is_public: false,
    };
  }

  async loadQuizQuestions(): Promise<void> {
    if (!this.selectedQuiz?.id) return;

    this.loadingQuestions = true;

    try {
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

  // Helper function is already defined above

  // Question Management Methods
  async createQuestion(): Promise<void> {
    if (!this.selectedQuiz) return;

    try {
      if (!this.currentQuestion.text || !this.currentQuestion.correct_answer) {
        this.toastService.error('Please fill in all required fields');
        return;
      }

      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.id) {
        this.toastService.error('User not authenticated');
        return;
      }

      // Validate multiple choice options
      if (this.currentQuestion.type === 'multiple_choice') {
        // Get options as array regardless of current format
        let optionsArray: string[] = [];
        if (Array.isArray(this.currentQuestion.options)) {
          optionsArray = this.currentQuestion.options;
        } else if (typeof this.currentQuestion.options === 'string') {
          try {
            const parsed = JSON.parse(this.currentQuestion.options);
            if (Array.isArray(parsed)) {
              optionsArray = parsed;
            }
          } catch {
            // If parsing fails, keep optionsArray empty
          }
        }
        
        // Filter out empty options
        const nonEmptyOptions = optionsArray.filter(
          (opt: string) => opt.trim() !== ''
        );
        
        if (nonEmptyOptions.length < 2) {
          this.toastService.error(
            'Multiple choice questions need at least 2 options'
          );
          return;
        }
        
        // Check if correct answer is in the options
        if (!nonEmptyOptions.includes(this.currentQuestion.correct_answer || '')) {
          this.toastService.error('Correct answer must be one of the options');
          return;
        }
        
        // Ensure options are stored as an array
        this.currentQuestion.options = nonEmptyOptions;
      }

      const result = await this.quizService.addQuestion(
        this.selectedQuiz.id!,
        {
          text: this.currentQuestion.text!,
          type: this.currentQuestion.type!,
          correct_answer: this.currentQuestion.correct_answer!,
          options: this.currentQuestion.options,
          points: this.currentQuestion.points,
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
      
      // Process options to ensure they are in the correct format before updating
      if (this.currentQuestion.type === 'multiple_choice') {
        const optionsArray = Array.isArray(this.currentQuestion.options)
          ? this.currentQuestion.options
          : typeof this.currentQuestion.options === 'string'
            ? JSON.parse(this.currentQuestion.options as string)
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
        if (!nonEmptyOptions.includes(this.currentQuestion.correct_answer || '')) {
          this.toastService.error('Correct answer must be one of the options');
          return;
        }
        this.currentQuestion.options = nonEmptyOptions;
      }
      
      // Update the editing question with current values
      const updatedQuestion = {
        ...this.editingQuestion,
        text: this.currentQuestion.text,
        type: this.currentQuestion.type,
        correct_answer: this.currentQuestion.correct_answer,
        options: this.currentQuestion.options,
        points: this.currentQuestion.points
      };

      const result = await this.quizService.updateQuestion(
        this.editingQuestion.id!,
        updatedQuestion,
        currentUser.id
      );

      if (result.success) {
        this.editingQuestion = null;
        this.showNewQuestionForm = false;
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

  questionDeleteConfirmation: { visible: boolean; questionId: number | null } = {
    visible: false,
    questionId: null
  };

  showDeleteQuestionConfirmation(questionId: number): void {
    this.questionDeleteConfirmation.questionId = questionId;
    this.questionDeleteConfirmation.visible = true;
  }

  hideDeleteQuestionConfirmation(): void {
    this.questionDeleteConfirmation.visible = false;
    this.questionDeleteConfirmation.questionId = null;
  }

  async deleteQuestion(questionId: number): Promise<void> {
    this.hideDeleteQuestionConfirmation();

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

  resetNewQuestion(): void {
    this.newQuestion = {
      text: '',
      type: 'multiple_choice',
      correct_answer: '',
      options: ['', '', '', ''],
      points: 10,
      quiz_id: 0,
    };
    
    this.currentQuestion = {
      text: '',
      type: 'multiple_choice',
      correct_answer: '',
      options: ['', '', '', ''],
      points: 10,
      quiz_id: 0,
    };
  }

  editQuestion(question: Question): void {
    // Store original question for reference
    this.editingQuestion = { ...question };
    
    // Create a deep copy for editing
    const questionCopy = { ...question };
    
    // Ensure options are properly formatted as an array
    if (question.options) {
      if (typeof question.options === 'string') {
        try {
          const parsedOptions = JSON.parse(question.options);
          if (Array.isArray(parsedOptions)) {
            questionCopy.options = parsedOptions;
          } else {
            questionCopy.options = ['', '', '', ''];
          }
        } catch (e) {
          console.error('Error parsing options:', e);
          questionCopy.options = ['', '', '', ''];
        }
      } else if (Array.isArray(question.options)) {
        questionCopy.options = [...question.options];
      } else {
        questionCopy.options = ['', '', '', ''];
      }
    } else {
      questionCopy.options = ['', '', '', ''];
    }
    
    this.currentQuestion = questionCopy;
    this.showNewQuestionForm = true;
  }

  cancelEdit(): void {
    this.editingQuiz = null;
    this.editingQuestion = null;
    this.showNewQuizForm = false;
  }
  
  cancelQuestionEdit(): void {
    this.showNewQuestionForm = false;
    this.editingQuestion = null;
    this.resetNewQuestion();
  }
  
  saveQuestion(): void {
    if (this.editingQuestion) {
      this.updateQuestion();
    } else {
      this.createQuestion();
    }
  }

  goBackToDashboard(): void {
    this.router.navigate(['/admin']);
  }
  
  // Helper method to get options as array
  getOptionsAsArray(options: string[] | string | undefined): string[] {
    if (!options) return [];
    
    // If already an array, return it
    if (Array.isArray(options)) return options;
    
    // If it's a string, try parsing it
    if (typeof options === 'string') {
      try {
        const parsedOptions = JSON.parse(options);
        if (Array.isArray(parsedOptions)) {
          return parsedOptions;
        }
        // If the parsed result isn't an array, return it in an array
        return [String(parsedOptions)];
      } catch (e) {
        console.warn('Failed to parse options string:', options);
        // Edge case: if the string looks like it was double-encoded
        if (options.startsWith('"[') && options.endsWith(']"')) {
          try {
            return JSON.parse(JSON.parse(options));
          } catch {
            // If double parsing fails, return the original string in an array
            return [options];
          }
        }
        // If it's a string but not valid JSON, return it as a single item array
        return [options];
      }
    }
    
    return [];
  }
}
