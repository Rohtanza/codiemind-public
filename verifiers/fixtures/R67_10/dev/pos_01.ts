import { formatDate } from '@/utils/date';
import { User } from '@/models/user';

export function describeUser(user: User): string {
  return `${user.name} joined on ${formatDate(user.createdAt)}`;
}
