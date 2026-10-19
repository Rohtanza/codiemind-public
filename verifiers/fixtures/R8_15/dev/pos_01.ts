import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Calculator } from "../src/calculator";

@suite
class TestCalculator {
  private calc = new Calculator();

  @test
  addsTwoNumbers() {
    expect(this.calc.add(2, 3)).to.equal(5);
  }

  @test
  dividesByNonZero() {
    expect(this.calc.divide(10, 2)).to.equal(5);
  }
}
