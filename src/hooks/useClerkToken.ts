import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { api, setAuthToken } from '@/lib/axios';

export function useClerkToken() {
  const { getToken } = useAuth();

  useEffect(() => {
    const initializeToken = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setAuthToken(() => Promise.resolve(null));
          return;
        }

        // Set the token with Bearer prefix
        setAuthToken(() => Promise.resolve(`Bearer ${token}`));
      } catch (error) {
        console.error('Error setting token:', error);
        setAuthToken(() => Promise.resolve(null));
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