import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { api, setAuthToken } from '@/lib/axios';

export function useClerkToken() {
  const { getToken } = useAuth();

  useEffect(() => {
    const exchangeToken = async () => {
      try {
        // Get the Clerk session token
        const token = await getToken();
        if (!token) return;

        // Exchange Clerk token for JWT
        const response = await fetch('/api/auth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ clerkToken: token })
        });

        if (!response.ok) throw new Error('Failed to exchange token');

        const { token: jwt } = await response.json();
        
        // Configure axios to use the JWT
        setAuthToken(() => Promise.resolve(jwt));
      } catch (error) {
        console.error('Error exchanging token:', error);
      }
    };

    // Exchange token on mount and when auth state changes
    exchangeToken();

    // Configure axios to use Clerk token until exchange happens
    setAuthToken(() => getToken());

    // Listen for refresh events
    const handleRefresh = () => exchangeToken();
    window.addEventListener('jwt:refresh-needed', handleRefresh);

    return () => {
      window.removeEventListener('jwt:refresh-needed', handleRefresh);
    };
  }, [getToken]);
} 