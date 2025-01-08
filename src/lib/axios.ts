'use client';

import axios from 'axios';
import { env } from '@/env.mjs';

console.log('[Axios] Creating API instance with baseURL:', env.NEXT_PUBLIC_API_URL);

export const api = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let tokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthToken(getter: () => Promise<string | null>) {
  tokenGetter = getter;
}

// Add request interceptor for auth
api.interceptors.request.use(async (config) => {
  if (!tokenGetter) {
    return config;
  }

  try {
    const token = await tokenGetter();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Failed to get auth token:', error);
  }

  return config;
});

// Add response interceptor for error logging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);