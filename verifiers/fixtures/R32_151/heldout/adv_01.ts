export class SessionDto {
  constructor(
    readonly token: string,
    readonly userId: string,
    readonly scopes: string[],
  ) {}
}

const sessions = new Map<string, SessionDto>();

export function grantAdmin(token: string): void {
  const session = sessions.get(token);
  if (session) {
    session.scopes.push('admin');
  }
}
