export function logEvent(name: string, payload: any): void {
  console.log(`[event] ${name}`, JSON.stringify(payload));
}
