import { DataFileType } from './data-file-type';
import { HeaderEntry } from './header-entry';
import { ImageTile, getTilePixel } from './image-tile';
import { ImageHist } from './image-hist';
import { Wcs } from '../../image-tools/wcs';

export type Header = Array<HeaderEntry>;
export type DataFile = ImageFile | TableFile;

export interface IDataFile {
  readonly type: DataFileType;
  id: string;
  name: string;
  header: Header;
  headerLoaded: boolean;
  headerLoading: boolean;
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

export function getWidth(imageFile: ImageFile) {
  let naxis1 = getEntry(imageFile, 'NAXIS1');
  if (naxis1) {
    return naxis1.value;
  }
  return undefined;
}

export function getHeight(imageFile: ImageFile) {
  let naxis2 = getEntry(imageFile, 'NAXIS2');
  if (naxis2) {
    return naxis2.value;
  }
  return undefined;
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

export function getWcs(imageFile: ImageFile) {
  return new Wcs(toKeyValueHash(imageFile));
}

export function getHasWcs(imageFile: ImageFile) {
  let wcs = new Wcs(toKeyValueHash(imageFile));
  return wcs.hasWcs();
}

export function getDegsPerPixel(imageFile: ImageFile) {
  let secpix = getEntry(imageFile, 'SECPIX');
  if (secpix) {
    return secpix.value / 3600.0;
  }

  return undefined;
}

export function getStartTime(imageFile: ImageFile) {
  let imageDateStr = '';
  let imageTimeStr = '';
  let dateObs = getEntry(imageFile, 'DATE-OBS');
  if (dateObs) {
    imageDateStr = dateObs.value;
  }
  let timeObs = getEntry(imageFile, 'TIME-OBS');
  if (timeObs) {
    imageTimeStr = timeObs.value;
  }

  let s = Date.parse(imageDateStr + ' ' + imageTimeStr);
  if (!isNaN(s)) {
    return new Date(s);
  }
  return undefined;
}

export function getExpLength(imageFile: ImageFile) {
  let expLength = getEntry(imageFile, 'EXPTIME');
  if (expLength) {
    return expLength.value;
  }
  return undefined;
}

export function getCenterTime(imageFile: ImageFile) {
  let expLength = getExpLength(imageFile);
  let startTime = getStartTime(imageFile);
  if (expLength !== undefined || startTime !== undefined) {
    return new Date(startTime.getTime() + expLength / 2.0);
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

export function hasOverlap(imageFile1: ImageFile, imageFile2: ImageFile) {
  if(!imageFile1.headerLoaded || !imageFile2.headerLoaded || !getHasWcs(imageFile1) || !getHasWcs(imageFile2)) return false;

  let wcsA = getWcs(imageFile1);
  let worldLowerLeft = wcsA.pixToWorld([0, 0]);
  let worldUpperRight = wcsA.pixToWorld([getWidth(imageFile1), getHeight(imageFile1)]);
  let wcsB = getWcs(imageFile2);
  let pixelLowerLeft = wcsB.worldToPix(worldLowerLeft);
  let pixelUpperRight = wcsB.worldToPix(worldUpperRight);
  let regionA = { x1: Math.min(pixelLowerLeft[0], pixelUpperRight[0]), y1: Math.max(pixelLowerLeft[1], pixelUpperRight[1]), x2: Math.max(pixelLowerLeft[0], pixelUpperRight[0]), y2: Math.min(pixelLowerLeft[1], pixelUpperRight[1]) };
  let regionB = { x1: 0, y1: getHeight(imageFile2), x2: getWidth(imageFile2), y2: 0 };
  let overlap = (regionA.x1 < regionB.x2 && regionA.x2 > regionB.x1 && regionA.y1 > regionB.y2 && regionA.y2 < regionB.y1);
  return overlap;
}



export interface TableFile extends IDataFile {
  rows: Array<any>;
}