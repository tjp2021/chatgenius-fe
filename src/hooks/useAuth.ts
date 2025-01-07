import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { setAuthToken } from '@/lib/axios';
import { api } from '@/lib/axios';

interface User {
  id: string;
  email: string;
  // Add other user properties from your backend
}

export function useAuth() {
  const clerk = useClerkAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [isUserSynced, setIsUserSynced] = useState(false);
  const [isSyncChecking, setIsSyncChecking] = useState(true);
  const [syncRetries, setSyncRetries] = useState(0);
  const MAX_SYNC_RETRIES = 10;

  // Update loading state when Clerk loads
  useEffect(() => {
    if (clerk.isLoaded) {
      setIsLoading(false);
    }
  }, [clerk.isLoaded]);

  // First set up the token getter as soon as Clerk is loaded
  useEffect(() => {
    if (!clerk.isLoaded) {
      console.log('[useAuth] Clerk not loaded yet');
      return;
    }

    console.log('[useAuth] Setting up token getter');
    setAuthToken(async () => {
      try {
        const token = await clerk.getToken();
        console.log('[useAuth] Got token:', !!token);
        return token;
      } catch (error) {
        console.error('[useAuth] Failed to get token:', error);
        return null;
      }
    });
  }, [clerk.isLoaded]);

  // Then check user sync status
  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout;

    async function checkUserSync() {
      if (!clerk.isSignedIn || !clerk.isLoaded) {
        console.log('[useAuth] Skipping sync check - not signed in or not loaded');
        setIsSyncChecking(false);
        return;
      }

      try {
        // First get a fresh token
        const token = await clerk.getToken();
        if (!token) {
          throw new Error('No token available');
        }

        // Set up auth token for API calls
        setAuthToken(async () => token);

        console.log('[useAuth] Checking user sync status with token');
        const response = await api.get('/users/me');
        
        if (mounted) {
          console.log('[useAuth] User sync check successful');
          setUser(response.data);
          setIsUserSynced(true);
          setIsSyncChecking(false);
          setSyncRetries(0);
          setToken(token);  // Only set token after successful sync
        }
      } catch (error) {
        if (!mounted) return;

        console.log('[useAuth] User sync check failed:', { error, retries: syncRetries });
        setIsUserSynced(false);
        setIsSyncChecking(false);
        setToken(null);  // Clear token on failure
        
        if (syncRetries < MAX_SYNC_RETRIES) {
          setSyncRetries(prev => prev + 1);
          retryTimeout = setTimeout(checkUserSync, Math.min(1000 * Math.pow(1.5, syncRetries), 10000));
        } else {
          console.error('[useAuth] Max sync retries exceeded');
        }
      }
    }

    checkUserSync();

    return () => {
      mounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [clerk.isSignedIn, clerk.isLoaded, syncRetries]);

  // Remove the separate token update effect since we handle it in sync
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