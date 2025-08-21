import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QuizService } from '../../../core/quiz.service';
import { Quiz, Question } from '../../../core/models';

@Component({
  selector: 'app-quiz-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quiz-page.html',
  styleUrls: ['./quiz-page.scss'],
})
export class QuizPageComponent implements OnInit {
  quizzes: Quiz[] = [];
  selectedQuiz: Quiz | null = null;
  questions: Question[] = [];
  currentIndex = 0;
  answers: { [key: number]: string } = {};
  showReview = false;
  showResults = false;
  score = 0;
  results: any[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private quizService: QuizService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    try {
      this.loading = true;
      this.error = null;
      this.cdr.detectChanges();

      // Check if we have a specific quiz ID from route params
      const quizId = this.route.snapshot.params['id'];

      if (quizId) {
        console.log('Loading specific quiz with ID:', quizId);
        await this.loadSpecificQuiz(parseInt(quizId));
      } else {
        console.log('Loading all quizzes for selection');
        await this.loadQuizzes();
      }
    } catch (error) {
      console.error('Error in ngOnInit:', error);
      this.error = 'Failed to load quiz data';
      this.cdr.detectChanges();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async loadQuizzes() {
    try {
      console.log('Fetching quizzes...');
      this.quizzes = await this.quizService.getAllQuizzes();
      console.log('Loaded quizzes:', this.quizzes);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading quizzes:', error);
      this.error = 'Failed to load quizzes';
      this.cdr.detectChanges();
      throw error;
    }
  }

  async loadSpecificQuiz(quizId: number) {
    try {
      console.log('Loading specific quiz with ID:', quizId);

      // First load all quizzes to find the specific one
      await this.loadQuizzes();

      // Find the quiz by ID
      const quiz = this.quizzes.find((q) => q.id === quizId);
      if (!quiz) {
        throw new Error(`Quiz with ID ${quizId} not found`);
      }

      console.log('Found quiz:', quiz);
      this.selectedQuiz = quiz;
      this.cdr.detectChanges();

      // Load questions for this quiz
      await this.loadQuestions(quizId);
    } catch (error) {
      console.error('Error loading specific quiz:', error);
      this.error = `Failed to load quiz: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      this.cdr.detectChanges();
      throw error;
    }
  }

  async selectQuiz(quiz: Quiz) {
    try {
      this.loading = true;
      this.error = null;
      this.selectedQuiz = quiz;
      this.cdr.detectChanges();

      console.log('Selected quiz:', quiz);
      await this.loadQuestions(quiz.id!);
    } catch (error) {
      console.error('Error selecting quiz:', error);
      this.error = 'Failed to load quiz questions';
      this.cdr.detectChanges();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async loadQuestions(quizId: number) {
    try {
      console.log('Loading questions for quiz ID:', quizId);
      this.questions = await this.quizService.getQuestions(quizId);
      console.log('Loaded questions:', this.questions);

      if (this.questions.length === 0) {
        console.warn('No questions found for quiz');
      }

      this.currentIndex = 0;
      this.answers = {};
      this.showReview = false;
      this.showResults = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading questions:', error);
      this.error = 'Failed to load quiz questions';
      this.cdr.detectChanges();
      throw error;
    }
  }

  next() {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.cdr.detectChanges();
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.cdr.detectChanges();
    }
  }

  isLastQuestion(): boolean {
    return this.currentIndex === this.questions.length - 1;
  }

  review() {
    this.showReview = true;
    this.cdr.detectChanges();
  }

  backToQuiz() {
    this.showReview = false;
    this.cdr.detectChanges();
  }

  async submitQuiz() {
    try {
      this.loading = true;
      this.cdr.detectChanges();

      console.log('Submitting quiz with answers:', this.answers);

      // Calculate score manually for now
      let correctAnswers = 0;
      const results: any[] = [];

      for (const question of this.questions) {
        if (question.id !== undefined) {
          const userAnswer = this.answers[question.id] || '';
          const isCorrect =
            userAnswer.toLowerCase().trim() ===
            question.correct_answer?.toLowerCase().trim();

          if (isCorrect) {
            correctAnswers++;
          }

          results.push({
            question: question,
            userAnswer: userAnswer,
            correctAnswer: question.correct_answer,
            isCorrect: isCorrect,
          });
        }
      }

      this.score = Math.round((correctAnswers / this.questions.length) * 100);
      this.results = results;
      this.showReview = false;
      this.showResults = true;
      this.cdr.detectChanges();

      console.log('Quiz completed with score:', this.score);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      this.error = 'Failed to submit quiz';
      this.cdr.detectChanges();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  getCorrectAnswersCount(): number {
    return this.results.filter((r) => r.isCorrect).length;
  }

  backToQuizSelection() {
    this.selectedQuiz = null;
    this.questions = [];
    this.currentIndex = 0;
    this.answers = {};
    this.showReview = false;
    this.showResults = false;
    this.score = 0;
    this.results = [];
    this.error = null;
    this.cdr.detectChanges();

    // Navigate back to user dashboard or quiz selection
    this.router.navigate(['/user-dashboard']);
  }
}
