import { ViewMode } from './models/view-mode';
import {
  WorkbenchTool,
  ViewerPanel,
} from './models/workbench-state';
import { SidebarView } from './models/sidebar-view';
import { CentroidSettings } from './models/centroid-settings';
import { Catalog, CatalogQueryJob } from '../jobs/models/catalog-query';
import { PhotometrySettings } from './models/photometry-settings';
import { SourceExtractionSettings } from './models/source-extraction-settings';
import { Source, PosType } from './models/source';
import { Marker } from './models/marker';
import { IViewer, Viewer } from './models/viewer';
import { DataFile, ILayer, Header } from '../data-files/models/data-file';
import { Region } from '../data-files/models/region';
import { PlottingPanelState } from './models/plotter-file-state';
import { PixelNormalizer } from '../data-files/models/pixel-normalizer';
import { PhotometryData } from '../jobs/models/photometry';
import { FieldCalibration } from '../jobs/models/field-calibration';
import { GlobalSettings } from './models/global-settings';
import { CalibrationSettings } from './models/calibration-settings';
import { CosmeticCorrectionSettings } from './models/cosmetic-correction-settings';
import { AlignmentSettings } from './models/alignment-settings';

/* Core */

export class Initialize {
  public static readonly type = '[Core] Initialize';
}

/* Workbench */
export class ToggleFullScreen {
  public static readonly type = '[Workbench] Toggle Full Screen';
}

export class SetFullScreen {
  public static readonly type = '[Workbench] Set Full Screen';

  constructor(public value: boolean) { }
}

export class SetFullScreenPanel {
  public static readonly type = '[Workbench] Set Full Screen Panel';

  constructor(public panel: 'file' | 'viewer' | 'tool') { }
}

export class SelectFile {
  public static readonly type = '[Workbench] Select File';

  constructor(public fileId: string, public layerId: string = '', public keepOpen: boolean = false) { }
}

export class ToggleFileSelection {
  public static readonly type = '[Workbench] Toggle File Selection';

  constructor(public id: string) { }
}

export class SetFileListFilter {
  public static readonly type = '[Workbench] Set File List Filter';

  constructor(public value: string) { }
}

export class SetFileSelection {
  public static readonly type = '[Workbench] Set File Selection';

  constructor(public ids: string[]) { }
}

export class SetFocusedViewer {
  public static readonly type = '[Workbench] Set Focused Viewer';

  constructor(public viewerId: string) { }
}

export class CreateViewer {
  public static readonly type = '[Workbench] Create Viewer';

  constructor(public viewer: Viewer, public panelId: string) { }
}

export class RemoveViewerLayoutItem {
  public static readonly type = '[Workbench] Remove Viewer Layout Item';

  constructor(public viewerLayoutItemId: string) { }
}

export class CloseViewer {
  public static readonly type = '[Workbench] Close Viewer';

  constructor(public viewerId: string) { }
}

export class KeepViewerOpen {
  public static readonly type = '[Workbench] Keep Viewer Open ';

  constructor(public viewerId: string) { }
}

export class SplitViewerPanel {
  public static readonly type = '[Workbench] Split Viewer Panel ';

  constructor(public viewerId: string, public direction: 'up' | 'down' | 'left' | 'right' = 'right') { }
}

export class MoveViewer {
  public static readonly type = '[Workbench] Move Viewer ';

  constructor(
    public viewerId: string,
    public sourcePanelId: string,
    public targetPanelId: string,
    public targetIndex: number
  ) { }
}

export class SetViewerData {
  public static readonly type = '[Workbench] Set Viewer File';

  constructor(public viewerId: string, public fileId: string, public layerId: string = null) { }
}

export class UpdateCurrentViewportSize {
  public static readonly type = '[Workbench] Update Current Viewport Size';

  constructor(public viewerId: string, public viewportSize: { width: number; height: number }) { }
}

