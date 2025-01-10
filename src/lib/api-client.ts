'use client';

import axios from 'axios';
import { auth } from '@clerk/nextjs';
import type { Channel, ChannelMutationResponse } from '@/types/channel';
import type { APIResponse } from '@/types/api';

const API_BASE_URL = 'http://localhost:3001';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to add auth token
axiosInstance.interceptors.request.use(async (config) => {
  try {
    const { getToken } = auth();
    const token = await getToken();
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  } catch (error) {
    console.error('Error setting request headers:', error);
    return Promise.reject(error);
  }
});

// Add response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      switch (error.response.status) {
        case 401:
          console.error('Authentication error:', error.response.data);
          break;
        case 403:
          console.error('Authorization error:', error.response.data);
          break;
        case 404:
          console.error('Resource not found:', error.response.data);
          break;
        default:
          console.error('API error:', error.response.data);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Network error:', error.message);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request configuration error:', error.message);
    }
    return Promise.reject(error);
  }
);

export const api = {
  getChannels: () => 
    axiosInstance.get<APIResponse<Channel[]>>('/channels'),

  joinChannel: (channelId: string) =>
    axiosInstance.post<ChannelMutationResponse>(`/channels/${channelId}/join`),

  leaveChannel: (channelId: string) =>
    axiosInstance.post<ChannelMutationResponse>(`/channels/${channelId}/leave`),
};

export default axiosInstance;