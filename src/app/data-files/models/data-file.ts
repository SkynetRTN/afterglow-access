import * as moment from 'moment';

import { HduType } from './data-file-type';
import { HeaderEntry } from './header-entry';
import { ImageHist } from './image-hist';
import { Wcs } from '../../image-tools/wcs';
import { Source, PosType } from '../../workbench/models/source';
import { parseDms } from '../../utils/skynet-astro';
import { PixelNormalizer } from './pixel-normalizer';
import { BlendMode } from './blend-mode';
import { TypeGuard } from 'src/app/utils/guard-type.pipe';

export type PixelType = Uint8Array | Uint16Array | Uint32Array | Float32Array | Float64Array;

export enum PixelPrecision {
  uint8 = 'uint8',
  uint16 = 'uint16',
  uint32 = 'uint32',
  float32 = 'float32',
  float64 = 'float64',
}

export interface ITransformableImageData {
  viewportTransformId: string;
  imageTransformId: string;
  rgbaImageDataId: string;
  // redChannelId: string;
  // greenChannelId: string;
  // blueChannelId: string;
}

export enum ColorBalanceMode {
  MANUAL = 'manual',
  PERCENTILE = 'percentile',
  HISTOGRAM_FITTING = 'histogram_fitting'
}

export interface DataFile extends ITransformableImageData {
  id: string;
  name: string;
  dataProviderId: string;
  assetPath: string;
  hduIds: string[];
  imageHduIds: string[];
  tableHduIds: string[];
  syncLayerNormalizers: boolean;
  colorBalanceMode: ColorBalanceMode;
  channelMixer: [[number, number, number], [number, number, number], [number, number, number]];
}

export interface Header {
  id: string;
  entries: HeaderEntry[];
  loaded: boolean;
  loading: boolean;
  isValid: boolean;
  wcs: Wcs | null;
}

export interface IHdu {
  readonly type: HduType;
  id: string;
  fileId: string;
  headerId: string;
  order: number;
  modified: boolean;
  name: string;
}

export interface ImageHdu extends IHdu, ITransformableImageData {
  readonly type: HduType.IMAGE;
  precision: PixelPrecision;
  hist: ImageHist;
  rawImageDataId: string;
  normalizer: PixelNormalizer;
  blendMode: BlendMode;
  alpha: number;
  visible: boolean;
}

export const isImageHdu: TypeGuard<IHdu, ImageHdu> = (
  hdu: IHdu
): hdu is ImageHdu => hdu.type === HduType.IMAGE;

export interface TableHdu extends IHdu {
  readonly type: HduType.TABLE;
}

export const isTableHdu: TypeGuard<IHdu, TableHdu> = (
  hdu: IHdu
): hdu is TableHdu => hdu.type === HduType.TABLE;



export function getHeaderEntry(header: Header, key: string) {
  for (let i = 0; i < header.entries.length; i++) {
    if (header.entries[i].key == key) return header.entries[i];
  }
  return undefined;
}

export function hasKey(header: Header, key: string) {
  return getHeaderEntry(header, key) != undefined;
}

export function toKeyValueHash(header: Header) {
  let result: { [key: string]: any } = {};
  header.entries.forEach((entry) => {
    result[entry.key] = entry.value;
  });
  return result;
}

export function getWidth(header: Header): number {
  let naxis1 = getHeaderEntry(header, 'NAXIS1');
  if (naxis1) {
    return naxis1.value;
  }
  return 0;
}

export function getHeight(header: Header): number {
  let naxis2 = getHeaderEntry(header, 'NAXIS2');
  if (naxis2) {
    return naxis2.value;
  }
  return 0;
}

export function getObserver(header: Header): string | undefined {
  let observer = getHeaderEntry(header, 'OBSERVER');
  if (observer) {
    return observer.value;
  }
  return undefined;
}

export function getDegsPerPixel(header: Header) {
  let secpix = getHeaderEntry(header, 'SECPIX');
  if (secpix) {
    return secpix.value / 3600.0;
  }

  return undefined;
}

export function getStartTime(header: Header) {
  let imageDateStr = '';
  let imageTimeStr = '';
  let dateObs = getHeaderEntry(header, 'DATE-OBS');
  if (dateObs) {
    imageDateStr = dateObs.value;
    if (imageDateStr.includes('T')) {
      let s = moment.utc(imageDateStr, 'YYYY-MM-DDTHH:mm:ss.SSS', false);
      if (s.isValid()) {
        return s.toDate();
      }
      return undefined;
    }
  }

  let timeObs = getHeaderEntry(header, 'TIME-OBS');
  if (timeObs) {
    imageTimeStr = timeObs.value;
  }

  let s = moment.utc(imageDateStr + ' ' + imageTimeStr, 'YYYY-MM-DD HH:mm:ss.SSS', false);
  if (s.isValid()) {
    return s.toDate();
  }
  return undefined;
}

export function getExpLength(header: Header) {
  let expLength = getHeaderEntry(header, 'EXPTIME');
  if (expLength) {
    return expLength.value;
  }
  return undefined;
}

export function getCenterTime(header: Header) {
  let expLength = getExpLength(header);
  let startTime = getStartTime(header);
  if (expLength !== undefined && startTime !== undefined) {
    return new Date(startTime.getTime() + (expLength * 1000.0) / 2.0);
  }
  return undefined;
}

export function getObservatory(header: Header) {
  let observat = getHeaderEntry(header, 'OBSERVAT');
  if (observat) {
    return observat.value;
  }
  return undefined;
}

