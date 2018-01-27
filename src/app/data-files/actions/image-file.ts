import { Action } from '@ngrx/store';
import { ImageFile } from '../models/data-file';
import { ImageHist } from '../models/image-hist';
import { ImageTile } from '../models/image-tile';

export const LOAD_IMAGE_HIST = '[Image File] Load Image Hist';
export const LOAD_IMAGE_HIST_FAIL = '[Image File] Load Image Hist Fail';
export const LOAD_IMAGE_HIST_SUCCESS = '[Image File] Load Image Hist Success';

export const INIT_IMAGE_TILES = '[Image File] Init Image Tiles';

export const LOAD_IMAGE_TILE_PIXELS = '[Image File] Load Image Tile';
export const LOAD_IMAGE_TILE_PIXELS_FAIL = '[Image File] Load Image Tile Fail';
export const LOAD_IMAGE_TILE_PIXELS_SUCCESS = '[Image File] Load Image Tile Success';


export class LoadImageHist implements Action {
  readonly type = LOAD_IMAGE_HIST;

  constructor(public payload: { file: ImageFile }) { }
}

export class LoadImageHistSuccess implements Action {
  readonly type = LOAD_IMAGE_HIST_SUCCESS;

  constructor(public payload: { fileId: string, hist: ImageHist }) { }
}

export class LoadImageHistFail implements Action {
  readonly type = LOAD_IMAGE_HIST_FAIL;

  constructor(public payload: { fileId: string, error: any }) { }
}

export class InitImageTiles implements Action {
  readonly type = INIT_IMAGE_TILES;

  constructor(public payload: { file: ImageFile }) { }
}

export class LoadImageTilePixels implements Action {
  readonly type = LOAD_IMAGE_TILE_PIXELS;

  constructor(public payload: { file: ImageFile, tile: ImageTile }) { }
}

export class LoadImageTilePixelsSuccess implements Action {
  readonly type = LOAD_IMAGE_TILE_PIXELS_SUCCESS;

  constructor(public payload: { fileId: string, tileIndex: number, pixels: Float32Array }) { }
}

export class LoadImageTilePixelsFail implements Action {
  readonly type = LOAD_IMAGE_TILE_PIXELS_FAIL;

  constructor(public payload: { fileId: string, tileIndex: number, error: any }) { }
}



export type Actions =
  | LoadImageHist
  | LoadImageHistFail
  | LoadImageHistSuccess
  | InitImageTiles
  | LoadImageTilePixels
  | LoadImageTilePixelsFail
  | LoadImageTilePixelsSuccess;

