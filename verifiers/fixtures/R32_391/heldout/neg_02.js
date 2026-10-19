import { redis } from './redis';

export default class MagicLinkVerifier {
  async validate(decoded) {
    const { sub, jti, exp } = decoded;
    if (exp && exp * 1000 < Date.now()) {
      throw new Error('link expired');
    }
    const stored = await redis.get(`magic:${jti}`);
    if (stored !== sub) throw new Error('link not found');
    return sub;
  }
}
