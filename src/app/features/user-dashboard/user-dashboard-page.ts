import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizService } from '../../core/quiz.service';
import { AuthService } from '../../core/auth.service';
import { Quiz, User } from '../../core/models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-dashboard-page.html',
  styleUrls: ['./user-dashboard-page.scss'],
})
export class UserDashboardPage implements OnInit {
  currentUser: User | null = null;
  allQuizzes: Quiz[] = [];
  userQuizzes: Quiz[] = [];
  publicQuizzes: Quiz[] = [];
  activeCategory = 'all';
  loading = false;
  error = '';

  constructor(
    private quizService: QuizService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      if (user) {
        this.loadQuizzes();
      }
    });
  }

  async loadQuizzes() {
    if (!this.currentUser?.id) return;

    this.loading = true;
    this.error = '';

    try {
      // Load all available quizzes
      const [userQuizzes, publicQuizzes] = await Promise.all([
        this.quizService.getUserQuizzes(this.currentUser.id),
        this.quizService.getPublicQuizzes(),
      ]);

      this.userQuizzes = userQuizzes;
      this.publicQuizzes = publicQuizzes;

      // Combine and deduplicate
      const quizMap = new Map();
      [...userQuizzes, ...publicQuizzes].forEach((quiz) => {
        if (!quizMap.has(quiz.id)) {
          quizMap.set(quiz.id, quiz);
        }
      });

      this.allQuizzes = Array.from(quizMap.values());
    } catch (error) {
      this.error = 'Failed to load quizzes. Please try again.';
      console.error('Error loading quizzes:', error);
    } finally {
      this.loading = false;
    }
  }

  setActiveCategory(category: string) {
    this.activeCategory = category;
  }

  get filteredQuizzes(): Quiz[] {
    switch (this.activeCategory) {
      case 'my':
        return this.userQuizzes;
      case 'public':
        return this.publicQuizzes;
      default:
        return this.allQuizzes;
    }
  }

  getEmptyMessage(): string {
    switch (this.activeCategory) {
      case 'my':
        return "You don't have access to any personal quizzes yet.";
      case 'public':
        return 'No public quizzes are available right now.';
      default:
        return 'No quizzes are available at the moment.';
    }
  }

  startQuiz(quiz: Quiz) {
    if (quiz.id) {
      this.router.navigate(['/quiz', quiz.id]);
    }
  }

  viewQuizDetails(quiz: Quiz) {
    // You could implement a modal or navigate to a details page
    alert(
      `Quiz: ${quiz.title}\nDescription: ${quiz.description}\nTime Limit: ${
        quiz.time_limit ? quiz.time_limit + ' minutes' : 'No limit'
      }`
    );
  }
}
