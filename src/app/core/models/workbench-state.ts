import { SidebarView } from "./sidebar-view";
import { ViewMode } from "./view-mode";
import { Viewer } from "./viewer";
import { CentroidSettings } from "./centroid-settings";
import { SourceExtractorModeOption } from "./source-extractor-mode-option";
import { PlotterSettings } from "./plotter-settings";
import { SourceExtractionSettings } from "../../jobs/models/source-extraction";
import { PhotSettings } from "../../jobs/models/photometry";
import { DataFile } from "../../data-files/models/data-file";
import { Catalog } from "./catalog";
import { FieldCal } from './field-cal';

export enum WorkbenchTool {
  VIEWER,
  PLOTTER,
  SONIFIER,
  SOURCE_EXTRACTOR,
  CUSTOM_MARKER,
  INFO,
  FIELD_CAL,
  IMAGE_CALC
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

export interface StackFormData {
  selectedImageFileIds: string[];
  mode: 'average' | 'percentile' | 'mode' | 'sum';
  scaling: 'none' | 'average' | 'median' | 'mode';
  rejection: 'none' | 'chauvenet' | 'iraf' | 'minmax' | 'sigclip';
  percentile?: number;
  low?: number;
  high?: number;
}

export interface WorkbenchState {
  multiFileSelectionEnabled: boolean;
  selectedFileIds: Array<string>;
  activeViewerIndex: number;
  activeTool: WorkbenchTool;
  viewMode: ViewMode;
  viewers: Viewer[];
  viewerSyncEnabled: boolean;
  normalizationSyncEnabled: boolean;
  plotterSyncEnabled: boolean;
  sidebarView: SidebarView
  showSidebar: boolean;
  showConfig: boolean;
  showAllSources: boolean;
  centroidSettings: CentroidSettings;
  photSettings: PhotSettings
  sourceExtractionSettings: SourceExtractionSettings;
  sourceExtractorModeOption: SourceExtractorModeOption;
  plotterSettings: PlotterSettings;
  catalogs: Array<Catalog>;
  selectedCatalogId: string;
  fieldCals: Array<FieldCal>;
  selectedFieldCalId: string;
  creatingAddFieldCalSourcesFromCatalogJob: boolean;
  addFieldCalSourcesFromCatalogJobId: string;
  addFieldCalSourcesFromCatalogFieldCalId: string;
  currentPixelOpsJobId: string;
  showCurrentPixelOpsJobState: boolean;
  pixelOpsFormData: PixelOpsFormData;
  alignFormData: AlignFormData;
  currentAlignmentJobId: string;
  stackFormData: StackFormData;
  currentStackingJobId: string;
}