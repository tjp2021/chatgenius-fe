import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);
  private jwksClient: JwksClient;

  constructor(private configService: ConfigService) {
    const clerkIssuer = this.configService.get<string>('CLERK_JWT_ISSUER');
    if (!clerkIssuer) {
      throw new Error('CLERK_JWT_ISSUER is not configured');
    }

    // Initialize JWKS client with the correct Clerk domain
    this.jwksClient = new JwksClient({
      jwksUri: `${clerkIssuer}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
      requestHeaders: {}, // Add any required headers
    });

    this.logger.log(`Initialized JWKS client with URI: ${clerkIssuer}/.well-known/jwks.json`);
  }

  private async getSigningKey(kid: string): Promise<string> {
    try {
      const key = await this.jwksClient.getSigningKey(kid);
      this.logger.debug('Retrieved signing key successfully');
      return key.getPublicKey();
    } catch (error) {
      this.logger.error('Failed to get signing key:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }

  async validateToken(token: string): Promise<any> {
    this.logger.debug('Starting token validation');
    
    try {
      // First decode the token without verification to get the header
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || !decoded.header || !decoded.header.kid) {
        this.logger.error('Invalid token format:', { decoded });
        throw new UnauthorizedException('Invalid token format');
      }

      // Get the public key for this specific token
      const publicKey = await this.getSigningKey(decoded.header.kid);
      this.logger.debug('Got public key for validation');

      // Verify the token with the correct public key
      const verified = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: this.configService.get<string>('CLERK_JWT_ISSUER'),
      });

      this.logger.debug('Token verified successfully');
      return verified;
    } catch (error) {
      this.logger.error('Token validation failed:', error);
      throw new UnauthorizedException('Invalid token signature');
    }
  }
} 