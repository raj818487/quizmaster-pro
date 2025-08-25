import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface QuizAssignment {
  id?: number;
  user_id: number;
  quiz_id: number;
  is_assigned: boolean;
  has_access: boolean;
  assigned_at?: string;
  assigned_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AssignmentUpdateRequest {
  userId: number;
  quizId: number;
  isAssigned: boolean;
  hasAccess: boolean;
  assignedBy?: number;
}

export interface BulkAssignmentRequest {
  userId: number;
  assignments: {
    quizId: number;
    isAssigned: boolean;
    hasAccess: boolean;
  }[];
  assignedBy?: number;
}

@Injectable({
  providedIn: 'root',
})
export class QuizAssignmentService {
  private apiUrl = environment.apiUrl || '/api';

  constructor(private http: HttpClient) {}

  async getAllAssignments(): Promise<QuizAssignment[]> {
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/quiz-assignments`)
      );
      return response.assignments || [];
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return [];
    }
  }

  async getUserAssignments(userId: number): Promise<QuizAssignment[]> {
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/users/${userId}/quiz-assignments`)
      );
      return response.assignments || [];
    } catch (error) {
      console.error('Error fetching user assignments:', error);
      return [];
    }
  }

  async updateAssignment(
    assignment: AssignmentUpdateRequest
  ): Promise<QuizAssignment | null> {
    try {
      const response: any = await firstValueFrom(
        this.http.post(`${this.apiUrl}/quiz-assignments`, assignment)
      );
      console.log('Assignment update response:', response);
      return response.success ? (response.assignment || {}) : null;
    } catch (error) {
      console.error('Error updating assignment:', error);
      return null;
    }
  }

  async bulkUpdateAssignments(
    bulkRequest: BulkAssignmentRequest
  ): Promise<QuizAssignment[]> {
    try {
      const response: any = await firstValueFrom(
        this.http.put(`${this.apiUrl}/quiz-assignments/bulk`, bulkRequest)
      );
      console.log('Bulk assignment update response:', response);
      return response.success ? (response.assignments || []) : [];
    } catch (error) {
      console.error('Error bulk updating assignments:', error);
      return [];
    }
  }
}
