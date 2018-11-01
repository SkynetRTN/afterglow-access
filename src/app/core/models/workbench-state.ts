import { SidebarView } from "./sidebar-view";
import { ViewMode } from "./view-mode";
import { Viewer } from "./viewer";
import { CentroidSettings } from "./centroid-settings";
import { SourceExtractorModeOption } from "./source-extractor-mode-option";
import { PlotterSettings } from "./plotter-settings";
import { SourceExtractionSettings } from "../../jobs/models/source-extraction";
import { PhotSettings } from "../../jobs/models/photometry";
import { DataFile } from "../../data-files/models/data-file";

export enum WorkbenchTool {
  VIEWER,
  PLOTTER,
  SONIFIER,
  SOURCE_EXTRACTOR,
  CUSTOM_MARKER,
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
}