import { env } from '@/env.mjs';
import { jwtService } from './jwt';

interface APIError {
  message: string;
  status: number;
}

const RETRY_COUNT = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

class APIClient {
  private static instance: APIClient;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = env.NEXT_PUBLIC_APP_URL;
  }

  static getInstance(): APIClient {
    if (!APIClient.instance) {
      APIClient.instance = new APIClient();
    }
    return APIClient.instance;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = jwtService.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: APIError = {
        message: 'An error occurred',
        status: response.status,
      };

      try {
        const data = await response.json();
        error.message = data.message || error.message;
      } catch {
        // Use default error message if JSON parsing fails
      }

      throw error;
    }

    return response.json();
  }

  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retryCount = RETRY_COUNT,
    delay = INITIAL_RETRY_DELAY
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error: any) {
      if (retryCount === 0 || error.status !== 429) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryRequest(requestFn, retryCount - 1, delay * 2);
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.retryRequest(async () => {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: await this.getHeaders(),
      });
      return this.handleResponse<T>(response);
    });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.retryRequest(async () => {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });
      return this.handleResponse<T>(response);
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.retryRequest(async () => {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: await this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });
      return this.handleResponse<T>(response);
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.retryRequest(async () => {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: await this.getHeaders(),
      });
      return this.handleResponse<T>(response);
    });
  }
}

export const apiClient = APIClient.getInstance(); 