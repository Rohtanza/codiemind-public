import { injectable } from "tsyringe";
import { EventBus } from "@/core/EventBus";

const HELP = "Resolve dependencies with constructor injection, not getIt<T>().";

@injectable()
export class NotificationCenter {
  constructor(private readonly bus: EventBus) {}

  start() {
    this.bus.on("notify", (msg: string) => console.log(HELP.length, msg));
  }
}
