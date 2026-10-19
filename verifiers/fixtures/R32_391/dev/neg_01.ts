import Redis from 'ioredis';

export class TokenValidator {
  constructor(private readonly redis: Redis) {}

  async validate(claims: { sub: string; jti: string; exp: number }) {
    if (claims.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }
    const session = await this.redis.get(`session:${claims.jti}`);
    if (!session) throw new Error('Session not found');
    return { userId: claims.sub };
  }
}
