'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { setAuthToken } from '@/lib/axios';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    console.log('🔑 [Auth] State:', { isLoaded, isSignedIn });
    
    if (!isLoaded) {
      console.log('⏳ [Auth] Still loading...');
      return;
    }

    // Set up token getter to match socket implementation
    console.log('✅ [Auth] Setting up token getter...');
    setAuthToken(async () => {
      if (!isSignedIn) {
        console.log('❌ [Auth] Not signed in');
        return null;
      }
      const token = await getToken();
      console.log('🎯 [Auth] Got token:', token?.substring(0, 20) + '...');
      return token;  // Direct pass-through like socket
    });
  }, [getToken, isLoaded, isSignedIn]);

  if (!isLoaded) {
    console.log('⌛ [Auth] Rendering null while loading...');
    return null;
  }

  return <>{children}</>;
} 