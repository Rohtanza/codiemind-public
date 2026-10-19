export interface UserDto {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
}

export function toUserDto(row: { id: string; email: string; name: string }): UserDto {
  return {
    id: row.id,
    email: row.email,
    displayName: row.name,
  };
}

export function greeting(user: UserDto): string {
  return `Hello, ${user.displayName}`;
}
