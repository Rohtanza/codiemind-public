type Level = "info" | "error";

function emit(sink: Console, level: Level, message: string): void {
  if (level === "error") {
    sink.error(message);
  } else {
    sink.log(message);
  }
}

export function processOrder(orderId: string, amount: number): boolean {
  if (amount <= 0) {
    emit(console, "error", `Order ${orderId} has invalid amount`);
    return false;
  }
  emit(console, "info", `Processing order ${orderId} for ${amount}`);
  return true;
}
