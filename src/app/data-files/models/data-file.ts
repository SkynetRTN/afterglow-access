import * as moment from 'moment';

import { HduType } from './data-file-type';
import { HeaderEntry } from './header-entry';
import { ImageTile, getTilePixel } from './image-tile';
import { ImageHist } from './image-hist';
import { Wcs } from '../../image-tools/wcs';
import { Source, PosType } from '../../workbench/models/source';
import { parseDms } from '../../utils/skynet-astro';

export type Header = Array<HeaderEntry>;
export type DataLayer =  ImageHdu | TableHdu;
export type PixelType = Uint8Array | Uint16Array | Uint32Array | Float32Array | Float64Array;

export enum PixelPrecision {
  uint8 = 'uint8',
  uint16 = 'uint16',
  uint32 = 'uint32',
  float32 = 'float32',
  float64 = 'float64'
}

export enum ImageLayerMode {
  rgb = 'rgb',
  grayscale = 'grayscale'
}

export interface DataFile {
  readonly type: 'file';
  id: string;
  name: string;
  dataProviderId: string;
  assetPath: string;
  hduIds: string[];
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

export function getHeaderEntry(layer: DataLayer, key: string) {
  for (let i = 0; i < layer.header.length; i++) {
    if (layer.header[i].key == key) return layer.header[i];
  }
  return undefined;
}

export function hasKey(layer: DataLayer, key: string) {
  return getHeaderEntry(layer, key) != undefined;
}

export function toKeyValueHash(layer: DataLayer) {
  let result: { [key: string]: any } = {};
  layer.header.forEach(entry => {
    result[entry.key] = entry.value;
  });
  return result;
}

export interface ITiledImageData<T> {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  tiles: Array<ImageTile<T>>;
  tilesInitialized: boolean;
}

export interface ImageHdu extends IHdu, ITiledImageData<PixelType> {
  readonly hduType: HduType.IMAGE;
  readonly mode: ImageLayerMode;
  precision: PixelPrecision;
  hist: ImageHist;
  histLoaded: boolean;
  histLoading: boolean;
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

export function getPixels<T>(imageData: ITiledImageData<T>, x: number, y: number, width: number, height: number) {
  let result: Array<Array<number>> = [];
  for(let j=0; j<height; j++) {
    let row = Array(width)
    for(let i=0; i<width; i++) {
      row[i] = getPixel(imageData, x+i, y+j);
    }
    result[j] = row;
  }
  return result;
}

export function getPixel<T>(imageData: ITiledImageData<T>, x: number, y: number, interpolate: boolean = false) {
  //let interpolateMethod = 'bilinear';
  // let interpolateMethod = 'bicubic';

  if (interpolate) {
    // if(interpolateMethod == 'bilinear') {
    //   //Bilinear
    //   let x2 = Math.round(x) + 0.5;
    //   let x1 = x2-1;
    //   let y2 = Math.round(y) + 0.5;
    //   let y1 = y2-1;
    //   //console.log(x1, x2, y1, y2);
    //
    //   if(x1 >= 0 && y1 >= 0) {
    //     let q11 = imageFile.pixel(x1, y1, false);
    //     let q12 = imageFile.pixel(x1, y2, false);
    //     let q21 = imageFile.pixel(x2, y1, false);
    //     let q22 = imageFile.pixel(x2, y2, false);
    //
    //     // console.log(x1, y1, q11);
    //     // console.log(x1, y2, q12);
    //     // console.log(x2, y1, q21);
    //     // console.log(x2, y2, q22);
    //
    //     let fxy1 = (x2-x)*q11 + (x-x1)*q21;
    //     let fxy2 = (x2-x)*q12 + (x-x1)*q22;
    //     return (y2-y)*fxy1 + (y-y1)*fxy2;
    //   }
    // }
    // else {
    //Bicubic
    let BicubicInterpolation = (function () {
      return function (x, y, values) {
        var i0, i1, i2, i3;

        i0 = TERP(x, values[0][0], values[1][0], values[2][0], values[3][0]);
        i1 = TERP(x, values[0][1], values[1][1], values[2][1], values[3][1]);
        i2 = TERP(x, values[0][2], values[1][2], values[2][2], values[3][2]);
        i3 = TERP(x, values[0][3], values[1][3], values[2][3], values[3][3]);
        return TERP(y, i0, i1, i2, i3);
      };
      function TERP(t, a, b, c, d) {
        return 0.5 * (c - a + (2.0 * a - 5.0 * b + 4.0 * c - d + (3.0 * (b - c) + d - a) * t) * t) * t + b;
      }
    })();

    let x0 = Math.round(x) + 0.5 - 2;
    let y0 = Math.round(y) + 0.5 - 2;
    let neighbors = [new Array(4), new Array(4), new Array(4), new Array(4)];
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 4; i++) {
        let xi = x0 + i;
        let yj = y0 + j;
        neighbors[i][j] = getPixel(imageData, xi, yj, false);
      }
    }
    //console.log(x, y, 0.5-(Math.round(x) - x), 0.5-(Math.round(y) - y), neighbors);
    return BicubicInterpolation(0.5 - (Math.round(x) - x), 0.5 - (Math.round(y) - y), neighbors)

