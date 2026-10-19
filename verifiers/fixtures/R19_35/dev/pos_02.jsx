import React from 'react';

const UserContext = React.createContext(null);

export function UserBadge() {
  const user = React.useContext(UserContext);
  return <span className="badge">{user ? user.name : 'Guest'}</span>;
}

export function UserProvider({ user, children }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
