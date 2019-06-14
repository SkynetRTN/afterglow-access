import { Action } from '@ngrx/store';

import { ImageFile, DataFile } from '../../data-files/models/data-file';
import { SidebarView } from '../models/sidebar-view';
import { Viewer } from '../models/viewer';
import { ViewMode } from '../models/view-mode';
import { WorkbenchTool, PixelOpsFormData, AlignFormData, StackFormData } from '../models/workbench-state';
import { CentroidSettings } from '../models/centroid-settings';
import { PlotterSettings } from '../models/plotter-settings';
import { SourceExtractorModeOption } from '../models/source-extractor-mode-option';
import { SourceExtractionSettings } from '../../jobs/models/source-extraction';
import { PhotSettings } from '../../jobs/models/photometry';
import { Catalog } from '../models/catalog';
import { FieldCal } from '../models/field-cal';
import { CatalogQueryJob } from '../../jobs/models/catalog-query';

export const SET_LAST_ROUTER_PATH = '[Workbench] Set Last Router Path';

export const TOGGLE_FULL_SCREEN = '[Workbench] Toggle Full Screen';
export const SET_FULL_SCREEN = '[Workbench] Set Full Screen';
export const SET_FULL_SCREEN_PANEL = '[Workbench] Set Full Screen Panel';

export const ENABLE_MULTI_FILE_SELECTION = '[Workbench] Enable Multi File Selection';
export const DISABLE_MULTI_FILE_SELECTION = '[Workbench] Disable Multi File Selection';
export const SELECT_DATA_FILE = '[Workbench] Select Data File';
export const SET_MULTI_FILE_SELECTION = '[Workbench] Set Multi File Selection';
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

export const LOAD_CATALOGS = '[Workbench] Load Catalogs';
export const LOAD_CATALOGS_SUCCESS = '[Workbench] Load Catalogs Success';
export const LOAD_CATALOGS_FAIL = '[Workbench] Load Catalogs Fail';

export const CREATE_FIELD_CAL = '[Workbench] Create Field Cal';
export const CREATE_FIELD_CAL_SUCCESS = '[Workbench] Create Field Cal Success';
export const CREATE_FIELD_CAL_FAIL = '[Workbench] Create Field Cal Fail';

export const UPDATE_FIELD_CAL = '[Workbench] Update Field Cal';
export const UPDATE_FIELD_CAL_SUCCESS = '[Workbench] Update Field Cal Success';
export const UPDATE_FIELD_CAL_FAIL = '[Workbench] Update Field Cal Fail';

export const LOAD_FIELD_CALS = '[Workbench] Load Field Cals';
export const LOAD_FIELD_CALS_SUCCESS = '[Workbench] Load Field Cals Success';
export const LOAD_FIELD_CALS_FAIL = '[Workbench] Load Field Cals Fail';

export const SET_SELECTED_CATALOG = "[Workbench] Set Selected Catalog"
export const SET_SELECTED_FIELD_CAL = "[Workbench] Set Selected Field Cal"
export const ADD_FIELD_CAL_SOURCES_FROM_CATALOG = "[Workbench] Add Field Cal Sources From Catalog"


export const UPDATE_PIXEL_OPS_FORM_DATA = '[Workbench] Update Pixel Ops Form Data';
export const CREATE_PIXEL_OPS_JOB = '[Workbench] Create Pixel Ops Job';
export const CREATE_ADV_PIXEL_OPS_JOB = '[Workbench] Create Adv Pixel Ops Job';
export const HIDE_CURRENT_PIXEL_OPS_JOB_STATE = '[Workbench] Hide Current Pixel Ops Job State';

export const UPDATE_ALIGN_FORM_DATA = '[Workbench] Update Align Form Data';
export const CREATE_ALIGNMENT_JOB = '[Workbench] Create Alignment Job';

export const UPDATE_STACK_FORM_DATA = '[Workbench] Update Stack Form Data';
export const CREATE_STACKING_JOB = '[Workbench] Create Stacking Job';



export class SetLastRouterPath implements Action {
  readonly type = SET_LAST_ROUTER_PATH;

  constructor(public payload: {path: string}) { }
}

export class ToggleFullScreen implements Action {
  readonly type = TOGGLE_FULL_SCREEN;
}

export class SetFullScreen implements Action {
  readonly type = SET_FULL_SCREEN;

  constructor(public payload: {value: boolean}) { }
}

export class SetFullScreenPanel implements Action {
  readonly type = SET_FULL_SCREEN_PANEL;

  constructor(public payload: {panel: 'file' | 'viewer' | 'tool'}) { }
}

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

  constructor(public payload: {fileId: string}) { }
}

export class SetMultiFileSelection implements Action {
  readonly type = SET_MULTI_FILE_SELECTION;

  constructor(public payload: {files: Array<DataFile>}) { }
}

export class SetActiveViewer implements Action {
  readonly type = SET_ACTIVE_VIEWER;

  constructor(public payload: { viewerIndex: number }) { }
}

export class SetViewerFile implements Action {
  readonly type = SET_VIEWER_FILE;

