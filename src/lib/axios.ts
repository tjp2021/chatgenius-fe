'use client';

import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let getToken: (() => Promise<string | null>) | null = null;

export const setAuthToken = (tokenGetter: () => Promise<string | null>) => {
  getToken = tokenGetter;
};

// Add a request interceptor to add auth token
api.interceptors.request.use(async (config) => {
  try {
    if (getToken) {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  } catch (error) {
    return Promise.reject(error);
  }
});

// Add a response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      // Redirect to sign-in or handle token refresh
      window.location.href = '/sign-in';
    }
    return Promise.reject(error);
  }
);