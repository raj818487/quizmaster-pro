import { Component, OnInit } from '@angular/core';
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

  constructor(
    private quizService: QuizService,
    private authService: AuthService,
    private accessRequestService: AccessRequestService,
    private router: Router,
    private toastService: ToastService
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
        
        return {
          ...quiz,
          assignment_status: isAssigned ? 'assigned' as const : 'not_assigned' as const,
          access_status: hasAccess ? 'has_access' as const : 'no_access' as const,
          can_start: hasAccess,
          display_message: hasAccess ? undefined : 'Access needed - contact admin'
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
      if (quiz.access_status === 'no_access' && quiz.assignment_status === 'not_assigned') {
        // This is a private quiz - offer to request access
        await this.requestAccess(quiz);
        return;
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

    try {
      const result = await this.accessRequestService.createAccessRequest({
        userId: this.currentUser.id,
        quizId: quiz.id,
        message: `Requesting access to "${quiz.title}"`
      });

      if (result.success) {
        this.toastService.success('Access request submitted successfully! You will be notified when an admin responds.');
        // Reload quizzes to update status
        await this.loadQuizzes();
      } else {
        this.toastService.error('Failed to submit access request: ' + result.message);
      }
    } catch (error) {
      console.error('Error requesting access:', error);
      this.toastService.error('Failed to submit access request. Please try again.');
    }
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
}
