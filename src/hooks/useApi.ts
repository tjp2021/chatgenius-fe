'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';

export function useApi() {
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const joinChannel = async (channelId: string) => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/channels/${channelId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to join channel');
      return await response.json();
    } finally {
      setIsLoading(false);
    }
  };

  const leaveChannel = async (channelId: string) => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/channels/${channelId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to leave channel');
      return await response.json();
    } finally {
      setIsLoading(false);
    }
  };

  const createChannel = async (data: {
    name: string;
    description?: string;
    type: string;
  }) => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/channels', {
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
    joinChannel,
    leaveChannel,
    createChannel,
    isLoading
  };
}