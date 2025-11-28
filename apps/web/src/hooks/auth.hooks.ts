import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
  LoginResponse,
  User,
} from '../types/auth';
import { api, tokenStorage } from '../api/client';
import { useAuth } from '../features/auth/authState';

/**
 * Hook for user registration
 * @returns Mutation object with register function and state
 */
export const useRegister = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: RegisterDto): Promise<LoginResponse> => {
      const response = await api.post<LoginResponse>('/auth/register', data);
      return response.data;
    },
    onSuccess: (data) => {
      // Store tokens
      tokenStorage.setAccessToken(data.tokens.accessToken);
      tokenStorage.setRefreshToken(data.tokens.refreshToken);

      // Invalidate and refetch auth queries
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.setQueryData(['auth', 'me'], data.user);

      // Navigate to dashboard
      navigate({ to: '/' });
    },
  });
};

/**
 * Hook for user login
 * @param redirectTo - Optional path to redirect to after login (defaults to '/')
 * @returns Mutation object with login function and state
 */
export const useLogin = (redirectTo: string = '/') => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  return useMutation({
    mutationFn: async (data: LoginDto): Promise<void> => {
      // Use the auth context's login function to ensure state is properly updated
      await authLogin(data);
    },
    onSuccess: () => {
      // Invalidate and refetch auth queries
      queryClient.invalidateQueries({ queryKey: ['auth'] });

      // Use requestAnimationFrame to ensure auth state is updated in router context
      // before navigation
      requestAnimationFrame(() => {
        navigate({ to: redirectTo });
      });
    },
  });
};

/**
 * Hook for refreshing access token
 * @returns Mutation object with refresh function and state
 */
export const useRefresh = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RefreshTokenDto): Promise<LoginResponse> => {
      const response = await api.post<LoginResponse>('/auth/refresh', data);
      return response.data;
    },
    onSuccess: (data) => {
      // Update stored tokens
      tokenStorage.setAccessToken(data.tokens.accessToken);
      tokenStorage.setRefreshToken(data.tokens.refreshToken);

      // Update user data in cache
      queryClient.setQueryData(['auth', 'me'], data.user);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: () => {
      // If refresh fails, clear tokens
      tokenStorage.clearTokens();
      queryClient.clear();
    },
  });
};

/**
 * Hook for fetching current user profile
 * @returns Query object with user data and state
 */
export const useMe = () => {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async (): Promise<User> => {
      const response = await api.get<User>('/auth/me');
      return response.data;
    },
    enabled: !!tokenStorage.getAccessToken(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
};

/**
 * Hook for requesting password reset
 * @returns Mutation object with forgotPassword function and state
 */
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (data: ForgotPasswordDto): Promise<void> => {
      await api.post('/auth/forgot-password', data);
    },
  });
};

/**
 * Hook for resetting password with token
 * @returns Mutation object with resetPassword function and state
 */
export const useResetPassword = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: ResetPasswordDto): Promise<void> => {
      await api.post('/auth/reset-password', data);
    },
    onSuccess: () => {
      // Navigate to login after successful password reset
      navigate({ to: '/auth/login' });
    },
  });
};

