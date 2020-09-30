import { PixelType } from './data-file';

export interface ImageTile<T> {
  index: number,
  x: number;
  y: number;
  width: number;
  height: number;
  pixelsLoaded: boolean;
  pixelsLoading: boolean;
  pixelLoadingFailed: boolean;
  pixels: T;
}


export function getTilePixel<T>(tile: ImageTile<T>, x: number, y: number) {
  let index: number = Math.floor(y) * tile.width + Math.floor(x);
  if (!tile.pixelsLoaded) return NaN;
  return tile.pixels[index];
}