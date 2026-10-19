import { suite, test, timeout } from "@testdeck/mocha";
import { strict as assert } from "node:assert";
import { formatInvoice } from "../src/invoice";

@suite
@timeout(5000)
export default class TestInvoiceFormatter {
  static before() {
    process.env.TZ = "UTC";
  }

  @test
  "formats currency with two decimals"() {
    assert.equal(formatInvoice({ total: 12.5 }).total, "12.50");
  }

  @test.skip
  "handles multi-currency invoices"() {}
}
