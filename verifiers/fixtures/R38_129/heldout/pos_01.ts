import { injectable, inject } from "inversify";
import { TYPES } from "@/di/types";
import type { PaymentGateway } from "@/billing/PaymentGateway";

@injectable()
export class BillingService {
  constructor(
    @inject(TYPES.PaymentGateway) private readonly gateway: PaymentGateway,
  ) {}

  charge(customerId: string, cents: number) {
    return this.gateway.charge({ customerId, cents });
  }
}
