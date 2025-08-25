import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { User, Quiz, Question } from './models';

/**
 * This service is deprecated and kept only for backwards compatibility.
 * All database operations should now use the corresponding API services that 
 * connect to the backend server.
 * 
 * @deprecated Use proper API services instead
 */
@Injectable({
  providedIn: 'root',
})
export class SqliteService {
  private isInitialized = false;
  private apiUrl: string;

  constructor() {
    this.apiUrl = environment.apiUrl;
    this.isInitialized = true;
    console.warn(
      'SqliteService is deprecated. Use the appropriate API service instead ' +
      'that connects to the backend at ' + this.apiUrl
    );
  }

  // Stub methods to prevent breaking changes
  async executeQuery(query: string, params: any[] = []): Promise<any> {
    console.warn('SQLite operations are no longer supported. Use API services instead.');
    return [];
  }

  async getUsers(): Promise<any[]> {
    console.warn('Use AuthService instead of deprecated SqliteService');
    return [];
  }

  async createUser(username: string, password: string, role: string): Promise<any> {
    console.warn('Use AuthService instead of deprecated SqliteService');
    return { success: false, message: 'Operation not supported' };
  }

  async updateUser(id: number, username: string, password: string, role: string): Promise<any> {
    console.warn('Use AuthService instead of deprecated SqliteService');
    return { success: false, message: 'Operation not supported' };
  }

  async deleteUser(id: number): Promise<any> {
    console.warn('Use AuthService instead of deprecated SqliteService');
    return { success: false, message: 'Operation not supported' };
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

