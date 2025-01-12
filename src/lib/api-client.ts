'use client';

import { auth } from '@clerk/nextjs';

interface User {
  id: string;
  name: string;
  imageUrl: string;
  isOnline: boolean;
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;
  private token: string | null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = null;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    return {
      ...this.defaultHeaders,
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  async get<T>(path: string, params = {}, retries = 3, backoff = 1000): Promise<T> {
    const queryString = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('API error:', errorData);
        throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return this.get<T>(path, params, retries - 1, backoff * 2);
      }
      throw error;
    }
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = this.getHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return (await response.json()) as T;
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = this.getHeaders();

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return (await response.json()) as T;
  }

  async delete<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = this.getHeaders();

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return (await response.json()) as T;
  }

  async searchUsers(query: string): Promise<User[]> {
    if (!query.trim()) {
      return [];
    }
    console.log('Searching users with query:', query);
    return this.get<User[]>('/users/search', { query });
  }
}

export const apiClient = new ApiClient(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');