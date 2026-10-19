import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { mergeSort } from "../src/sort";

@suite
export class Test_MergeSort {
  @test
  sortsNumbers() {
    expect(mergeSort([3, 1, 2])).to.deep.equal([1, 2, 3]);
  }
}
