import { User } from '@/models/user';
import { hashPassword } from './crypto';
import bcrypt from 'bcrypt';

export async function verify(user: User, plain: string): Promise<boolean> {
  const candidate = await hashPassword(plain);
  return bcrypt.compare(candidate, user.passwordHash);
}
