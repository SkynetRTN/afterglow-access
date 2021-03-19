import { ViewMode } from './models/view-mode';
import {
  WorkbenchTool,
  PixelOpsFormData,
  AlignFormData,
  StackFormData,
  PlottingPanelConfig,
  PhotometryPanelConfig,
  AligningPanelConfig as AligningPanelConfig,
  PixelOpsPanelConfig,
  StackingPanelConfig as StackingPanelConfig,
  CustomMarkerPanelConfig,
  ViewerPanel,
  WcsCalibrationSettings,
  WcsCalibrationPanelState,
} from './models/workbench-state';
import { SidebarView } from './models/sidebar-view';
import { CentroidSettings } from './models/centroid-settings';
import { Catalog } from './models/catalog';
import { FieldCal } from './models/field-cal';
import { CatalogQueryJob } from '../jobs/models/catalog-query';
import { PhotometrySettings } from './models/photometry-settings';
import { SourceExtractionSettings } from './models/source-extraction-settings';
import { Source, PosType } from './models/source';
import { Marker } from './models/marker';
import { IViewer } from './models/viewer';
import { FileInfoPanelConfig } from './models/file-info-panel';
import { DataFile, IHdu, Header } from '../data-files/models/data-file';
import { Region } from '../data-files/models/region';
import { SonificationPanelState } from './models/sonifier-file-state';
import { PlottingPanelState } from './models/plotter-file-state';
import { PhotometryPanelState } from './models/photometry-file-state';
import { PhotData } from './models/source-phot-data';
import { PixelNormalizer } from '../data-files/models/pixel-normalizer';
import { PhotometryData } from '../jobs/models/photometry';

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

  constructor(public value: boolean) {}
}

export class SetFullScreenPanel {
  public static readonly type = '[Workbench] Set Full Screen Panel';

  constructor(public panel: 'file' | 'viewer' | 'tool') {}
}

export class SelectFile {
  public static readonly type = '[Workbench] Select File';

  constructor(public fileId: string, public hduId: string = '', public keepOpen: boolean = false) {}
}

export class ToggleFileSelection {
  public static readonly type = '[Workbench] Toggle File Selection';

  constructor(public id: string) {}
}

export class SetFileListFilter {
  public static readonly type = '[Workbench] Set File List Filter';

  constructor(public value: string) {}
}

export class SetFileSelection {
  public static readonly type = '[Workbench] Set File Selection';

  constructor(public ids: string[]) {}
}

export class SetFocusedViewer {
  public static readonly type = '[Workbench] Set Focused Viewer';

  constructor(public viewerId: string) {}
}

export class CreateViewer {
  public static readonly type = '[Workbench] Create Viewer';

  constructor(public viewer: IViewer, public panelId: string) {}
}

export class RemoveViewerLayoutItem {
  public static readonly type = '[Workbench] Remove Viewer Layout Item';

  constructor(public viewerLayoutItemId: string) {}
}

export class CloseViewer {
  public static readonly type = '[Workbench] Close Viewer';

  constructor(public viewerId: string) {}
}

export class KeepViewerOpen {
  public static readonly type = '[Workbench] Keep Viewer Open ';

  constructor(public viewerId: string) {}
}

export class SplitViewerPanel {
  public static readonly type = '[Workbench] Split Viewer Panel ';

  constructor(public viewerId: string, public direction: 'up' | 'down' | 'left' | 'right' = 'right') {}
}

export class MoveViewer {
  public static readonly type = '[Workbench] Move Viewer ';

  constructor(
    public viewerId: string,
    public sourcePanelId: string,
    public targetPanelId: string,
    public targetIndex: number
  ) {}
}

export class SetViewerData {
  public static readonly type = '[Workbench] Set Viewer File';

  constructor(public viewerId: string, public fileId: string, public hduId: string = null) {}
}

export class UpdateCurrentViewportSize {
  public static readonly type = '[Workbench] Update Current Viewport Size';

