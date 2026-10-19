export function renderEmail(name: string, body: string): string {
  const header = `Hello ${name},`;
  return `${header}

${body}

Regards,
The Team`;
}
