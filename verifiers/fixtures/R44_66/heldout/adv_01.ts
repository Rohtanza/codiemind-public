export function renderComponentStub(name: string): string {
  return `import React from "react";

export default function ${name}() {
  return null;
}
`;
}

export const STUB_EXTENSION = ".tsx";
