import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { setAuthToken } from '@/lib/axios';
import { api } from '@/lib/axios';

interface User {
  id: string;
  email: string;
}

export function useAuth() {
  const clerk = useClerkAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [isUserSynced, setIsUserSynced] = useState(false);
  const [isSyncChecking, setIsSyncChecking] = useState(true);

  // Update loading state when Clerk loads
  useEffect(() => {
    if (clerk.isLoaded) {
      setIsLoading(false);
    }
  }, [clerk.isLoaded]);

  // Set up token getter
  useEffect(() => {
    if (!clerk.isLoaded) return;

    console.log('[Auth] Setting up token getter:', {
      isLoaded: clerk.isLoaded,
      isSignedIn: clerk.isSignedIn
    });

    setAuthToken(async () => {
      try {
        const token = await clerk.getToken();
        console.log('[Auth] Got token:', {
          hasToken: !!token,
          tokenLength: token?.length
        });
        return token;
      } catch (error) {
        console.error('[Auth] Failed to get token:', error);
        return null;
      }
    });
  }, [clerk.isLoaded, clerk.getToken]);

  // Check user sync
  useEffect(() => {
    let mounted = true;

    async function checkUserSync() {
      if (!clerk.isLoaded || !clerk.isSignedIn) {
        setIsSyncChecking(false);
        return;
      }

      try {
        const token = await clerk.getToken();
        if (!token) return;

        setToken(token);
        
        // Check user sync
        const response = await api.get('/users/me');
        
        if (mounted) {
          setUser(response.data);
          setIsUserSynced(true);
        }
      } catch (error) {
        if (mounted) {
          setIsUserSynced(false);
          setToken(null);
        }
      } finally {
        if (mounted) {
          setIsSyncChecking(false);
        }
      }
    }

    checkUserSync();

    return () => {
      mounted = false;
    };
  }, [clerk.isSignedIn, clerk.isLoaded, clerk.getToken]);

  const isAuthenticated = clerk.isSignedIn && !!token && isUserSynced;
  
  return {
    isAuthenticated,
    isLoading: !clerk.isLoaded || isLoading,
    user,
    userId: clerk.userId,
    token,
    isUserSynced,
    isSyncChecking,
    getToken: clerk.getToken,
  };
} 