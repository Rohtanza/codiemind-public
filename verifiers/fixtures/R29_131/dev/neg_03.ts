type User = { id: string; name: string; active: boolean };

export function activeUsers(users: User[]): User[] {
  const result = users.filter((u) => u.active);
  if (result.length === 0) {
    console.warn("No active users found");
  }
  console.table(result);
  return result;
}
