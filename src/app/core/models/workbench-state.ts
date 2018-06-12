import { SidebarView } from "./sidebar-view";
import { ViewMode } from "./view-mode";
import { Viewer } from "./viewer";
import { CentroidSettings } from "./centroid-settings";
import { PhotSettings } from "./phot-settings";
import { SourceExtractionSettings } from "./source-extraction-settings";
import { SourceExtractorModeOption } from "./source-extractor-mode-option";
import { PlotterSettings } from "./plotter-settings";

export enum WorkbenchTool {
  VIEWER,
  PLOTTER,
  SONIFIER,
  SOURCE_EXTRACTOR
}

export interface WorkbenchState {
  multiFileSelectionEnabled: boolean;
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
  photSettings: PhotSettings;
  sourceExtractionSettings: SourceExtractionSettings;
  sourceExtractorModeOption: SourceExtractorModeOption;
  plotterSettings: PlotterSettings;
}