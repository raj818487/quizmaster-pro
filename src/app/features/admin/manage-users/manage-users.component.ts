import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../../core/auth.service';
import { User } from '../../../core/models';
import { ToastService } from '../../../core/toast.service';
import { ActivityDialogComponent } from './activity-dialog/activity-dialog.component';
import { ConfirmationDialogComponent } from '../../../shared/confirmation-dialog/confirmation-dialog.component';

// Import the ExtendedUser interface from the dedicated file
import { ExtendedUser } from './user-models';

interface NewUser {
  username: string;
  password: string;
  role: 'user' | 'admin';
}

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
  ],
  templateUrl: './manage-users.component.html',
  styleUrls: ['./manage-users.component.scss'],
})
export class ManageUsersComponent implements OnInit {
  users: ExtendedUser[] = [];
  filteredUsers: ExtendedUser[] = [];
  loading = false;
  creating = false;
  showCreateUser = false;
  actionLoading = false; // For specific user actions
  loadingMessage = 'Processing...'; // Default loading message

  // Search and filter
  searchTerm = '';
  filterRole = '';
  filterStatus = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  // New user form
  newUser: NewUser = {
    username: '',
    password: '',
    role: 'user',
  };

  // Sorting
  sortBy = 'username';
  sortOrder: 'asc' | 'desc' = 'asc';

  // Selection
  selectedUsers: number[] = [];

