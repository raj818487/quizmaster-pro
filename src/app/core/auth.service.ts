import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { User } from './models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = '/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Check for stored user session only in browser
    if (isPlatformBrowser(this.platformId)) {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        this.currentUserSubject.next(JSON.parse(storedUser));
      }
    }
  }

  async login(
    username: string,
    password: string
  ): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const resp: any = await firstValueFrom(
        this.http.post(`${this.apiUrl}/auth/login`, { username, password })
      );
      if (resp?.success && resp.user) {
        const user = resp.user as User;
        this.currentUserSubject.next(user);
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('currentUser', JSON.stringify(user));
        }
        return { success: true, user, message: 'Login successful' };
      }
      return {
        success: false,
        message: resp?.message || 'Invalid credentials',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Login failed. Please try again.',
      };
    }
  }

  async register(
    username: string,
    password: string,
    role: 'user' | 'admin' = 'user'
  ): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const resp: any = await firstValueFrom(
        this.http.post(`${this.apiUrl}/auth/register`, {
          username,
          password,
          role,
        })
      );
      if (resp?.success) {
        return {
          success: true,
          user: resp.user as User,
          message: 'Registration successful',
        };
      }
      return {
        success: false,
        message: resp?.message || 'Registration failed',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Registration failed. Please try again.',
      };
    }
  }

  logout(): void {
    this.currentUserSubject.next(null);

    // Only use localStorage in browser
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('currentUser');
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const users =
        (await firstValueFrom(this.http.get<User[]>(`${this.apiUrl}/users`))) ||
        [];
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  async deleteUser(
    userId: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const resp: any = await firstValueFrom(
        this.http.delete(`/api/users/${userId}`)
      );
      if (resp?.success)
        return { success: true, message: 'User deleted successfully' };
      return { success: false, message: resp?.message || 'User not found' };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete user',
      };
    }
  }

  async updateUser(
    id: number,
    username: string,
    password: string | undefined,
    role: 'user' | 'admin'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const body: any = { username, role };
      if (password) body.password = password;
      const resp: any = await firstValueFrom(
        this.http.put(`/api/users/${id}`, body)
      );
      if (resp?.success)
        return { success: true, message: 'User updated successfully' };
      return {
        success: false,
        message: resp?.message || 'Failed to update user',
      };
    } catch (e) {
      return { success: false, message: 'Failed to update user' };
    }
  }
}
