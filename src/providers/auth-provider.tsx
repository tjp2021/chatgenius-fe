'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { setAuthToken } from '@/lib/axios';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) {
      console.log('[AuthProvider] Clerk not loaded yet');
      return;
    }

    console.log('[AuthProvider] Initializing', { isLoaded, isSignedIn });
    
    const initializeAuth = async () => {
      try {
        if (!isSignedIn) {
          console.warn('[AuthProvider] User not signed in');
          setAuthToken(() => Promise.resolve(null));
          return;
        }

        console.log('[AuthProvider] Getting token from Clerk');
        const token = await getToken();
        
        if (!token) {
          console.warn('[AuthProvider] No token received from Clerk');
          setAuthToken(() => Promise.resolve(null));
          return;
        }
        
        console.log('[AuthProvider] Token received successfully');
        setAuthToken(() => Promise.resolve(token));
      } catch (error) {
        console.error('[AuthProvider] Failed to get token:', error);
        if (error instanceof Error) {
          console.error('[AuthProvider] Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
        }
        setAuthToken(() => Promise.resolve(null));
      }
    };

    initializeAuth();
  }, [getToken, isLoaded, isSignedIn]);

  if (!isLoaded) {
    return null;
  }

  return <>{children}</>;
} 