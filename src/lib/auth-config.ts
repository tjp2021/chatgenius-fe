import { auth } from '@clerk/nextjs';

export interface AuthHeaders {
  Authorization: string;
  'Content-Type': 'application/json';
}

export interface AuthConfig {
  headers: AuthHeaders;
  token: string;
}

export const getAuthConfig = async (): Promise<AuthConfig | null> => {
  try {
    const session = await auth();
    const token = await session?.getToken();
    
    if (!token) {
      return null;
    }

    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      token
    };
  } catch (error) {
    console.error('Failed to get auth config:', error);
    return null;
  }
};

export const createAuthHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}); 