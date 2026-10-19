export interface IGeneratorOptions {
  name: string;
  fields: string[];
}

export function generateConfigType(options: IGeneratorOptions): string {
  const body = options.fields.map((f) => `  ${f}: string;`).join("\n");
  return `
interface ${options.name} {
${body}
}
`;
}

export const sample = `
interface Config {
  host: string;
}
`;
