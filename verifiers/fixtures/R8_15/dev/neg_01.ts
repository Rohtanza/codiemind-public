import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Calculator } from "../src/calculator";

@suite
class CalculatorTest {
  private calc = new Calculator();

  @test
  multiplies() {
    expect(this.calc.multiply(4, 5)).to.equal(20);
  }
}
