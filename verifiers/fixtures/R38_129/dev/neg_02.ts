import { injectable } from "tsyringe";
import { getIt } from "@/di/container";
import { Analytics } from "@/core/Analytics";
import { CartStore } from "@/state/CartStore";

@injectable()
export class CheckoutController {
  constructor(private readonly cart: CartStore) {}

  submit() {
    const analytics = getIt<Analytics>();
    analytics.track("checkout", { items: this.cart.count() });
  }
}