  constructor(
    private authService: AuthService,
    private toastService: ToastService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  async loadUsers() {
    this.loading = true;
    try {
      // Clear the users array first to ensure UI shows the loading state
      this.users = [];
      this.filteredUsers = [];

      const users = await this.authService.getAllUsers();

      // Process users after a small delay to ensure changes are reflected
      setTimeout(() => {
        this.users = users.map((user) => ({
          ...user,
          _editing: false,
          email: `${user.username}@example.com`,
          status: user.status || ('active' as const),
          canCreateQuiz: user.role === 'admin',
          lastActivity: user.last_activity
            ? new Date(user.last_activity)
            : new Date(),
          isOnline: user.isOnline || false,
        }));
        this.applyFilters();
        this.loading = false;
      }, 100);
    } catch (error) {
      console.error('Failed to load users:', error);
      this.loading = false;
    }
  }

  applyFilters() {
    let filtered = [...this.users];

    if (this.searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.username.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    if (this.filterRole) {
      filtered = filtered.filter((user) => user.role === this.filterRole);
    }

    if (this.filterStatus) {
      filtered = filtered.filter((user) => user.status === this.filterStatus);
    }

    this.filteredUsers = filtered;
    this.updatePagination();
    this.applySorting();
  }

  applySorting() {
    this.filteredUsers.sort((a, b) => {
      let aValue: any = a.username;
      let bValue: any = b.username;

      switch (this.sortBy) {
        case 'username':
          aValue = a.username;
          bValue = b.username;
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
      }

      if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = Math.max(1, this.totalPages);
    }
  }

  get paginatedUsers() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredUsers.slice(start, end);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // User management methods
  startEdit(user: ExtendedUser) {
    this.users.forEach((u) => (u._editing = false));
    user._editing = true;
    user._password = '';
    user.newPassword = '';
    user.confirmPassword = '';
  }

  cancelEdit(user: ExtendedUser) {
    user._editing = false;
    user._password = '';
    user.newPassword = '';
    user.confirmPassword = '';
    this.loadUsers();
  }

  async saveUser(user: ExtendedUser) {
    try {
      if (!user.id) return;

      // Validate password fields if provided
      if (user.newPassword || user.confirmPassword) {
        if (!user.newPassword) {
          this.showToast('New password is required', 'error');
          return;
        }
        if (user.newPassword.length < 6) {
          this.showToast(
            'Password must be at least 6 characters long',
            'error'
          );
          return;
        }
        if (user.newPassword !== user.confirmPassword) {
          this.showToast('Passwords do not match', 'error');
          return;
        }
      }

      // Show immediate feedback
      this.actionLoading = true;
      this.loadingMessage = 'Updating user...';

      console.log('Updating user with status:', user.status);

      // Optimistic update - update UI immediately
      user._editing = false;
      const originalStatus = user.status; // Store original status in case we need to revert

      // Apply to local display immediately
      const userIndex = this.users.findIndex((u) => u.id === user.id);
      if (userIndex !== -1) {
        // Create a clone of the user with updated properties
        const updatedUser = {
          ...this.users[userIndex],
          ...user,
          _editing: false,
        };
        this.users[userIndex] = updatedUser;
        this.applyFilters(); // Refresh the filtered view
      }

      // Use new password if provided, otherwise keep existing password handling
      const passwordToUpdate = user.newPassword || user._password || undefined;

      // Now make the API call
      const result = await this.authService.updateUser(
        user.id,
        user.username,
        passwordToUpdate,
        user.role,
        user.status
      );

      if (result.success) {
        console.log('User updated successfully:', result);
        // Update with server data to ensure consistency
        if (result.user) {
          const index = this.users.findIndex((u) => u.id === user.id);
          if (index !== -1) {
            this.users[index] = {
              ...this.users[index],
              ...result.user,
              status: result.user.status || this.users[index].status,
              _editing: false,
              _password: '',
              newPassword: '', // Clear new password field
              confirmPassword: '', // Clear confirm password field
            };
            this.applyFilters(); // Refresh the filtered view
          }
        }
        this.showToast('User updated successfully');
      } else {
        console.error('Failed to update user:', result.message);
        this.showToast(
          'Failed to update user: ' + (result.message || 'Unknown error'),
          'error'
        );

        // Revert optimistic update if API call failed
        if (userIndex !== -1) {
          this.users[userIndex].status = originalStatus;
          this.applyFilters(); // Refresh the filtered view
        }
      }

      user._password = '';
      user.newPassword = '';
      user.confirmPassword = '';
    } catch (error) {
      console.error('Failed to update user:', error);
      this.showToast('Failed to update user', 'error');
    } finally {
      this.actionLoading = false;
    }
  }

  async deleteUser(userId: number) {
    this.dialog
      .open(ConfirmationDialogComponent, {
        width: '400px',
        data: {
          title: 'Confirm Deletion',
          message:
            'Are you sure you want to delete this user? This action cannot be undone.',
          confirmText: 'Delete',
          cancelText: 'Cancel',
          type: 'danger',
        },
      })
      .afterClosed()
      .subscribe(async (confirmed) => {
        if (confirmed) {
          try {
            this.actionLoading = true;
            this.loadingMessage = 'Deleting user...';

            await this.authService.deleteUser(userId);

            this.showToast('User deleted successfully', 'success');
            this.loadUsers();
          } catch (error) {
            console.error('Failed to delete user:', error);
            this.showToast('Failed to delete user', 'error');
          } finally {
            this.actionLoading = false;
          }
        }
      });
  }

  // Template helper methods
  getAdminCount(): number {
    return this.users.filter((user) => user.role === 'admin').length;
  }

  getActiveUsersCount(): number {
    return this.users.filter((user) => user.status === 'active').length;
  }

  exportUsers() {
    // Generate CSV data from users array
    const headers = [
      'ID',
      'Username',
      'Role',
      'Status',
      'Last Activity',
      'Email',
    ];
    const csvData = this.users.map((user) => [
      user.id || '',
      user.username,
      user.role,
      user.status || 'active',
      user.lastActivity ? user.lastActivity.toISOString() : 'Never',
      user.email || '',
    ]);

    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.join(',')),
    ].join('\n');

    // Create a download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `users_export_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  refreshUsers() {
    this.loadUsers();
  }

  filterUsers() {
    this.applyFilters();
  }

  showCreateForm() {
    this.showCreateUser = true;
    this.newUser = {
      username: '',
      password: '',
      role: 'user',
    };
  }

  hideCreateForm() {
    this.showCreateUser = false;
  }

  cancelCreateUser() {
    this.hideCreateForm();
  }

  async createUser() {
    if (!this.newUser.username || !this.newUser.password) {
      this.showToast('Username and password are required', 'error');
      return;
    }

    // Validate password length
    if (this.newUser.password.length < 6) {
      this.showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    this.creating = true;
    try {
      const result = await this.authService.register(
        this.newUser.username,
        this.newUser.password,
        this.newUser.role
      );

      if (result.success) {
        this.showToast('User created successfully', 'success');
        this.hideCreateForm();
        this.loadUsers();
      } else {
        this.showToast(result.message || 'Failed to create user', 'error');
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      this.showToast('Failed to create user', 'error');
    } finally {
      this.creating = false;
    }
  }

  getUserInitials(username: string): string {
    return username.charAt(0).toUpperCase();
  }

  getStatusDisplay(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  getLastActivity(user: ExtendedUser): string {
    if (!user.lastActivity) return 'Never';

    // Format date to show both date and time
    const now = new Date();
    const lastActivity = new Date(user.lastActivity);

    // If it was today, just show the time
    if (lastActivity.toDateString() === now.toDateString()) {
      return `Today at ${lastActivity.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }

    // If it was yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (lastActivity.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${lastActivity.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }

    // Otherwise show full date and time
    return lastActivity.toLocaleString();
  }

  isUserOnline(user: ExtendedUser): boolean {
    if (!user.lastActivity) return false;

    const lastActive = new Date(user.lastActivity).getTime();
    const now = new Date().getTime();
    const fiveMinutesInMs = 5 * 60 * 1000;

    return now - lastActive < fiveMinutesInMs;
  }

  editUser(user: ExtendedUser) {
    this.startEdit(user);
  }

  currentUserIsAdmin(): boolean {
    return this.authService.isAdmin();
  }

  viewUserActivity(user: ExtendedUser) {
    // Show loading state
    this.actionLoading = true;
    this.loadingMessage = 'Loading activity data...';

    // Add sample activity data for demonstration if not present
    if (!user.activityLog) {
      user.activityLog = [
        {
          timestamp: new Date().toISOString(),
          action: 'Login',
          details: 'User logged in from Chrome on Windows',
        },
        {
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          action: 'Quiz Completed',
          details: 'Score: 85/100',
        },
        {
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          action: 'Quiz Started',
          details: 'JavaScript Fundamentals Quiz',
        },
      ];
    }

    // Simulate API call delay
    setTimeout(() => {
      this.actionLoading = false;

      // Open dialog with user activity data
      this.dialog.open(ActivityDialogComponent, {
        data: { user },
        width: '600px',
        panelClass: 'activity-dialog-panel',
        autoFocus: false,
      });
    }, 500);
  }

  async suspendUser(user: ExtendedUser) {
    try {
      // Show immediate feedback
      this.actionLoading = true;
      this.loadingMessage = 'Suspending user...';

      console.log('Suspending user:', user.id, user.username);

      // Update UI immediately for better UX
      const originalStatus = user.status;
      user.status = 'suspended';
      this.applyFilters(); // Refresh the displayed list

      // Make API call
      const result = await this.authService.updateUser(
        user.id!,
        user.username,
        undefined,
        user.role,
        'suspended'
      );

      console.log('Suspend result:', result);

      if (result.success) {
        // Show success notification
        this.showToast('User suspended successfully');
      } else {
        console.error('Failed to suspend user:', result.message);
        this.showToast(
          'Failed to suspend user: ' + (result.message || 'Unknown error'),
          'error'
        );

        // Revert the optimistic update if API call failed
        user.status = originalStatus;
        this.applyFilters();
      }
    } catch (error) {
      console.error('Error suspending user:', error);
      this.showToast('Error suspending user', 'error');

      // Refresh from server in case of error
      this.loadUsers();
    } finally {
      this.actionLoading = false;
    }
  }

  async activateUser(user: ExtendedUser) {
    try {
      // Show immediate feedback
      this.actionLoading = true;
      this.loadingMessage = 'Activating user...';

      console.log('Activating user:', user.id, user.username);

      // Update UI immediately for better UX
      const originalStatus = user.status;
      user.status = 'active';
      this.applyFilters(); // Refresh the displayed list

      // Make API call
      const result = await this.authService.updateUser(
        user.id!,
        user.username,
        undefined,
        user.role,
        'active'
      );

      console.log('Activate result:', result);

      if (result.success) {
        // Show success notification
        this.showToast('User activated successfully');
      } else {
        console.error('Failed to activate user:', result.message);
        this.showToast(
          'Failed to activate user: ' + (result.message || 'Unknown error'),
          'error'
        );

        // Revert the optimistic update if API call failed
        user.status = originalStatus;
        this.applyFilters();
      }
    } catch (error) {
      console.error('Error activating user:', error);
      this.showToast('Error activating user', 'error');

      // Refresh from server in case of error
      this.loadUsers();
    } finally {
      this.actionLoading = false;
    }
  }

  // Show a toast message using the service
  private showToast(
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) {
    // Using the toast service
    this.toastService.show(message, type);
    console.log('Toast:', message, type);
  }

  // Selection methods
  toggleUserSelection(userId: number) {
    const index = this.selectedUsers.indexOf(userId);
    if (index > -1) {
      this.selectedUsers.splice(index, 1);
    } else {
      this.selectedUsers.push(userId);
    }
  }

  selectAllUsers() {
    this.selectedUsers = this.paginatedUsers
      .map((user) => user.id)
      .filter((id): id is number => id !== undefined);
  }

  clearSelection() {
    this.selectedUsers = [];
  }

  clearFilters() {
    this.searchTerm = '';
    this.filterRole = '';
    this.filterStatus = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  // Bulk operations
  async bulkUpdateStatus(status: 'active' | 'inactive' | 'suspended') {
    if (this.selectedUsers.length === 0) return;

    try {
      for (const userId of this.selectedUsers) {
        const user = this.users.find((u) => u.id === userId);
        if (user) {
          await this.authService.updateUser(
            userId,
            user.username,
            undefined,
            user.role,
            status
          );
        }
      }
      this.clearSelection();
      this.loadUsers();
    } catch (error) {
      console.error('Failed to bulk update status:', error);
    }
  }

  async bulkDelete() {
    if (this.selectedUsers.length === 0) return;

    this.dialog
      .open(ConfirmationDialogComponent, {
        width: '400px',
        data: {
          title: 'Confirm Bulk Deletion',
          message: `Are you sure you want to delete ${this.selectedUsers.length} user(s)? This action cannot be undone.`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          type: 'danger',
        },
      })
      .afterClosed()
      .subscribe(async (confirmed) => {
        if (confirmed) {
          try {
            this.actionLoading = true;
            this.loadingMessage = `Deleting ${this.selectedUsers.length} users...`;

            for (const userId of this.selectedUsers) {
              await this.authService.deleteUser(userId);
            }

            this.showToast(
              `Successfully deleted ${this.selectedUsers.length} users`,
              'success'
            );
            this.clearSelection();
            this.loadUsers();
          } catch (error) {
            console.error('Failed to bulk delete users:', error);
            this.showToast('Failed to delete some users', 'error');
          } finally {
            this.actionLoading = false;
          }
        }
      });
  }
}
