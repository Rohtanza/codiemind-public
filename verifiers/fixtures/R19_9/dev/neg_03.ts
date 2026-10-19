export class EventBus {
  private handlers: Record<string, Array<(payload: unknown) => void>> = {};
  private history: any[] = [];

  on(event: string, handler: (payload: unknown) => void): void {
    (this.handlers[event] ??= []).push(handler);
  }

  emit(event: string, payload: unknown): void {
    this.history.push(payload);
    (this.handlers[event] ?? []).forEach((h) => h(payload));
  }
}
