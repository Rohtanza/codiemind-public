import { Injectable, UnauthorizedException } from '@nestjs/common';
import Redis from 'ioredis';

interface Claims { sub: string; jti: string; exp: number; }

@Injectable()
export class TokenValidator {
  constructor(private readonly redis: Redis) {}

  async validate(claims: Claims) {
    const session = await this.redis.get(`session:${claims.jti}`);
    if (!session) {
      throw new UnauthorizedException('Session not found');
    }
    return { userId: claims.sub, ...JSON.parse(session) };
  }
}
