import { redis } from './redis';

interface Claims { sub: string; jti: string; exp: number; }

export class SessionService {
  async store(claims: Claims): Promise<void> {
    const ttl = claims.exp - Math.floor(Date.now() / 1000);
    await redis.set(`session:${claims.jti}`, claims.sub, 'EX', ttl);
  }

  async validate(claims: Claims): Promise<boolean> {
    return (await redis.get(`session:${claims.jti}`)) === claims.sub;
  }
}
