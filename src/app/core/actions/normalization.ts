import { Action } from '@ngrx/store';
import { ImageFile } from '../../data-files/models/data-file';
import { ImageTile } from '../../data-files/models/image-tile';
import { PixelNormalizer } from '../models/pixel-normalizer';

// export const INIT_AUTO_LEVELS = '[Viewer] Init Auto Levels';

export const NORMALIZE_IMAGE_TILE = '[Viewer] Normalize Image Tile';
export const NORMALIZE_IMAGE_TILE_SUCCESS = '[Viewer] Normalize Image Tile Success';
export const NORMALIZE_IMAGE_TILE_FAIL = '[Viewer] Normalize Image Tile Fail';
export const RENORMALIZE_IMAGE_FILE = '[Viewer] Renormalize Image File';
export const UPDATE_NORMALIZER = '[Viewer] Update Normalizer';

// export class InitAutoLevels implements Action {
//   readonly type = INIT_AUTO_LEVELS;

//   constructor(public payload: { file: ImageFile }) { }
// }

export class RenormalizeImageFile implements Action {
  readonly type = RENORMALIZE_IMAGE_FILE;

  constructor(public payload: { file: ImageFile }) { }
}

export class NormalizeImageTile implements Action {
  readonly type = NORMALIZE_IMAGE_TILE;

  constructor(public payload: { file: ImageFile, tile: ImageTile }) { }
}

export class NormalizeImageTileSuccess implements Action {
  readonly type = NORMALIZE_IMAGE_TILE_SUCCESS;

  constructor(public payload: { fileId: string, tileIndex: number, pixels: Uint32Array }) { }
}

export class NormalizeImageTileFail implements Action {
  readonly type = NORMALIZE_IMAGE_TILE_FAIL;

  constructor(public payload: { fileId: string, tileIndex: number, error: any }) { }
}

export class UpdateNormalizer implements Action {
  readonly type = UPDATE_NORMALIZER;

  constructor(public payload: { file: ImageFile, changes: Partial<PixelNormalizer> }) { }
}


export type Actions =
  // | InitAutoLevels
  | RenormalizeImageFile
  | NormalizeImageTile
  | NormalizeImageTileSuccess
  | NormalizeImageTileFail
  | UpdateNormalizer