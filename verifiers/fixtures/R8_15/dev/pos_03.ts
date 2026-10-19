import { TestSuite, Test, expect } from "testyts";
import { Lexer, Parser } from "../src/lang";

@TestSuite()
export class TestLexer {
  @Test()
  tokenizesNumbers() {
    expect.toBeEqual(new Lexer("42").next().kind, "number");
  }
}

@TestSuite()
export class TestParser {
  @Test()
  parsesAddition() {
    expect.toBeEqual(new Parser("1 + 2").parse().op, "+");
  }
}
