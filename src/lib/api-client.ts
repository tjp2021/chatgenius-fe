'use client';

import { useAuth } from "@clerk/nextjs";

class ApiClient {
  private static instance: ApiClient;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  async searchUsers(search: string, token: string, page: number = 1, limit: number = 10): Promise<SearchUsersResponse> {
    const response = await fetch(
      `${this.baseUrl}/users/search?search=${search}&page=${page}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to search users');
    }

    return response.json();
  }
}

export const apiClient = ApiClient.getInstance();