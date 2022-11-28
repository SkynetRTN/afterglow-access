import { PhotometryData } from 'src/app/jobs/models/photometry';
import { TypeGuard } from '../../utils/guard-type.pipe';
import { Source } from './source';

export enum MarkerType {
  LINE,
  RECTANGLE,
  CIRCLE,
  TEXT,
  PHOTOMETRY,
  SOURCE
}

interface IMarker {
  readonly type: MarkerType;
  id?: string;
  label?: string;
  labelTheta?: number;
  labelRadius?: number;
  labelOpacity?: number;
  class?: string;
  selected?: boolean;
  data?: { [key: string]: any };
  tooltip?: {
    hideDelay: number;
    showDelay: number;
    message: string;
    class: string;
  };
  style?: {
    stroke?: string;
    strokeWidth?: number;
    selectedStroke?: string;
    opacity?: number;
  }
}

interface SourceMarkerMixin extends IMarker {
  x: number;
  y: number;
  theta: number;
  raHours: number;
  decDegs: number;
  source: Source;
}

export interface SourceMarker extends SourceMarkerMixin {
  type: MarkerType.SOURCE;
}

export interface PhotometryMarker extends SourceMarkerMixin {
  type: MarkerType.PHOTOMETRY;
  photometryData: PhotometryData;
  showAperture: boolean;
  showCrosshair: boolean;
}


export interface LineMarker extends IMarker {
  type: MarkerType.LINE;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RectangleMarker extends IMarker {
  type: MarkerType.RECTANGLE;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleMarker extends IMarker {
  type: MarkerType.CIRCLE;
  x: number;
  y: number;
  radius: number;
  labelRadius: number;
}

// export interface ApertureMarker extends IMarker {
//   x: number;
//   y: number;
//   apertureA: number;
//   apertureB: number;
//   apertureTheta: number;
//   annulusAIn: number;
//   annulusBIn: number;
//   annulusAOut: number;
//   annulusBOut: number;
//   labelRadius: number;
// }

// export interface TeardropMarker extends CircleMarker {
//   theta: number;
// }

export interface TextMarker extends IMarker {
  x: number;
  y: number;
  text: string;
}


export type Marker = LineMarker | RectangleMarker | CircleMarker | TextMarker | PhotometryMarker | SourceMarker;

export const isLineMarker: TypeGuard<Marker, LineMarker> = (marker: Marker): marker is LineMarker =>
  marker.type === MarkerType.LINE;

export const isCircleMarker: TypeGuard<Marker, CircleMarker> = (marker: Marker): marker is CircleMarker =>
  marker.type === MarkerType.CIRCLE;

export const isRectangleMarker: TypeGuard<Marker, RectangleMarker> = (marker: Marker): marker is RectangleMarker =>
  marker.type === MarkerType.RECTANGLE;

export const isPhotometryMarker: TypeGuard<Marker, PhotometryMarker> = (marker: Marker): marker is PhotometryMarker =>
  marker.type === MarkerType.PHOTOMETRY;

export const isSourceMarker: TypeGuard<Marker, SourceMarker> = (marker: Marker): marker is SourceMarker =>
  marker.type === MarkerType.SOURCE;