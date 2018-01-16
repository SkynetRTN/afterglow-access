export enum MarkerType {
  RECTANGLE,
  ELLIPSE
}

interface MarkerBase {
  type: MarkerType;
  id: string;
  label: string;
  selected: boolean;
}

export interface LineMarker extends MarkerBase {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RectangleMarker extends MarkerBase {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EllipseMarker extends MarkerBase {
  x: number;
  y: number;
  a: number;
  b: number;
  theta: number;
}

export type Marker  =
  | RectangleMarker
  | EllipseMarker;

