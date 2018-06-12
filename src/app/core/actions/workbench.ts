import { Action } from '@ngrx/store';

import { ImageFile } from '../../data-files/models/data-file';
import { SidebarView } from '../models/sidebar-view';
import { Viewer } from '../models/viewer';
import { ViewMode } from '../models/view-mode';
import { WorkbenchTool } from '../models/workbench-state';
import { CentroidSettings } from '../models/centroid-settings';
import { PlotterSettings } from '../models/plotter-settings';
import { SourceExtractionSettings } from '../models/source-extraction-settings';
import { PhotSettings } from '../models/phot-settings';
import { SourceExtractorModeOption } from '../models/source-extractor-mode-option';

export const ENABLE_MULTI_FILE_SELECTION = '[Workbench] Enable Multi File Selection';
export const DISABLE_MULTI_FILE_SELECTION = '[Workbench] Disable Multi File Selection';
export const SELECT_DATA_FILE = '[Workbench] Select Data File';
export const SET_ACTIVE_VIEWER = '[Workbench] Set Active Viewer';
export const SET_VIEWER_FILE = '[Workbench] Set Viewer File';
export const SET_VIEWER_FILE_SUCCESS = '[Workbench] Set Viewer File Success';
export const SET_VIEW_MODE = '[Workbench] Set View Mode';

export const SET_VIEWER_SYNC_ENABLED = '[Workbench] Set Viewer Sync Enabled';
export const SET_NORMALIZATION_SYNC_ENABLED = '[Workbench] Set Normalization Sync Enabled';
export const SET_PLOTTER_SYNC_ENABLED = '[Workbench] Set Plotter Sync Enabled';
export const SYNC_FILE_TRANSFORMATIONS = '[Workbench] Sync File Transformations';
export const SYNC_FILE_NORMALIZATIONS= '[Workbench] Sync File Normalizations';
export const SYNC_FILE_PLOTTERS = '[Workbench] Sync File Plotters';

export const SET_ACTIVE_TOOL = '[Workbench] Set Active Tool';
export const SET_SHOW_ALL_SOURCES = '[Workbench] Set Show All Sources';

export const SET_SIDEBAR_VIEW = '[Workbench] Set Sidebar View';
export const SHOW_SIDEBAR = '[Workbench] Show Sidebar';
export const HIDE_SIDEBAR = '[Workbench] Hide Sidebar';
export const SET_SHOW_CONFIG = '[Workbench] Set Show Config';
export const TOGGLE_SHOW_CONFIG = '[Workbench] Toggle Show Config';


export const UPDATE_CENTROID_SETTINGS = '[Workbench] Update Centroid Settings';
export const UPDATE_PLOTTER_SETTINGS = '[Workbench] Update Plotter Settings';

export const SET_SOURCE_EXTRACTION_MODE = '[Workbench] Set Source Extraction Mode';
export const UPDATE_PHOT_SETTINGS = '[Workbench] Update Phot Settings';
export const UPDATE_SOURCE_EXTRACTION_SETTINGS = '[Workbench] Update Source Extraction Settings';


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

export class SetViewerFileSuccess implements Action {
  readonly type = SET_VIEWER_FILE_SUCCESS;

  constructor(public payload: { viewerIndex: number }) { }
}

export class SetViewMode implements Action {
  readonly type = SET_VIEW_MODE;

  constructor(public payload: { viewMode: ViewMode }) { }
}

export class SetViewerSyncEnabled implements Action {
  readonly type = SET_VIEWER_SYNC_ENABLED;

  constructor(public payload: { enabled: boolean }) { }
}

export class SetNormalizationSyncEnabled implements Action {
  readonly type = SET_NORMALIZATION_SYNC_ENABLED;

  constructor(public payload: { enabled: boolean }) { }
}

export class SetPlotterSyncEnabled implements Action {
  readonly type = SET_PLOTTER_SYNC_ENABLED;

  constructor(public payload: { enabled: boolean }) { }
}

export class SyncFileTransformations implements Action {
  readonly type = SYNC_FILE_TRANSFORMATIONS;

  constructor(public payload: { reference: ImageFile,  files: ImageFile[]}) { }
}

export class SyncFileNormalizations implements Action {
  readonly type = SYNC_FILE_NORMALIZATIONS;

  constructor(public payload: { reference: ImageFile,  files: ImageFile[]}) { }
}

export class SyncFilePlotters implements Action {
  readonly type = SYNC_FILE_PLOTTERS;

  constructor(public payload: { reference: ImageFile,  files: ImageFile[]}) { }
}

export class SetActiveTool implements Action {
  readonly type = SET_ACTIVE_TOOL;

  constructor(public payload: { tool: WorkbenchTool }) { }
}

export class SetShowAllSources implements Action {
  readonly type = SET_SHOW_ALL_SOURCES;

  constructor(public payload: { showAllSources: boolean }) { }
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

export class UpdateCentroidSettings implements Action {
  readonly type = UPDATE_CENTROID_SETTINGS

  constructor(public payload: { changes: Partial<CentroidSettings> }) { }
}

export class UpdatePlotterSettings implements Action {
  readonly type = UPDATE_PLOTTER_SETTINGS

  constructor(public payload: { changes: Partial<PlotterSettings> }) { }
}

export class SetSourceExtractionMode implements Action {
  readonly type = SET_SOURCE_EXTRACTION_MODE;

  constructor(public payload: { mode: SourceExtractorModeOption }) { }
}

export class UpdatePhotSettings implements Action {
  readonly type = UPDATE_PHOT_SETTINGS;

  constructor(public payload: { changes: Partial<PhotSettings> }) { }
}

export class UpdateSourceExtractionSettings implements Action {
  readonly type = UPDATE_SOURCE_EXTRACTION_SETTINGS

  constructor(public payload: { changes: Partial<SourceExtractionSettings> }) { }
}



export type Actions =
  | EnableMultiFileSelection
  | DisableMultiFileSelection
  | SelectDataFile
  | SetActiveViewer
  | SetViewerFile
  | SetViewerFileSuccess
  | SetViewMode
  | SetViewerSyncEnabled
  | SetNormalizationSyncEnabled 
  | SetPlotterSyncEnabled
  | SyncFileTransformations
  | SyncFileNormalizations
  | SyncFilePlotters
  | SetActiveTool
  | SetShowAllSources
  | SetSidebarView
  | ShowSidebar
  | HideSidebar
  | SetShowConfig
  | ToggleShowConfig
  | UpdateCentroidSettings
  | UpdatePlotterSettings
  | SetSourceExtractionMode
  | UpdateSourceExtractionSettings
  | UpdatePhotSettings;

