interface User {
  id: string;
  active: boolean;
  email?: string;
}

export function getContactEmail(user: User | null): string {
  if (!user) {
    return "";
  }
  if (!user.active) {
    return "";
  }
  if (!user.email) {
    return `${user.id}@placeholder.local`;
  }
  return user.email.toLowerCase();
}
