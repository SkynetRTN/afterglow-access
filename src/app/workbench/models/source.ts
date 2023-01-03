import { Astrometry } from 'src/app/jobs/models/astrometry';
import { SourceId } from 'src/app/jobs/models/source-id';
import { Mag } from './mag';

export enum PosType {
  PIXEL = 'pixel',
  SKY = 'sky',
}

export interface Source {
  id: string;
  label: string;
  objectId: string;
  layerId: string;
  posType: PosType;
  primaryCoord: number;
  secondaryCoord: number;
  pm: number;
  pmPosAngle: number;
  pmEpoch: string;
}

export interface CatalogSource extends Source {
  mags: { [filter: string]: Mag };
}

export function sourceToAstrometryData(source: Source) {
  let x = null;
  let y = null;
  let pmPixel = null;
  let pmPosAnglePixel = null;
  let raHours = null;
  let decDegs = null;
  let pmSky = null;
  let pmPosAngleSky = null;

  if (source.posType == PosType.PIXEL) {
    x = source.primaryCoord;
    y = source.secondaryCoord;
    pmPixel = source.pm;
    pmPosAnglePixel = source.pmPosAngle;
  } else {
    raHours = source.primaryCoord;
    decDegs = source.secondaryCoord;
    pmSky = source.pm;
    if (pmSky) pmSky /= 3600.0;
    pmPosAngleSky = source.pmPosAngle;
  }

  let s: Astrometry & SourceId = {
    id: source.id,
    pmEpoch: source.pmEpoch ? new Date(source.pmEpoch).toISOString() : null,
    x: x,
    y: y,
    pmPixel: pmPixel,
    pmPosAnglePixel: pmPosAnglePixel,
    raHours: raHours,
    decDegs: decDegs,
    pmSky: pmSky,
    pmPosAngleSky: pmPosAngleSky,
    fwhmX: null,
    fwhmY: null,
    theta: null,
  };
  return s;
}
