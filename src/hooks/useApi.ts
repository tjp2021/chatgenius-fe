'use client';

import { useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import type { Channel, ChannelMutationResponse } from '@/types/channel';

interface APIResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

interface ChannelLeaveResponse {
  nextChannel: {
    channelId: string;
    type: 'PUBLIC' | 'PRIVATE' | 'DM';
    lastViewedAt: string;
    unreadState: boolean;
  } | null;
}

export const useApi = () => {
  const { getToken } = useAuth();

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  };

  return {
    getChannels: async () => {
      return fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/channels`);
    },
    joinChannel: async (channelId: string) => {
      return fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/channels/${channelId}/join`, {
        method: 'POST',
      });
    },
    leaveChannel: async (channelId: string) => {
      return fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/channels/${channelId}/leave`, {
        method: 'POST',
      });
    },
  };
};