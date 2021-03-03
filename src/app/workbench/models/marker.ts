export enum MarkerType {
  LINE,
  RECTANGLE,
  CIRCLE,
  TEARDROP,
  TEXT,
  APERTURE,
}

interface IMarker {
  readonly type: MarkerType;
  id?: string;
  label?: string;
  class?: string;
  selected?: boolean;
  data?: { [key: string]: any };
  tooltip?: {
    hideDelay: number,
    showDelay: number,
    message: string,
    class: string
  }
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
  labelRadius: number;
  labelTheta: number;
}

export interface ApertureMarker extends IMarker {
  x: number;
  y: number;
  apertureA: number;
  apertureB: number;
  apertureTheta: number;
  annulusAIn: number;
  annulusBIn: number;
  annulusAOut: number;
  annulusBOut: number;
  labelRadius: number;
  labelTheta: number;
}

export interface TeardropMarker extends CircleMarker {
  theta: number;
}

export interface TextMarker extends IMarker {
  x: number;
  y: number;
  text: string;
}

export type Marker = LineMarker | RectangleMarker | CircleMarker | TeardropMarker | TextMarker | ApertureMarker;