  constructor(public viewerId: string, public viewportSize: { width: number; height: number }) {}
}

export class SetViewerMarkers {
  public static readonly type = '[Workbench] Set Viewer Markers';

  constructor(public viewerId: string, public markers: Marker[]) {}
}

export class ClearViewerMarkers {
  public static readonly type = '[Workbench] Clear Viewer Markers';

  constructor() {}
}

export class SetViewerFileSuccess {
  public static readonly type = '[Workbench] Set Viewer File Success';

  constructor(public viewerId: string) {}
}

export class SetViewMode {
  public static readonly type = '[Workbench] Set View Mode';

  constructor(public viewMode: ViewMode) {}
}

export class SetViewerSyncEnabled {
  public static readonly type = '[Workbench] Set Viewer Sync Enabled';

  constructor(public value: boolean) {}
}

export class SetViewerSyncMode {
  public static readonly type = '[Workbench] Set Viewer Sync Mode';

  constructor(public value: 'sky' | 'pixel') {}
}

export class SetNormalizationSyncEnabled {
  public static readonly type = '[Workbench] Set Normalization Sync Enabled';

  constructor(public value: boolean) {}
}

export class SyncPlottingPanelStates {
  public static readonly type = '[Workbench] Sync Plotting Panel States';

  constructor(public referenceId: string, public ids: string[]) {}
}

export class SetActiveTool {
  public static readonly type = '[Workbench] Set Active Tool';

  constructor(public tool: WorkbenchTool) {}
}

export class SetSidebarView {
  public static readonly type = '[Workbench] Set Sidebar View';

  constructor(public sidebarView: SidebarView) {}
}

export class ShowSidebar {
  public static readonly type = '[Workbench] Show Sidebar';
}

export class HideSidebar {
  public static readonly type = '[Workbench] Hide Sidebar';
}

export class SetShowConfig {
  public static readonly type = '[Workbench] Set Show Config';

  constructor(public showConfig: boolean) {}
}

export class ToggleShowConfig {
  public static readonly type = '[Workbench] Toggle Show Config';
}

export class UpdateCentroidSettings {
  public static readonly type = '[Workbench] Update Centroid Settings';

  constructor(public changes: Partial<CentroidSettings>) {}
}

export class UpdatePhotometrySettings {
  public static readonly type = '[Workbench] Update Photometry Settings';

  constructor(public changes: Partial<PhotometrySettings>) {}
}

export class UpdateSourceExtractionSettings {
  public static readonly type = '[Workbench] Update Source Extraction Settings';

  constructor(public changes: Partial<SourceExtractionSettings>) {}
}

export class UpdateCustomMarkerPanelConfig {
  public static readonly type = '[Workbench] Update Custom Marker Panel Config';

  constructor(public changes: Partial<CustomMarkerPanelConfig>) {}
}

export class UpdateFileInfoPanelConfig {
  public static readonly type = '[Workbench] Update File Info Panel Config';

  constructor(public changes: Partial<FileInfoPanelConfig>) {}
}

export class UpdatePlottingPanelConfig {
  public static readonly type = '[Workbench] Update Plotter Panel Config';

  constructor(public changes: Partial<PlottingPanelConfig>) {}
}

export class UpdatePhotometryPanelConfig {
  public static readonly type = '[Workbench] Update Photometry Panel Config';

  constructor(public changes: Partial<PhotometryPanelConfig>) {}
}

export class UpdatePixelOpsPageSettings {
  public static readonly type = '[Workbench] Update Pixel Ops Panel Config';

  constructor(public changes: Partial<PixelOpsPanelConfig>) {}
}

export class UpdateAligningPanelConfig {
  public static readonly type = '[Workbench] Update Aligning Panel Config';

  constructor(public changes: Partial<AligningPanelConfig>) {}
}

