import * as moment from 'moment';

import { DataFileType } from './data-file-type';
import { HeaderEntry } from './header-entry';
import { ImageTile, getTilePixel } from './image-tile';
import { ImageHist } from './image-hist';
import { Wcs } from '../../image-tools/wcs';
import { Source, PosType } from '../../core/models/source';
import { parseDms } from '../../utils/skynet-astro';

export type Header = Array<HeaderEntry>;
export type DataFile = ImageFile | TableFile;

export interface IDataFile {
  readonly type: DataFileType;
  id: string;
  name: string;
  header: Header;
  wcs: Wcs;
  headerLoaded: boolean;
  headerLoading: boolean;
  layer: string;
  dataProviderId: string;
  assetPath: string;
  modified: boolean;
}

export function getEntry(dataFile: DataFile, key: string) {
  for (let i = 0; i < dataFile.header.length; i++) {
    if (dataFile.header[i].key == key) return dataFile.header[i];
  }
  return undefined;
}

export function hasKey(dataFile: DataFile, key: string) {
  return getEntry(dataFile, key) != undefined;
}

export function toKeyValueHash(dataFile: DataFile) {
  let result: { [key: string]: any } = {};
  dataFile.header.forEach(entry => {
    result[entry.key] = entry.value;
  });
  return result;
}

// interface DataFileBase {


//   public hasKey(key: string) {
//     return getEntry(key) != undefined;
//   }

//   public getEntry(key: string) {
//     for(let i=0; i<header.length; i++) {
//     if(header[i].key == key) return header[i];
//     }
//     return undefined;
//   }

//   public toKeyValueHash() {
//     let result: {[key: string]: any} = {};
//     header.forEach(entry => {
//     result[entry.key] = entry.value;
//     });
//     return result;
//   }
//   }

export interface ImageFile extends IDataFile {
  tilesInitialized: boolean;
  tileWidth: number;
  tileHeight: number;
  tiles: Array<ImageTile>;

  hist: ImageHist;
  histLoaded: boolean;
  histLoading: boolean;
}

export function getWidth(file: DataFile) {
  let naxis1 = getEntry(file, 'NAXIS1');
  if (naxis1) {
    return naxis1.value;
  }
  return undefined;
}

export function getHeight(file: DataFile) {
  let naxis2 = getEntry(file, 'NAXIS2');
  if (naxis2) {
    return naxis2.value;
  }
  return undefined;
}

export function getPixels(imageFile: ImageFile, x: number, y: number, width: number, height: number) {
  let result: Array<Array<number>> = [];
  for(let j=0; j<height; j++) {
    let row = Array(width)
    for(let i=0; i<width; i++) {
      row[i] = getPixel(imageFile, x+i, y+j);
    }
    result[j] = row;
  }
  return result;
}

export function getPixel(imageFile: ImageFile, x: number, y: number, interpolate: boolean = false) {
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
        neighbors[i][j] = getPixel(imageFile, xi, yj, false);
      }
    }
    //console.log(x, y, 0.5-(Math.round(x) - x), 0.5-(Math.round(y) - y), neighbors);
    return BicubicInterpolation(0.5 - (Math.round(x) - x), 0.5 - (Math.round(y) - y), neighbors)

    //  }


  }


  let i = Math.floor((x - 0.5) / imageFile.tileWidth);
  let j = Math.floor((y - 0.5) / imageFile.tileHeight);
  let tile = getTile(imageFile, i, j);
  if (!tile) return NaN;
  return getTilePixel(tile, Math.floor((x - 0.5) % imageFile.tileWidth), Math.floor((y - 0.5) % imageFile.tileWidth));

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

export function getTile(imageFile: ImageFile, i: number, j: number) {
  return imageFile.tiles[j * getXTileDim(imageFile) + i];
}

export function getXTileDim(imageFile: ImageFile) {
  return Math.ceil(getWidth(imageFile) / imageFile.tileWidth);
}

export function getYTileDim(imageFile: ImageFile) {
  return Math.ceil(getHeight(imageFile) / imageFile.tileHeight);
}

export function findTiles(imageFile: ImageFile, x: number, y: number, width: number, height: number) {
  let result: ImageTile[] = [];
  let jStart = Math.max(0, Math.floor(y / imageFile.tileHeight));
  let jEnd = Math.min(getYTileDim(imageFile) - 1, Math.floor((y + height) / imageFile.tileHeight)) + 1;
  let iStart = Math.max(0, Math.floor(x / imageFile.tileWidth));
  let iEnd = Math.min(getXTileDim(imageFile) - 1, Math.floor((x + width) / imageFile.tileWidth)) + 1;
  for (let j = jStart; j < jEnd; j++) {
    for (let i = iStart; i < iEnd; i++) {
      result.push(imageFile.tiles[j * getXTileDim(imageFile) + i]);
    }
  }
  return result;
}

