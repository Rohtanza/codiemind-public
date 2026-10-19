interface Shape {
  area(): number;
}

interface Named {
  name: string;
}

interface NamedShape extends Shape, Named {}

export class Square implements NamedShape {
  name = "square";
  constructor(private side: number) {}

  area(): number {
    return this.side * this.side;
  }
}
