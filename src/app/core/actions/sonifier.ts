import { Action } from '@ngrx/store';

import { ImageFile } from '../../data-files/models/data-file';
import { Region } from '../models/region';
import { SonifierFileState } from '../models/sonifier-file-state';

export const SET_REGION = '[Sonifier] Set Region';
export const CLEAR_REGION_HISTORY = '[Sonifier] Clear Region History';
export const UNDO_REGION_SELECTION = '[Sonifier] Undo Region Selection';
export const REDO_REGION_SELECTION = '[Sonifier] Redo Region Selection';
export const UPDATE_FILE_STATE = '[Sonifier] Update File State';
export const UPDATE_VIEWPORT = '[Sonifier] Update Viewport';
export const UPDATE_SONIFICATION_URI = '[Sonifier] Update Sonification URI';

export class SetRegion implements Action {
  readonly type = SET_REGION;
  
  constructor(public payload: {file: ImageFile, region: Region, storeInHistory: boolean}) {}
}

export class ClearRegionHistory implements Action {
  readonly type = CLEAR_REGION_HISTORY;
  
  constructor(public payload: {file: ImageFile}) {}
}

export class UndoRegionSelection implements Action {
  readonly type = UNDO_REGION_SELECTION;
  
  constructor(public payload: {file: ImageFile}) {}
}

export class RedoRegionSelection implements Action {
  readonly type = REDO_REGION_SELECTION;
  
  constructor(public payload: {file: ImageFile}) {}
}

export class UpdateFileState implements Action {
  readonly type = UPDATE_FILE_STATE;
  
  constructor(public payload: {file: ImageFile, changes: Partial<SonifierFileState>}) {}
}

export class UpdateViewport implements Action {
  readonly type = UPDATE_VIEWPORT;
  
  constructor(public payload: {file: ImageFile, viewport: {imageX: number, imageY: number, imageWidth: number, imageHeight: number, viewportWidth: number, viewportHeight: number}}) {}
}

export class UpdateSonificationUri implements Action {
  readonly type = UPDATE_SONIFICATION_URI;
  
  constructor(public payload: {file: ImageFile, uri: string}) {}
}




export type Actions =
| SetRegion
| ClearRegionHistory
| UndoRegionSelection
| RedoRegionSelection
| UpdateFileState
| UpdateViewport
| UpdateSonificationUri