// export function getWcs(imageFile: ImageFile) {
//   return new Wcs(toKeyValueHash(imageFile));
// }

// export function getHasWcs(imageFile: ImageFile) {
//   let wcs = new Wcs(toKeyValueHash(imageFile));
//   return wcs.hasWcs();
// }

export function getDegsPerPixel(imageFile: ImageFile) {
  let secpix = getEntry(imageFile, 'SECPIX');
  if (secpix) {
    return secpix.value / 3600.0;
  }

  return undefined;
}

export function getStartTime(file: DataFile) {
  let imageDateStr = '';
  let imageTimeStr = '';
  let dateObs = getEntry(file, 'DATE-OBS');
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

  let timeObs = getEntry(file, 'TIME-OBS');
  if (timeObs) {
    imageTimeStr = timeObs.value;
  }

  let s = moment.utc(imageDateStr + ' ' + imageTimeStr, "YYYY-MM-DD HH:mm:ss.SSS", false)
  if (s.isValid()) {
    return s.toDate();
  }
  return undefined;
}

export function getExpLength(file: DataFile) {
  let expLength = getEntry(file, 'EXPTIME');
  if (expLength) {
    return expLength.value;
  }
  return undefined;
}

export function getCenterTime(file: DataFile) {
  let expLength = getExpLength(file);
  let startTime = getStartTime(file);
  if (expLength !== undefined && startTime !== undefined) {
    return new Date(startTime.getTime() + expLength * 1000.0 / 2.0);
  }
  return undefined;
}

export function getTelescope(imageFile: ImageFile) {
  let observat = getEntry(imageFile, 'OBSERVAT');
  if (observat) {
    return observat.value;
  }
  return undefined;
}

export function getObject(imageFile: ImageFile) {
  let obj = getEntry(imageFile, 'OBJECT');
  if (obj) {
    return obj.value;
  }
  return undefined;
}

export function getRaHours(imageFile: ImageFile) {
  let raEntry = getEntry(imageFile, 'RA');
  if (!raEntry) {
    raEntry = getEntry(imageFile, 'RAOBJ');
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

export function getDecDegs(imageFile: ImageFile) {
  let decEntry = getEntry(imageFile, 'DEC');
  if (!decEntry) {
    decEntry = getEntry(imageFile, 'DECOBJ');
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

export function getExpNum(imageFile: ImageFile) {
  let expNum = getEntry(imageFile, 'EXPNUM');
  if (expNum) {
    return expNum.value;
  }
  return undefined;
}

export function getFilter(imageFile: ImageFile) {
  let filter = getEntry(imageFile, 'FILTER');
  if (filter) {
    return filter.value;
  }
  return undefined;
}

export function getSourceCoordinates(file: DataFile, source: Source) {
  let primaryCoord = source.primaryCoord;
  let secondaryCoord = source.secondaryCoord;
  let pm = source.pm;
  let posAngle = source.pmPosAngle;
  let epoch = source.pmEpoch;
  

  if (pm) {
    if (!file.headerLoaded) return null;
    let fileEpoch = getCenterTime(file);
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
    if (!file.headerLoaded || !file.wcs.isValid()) return null;
    let wcs = file.wcs;
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
    x >= getWidth(file) + 0.5 ||
    y < 0.5 ||
    y >= getHeight(file) + 0.5
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

export function hasOverlap(imageFileA: ImageFile, imageFileB: ImageFile) {
  // if(!imageFile1.headerLoaded || !imageFile2.headerLoaded || !getHasWcs(imageFile1) || !getHasWcs(imageFile2)) return false;
  if(!imageFileA.headerLoaded || !imageFileB.headerLoaded || !imageFileA.wcs || !imageFileB.wcs) return false;

  let wcsA = imageFileA.wcs;
  let worldLowerLeft = wcsA.pixToWorld([0, 0]);
  let worldUpperRight = wcsA.pixToWorld([getWidth(imageFileA), getHeight(imageFileA)]);
  let wcsB = imageFileB.wcs;
  let pixelLowerLeft = wcsB.worldToPix(worldLowerLeft);
  let pixelUpperRight = wcsB.worldToPix(worldUpperRight);
  let regionA = { x1: Math.min(pixelLowerLeft[0], pixelUpperRight[0]), y1: Math.max(pixelLowerLeft[1], pixelUpperRight[1]), x2: Math.max(pixelLowerLeft[0], pixelUpperRight[0]), y2: Math.min(pixelLowerLeft[1], pixelUpperRight[1]) };
  let regionB = { x1: 0, y1: getHeight(imageFileB), x2: getWidth(imageFileB), y2: 0 };
  let overlap = (regionA.x1 < regionB.x2 && regionA.x2 > regionB.x1 && regionA.y1 > regionB.y2 && regionA.y2 < regionB.y1);
  return overlap;
}



export interface TableFile extends IDataFile {
  rows: Array<any>;
}