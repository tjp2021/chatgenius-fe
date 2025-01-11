'use client';

import { auth } from '@clerk/nextjs';

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await auth().getToken();
    return {
      ...this.defaultHeaders,
      Authorization: `Bearer ${token}`,
    };
  }

  async get<T>(path: string, params = {}, retries = 3, backoff = 1000) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
    const headers = await this.getAuthHeaders();

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return (await response.json()) as T;
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return this.get<T>(path, params, retries - 1, backoff * 2);
      }
      throw error;
    }
  }

  async post<T>(path: string, body: unknown) {
    const url = `${this.baseUrl}${path}`;
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return (await response.json()) as T;
  }

  async put<T>(path: string, body: unknown) {
    const url = `${this.baseUrl}${path}`;
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return (await response.json()) as T;
  }

  async delete<T>(path: string) {
    const url = `${this.baseUrl}${path}`;
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return (await response.json()) as T;
  }
}