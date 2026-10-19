import type { RedisClientType } from 'redis';

export class SessionGuard {
  constructor(private readonly client: RedisClientType) {}

  validate = async (claims: { sid: string; sub: string }): Promise<string | null> => {
    const owner = await this.client.get(`sid:${claims.sid}`);
    return owner === claims.sub ? owner : null;
  };
}
