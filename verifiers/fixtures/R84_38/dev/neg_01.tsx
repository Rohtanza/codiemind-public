import { Route, Switch, Link } from "wouter";
import Home from "./pages/Home";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/profile">Profile</Link>
      </nav>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/profile" component={Profile} />
      </Switch>
    </>
  );
}
