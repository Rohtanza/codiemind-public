import { EventEmitter } from "events";

const bus = new EventEmitter();

function initHandlers(): void {
  bus.on("user:created", (id: string) => console.log("created", id));
  bus.on("user:deleted", (id: string) => console.log("deleted", id));
}

export function boot(): EventEmitter {
  initHandlers();
  return bus;
}
