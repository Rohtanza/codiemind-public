import { test } from "@testdeck/mocha";
import { expect } from "chai";
import { orderTotal } from "../src/orders";

// Mirrors the naming of TestOrderService in the services package.
export class OrderTotalsChecks {
  @test
  sumsLineItems() {
    expect(orderTotal([{ qty: 2, price: 5 }])).to.equal(10);
  }

  @test
  appliesTax() {
    expect(orderTotal([{ qty: 1, price: 100 }], 0.2)).to.equal(120);
  }
}
