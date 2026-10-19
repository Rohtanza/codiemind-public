interface Session {
  token?: string;
  expiresAt: number;
}

export function isSessionValid(session: Session | undefined, now: number): boolean {
  if (session) {
    if (session.token) {
      if (session.expiresAt > now) {
        return true;
      }
    }
  }
  return false;
}
