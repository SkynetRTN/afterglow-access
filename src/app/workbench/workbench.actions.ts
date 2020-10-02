import { ViewMode } from './models/view-mode';
import { WorkbenchTool, PixelOpsFormData, AlignFormData, StackFormData, PlottingPanelConfig, PhotometryPanelConfig, AligningPanelConfig as AligningPanelConfig, PixelOpsPanelConfig, StackingPanelConfig as StackingPanelConfig, CustomMarkerPanelConfig, ViewerPanel } from './models/workbench-state';
import { SidebarView } from './models/sidebar-view';
import { CentroidSettings } from './models/centroid-settings';
import { PhotometryJobSettings } from '../jobs/models/photometry';
import { SourceExtractionJobSettings, SourceExtractionJob } from '../jobs/models/source-extraction';
import { Catalog } from './models/catalog';
import { FieldCal } from './models/field-cal';
import { CatalogQueryJob } from '../jobs/models/catalog-query';
import { PhotometrySettings } from './models/photometry-settings';
import { SourceExtractionSettings } from './models/source-extraction-settings';
import { Source } from './models/source';
import { Marker } from './models/marker';
import { Viewer } from './models/viewer';
import { FileInfoPanelConfig } from './models/file-info-panel';
import { DataFile, ImageHdu } from '../data-files/models/data-file';

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

export class SelectHdu {
  public static readonly type = '[Workbench] Select HDU';

  constructor(public hduId: string) { }
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

  constructor(public viewerId: string, public direction: 'up' | 'down' | 'left' | 'right' = 'right' ) { }
}

export class MoveViewer {
  public static readonly type = '[Workbench] Move Viewer ';

  constructor(public sourceViewerId: string, public targetViewerId: string ) { }
}

export class SetViewerFile {
  public static readonly type = '[Workbench] Set Viewer File';

  constructor(public viewerId: string, public hduId: string) { }
}

export class SetViewerMarkers {
  public static readonly type = '[Workbench] Set Viewer Markers'

  constructor(public viewerId: string, public markers: Marker[]) {}
}

export class ClearViewerMarkers {
  public static readonly type = '[Workbench] Clear Viewer Markers'

  constructor() {}
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

export class SetNormalizationSyncEnabled {
  public static readonly type = '[Workbench] Set Normalization Sync Enabled';

  constructor(public value: boolean) { }
}

export class SyncFileTransformations {
  public static readonly type = '[Workbench] Sync File Transformations';

  constructor(public reference: ImageHdu, public hdus: ImageHdu[]) { }
}

export class SyncFileNormalizations {
  public static readonly type = '[Workbench] Sync File Normalizations';

  constructor(public reference: ImageHdu, public hdus: ImageHdu[]) { }
}

export class SyncFilePlotters {
  public static readonly type = '[Workbench] Sync File Plotters';

  constructor(public reference: ImageHdu, public hdus: ImageHdu[]) { }
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

export class UpdateCentroidSettings {
  public static readonly type = '[Workbench] Update Centroid Settings'

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

export class UpdateCustomMarkerPanelConfig {
  public static readonly type = '[Workbench] Update Custom Marker Page Settings'

  constructor(public changes: Partial<CustomMarkerPanelConfig>) { }
}

export class UpdateFileInfoPanelConfig {
  public static readonly type = '[Workbench] Update File Info Panel Config'

  constructor(public changes: Partial<FileInfoPanelConfig>) { }
}

export class UpdatePlottingPanelConfig {
  public static readonly type = '[Workbench] Update Plotter Page Settings'

  constructor(public changes: Partial<PlottingPanelConfig>) { }
}

export class UpdatePhotometryPanelConfig {
  public static readonly type = '[Workbench] Update Photometry Page Settings'

  constructor(public changes: Partial<PhotometryPanelConfig>) { }
}

export class UpdatePixelOpsPageSettings {
  public static readonly type = '[Workbench] Update Pixel Ops Page Settings'

  constructor(public changes: Partial<PixelOpsPanelConfig>) { }
}

export class UpdateAligningPanelConfig {
  public static readonly type = '[Workbench] Update Aligning Page Settings'

  constructor(public changes: Partial<AligningPanelConfig>) { }
}

export class UpdateStackingPanelConfig {
  public static readonly type = '[Workbench] Update Stacking Page Settings'

  constructor(public changes: Partial<StackingPanelConfig>) { }
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

  constructor(public fieldCal: FieldCal) { }
}

export class CreateFieldCalSuccess {
  public static readonly type = '[Workbench] Create Field Cal Success';

  constructor(public fieldCal: FieldCal) { }
}

export class CreateFieldCalFail {
  public static readonly type = '[Workbench] Create Field Cal Fail';

  constructor(public error: any) { }
}

export class UpdateFieldCal {
  public static readonly type = '[Workbench] Update Field Cal';

  constructor(public fieldCal: FieldCal) { }
}

export class UpdateFieldCalSuccess {
  public static readonly type = '[Workbench] Update Field Cal Success';

  constructor(public fieldCal: FieldCal) { }
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

  constructor(public fieldCals: Array<FieldCal>) { }
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
}

export class CreateStackingJob {
  public static readonly type = '[Workbench] Create Stacking Job';
}

export class ExtractSources {
  public static readonly type = '[Workbench] Extract Sources'

  constructor(public hduId: string, public settings: SourceExtractionSettings) { }
}

export class ExtractSourcesSuccess {
  public static readonly type = '[Workbench] Extract Sources Success'

  constructor(public hduId: string, public sources: Source[]) { }
}

export class ExtractSourcesFail {
  public static readonly type = '[Workbench] Extract Sources Fail'

  constructor(public error: string) { }
}


/* Survey */
export class ImportFromSurvey {
  public static readonly type = '[Survey] Import From Survey';

  constructor(public surveyDataProviderId: string,
    public raHours: number,
    public decDegs: number,
    public widthArcmins: number,
    public heightArcmins: number,
    public imageFileId?: string,
    public correlationId?: string) { }
}

export class ImportFromSurveySuccess {
  public static readonly type = '[Survey] Import From Survey Success';
}

export class ImportFromSurveyFail {
  public static readonly type = '[Survey] Import From Survey Fail';
}


/* Layout */
export class OpenSidenav {
  public static readonly type = '[Layout] Open Sidenav';
}

export class CloseSidenav {
  public static readonly type = '[Layout] Close Sidenav';
}

export class BatchPhotometerSources {
  public static readonly type = '[Phot Data] Batch Photometer Sources'

  constructor(public sourceIds: string[], public fileIds: string[], public settings: PhotometrySettings) { }
}

export class PhotometerSources {
  public static readonly type = '[Phot Data] Photometer Sources'

  constructor(public sourceIds: string[], public fileIds: string[], public settings: PhotometrySettings, public isBatch: boolean) { }
}










