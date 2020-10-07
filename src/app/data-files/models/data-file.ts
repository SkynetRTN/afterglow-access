import * as moment from 'moment';

import { HduType } from './data-file-type';
import { HeaderEntry } from './header-entry';
import { ImageHist } from './image-hist';
import { Wcs } from '../../image-tools/wcs';
import { Source, PosType } from '../../workbench/models/source';
import { parseDms } from '../../utils/skynet-astro';
import { PixelNormalizer } from './pixel-normalizer';
import { Transformation } from './transformation';

export type Header = Array<HeaderEntry>;
export type PixelType = Uint8Array | Uint16Array | Uint32Array | Float32Array | Float64Array;

export enum PixelPrecision {
  uint8 = 'uint8',
  uint16 = 'uint16',
  uint32 = 'uint32',
  float32 = 'float32',
  float64 = 'float64'
}

export interface DataFile {
  readonly type: 'file';
  id: string;
  name: string;
  dataProviderId: string;
  assetPath: string;
  hduIds: string[];
  transformation: Transformation;
  compositeImageDataId: string;
}

export interface IHdu {
  readonly type: 'hdu';
  readonly hduType: HduType;
  id: string;
  fileId: string;
  order: number;
  modified: boolean;
  header: Header;
  wcs: Wcs;
  headerLoaded: boolean;
  headerLoading: boolean;
}

export function getHeaderEntry(layer: IHdu, key: string) {
  for (let i = 0; i < layer.header.length; i++) {
    if (layer.header[i].key == key) return layer.header[i];
  }
  return undefined;
}

export function hasKey(layer: IHdu, key: string) {
  return getHeaderEntry(layer, key) != undefined;
}

export function toKeyValueHash(layer: IHdu) {
  let result: { [key: string]: any } = {};
  layer.header.forEach(entry => {
    result[entry.key] = entry.value;
  });
  return result;
}



export interface ImageHdu extends IHdu {
  readonly hduType: HduType.IMAGE;
  precision: PixelPrecision;
  hist: ImageHist;
  histLoaded: boolean;
  histLoading: boolean;
  rawImageDataId: string;
  transformation: Transformation;
  normalizedImageDataId: string;
  normalizer: PixelNormalizer;
  
}


export function getWidth(layer: ImageHdu) {
  let naxis1 = getHeaderEntry(layer, 'NAXIS1');
  if (naxis1) {
    return naxis1.value;
  }
  return undefined;
}

export function getHeight(layer: ImageHdu) {
  let naxis2 = getHeaderEntry(layer, 'NAXIS2');
  if (naxis2) {
    return naxis2.value;
  }
  return undefined;
}



export function getDegsPerPixel(layer: ImageHdu) {
  let secpix = getHeaderEntry(layer, 'SECPIX');
  if (secpix) {
    return secpix.value / 3600.0;
  }

  return undefined;
}

export function getStartTime(layer: ImageHdu) {
  let imageDateStr = '';
  let imageTimeStr = '';
  let dateObs = getHeaderEntry(layer, 'DATE-OBS');
  if (dateObs) {
    imageDateStr = dateObs.value;
    if(imageDateStr.includes('T')) {
      let s = moment.utc(imageDateStr, "YYYY-MM-DDTHH:mm:ss.SSS", false)
      if (s.isValid()) {
        return s.toDate();
      }
      return undefined;
    }
  }

  let timeObs = getHeaderEntry(layer, 'TIME-OBS');
  if (timeObs) {
    imageTimeStr = timeObs.value;
  }

  let s = moment.utc(imageDateStr + ' ' + imageTimeStr, "YYYY-MM-DD HH:mm:ss.SSS", false)
  if (s.isValid()) {
    return s.toDate();
  }
  return undefined;
}

export function getExpLength(layer: ImageHdu) {
  let expLength = getHeaderEntry(layer, 'EXPTIME');
  if (expLength) {
    return expLength.value;
  }
  return undefined;
}

export function getCenterTime(layer: ImageHdu) {
  let expLength = getExpLength(layer);
  let startTime = getStartTime(layer);
  if (expLength !== undefined && startTime !== undefined) {
    return new Date(startTime.getTime() + expLength * 1000.0 / 2.0);
  }
  return undefined;
}

export function getTelescope(layer: ImageHdu) {
  let observat = getHeaderEntry(layer, 'OBSERVAT');
  if (observat) {
    return observat.value;
  }
  return undefined;
}

export function getObject(layer: ImageHdu) {
  let obj = getHeaderEntry(layer, 'OBJECT');
  if (obj) {
    return obj.value;
  }
  return undefined;
}

