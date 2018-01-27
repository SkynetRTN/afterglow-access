import { Action } from '@ngrx/store';

import { ImageFile } from '../../data-files/models/data-file';
import { Region } from '../models/region';
import { SonifierFileState, SonifierRegionMode } from '../models/sonifier-file-state';

export const UPDATE_REGION = '[Sonifier] Update Region';
export const ADD_REGION_TO_HISTORY = '[Sonifier] Add Region to History';
export const CLEAR_REGION_HISTORY = '[Sonifier] Clear Region History';
export const UNDO_REGION_SELECTION = '[Sonifier] Undo Region Selection';
export const REDO_REGION_SELECTION = '[Sonifier] Redo Region Selection';
export const UPDATE_FILE_STATE = '[Sonifier] Update File State';
export const SET_REGION_MODE = '[Sonifier] Set Region Mode';
export const UPDATE_VIEWPORT = '[Sonifier] Update Viewport';
export const UPDATE_SONIFICATION_URI = '[Sonifier] Update Sonification URI';

export class UpdateRegion implements Action {
  readonly type = UPDATE_REGION;

  constructor(public payload: { file: ImageFile }) { }
}

export class AddRegionToHistory implements Action {
  readonly type = ADD_REGION_TO_HISTORY;

  constructor(public payload: { file: ImageFile, region: Region }) { }
}

export class ClearRegionHistory implements Action {
  readonly type = CLEAR_REGION_HISTORY;

  constructor(public payload: { file: ImageFile }) { }
}

export class UndoRegionSelection implements Action {
  readonly type = UNDO_REGION_SELECTION;

  constructor(public payload: { file: ImageFile }) { }
}

export class RedoRegionSelection implements Action {
  readonly type = REDO_REGION_SELECTION;

  constructor(public payload: { file: ImageFile }) { }
}

export class UpdateFileState implements Action {
  readonly type = UPDATE_FILE_STATE;

  constructor(public payload: { file: ImageFile, changes: Partial<SonifierFileState> }) { }
}

export class SetRegionMode implements Action {
  readonly type = SET_REGION_MODE;

  constructor(public payload: { file: ImageFile, mode: SonifierRegionMode }) { }
}

export class UpdateViewport implements Action {
  readonly type = UPDATE_VIEWPORT;

  constructor(public payload: { file: ImageFile, viewport: { imageX: number, imageY: number, imageWidth: number, imageHeight: number, viewportWidth: number, viewportHeight: number } }) { }
}

export class UpdateSonificationUri implements Action {
  readonly type = UPDATE_SONIFICATION_URI;

  constructor(public payload: { file: ImageFile, uri: string }) { }
}




export type Actions =
  | UpdateRegion
  | AddRegionToHistory
  | ClearRegionHistory
  | UndoRegionSelection
  | RedoRegionSelection
  | UpdateFileState
  | SetRegionMode
  | UpdateViewport
  | UpdateSonificationUri