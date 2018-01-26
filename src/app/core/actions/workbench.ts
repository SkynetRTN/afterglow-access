import { Action } from '@ngrx/store';

import { ImageFile } from '../../data-files/models/data-file';
import { Marker } from '../models/marker';
import { SidebarView } from '../models/sidebar-view';

export const SELECT_DATA_FILE = '[Workbench] Select Data File';

export const ADD_MARKER = '[Workbench] Add Marker';
export const REMOVE_MARKER = '[Workbench] Remove Marker';
export const UPDATE_MARKER = '[Workbench] Update Marker';

export const SET_SIDEBAR_VIEW = '[Workbench] Set Sidebar View';
export const SHOW_SIDEBAR = '[Workbench] Show Sidebar';
export const HIDE_SIDEBAR = '[Workbench] Hide Sidebar';
export const SET_SHOW_CONFIG = '[Workbench] Set Show Config';
export const TOGGLE_SHOW_CONFIG = '[Workbench] Toggle Show Config';


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


export class SetSidebarView implements Action {
  readonly type = SET_SIDEBAR_VIEW;
  
  constructor(public payload: {sidebarView: SidebarView}) {}
}

export class ShowSidebar implements Action {
  readonly type = SHOW_SIDEBAR;
}

export class HideSidebar implements Action {
  readonly type = HIDE_SIDEBAR;
}

export class SetShowConfig implements Action {
  readonly type = SET_SHOW_CONFIG;

  constructor(public payload: {showConfig: boolean}) {}
}

export class ToggleShowConfig implements Action {
  readonly type = TOGGLE_SHOW_CONFIG;
}



export type Actions =
| SelectDataFile
| AddMarker
| RemoveMarker
| UpdateMarker
| SetSidebarView
| ShowSidebar
| HideSidebar 
| SetShowConfig
| ToggleShowConfig;

