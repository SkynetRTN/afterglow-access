import { createSelector} from '@ngrx/store';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';

import { SourceExtractorFileState, SourceExtractorRegionOption } from '../models/source-extractor-file-state';
import { SourceExtractorModeOption } from '../models/source-extractor-mode-option';
import { SourceExtractionSettings } from '../models/source-extraction-settings';
import { PhotSettings } from '../models/phot-settings';
import { DataFileType } from '../../data-files/models/data-file-type';
import { CentroidSettings } from '../models/centroid-settings'
import { DataFile, ImageFile, getYTileDim, getXTileDim, getHeight, getWidth} from '../../data-files/models/data-file';
import { centroidDisk, centroidPsf } from '../models/centroider';

import * as sourceExtractorActions from '../actions/source-extractor';
import * as dataFileActions from '../../data-files/actions/data-file';
import * as authActions from '../../auth/actions/auth';
import * as imageFileActions from '../../data-files/actions/image-file';


export interface State extends EntityState<SourceExtractorFileState> {
  sourceExtractorModeOption: SourceExtractorModeOption;
  viewport: {imageX: number, imageY: number, imageWidth: number, imageHeight: number, viewportWidth: number, viewportHeight: number};
  //TODO: refactor following to core
  photSettings: PhotSettings;
  sourceExtractionSettings: SourceExtractionSettings;
}

export const adapter: EntityAdapter<SourceExtractorFileState> = createEntityAdapter<SourceExtractorFileState>({
  selectId: (sourceExtractorState: SourceExtractorFileState) => sourceExtractorState.fileId,
  sortComparer: false,
});

/** getInitialState returns the default initial state
 * for the generated entity state. Initial state
 * additional properties can also be defined.
*/
export const initialState: State = adapter.getInitialState({
  viewport: null,
  photSettings: {
    aperture: 10,
    annulus: 10,
    dannulus: 10,
    centroid: true,
    centroidRadius: 10
  },
  sourceExtractionSettings: {
    threshold: 10,
    fwhm: 3,
    deblend: false,
  },
  sourceExtractorModeOption: SourceExtractorModeOption.MOUSE
});

export function reducer(
  state = initialState,
  action: sourceExtractorActions.Actions | dataFileActions.Actions | imageFileActions.Actions | authActions.Actions
): State {
  switch (action.type) {

    
    case authActions.LOGOUT: {
      return {
        ...adapter.removeAll(initialState)
      }
    }

    case dataFileActions.LOAD_LIBRARY_SUCCESS: {
      let sourceExtractorStates: SourceExtractorFileState[] = [];
      action.payload.filter(dataFile => dataFile.type == DataFileType.IMAGE).map(dataFile => {
        sourceExtractorStates.push({
          fileId: dataFile.id,
          regionOption: SourceExtractorRegionOption.VIEWPORT,
          region: null,
          sources: [],
          selectedSourceIds: [],
        })
      })
        
      return {
        ...adapter.addMany(sourceExtractorStates, state)
      };
    }

    case sourceExtractorActions.UPDATE_VIEWPORT: {
      return {
        ...state,
        viewport: {...action.payload.viewport}
      }
    }


    case sourceExtractorActions.SET_SOURCE_EXTRACTION_MODE: {
      return {
        ...state,
        sourceExtractorModeOption: action.payload.mode
      }
    }

    case sourceExtractorActions.UPDATE_PHOT_SETTINGS: {
      return {
        ...state,
        photSettings: {
          ...state.photSettings,
          ...action.payload.changes
        }
      }
    }

    case sourceExtractorActions.UPDATE_SOURCE_EXTRACTION_SETTINGS: {
      return {
        ...state,
        sourceExtractionSettings: {
          ...state.sourceExtractionSettings,
          ...action.payload.changes
        }
      }
    }

    case sourceExtractorActions.SET_REGION: {
      let imageFile = action.payload.file;
      let sourceExtractorState = state.entities[imageFile.id];

      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
        region: action.payload.region
        }}, state),
      }
    }

    case sourceExtractorActions.UPDATE_FILE_STATE: {
      let imageFile = action.payload.file;
      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': action.payload.changes}, state),
      }
    }

    case sourceExtractorActions.EXTRACT_SOURCES_SUCCESS: {
      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
        sources: [...action.payload.sources]
        }}, state),
      }
    }

    case sourceExtractorActions.SELECT_SOURCES: {
      let sourceExtractor = state.entities[action.payload.file.id];
      let sourceIds = action.payload.sources
      .map(source => source.id)
      .filter(sourceId => {
        return sourceExtractor.selectedSourceIds.indexOf(sourceId) == -1;
      });

      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          selectedSourceIds: [...sourceExtractor.selectedSourceIds, ...sourceIds]
        }}, state),
      }
    }

    case sourceExtractorActions.DESELECT_SOURCES: {
      let sourceExtractor = state.entities[action.payload.file.id];
      let deselectedSourceIds = action.payload.sources.map(source => source.id);
      let selectedSourceIds = sourceExtractor.selectedSourceIds
        .filter(sourceId => {
          return deselectedSourceIds.indexOf(sourceId) == -1;
        });

      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          selectedSourceIds: selectedSourceIds
        }}, state),
      }
    }

    case sourceExtractorActions.SET_SOURCE_SELECTION: {
      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          selectedSourceIds: action.payload.sources.map(source => source.id)
        }}, state),
      }
    }

    case sourceExtractorActions.REMOVE_ALL_SOURCES: {
      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          selectedSourceIds: [],
          sources: []
        }}, state),
      }
    }

    case sourceExtractorActions.REMOVE_SELECTED_SOURCES: {
      let sourceExtractor = state.entities[action.payload.file.id];
      let sources = sourceExtractor.sources.filter(source => {
        return sourceExtractor.selectedSourceIds.indexOf(source.id) == -1;
      })

      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          selectedSourceIds: [],
          sources: sources
        }}, state),
      }
    }

    case sourceExtractorActions.PHOTOMETER_SOURCES_SUCCESS: {
      let sourceExtractor = state.entities[action.payload.file.id];
      
      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
        sources: [...sourceExtractor.sources, ...action.payload.sources]
        }}, state),
      }
    }

    
    default: {
      return state;
    }
  }
}

