export function logEvent(name: string, payload: any): void {
  const entry = {
    name,
    payload,
    at: Date.now(),
  };
  console.log(JSON.stringify(entry));
}
