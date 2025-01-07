import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  // Add other user properties from your backend
}

export function useAuth() {
  const { isLoaded, isSignedIn, userId } = useClerkAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (isSignedIn && userId) {
        try {
          const userData = await api.getCurrentUser() as User;
          setUser(userData);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    if (isLoaded) {
      fetchUser();
    }
  }, [isLoaded, isSignedIn, userId]);

  return {
    isAuthenticated: isSignedIn,
    isLoading: !isLoaded || isLoading,
    user,
    userId,
  };
} 