import { SidebarView } from './sidebar-view';
import { ViewMode } from './view-mode';
import { IViewer, Viewer } from './viewer';
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
import { SourcePanelState } from './source-file-state';
import { WcsCalibrationFileState } from './wcs-calibration-file-state';

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
  SOURCE = 'source',
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
  selectedLayerIds: string[];
  primaryLayerIds: string[];
  auxLayerId: string;
  auxLayerIds: string[];
  scalarValue: number;
  kernelFilter: KernelFilter;
  kernelSize: number;
  kernelSigma: number;
  inPlace: boolean;
  opString: string;
}
export interface BatchPhotometryFormData {
  selectedLayerIds: string[];
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

export interface PhotometryPanelConfig {
  showSourceApertures: boolean;
  batchPhotFormData: BatchPhotometryFormData;
  batchCalibrationEnabled: boolean;
  batchPhotJobId: string;
  batchCalJobId: string;
  creatingBatchJobs: boolean;
  autoPhot: boolean;
}

export interface SourcePanelConfig {
  centroidClicks: boolean;
  planetCentroiding: boolean;
  showSourceLabels: boolean;
  showSourceMarkers: boolean;
  showSourcesFromAllFiles: boolean;
  selectedSourceIds: string[];
  coordMode: 'pixel' | 'sky';
}

export interface PixelOpsPanelConfig {
  currentPixelOpsJobId: string;
  showCurrentPixelOpsJobState: boolean;
  pixelOpsFormData: PixelOpsFormData;
}

export interface AligningPanelConfig {
  selectedLayerIds: string[];
  mosaicMode: boolean;
  mosaicSearchRadius: number;
  refLayerId: string;
  currentAlignmentJobId: string;
}

export interface StackingPanelConfig {
  stackFormData: StackFormData;
  currentStackingJobId: string;
}

export interface WcsCalibrationPanelConfig {
  selectedLayerIds: string[];
  activeJobId: string;
  mode: 'platesolve' | 'copy';
  refLayerId: string,
  ra?: number | string;
  dec?: number | string;
  radius?: number;
  minScale?: number;
  maxScale?: number;
  maxSources?: number;
  showOverlay: boolean;
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
  photometryPanelConfig: PhotometryPanelConfig;
  sourcePanelConfig: SourcePanelConfig;
  pixelOpsPanelConfig: PixelOpsPanelConfig;
  aligningPanelConfig: AligningPanelConfig;
  stackingPanelConfig: StackingPanelConfig;
  wcsCalibrationPanelConfig: WcsCalibrationPanelConfig;
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
  nextSonificationPanelStateId: number;
  sonificationPanelStateIds: string[];
  sonificationPanelStateEntities: { [id: string]: SonificationPanelState };
  nextPhotometryPanelStateId: number;
  photometryPanelStateIds: string[];
  photometryPanelStateEntities: { [id: string]: PhotometryPanelState };
  nextSourcePanelStateId: number;
  sourcePanelStateIds: string[];
  sourcePanelStateEntities: { [id: string]: SourcePanelState };
  nextWcsCalibrationPanelStateId: number;
  wcsCalibrationPanelStateIds: string[];
  wcsCalibrationPanelStateEntities: { [id: string]: WcsCalibrationFileState };
}
