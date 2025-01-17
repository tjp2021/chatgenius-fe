import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { setAuthToken } from '@/lib/axios';

export function useClerkToken() {
  const { getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    const initializeToken = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setAuthToken(
            () => Promise.resolve(null),
            user?.id || ''
          );
          return;
        }

        setAuthToken(
          () => getToken(),
          user?.id || ''
        );
      } catch (error) {
        console.error('Error setting token:', error);
        setAuthToken(
          () => Promise.resolve(null),
          user?.id || ''
        );
      }
    };

    // Initialize token on mount and when auth state changes
    initializeToken();

    // Listen for refresh events
    const handleRefresh = () => initializeToken();
    window.addEventListener('jwt:refresh-needed', handleRefresh);

    return () => {
      window.removeEventListener('jwt:refresh-needed', handleRefresh);
    };
  }, [getToken]);
} 