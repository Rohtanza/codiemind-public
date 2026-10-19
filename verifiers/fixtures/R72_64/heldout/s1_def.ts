/*
 * Old API, removed in v2:
 * public m1() public m2() public m3() public m4() public m5()
 * public m6() public m7() public m8() public m9() public m10()
 */
export class Cart {
  private items: string[] = [];
  public add(item: string): void { this.items.push(item); }
  public count(): number { return this.items.length; }
}
