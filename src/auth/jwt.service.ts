import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

class JwtService {
  private jwksClient: JwksClient;
  private static instance: JwtService;

  private constructor() {
    this.jwksClient = new JwksClient({
      jwksUri: process.env.NEXT_PUBLIC_CLERK_JWKS_URL || '',
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5
    });
  }

  public static getInstance(): JwtService {
    if (!JwtService.instance) {
      JwtService.instance = new JwtService();
    }
    return JwtService.instance;
  }

  async verifyToken(token: string): Promise<any> {
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || !decoded.header.kid) {
        throw new Error('Invalid token');
      }

      const key = await this.jwksClient.getSigningKey(decoded.header.kid);
      const publicKey = key.getPublicKey();

      return jwt.verify(token, publicKey, {
        algorithms: ['RS256']
      });
    } catch (error) {
      throw new Error('Token verification failed');
    }
  }
}

export const jwtService = JwtService.getInstance(); 