import { injectable, singleton } from "tsyringe";
import { Clock } from "@/core/Clock";

// Previously this used getIt.get<Clock>() inside the method; now the clock is injected.
@singleton()
@injectable()
export class SessionTimer {
  constructor(private readonly clock: Clock) {}

  elapsedSince(start: number): number {
    return this.clock.now() - start;
  }
}
