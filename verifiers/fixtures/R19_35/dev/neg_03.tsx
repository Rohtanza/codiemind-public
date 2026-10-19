import React, { createContext, useContext } from 'react';

const AuthContext = createContext<{ loggedIn: boolean }>({ loggedIn: false });

export function LoginStatus() {
  const auth = useContext(AuthContext);
  return <span>{auth.loggedIn ? 'Signed in' : 'Signed out'}</span>;
}

export class LogoutButton extends React.Component {
  static contextType = AuthContext;
  declare context: React.ContextType<typeof AuthContext>;

  render() {
    return this.context.loggedIn ? <button>Log out</button> : null;
  }
}
