import { createSelector } from '@ngrx/store';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';

import { PlotterFileState } from '../models/plotter-file-state';
import { PlotterSettings } from '../models/plotter-settings';
import { SourceExtractorModeOption } from '../models/source-extractor-mode-option';
import { DataFileType } from '../../data-files/models/data-file-type';
import { CentroidSettings } from '../models/centroid-settings'
import { DataFile, ImageFile, getYTileDim, getXTileDim, getHeight, getWidth } from '../../data-files/models/data-file';
import { centroidDisk, centroidPsf } from '../models/centroider';

import * as plotterActions from '../actions/plotter';
import * as dataFileActions from '../../data-files/actions/data-file';
import * as authActions from '../../auth/actions/auth';
import * as imageFileActions from '../../data-files/actions/image-file';
/**
 * @ngrx/entity provides a predefined interface for handling
 * a structured dictionary of records. This interface
 * includes an array of ids, and a dictionary of the provided
 * model type by id. This interface is extended to include
 * any additional interface properties.
 */
export interface State extends EntityState<PlotterFileState> {
  centroidSettings: CentroidSettings,
  plotterSettings: PlotterSettings;
}

/**
 * createEntityAdapter creates many an object of helper
 * functions for single or multiple operations
 * against the dictionary of records. The configuration
 * object takes a record id selector function and
 * a sortComparer option which is set to a compare
 * function if the records are to be sorted.
 */
export const adapter: EntityAdapter<PlotterFileState> = createEntityAdapter<PlotterFileState>({
  selectId: (plotterState: PlotterFileState) => plotterState.fileId,
  sortComparer: false,
});

/** getInitialState returns the default initial state
 * for the generated entity state. Initial state
 * additional properties can also be defined.
*/
export const initialState: State = adapter.getInitialState({
  centroidSettings: {
    centroidClicks: false,
    useDiskCentroiding: false,
    psfCentroiderSettings: null,
    diskCentroiderSettings: null,
  },
  plotterSettings: {
    interpolatePixels: false,
  }

});

export function reducer(
  state = initialState,
  action: dataFileActions.Actions | plotterActions.Actions | authActions.Actions
): State {
  switch (action.type) {
    case authActions.LOGOUT: {
      return {
        ...adapter.removeAll(initialState)
      }
    }

    case dataFileActions.LOAD_LIBRARY_SUCCESS: {
      let plotterStates: PlotterFileState[] = [];
      action.payload.filter(dataFile => dataFile.type == DataFileType.IMAGE).map(dataFile => {
        plotterStates.push({
          fileId: dataFile.id,
          measuring: false,
          lineMeasureStart: null,
          lineMeasureEnd: null,
        })
      })

      return {
        ...adapter.addMany(plotterStates, state)
      };
    }
    case plotterActions.UPDATE_CENTROID_SETTINGS: {
      let centroidSettings = {
        ...state.centroidSettings,
        ...action.payload.changes
      }

      return {
        ...state,
        centroidSettings: centroidSettings
      }

    }

    case plotterActions.UPDATE_PLOTTER_SETTINGS: {
      let plotterSettings = {
        ...state.plotterSettings,
        ...action.payload.changes
      }

      return {
        ...state,
        plotterSettings: plotterSettings
      }

    }


    case plotterActions.START_LINE: {
      let imageFile = action.payload.file as ImageFile;
      let point = action.payload.point;
      let plotterState = { ...state.entities[imageFile.id] };

      let xc = action.payload.point.x;
      let yc = action.payload.point.y;
      if (state.centroidSettings.centroidClicks) {
        let result;
        if (state.centroidSettings.useDiskCentroiding) {
          result = centroidDisk(imageFile, point.x, point.y);
        }
        else {
          result = centroidPsf(imageFile, point.x, point.y);
        }

        xc = result.x;
        yc = result.y;
      }
      if (!plotterState.measuring) {
        plotterState.lineMeasureStart = { x: xc, y: yc };
        plotterState.lineMeasureEnd = { x: point.x, y: point.y };
      }
      else {
        plotterState.lineMeasureEnd = { x: xc, y: yc };
      }
      plotterState.measuring = !plotterState.measuring;


      return {
        ...adapter.updateOne({
          'id': action.payload.file.id, 'changes': {
            ...plotterState
          }
        }, state),
      }
    }

    case plotterActions.UPDATE_LINE: {
      let imageFile = action.payload.file as ImageFile;
      let point = action.payload.point;

      let plotterState = state.entities[imageFile.id];

      if (!plotterState.measuring) return state;

      return {
        ...adapter.updateOne({
          'id': action.payload.file.id, 'changes': {
            lineMeasureEnd: point
          }
        }, state),
      }
    }








    default: {
      return state;
    }
  }
}






