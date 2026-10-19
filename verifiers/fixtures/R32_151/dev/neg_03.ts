export class AccountDto {
  readonly id: string;
  email: string;

  constructor(id: string, email: string) {
    this.id = id;
    this.email = email;
  }

  setEmail(email: string): void {
    this.email = email.trim().toLowerCase();
  }
}
