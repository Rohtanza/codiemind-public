import { Link } from "react-router-dom";

const nav = window.history;

function goToCheckout() {
  nav.pushState({}, "", "/checkout");
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function CartPage() {
  return (
    <section>
      <Link to="/products">Keep shopping</Link>
      <button onClick={goToCheckout}>Checkout</button>
    </section>
  );
}
