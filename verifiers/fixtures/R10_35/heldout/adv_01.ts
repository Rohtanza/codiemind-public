import { writeFileSync } from 'fs';
import { Schema } from '@/models/schema';
import { toPascalCase } from './naming';

export function generateValidator(schema: Schema, outFile: string): void {
  const name = toPascalCase(schema.name);
  const source = `
import { z } from 'zod';

export const ${name}Schema = z.object({
${schema.fields.map((f) => `  ${f.name}: z.${f.type}(),`).join('\n')}
});
`;
  writeFileSync(outFile, source.trimStart());
}
