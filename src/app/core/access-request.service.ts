import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AccessRequest {
  id?: number;
  user_id: number;
  quiz_id: number;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at?: string;
  reviewed_at?: string;
  reviewed_by?: number;
  response_message?: string;
  username?: string;
  quiz_title?: string;
}

export interface AccessRequestCreate {
  userId: number;
  quizId: number;
  message?: string;
}

export interface AccessRequestUpdate {
  status: 'approved' | 'rejected';
  reviewedBy: number;
  responseMessage?: string;
  autoAssign?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AccessRequestService {
  private apiUrl = environment.apiUrl || '/api';

  constructor(private http: HttpClient) {}

  async getAllAccessRequests(): Promise<AccessRequest[]> {
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/access-requests`)
      );
      return response.requests || [];
    } catch (error) {
      console.error('Error fetching access requests:', error);
      return [];
    }
  }

  async getUserAccessRequests(userId: number): Promise<AccessRequest[]> {
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/users/${userId}/access-requests`)
      );
      return response.requests || [];
    } catch (error) {
      console.error('Error fetching user access requests:', error);
      return [];
    }
  }

  async createAccessRequest(
    request: AccessRequestCreate
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Sending access request:', request);
      console.log('API URL:', `${this.apiUrl}/access-requests`);
      
      const response: any = await firstValueFrom(
        this.http.post(`${this.apiUrl}/access-requests`, request)
      );
      
      console.log('Access request response:', response);
      
      return {
        success: response.success || false,
        message:
          response.message ||
          (response.success
            ? 'Request created successfully'
            : 'Failed to create request'),
      };
    } catch (error) {
      console.error('Error creating access request:', error);
      console.error('Error details:', error);
      return {
        success: false,
        message: 'Failed to create access request',
      };
    }
  }

  async updateAccessRequest(
    requestId: number,
    update: AccessRequestUpdate
  ): Promise<boolean> {
    try {
      const response: any = await firstValueFrom(
        this.http.put(`${this.apiUrl}/access-requests/${requestId}`, update)
      );
      return response.success || false;
    } catch (error) {
      console.error('Error updating access request:', error);
      return false;
    }
  }
}
