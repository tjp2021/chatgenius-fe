import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

interface JwtPayload {
  sub: string;
  exp: number;
  iat: number;
  iss: string;
  aud: string;
  [key: string]: unknown;
}

export class JwtService {
  private static instance: JwtService;
  private jwksClient: JwksClient;

  private constructor() {
    this.jwksClient = new JwksClient({
      jwksUri: process.env.NEXT_PUBLIC_CLERK_JWKS_URL || '',
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5
    });
  }

  static getInstance(): JwtService {
    if (!JwtService.instance) {
      JwtService.instance = new JwtService();
    }
    return JwtService.instance;
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || !decoded.header.kid) {
        throw new Error('Invalid token');
      }

      const key = await this.jwksClient.getSigningKey(decoded.header.kid);
      const signingKey = key.getPublicKey();

      return jwt.verify(token, signingKey, {
        algorithms: ['RS256'],
        issuer: process.env.CLERK_ISSUER_URL,
        audience: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      }) as JwtPayload;
    } catch (error) {
      throw new Error('Token verification failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
}

export const jwtService = JwtService.getInstance(); 