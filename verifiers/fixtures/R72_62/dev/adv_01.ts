// Previously this was `class PaymentGateway extends HttpClient`, but we
// switched to holding the client as a field instead.
interface HttpClient {
  post(url: string, body: unknown): Promise<unknown>;
}

export class PaymentGateway {
  constructor(private readonly http: HttpClient) {}

  charge(amount: number): Promise<unknown> {
    return this.http.post("/charge", { amount });
  }
}