export class UpdateStackingPanelConfig {
  public static readonly type = '[Workbench] Update Stacking Panel Config';

  constructor(public changes: Partial<StackingPanelConfig>) {}
}

export class UpdateWcsCalibrationPanelState {
  public static readonly type = '[Workbench] Update Wcs Calibration Panel';

  constructor(public changes: Partial<WcsCalibrationPanelState>) {}
}

export class UpdateWcsCalibrationSettings {
  public static readonly type = '[Workbench] Update Wcs Calibration Settings';

  constructor(public changes: Partial<WcsCalibrationSettings>) {}
}

export class LoadCatalogs {
  public static readonly type = '[Workbench] Load Catalogs';
}

export class LoadCatalogsSuccess {
  public static readonly type = '[Workbench] Load Catalogs Success';

  constructor(public catalogs: Array<Catalog>) {}
}

export class LoadCatalogsFail {
  public static readonly type = '[Workbench] Load Catalogs Fail';

  constructor(public error: any) {}
}

export class CreateFieldCal {
  public static readonly type = '[Workbench] Create Field Cal';

  constructor(public fieldCal: FieldCal) {}
}

export class CreateFieldCalSuccess {
  public static readonly type = '[Workbench] Create Field Cal Success';

  constructor(public fieldCal: FieldCal) {}
}

export class CreateFieldCalFail {
  public static readonly type = '[Workbench] Create Field Cal Fail';

  constructor(public error: any) {}
}

export class UpdateFieldCal {
  public static readonly type = '[Workbench] Update Field Cal';

  constructor(public fieldCal: FieldCal) {}
}

export class UpdateFieldCalSuccess {
  public static readonly type = '[Workbench] Update Field Cal Success';

  constructor(public fieldCal: FieldCal) {}
}

export class UpdateFieldCalFail {
  public static readonly type = '[Workbench] Update Field Cal Fail';

  constructor(public error: any) {}
}

export class LoadFieldCals {
  public static readonly type = '[Workbench] Load Field Cals';
}

export class LoadFieldCalsSuccess {
  public static readonly type = '[Workbench] Load Field Cals Success';

  constructor(public fieldCals: Array<FieldCal>) {}
}

export class LoadFieldCalsFail {
  public static readonly type = '[Workbench] Load Field Cals Fail';

  constructor(public error: any) {}
}

export class SetSelectedCatalog {
  public static readonly type = '[Workbench] Set Selected Catalog';

  constructor(public catalogId: string) {}
}

export class SetSelectedFieldCal {
  public static readonly type = '[Workbench] Set Selected Field Cal';

  constructor(public fieldCalId: string) {}
}

export class AddFieldCalSourcesFromCatalog {
  public static readonly type = '[Workbench] Add Field Cal Sources From Catalog';

  constructor(public fieldCalId: string, public catalogQueryJob: CatalogQueryJob) {}
}

export class CreatePixelOpsJob {
  public static readonly type = '[Workbench] Create Pixel Ops Job';
}

export class CreateAdvPixelOpsJob {
  public static readonly type = '[Workbench] Create Adv Pixel Ops Job';
}

export class HideCurrentPixelOpsJobState {
  public static readonly type = '[Workbench] Hide Current Pixel Ops Job State';
}

export class CreateAlignmentJob {
  public static readonly type = '[Workbench] Create Alignment Job';
  constructor(public hduIds: string[]) {}
}

export class CreateStackingJob {
  public static readonly type = '[Workbench] Create Stacking Job';
  constructor(public hduIds: string[]) {}
}

export class CreateWcsCalibrationJob {
  public static readonly type = '[Workbench] Create Wcs Calibration Job';
  constructor(public hduIds: string[]) {}
}

export class ExtractSources {
  public static readonly type = '[Workbench] Extract Sources';

  constructor(
    public hduId: string,
    public viewportSize: { width: number; height: number },
    public settings: SourceExtractionSettings
  ) {}
}

