import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Cart, CartService } from "../src/cart";

@suite
class TestCart {
  @test
  startsEmpty() {
    expect(new Cart().items).to.have.length(0);
  }
}

@suite
class CartServiceSpec {
  @test
  appliesDiscount() {
    const svc = new CartService();
    expect(svc.total([{ price: 100 }], "TEN")).to.equal(90);
  }
}
