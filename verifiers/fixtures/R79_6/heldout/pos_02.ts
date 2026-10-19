export interface IShape {
  area(): number;
}

export class Circle implements IShape {
  constructor(private readonly radius: number) {}
  area(): number {
    return Math.PI * this.radius ** 2;
  }
}

export default interface IShapeFactory {
  create(kind: "circle", size: number): IShape;
}
