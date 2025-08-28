import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/toast.service';

interface QueryResult {
  success: boolean;
  data?: any[];
  columns?: string[];
  rowCount?: number;
  message?: string;
  error?: string;
}

interface TableInfo {
  name: string;
  sql: string;
  rowCount: number;
}

@Component({
  selector: 'app-db-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './db-management.component.html',
  styleUrl: './db-management.component.scss'
})
export class DbManagementComponent implements OnInit {
  private apiUrl = environment.apiUrl || '/api';
  
  // Signals for reactive state
  loading = signal(false);
  tables = signal<TableInfo[]>([]);
  queryResult = signal<QueryResult | null>(null);
  selectedTable = signal<string>('');
  
  // Form data
  sqlQuery = '';
  queryHistory: string[] = [];
  
  // Predefined queries
  commonQueries = [
    {
      name: 'Show All Tables',
      query: `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;`
    },
    {
      name: 'Show All Users',
      query: 'SELECT * FROM users ORDER BY id;'
    },
    {
      name: 'Show All Quizzes',
      query: 'SELECT * FROM quizzes ORDER BY id;'
    },
    {
      name: 'Show Quiz Assignments',
      query: 'SELECT qa.*, u.username, q.title FROM quiz_assignments qa JOIN users u ON qa.user_id = u.id JOIN quizzes q ON qa.quiz_id = q.id ORDER BY qa.id;'
    },
    {
      name: 'Show Access Requests',
      query: 'SELECT ar.*, u.username, q.title FROM access_requests ar JOIN users u ON ar.user_id = u.id JOIN quizzes q ON ar.quiz_id = q.id ORDER BY ar.id;'
    },
    {
      name: 'Show Quiz Attempts',
      query: 'SELECT qa.*, u.username, q.title FROM quiz_attempts qa JOIN users u ON qa.user_id = u.id JOIN quizzes q ON qa.quiz_id = q.id ORDER BY qa.id;'
    }
  ];

  constructor(
    private http: HttpClient,
    private toastService: ToastService
  ) {}

  async ngOnInit() {
    await this.loadTables();
  }

  async loadTables() {
    this.loading.set(true);
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/database/tables`)
      );
      
      if (response.success) {
        this.tables.set(response.tables || []);
      } else {
        this.toastService.error(response.message || 'Failed to load tables');
      }
    } catch (error) {
      console.error('Error loading tables:', error);
      this.toastService.error('Failed to load database tables');
    } finally {
      this.loading.set(false);
    }
  }

  async executeQuery() {
    if (!this.sqlQuery.trim()) {
      this.toastService.warning('Please enter a SQL query');
      return;
    }

    this.loading.set(true);
    try {
      const response: any = await firstValueFrom(
        this.http.post(`${this.apiUrl}/database/query`, { 
          query: this.sqlQuery.trim()
        })
      );
      
      this.queryResult.set(response);
      
      if (response.success) {
        this.toastService.success(`Query executed successfully. ${response.rowCount || 0} rows affected.`);
        
        // Add to history if not already there
        if (!this.queryHistory.includes(this.sqlQuery.trim())) {
          this.queryHistory.unshift(this.sqlQuery.trim());
          // Keep only last 10 queries
          if (this.queryHistory.length > 10) {
            this.queryHistory = this.queryHistory.slice(0, 10);
          }
        }
      } else {
        this.toastService.error(response.error || response.message || 'Query failed');
      }
    } catch (error) {
      console.error('Error executing query:', error);
      this.toastService.error('Failed to execute query');
      this.queryResult.set({
        success: false,
        error: 'Network error or server unavailable'
      });
    } finally {
      this.loading.set(false);
    }
  }

  selectCommonQuery(query: string) {
    this.sqlQuery = query;
  }

  selectFromHistory(query: string) {
    this.sqlQuery = query;
  }

  async showTableData(tableName: string) {
    this.selectedTable.set(tableName);
    this.sqlQuery = `SELECT * FROM ${tableName} LIMIT 100;`;
    await this.executeQuery();
  }

  async showTableSchema(tableName: string) {
    this.sqlQuery = `PRAGMA table_info(${tableName});`;
    await this.executeQuery();
  }

  clearQuery() {
    this.sqlQuery = '';
    this.queryResult.set(null);
    this.selectedTable.set('');
  }

  clearResults() {
    this.queryResult.set(null);
  }

  isSelectQuery(query: string): boolean {
    return query.trim().toLowerCase().startsWith('select') || 
           query.trim().toLowerCase().startsWith('pragma');
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'string') return value;
    return String(value);
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }
}
