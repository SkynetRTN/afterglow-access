import { Point, Matrix, Rectangle } from "paper"

import { PixelNormalizer } from './pixel-normalizer'
import { Region } from './region';

import { ImageTile } from '../../data-files/models/image-tile'


export interface ViewerFileState {
  fileId: string;
  normalizedTiles: Array<ImageTile>;
  panEnabled: boolean;
  zoomEnabled: boolean;
  imageToViewportTransform: Matrix;
  normalizer: PixelNormalizer;

  autoLevelsInitialized: boolean;
  autoPeakLevel?: number;
  autoBkgLevel?: number;
}

export function getScale(imageView: ViewerFileState) {
  let temp = new Point(imageView.imageToViewportTransform.a, imageView.imageToViewportTransform.c);
  return temp.getDistance(new Point(0, 0));
}

export function getViewportRegion(imageWidth: number, imageHeight: number, viewportWidth: number, viewportHeight: number, imageToViewportTransform: Matrix): Region {
  let transform = imageToViewportTransform.inverted();
  let ul = transform.transform(new Point(0, 0));
  let lr = transform.transform(new Point(viewportWidth, viewportHeight));

  let x = Math.max(0, ul.x);
  let y = Math.max(0, ul.y);

  return {
    x: x,
    y: y,
    width: Math.min(imageWidth, lr.x) - x,
    height: Math.min(imageHeight, lr.y) - y
  }

}