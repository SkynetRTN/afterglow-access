import { Point, Matrix, Rectangle } from "paper"

import { Region } from './region';

export interface Transform {
  id: string,
  a: number,
  b: number,
  c: number,
  d: number,
  tx: number,
  ty: number
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

export function transformToMatrix(t: Transform): any {
  return new Matrix(t.a, t.b, t.c, t.d, t.tx, t.ty);
}

export function getImageToViewportTransform(viewportTransform: Transform, imageTransform: Transform) {
  return appendTransform(viewportTransform, imageTransform);
}

export function appendTransform(a: Transform, b: Transform) {
  let aMat = transformToMatrix(a);
  let bMat = transformToMatrix(b);
  let cMat = aMat.appended(bMat);
  return matrixToTransform(cMat);
}

export function invertTransform(t: Transform) {
  let inverted = transformToMatrix(t).inverted();
  return matrixToTransform(inverted);
}

export function scaleTransform(t: Transform, xFactor: number, yFactor: number, anchor: {x: number, y: number}) {
  return matrixToTransform(transformToMatrix(t).scale(xFactor, yFactor, anchor))
}

export function rotateTransform(t: Transform, angle: number, anchor: {x: number, y: number}) {
  return matrixToTransform(transformToMatrix(t).rotate(angle, anchor))
}

export function translateTransform(t: Transform, tx: number, ty: number) {
  return matrixToTransform(transformToMatrix(t).translate(tx, ty))
}

export function transformPoint(point: {x: number, y: number}, transform: Transform) : {x: number, y: number} {
  let m = transformToMatrix(transform);
  let p = m.transform(new Point(point.x, point.y))
  return {x: p.x, y: p.y}
}

export function getDistance(a: {x: number, y: number}, b: {x: number, y: number}) {
  return Math.sqrt(Math.pow(a.x-b.x,2)+Math.pow(a.y-b.y,2))
}

export function getScale(t: Transform) {
  return getDistance({x: t.a, y: t.d}, {x: 0, y: 0})
}

export function intersects(a: Region, b: Region) {
  let aRect = new Rectangle(a.x, a.y, a.width, a.height);
  let bRect = new Rectangle(b.x, b.y, b.width, b.height);
  return aRect.intersects(bRect);
}

export function getViewportRegion(imageToViewportTransform: Transform, imageWidth: number, imageHeight: number, viewportWidth: number, viewportHeight: number): Region {
  let transform = transformToMatrix(imageToViewportTransform).inverted();
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