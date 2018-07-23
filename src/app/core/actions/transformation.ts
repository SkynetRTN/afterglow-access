import { Action } from '@ngrx/store';
import { ImageFile } from '../../data-files/models/data-file';
import { ImageTile } from '../../data-files/models/image-tile';
import { Region } from '../models/region';
import { Matrix } from 'paper';

export const ZOOM_BY = '[Transformation] Zoom By';
export const ZOOM_TO = '[Transformation] Zoom To';
export const MOVE_BY = '[Transformation] Move By';
export const MOVE_TO = '[Transformation] Move To';
export const SET_IMAGE_TRANSFORM = '[Transformation] Set Image Transform';
export const RESET_IMAGE_TRANSFORM = '[Transformation] Reset Image Transform';
export const SET_VIEWPORT_TRANSFORM = '[Transformation] Set Viewport Transform';
export const ROTATE_BY = '[Transformation] Rotate By';
export const ROTATE_TO = '[Transformation] Rotate To';
export const FLIP = '[Transformation] Flip';
export const CENTER_REGION_IN_VIEWPORT = '[Transformation] Center Region In Viewport';
export const UPDATE_CURRENT_VIEWPORT_SIZE = '[Transformation] Update Current Viewport Size';


export class ZoomBy implements Action {
  readonly type = ZOOM_BY;

  constructor(public payload: { file: ImageFile, scaleFactor: number, viewportAnchor: { x: number, y: number } }) { }
}

// export class ZoomTo implements Action {
//   readonly type = ZOOM_TO;

//   constructor(public payload: { file: ImageFile, scale: number, anchorPoint: { x: number, y: number } }) { }
// }

export class MoveBy implements Action {
  readonly type = MOVE_BY;

  constructor(public payload: { file: ImageFile, xShift: number, yShift: number }) { }
}

// export class MoveTo implements Action {
//   readonly type = MOVE_TO;

//   constructor(public payload: { file: ImageFile, imagePoint: { x: number, y: number }, viewportSize: { width: number, height: number }, viewportAnchor?: { x: number, y: number } }) { }
// }

export class SetImageTransform implements Action {
  readonly type = SET_IMAGE_TRANSFORM;

  constructor(public payload: { file: ImageFile, transform: Matrix }) { }
}

export class ResetImageTransform implements Action {
  readonly type = RESET_IMAGE_TRANSFORM;

  constructor(public payload: { file: ImageFile }) { }
}

export class SetViewportTransform implements Action {
  readonly type = SET_VIEWPORT_TRANSFORM;

  constructor(public payload: { file: ImageFile, transform: Matrix }) { }
}

export class RotateBy implements Action {
  readonly type = ROTATE_BY;

  constructor(public payload: { file: ImageFile, rotationAngle: number }) { }
}

export class RotateTo implements Action {
  readonly type = ROTATE_TO;

  constructor(public payload: { file: ImageFile, rotationAngle: number }) { }
}

export class Flip implements Action {
  readonly type = FLIP;

  constructor(public payload: { file: ImageFile }) { }
}

export class CenterRegionInViewport implements Action {
  readonly type = CENTER_REGION_IN_VIEWPORT;

  constructor(public payload: { file: ImageFile, region: Region, viewportSize?: { width: number, height: number } }) { }
}


export class UpdateCurrentViewportSize implements Action {
  readonly type = UPDATE_CURRENT_VIEWPORT_SIZE

  constructor(public payload: { file: ImageFile, viewportSize: { width: number, height: number } }) { }
}



export type Actions =
  | ZoomBy
  // | ZoomTo
  | MoveBy
  // | MoveTo
  | SetImageTransform 
  | SetViewportTransform
  | ResetImageTransform
  | RotateTo
  | RotateBy 
  | Flip
  | CenterRegionInViewport
  | UpdateCurrentViewportSize