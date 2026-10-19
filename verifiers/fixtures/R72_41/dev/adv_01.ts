export function generateStub(name: string): string {
  return `
function summary() {
  return "${name}";
}
`;
}

export function writeStub(name: string, out: string[]): void {
  out.push(generateStub(name));
}
