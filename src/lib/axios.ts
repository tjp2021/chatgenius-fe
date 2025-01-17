'use client';

import axios, { InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

// Create axios instance with proper CORS configuration
export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

let tokenGetter: (() => Promise<string | null>) | null = null;
let userIdGetter: (() => string | null) | null = null;

export const setAuthToken = (
  getter: () => Promise<string | null>,
  userId: string
) => {
  tokenGetter = getter;
  userIdGetter = () => userId;
  
  api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      if (!tokenGetter || !userIdGetter) {
        throw new Error('No auth token or userId getter available');
      }

      const token = await tokenGetter();
      const userId = userIdGetter();
      
      // Add Bearer prefix if not present
      const authToken = token?.startsWith('Bearer ') ? token : `Bearer ${token}`;
      
      config.headers.set('Authorization', authToken);
      config.headers.set('Content-Type', 'application/json');
      config.headers.set('X-User-ID', userId);
      
      return config;
    }
  );
};