export function getRaHours(layer: ImageHdu) {
  let raEntry = getHeaderEntry(layer, 'RA');
  if (!raEntry) {
    raEntry = getHeaderEntry(layer, 'RAOBJ');
    if(!raEntry) return undefined;
  }
  let ra;
  if(typeof(raEntry.value) == 'string' && raEntry.value.includes(':')) {
    ra = parseDms(raEntry.value);
  }
  else {
    ra = parseFloat(raEntry.value);
  }

  if(isNaN(ra) || ra == undefined || ra == null) return undefined;

  return ra;
}

export function getDecDegs(layer: ImageHdu) {
  let decEntry = getHeaderEntry(layer, 'DEC');
  if (!decEntry) {
    decEntry = getHeaderEntry(layer, 'DECOBJ');
    if(!decEntry) return undefined;
  }

  let dec;
  if(typeof(decEntry.value) == 'string' && decEntry.value.includes(':')) {
    dec = parseDms(decEntry.value);
  }
  else {
    dec = parseFloat(decEntry.value);
  }

  if(isNaN(dec) || dec == undefined || dec == null) return undefined;

  return dec;
}

export function getExpNum(layer: ImageHdu) {
  let expNum = getHeaderEntry(layer, 'EXPNUM');
  if (expNum) {
    return expNum.value;
  }
  return undefined;
}

export function getFilter(layer: ImageHdu) {
  let filter = getHeaderEntry(layer, 'FILTER');
  if (filter) {
    return filter.value;
  }
  return undefined;
}

export function getSourceCoordinates(layer: ImageHdu, source: Source) {
  let primaryCoord = source.primaryCoord;
  let secondaryCoord = source.secondaryCoord;
  let pm = source.pm;
  let posAngle = source.pmPosAngle;
  let epoch = source.pmEpoch;
  

  if (pm) {
    if (!layer.headerLoaded) return null;
    let fileEpoch = getCenterTime(layer);
    if (!fileEpoch) return null;

    let deltaT = (fileEpoch.getTime() - (new Date(epoch)).getTime()) / 1000.0;
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
    if (!layer.headerLoaded || !layer.wcs.isValid()) return null;
    let wcs = layer.wcs;
    let xy = wcs.worldToPix([primaryCoord, secondaryCoord]);
    x = xy[0];
    y = xy[1];
    
    if (pm) {
      theta = posAngle + wcs.positionAngle();
      theta = theta % 360;
      if (theta < 0) theta += 360;
    }
  }

  if (
    x < 0.5 ||
    x >= getWidth(layer) + 0.5 ||
    y < 0.5 ||
    y >= getHeight(layer) + 0.5
  ) {
    return null;
  }

  return {
    x: x,
    y: y,
    theta: theta,
    raHours: source.posType != PosType.SKY ? null : primaryCoord,
    decDegs: source.posType != PosType.SKY ? null : secondaryCoord,
  }
    
  
  
}

export function hasOverlap(layerA: ImageHdu, layerB: ImageHdu) {
  // if(!imageFile1.headerLoaded || !imageFile2.headerLoaded || !getHasWcs(imageFile1) || !getHasWcs(imageFile2)) return false;
  if(!layerA.headerLoaded || !layerB.headerLoaded || !layerA.wcs || !layerB.wcs) return false;

  let wcsA = layerA.wcs;
  let worldLowerLeft = wcsA.pixToWorld([0, 0]);
  let worldUpperRight = wcsA.pixToWorld([getWidth(layerA), getHeight(layerA)]);
  let wcsB = layerB.wcs;
  let pixelLowerLeft = wcsB.worldToPix(worldLowerLeft);
  let pixelUpperRight = wcsB.worldToPix(worldUpperRight);
  let regionA = { x1: Math.min(pixelLowerLeft[0], pixelUpperRight[0]), y1: Math.max(pixelLowerLeft[1], pixelUpperRight[1]), x2: Math.max(pixelLowerLeft[0], pixelUpperRight[0]), y2: Math.min(pixelLowerLeft[1], pixelUpperRight[1]) };
  let regionB = { x1: 0, y1: getHeight(layerB), x2: getWidth(layerB), y2: 0 };
  let overlap = (regionA.x1 < regionB.x2 && regionA.x2 > regionB.x1 && regionA.y1 > regionB.y2 && regionA.y2 < regionB.y1);
  return overlap;
}



export interface TableHdu extends IHdu {
  readonly hduType: HduType.TABLE;
}