export class Worker {
  private cache = new Map<string, string>();
  private queue: string[] = [];

  InitializeCache(): void {
    this.cache.clear();
  }

  initializeQueue(): void {
    this.queue = [];
  }

  run(): void {
    this.InitializeCache();
    this.initializeQueue();
  }
}
