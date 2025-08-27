import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DashboardStats {
  totalQuizzes: number;
  totalUsers: number;
  activeUsers: number;
  totalAttempts: number;
  completedAttempts: number;
  successRate: number;
  averageScore: number;
  recentQuizzes: RecentQuiz[];
  recentAttempts: RecentAttempt[];
}

export interface RecentQuiz {
  title: string;
  created_at: string;
  created_by: string;
}

export interface RecentAttempt {
  completed_at: string;
  score: number;
  total_questions: number;
  username: string;
  quiz_title: string;
}

export interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  pendingAccessRequests: number;
  systemHealthScore: number;
  storageUsed: number;
  recentUsers: RecentUser[];
  dailyActivity: DailyActivity[];
}

export interface RecentUser {
  username: string;
  role: string;
  last_activity: string;
}

export interface DailyActivity {
  date: string;
  attempts: number;
}

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private apiUrl = environment.apiUrl || '/api';

  constructor(private http: HttpClient) {}

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/stats`)
      );
      
      if (response.success) {
        return response.stats;
      } else {
        throw new Error(response.message || 'Failed to fetch dashboard stats');
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  async getAdminMetrics(): Promise<AdminMetrics> {
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/admin/metrics`)
      );
      
      if (response.success) {
        return response.metrics;
      } else {
        throw new Error(response.message || 'Failed to fetch admin metrics');
      }
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
      throw error;
    }
  }
}
