import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, LoginDto, RegisterDto, LoginResponse } from '../../types/auth';
import { api, tokenStorage } from '../../api/client';

// Auth state interface
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Auth context interface
interface AuthContextType extends AuthState {
  login: (credentials: LoginDto) => Promise<void>;
  register: (userData: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const queryClient = useQueryClient();

  // Query to fetch current user profile
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await api.get<User>('/auth/me');
      return response.data;
    },
    enabled: !!tokenStorage.getAccessToken(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Initialize auth state from stored tokens
  useEffect(() => {
    const accessToken = tokenStorage.getAccessToken();
    const refreshToken = tokenStorage.getRefreshToken();

    if (accessToken && refreshToken) {
      setAuthState(prev => ({
        ...prev,
        accessToken,
        refreshToken,
        isAuthenticated: true,
      }));
    } else {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, []);

  // Update user data when query completes
  useEffect(() => {
    if (!userLoading) {
      setAuthState(prev => ({
        ...prev,
        user: userData || null,
        isAuthenticated: !!userData,
        isLoading: false,
      }));
    }
  }, [userData, userLoading]);

  // Login function
  const login = async (credentials: LoginDto): Promise<void> => {
    try {
      const response = await api.post<LoginResponse>('/auth/login', credentials);
      const { tokens, user } = response.data;

      // Store tokens
      tokenStorage.setAccessToken(tokens.accessToken);
      tokenStorage.setRefreshToken(tokens.refreshToken);

      // Update state
      setAuthState({
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });

      // Invalidate and refetch user queries
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    } catch (error) {
      throw error;
    }
  };

  // Register function
  const register = async (userData: RegisterDto): Promise<void> => {
    try {
      const response = await api.post<LoginResponse>('/auth/register', userData);
      const { tokens, user } = response.data;

      // Store tokens
      tokenStorage.setAccessToken(tokens.accessToken);
      tokenStorage.setRefreshToken(tokens.refreshToken);

      // Update state
      setAuthState({
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });

      // Invalidate and refetch user queries
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    } catch (error) {
      throw error;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      // Clear tokens and state regardless of API response
      tokenStorage.clearTokens();
      setAuthState({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });

      // Clear all cached queries
      queryClient.clear();
    }
  };

  // Logout all devices function
  const logoutAll = async (): Promise<void> => {
    try {
      await api.post('/auth/logout-all');
    } catch (error) {
      throw error;
    } finally {
      // Clear tokens and state
      tokenStorage.clearTokens();
      setAuthState({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });

      // Clear all cached queries
      queryClient.clear();
    }
  };

  // Refresh token function
  const refresh = async (): Promise<void> => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await api.post<LoginResponse>('/auth/refresh', { refreshToken });
      const { tokens, user } = response.data;

      // Update stored tokens
      tokenStorage.setAccessToken(tokens.accessToken);
      tokenStorage.setRefreshToken(tokens.refreshToken);

      // Update state
      setAuthState(prev => ({
        ...prev,
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isAuthenticated: true,
      }));

      // Invalidate user queries to refetch with new token
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    } catch (error) {
      // If refresh fails, clear tokens and logout
      tokenStorage.clearTokens();
      setAuthState({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
      queryClient.clear();
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    logoutAll,
    refresh,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
