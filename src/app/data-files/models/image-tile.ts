export interface ImageTile {
  index: number,
  x: number;
  y: number;
  width: number;
  height: number;
  pixelsLoaded: boolean;
  pixelsLoading: boolean;
  pixelLoadingFailed: boolean;
  pixels: Float32Array | Uint32Array | null;
}

export function getTilePixel(tile: ImageTile, x: number, y: number) {
  let index: number = Math.floor(y) * tile.width + Math.floor(x);
  if (!tile.pixelsLoaded) return NaN;
  return tile.pixels[index];
}