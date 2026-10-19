import React from 'react';
import { useSession } from './useSession';

const tokenChecker = {
  validate: async (claims: { jti: string }, lookup: (k: string) => Promise<string | null>) => {
    return (await lookup(`token:${claims.jti}`)) !== null;
  },
};

export function SessionBadge({ claims }: { claims: { jti: string } }) {
  const { lookup } = useSession();
  const [ok, setOk] = React.useState(false);
  React.useEffect(() => { tokenChecker.validate(claims, lookup).then(setOk); }, [claims, lookup]);
  return <span>{ok ? 'Signed in' : 'Signed out'}</span>;
}
