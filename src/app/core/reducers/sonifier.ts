import { createSelector} from '@ngrx/store';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';

import { SonifierFileState, SonifierRegionOption } from '../models/sonifier-file-state';
import { SourceExtractorModeOption } from '../models/source-extractor-mode-option';
import { DataFileType } from '../../data-files/models/data-file-type';
import { CentroidSettings } from '../models/centroid-settings'
import { DataFile, ImageFile, getYTileDim, getXTileDim, getHeight, getWidth} from '../../data-files/models/data-file';
import { centroidDisk, centroidPsf } from '../models/centroider';

import * as sonifierActions from '../actions/sonifier';
import * as dataFileActions from '../../data-files/actions/data-file';
import * as authActions from '../../auth/actions/auth';
import * as imageFileActions from '../../data-files/actions/image-file';


export interface State extends EntityState<SonifierFileState> {
  viewport: {imageX: number, imageY: number, imageWidth: number, imageHeight: number, viewportWidth: number, viewportHeight: number};
}

export const adapter: EntityAdapter<SonifierFileState> = createEntityAdapter<SonifierFileState>({
  selectId: (sonifierState: SonifierFileState) => sonifierState.fileId,
  sortComparer: false,
});

/** getInitialState returns the default initial state
 * for the generated entity state. Initial state
 * additional properties can also be defined.
*/
export const initialState: State = adapter.getInitialState({
  viewport: null
});

export function reducer(
  state = initialState,
  action: sonifierActions.Actions | dataFileActions.Actions | imageFileActions.Actions | authActions.Actions
): State {
  switch (action.type) {

    case authActions.LOGOUT: {
      return {
        ...adapter.removeAll(initialState)
      }
    }

    case dataFileActions.LOAD_LIBRARY_SUCCESS: {
      let sonifierStates: SonifierFileState[] = [];
      action.payload.filter(dataFile => dataFile.type == DataFileType.IMAGE).map(dataFile => {
        sonifierStates.push({
          fileId: dataFile.id,
          sonificationUri: null,
          region: null,
          regionHistory: [],
          regionHistoryIndex: null,
          regionHistoryInitialized: false,
          regionOption: SonifierRegionOption.VIEWPORT,
          viewportSync: true,
          duration: 10,
          toneCount: 22
        })
      })
        
      return {
        ...adapter.addMany(sonifierStates, state)
      };
    }

    case sonifierActions.UPDATE_FILE_STATE: {
      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
        ...action.payload.changes
        }}, state),
      }
    }

    case sonifierActions.UPDATE_VIEWPORT: {
      return {
        ...state,
        viewport: {...action.payload.viewport}
      }
    }

    case sonifierActions.SET_REGION: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let sonifier = {...state.entities[imageFile.id]};
        let region = Object.assign({}, action.payload.region);
        if(action.payload.storeInHistory) {
          if(!sonifier.regionHistoryInitialized) {
            sonifier.regionHistoryIndex = 0;
            sonifier.regionHistory = [region];
            sonifier.regionHistoryInitialized = true;
          }
          else {
            sonifier.regionHistory = [...sonifier.regionHistory.slice(0,sonifier.regionHistoryIndex+1), region];
            sonifier.regionHistoryIndex++;
          }
        }
        
        sonifier.region = region;
        
        return {
          ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          ...sonifier
          }}, state),
        }
      }
      return state;
    }

    case sonifierActions.UNDO_REGION_SELECTION: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let sonifier = {...state.entities[imageFile.id]};
        if(!sonifier.regionHistoryInitialized || sonifier.regionHistoryIndex == 0) return state;
        sonifier.regionHistoryIndex--;
        sonifier.region = sonifier.regionHistory[sonifier.regionHistoryIndex];
        
        return {
          ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          ...sonifier,
          }}, state),
        }
      }
      return state;
    }

    case sonifierActions.REDO_REGION_SELECTION: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let sonifier = {...state.entities[imageFile.id]};
        if(!sonifier.regionHistoryInitialized || sonifier.regionHistoryIndex == (sonifier.regionHistory.length -1)) return state;
        sonifier.regionHistoryIndex++;
        sonifier.region = sonifier.regionHistory[sonifier.regionHistoryIndex];
        
        return {
          ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          ...sonifier
          }}, state),
        }
      }
      return state;
    }

    case sonifierActions.CLEAR_REGION_HISTORY: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let sonifier = {...state.entities[imageFile.id]};
        if(!sonifier.regionHistoryInitialized || sonifier.regionHistoryIndex == (sonifier.regionHistory.length -1)) return state;
        sonifier.region = null;
        sonifier.regionHistoryIndex = null
        sonifier.regionHistory = [];
        sonifier.regionHistoryInitialized = false;
        
        return {
          ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          ...sonifier,
          }}, state),
        }
      }
      return state;
    }

    case sonifierActions.UPDATE_SONIFICATION_URI: {
      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
        sonificationUri: action.payload.uri
        }}, state),
      }
    }

    
    default: {
      return state;
    }
  }
}

