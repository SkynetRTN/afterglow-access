import { SidebarView } from "./sidebar-view";
import { ViewMode } from "./view-mode";
import { Viewer } from "./viewer";
import { CentroidSettings } from "./centroid-settings";
import { Catalog } from "./catalog";
import { FieldCal } from "./field-cal";
import { PhotometrySettings } from "./photometry-settings";
import { SourceExtractionSettings } from "./source-extraction-settings";
import { FileInfoPanelConfig } from "./file-info-panel";
import { WorkbenchFileState, IWorkbenchHduState } from "./workbench-file-state";
import { PlottingPanelState } from "./plotter-file-state";
import { CustomMarkerPanelState } from "./marker-file-state";
import { SonificationPanelState } from "./sonifier-file-state";
import { PhotometryPanelState } from "./photometry-file-state";

export enum WorkbenchTool {
  VIEWER = "display",
  PLOTTER = "plotter",
  SONIFIER = "sonfiier",
  PHOTOMETRY = "photometry",
  CUSTOM_MARKER = "marker",
  INFO = "info",
  FIELD_CAL = "field-cal",
  IMAGE_CALC = "image-calculator",
  STACKER = "stacker",
  ALIGNER = "aligner",
  WCS_CALIBRATION = "wcs-calibration"
}

export interface PixelOpsFormData {
  operand: "+" | "-" | "/" | "*";
  mode: "scalar" | "image";
  primaryHduIds: string[];
  auxHduId: string;
  auxHduIds: string[];
  scalarValue: number;
  inPlace: boolean;
  opString: string;
}

export interface AlignFormData {
  selectedHduIds: string[];
  refHduId: string;
  mode: "astrometric" | "manual_source";
  crop: boolean;
}

export interface BatchPhotometryFormData {
  selectedHduIds: string[];
}

export interface StackFormData {
  selectedHduIds: string[];
  mode: "average" | "percentile" | "mode" | "sum";
  scaling: "none" | "average" | "median" | "mode";
  rejection: "none" | "chauvenet" | "iraf" | "minmax" | "sigclip";
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
  plotMode: "1D" | "2D" | "3D";
}

export interface PhotometryPanelConfig {
  centroidClicks: boolean;
  showSourceLabels: boolean;
  showSourcesFromAllFiles: boolean;
  selectedSourceIds: string[];
  coordMode: "pixel" | "sky";
  batchPhotFormData: BatchPhotometryFormData;
  autoPhot: boolean;
  batchPhotProgress: number;
  batchPhotJobId: string;
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
  ra: number;
  dec: number;
  radius: number;
  minScale: number;
  maxScale: number;
  maxSources: number;
}

export interface ViewerPanelContainer {
  id: string;
  type: "container";
  direction: "row" | "row-reverse" | "column" | "column-reverse";
  itemIds: Array<string>;
}

export interface ViewerPanel {
  id: string;
  type: "panel";
  viewerIds: string[];
  selectedViewerId: string;
}

export type ViewerLayoutItem = ViewerPanelContainer | ViewerPanel;

export interface WorkbenchStateModel {
  version: string;
  showSideNav: boolean;
  inFullScreenMode: boolean;
  sidebarView: SidebarView;
  showSidebar: boolean;
  showConfig: boolean;
  fullScreenPanel: "file" | "viewer" | "tool";
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
  viewerSyncMode: "sky" | "pixel";
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
  photometryPanelConfig: PhotometryPanelConfig;
  pixelOpsPanelConfig: PixelOpsPanelConfig;
  aligningPanelConfig: AligningPanelConfig;
  stackingPanelConfig: StackingPanelConfig;
  wcsCalibrationPanelState: WcsCalibrationPanelState;
  wcsCalibrationSettings: WcsCalibrationSettings
  fileIds: string[];
  fileStateEntities: { [id: string]: WorkbenchFileState };
  hduIds: string[];
  hduStateEntities: { [id: string]: IWorkbenchHduState };
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
