import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuizService } from '../../../core/quiz.service';
import { AuthService } from '../../../core/auth.service';
import { Quiz, User } from '../../../core/models';

interface DashboardStats {
  totalQuizzes: number;
  activeUsers: number;
  totalAttempts: number;
  successRate: number;
}

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
  stats: DashboardStats = {
    totalQuizzes: 0,
    activeUsers: 0,
    totalAttempts: 0,
    successRate: 0
  };

  recentActivity: RecentActivity[] = [];
  isLoading = true;

  constructor(
    private router: Router,
    private quizService: QuizService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.loadDashboardData();
  }

  private async loadDashboardData() {
    try {
      this.isLoading = true;
      
      // Load live data in parallel
      const [quizzes, users] = await Promise.all([
        this.quizService.getAllQuizzes(),
        this.authService.getAllUsers()
      ]);

      // Update stats with live data
      this.stats = {
        totalQuizzes: quizzes.length,
        activeUsers: users.filter(user => user.role !== 'admin').length,
        totalAttempts: await this.getTotalAttempts(),
        successRate: await this.calculateSuccessRate()
      };

      // Generate recent activity from live data
      this.recentActivity = await this.generateRecentActivity(quizzes, users);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private async getTotalAttempts(): Promise<number> {
    // This would ideally come from a dedicated API endpoint
    // For now, we'll simulate it
    return Math.floor(Math.random() * 100) + 50;
  }

  private async calculateSuccessRate(): Promise<number> {
    // This would ideally come from quiz results data
    // For now, we'll simulate it
    return Math.floor(Math.random() * 30) + 70; // 70-100%
  }

  private async generateRecentActivity(quizzes: Quiz[], users: User[]): Promise<RecentActivity[]> {
    const activities: RecentActivity[] = [];
    
    // Add recent quiz creations (last 5)
    quizzes.slice(-3).forEach((quiz, index) => {
      activities.push({
        id: index + 1,
        type: 'quiz_created',
        message: `New quiz "${quiz.title}" was created`,
        timestamp: new Date(Date.now() - (index * 60000)), // Minutes ago
        icon: '📝'
      });
    });

    // Add recent user registrations (last 2)
    users.slice(-2).forEach((user, index) => {
      if (user.role !== 'admin') {
        activities.push({
          id: activities.length + 1,
          type: 'user_registered',
          message: `${user.username} joined the platform`,
          timestamp: new Date(Date.now() - ((index + 3) * 60000)),
          icon: '👤'
        });
      }
    });

    // Add simulated quiz completions
    for (let i = 0; i < 2; i++) {
      activities.push({
        id: activities.length + 1,
        type: 'quiz_completed',
        message: `Quiz completed with ${Math.floor(Math.random() * 30) + 70}% score`,
        timestamp: new Date(Date.now() - ((i + 5) * 60000)),
        icon: '🎯'
      });
    }

    // Sort by timestamp (newest first) and limit to 5
    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5);
  }

  // Quick action navigation methods
  navigateToCreateQuiz() {
    this.router.navigate(['/admin'], { fragment: 'create-quiz' });
  }

  navigateToQuizManagement() {
    this.router.navigate(['/admin']);
  }

  navigateToUserManagement() {
    this.router.navigate(['/admin'], { queryParams: { tab: 'users' } });
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
    return this.stats.totalQuizzes > 0 ? Math.floor(this.stats.totalQuizzes/10) : 0;
  }

  getUserGrowth(): number {
    return this.stats.activeUsers > 0 ? Math.floor(this.stats.activeUsers/5) : 0;
  }

  getAttemptGrowth(): number {
    return Math.floor(this.stats.totalAttempts/10);
  }
}
