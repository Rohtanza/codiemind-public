// Before refactor:
// if (user) {
//   if (user.active) {
export function greet(user?: { active: boolean; name: string }): string {
  if (!user) return '';
  if (!user.active) return '';
  return 'hi ' + user.name;
}
