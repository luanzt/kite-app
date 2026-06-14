import { apiClient } from '@api/client';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
} from '@api/types/auth';

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  register: (data: RegisterRequest) =>
    apiClient.post<AuthResponse>('/auth/register', data),

  logout: () => apiClient.post('/auth/logout'),
};
