import { Action } from '@ngrx/store';

import { ImageFile } from '../../data-files/models/data-file';
import { Marker } from '../models/marker';
import { SidebarView } from '../models/sidebar-view';
import { Viewer } from '../models/viewer';
import { ViewMode } from '../models/view-mode';

export const ENABLE_MULTI_FILE_SELECTION = '[Workbench] Enable Multi File Selection';
export const DISABLE_MULTI_FILE_SELECTION = '[Workbench] Disable Multi File Selection';
export const SELECT_DATA_FILE = '[Workbench] Select Data File';
export const SET_ACTIVE_VIEWER = '[Workbench] Set Active Viewer';
export const SET_VIEWER_FILE = '[Workbench] Set Viewer File';
export const SET_VIEW_MODE = '[Workbench] Set View Mode';
export const UPDATE_VIEWER_SYNC = '[Workbench] Update Viewer Sync';
export const SET_VIEWER_SYNC_AVAILABLE = '[Workbench] Set Viewer Sync Available';
export const SET_VIEWER_SYNC_ENABLED = '[Workbench] Set Viewer Sync Enabled';

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

export class EnableMultiFileSelection implements Action {
  readonly type = ENABLE_MULTI_FILE_SELECTION;
}

export class DisableMultiFileSelection implements Action {
  readonly type = DISABLE_MULTI_FILE_SELECTION;
}

export class SelectDataFile implements Action {
  readonly type = SELECT_DATA_FILE;

  constructor(public payload: string) { }
}

export class SetActiveViewer implements Action {
  readonly type = SET_ACTIVE_VIEWER;

  constructor(public payload: { viewerIndex: number }) { }
}

export class SetViewerFile implements Action {
  readonly type = SET_VIEWER_FILE;

  constructor(public payload: { viewerIndex: number, file: ImageFile }) { }
}

export class SetViewMode implements Action {
  readonly type = SET_VIEW_MODE;

  constructor(public payload: { viewMode: ViewMode }) { }
}

export class UpdateViewerSync implements Action {
  readonly type = UPDATE_VIEWER_SYNC;

  constructor(public payload: { srcFile: ImageFile }) { }
}

export class SetViewerSyncEnabled implements Action {
  readonly type = SET_VIEWER_SYNC_ENABLED;

  constructor(public payload: { enabled: boolean }) { }
}

export class SetViewerSyncAvailable implements Action {
  readonly type = SET_VIEWER_SYNC_AVAILABLE;

  constructor(public payload: { available: boolean }) { }
}


/**
 * Markers
 */

export class AddMarker implements Action {
  readonly type = ADD_MARKER;

  constructor(public payload: { file: ImageFile, marker: Marker }) { }
}

export class RemoveMarker implements Action {
  readonly type = REMOVE_MARKER;

  constructor(public payload: { fileId: string, markerId: string }) { }
}

export class UpdateMarker implements Action {
  readonly type = UPDATE_MARKER;

  constructor(public payload: { fileId: string, markerId: string, changes: Partial<Marker> }) { }
}


export class SetSidebarView implements Action {
  readonly type = SET_SIDEBAR_VIEW;

  constructor(public payload: { sidebarView: SidebarView }) { }
}

export class ShowSidebar implements Action {
  readonly type = SHOW_SIDEBAR;
}

export class HideSidebar implements Action {
  readonly type = HIDE_SIDEBAR;
}

export class SetShowConfig implements Action {
  readonly type = SET_SHOW_CONFIG;

  constructor(public payload: { showConfig: boolean }) { }
}

export class ToggleShowConfig implements Action {
  readonly type = TOGGLE_SHOW_CONFIG;
}



export type Actions =
  | EnableMultiFileSelection
  | DisableMultiFileSelection
  | SelectDataFile
  | SetActiveViewer
  | SetViewerFile
  | SetViewMode
  | UpdateViewerSync
  | SetViewerSyncAvailable
  | SetViewerSyncEnabled
  | AddMarker
  | RemoveMarker
  | UpdateMarker
  | SetSidebarView
  | ShowSidebar
  | HideSidebar
  | SetShowConfig
  | ToggleShowConfig;

