import { useState } from 'react';
import { useAuthStore } from '@store/useAuthStore';
import { authApi } from '@api/endpoints/auth';
import type { LoginRequest, RegisterRequest } from '@api/types/auth';

export function useAuth() {
  const { setAuth, logout: storeLogout, isAuthenticated, user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (data: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.login(data);
      const { user: userData, accessToken, refreshToken } = response.data;
      setAuth(userData, accessToken, refreshToken);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.register(data);
      const { user: userData, accessToken, refreshToken } = response.data;
      setAuth(userData, accessToken, refreshToken);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      storeLogout();
    }
  };

  return { login, register, logout, isLoading, error, isAuthenticated, user };
}
