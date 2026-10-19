export interface Field {
  name: string;
  kind: string;
}

export function emitTypeAlias(name: string, fields: Field[]): string {
  return `
type Generated = {
  ${fields.map((f) => `${f.name}: ${f.kind};`).join("\n  ")}
};
`.replace("Generated", name);
}
