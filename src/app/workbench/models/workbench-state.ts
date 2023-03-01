import { SidebarView } from './sidebar-view';
import { ViewMode } from './view-mode';
import { IViewer, Viewer } from './viewer';
import { CentroidSettings } from './centroid-settings';
import { PhotometrySettings } from './photometry-settings';
import { SourceExtractionSettings } from './source-extraction-settings';
import { FileInfoPanelConfig } from './file-info-panel';
import { PlottingPanelState } from './plotter-file-state';
import { CustomMarkerPanelState } from './marker-file-state';
import { SonificationPanelState } from '../tools/sonification/models/sonifier-file-state';
import { IWorkbenchState } from './workbench-file-state';
import { Catalog } from 'src/app/jobs/models/catalog-query';
import { FieldCalibration } from 'src/app/jobs/models/field-calibration';
import { GlobalSettings } from './global-settings';

export enum WorkbenchTool {
  VIEWER = 'display',
  PLOTTER = 'plotter',
  SONIFIER = 'sonifier',
  SOURCE = 'source',
  PHOTOMETRY = 'photometry',
  CUSTOM_MARKER = 'marker',
  INFO = 'info',
  FIELD_CAL = 'field-cal',
  PIXEL_OPS = 'pixel-operations',
  STACKER = 'stacker',
  ALIGNER = 'aligner',
  WCS_CALIBRATION = 'wcs-calibration',
  COSMETIC_CORRECTION = 'cosmetic_correction'
}


export interface StackFormData {
  selectedLayerIds: string[];
  propagateMask: boolean;
  mode: 'average' | 'percentile' | 'mode' | 'sum';
  scaling: 'none' | 'average' | 'median' | 'mode';
  rejection: 'none' | 'chauvenet' | 'iraf' | 'minmax' | 'sigclip' | 'rcr';
  smartStacking: 'none' | 'SNR';
  percentile?: number;
  low?: number;
  high?: number;
  equalizeAdditive: boolean;
  equalizeOrder: number;
  equalizeMultiplicative: boolean;
  multiplicativePercentile: number;
  equalizeGlobal: boolean;
}

export interface CustomMarkerPanelConfig {
  centroidClicks: boolean;
  usePlanetCentroiding: boolean;
}

export interface PlottingPanelConfig {
  interpolatePixels: boolean;
  centroidClicks: boolean;
  planetCentroiding: boolean;
  plotterSyncEnabled: boolean;
  plotMode: '1D' | '2D' | '3D';
}








export interface ViewerPanelContainer {
  id: string;
  type: 'container';
  direction: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  itemIds: Array<string>;
}

export interface ViewerPanel {
  id: string;
  type: 'panel';
  viewerIds: string[];
  selectedViewerId: string;
}

export type ViewerLayoutItem = ViewerPanelContainer | ViewerPanel;

export interface WorkbenchStateModel {
  version: string;
  settings: GlobalSettings;
  showSideNav: boolean;
  inFullScreenMode: boolean;
  sidebarView: SidebarView;
  showSidebar: boolean;
  showConfig: boolean;
  fullScreenPanel: 'file' | 'viewer' | 'tool';
  activeTool: WorkbenchTool;
  viewMode: ViewMode;
  rootViewerPanelContainerId: string;
  nextViewerIdSeed: number;
  nextViewerPanelIdSeed: number;
  nextViewerPanelContainerIdSeed: number;
  viewerIds: string[];
  viewers: { [id: string]: Viewer };
  viewerLayoutItems: { [id: string]: ViewerLayoutItem };
  viewerLayoutItemIds: string[];
  focusedViewerPanelId: string;
  selectedFileIds: string[];
  fileListFilter: string;
  viewerSyncEnabled: boolean;
  viewerSyncMode: 'sky' | 'pixel';
  normalizationSyncEnabled: boolean;
  catalogs: Array<Catalog>;
  selectedCatalogId: string;
  fieldCals: Array<FieldCalibration>;
  selectedFieldCalId: string;
  creatingAddFieldCalSourcesFromCatalogJob: boolean;
  addFieldCalSourcesFromCatalogJobId: string;
  addFieldCalSourcesFromCatalogFieldCalId: string;
  dssImportLoading: boolean;

  fileInfoPanelConfig: FileInfoPanelConfig;
  customMarkerPanelConfig: CustomMarkerPanelConfig;
  plottingPanelConfig: PlottingPanelConfig;
  fileIdToWorkbenchStateIdMap: { [id: string]: string };
  layerIdToWorkbenchStateIdMap: { [id: string]: string };
  nextWorkbenchStateId: number;
  workbenchStateIds: string[];
  workbenchStateEntities: { [id: string]: IWorkbenchState };
  nextMarkerId: number;
  nextCustomMarkerPanelStateId: number;
  customMarkerPanelStateIds: string[];
  customMarkerPanelStateEntities: { [id: string]: CustomMarkerPanelState };
  nextPlottingPanelStateId: number;
  plottingPanelStateIds: string[];
  plottingPanelStateEntities: { [id: string]: PlottingPanelState };
}
