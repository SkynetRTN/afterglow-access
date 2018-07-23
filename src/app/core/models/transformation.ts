import { Point, Matrix, Rectangle } from "paper"

import { Region } from './region';
import { getWidth, getHeight, ImageFile } from "../../data-files/models/data-file";

export interface Transformation {
  viewportSize: {width: number, height: number};
  imageTransform: Matrix;
  viewportTransform: Matrix;
  imageToViewportTransform: Matrix;
}

export function getScale(transformation: Transformation) {
  let temp = new Point(transformation.imageToViewportTransform.a, transformation.imageToViewportTransform.c);
  return temp.getDistance(new Point(0, 0));
}

export function getViewportRegion(transformation: Transformation, imageFile: ImageFile): Region {
  let imageWidth = getWidth(imageFile);
  let imageHeight = getHeight(imageFile);
  let viewportWidth = transformation.viewportSize.width;
  let viewportHeight = transformation.viewportSize.height;
  let transform = transformation.imageToViewportTransform.inverted();
  let c1 = transform.transform(new Point(0.5, 0.5));
  let c2 = transform.transform(new Point(viewportWidth + 0.5, 0.5));
  let c3 = transform.transform(new Point(0.5,viewportHeight + 0.5));
  let c4 = transform.transform(new Point(viewportWidth + 0.5, viewportHeight + 0.5));

  c1.x += 0.5;
  c1.y += 0.5;
  c2.x += 0.5;
  c2.y += 0.5;
  c3.x += 0.5;
  c3.y += 0.5;
  c4.x += 0.5;
  c4.y += 0.5;

  let l = {x: Math.max(0.5, Math.min(c1.x, c2.x, c3.x, c4.x)), y: Math.max(0.5, Math.min(c1.y, c2.y, c3.y, c4.y))};
  let width = Math.min(imageWidth + 0.5, Math.max(c1.x, c2.x, c3.x, c4.x)) - l.x;
  let height = Math.min(imageHeight + 0.5, Math.max(c1.y, c2.y, c3.y, c4.y)) - l.y;
  
  return {
    x: l.x,
    y: l.y,
    width: width,
    height: height
  }

}