  constructor(public payload: { viewerIndex: number, fileId: string }) { }
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
  readonly type = UPDATE_SOURCE_EXTRACTION_SETTINGS;

  constructor(public payload: { changes: Partial<SourceExtractionSettings> }) { }
}

export class LoadCatalogs implements Action {
  readonly type = LOAD_CATALOGS;
}

export class LoadCatalogsSuccess implements Action {
  readonly type = LOAD_CATALOGS_SUCCESS;

  constructor(public payload: { catalogs: Array<Catalog> }) { }
}

export class LoadCatalogsFail implements Action {
  readonly type = LOAD_CATALOGS_FAIL;

  constructor(public payload: any) { }
}

export class CreateFieldCal implements Action {
  readonly type = CREATE_FIELD_CAL;

  constructor(public payload: { fieldCal: FieldCal }) { }
}

export class CreateFieldCalSuccess implements Action {
  readonly type = CREATE_FIELD_CAL_SUCCESS;

  constructor(public payload: { fieldCal: FieldCal }) { }
}

export class CreateFieldCalFail implements Action {
  readonly type = CREATE_FIELD_CAL_FAIL;

  constructor(public payload: any) { }
}

export class UpdateFieldCal implements Action {
  readonly type = UPDATE_FIELD_CAL;

  constructor(public payload: { fieldCal: FieldCal }) { }
}

export class UpdateFieldCalSuccess implements Action {
  readonly type = UPDATE_FIELD_CAL_SUCCESS;

  constructor(public payload: { fieldCal: FieldCal }) { }
}

export class UpdateFieldCalFail implements Action {
  readonly type = UPDATE_FIELD_CAL_FAIL;

  constructor(public payload: any) { }
}

export class LoadFieldCals implements Action {
  readonly type = LOAD_FIELD_CALS;
}

export class LoadFieldCalsSuccess implements Action {
  readonly type = LOAD_FIELD_CALS_SUCCESS;

  constructor(public payload: { fieldCals: Array<FieldCal> }) { }
}

export class LoadFieldCalsFail implements Action {
  readonly type = LOAD_FIELD_CALS_FAIL;

  constructor(public payload: any) { }
}

export class SetSelectedCatalog implements Action {
  readonly type = SET_SELECTED_CATALOG;

  constructor(public payload: { catalogId: string }) { }
}

export class SetSelectedFieldCal implements Action {
  readonly type = SET_SELECTED_FIELD_CAL;

  constructor(public payload: { fieldCalId: string }) { }
}

export class AddFieldCalSourcesFromCatalog implements Action {
  readonly type = ADD_FIELD_CAL_SOURCES_FROM_CATALOG;

  constructor(public payload: { fieldCalId: string, catalogQueryJob: CatalogQueryJob  }) { }
}

export class UpdatePixelOpsFormData implements Action {
  readonly type = UPDATE_PIXEL_OPS_FORM_DATA;

  constructor(public payload: { data: Partial<PixelOpsFormData>  }) { }
}

export class CreatePixelOpsJob implements Action {
  readonly type = CREATE_PIXEL_OPS_JOB;
}

export class CreateAdvPixelOpsJob implements Action {
  readonly type = CREATE_ADV_PIXEL_OPS_JOB;
}

export class HideCurrentPixelOpsJobState implements Action {
  readonly type = HIDE_CURRENT_PIXEL_OPS_JOB_STATE;
}

export class UpdateAlignFormData implements Action {
  readonly type = UPDATE_ALIGN_FORM_DATA;

  constructor(public payload: { data: Partial<AlignFormData>  }) { }
}

export class CreateAlignmentJob implements Action {
  readonly type = CREATE_ALIGNMENT_JOB;
}

export class UpdateStackFormData implements Action {
  readonly type = UPDATE_STACK_FORM_DATA;

  constructor(public payload: { data: Partial<StackFormData>}) {}
}

export class CreateStackingJob implements Action {
  readonly type = CREATE_STACKING_JOB;
}


export type Actions =
  | ToggleFullScreen
  | SetFullScreen
  | SetFullScreenPanel
  | EnableMultiFileSelection
  | DisableMultiFileSelection
  | SelectDataFile
  | SetMultiFileSelection
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
  | UpdatePhotSettings
  | LoadCatalogs
  | LoadCatalogsSuccess
  | LoadCatalogsFail
  | CreateFieldCal
  | CreateFieldCalSuccess
  | CreateFieldCalFail
  | UpdateFieldCal
  | UpdateFieldCalSuccess
  | UpdateFieldCalFail
  | LoadFieldCals
  | LoadFieldCalsSuccess
  | LoadFieldCalsFail
  | SetSelectedCatalog
  | SetSelectedFieldCal
  | AddFieldCalSourcesFromCatalog
  | UpdatePixelOpsFormData
  | CreatePixelOpsJob
  | CreateAdvPixelOpsJob
  | HideCurrentPixelOpsJobState
  | UpdateAlignFormData
  | CreateAlignmentJob
  | UpdateStackFormData
  | CreateStackingJob
  | SetLastRouterPath;

