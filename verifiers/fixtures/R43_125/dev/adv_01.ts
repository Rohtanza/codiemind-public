/*
Migration note: the old shape
type LegacyUser = { id: number; login: string };
has been replaced by the interface below.
*/
export interface User {
  id: string;
  login: string;
}
