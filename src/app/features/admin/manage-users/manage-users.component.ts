import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth.service';
import { User } from '../../../core/models';

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-users.component.html',
  styleUrls: ['./manage-users.component.scss'],
})
export class ManageUsersComponent {
  users: Array<{
    id: number;
    username: string;
    role: 'user' | 'admin';
    _edit?: boolean;
    _password?: string;
  }> = [];
  newUsername = '';
  newPassword = '';
  newRole: 'user' | 'admin' = 'user';
  loading = false;

  constructor(private authService: AuthService) {
    this.loadUsers();
  }

  async loadUsers() {
    this.loading = true;
    try {
      const users = await this.authService.getAllUsers();
      this.users = users.map((u) => ({
        id: u.id as number,
        username: u.username,
        role: u.role,
        _edit: false,
        _password: '',
      }));
    } finally {
      this.loading = false;
    }
  }

  async addUser() {
    if (!this.newUsername || !this.newPassword) {
      alert('Username and password are required');
      return;
    }
    const result = await this.authService.register(
      this.newUsername,
      this.newPassword,
      this.newRole
    );
    if (result.success) {
      this.newUsername = '';
      this.newPassword = '';
      this.newRole = 'user';
      await this.loadUsers();
    } else {
      alert(result.message);
    }
  }

  toggleEdit(user: any) {
    user._edit = !user._edit;
    user._password = '';
  }

  async saveUser(user: any) {
    const result = await this.authService.updateUser(
      user.id,
      user.username,
      user._password || undefined,
      user.role
    );
    if (result.success) {
      user._edit = false;
      await this.loadUsers();
    } else {
      alert(result.message);
    }
  }

  async deleteUser(id: number) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    const result = await this.authService.deleteUser(id);
    if (result.success) {
      await this.loadUsers();
    } else {
      alert(result.message);
    }
  }
}
