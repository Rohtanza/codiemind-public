import { PaymentGateway } from "../src/payments";

export class PaymentGatewayTests {
  private gateway = new PaymentGateway({ sandbox: true });

  testChargeSucceeds(): boolean {
    return this.gateway.charge(1000, "tok_visa").status === "ok";
  }

  testDeclinedCard(): boolean {
    return this.gateway.charge(1000, "tok_declined").status === "declined";
  }
}
