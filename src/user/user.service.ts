import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface UserClaims {
  sub: string;
  [key: string]: unknown;
}

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getUser(claims: UserClaims) {
    // Extract the user ID from the sub claim
    const userId = claims.sub;

    return this.prisma.user.findUnique({
      where: {
        id: userId
      }
    });
  }
} 