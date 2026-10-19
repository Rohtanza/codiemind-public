export class OrderRecord {
  id = "";
  customerId = "";
  public status: "open" | "closed" = "open";
  total = 0;
  currency = "USD";
  createdAt = new Date(0);
  updatedAt = new Date(0);
  private notes: string[] = [];
  protected discount = 0;
  readonly shippingAddress = "";

  close(): void {
    this.status = "closed";
  }
}
