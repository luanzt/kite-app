import { useMutation } from '@tanstack/react-query';
import { authApi } from '@api/endpoints/auth';
import { useAuthStore } from '@store/useAuthStore';
import type { LoginRequest, RegisterRequest } from '@api/types/auth';

export function useLoginMutation() {
  const setAuth = useAuthStore(state => state.setAuth);

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
    },
  });
}

export function useRegisterMutation() {
  const setAuth = useAuthStore(state => state.setAuth);

  return useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
    },
  });
}

export function useLogoutMutation() {
  const logout = useAuthStore(state => state.logout);

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      logout();
    },
  });
}
