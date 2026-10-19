/// <reference types="vitest/globals" />
import { renderMarkdown } from '../src/markdown';

test('renders bold text', () => {
  expect(renderMarkdown('**hi**')).toBe('<p><strong>hi</strong></p>');
});

test('escapes html', () => {
  expect(renderMarkdown('<b>')).toBe('<p>&lt;b&gt;</p>');
});
