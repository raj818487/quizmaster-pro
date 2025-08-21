import { Routes } from '@angular/router';
import { QuizPageComponent } from './features/quiz/quiz-page/quiz-page';
import { AuthPage } from './features/auth/auth-page/auth-page';
import { AdminPage } from './features/admin/admin-page/admin-page';
import { DashboardPage } from './features/dashboard/dashboard-page/dashboard-page';
import { UserDashboardPage } from './features/user-dashboard/user-dashboard-page';
import { ManageUsersComponent } from './features/admin/manage-users/manage-users.component';
// Temporarily commenting out until module issue is resolved
// import { QuizManagementComponent } from './features/admin/quiz-management/quiz-management.component';

function adminGuard() {
  // lightweight inline guard; replace with proper CanActivate if needed
  const userRaw =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('currentUser')
      : null;
  const user = userRaw ? JSON.parse(userRaw) : null;
  return !!user && user.role === 'admin';
}

export const routes: Routes = [
  { path: '', redirectTo: 'auth', pathMatch: 'full' },
  { path: 'quiz', component: QuizPageComponent },
  { path: 'quiz/:id', component: QuizPageComponent },
  { path: 'auth', component: AuthPage },
  { path: 'admin', component: AdminPage },
  // Temporarily disabled until module issue is resolved
  // { path: 'admin/quiz-management', component: QuizManagementComponent, canActivate: [adminGuard] as any },
  {
    path: 'admin/manage-users',
    component: ManageUsersComponent,
    canActivate: [adminGuard] as any,
  },
  { path: 'dashboard', component: DashboardPage },
  { path: 'user-dashboard', component: UserDashboardPage },
  { path: '**', redirectTo: 'auth' }, // Wildcard route for 404s
];
