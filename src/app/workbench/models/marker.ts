import { TypeGuard } from '../../utils/guard-type.pipe';

export enum MarkerType {
  LINE,
  RECTANGLE,
  CIRCLE,
  TEARDROP,
  TEXT,
  APERTURE,
  CROSSHAIR
}

interface IMarker {
  readonly type: MarkerType;
  id?: string;
  label?: string;
  class?: string;
  selected?: boolean;
  data?: { [key: string]: any };
  tooltip?: {
    hideDelay: number;
    showDelay: number;
    message: string;
    class: string;
  };
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

export interface CrosshairMarker extends IMarker {
  x: number;
  y: number;
  radius: number;
  labelRadius: number;
  labelTheta: number;
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

export const isLineMarker: TypeGuard<Marker, LineMarker> = (marker: Marker): marker is LineMarker =>
  marker.type === MarkerType.LINE;

export const isCircleMarker: TypeGuard<Marker, CircleMarker> = (marker: Marker): marker is CircleMarker =>
  marker.type === MarkerType.CIRCLE;

export const isCrosshairMarker: TypeGuard<Marker, CrosshairMarker> = (marker: Marker): marker is CrosshairMarker =>
  marker.type === MarkerType.CROSSHAIR;

export const isRectangleMarker: TypeGuard<Marker, RectangleMarker> = (marker: Marker): marker is RectangleMarker =>
  marker.type === MarkerType.RECTANGLE;

export const isApertureMarker: TypeGuard<Marker, ApertureMarker> = (marker: Marker): marker is ApertureMarker =>
  marker.type === MarkerType.APERTURE;

export const isTeardropMarker: TypeGuard<Marker, TeardropMarker> = (marker: Marker): marker is TeardropMarker =>
  marker.type === MarkerType.TEARDROP;
