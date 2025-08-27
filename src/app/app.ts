import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthService } from './core/auth.service';
import { PwaService } from './core/pwa.service';
import { ToastComponent } from './shared/toast/toast.component';
import { ToastContainerComponent } from './shared/toast-container/toast-container.component';
import { PwaInstallComponent } from './shared/pwa-install/pwa-install.component';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    MenubarModule,
    ButtonModule,
    ToastModule,
    ProgressSpinnerModule,
    ToastComponent,
    ToastContainerComponent,
    PwaInstallComponent,
  ],
  providers: [MessageService],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit {
  protected title = 'QuizMaster Pro';
  menuItems: MenuItem[] = [];
  isLoading = false;

  constructor(
    public authService: AuthService,
    private router: Router,
    private messageService: MessageService,
    private pwaService: PwaService
  ) {}

  ngOnInit() {
    this.initializeMenuItems();

    // Subscribe to auth state changes
    this.authService.currentUser$.subscribe((user) => {
      this.updateMenuItems(user);
    });
  }

  private initializeMenuItems() {
    const user = this.authService.getCurrentUser();
    this.updateMenuItems(user);
  }

  private updateMenuItems(user: any) {
    if (!user) {
      this.menuItems = [];
      return;
    }

    // For regular users, show only user dashboard
    if (user.role !== 'admin') {
      this.menuItems = [
        {
          label: 'My Quizzes',
          icon: 'pi pi-book',
          routerLink: '/user-dashboard',
        },
      ];
      return;
    }

    // For admin users, show all menu items
    this.menuItems = [
      {
        label: 'Dashboard',
        icon: 'pi pi-home',
        routerLink: '/dashboard',
      },
      {
        label: 'User Dashboard',
        icon: 'pi pi-user',
        routerLink: '/user-dashboard',
      },
      {
        label: 'Quizzes',
        icon: 'pi pi-book',
        items: [
          {
            label: 'Take Quiz',
            icon: 'pi pi-play',
            routerLink: '/quiz',
          },
          {
            label: 'My Results',
            icon: 'pi pi-chart-line',
            routerLink: '/results',
          },
        ],
      },
      {
        label: 'Manage User',
        icon: 'pi pi-users',
        routerLink: '/admin/manage-users',
      },
      {
        label: 'Quiz Management',
        icon: 'pi pi-book',
        items: [
          {
            label: 'Quiz Add-Remove',
            icon: 'pi pi-book',
            routerLink: '/admin/quiz-management',
          },
          {
            label: 'Manage Quiz Access',
            icon: 'pi pi-book',
            routerLink: '/admin/quiz-access',
          },
        ],
      },
    ];
  }

  logout() {
    this.authService.logout();
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Logged out successfully',
    });
    this.router.navigate(['/auth']);
  }

  showLoading() {
    this.isLoading = true;
  }

  hideLoading() {
    this.isLoading = false;
  }
}
