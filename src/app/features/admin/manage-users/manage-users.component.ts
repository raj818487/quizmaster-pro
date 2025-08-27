import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth.service';
import { User } from '../../../core/models';

interface ExtendedUser extends User {
  _editing?: boolean;
  _password?: string;
  email?: string;
  status?: 'active' | 'inactive' | 'suspended';
  canCreateQuiz?: boolean;
  lastActivity?: Date;
  isOnline?: boolean;
}

interface NewUser {
  username: string;
  password: string;
  role: 'user' | 'admin';
}

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-users.component.html',
  styleUrls: ['./manage-users.component.scss'],
})
export class ManageUsersComponent implements OnInit {
  users: ExtendedUser[] = [];
  filteredUsers: ExtendedUser[] = [];
  loading = false;
  creating = false;
  showCreateUser = false;

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

  constructor(private authService: AuthService) {}

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
  }

  cancelEdit(user: ExtendedUser) {
    user._editing = false;
    user._password = '';
    this.loadUsers();
  }

  async saveUser(user: ExtendedUser) {
    try {
      if (!user.id) return;

      await this.authService.updateUser(
        user.id,
        user.username,
        user._password || undefined,
        user.role
      );
      user._editing = false;
      user._password = '';
      this.loadUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  }

  async deleteUser(userId: number) {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await this.authService.deleteUser(userId);
        this.loadUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  }

  // Template helper methods
  getAdminCount(): number {
    return this.users.filter((user) => user.role === 'admin').length;
  }

  getActiveUsersCount(): number {
    return this.users.filter((user) => user.status === 'active').length;
  }

  exportUsers() {
    console.log('Export users functionality');
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
      return;
    }

    this.creating = true;
    try {
      await this.authService.register(
        this.newUser.username,
        this.newUser.password,
        this.newUser.role
      );
      this.hideCreateForm();
      this.loadUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
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
    return user.lastActivity ? user.lastActivity.toLocaleDateString() : 'Never';
  }

  isUserOnline(user: ExtendedUser): boolean {
    return user.isOnline || false;
  }

  editUser(user: ExtendedUser) {
    this.startEdit(user);
  }

  currentUserIsAdmin(): boolean {
    return this.authService.isAdmin();
  }

  async viewUserActivity(user: ExtendedUser) {
    try {
      const response = await fetch(
        `${this.authService['apiUrl']}/users/${user.id}/activity`
      );
      if (response.ok) {
        const data = await response.json();
        console.log('User activity data:', data);

        // Here you would typically display this information in a modal or details panel
        // For now we'll just create a simple alert with the info
        const activityInfo = `
User: ${data.user.username}
Status: ${data.user.status}
Last Active: ${new Date(data.user.last_activity).toLocaleString()}
Online: ${data.user.isOnline ? 'Yes' : 'No'}
Recent Quiz Attempts: ${data.activity.attempts.length}
Access Requests: ${data.activity.accessRequests.length}
        `;
        alert(activityInfo);
      } else {
        console.error('Failed to fetch user activity');
      }
    } catch (error) {
      console.error('Error fetching user activity:', error);
    }
  }

  async suspendUser(user: ExtendedUser) {
    try {
      const result = await this.authService.updateUser(
        user.id!,
        user.username,
        undefined,
        user.role,
        'suspended'
      );

      if (result.success) {
        user.status = 'suspended';
        this.loadUsers(); // Reload to get the latest state
      } else {
        console.error('Failed to suspend user');
      }
    } catch (error) {
      console.error('Error suspending user:', error);
    }
  }

  async activateUser(user: ExtendedUser) {
    try {
      const result = await this.authService.updateUser(
        user.id!,
        user.username,
        undefined,
        user.role,
        'active'
      );

      if (result.success) {
        user.status = 'active';
        this.loadUsers(); // Reload to get the latest state
      } else {
        console.error('Failed to activate user');
      }
    } catch (error) {
      console.error('Error activating user:', error);
    }
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

    if (
      confirm(
        `Are you sure you want to delete ${this.selectedUsers.length} user(s)?`
      )
    ) {
      try {
        for (const userId of this.selectedUsers) {
          await this.authService.deleteUser(userId);
        }
        this.clearSelection();
        this.loadUsers();
      } catch (error) {
        console.error('Failed to bulk delete users:', error);
      }
    }
  }
}
