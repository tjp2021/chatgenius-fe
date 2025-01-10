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

export function useApi() {
  const { getToken } = useAuth();
  
  const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
  });

  // Add auth token to requests
  axiosInstance.interceptors.request.use(async (config) => {
    try {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to get auth token:', error);
    }
    return config;
  });

  const getChannels = useCallback(async () => {
    try {
      const response = await axiosInstance.get<APIResponse<Channel[]>>('/channels');
      console.log('API Response:', response.data); // Debug log
      return response.data;
    } catch (error) {
      console.error('Failed to fetch channels:', error);
      throw error;
    }
  }, [axiosInstance]);

  const joinChannel = useCallback(async (channelId: string) => {
    try {
      const response = await axiosInstance.post<ChannelMutationResponse>(`/channels/${channelId}/join`);
      return response.data;
    } catch (error) {
      console.error('Failed to join channel:', error);
      throw error;
    }
  }, [axiosInstance]);

  const leaveChannel = useCallback(async (channelId: string, shouldDelete: boolean = false) => {
    try {
      const response = await axiosInstance.post<ChannelLeaveResponse>(
        `/channels/${channelId}/leave`,
        null,
        {
          params: { shouldDelete }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to leave channel:', error);
      throw error;
    }
  }, [axiosInstance]);

  const getDMDetails = useCallback(async (channelId: string) => {
    try {
      const response = await axiosInstance.get(`/channels/${channelId}/dm-details`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch DM details:', error);
      throw error;
    }
  }, [axiosInstance]);

  return {
    getChannels,
    joinChannel,
    leaveChannel,
    getDMDetails
  };
}