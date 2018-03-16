import { SidebarView } from "./sidebar-view";
import { ViewMode } from "./view-mode";
import { Viewer } from "./viewer";

export interface WorkbenchState {
  multiFileSelectionEnabled: boolean;
  activeViewerIndex: number;
  viewMode: ViewMode;
  viewers: Viewer[];
  viewerSyncAvailable: boolean;
  viewerSyncEnabled: boolean;
  sidebarView: SidebarView
  showSidebar: boolean;
  showConfig: boolean;
  
}