export class SetViewerMarkers {
  public static readonly type = '[Workbench] Set Viewer Markers';

  constructor(public viewerId: string, public markers: Marker[]) { }
}

export class ClearViewerMarkers {
  public static readonly type = '[Workbench] Clear Viewer Markers';

  constructor() { }
}

export class SetViewerFileSuccess {
  public static readonly type = '[Workbench] Set Viewer File Success';

  constructor(public viewerId: string) { }
}

export class SetViewMode {
  public static readonly type = '[Workbench] Set View Mode';

  constructor(public viewMode: ViewMode) { }
}

export class SetViewerSyncEnabled {
  public static readonly type = '[Workbench] Set Viewer Sync Enabled';

  constructor(public value: boolean) { }
}

export class SetViewerSyncMode {
  public static readonly type = '[Workbench] Set Viewer Sync Mode';

  constructor(public value: 'sky' | 'pixel') { }
}

export class SetNormalizationSyncEnabled {
  public static readonly type = '[Workbench] Set Normalization Sync Enabled';

  constructor(public value: boolean) { }
}



export class SetActiveTool {
  public static readonly type = '[Workbench] Set Active Tool';

  constructor(public tool: WorkbenchTool) { }
}

export class SetSidebarView {
  public static readonly type = '[Workbench] Set Sidebar View';

  constructor(public sidebarView: SidebarView) { }
}

export class ShowSidebar {
  public static readonly type = '[Workbench] Show Sidebar';
}

export class HideSidebar {
  public static readonly type = '[Workbench] Hide Sidebar';
}

export class SetShowConfig {
  public static readonly type = '[Workbench] Set Show Config';

  constructor(public showConfig: boolean) { }
}

export class ToggleShowConfig {
  public static readonly type = '[Workbench] Toggle Show Config';
}

export class UpdateSettings {
  public static readonly type = '[Workbench] Update Settings';

  constructor(public changes: Partial<GlobalSettings>) { }
}

export class UpdateCentroidSettings {
  public static readonly type = '[Workbench] Update Centroid Settings';

  constructor(public changes: Partial<CentroidSettings>) { }
}

export class UpdatePhotometrySettings {
  public static readonly type = '[Workbench] Update Photometry Settings';

  constructor(public changes: Partial<PhotometrySettings>) { }
}

export class UpdateSourceExtractionSettings {
  public static readonly type = '[Workbench] Update Source Extraction Settings';

  constructor(public changes: Partial<SourceExtractionSettings>) { }
}

export class UpdateAlignmentSettings {
  public static readonly type = '[Workbench] Update Alignment Settings';

  constructor(public changes: Partial<AlignmentSettings>) { }
}

export class UpdateCalibrationSettings {
  public static readonly type = '[Workbench] Update Calibration Settings';

  constructor(public changes: Partial<CalibrationSettings>) { }
}

export class UpdateCosmeticCorrectionSettings {
  public static readonly type = '[Workbench] Update Cosmetic Correction Settings';

  constructor(public changes: Partial<CosmeticCorrectionSettings>) { }
}


export class LoadCatalogs {
  public static readonly type = '[Workbench] Load Catalogs';
}

export class LoadCatalogsSuccess {
  public static readonly type = '[Workbench] Load Catalogs Success';

  constructor(public catalogs: Array<Catalog>) { }
}

export class LoadCatalogsFail {
  public static readonly type = '[Workbench] Load Catalogs Fail';

  constructor(public error: any) { }
}

export class CreateFieldCal {
  public static readonly type = '[Workbench] Create Field Cal';

  constructor(public fieldCal: FieldCalibration) { }
}

export class CreateFieldCalSuccess {
  public static readonly type = '[Workbench] Create Field Cal Success';

  constructor(public fieldCal: FieldCalibration) { }
}

export class CreateFieldCalFail {
  public static readonly type = '[Workbench] Create Field Cal Fail';

  constructor(public error: any) { }
}