export class ExtractSourcesSuccess {
  public static readonly type = '[Workbench] Extract Sources Success';

  constructor(public hduId: string, public sources: Source[]) {}
}

export class ExtractSourcesFail {
  public static readonly type = '[Workbench] Extract Sources Fail';

  constructor(public error: string) {}
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
  ) {}
}

export class ImportFromSurveySuccess {
  public static readonly type = '[Survey] Import From Survey Success';

  constructor(public fileId: string, public correlationId: string = null) {}
}

export class ImportFromSurveyFail {
  public static readonly type = '[Survey] Import From Survey Fail';

  constructor(public correlationId: string = null) {}
}

/* Layout */
export class OpenSidenav {
  public static readonly type = '[Layout] Open Sidenav';
}

export class CloseSidenav {
  public static readonly type = '[Layout] Close Sidenav';
}

export class InitializeWorkbenchHduState {
  public static readonly type = '[Workbench HDU State] Initialize Workbench HDU State';

  constructor(public hduId: string) {}
}

export class InitializeWorkbenchFileState {
  public static readonly type = '[Workbench File State] Initialize Workbench File State';

  constructor(public fileId: string) {}
}

/* Sonification */
export class SonificationViewportSync {
  public static readonly type = '[Sonifier] Sonification Viewport Sync';

  constructor(public hduId: string) {}
}

export class SonificationRegionChanged {
  public static readonly type = '[Sonifier] Region Changed';

  constructor(public hduId: string) {}
}

export class AddRegionToHistory {
  public static readonly type = '[Sonifier] Add Region to History';

  constructor(public hduId: string, public region: Region) {}
}

export class ClearRegionHistory {
  public static readonly type = '[Sonifier] Clear Region History';

  constructor(public hduId: string) {}
}

export class UndoRegionSelection {
  public static readonly type = '[Sonifier] Undo Region Selection';

  constructor(public hduId: string) {}
}

export class RedoRegionSelection {
  public static readonly type = '[Sonifier] Redo Region Selection';

  constructor(public hduId: string) {}
}

export class UpdateSonifierFileState {
  public static readonly type = '[Sonifier] Update File State';

  constructor(public hduId: string, public changes: Partial<SonificationPanelState>) {}
}

export class SetProgressLine {
  public static readonly type = '[Sonifier] Set Progress Line';

  constructor(public hduId: string, public line: { x1: number; y1: number; x2: number; y2: number }) {}
}

export class Sonify {
  public static readonly type = '[Sonifier] Sonify';

  constructor(public hduId: string, public region: Region) {}
}

export class ClearSonification {
  public static readonly type = '[Sonifier] Clear Sonification';

  constructor(public hduId: string) {}
}

export class SonificationCompleted {
  public static readonly type = '[Sonifier] Sonification Completed';

  constructor(public hduId: string, public url: string, public error: string) {}
}

/* Plotting */

export class UpdatePlottingPanelState {
  public static readonly type = '[Plotter] Update HDU Plotting Panel State';

  constructor(public plottingPanelStateId: string, public changes: Partial<PlottingPanelState>) {}
}

export class StartLine {
  public static readonly type = '[Plotter] Start Line';

  constructor(
    public plottingPanelStateId: string,
    public point: { primaryCoord: number; secondaryCoord: number; posType: PosType }
  ) {}
}

export class UpdateLine {
  public static readonly type = '[Plotter] Update Line';

  constructor(
    public plottingPanelStateId: string,
    public point: { primaryCoord: number; secondaryCoord: number; posType: PosType }
  ) {}
}

/*Photometry*/

export class UpdatePhotometrySourceSelectionRegion {
  public static readonly type = '[Photometry] Update Photometry Source Selection Region';

  constructor(public hduId: string, public region: Region) {}
}

export class EndPhotometrySourceSelectionRegion {
  public static readonly type = '[Photometry] End Photometry Source Selection Region';

