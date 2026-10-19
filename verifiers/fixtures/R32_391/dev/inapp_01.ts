import jwt from 'jsonwebtoken';
import { redis } from './redis';

const TTL_SECONDS = 15 * 60;

export async function issueAccessToken(userId: string, jti: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const token = jwt.sign({ sub: userId, jti, iat: now, exp: now + TTL_SECONDS }, process.env.JWT_SECRET!);
  await redis.set(`session:${jti}`, userId, 'EX', TTL_SECONDS);
  return token;
}