export function getTelescope(header: Header) {
  let observat = getHeaderEntry(header, 'TELESCOP');
  if (observat) {
    return observat.value;
  }
  return undefined;
}

export function getObject(header: Header) {
  let obj = getHeaderEntry(header, 'OBJECT');
  if (obj) {
    return obj.value;
  }
  return undefined;
}

export function getRaHours(header: Header) {
  let raEntry = getHeaderEntry(header, 'RA');
  if (!raEntry) {
    raEntry = getHeaderEntry(header, 'RAOBJ');
  }
  if (!raEntry) {
    raEntry = getHeaderEntry(header, 'OBJCTRA');
  }
  if (!raEntry) return undefined;

  let ra;
  if (typeof raEntry.value == 'string' && raEntry.value.includes(':')) {
    ra = parseDms(raEntry.value);
  } else {
    ra = parseFloat(raEntry.value);
  }

  if (isNaN(ra) || ra == undefined || ra == null) return undefined;

  return ra;
}

export function getDecDegs(header: Header) {
  let decEntry = getHeaderEntry(header, 'DEC');
  if (!decEntry) {
    decEntry = getHeaderEntry(header, 'DECOBJ');
  }
  if (!decEntry) {
    decEntry = getHeaderEntry(header, 'OBJCTDEC');
  }
  if (!decEntry) return undefined;

  let dec;
  if (typeof decEntry.value == 'string' && decEntry.value.includes(':')) {
    dec = parseDms(decEntry.value);
  } else {
    dec = parseFloat(decEntry.value);
  }

  if (isNaN(dec) || dec == undefined || dec == null) return undefined;

  return dec;
}

export function getExpNum(header: Header) {
  let expNum = getHeaderEntry(header, 'EXPNUM');
  if (expNum) {
    return expNum.value;
  }
  return undefined;
}

export function getFilter(header: Header) {
  let filter = getHeaderEntry(header, 'FILTER');
  if (filter) {
    return filter.value;
  }
  return undefined;
}

export function getSourceCoordinates(header: Header, source: Source) {
  let primaryCoord = source.primaryCoord;
  let secondaryCoord = source.secondaryCoord;
  let pm = source.pm;
  let posAngle = source.pmPosAngle;
  let epoch = source.pmEpoch;

  if (pm) {
    if (!header.loaded) return null;
    let fileEpoch = getCenterTime(header);
    if (!fileEpoch) return null;

    let deltaT = (fileEpoch.getTime() - new Date(epoch).getTime()) / 1000.0;
    let mu = (source.pm * deltaT) / 3600.0;
    let theta = source.pmPosAngle * (Math.PI / 180.0);
    let cd = Math.cos((secondaryCoord * Math.PI) / 180);

    primaryCoord += (mu * Math.sin(theta)) / cd / 15;
    primaryCoord = primaryCoord % 360;
    secondaryCoord += mu * Math.cos(theta);
    secondaryCoord = Math.max(-90, Math.min(90, secondaryCoord));

    // primaryCoord += (primaryRate * deltaT)/3600/15 * (source.posType == PosType.PIXEL ? 1 : Math.cos(secondaryCoord*Math.PI/180));
  }

  let x = primaryCoord;
  let y = secondaryCoord;
  let theta = posAngle;

  if (source.posType == PosType.SKY) {
    if (!header.loaded || !header.wcs || !header.wcs.isValid()) return null;
    let wcs = header.wcs;
    let xy = wcs.worldToPix([primaryCoord, secondaryCoord]);
    x = xy[0];
    y = xy[1];

    if (pm) {
      theta = posAngle + wcs.positionAngle();
      theta = theta % 360;
      if (theta < 0) theta += 360;
    }
  }

  if (x < 0.5 || x >= getWidth(header) + 0.5 || y < 0.5 || y >= getHeight(header) + 0.5) {
    return null;
  }

  return {
    x: x,
    y: y,
    theta: theta,
    raHours: source.posType != PosType.SKY ? null : primaryCoord,
    decDegs: source.posType != PosType.SKY ? null : secondaryCoord,
  };
}

export function hasOverlap(headerA: Header, headerB: Header) {
  // if(!imageFile1.loaded || !imageFile2.loaded || !getHasWcs(imageFile1) || !getHasWcs(imageFile2)) return false;
  if (!headerA.loaded || !headerB.loaded || !headerA.wcs || !headerB.wcs) return false;

  let wcsA = headerA.wcs;
  let worldLowerLeft = wcsA.pixToWorld([0, 0]);
  let worldUpperRight = wcsA.pixToWorld([getWidth(headerA), getHeight(headerA)]);
  let wcsB = headerB.wcs;
  let pixelLowerLeft = wcsB.worldToPix(worldLowerLeft);
  let pixelUpperRight = wcsB.worldToPix(worldUpperRight);
  let regionA = {
    x1: Math.min(pixelLowerLeft[0], pixelUpperRight[0]),
    y1: Math.max(pixelLowerLeft[1], pixelUpperRight[1]),
    x2: Math.max(pixelLowerLeft[0], pixelUpperRight[0]),
    y2: Math.min(pixelLowerLeft[1], pixelUpperRight[1]),
  };
  let regionB = { x1: 0, y1: getHeight(headerB), x2: getWidth(headerB), y2: 0 };
  let overlap =
    regionA.x1 < regionB.x2 && regionA.x2 > regionB.x1 && regionA.y1 > regionB.y2 && regionA.y2 < regionB.y1;
  return overlap;
}
