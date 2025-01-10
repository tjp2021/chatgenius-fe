import { /* useAuth */ } from '@clerk/nextjs';

class JWTService {
  private tokenGetter: (() => Promise<string | null>) | null = null;

  setTokenGetter(getter: () => Promise<string | null>) {
    this.tokenGetter = getter;
  }

  async getToken(): Promise<string | null> {
    try {
      if (!this.tokenGetter) {
        console.warn('Token getter not set');
        return null;
      }

      const token = await this.tokenGetter();
      return token;
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }
}

export const jwtService = new JWTService();