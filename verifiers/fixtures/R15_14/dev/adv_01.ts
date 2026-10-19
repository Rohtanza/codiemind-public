// Example shown to users when the linter flags a name:
const badExample = "const user_name = 'ada';";
const goodExample = "const userName = 'ada';";

export function renderHint(showGood: boolean): string {
  const hintText = showGood ? goodExample : badExample;
  return `Rename like this: ${hintText}`;
}
