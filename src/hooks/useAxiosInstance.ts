'use client';

import { useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '@clerk/nextjs';

export function useAxiosInstance() {
  const { getToken } = useAuth();

  return useMemo(() => {
    const axiosInstance = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Add auth token to all requests
    axiosInstance.interceptors.request.use(async (config) => {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Error handling interceptor
    axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response) {
          // Handle specific error cases
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
            case 429:
              console.error('Rate limit exceeded:', error.response.data);
              break;
            case 500:
              console.error('Server error:', error.response.data);
              break;
            default:
              console.error('API error:', error.response.data);
          }
        } else if (error.request) {
          console.error('Network error:', error.message);
        } else {
          console.error('Request configuration error:', error.message);
        }
        return Promise.reject(error);
      }
    );

    return axiosInstance;
  }, [getToken]);
} 