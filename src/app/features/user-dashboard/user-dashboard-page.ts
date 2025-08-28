import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizService } from '../../core/quiz.service';
import { AuthService } from '../../core/auth.service';
import { AccessRequestService } from '../../core/access-request.service';
import { Quiz, User } from '../../core/models';
import { Router } from '@angular/router';
import { ToastService } from '../../core/toast.service';

export interface QuizWithStatus extends Quiz {
  assignment_status: 'assigned' | 'not_assigned';
  access_status: 'has_access' | 'no_access' | 'pending_request';
  can_start: boolean;
  display_message?: string;
}

@Component({
  selector: 'app-user-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-dashboard-page.html',
  styleUrls: ['./user-dashboard-page.scss'],
})
export class UserDashboardPage implements OnInit {
  currentUser: User | null = null;
  allQuizzes: QuizWithStatus[] = [];
  assignedQuizzes: QuizWithStatus[] = [];
  publicQuizzes: QuizWithStatus[] = [];
  privateQuizzes: QuizWithStatus[] = [];
  activeCategory = 'assigned';
  loading = false;
  error = '';
  requestingAccess = new Set<number>(); // Track which quizzes have pending requests

  constructor(
    private quizService: QuizService,
    private authService: AuthService,
    private accessRequestService: AccessRequestService,
    private router: Router,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      if (user) {
        this.loadQuizzes();
      }
    });
  }

  async loadQuizzes() {
    if (!this.currentUser?.id) return;

    this.loading = true;
    this.error = '';

    try {
      // Load all quiz categories
      console.log('Loading quizzes for user ID:', this.currentUser.id);
      const [assignedQuizzes, publicQuizzes, allQuizzes, userAccessRequests] = await Promise.all([
        this.quizService.getUserAssignedQuizzes(this.currentUser.id),
        this.quizService.getPublicQuizzes(),
        this.quizService.getAllQuizzes(),
        this.accessRequestService.getUserAccessRequests(this.currentUser.id)
      ]);
      
      console.log('Assigned quizzes received:', assignedQuizzes);

      // Create a map of access requests for quick lookup
      const accessRequestMap = new Map();
      userAccessRequests.forEach(request => {
        accessRequestMap.set(request.quiz_id, request.status);
      });

      // Process assigned quizzes (these have assignments and may have access)
      this.assignedQuizzes = assignedQuizzes.map(quiz => {
        // Ensure boolean values are properly parsed
        const hasAccess = quiz.has_access === true || quiz.has_access === 1;
        const isAssigned = quiz.is_assigned === true || quiz.is_assigned === 1;
        
        console.log(`Quiz ${quiz.id} (${quiz.title}): hasAccess=${hasAccess}, isAssigned=${isAssigned}`);
        
        // ONLY access permission allows starting quiz, not assignment alone
        const canStart = hasAccess;
        
        return {
          ...quiz,
          assignment_status: isAssigned ? 'assigned' as const : 'not_assigned' as const,
          access_status: hasAccess ? 'has_access' as const : 'no_access' as const,
          can_start: canStart,
          display_message: canStart ? undefined : 
            (isAssigned ? 'Assigned but no access - contact admin for access' : 'Access needed - contact admin')
        };
      });

      // Process public quizzes (anyone can access)
      this.publicQuizzes = publicQuizzes.map(quiz => ({
        ...quiz,
        assignment_status: 'not_assigned' as const,
        access_status: 'has_access' as const,
        can_start: true,
        display_message: undefined
      }));

      // Process private quizzes (not assigned, need request)
      this.privateQuizzes = allQuizzes
        .filter(quiz => 
          !quiz.is_public && 
          !assignedQuizzes.some(assigned => assigned.id === quiz.id)
        )
        .map(quiz => {
          const requestStatus = accessRequestMap.get(quiz.id);
          return {
            ...quiz,
            assignment_status: 'not_assigned' as const,
            access_status: requestStatus === 'approved' ? 'has_access' as const :
                          requestStatus === 'pending' ? 'pending_request' as const :
                          'no_access' as const,
            can_start: requestStatus === 'approved',
            display_message: requestStatus === 'pending' ? 'Access request pending' :
                           requestStatus === 'denied' ? 'Access request denied' :
                           requestStatus === 'approved' ? undefined :
                           'Request access to take this quiz'
          };
        });

      // Combine all quizzes
      this.allQuizzes = [...this.assignedQuizzes, ...this.publicQuizzes, ...this.privateQuizzes];

    } catch (error) {
      this.error = 'Failed to load quizzes. Please try again.';
      console.error('Error loading quizzes:', error);
    } finally {
      this.loading = false;
    }
  }

  setActiveCategory(category: string) {
    this.activeCategory = category;
  }

  get filteredQuizzes(): QuizWithStatus[] {
    let quizzes: QuizWithStatus[];
    
    switch (this.activeCategory) {
      case 'assigned':
        quizzes = this.assignedQuizzes;
        break;
      case 'public':
        quizzes = this.publicQuizzes;
        break;
      case 'private':
        quizzes = this.privateQuizzes;
        break;
      default:
        quizzes = this.allQuizzes;
    }
    
    // Sort quizzes: has_access first, then by title
    return quizzes.sort((a, b) => {
      // First sort by access status
      if (a.access_status === 'has_access' && b.access_status !== 'has_access') return -1;
      if (a.access_status !== 'has_access' && b.access_status === 'has_access') return 1;
      
      // Then sort by title
      return a.title.localeCompare(b.title);
    });
  }

  getEmptyMessage(): string {
    switch (this.activeCategory) {
      case 'assigned':
        return "You don't have any assigned quizzes yet.";
      case 'public':
        return 'No public quizzes are available right now.';
      case 'private':
        return 'No private quizzes are available at the moment.';
      default:
        return 'No quizzes are available at the moment.';
    }
  }

  async startQuiz(quiz: QuizWithStatus) {
    if (!quiz.can_start) {
      if (quiz.access_status === 'no_access') {
        if (quiz.assignment_status === 'assigned') {
          // Quiz is assigned but user doesn't have access
          this.toastService.warning('This quiz is assigned to you but you need access permission. Please contact an admin.');
          return;
        } else {
          // This is a private quiz - offer to request access
          await this.requestAccess(quiz);
          return;
        }
      } else {
        this.toastService.warning(quiz.display_message || 'You cannot start this quiz at the moment.');
        return;
      }
    }

    if (quiz.id) {
      this.router.navigate(['/quiz', quiz.id]);
    }
  }

  async requestAccess(quiz: QuizWithStatus) {
    if (!this.currentUser?.id || !quiz.id) return;

    // Check if already requesting access
    if (this.requestingAccess.has(quiz.id)) {
      this.toastService.warning('Access request already in progress for this quiz.');
      return;
    }

    // Add to requesting set and trigger change detection
    this.requestingAccess.add(quiz.id);
    this.cdr.detectChanges();

    try {
      const result = await this.accessRequestService.createAccessRequest({
        userId: this.currentUser.id,
        quizId: quiz.id,
        message: `Requesting access to "${quiz.title}"`
      });

      if (result.success) {
        this.toastService.success('Access request submitted successfully! You will be notified when an admin responds.');
        
        // Update the quiz status immediately for better UX
        const quizIndex = this.privateQuizzes.findIndex(q => q.id === quiz.id);
        if (quizIndex !== -1) {
          this.privateQuizzes[quizIndex] = {
            ...this.privateQuizzes[quizIndex],
            access_status: 'pending_request',
            display_message: 'Access request pending'
          };
        }
        
        // Reload quizzes to get the latest status from server
        await this.loadQuizzes();
      } else {
        this.toastService.error('Failed to submit access request: ' + result.message);
      }
    } catch (error) {
      console.error('Error requesting access:', error);
      this.toastService.error('Failed to submit access request. Please try again.');
    } finally {
      // Remove from requesting set and trigger change detection
      this.requestingAccess.delete(quiz.id);
      this.cdr.detectChanges();
    }
  }

  // Helper method to check if request is pending for a quiz
  isRequestingAccess(quizId: number): boolean {
    return this.requestingAccess.has(quizId);
  }

  // Helper method to get button text
  getRequestButtonText(quiz: QuizWithStatus): string {
    if (!quiz.id) return 'Request Access';
    
    if (this.isRequestingAccess(quiz.id)) {
      return 'Requesting...';
    }
    
    if (quiz.access_status === 'pending_request') {
      return 'Request Pending';
    }
    
    return 'Request Access';
  }

  // Helper method to check if button should be disabled
  isRequestButtonDisabled(quiz: QuizWithStatus): boolean {
    if (!quiz.id) return true;
    
    return this.isRequestingAccess(quiz.id) || quiz.access_status === 'pending_request';
  }

  viewQuizDetails(quiz: QuizWithStatus) {
    // Enhanced quiz details with assignment/access information
    let detailsMessage = `Quiz: ${quiz.title}\nDescription: ${quiz.description}\nTime Limit: ${
      quiz.time_limit ? quiz.time_limit + ' minutes' : 'No limit'
    }\n\nStatus Information:\n`;
    
    detailsMessage += `- Assignment: ${quiz.assignment_status === 'assigned' ? 'You are assigned to this quiz' : 'Not assigned to you'}\n`;
    detailsMessage += `- Access: ${quiz.access_status === 'has_access' ? 'You have access' : 
                                  quiz.access_status === 'pending_request' ? 'Access request pending' : 
                                  'No access granted'}\n`;
    detailsMessage += `- Can Start: ${quiz.can_start ? 'Yes' : 'No'}`;
    
    if (quiz.display_message) {
      detailsMessage += `\n\nNote: ${quiz.display_message}`;
    }
    
    this.toastService.info(detailsMessage);
  }
  
  async refreshQuizzes() {
    console.log('Manually refreshing quiz list');
    await this.loadQuizzes();
  }

  // Helper methods for the new dashboard design
  getAssignedCount(): number {
    return this.assignedQuizzes.length;
  }

  getPublicCount(): number {
    return this.publicQuizzes.length;
  }

  getPrivateCount(): number {
    return this.privateQuizzes.length;
  }

  getAllCount(): number {
    return this.allQuizzes.length;
  }

  getCategoryIcon(): string {
    switch (this.activeCategory) {
      case 'assigned': return '📋';
      case 'public': return '🌐';
      case 'private': return '🔒';
      case 'all': return '📚';
      default: return '📚';
    }
  }

  getCategoryTitle(): string {
    switch (this.activeCategory) {
      case 'assigned': return 'My Assigned Quizzes';
      case 'public': return 'Public Quizzes';
      case 'private': return 'Private Quizzes';
      case 'all': return 'All Quizzes';
      default: return 'All Quizzes';
    }
  }
}
