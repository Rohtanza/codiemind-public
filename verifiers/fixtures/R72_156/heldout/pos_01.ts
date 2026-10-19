type Handler<T> = (event: T) => void;

export class Emitter<T> {
  private handlers: Handler<T>[] = [];

  on(handler: Handler<T>): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  emit(event: T): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }
}
