import { SidebarView } from "./sidebar-view";
import { ViewMode } from "./view-mode";
import { Viewer } from "./viewer";
import { CentroidSettings } from "./centroid-settings";
import { Catalog } from "./catalog";
import { FieldCal } from './field-cal';
import { PhotometrySettings } from './photometry-settings';
import { SourceExtractionSettings } from './source-extraction-settings';
import { FileInfoPanelConfig } from './file-info-panel';

export enum WorkbenchTool {
  VIEWER = 'display',
  PLOTTER = 'plotter',
  SONIFIER = 'sonfiier',
  PHOTOMETRY = 'photometry',
  CUSTOM_MARKER = 'marker',
  INFO = 'info',
  FIELD_CAL = 'field-cal',
  IMAGE_CALC = 'image-calculator',
  STACKER = 'stacker',
  ALIGNER = 'aligner'
}

export interface PixelOpsFormData {
  operand: '+' | '-' | '/' | '*',
  mode: 'scalar' | 'image',
  imageFileIds: string[],
  auxImageFileId: string,
  auxImageFileIds: string[],
  scalarValue: number,
  inPlace: boolean
  opString: string
}

export interface AlignFormData {
  selectedImageFileIds: string[],
  mode: 'astrometric' | 'manual_source',
  inPlace: boolean
}

export interface BatchPhotometryFormData {
  selectedImageFileIds: string[];
}

export interface StackFormData {
  selectedImageFileIds: string[];
  mode: 'average' | 'percentile' | 'mode' | 'sum';
  scaling: 'none' | 'average' | 'median' | 'mode';
  rejection: 'none' | 'chauvenet' | 'iraf' | 'minmax' | 'sigclip';
  percentile?: number;
  low?: number;
  high?: number;
}

export interface CustomMarkerPanelConfig {
  centroidClicks: boolean,
  usePlanetCentroiding: boolean,
}

export interface PlottingPanelConfig {
  interpolatePixels: boolean,
  centroidClicks: boolean,
  planetCentroiding: boolean,
  plotterSyncEnabled: boolean;
  plotterMode: '1D' | '2D' | '3D';
}

export interface PhotometryPanelConfig {
  centroidClicks: boolean,
  showSourceLabels: boolean;
  showSourcesFromAllFiles: boolean;
  selectedSourceIds: string[];
  coordMode: 'pixel' | 'sky';
  batchPhotFormData: BatchPhotometryFormData;
  autoPhot: boolean;
  batchPhotProgress: number;
  batchPhotJobId: string;
}

export interface PixelOpsPageSettings {
  currentPixelOpsJobId: string;
  showCurrentPixelOpsJobState: boolean;
  pixelOpsFormData: PixelOpsFormData;
}

export interface AligningPageSettings {
  alignFormData: AlignFormData;
  currentAlignmentJobId: string;
}

export interface StackingPageSettings {
  stackFormData: StackFormData;
  currentStackingJobId: string;
}

export interface WorkbenchStateModel {
  version: number,
  showSideNav: boolean,
  inFullScreenMode: boolean,
  sidebarView: SidebarView
  showSidebar: boolean;
  showConfig: boolean;
  fullScreenPanel: 'file' | 'viewer' | 'tool';
  // selectedFileId: string;
  
  activeTool: WorkbenchTool;
  viewMode: ViewMode;
  nextViewerIdSeed: number;
  viewerIds: string[];
  viewers: {[id:string]: Viewer};
  primaryViewerHasFocus: boolean;
  primaryViewerIds: string[];
  selectedPrimaryViewerId: string;
  secondaryViewerIds: string[];
  selectedSecondaryViewerId: string;
  viewerSyncEnabled: boolean;
  normalizationSyncEnabled: boolean;
  
  centroidSettings: CentroidSettings;
  sourceExtractionSettings: SourceExtractionSettings;
  photometrySettings: PhotometrySettings;
  
  catalogs: Array<Catalog>;
  selectedCatalogId: string;
  fieldCals: Array<FieldCal>;
  selectedFieldCalId: string;
  creatingAddFieldCalSourcesFromCatalogJob: boolean;
  addFieldCalSourcesFromCatalogJobId: string;
  addFieldCalSourcesFromCatalogFieldCalId: string;
  dssImportLoading: boolean;

  fileInfoPanelConfig: FileInfoPanelConfig;
  customMarkerPanelConfig: CustomMarkerPanelConfig;
  plottingPanelConfig: PlottingPanelConfig;
  photometryPageSettings: PhotometryPanelConfig;
  pixelOpsPageSettings: PixelOpsPageSettings;
  aligningPageSettings: AligningPageSettings;
  stackingPageSettings: StackingPageSettings;
}