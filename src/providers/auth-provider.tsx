'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { setAuthToken } from '@/lib/axios';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const initializeAuth = async () => {
      try {
        if (!isSignedIn) {
          setAuthToken(() => Promise.resolve(null));
          return;
        }

        const token = await getToken();
        
        if (!token) {
          setAuthToken(() => Promise.resolve(null));
          return;
        }
        
        setAuthToken(() => Promise.resolve(`Bearer ${token}`));
      } catch (error) {
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