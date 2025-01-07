import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { jwtService } from '@/lib/jwt';

interface User {
  id: string;
  email: string;
  // Add other user properties from your backend
}

interface AuthResponse {
  token: string;
  user: User;
}

export function useAuth() {
  const { isLoaded, isSignedIn, userId, getToken } = useClerkAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshJWT = useCallback(async () => {
    if (!isSignedIn || !userId) return;

    try {
      const clerkToken = await getToken();
      const response = await apiClient.post<AuthResponse>('/api/auth/token', {
        clerkToken,
      });
      
      jwtService.setToken(response.token);
      setUser(response.user);
    } catch (error) {
      console.error('Error refreshing JWT:', error);
      jwtService.clearToken();
      setUser(null);
    }
  }, [isSignedIn, userId, getToken]);

  useEffect(() => {
    const handleRefreshNeeded = () => {
      refreshJWT();
    };

    window.addEventListener('jwt:refresh-needed', handleRefreshNeeded);
    return () => {
      window.removeEventListener('jwt:refresh-needed', handleRefreshNeeded);
    };
  }, [refreshJWT]);

  useEffect(() => {
    const initializeAuth = async () => {
      if (isSignedIn && userId) {
        try {
          await refreshJWT();
        } catch (error) {
          console.error('Error initializing auth:', error);
        }
      } else {
        jwtService.clearToken();
        setUser(null);
      }
      setIsLoading(false);
    };

    if (isLoaded) {
      initializeAuth();
    }
  }, [isLoaded, isSignedIn, userId, refreshJWT]);

  const logout = useCallback(async () => {
    jwtService.clearToken();
    setUser(null);
  }, []);

  return {
    isAuthenticated: isSignedIn && !!jwtService.getToken(),
    isLoading: !isLoaded || isLoading,
    user,
    userId,
    refreshJWT,
    logout,
  };
} 