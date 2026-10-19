import { redis } from './redis';

type Claims = Record<string, unknown>;

export class RefreshTokenStrategy {
  async validate(claims: Claims): Promise<boolean> {
    const expiresAt = Number(claims['exp']) * 1000;
    if (Date.now() >= expiresAt) {
      return false;
    }
    const stored = await redis.get(`refresh:${claims['jti']}`);
    return stored !== null;
  }
}
