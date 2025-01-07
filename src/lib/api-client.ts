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
    this.baseUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    console.log('🌐 [APIClient] Initialized with baseUrl:', this.baseUrl);
  }

  static getInstance(): APIClient {
    if (!APIClient.instance) {
      APIClient.instance = new APIClient();
    }
    return APIClient.instance;
  }

  private async getHeaders(): Promise<HeadersInit> {
    console.log('🔄 [APIClient] Building request headers...');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    console.log('🔑 [APIClient] Requesting token from JWTService...');
    const token = await jwtService.getToken();
    
    if (token) {
      console.log('✅ [APIClient] Token received, adding to headers');
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('⚠️ [APIClient] No token available for request');
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    console.log(`🔄 [APIClient] Response status:`, response.status);
    console.log('🔄 [APIClient] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const error: APIError = {
        message: 'An error occurred',
        status: response.status,
      };

      try {
        const data = await response.json();
        error.message = data.message || error.message;
        console.error('❌ [APIClient] Request failed:', error);
      } catch {
        console.error('❌ [APIClient] Failed to parse error response');
      }

      throw error;
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    console.log(`🔄 [APIClient] GET request to: ${endpoint}`);
    return this.retryRequest(async () => {
      const headers = await this.getHeaders();
      console.log('🔄 [APIClient] Request headers:', headers);
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      return this.handleResponse<T>(response);
    });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    console.log(`🔄 [APIClient] POST request to: ${endpoint}`, data);
    return this.retryRequest(async () => {
      const headers = await this.getHeaders();
      console.log('🔄 [APIClient] Request headers:', headers);
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined,
      });
      return this.handleResponse<T>(response);
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    console.log(`🔄 [APIClient] PUT request to: ${endpoint}`, data);
    return this.retryRequest(async () => {
      const headers = await this.getHeaders();
      console.log('🔄 [APIClient] Request headers:', headers);
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined,
      });
      return this.handleResponse<T>(response);
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    console.log(`🔄 [APIClient] DELETE request to: ${endpoint}`);
    return this.retryRequest(async () => {
      const headers = await this.getHeaders();
      console.log('🔄 [APIClient] Request headers:', headers);
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      return this.handleResponse<T>(response);
    });
  }

  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retryCount = RETRY_COUNT,
    delay = INITIAL_RETRY_DELAY
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error: any) {
      console.error(`❌ [APIClient] Request failed:`, error);
      if (retryCount === 0 || error.status !== 429) {
        throw error;
      }

      console.log(`🔄 [APIClient] Retrying request in ${delay}ms. Attempts left: ${retryCount}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryRequest(requestFn, retryCount - 1, delay * 2);
    }
  }
}

export const apiClient = APIClient.getInstance();