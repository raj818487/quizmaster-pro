// This is an interface for user activity records
export interface UserActivity {
  timestamp: string;
  action: string;
  details?: string;
}

// Export the interface from this file to make it available
export interface ExtendedUser {
  id?: number;
  username: string;
  password?: string;
  role: 'user' | 'admin';
  _editing?: boolean;
  _password?: string;
  email?: string;
  status?: 'active' | 'inactive' | 'suspended';
  canCreateQuiz?: boolean;
  lastActivity?: Date;
  lastLogin?: string;
  createdAt?: string;
  isOnline?: boolean;
  quizCompletions?: number;
  activityLog?: UserActivity[];
  // Password change fields for editing
  newPassword?: string;
  confirmPassword?: string;
}