export class UpdateFieldCal {
  public static readonly type = '[Workbench] Update Field Cal';

  constructor(public fieldCal: FieldCalibration) { }
}

export class UpdateFieldCalSuccess {
  public static readonly type = '[Workbench] Update Field Cal Success';

  constructor(public fieldCal: FieldCalibration) { }
}

export class UpdateFieldCalFail {
  public static readonly type = '[Workbench] Update Field Cal Fail';

  constructor(public error: any) { }
}

export class LoadFieldCals {
  public static readonly type = '[Workbench] Load Field Cals';
}

export class LoadFieldCalsSuccess {
  public static readonly type = '[Workbench] Load Field Cals Success';

  constructor(public fieldCals: Array<FieldCalibration>) { }
}

export class LoadFieldCalsFail {
  public static readonly type = '[Workbench] Load Field Cals Fail';

  constructor(public error: any) { }
}

export class SetSelectedCatalog {
  public static readonly type = '[Workbench] Set Selected Catalog';

  constructor(public catalogId: string) { }
}

export class SetSelectedFieldCal {
  public static readonly type = '[Workbench] Set Selected Field Cal';

  constructor(public fieldCalId: string) { }
}

export class AddFieldCalSourcesFromCatalog {
  public static readonly type = '[Workbench] Add Field Cal Sources From Catalog';

  constructor(public fieldCalId: string, public catalogQueryJob: CatalogQueryJob) { }
}

export class ExtractSources {
  public static readonly type = '[Workbench] Extract Sources';

  constructor(
    public layerId: string,
    public viewportSize: { width: number; height: number },
    public settings: SourceExtractionSettings
  ) { }
}

export class ExtractSourcesSuccess {
  public static readonly type = '[Workbench] Extract Sources Success';

  constructor(public layerId: string, public sources: Source[]) { }
}

export class ExtractSourcesFail {
  public static readonly type = '[Workbench] Extract Sources Fail';

  constructor(public error: string) { }
}

/* Survey */
export class ImportFromSurvey {
  public static readonly type = '[Survey] Import From Survey';

  constructor(
    public surveyDataProviderId: string,
    public raHours: number,
    public decDegs: number,
    public widthArcmins: number,
    public heightArcmins: number,
    public correlationId?: string
  ) { }
}

export class ImportFromSurveySuccess {
  public static readonly type = '[Survey] Import From Survey Success';

  constructor(public fileId: string, public correlationId: string = null) { }
}

export class ImportFromSurveyFail {
  public static readonly type = '[Survey] Import From Survey Fail';

  constructor(public correlationId: string = null, public error: string) { }
}

/* Layout */
export class OpenSidenav {
  public static readonly type = '[Layout] Open Sidenav';
}

export class CloseSidenav {
  public static readonly type = '[Layout] Close Sidenav';
}

/* Sources */


export class RemoveSelectedSources {
  public static readonly type = '[Sources] Remove Selected Sources';

  constructor(public layerId: string) { }
}

export class RemoveAllSources {
  public static readonly type = '[Sources] Remove All Sources';

  constructor(public layerId: string) { }
}

export class SetSourceLabel {
  public static readonly type = '[Sources] Set Source Label';

  constructor(public layerId: string, public source: Source, public label: string) { }
}


/*Photometry */


/* Markers */



export class SyncViewerTransformations {
  public static readonly type = '[Workbench] Sync Viewer Transformations';

  constructor(
    public refHeaderId: string,
    public refImageTransformId: string,
    public refViewportTransformId: string,
    public refImageDataId: string,
    public refViewer: Viewer,
  ) { }
}

export class SyncViewerNormalizations {
  public static readonly type = '[Workbench] Sync Viewer Normalizations';

  constructor(public normalization: PixelNormalizer) { }
}

export class SyncAfterglowHeaders {
  public static readonly type = '[Workbench] Sync Afterglow Headers';

  constructor(public layerId: string) { }
}
