import { SidebarView } from './sidebar-view';
import { ViewMode } from './view-mode';
import { IViewer } from './viewer';
import { CentroidSettings } from './centroid-settings';
import { PhotometrySettings } from './photometry-settings';
import { SourceExtractionSettings } from './source-extraction-settings';
import { FileInfoPanelConfig } from './file-info-panel';
import { PlottingPanelState } from './plotter-file-state';
import { CustomMarkerPanelState } from './marker-file-state';
import { SonificationPanelState } from './sonifier-file-state';
import { PhotometryPanelState } from './photometry-file-state';
import { IWorkbenchState } from './workbench-file-state';
import { Catalog } from 'src/app/jobs/models/catalog-query';
import { FieldCalibration } from 'src/app/jobs/models/field-calibration';
import { GlobalSettings } from './global-settings';

export enum KernelFilter {
  MEDIAN_FILTER = 'median_filter',
  MAXIMUM_FILTER = 'maximum_filter',
  MINIMUM_FILTER = 'minimum_filter',
  UNIFORM_FILTER = 'uniform_filter',
  GREY_CLOSING = 'grey_closing',
  GREY_DILATION = 'grey_dilation',
  GREY_EROSION = 'grey_erosion',
  GREY_OPENING = 'grey_opening',
  MORPHOLOGICAL_GRADIENT = 'morphological_gradient',
  MORPHOLOGICAL_LAPLACE = 'morphological_laplace',
  BLACK_TOPHAT = 'black_tophat',
  WHITE_TOPHAT = 'white_tophat',
  GAUSSIAN_FILTER = 'gaussian_filter',
  GAUSSIAN_GRADIENT_MAGNITUDE = 'gaussian_gradient_magnitude',
  GAUSSIAN_LAPLACE = 'gaussian_laplace',
  LAPLACE = 'laplace',
  PREWITT = 'prewitt',
  SOBEL = 'sobel'
}

export const NO_ARG_KERNELS = [KernelFilter.LAPLACE, KernelFilter.PREWITT, KernelFilter.SOBEL]
export const SIZE_KERNELS = [KernelFilter.MEDIAN_FILTER, KernelFilter.MAXIMUM_FILTER, KernelFilter.MINIMUM_FILTER, KernelFilter.UNIFORM_FILTER,
KernelFilter.GREY_CLOSING, KernelFilter.GREY_DILATION, KernelFilter.GREY_EROSION, KernelFilter.GREY_OPENING, KernelFilter.MORPHOLOGICAL_GRADIENT, KernelFilter.MORPHOLOGICAL_LAPLACE,
KernelFilter.BLACK_TOPHAT, KernelFilter.WHITE_TOPHAT]
export const SIGMA_KERNELS = [KernelFilter.GAUSSIAN_FILTER, KernelFilter.GAUSSIAN_GRADIENT_MAGNITUDE, KernelFilter.GAUSSIAN_LAPLACE]

export enum WorkbenchTool {
  VIEWER = 'display',
  PLOTTER = 'plotter',
  SONIFIER = 'sonifier',
  PHOTOMETRY = 'photometry',
  CUSTOM_MARKER = 'marker',
  INFO = 'info',
  FIELD_CAL = 'field-cal',
  PIXEL_OPS = 'pixel-operations',
  STACKER = 'stacker',
  ALIGNER = 'aligner',
  WCS_CALIBRATION = 'wcs-calibration',
}

export interface PixelOpsFormData {
  operand: '+' | '-' | '/' | '*';
  mode: 'scalar' | 'image' | 'kernel';
  selectedHduIds: string[];
  primaryHduIds: string[];
  auxHduId: string;
  auxHduIds: string[];
  scalarValue: number;
  kernelFilter: KernelFilter;
  kernelSize: number;
  kernelSigma: number;
  inPlace: boolean;
  opString: string;
}

export interface AlignFormData {
  selectedHduIds: string[];
  refHduId: string;
  mode: 'astrometric' | 'manual_source';
  crop: boolean;
}

export interface BatchPhotometryFormData {
  selectedHduIds: string[];
}

export interface StackFormData {
  selectedHduIds: string[];
  mode: 'average' | 'percentile' | 'mode' | 'sum';
  scaling: 'none' | 'average' | 'median' | 'mode';
  rejection: 'none' | 'chauvenet' | 'iraf' | 'minmax' | 'sigclip';
  percentile?: number;
  low?: number;
  high?: number;
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

export interface PhotometryPanelConfig {
  centroidClicks: boolean;
  showSourceLabels: boolean;
  showSourceMarkers: boolean;
  showSourceApertures: boolean;
  showSourcesFromAllFiles: boolean;
  selectedSourceIds: string[];
  coordMode: 'pixel' | 'sky';
  batchPhotFormData: BatchPhotometryFormData;
  autoPhot: boolean;
  batchPhotJobId: string;
  batchCalJobId: string;
  batchCalEnabled: boolean;
}

export interface PixelOpsPanelConfig {
  currentPixelOpsJobId: string;
  showCurrentPixelOpsJobState: boolean;
  pixelOpsFormData: PixelOpsFormData;
}

export interface AligningPanelConfig {
  alignFormData: AlignFormData;
  currentAlignmentJobId: string;
}

export interface StackingPanelConfig {
  stackFormData: StackFormData;
  currentStackingJobId: string;
}

export interface WcsCalibrationPanelState {
  selectedHduIds: string[];
  activeJobId: string;
}

export interface WcsCalibrationSettings {
  ra?: number | string;
  dec?: number | string;
  radius?: number;
  minScale?: number;
  maxScale?: number;
  maxSources?: number;
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
  viewers: { [id: string]: IViewer };
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
  photometryPanelConfig: PhotometryPanelConfig;
  pixelOpsPanelConfig: PixelOpsPanelConfig;
  aligningPanelConfig: AligningPanelConfig;
  stackingPanelConfig: StackingPanelConfig;
  wcsCalibrationPanelState: WcsCalibrationPanelState;
  wcsCalibrationSettings: WcsCalibrationSettings;
  fileIdToWorkbenchStateIdMap: { [id: string]: string };
  hduIdToWorkbenchStateIdMap: { [id: string]: string };
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
  nextSonificationPanelStateId: number;
  sonificationPanelStateIds: string[];
  sonificationPanelStateEntities: { [id: string]: SonificationPanelState };
  nextPhotometryPanelStateId: number;
  photometryPanelStateIds: string[];
  photometryPanelStateEntities: { [id: string]: PhotometryPanelState };
}
