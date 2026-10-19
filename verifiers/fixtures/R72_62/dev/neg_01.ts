abstract class Animal {
  constructor(protected name: string) {}
  abstract speak(): string;
}

export class Dog extends Animal {
  speak(): string {
    return `${this.name} barks`;
  }
}