    //  }


  }


  let i = Math.floor((x - 0.5) / imageData.tileWidth);
  let j = Math.floor((y - 0.5) / imageData.tileHeight);
  let tile = getTile(imageData, i, j);
  if (!tile) return NaN;
  return getTilePixel(tile, Math.floor((x - 0.5) % imageData.tileWidth), Math.floor((y - 0.5) % imageData.tileWidth));

  // var BicubicInterpolation = (function(){
  //   return function(x, y, values){
  //       var i0, i1, i2, i3;
  //
  //       i0 = TERP(x, values[0][0], values[1][0], values[2][0], values[3][0]);
  //       i1 = TERP(x, values[0][1], values[1][1], values[2][1], values[3][1]);
  //       i2 = TERP(x, values[0][2], values[1][2], values[2][2], values[3][2]);
  //       i3 = TERP(x, values[0][3], values[1][3], values[2][3], values[3][3]);
  //       return TERP(y, i0, i1, i2, i3);
  //   };
  //   /* Yay, hoisting! */
  //   function TERP(t, a, b, c, d){
  //       return 0.5 * (c - a + (2.0*a - 5.0*b + 4.0*c - d + (3.0*(b - c) + d - a)*t)*t)*t + b;
  //   }
  // })();

  // let pixels = [Array(4), Array(4), Array(4), Array(4)]
  // for(let j=0; j<4; j++) {
  //   for(let i=0; i<4; i++) {
  //     let x0 = Math.max(imageFile.width, Math.max(0, x+(i-2)));
  //     let y0 = Math.max(imageFile.height, Math.max(0, y+(j-2)));
  //
  //     let tileX = Math.floor(x0 / imageFile.tileWidth);
  //     let tileY = Math.floor(y0 / imageFile.tileHeight);
  //     let tile = imageFile.tile(tileX, tileY);
  //     pixels[i][j] = tile.pixel(Math.floor(x0 % imageFile.tileWidth), Math.floor(y0 % imageFile.tileWidth));
  //   }
  // }
  //
  // return BicubicInterpolation(x-Math.floor(x), y-Math.floor(y), pixels);



}

export function getTile<T>(imageData: ITiledImageData<T>, i: number, j: number) {
  return imageData.tiles[j * getXTileDim(imageData) + i];
}

export function getXTileDim<T>(imageData: ITiledImageData<T>) {
  return Math.ceil(imageData.width / imageData.tileWidth);
}

export function getYTileDim<T>(imageData: ITiledImageData<T>) {
  return Math.ceil(imageData.height / imageData.tileHeight);
}

export function findTiles<T>(imageData: ITiledImageData<T>, x: number, y: number, width: number, height: number) {
  let result: ImageTile<T>[] = [];
  let jStart = Math.max(0, Math.floor(y / imageData.tileHeight));
  let jEnd = Math.min(getYTileDim(imageData) - 1, Math.floor((y + height) / imageData.tileHeight)) + 1;
  let iStart = Math.max(0, Math.floor(x / imageData.tileWidth));
  let iEnd = Math.min(getXTileDim(imageData) - 1, Math.floor((x + width) / imageData.tileWidth)) + 1;
  for (let j = jStart; j < jEnd; j++) {
    for (let i = iStart; i < iEnd; i++) {
      result.push(imageData.tiles[j * getXTileDim(imageData) + i]);
    }
  }
  return result;
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
  rows: Array<any>;
}