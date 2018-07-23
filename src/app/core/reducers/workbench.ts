import { createSelector } from '@ngrx/store';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';

import * as dataFileActions from '../../data-files/actions/data-file';
import * as imageFileActions from '../../data-files/actions/image-file';
import * as authActions from '../../auth/actions/auth';
import * as workbenchActions from '../actions/workbench';
import { SidebarView } from '../models/sidebar-view';
import { WorkbenchState, WorkbenchTool } from '../models/workbench-state';
import { ViewMode } from '../models/view-mode';
import { createPsfCentroiderSettings, createDiskCentroiderSettings } from '../models/centroider';
import { SourceExtractorModeOption } from '../models/source-extractor-mode-option';
/**
 * @ngrx/entity provides a predefined interface for handling
 * a structured dictionary of records. This interface
 * includes an array of ids, and a dictionary of the provided
 * model type by id. This interface is extended to include
 * any additional interface properties.
 */


export const initialState: WorkbenchState = {
  multiFileSelectionEnabled: false,
  selectedFileIds: [],
  activeViewerIndex: 0,
  activeTool: WorkbenchTool.VIEWER,
  viewMode: ViewMode.SINGLE,
  viewers: [
    {
      fileId: null,
      pendingFileId: null,
      panEnabled: true,
      zoomEnabled: true
    },
    {
      fileId: null,
      pendingFileId: null,
      panEnabled: true,
      zoomEnabled: true
    },
  ],
  viewerSyncEnabled: false,
  normalizationSyncEnabled: false,
  plotterSyncEnabled: false,
  sidebarView: SidebarView.FILES,
  showSidebar: true,
  showConfig: true,
  showAllSources: true,
  centroidSettings: {
    centroidClicks: true,
    useDiskCentroiding: false,
    psfCentroiderSettings: createPsfCentroiderSettings(),
    diskCentroiderSettings: createDiskCentroiderSettings()
  },
  photSettings: {
    centroid_radius: 4,
    a: 5,
    a_in: 10,
    a_out: 15
  },
  sourceExtractionSettings: {
    threshold: 3,
    fwhm: 0,
    deblend: false,
    limit: 200,
  },
  sourceExtractorModeOption: SourceExtractorModeOption.MOUSE,
  plotterSettings: {
    interpolatePixels: false
  }
};

