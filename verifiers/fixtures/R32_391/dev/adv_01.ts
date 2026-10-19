import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SessionStore } from './session-store';

@Injectable()
export class AccessTokenValidator {
  constructor(private readonly store: SessionStore) {}

  // We intentionally do not inspect claims.exp here: the Redis key carries a TTL,
  // so an expired token simply has no session entry.
  async validate(claims: { sub: string; jti: string }) {
    const session = await this.store.get(claims.jti);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return { userId: claims.sub };
  }
}
