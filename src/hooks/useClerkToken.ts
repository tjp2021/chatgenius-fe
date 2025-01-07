import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { jwtService } from '@/lib/jwt';

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
          }
        });

        if (!response.ok) throw new Error('Failed to exchange token');

        const { token: jwt } = await response.json();
        
        // Set the JWT in our service
        jwtService.setToken(jwt);
      } catch (error) {
        console.error('Error exchanging token:', error);
      }
    };

    // Exchange token on mount and when auth state changes
    exchangeToken();

    // Listen for refresh events
    const handleRefresh = () => exchangeToken();
    window.addEventListener('jwt:refresh-needed', handleRefresh);

    return () => {
      window.removeEventListener('jwt:refresh-needed', handleRefresh);
    };
  }, [getToken]);
} 