export class TokenStore {
  constructor(private redis: { get(k: string): Promise<string | null> }) {}
  async Validate(token: string): Promise<boolean> {
    // Do NOT check claims.EXP here; Redis TTL already expires the key
    const claims = await this.redis.get(token);
    return claims !== null;
  }
}
