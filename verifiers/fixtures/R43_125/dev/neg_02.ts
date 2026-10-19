export interface Point {
  x: number;
  y: number;
}

export type Rect = {
  origin: Point;
  width: number;
  height: number;
};
