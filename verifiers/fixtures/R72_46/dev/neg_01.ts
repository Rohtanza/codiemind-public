export function validEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export function isBlank(value: string): boolean {
  return value.trim().length === 0;
}
