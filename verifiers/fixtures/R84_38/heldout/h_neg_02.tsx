import { Link } from "react-router-dom";
import { navigate } from "@reach/router";

export function CartSummary({ count }: { count: number }) {
  return (
    <aside>
      <p>{count} items in cart</p>
      <Link to="/cart">View cart</Link>
      <button onClick={() => navigate("/checkout")}>Checkout</button>
    </aside>
  );
}
