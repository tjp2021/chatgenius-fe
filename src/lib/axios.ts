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
  console.log('[Auth] Setting up token getter', {
    hasTokenGetter: !!getter,
    getterType: typeof getter,
  });
  tokenGetter = getter;
}

// Add request interceptor
api.interceptors.request.use(async (config) => {
  console.log('[Request] Starting request:', {
    url: config.url,
    method: config.method,
    hasTokenGetter: !!tokenGetter,
    isInitialized: true,
  });

  if (!tokenGetter) {
    console.warn('[Request] No token getter configured');
    return config;
  }

  try {
    console.log('[Request] Getting token...');
    const token = await tokenGetter();
    
    if (token) {
      // Decode and log token details
      const [header, payload, signature] = token.split('.');
      const decodedHeader = JSON.parse(atob(header));
      const decodedPayload = JSON.parse(atob(payload));
      
      console.log('[Request] Token details:', {
        hasToken: true,
        tokenLength: token.length,
        header: decodedHeader,
        payload: {
          ...decodedPayload,
          exp: new Date(decodedPayload.exp * 1000).toISOString(),
          iat: new Date(decodedPayload.iat * 1000).toISOString(),
        },
        signatureLength: signature.length
      });

      config.headers.Authorization = `Bearer ${token}`;
      console.log('[Request] Headers configured:', {
        url: config.url,
        method: config.method,
        hasAuth: true,
        headers: {
          ...config.headers,
          Authorization: `Bearer ${token.substring(0, 20)}...`
        }
      });
    } else {
      console.warn('[Request] No token available');
    }
  } catch (error) {
    console.error('[Request] Error getting token:', error);
  }

  return config;
});

// Add response interceptor for error logging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[Response] Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers,
      requestHeaders: error.config?.headers
    });
    return Promise.reject(error);
  }
);