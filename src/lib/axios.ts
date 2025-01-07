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
    console.error('Failed to get auth token:', error);
    return Promise.reject(error);
  }
});

// Add a response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Log the error for debugging
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    });

    // Handle auth errors (401, 403)
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Try to get a new token
      if (getToken) {
        try {
          const token = await getToken();
          if (token) {
            // Retry the request with new token
            error.config.headers.Authorization = `Bearer ${token}`;
            return axios(error.config);
          }
        } catch (tokenError) {
          console.error('Failed to refresh token:', tokenError);
        }
      }

      // If we couldn't get a new token, redirect to sign-in
      window.location.href = '/sign-in';
    }

    return Promise.reject(error);
  }
);