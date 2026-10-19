interface Logger {
  log(message: string): void;
}

class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(`[app] ${message}`);
  }
}

class OrderService {
  constructor(private readonly logger: Logger) {}

  placeOrder(id: string): void {
    this.logger.log(`placing order ${id}`);
  }
}

export const service = new OrderService(new ConsoleLogger());
