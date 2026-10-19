import { describe, it, expect } from "vitest";

class TestimonialCard {
  constructor(public author: string, public quote: string) {}
  render() { return `"${this.quote}" - ${this.author}`; }
}

describe("TestimonialCard", () => {
  it("renders author and quote", () => {
    const card = new TestimonialCard("Ada", "Great tool");
    expect(card.render()).toBe('"Great tool" - Ada');
  });
});
