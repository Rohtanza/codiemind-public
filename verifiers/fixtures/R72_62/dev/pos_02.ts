type Engine = { start(): string };

class ElectricEngine implements Engine {
  start(): string {
    return "humming";
  }
}

export class Car {
  private engine: Engine;

  constructor(engine: Engine = new ElectricEngine()) {
    this.engine = engine;
  }

  drive(): string {
    return `Engine is ${this.engine.start()}`;
  }
}
