import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-auth-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-page.html',
  styleUrls: ['./auth-page.scss'],
})
export class AuthPage implements OnInit {
  username = '';
  password = '';
  role: 'user' | 'admin' = 'user';
  isRegister = false;
  message = '';

  constructor(private auth: AuthService, private router: Router) {
    this.auth.currentUser$.subscribe((user) => {
      if (user) {
        if (user.role === 'admin') {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/user-dashboard']);
        }
      }
    });
  }

  async ngOnInit() {
    // no-op
  }

  // removed Electron DB init

  async login() {
    try {
      const result = await this.auth.login(this.username, this.password);
      if (result.success && result.user) {
        this.message = 'Login successful!';
        // Navigation handled by subscription above
      } else {
        this.message = 'Invalid credentials.';
      }
    } catch (error) {
      this.message = 'Login failed. Please try again.';
    }
  }

  async register() {
    const res = await this.auth.register(
      this.username,
      this.password,
      this.role
    );
    if (res.success) {
      this.message = 'Registration successful!';
      this.isRegister = false;
    } else {
      this.message = res.message || 'Registration failed.';
    }
  }
}
