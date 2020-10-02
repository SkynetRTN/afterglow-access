import { Point, Matrix, Rectangle } from "paper"

import { Region } from './region';
import { getWidth, getHeight, DataFile, ImageHdu } from "../../data-files/models/data-file";

export interface Transform {
  a: number,
  b: number,
  c: number,
  d: number,
  tx: number,
  ty: number
}

export interface Transformation {
  viewportSize: {width: number, height: number};
  imageTransform: Transform;
  viewportTransform: Transform;
  imageToViewportTransform: Transform;
}


export function transformToMatrix(t: Transform): any {
  return new Matrix(t.a, t.b, t.c, t.d, t.tx, t.ty);
}

export function matrixToTransform(m: any) {
  return {
    a: m.a,
    b: m.b,
    c: m.c,
    d: m.d,
    tx: m.tx,
    ty: m.ty
  } as Transform;
}

export function getScale(transformation: Transformation) {
  let temp = new Point(transformation.imageToViewportTransform.a, transformation.imageToViewportTransform.c);
  return temp.getDistance(new Point(0, 0));
}

export function getViewportRegion(transformation: Transformation, imageWidth: number, imageHeight: number): Region {
  let viewportWidth = transformation.viewportSize.width;
  let viewportHeight = transformation.viewportSize.height;
  let transform = transformToMatrix(transformation.imageToViewportTransform).inverted();
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