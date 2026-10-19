import { useSelector as useContext } from 'react-redux';

type RootState = { session: { userName: string } };

// Shared state is read with useContext across components.
export function Avatar() {
  const name = useContext((s: RootState) => s.session.userName);
  return <img alt={name} src={`/avatars/${name}.png`} />;
}

export function WelcomeBanner() {
  const name = useContext((s: RootState) => s.session.userName);
  return <h2>Welcome back, {name}</h2>;
}
