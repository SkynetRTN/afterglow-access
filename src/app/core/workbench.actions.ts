import { DataFile, ImageFile } from '../data-files/models/data-file';
import { ViewMode } from './models/view-mode';
import { WorkbenchTool, PixelOpsFormData, AlignFormData, StackFormData } from './models/workbench-state';
import { SidebarView } from './models/sidebar-view';
import { CentroidSettings } from './models/centroid-settings';
import { PlotterSettings } from './models/plotter-settings';
import { SourceExtractorModeOption } from './models/source-extractor-mode-option';
import { PhotSettings } from '../jobs/models/photometry';
import { SourceExtractionSettings, SourceExtractionJob } from '../jobs/models/source-extraction';
import { Catalog } from './models/catalog';
import { FieldCal } from './models/field-cal';
import { CatalogQueryJob } from '../jobs/models/catalog-query';
import { CustomMarker } from './models/custom-marker';
import { Region } from './models/region';
import { SourceExtractorFileState } from './models/source-extractor-file-state';
import { Source } from './models/source';

/* Core */

export class Initialize {
  public static readonly type = '[Core] Initialize';
}

/* Workbench */
export class SetLastRouterPath {
  public static readonly type = '[Workbench] Set Last Router Path';

  constructor(public path: string) { }
}

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

export class EnableMultiFileSelection {
  public static readonly type = '[Workbench] Enable Multi File Selection';
}

export class DisableMultiFileSelection {
  public static readonly type = '[Workbench] Disable Multi File Selection';
}

export class SelectDataFile {
  public static readonly type = '[Workbench] Select Data File';

  constructor(public fileId: string) { }
}

export class SetMultiFileSelection {
  public static readonly type = '[Workbench] Set Multi File Selection';

  constructor(public fileIds: string[]) { }
}

export class SetActiveViewer {
  public static readonly type = '[Workbench] Set Active Viewer';

  constructor(public viewerIndex: number) { }
}

export class SetViewerFile {
  public static readonly type = '[Workbench] Set Viewer File';

  constructor(public viewerIndex: number, public fileId: string) { }
}

export class SetViewerFileSuccess {
  public static readonly type = '[Workbench] Set Viewer File Success';

  constructor(public viewerIndex: number) { }
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

export class SetPlotterSyncEnabled {
  public static readonly type = '[Workbench] Set Plotter Sync Enabled';

  constructor(public value: boolean) { }
}

export class SyncFileTransformations {
  public static readonly type = '[Workbench] Sync File Transformations';

  constructor(public reference: ImageFile, public files: ImageFile[]) { }
}

export class SyncFileNormalizations {
  public static readonly type = '[Workbench] Sync File Normalizations';

  constructor(public reference: ImageFile, public files: ImageFile[]) { }
}

export class SyncFilePlotters {
  public static readonly type = '[Workbench] Sync File Plotters';

  constructor(public reference: ImageFile, public files: ImageFile[]) { }
}

export class SetPlotMode {
  public static readonly type = '[Workbench] Set Plot Mode';

  constructor(public mode: '1D' | '2D' | '3D') { }
}

export class SetActiveTool {
  public static readonly type = '[Workbench] Set Active Tool';

  constructor(public tool: WorkbenchTool) { }
}

export class SetShowAllSources {
  public static readonly type = '[Workbench] Set Show All Sources';

  constructor(public showAllSources: boolean) { }
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

export class UpdatePlotterSettings {
  public static readonly type = '[Workbench] Update Plotter Settings'

  constructor(public changes: Partial<PlotterSettings>) { }
}

export class SetSourceExtractionMode {
  public static readonly type = '[Workbench] Set Source Extraction Mode';

  constructor(public mode: SourceExtractorModeOption) { }
}

export class UpdatePhotSettings {
  public static readonly type = '[Workbench] Update Phot Settings';

  constructor(public changes: Partial<PhotSettings>) { }
}

export class UpdateSourceExtractionSettings {
  public static readonly type = '[Workbench] Update Source Extraction Settings';

  constructor(public changes: Partial<SourceExtractionSettings>) { }
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

export class UpdatePixelOpsFormData {
  public static readonly type = '[Workbench] Update Pixel Ops Form Data';

  constructor(public data: Partial<PixelOpsFormData>) { }
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

export class UpdateAlignFormData {
  public static readonly type = '[Workbench] Update Align Form Data';

  constructor(public data: Partial<AlignFormData>) { }
}

export class CreateAlignmentJob {
  public static readonly type = '[Workbench] Create Alignment Job';
}

export class UpdateStackFormData {
  public static readonly type = '[Workbench] Update Stack Form Data';

  constructor(public data: Partial<StackFormData>) { }
}

export class CreateStackingJob {
  public static readonly type = '[Workbench] Create Stacking Job';
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



