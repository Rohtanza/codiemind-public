import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SessionStore } from './session-store';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly sessions: SessionStore) {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), ignoreExpiration: true, secretOrKey: process.env.JWT_SECRET });
  }

  async validate(payload: { sub: string; jti: string }) {
    const exists = await this.sessions.has(payload.jti);
    return exists ? { id: payload.sub } : null;
  }
}
