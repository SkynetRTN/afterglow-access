import { PixelType } from "./data-file";

export interface IImageData<T> {
  id: string;
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  tiles: Array<ImageTile<T>>;
  initialized: boolean;
}

export interface ImageTile<T> {
  index: number;
  isValid: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  pixelsLoaded: boolean;
  pixelsLoading: boolean;
  pixelLoadingFailed: boolean;
  pixels: T | null;
}

export function createTiles<T>(width: number, height: number, tileWidth: number, tileHeight: number) {
  let tiles: ImageTile<T>[] = [];

  let xTileDim = Math.ceil(width / tileWidth);
  let yTileDim = Math.ceil(height / tileHeight);

  for (let j = 0; j < yTileDim; j += 1) {
    let th = tileHeight;

    if (j === yTileDim - 1) {
      th -= (j + 1) * tileHeight - height;
    }
    for (let i = 0; i < xTileDim; i += 1) {
      let tw = tileWidth;
      if (i === xTileDim - 1) {
        tw -= (i + 1) * tileWidth - width;
      }
      let index = j * xTileDim + i;
      let x = i * tileWidth;
      let y = j * tileHeight;
      let tile: ImageTile<T> = {
        index: index,
        isValid: false,
        x: x,
        y: y,
        width: tw,
        height: th,
        pixelsLoaded: false,
        pixelsLoading: false,
        pixelLoadingFailed: false,
        pixels: null,
      };
      tiles.push(tile);
    }
  }

  return tiles;
}

export function getTilePixel<T>(tile: ImageTile<T>, x: number, y: number) {
  let index: number = Math.floor(y) * tile.width + Math.floor(x);
  if (!tile.pixelsLoaded || !tile.pixels) return NaN;
  let result: number = tile.pixels[index]
  return result ;
}

export function getPixels<T>(imageData: IImageData<T>, x: number, y: number, width: number, height: number) {
  let result: Array<Array<number>> = [];
  for (let j = 0; j < height; j++) {
    let row = Array(width);
    for (let i = 0; i < width; i++) {
      row[i] = getPixel(imageData, x + i, y + j);
    }
    result[j] = row;
  }
  return result;
}

export function getPixel<T>(imageData: IImageData<T>, x: number, y: number, interpolate: boolean = false) {
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
      return function (x: number, y: number, values: number[][]) {
        var i0, i1, i2, i3;

        i0 = TERP(x, values[0][0], values[1][0], values[2][0], values[3][0]);
        i1 = TERP(x, values[0][1], values[1][1], values[2][1], values[3][1]);
        i2 = TERP(x, values[0][2], values[1][2], values[2][2], values[3][2]);
        i3 = TERP(x, values[0][3], values[1][3], values[2][3], values[3][3]);
        return TERP(y, i0, i1, i2, i3);
      };
      function TERP(t: number, a: number, b: number, c: number, d: number) {
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
    return BicubicInterpolation(0.5 - (Math.round(x) - x), 0.5 - (Math.round(y) - y), neighbors);

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

export function getTile<T>(imageData: IImageData<T>, i: number, j: number) {
  let xTileDim = Math.ceil(imageData.width / imageData.tileWidth);
  return imageData.tiles[j * xTileDim + i];
}

export function findTiles<T>(imageData: IImageData<T>, region: { x: number; y: number; width: number; height: number }) {
  let result: ImageTile<T>[] = [];
  let xTileDim = Math.ceil(imageData.width / imageData.tileWidth);
  let yTileDim = Math.ceil(imageData.height / imageData.tileHeight);
  let jStart = Math.max(0, Math.floor(region.y / imageData.tileHeight));
  let jEnd = Math.min(yTileDim - 1, Math.floor((region.y + region.height) / imageData.tileHeight)) + 1;
  let iStart = Math.max(0, Math.floor(region.x / imageData.tileWidth));
  let iEnd = Math.min(xTileDim - 1, Math.floor((region.x + region.width) / imageData.tileWidth)) + 1;
  for (let j = jStart; j < jEnd; j++) {
    for (let i = iStart; i < iEnd; i++) {
      result.push(imageData.tiles[j * xTileDim + i]);
    }
  }
  return result;
}