  constructor(public hduId: string, public mode: 'append' | 'remove') {}
}

export class UpdateFilteredSources {
  public static readonly type = '[Photometry] Update Filtered Sources';

  constructor(public hduId: string) {}
}

export class UpdatePhotometryFileState {
  public static readonly type = '[Photometry] Update File State';

  constructor(public hduId: string, public changes: Partial<PhotometryPanelState>) {}
}

export class RemoveSelectedSources {
  public static readonly type = '[Photometry] Remove Selected Sources';

  constructor(public hduId: string) {}
}

export class RemoveAllSources {
  public static readonly type = '[Photometry] Remove All Sources';

  constructor(public hduId: string) {}
}

export class SetSourceLabel {
  public static readonly type = '[Photometry] Set Source Label';

  constructor(public hduId: string, public source: Source, public label: string) {}
}

export class BatchPhotometerSources {
  public static readonly type = '[Phot Data] Batch Photometer Sources';

  constructor(public sourceIds: string[], public fileIds: string[], public settings: PhotometrySettings) {}
}

export class PhotometerSources {
  public static readonly type = '[Phot Data] Photometer Sources';

  constructor(
    public sourceIds: string[],
    public hduIds: string[],
    public settings: PhotometrySettings,
    public isBatch: boolean
  ) {}
}

/* Markers */
export class UpdateCustomMarkerSelectionRegion {
  public static readonly type = '[Markers] Update Custom Marker Selection Region';

  constructor(public customMarkerPanelStateId: string, public region: Region) {}
}

export class EndCustomMarkerSelectionRegion {
  public static readonly type = '[Markers] End Custom Marker Selection Region';

  constructor(public customMarkerPanelStateId: string, public mode: 'append' | 'remove') {}
}

export class UpdateCustomMarker {
  public static readonly type = '[Markers] Update Custom Marker';

  /* TODO:  Figure out why error TS2322 is thrown by compiler when changes type is set to Partial<Marker> */
  constructor(public customMarkerPanelStateId: string, public markerId: string, public changes: any) {}
}

export class AddCustomMarkers {
  public static readonly type = '[Markers] Add Custom Marker';

  constructor(public customMarkerPanelStateId: string, public markers: Marker[]) {}
}

export class RemoveCustomMarkers {
  public static readonly type = '[Markers] Remove Custom Marker';

  constructor(public customMarkerPanelStateId: string, public markers: Marker[]) {}
}

export class SelectCustomMarkers {
  public static readonly type = '[Markers] Select Custom Markers';

  constructor(public customMarkerPanelStateId: string, public markers: Marker[]) {}
}

export class DeselectCustomMarkers {
  public static readonly type = '[Markers] Deselect Custom Markers';

  constructor(public customMarkerPanelStateId: string, public markers: Marker[]) {}
}

export class SetCustomMarkerSelection {
  public static readonly type = '[Markers] Set Custom Marker Selection';

  constructor(public customMarkerPanelStateId: string, public markers: Marker[]) {}
}

export class AddPhotDatas {
  public static readonly type = '[Sources Phot Data] Add Source Phot Datas';

  constructor(public photDatas: PhotometryData[]) {}
}

export class RemoveAllPhotDatas {
  public static readonly type = '[Phot Data] Remove All Phot Data';

  constructor() {}
}

export class RemovePhotDatas {
  public static readonly type = '[Phot Data] Remove Source Phot Datas';

  constructor(public sourceId: string) {}
}

export class SyncViewerTransformations {
  public static readonly type = '[Workbench] Sync Viewer Transformations';

  constructor(
    public refHeaderId: string,
    public refImageTransformId: string,
    public refViewportTransformId: string,
    public refImageDataId: string
  ) {}
}

export class SyncViewerNormalizations {
  public static readonly type = '[Workbench] Sync Viewer Normalizations';

  constructor(public normalization: PixelNormalizer) {}
}
