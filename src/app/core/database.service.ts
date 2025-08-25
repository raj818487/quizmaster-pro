import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * DatabaseService
 * 
 * This service used to handle communication with Electron,
 * but has been refactored to be a simple placeholder since
 * we now use the separated backend architecture.
 */
@Injectable({ providedIn: 'root' })
export class DatabaseService {
  apiUrl = environment.apiUrl;
  
  constructor() {
    console.log('Database service initialized with API URL:', this.apiUrl);
  }
}
