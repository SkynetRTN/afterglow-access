import { createSelector } from '@ngrx/store';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';

import * as dataFileActions from '../../data-files/actions/data-file';
import * as imageFileActions from '../../data-files/actions/image-file';
import * as authActions from '../../auth/actions/auth';
import * as workbenchActions from '../actions/workbench';
import { SidebarView } from '../models/sidebar-view';
/**
 * @ngrx/entity provides a predefined interface for handling
 * a structured dictionary of records. This interface
 * includes an array of ids, and a dictionary of the provided
 * model type by id. This interface is extended to include
 * any additional interface properties.
 */
export interface State {
  selectedDataFileId: string | null;
  sidebarView: SidebarView;
  showSidebar: boolean;
  showConfig: boolean;
}


export const initialState: State = {
  selectedDataFileId: null,
  sidebarView: SidebarView.FILES,
  showSidebar: true,
  showConfig: true,
};

export function reducer(
  state = initialState,
  action: workbenchActions.Actions | dataFileActions.Actions | imageFileActions.Actions | authActions.Actions
): State {
  switch (action.type) {
    case authActions.LOGOUT: {
      return {
        ...initialState
      }
    }

    case workbenchActions.SELECT_DATA_FILE: {
      return {
        ...state,
        selectedDataFileId: action.payload
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

export const getSelectedId = (state: State) => state.selectedDataFileId;