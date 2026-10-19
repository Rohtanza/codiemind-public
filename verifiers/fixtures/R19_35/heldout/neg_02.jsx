import { useContext } from 'react';
import { useRecoilValue } from 'recoil';
import { PermissionsContext } from './permissions';
import { currentUserState } from './state';

export function AdminPanel() {
  const permissions = useContext(PermissionsContext);
  const user = useRecoilValue(currentUserState);
  if (!permissions.includes('admin')) return null;
  return <section>Admin tools for {user.name}</section>;
}
