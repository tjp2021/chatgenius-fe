'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { setAuthToken, api } from '@/lib/axios';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

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
      return token;
    });

    // SYNC USER WITH DB when signed in and loaded
    if (isSignedIn && user) {
      console.log('🔄 [Auth] Syncing user with DB...');
      api.post('/users/sync', {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl
      }).catch(err => {
        console.error('❌ [Auth] Failed to sync user:', err);
      });
    }
  }, [getToken, isLoaded, isSignedIn, user]);

  if (!isLoaded) {
    console.log('⌛ [Auth] Rendering null while loading...');
    return null;
  }

  return <>{children}</>;
} 