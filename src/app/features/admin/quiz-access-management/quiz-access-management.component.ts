import { Component, OnInit, signal, computed, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth.service';
import { QuizService } from '../../../core/quiz.service';
import { ToastService } from '../../../core/toast.service';
import {
  QuizAssignmentService,
  QuizAssignment,
} from '../../../core/quiz-assignment.service';
import { AccessRequestService, AccessRequest } from '../../../core/access-request.service';
import { User, Quiz } from '../../../core/models';

interface AssignmentSummary {
  totalQuizzes: number;
  totalAssigned: number;
  totalAccessible: number;
  totalPending: number;
}

interface PendingRequestsCount {
  total: number;
  byUser: Map<number, number>;
}

@Component({
  selector: 'app-quiz-access-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quiz-access-management.component.html',
  styleUrls: ['./quiz-access-management.component.scss'],
})
export class QuizAccessManagementComponent implements OnInit {
  // Injected services
  private authService = inject(AuthService);
  private quizService = inject(QuizService);
  private assignmentService = inject(QuizAssignmentService);
  private accessRequestService = inject(AccessRequestService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  // Core data signals
  users = signal<User[]>([]);
  quizzes = signal<Quiz[]>([]);
  assignments = signal<QuizAssignment[]>([]);
  accessRequests = signal<AccessRequest[]>([]);
  pendingRequests = computed(() => this.accessRequests().filter(req => req.status === 'pending'));
  loading = signal<boolean>(false);
  showRequestsTab = signal<boolean>(false);

  // UI state signals
  selectedUserId = signal<number | null>(null);
  searchTerm = signal<string>('');
  selectedCategory = signal<string>('all');
  activeTab = signal<'assignments' | 'requests'>('assignments');

  // Computed properties
  selectedUser = computed(() => {
    const userId = this.selectedUserId();
    return userId
      ? this.users().find((user) => user.id === userId) || null
      : null;
  });
  
  // Compute pending access requests
  userPendingRequests = computed(() => {
    const userId = this.selectedUserId();
    if (!userId) return [];
    
    return this.accessRequests().filter(req => 
      req.status === 'pending' && req.user_id === userId
    );
  });

  // All pending requests for the admin view
  allPendingRequests = computed(() => {
    return this.accessRequests().filter(req => req.status === 'pending');
  });

  filteredQuizzes = computed(() => {
    const search = this.searchTerm().toLowerCase();

    return this.quizzes().filter((quiz) => {
      const matchesSearch =
        quiz.title.toLowerCase().includes(search) ||
        quiz.description.toLowerCase().includes(search);

      return matchesSearch;
    });
  });

  // No categories available in Quiz model, so remove this computed property

  assignmentSummary = computed((): AssignmentSummary => {
    const userId = this.selectedUserId();
    if (!userId) {
      return {
        totalQuizzes: this.quizzes().length,
        totalAssigned: 0,
        totalAccessible: 0,
        totalPending: 0,
      };
    }

    // Get user assignments
    const userAssignments = this.assignments().filter(
      (a) => a.user_id === userId
    );
    
    // Get pending access requests for this user
    const pendingAccessRequests = this.accessRequests().filter(
      req => req.user_id === userId && req.status === 'pending'
    );
    
    const assigned = userAssignments.filter((a) => a.is_assigned);
    const accessible = assigned.filter((a) => a.has_access);
    const pending = assigned.filter((a) => !a.has_access);
    
    // Also include pending access requests in the count
    const totalPending = pending.length + pendingAccessRequests.length;

    return {
      totalQuizzes: this.quizzes().length,
      totalAssigned: assigned.length,
      totalAccessible: accessible.length,
      totalPending: totalPending,
    };
  });

  ngOnInit() {
    this.loadInitialData();
  }

  async reloadAssignments() {
    try {
      console.log('Reloading assignments from database...');
      const assignments = await this.assignmentService.getAllAssignments();
      
      // Log the assignments for debugging
      console.log('Fresh assignments loaded:', assignments);
      
      // Set the assignments signal with fresh data
      this.assignments.set([...assignments]); // Create new array to trigger signal update
      
      // Force change detection to ensure UI updates immediately
      this.cdr.detectChanges();
      
      console.log('Assignments reloaded successfully:', assignments.length, 'assignments');
      
      // Log current user's assignments for debugging
      const userId = this.selectedUserId();
      if (userId) {
        const userAssignments = assignments.filter(a => a.user_id === userId);
        console.log(`User ${userId} assignments:`, userAssignments);
      }
    } catch (error) {
      console.error('Error reloading assignments:', error);
    }
  }

  async loadInitialData() {
    this.loading.set(true);

    try {
      // Load users from the auth service
      if (this.authService.isAdmin()) {
        // Admin can see all users
        const allUsers = await this.authService.getAllUsers();
        this.users.set(allUsers.filter(user => user.role === 'user')); // Only show regular users, not admins
      } else {
        // Regular users can only see themselves
        const authUserData = this.authService.getCurrentUser();
        if (authUserData) {
          this.users.set([authUserData]);
        }
      }

      // Load quizzes, assignments and access requests
      const [quizzes, assignments, accessRequests] = await Promise.all([
        this.quizService.getAllQuizzes(),
        this.assignmentService.getAllAssignments(),
        this.accessRequestService.getAllAccessRequests()
      ]);

      this.quizzes.set(quizzes);
      this.assignments.set(assignments);
      this.accessRequests.set(accessRequests);
      
      // Show requests tab if there are pending requests
      this.showRequestsTab.set(accessRequests.some(req => req.status === 'pending'));

      this.loading.set(false);
    } catch (error) {
      console.error('Error loading data:', error);
      this.loading.set(false);
    }
  }

  // Assignment management methods
  isQuizAssigned(quizId: number): boolean {
    const userId = this.selectedUserId();
    if (!userId) return false;

    const assignment = this.assignments().find(
      (a) => a.user_id === userId && a.quiz_id === quizId
    );
    return assignment?.is_assigned || false;
  }

  hasQuizAccess(quizId: number): boolean {
    const userId = this.selectedUserId();
    if (!userId) return false;

    const assignment = this.assignments().find(
      (a) => a.user_id === userId && a.quiz_id === quizId
    );
    return assignment?.has_access || false;
  }

  async toggleAssignment(quizId: number) {
    const userId = this.selectedUserId();
    if (!userId) return;

    const currentUser = this.authService.getCurrentUser();
    const assignedBy = currentUser?.id;

    // Show loading state
    this.loading.set(true);

    const currentAssignments = this.assignments();
    let assignment = currentAssignments.find(
      (a) => a.user_id === userId && a.quiz_id === quizId
    );

    // If no assignment exists, create a new one
    if (!assignment) {
      assignment = {
        user_id: userId,
        quiz_id: quizId,
        is_assigned: false,
        has_access: false,
        assigned_at: undefined,
      };
    }

    // Toggle assignment status
    const newIsAssigned = !assignment.is_assigned;
    // Keep existing access permission when assigning/unassigning
    const newHasAccess = newIsAssigned ? assignment.has_access : false;

    try {
      // Update via API first
      const result = await this.assignmentService.updateAssignment({
        userId: userId,
        quizId: quizId,
        isAssigned: newIsAssigned,
        hasAccess: newHasAccess,
        assignedBy: assignedBy,
      });

      if (result !== null) {
        console.log('Assignment toggle API response:', result);
        // Small delay to ensure database transaction completes
        await new Promise(resolve => setTimeout(resolve, 100));
        // Force reload all assignments to get the latest state from database
        await this.reloadAssignments();
        console.log('Assignment toggled successfully:', result);
      } else {
        console.error('Failed to toggle assignment - no result returned');
        this.toastService.error('Failed to update assignment. Please try again.');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      this.toastService.error('Failed to update assignment. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async toggleAccess(quizId: number) {
    const userId = this.selectedUserId();
    if (!userId) return;

    const currentUser = this.authService.getCurrentUser();
    const assignedBy = currentUser?.id;

    // Show loading state
    this.loading.set(true);

    const currentAssignments = this.assignments();
    let assignment = currentAssignments.find(
      (a) => a.user_id === userId && a.quiz_id === quizId
    );

    // Can only toggle access if quiz is assigned
    if (!assignment || !assignment.is_assigned) {
      this.loading.set(false);
      this.toastService.warning('Quiz must be assigned before you can manage access.');
      return;
    }

    const newHasAccess = !assignment.has_access;

    try {
      // Update via API first
      const result = await this.assignmentService.updateAssignment({
        userId: userId,
        quizId: quizId,
        isAssigned: assignment.is_assigned,
        hasAccess: newHasAccess,
        assignedBy: assignedBy,
      });

      if (result !== null) {
        console.log('Access toggle API response:', result);
        // Small delay to ensure database transaction completes
        await new Promise(resolve => setTimeout(resolve, 100));
        // Force reload all assignments to get the latest state from database
        await this.reloadAssignments();
        console.log('Access toggled successfully:', result);
      } else {
        console.error('Failed to toggle access - no result returned');
        this.toastService.error('Failed to update access. Please try again.');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      this.toastService.error('Failed to update access. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  getQuizStatusClass(quizId: number): string {
    if (this.isQuizAssigned(quizId) && this.hasQuizAccess(quizId)) {
      return 'status-accessible'; // Green
    } else if (this.isQuizAssigned(quizId)) {
      return 'status-pending'; // Orange
    } else {
      return 'status-unassigned'; // Gray
    }
  }

  // Bulk actions
  async assignAllQuizzes() {
    const userId = this.selectedUserId();
    if (!userId) return;

    const currentUser = this.authService.getCurrentUser();
    const assignedBy = currentUser?.id;

    const allQuizzes = this.quizzes();
    if (allQuizzes.length === 0) {
      this.toastService.warning('No quizzes available to assign.');
      return;
    }

    // Show loading state
    this.loading.set(true);

    const assignments = allQuizzes.map(quiz => ({
      quizId: quiz.id!,
      isAssigned: true,
      hasAccess: false  // Assignment does not automatically grant access
    }));

    try {
      console.log('Bulk assigning quizzes:', assignments);
      const result = await this.assignmentService.bulkUpdateAssignments({
        userId: userId,
        assignments: assignments,
        assignedBy: assignedBy
      });
      
      if (result && Array.isArray(result)) {
        console.log('Bulk assign API response:', result);
        // Small delay to ensure database transaction completes
        await new Promise(resolve => setTimeout(resolve, 200));
        // Force reload assignments to get the latest state
        await this.reloadAssignments();
        this.toastService.success(`Successfully assigned all ${allQuizzes.length} quizzes to ${this.selectedUser()?.username}`);
      } else {
        this.toastService.error('Failed to assign quizzes. Please try again.');
      }
    } catch (error) {
      console.error('Error bulk assigning quizzes:', error);
      this.toastService.error('Error occurred while assigning quizzes. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async unassignAllQuizzes() {
    const userId = this.selectedUserId();
    if (!userId) return;

    const currentUser = this.authService.getCurrentUser();
    const assignedBy = currentUser?.id;

    const allQuizzes = this.quizzes();
    if (allQuizzes.length === 0) {
      this.toastService.warning('No quizzes available to unassign.');
      return;
    }

    // Show loading state
    this.loading.set(true);

    const assignments = allQuizzes.map(quiz => ({
      quizId: quiz.id!,
      isAssigned: false,
      hasAccess: false
    }));

    try {
      console.log('Bulk unassigning quizzes:', assignments);
      const result = await this.assignmentService.bulkUpdateAssignments({
        userId: userId,
        assignments: assignments,
        assignedBy: assignedBy
      });
      
      if (result && Array.isArray(result)) {
        // Force reload assignments to get the latest state
        await this.reloadAssignments();
        this.toastService.success(`Successfully unassigned all quizzes from ${this.selectedUser()?.username}`);
      } else {
        this.toastService.error('Failed to unassign quizzes. Please try again.');
      }
    } catch (error) {
      console.error('Error bulk unassigning quizzes:', error);
      this.toastService.error('Error occurred while unassigning quizzes. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async enableAllAccess() {
    const userId = this.selectedUserId();
    if (!userId) return;

    const currentUser = this.authService.getCurrentUser();
    const assignedBy = currentUser?.id;

    const allQuizzes = this.quizzes();
    if (allQuizzes.length === 0) {
      this.toastService.warning('No quizzes available to enable access for.');
      return;
    }

    // Show loading state
    this.loading.set(true);

    const assignments = allQuizzes.map(quiz => ({
      quizId: quiz.id!,
      isAssigned: true,  // Must be assigned to have access
      hasAccess: true
    }));

    try {
      console.log('Bulk enabling access for all quizzes:', assignments);
      const result = await this.assignmentService.bulkUpdateAssignments({
        userId: userId,
        assignments: assignments,
        assignedBy: assignedBy
      });
      
      if (result && Array.isArray(result)) {
        // Force reload assignments to get the latest state
        await this.reloadAssignments();
        this.toastService.success(`Successfully enabled access to all ${allQuizzes.length} quizzes for ${this.selectedUser()?.username}`);
      } else {
        this.toastService.error('Failed to enable access. Please try again.');
      }
    } catch (error) {
      console.error('Error enabling all access:', error);
      this.toastService.error('Error occurred while enabling access. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async disableAllAccess() {
    const userId = this.selectedUserId();
    if (!userId) return;

    const currentUser = this.authService.getCurrentUser();
    const assignedBy = currentUser?.id;

    const currentAssignments = this.assignments();
    const userAssignments = currentAssignments.filter(a => a.user_id === userId && a.is_assigned);
    
    if (userAssignments.length === 0) {
      this.toastService.warning('No assigned quizzes to disable access for.');
      return;
    }

    // Show loading state
    this.loading.set(true);

    const assignments = userAssignments.map(assignment => ({
      quizId: assignment.quiz_id,
      isAssigned: assignment.is_assigned,  // Keep assignment status
      hasAccess: false  // Remove access
    }));

    try {
      console.log('Bulk disabling access for assigned quizzes:', assignments);
      const result = await this.assignmentService.bulkUpdateAssignments({
        userId: userId,
        assignments: assignments,
        assignedBy: assignedBy
      });
      
      if (result && Array.isArray(result)) {
        // Force reload assignments to get the latest state
        await this.reloadAssignments();
        this.toastService.success(`Successfully disabled access to ${userAssignments.length} assigned quizzes for ${this.selectedUser()?.username}`);
      } else {
        this.toastService.error('Failed to disable access. Please try again.');
      }
    } catch (error) {
      console.error('Error disabling all access:', error);
      this.toastService.error('Error occurred while disabling access. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  // Event handlers
  onUserChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const userId = target.value ? parseInt(target.value) : null;
    this.selectedUserId.set(userId);
  }

  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  onCategoryChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedCategory.set(target.value);
  }
  
  // Access Request Management
  toggleRequestsTab() {
    this.showRequestsTab.update(current => !current);
  }
  
  async approveAccessRequest(requestId: number, userId: number, quizId: number) {
    this.loading.set(true);
    
    try {
      const currentUser = this.authService.getCurrentUser();
      
      // Update the access request status
      const updateSuccess = await this.accessRequestService.updateAccessRequest(
        requestId, 
        {
          status: 'approved',
          reviewedBy: currentUser?.id || 0,
          responseMessage: 'Your access request has been approved.',
          autoAssign: true // Automatically assign the quiz and grant access
        }
      );
      
      if (updateSuccess) {
        // Reload access requests and assignments
        const [accessRequests, assignments] = await Promise.all([
          this.accessRequestService.getAllAccessRequests(),
          this.assignmentService.getAllAssignments()
        ]);
        
        this.accessRequests.set(accessRequests);
        this.assignments.set([...assignments]);
        this.cdr.detectChanges();
        
        this.toastService.success('Access request approved successfully.');
      } else {
        this.toastService.error('Failed to approve access request.');
      }
    } catch (error) {
      console.error('Error approving access request:', error);
      this.toastService.error('An error occurred while approving the request.');
    } finally {
      this.loading.set(false);
    }
  }
  
  async rejectAccessRequest(requestId: number) {
    this.loading.set(true);
    
    try {
      const currentUser = this.authService.getCurrentUser();
      
      // Update the access request status
      const updateSuccess = await this.accessRequestService.updateAccessRequest(
        requestId, 
        {
          status: 'rejected',
          reviewedBy: currentUser?.id || 0,
          responseMessage: 'Your access request has been rejected.'
        }
      );
      
      if (updateSuccess) {
        // Reload access requests
        const accessRequests = await this.accessRequestService.getAllAccessRequests();
        this.accessRequests.set(accessRequests);
        this.cdr.detectChanges();
        
        this.toastService.success('Access request rejected successfully.');
      } else {
        this.toastService.error('Failed to reject access request.');
      }
    } catch (error) {
      console.error('Error rejecting access request:', error);
      this.toastService.error('An error occurred while rejecting the request.');
    } finally {
      this.loading.set(false);
    }
  }
  
  // Helper methods
  getQuizTitle(quizId: number): string {
    const quiz = this.quizzes().find(q => q.id === quizId);
    return quiz?.title || 'Unknown Quiz';
  }
  
  getUserName(userId: number): string {
    const user = this.users().find(u => u.id === userId);
    return user?.username || 'Unknown User';
  }
}
