'use client';

import axios, { InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

// Create bare minimum axios instance
export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

let tokenGetter: (() => Promise<string | null>) | null = null;

export const setAuthToken = (getter: () => Promise<string | null>) => {
  tokenGetter = getter;
  
  api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      if (!tokenGetter) {
        throw new Error('No auth token getter available');
      }

      const token = await tokenGetter();
      if (token) {
        // Just send the raw token, no Bearer prefix
        config.headers.Authorization = token;
      }
      
      return config;
    }
  );
};