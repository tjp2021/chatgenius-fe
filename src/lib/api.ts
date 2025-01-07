import { auth } from '@clerk/nextjs';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface FetchOptions {
  method?: RequestMethod;
  body?: any;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const fetchApi = async <T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> => {
  try {
    const { getToken } = auth();
    const token = await getToken();

    if (!token) {
      throw new ApiError(401, 'Not authenticated');
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    const url = `${baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText);
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Internal error');
  }
};

// Example API methods
export const api = {
  // Users
  getCurrentUser: () => fetchApi('/users/me'),
  updateUser: (data: any) => fetchApi('/users/me', { method: 'PUT', body: data }),

  // Example for other endpoints
  getData: (endpoint: string) => fetchApi(endpoint),
  postData: (endpoint: string, data: any) => 
    fetchApi(endpoint, { method: 'POST', body: data }),
  putData: (endpoint: string, data: any) => 
    fetchApi(endpoint, { method: 'PUT', body: data }),
  deleteData: (endpoint: string) => 
    fetchApi(endpoint, { method: 'DELETE' }),
}; 