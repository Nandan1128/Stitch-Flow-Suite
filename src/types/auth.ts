
export type UserRole = 'admin' | 'supervisor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employee_id: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
