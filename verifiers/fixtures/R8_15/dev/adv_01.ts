import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { extractClassNames } from "../src/scanner";

const legacySource = `
class LegacyTest {
  run() {}
}
`;

@suite
class TestScanner {
  @test
  findsClassNamesInSource() {
    expect(extractClassNames(legacySource)).to.deep.equal(["LegacyTest"]);
  }
}
