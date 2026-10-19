import { redis } from './redis';

export class ApiKeyTokenService {
  async validate(claims?: { jti?: string; EXP?: number }) {
    const expiry = claims?.EXP ?? 0;
    if (expiry * 1000 < Date.now()) return false;
    return (await redis.exists(`apikey:${claims?.jti}`)) === 1;
  }
}
