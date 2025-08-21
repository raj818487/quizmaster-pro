import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-page',
  imports: [CommonModule],
  templateUrl: './dashboard-page.html',
  styleUrls: ['./dashboard-page.scss'],
})
export class DashboardPage {
  totalQuizzes: number = 12;
  activeUsers: number = 5;
  recentActivity: string[] = [
    'User1 completed Quiz A',
    'User2 created Quiz B',
    'User3 logged in',
  ];
}
