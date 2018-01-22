import { Action } from '@ngrx/store';
import { ImageFile } from '../../data-files/models/data-file';
import { ImageTile } from '../../data-files/models/image-tile';
import { PixelNormalizer } from '../models/pixel-normalizer';
import { Region } from '../models/region';

export const INIT_AUTO_LEVELS = '[Viewer] Init Auto Levels';

export const NORMALIZE_IMAGE_TILE = '[Viewer] Normalize Image Tile';
export const NORMALIZE_IMAGE_TILE_SUCCESS = '[Viewer] Normalize Image Tile Success';
export const NORMALIZE_IMAGE_TILE_FAIL = '[Viewer] Normalize Image Tile Fail';

export const RENORMALIZE_IMAGE_FILE = '[Viewer] Renormalize Image File';

export const UPDATE_VIEWPORT_SIZE = '[Viewer] Update Viewport Size';
export const ZOOM_BY = '[Viewer] Zoom By';
export const ZOOM_TO = '[Viewer] Zoom To';
export const MOVE_BY = '[Viewer] Move By';
export const MOVE_TO = '[Viewer] Move To';
export const CENTER_REGION_IN_VIEWPORT = '[Viewer] Center Region In Viewport';


export const UPDATE_NORMALIZER = '[Viewer] Update Normalizer';

export class InitAutoLevels implements Action {
  readonly type = INIT_AUTO_LEVELS;
  
  constructor(public payload: {file: ImageFile}) {}
}

export class RenormalizeImageFile implements Action {
  readonly type = RENORMALIZE_IMAGE_FILE;
  
  constructor(public payload: {file: ImageFile}) {}
}

export class NormalizeImageTile implements Action {
  readonly type = NORMALIZE_IMAGE_TILE;
  
  constructor(public payload: {file: ImageFile, tile: ImageTile}) {}
}

export class NormalizeImageTileSuccess implements Action {
  readonly type = NORMALIZE_IMAGE_TILE_SUCCESS;
  
  constructor(public payload: {fileId: string, tileIndex: number, pixels: Uint32Array}) {}
}

export class NormalizeImageTileFail implements Action {
  readonly type = NORMALIZE_IMAGE_TILE_FAIL;
  
  constructor(public payload: {fileId: string, tileIndex: number, error: any}) {}
}

export class UpdateViewportSize implements Action {
  readonly type = UPDATE_VIEWPORT_SIZE;
  
    constructor(public payload: {width: number, height: number}) {}
 }

export class ZoomBy implements Action {
  readonly type = ZOOM_BY;

  constructor(public payload: {file: ImageFile, scaleFactor: number, anchorPoint: {x: number, y: number}}) {}
}

export class ZoomTo implements Action {
  readonly type = ZOOM_TO;

  constructor(public payload: {file: ImageFile, scale: number, anchorPoint: {x: number, y: number}}) {}
}

export class MoveBy implements Action {
  readonly type = MOVE_BY;

  constructor(public payload: {file: ImageFile, xShift: number, yShift: number}) {}
}

export class MoveTo implements Action {
  readonly type = MOVE_TO;

  constructor(public payload: {file: ImageFile, imagePoint: {x: number, y: number}, viewportAnchor?: {x: number, y: number}}) {}
}

export class CenterRegionInViewport implements Action {
  readonly type = CENTER_REGION_IN_VIEWPORT;
  
  constructor(public payload: {file: ImageFile, region: Region, viewportSize: {width: number, height: number}}) {}
}

export class UpdateNormalizer implements Action {
  readonly type = UPDATE_NORMALIZER;

  constructor(public payload: {file: ImageFile, changes: Partial<PixelNormalizer>}) {}
}


export type Actions = 
| InitAutoLevels
| RenormalizeImageFile
| NormalizeImageTile
| NormalizeImageTileSuccess
| NormalizeImageTileFail
| UpdateViewportSize
| ZoomBy
| ZoomTo
| MoveBy
| MoveTo
| CenterRegionInViewport
| UpdateNormalizer