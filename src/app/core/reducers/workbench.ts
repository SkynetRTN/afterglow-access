import { createSelector } from '@ngrx/store';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';

import * as dataFileActions from '../../data-files/actions/data-file';
import * as imageFileActions from '../../data-files/actions/image-file';
import * as authActions from '../../auth/actions/auth';
import * as workbenchActions from '../actions/workbench';
import { SidebarView } from '../models/sidebar-view';
import { WorkbenchState } from '../models/workbench-state';
import { ViewMode } from '../models/view-mode';
/**
 * @ngrx/entity provides a predefined interface for handling
 * a structured dictionary of records. This interface
 * includes an array of ids, and a dictionary of the provided
 * model type by id. This interface is extended to include
 * any additional interface properties.
 */


export const initialState: WorkbenchState = {
  multiFileSelectionEnabled: false,
  activeViewerIndex: 0,
  viewMode: ViewMode.SINGLE,
  viewers: [
    {
      fileId: null,
      panEnabled: true,
      zoomEnabled: true
    },
    {
      fileId: null,
      panEnabled: true,
      zoomEnabled: true
    },
  ],
  viewerSyncAvailable: false,
  viewerSyncEnabled: false,
  sidebarView: SidebarView.FILES,
  showSidebar: true,
  showConfig: true,
  
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
      if(state.activeViewerIndex == action.payload.viewerIndex) return state;
      
      return {
        ...state,
        activeViewerIndex: action.payload.viewerIndex
      }
    }

    case workbenchActions.SET_VIEW_MODE: {

      let activeViewerIndex = state.activeViewerIndex;
      if(action.payload.viewMode == ViewMode.SINGLE) {
        activeViewerIndex = 0;
      } 
      else {
        activeViewerIndex = 1;
      }

      return {
        ...state,
        viewMode: action.payload.viewMode,
        activeViewerIndex: activeViewerIndex
      }
    }

    case workbenchActions.SET_VIEWER_FILE: {
      let viewers = [...state.viewers];
      let viewer = {...viewers[action.payload.viewerIndex]};
      if(action.payload.file == null) {
        viewer.fileId = null;
      }
      else {
        viewer.fileId = action.payload.file.id;
      }
      viewers[action.payload.viewerIndex] = viewer;

      return {
        ...state,
        viewers: viewers,
      }

    }

    case workbenchActions.SET_VIEWER_SYNC_AVAILABLE: {
      let isAvailable = action.payload.available;
      return {
        ...state,
        viewerSyncAvailable: isAvailable,
      }
    }

    case workbenchActions.SET_VIEWER_SYNC_ENABLED: {
      let enabled = action.payload.enabled;
      if(!state.viewerSyncAvailable && enabled) return state;

      return {
        ...state,
        viewerSyncEnabled: enabled ? state.viewerSyncAvailable : false
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
export const getViewers = (state: WorkbenchState) => state.viewers;
export const getViewMode = (state: WorkbenchState) => state.viewMode;