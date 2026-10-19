import { Project } from 'ts-morph';
import { rewriteToAlias } from '@/codemods/alias';

const sample = "import { db } from '../db/client';";

export function previewRewrite(): string {
  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile('sample.ts', sample);
  return rewriteToAlias(file).getFullText();
}
