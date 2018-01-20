import { Action } from '@ngrx/store';

import { ImageFile } from '../../data-files/models/data-file';
import { Marker } from '../models/marker';

export const SELECT_DATA_FILE = '[Workbench] Select Data File';

export const ADD_MARKER = '[Workbench] Add Marker';
export const REMOVE_MARKER = '[Workbench] Remove Marker';
export const UPDATE_MARKER = '[Workbench] Update Marker';


/**
 * Selection
 */

export class SelectDataFile implements Action {
  readonly type = SELECT_DATA_FILE;

  constructor(public payload: string) {}
}


/**
 * Markers
 */

export class AddMarker implements Action {
  readonly type = ADD_MARKER;
  
  constructor(public payload: {file: ImageFile, marker: Marker}) {}
}

export class RemoveMarker implements Action {
  readonly type = REMOVE_MARKER;
  
  constructor(public payload: {fileId: string, markerId: string}) {}
}

export class UpdateMarker implements Action {
  readonly type = UPDATE_MARKER;
  
  constructor(public payload: {fileId: string, markerId: string, changes: Partial<Marker>}) {}
}



export type Actions =
| SelectDataFile
| AddMarker
| RemoveMarker
| UpdateMarker;

