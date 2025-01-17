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

    // FIRST: Set up the proven auth pattern with api client
    setAuthToken(
      async () => {
        if (!isSignedIn) {
          console.log('❌ [Auth] Not signed in');
          return null;
        }
        const token = await getToken();
        console.log('🎯 [Auth] Got token:', token?.substring(0, 20) + '...');
        return token;
      },
      user?.id || ''
    );

    // THEN: After auth is configured, sync the user
    const syncUser = async () => {
      if (isSignedIn && user) {
        try {
          // Use the configured api client that now has auth
          await api.post('/users/sync', {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl
          });
          console.log('✅ [Auth] User synced successfully');
        } catch (err) {
          console.error('❌ [Auth] Failed to sync user:', err);
        }
      }
    };

    syncUser();
  }, [getToken, isLoaded, isSignedIn, user]);

  if (!isLoaded) return null;

  return <>{children}</>;
} 