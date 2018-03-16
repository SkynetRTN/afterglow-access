export enum MarkerType {
  LINE,
  RECTANGLE,
  ELLIPSE
}

interface IMarker {
  readonly type: MarkerType;
  id?: string;
  label?: string;
  class?: string;
  selected?: boolean;
  data?: {[key: string]: any}
}

export interface LineMarker extends IMarker {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RectangleMarker extends IMarker {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EllipseMarker extends IMarker {
  x: number;
  y: number;
  a: number;
  b: number;
  theta: number;
}

export type Marker =
  | LineMarker
  | RectangleMarker
  | EllipseMarker;

