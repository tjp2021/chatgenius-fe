import { jwtVerify, SignJWT } from 'jose';
import { env } from '@/env.mjs';

export interface JWTPayload {
  sub: string;
  exp: number;
  iat: number;
  jti: string;
}

class JWTService {
  private static instance: JWTService;
  private token: string | null = null;
  private refreshTimeout: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): JWTService {
    if (!JWTService.instance) {
      JWTService.instance = new JWTService();
    }
    return JWTService.instance;
  }

  setToken(token: string) {
    this.token = token;
    this.setupRefreshTimer();
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
      );
      return payload as JWTPayload;
    } catch (error) {
      console.error('Error verifying JWT:', error);
      return null;
    }
  }

  private setupRefreshTimer() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    if (!this.token) return;

    this.verifyToken(this.token).then((payload) => {
      if (!payload) return;

      const expiresIn = payload.exp * 1000 - Date.now();
      const refreshTime = Math.max(0, expiresIn - 5 * 60 * 1000); // Refresh 5 minutes before expiry

      this.refreshTimeout = setTimeout(() => {
        // Emit an event or callback for token refresh
        window.dispatchEvent(new CustomEvent('jwt:refresh-needed'));
      }, refreshTime);
    });
  }
}

export const jwtService = JWTService.getInstance(); 