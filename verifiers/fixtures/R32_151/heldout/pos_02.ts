export class MoneyDTO {
  private constructor(readonly amount: number, readonly currency: string) {}

  static of(amount: number, currency: string): MoneyDTO {
    return new MoneyDTO(amount, currency);
  }

  plus(other: MoneyDTO): MoneyDTO {
    if (other.currency !== this.currency) {
      throw new Error('Currency mismatch');
    }
    return MoneyDTO.of(this.amount + other.amount, this.currency);
  }
}
