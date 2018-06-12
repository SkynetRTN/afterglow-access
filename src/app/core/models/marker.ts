export enum MarkerType {
  LINE,
  RECTANGLE,
  CIRCLE,
  TEARDROP
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

export interface CircleMarker extends IMarker {
  x: number;
  y: number;
  radius: number;
}

export interface TeardropMarker extends CircleMarker {
  theta: number;
}

export type Marker =
  | LineMarker
  | RectangleMarker
  | CircleMarker
  | TeardropMarker;

