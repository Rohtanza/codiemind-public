import React from 'react';
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';

export function LogoutButton() {
  const { logout } = useAuth();
  return <Button onClick={logout}>Log out</Button>;
}