export function reducer(
  state = initialState,
  action: workbenchActions.Actions | dataFileActions.Actions | imageFileActions.Actions | authActions.Actions
): WorkbenchState {
  switch (action.type) {
    case authActions.LOGOUT: {
      return {
        ...initialState
      }
    }

    case workbenchActions.ENABLE_MULTI_FILE_SELECTION: {
      return {
        ...state,
        multiFileSelectionEnabled: true
      }
    }

    case workbenchActions.DISABLE_MULTI_FILE_SELECTION: {
      return {
        ...state,
        multiFileSelectionEnabled: false
      }
    }

    case workbenchActions.SET_MULTI_FILE_SELECTION: {
      return {
        ...state,
        selectedFileIds: action.payload.files.map(file => file.id)
      }
    }

    case workbenchActions.SET_SIDEBAR_VIEW: {
      let showSidebar = true;
      if (action.payload.sidebarView == state.sidebarView) {
        showSidebar = !state.showSidebar;
      }

      return {
        ...state,
        showSidebar: showSidebar,
        sidebarView: action.payload.sidebarView
      }
    }

    case workbenchActions.SET_ACTIVE_VIEWER: {
      if (state.activeViewerIndex == action.payload.viewerIndex) return state;

      return {
        ...state,
        activeViewerIndex: action.payload.viewerIndex
      }
    }

    case workbenchActions.SET_VIEW_MODE: {

      let activeViewerIndex = state.activeViewerIndex;
      if (action.payload.viewMode == ViewMode.SINGLE) {
        activeViewerIndex = 0;
      }
      // else {
      //   activeViewerIndex = 1;
      // }

      return {
        ...state,
        viewMode: action.payload.viewMode,
        activeViewerIndex: activeViewerIndex
      }
    }

    case workbenchActions.SET_VIEWER_FILE: {
      let viewers = [...state.viewers];
      let viewer = { ...viewers[action.payload.viewerIndex] };
      viewer.pendingFileId = action.payload.file.id;
      viewers[action.payload.viewerIndex] = viewer;

      return {
        ...state,
        viewers: viewers,
      }

    }

    case workbenchActions.SET_VIEWER_FILE_SUCCESS: {
      let viewers = [...state.viewers];
      let viewer = { ...viewers[action.payload.viewerIndex] };
      viewer.fileId = viewer.pendingFileId;
      viewer.pendingFileId = null;
      viewers[action.payload.viewerIndex] = viewer;

      return {
        ...state,
        viewers: viewers,
      }

    }

    case workbenchActions.SET_VIEWER_SYNC_ENABLED: {
      return {
        ...state,
        viewerSyncEnabled: action.payload.enabled
      }
    }

    case workbenchActions.SET_NORMALIZATION_SYNC_ENABLED: {
      return {
        ...state,
        normalizationSyncEnabled: action.payload.enabled
      }
    }

    case workbenchActions.SET_PLOTTER_SYNC_ENABLED: {
      return {
        ...state,
        plotterSyncEnabled: action.payload.enabled
      }
    }

    case workbenchActions.SET_SHOW_CONFIG: {
      return {
        ...state,
        showConfig: action.payload.showConfig
      }
    }

    case workbenchActions.TOGGLE_SHOW_CONFIG: {
      return {
        ...state,
        showConfig: !state.showConfig
      }
    }


    case workbenchActions.SET_ACTIVE_TOOL: {
      if (state.activeTool == action.payload.tool) return state;

      return {
        ...state,
        activeTool: action.payload.tool
      }
    }

    case workbenchActions.SET_SHOW_ALL_SOURCES: {
      if (state.showAllSources == action.payload.showAllSources) return state;

      return {
        ...state,
        showAllSources: action.payload.showAllSources
      }
    }

    case workbenchActions.UPDATE_CENTROID_SETTINGS: {
      let centroidSettings = {
        ...state.centroidSettings,
        ...action.payload.changes
      }

      return {
        ...state,
        centroidSettings: centroidSettings
      }

    }

    case workbenchActions.UPDATE_PLOTTER_SETTINGS: {
      let plotterSettings = {
        ...state.plotterSettings,
        ...action.payload.changes
      }

      return {
        ...state,
        plotterSettings: plotterSettings
      }

    }

    case workbenchActions.SET_SOURCE_EXTRACTION_MODE: {
      return {
        ...state,
        sourceExtractorModeOption: action.payload.mode
      }
    }

    case workbenchActions.UPDATE_PHOT_SETTINGS: {
      return {
        ...state,
        photSettings: {
          ...state.photSettings,
          ...action.payload.changes
        }
      }
    }

    case workbenchActions.UPDATE_SOURCE_EXTRACTION_SETTINGS: {
      return {
        ...state,
        sourceExtractionSettings: {
          ...state.sourceExtractionSettings,
          ...action.payload.changes
        }
      }
    }





    /**
     * Markers
     */

    // case workbenchActions.ADD_MARKER: {
    //   if(state.entities[action.payload.file.id].type == DataFileType.IMAGE) {
    //     let imageFile = state.entities[action.payload.file.id] as ImageFile;
    //     let marker = Object.assign({}, action.payload.marker);
    //     marker.id = (MARKER_ID++).toString();
    //     let markerEntities = {
    //       ...imageFile.markerEntities,
    //       marker
    //     };

    //     let markerIds = [...imageFile.markerIds, marker.id];

    //     return {
    //       ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
    //         markerEntities: markerEntities,
    //         markerIds: markerIds
    //       }}, state),
    //     }
    //   }
    //   return state;
    // }

    // case workbenchActions.REMOVE_MARKER: {
    //   if(state.entities[action.payload.fileId].type == DataFileType.IMAGE) {
    //     let imageFile = state.entities[action.payload.fileId] as ImageFile;

    //     if(!(action.payload.markerId in imageFile.markerEntities)) return state;

    //     let markerEntities = {...imageFile.markerEntities};
    //     delete markerEntities[action.payload.markerId];

    //     let markerIds = [...imageFile.markerIds];
    //     markerIds.splice(markerIds.indexOf(action.payload.markerId), 1);

    //     return {
    //       ...adapter.updateOne({'id': action.payload.fileId, 'changes': {
    //         markerEntities: markerEntities,
    //         markerIds: markerIds
    //       }}, state),
    //     }
    //   }
    //   return state;
    // }

    // case workbenchActions.UPDATE_MARKER: {
    //   if(state.entities[action.payload.fileId].type == DataFileType.IMAGE) {
    //     let imageFile = state.entities[action.payload.fileId] as ImageFile;

    //     if(!(action.payload.markerId in imageFile.markerEntities)) return state;
    //     let marker = Object.assign({}, imageFile.markerEntities[action.payload.markerId]);
    //     marker = Object.assign(marker, action.payload.changes);
    //     let markerEntities = {...imageFile.markerEntities};
    //     markerEntities[action.payload.markerId] = marker;

    //     let markerIds = [...imageFile.markerIds];

    //     return {
    //       ...adapter.updateOne({'id': action.payload.fileId, 'changes': {
    //         markerEntities: markerEntities,
    //         markerIds: markerIds,
    //       }}, state),
    //     }
    //   }
    //   return state;
    // }
    default: {
      return state;
    }
  }
}

export const getActiveViewerIndex = (state: WorkbenchState) => state.activeViewerIndex;
export const getSelectedFileIds = (state: WorkbenchState) => state.selectedFileIds;
export const getViewers = (state: WorkbenchState) => state.viewers;
export const getViewMode = (state: WorkbenchState) => state.viewMode;
export const getActiveTool = (state: WorkbenchState) => state.activeTool;