'use client';

import { useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';

export function useApi() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const createChannel = async (data: {
    name: string;
    description?: string;
    type: string;
  }) => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create channel');
      return await response.json();
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createChannel,
    isLoading
  };
}