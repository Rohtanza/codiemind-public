const Serializable = (Base) =>
  class extends Base {
    toJSON() {
      return { ...this };
    }
  };

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

export const SerializablePoint = Serializable(Point);
