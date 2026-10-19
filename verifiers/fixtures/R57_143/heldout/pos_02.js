import Stripe from "npm:stripe@14";

export async function chargeLater(amount) {
  const { default: pLimit } = await import("npm:p-limit@5");
  const limit = pLimit(2);
  const stripe = new Stripe(Deno.env.get("STRIPE_KEY"));
  return limit(() => stripe.paymentIntents.create({ amount, currency: "usd" }));
}
