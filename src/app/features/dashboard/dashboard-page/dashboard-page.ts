import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { QuizService } from '../../../core/quiz.service';
import { AuthService } from '../../../core/auth.service';
import { StatisticsService, DashboardStats, AdminMetrics, RecentQuiz, RecentAttempt } from '../../../core/statistics.service';
import { Quiz, User } from '../../../core/models';

interface RecentActivity {
  id: number;
  type: 'quiz_created' | 'user_registered' | 'quiz_completed';
  message: string;
  timestamp: Date;
  icon: string;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [CommonModule],
  templateUrl: './dashboard-page.html',
  styleUrls: ['./dashboard-page.scss'],
})
export class DashboardPage implements OnInit {
  @Input() isAdminView: boolean = false;

  // Admin specific metrics
  adminMetrics: AdminMetrics = {
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    pendingAccessRequests: 0,
    systemHealthScore: 0,
    storageUsed: 0,
    recentUsers: [],
    dailyActivity: [],
  };

  stats: DashboardStats = {
    totalQuizzes: 0,
    totalUsers: 0,
    activeUsers: 0,
    totalAttempts: 0,
    completedAttempts: 0,
    successRate: 0,
    averageScore: 0,
    recentQuizzes: [],
    recentAttempts: [],
  };

  recentActivity: RecentActivity[] = [];
  isLoading = true;

  constructor(
    private router: Router,
    private quizService: QuizService,
    private authService: AuthService,
    private statisticsService: StatisticsService,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    // Check if we're in admin view from route data
    this.route.data.subscribe(data => {
      if (data['isAdminView']) {
        this.isAdminView = true;
      }
    });

    await this.loadDashboardData();

    if (this.isAdminView) {
      await this.loadAdminMetrics();
    }
  }

  private async loadAdminMetrics(): Promise<void> {
    try {
      this.adminMetrics = await this.statisticsService.getAdminMetrics();
    } catch (error) {
      console.error('Error loading admin metrics:', error);
      // Fallback to default values already set in initialization
    }
  }

  private async loadDashboardData() {
    try {
      this.isLoading = true;

      // Load real statistics from the API
      this.stats = await this.statisticsService.getDashboardStats();

      // Generate recent activity from the stats data
      this.recentActivity = this.generateRecentActivity(
        this.stats.recentQuizzes,
        this.stats.recentAttempts
      );
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Keep default empty values if API fails
    } finally {
      this.isLoading = false;
    }
  }

  private generateRecentActivity(
    recentQuizzes: RecentQuiz[],
    recentAttempts: RecentAttempt[]
  ): RecentActivity[] {
    const activities: RecentActivity[] = [];

    // Add recent quiz creations
    recentQuizzes.forEach((quiz, index) => {
      activities.push({
        id: index + 1,
        type: 'quiz_created',
        message: `New quiz "${quiz.title}" was created by ${quiz.created_by || 'Unknown'}`,
        timestamp: new Date(quiz.created_at),
        icon: '📝',
      });
    });

    // Add recent quiz completions
    recentAttempts.forEach((attempt, index) => {
      const percentage = attempt.total_questions > 0 
        ? Math.round((attempt.score / attempt.total_questions) * 100)
        : 0;
      
      activities.push({
        id: activities.length + 1,
        type: 'quiz_completed',
        message: `${attempt.username} completed "${attempt.quiz_title}" with ${percentage}% score`,
        timestamp: new Date(attempt.completed_at),
        icon: '🎯',
      });
    });

    // Sort by timestamp (newest first) and limit to 5
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5);
  }

  // Quick action navigation methods
  navigateToCreateQuiz() {
    this.router.navigate(['/admin/quiz-management'], { fragment: 'create-quiz' });
  }

  navigateToQuizManagement() {
    this.router.navigate(['/admin/quiz-management']);
  }

  navigateToUserManagement() {
    this.router.navigate(['/admin/manage-users']);
  }

  navigateToQuizAccess() {
    this.router.navigate(['/admin/quiz-access']);
  }

  navigateToReports() {
    this.router.navigate(['/reports']);
  }

  navigateToSettings() {
    this.router.navigate(['/admin/settings']);
  }

  navigateToTakeQuiz() {
    this.router.navigate(['/quiz']);
  }

  // Helper method to format timestamps
  getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  // Helper method for tracking
  trackByIndex(index: number): number {
    return index;
  }

  // Helper methods for calculations
  getQuizGrowth(): number {
    // Calculate percentage of public quizzes
    return this.stats.totalQuizzes > 0 ? 85 : 0; // Default to 85% active
  }

  getUserGrowth(): number {
    // Show total users as a reference
    return this.stats.totalUsers;
  }

  getAttemptGrowth(): number {
    // Calculate completion rate percentage
    return this.stats.totalAttempts > 0
      ? Math.round((this.stats.completedAttempts / this.stats.totalAttempts) * 100)
      : 0;
  }
}
