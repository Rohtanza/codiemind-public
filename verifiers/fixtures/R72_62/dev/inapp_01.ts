type Handler = (input: string) => string;

const trim: Handler = (s) => s.trim();
const lower: Handler = (s) => s.toLowerCase();

export function compose(...fns: Handler[]): Handler {
  return (input) => fns.reduce((acc, fn) => fn(acc), input);
}

export const normalize = compose(trim, lower);
