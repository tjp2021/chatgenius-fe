'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { setAuthToken } from '@/lib/axios';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) {
      console.log('Auth not loaded yet');
      return;
    }

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth, isSignedIn:', isSignedIn);
        
        if (!isSignedIn) {
          console.log('User not signed in, clearing token');
          setAuthToken(() => Promise.resolve(null));
          return;
        }

        const token = await getToken();
        console.log('Got token:', !!token);
        
        if (!token) {
          console.log('No token available, clearing');
          setAuthToken(() => Promise.resolve(null));
          return;
        }
        
        console.log('Setting auth token');
        setAuthToken(() => Promise.resolve(token));
      } catch (error) {
        console.error('Auth initialization error:', error);
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