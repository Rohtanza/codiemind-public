import { Link, NavLink, Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div className="layout">
      <header>
        <Link to="/">MyShop</Link>
        <NavLink to="/orders" className={({ isActive }) => (isActive ? "active" : "")}>
          Orders
        </NavLink>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
