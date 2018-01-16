import { createSelector, createFeatureSelector } from '@ngrx/store';
import * as fromRoot from '../../reducers';
import * as fromWorkbench from './workbench';
import * as fromDataFiles from '../../data-files/reducers';
import { DataFileType } from '../../data-files/models/data-file-type';
import { ImageFile } from '../../data-files/models/data-file';
import { WorkbenchFileState } from '../models/workbench-file-state';

export interface CoreState {
  workbenchState: fromWorkbench.State;
}

export interface State extends fromRoot.State {
  'coreState': CoreState;
}

export const reducers = {
  workbenchState: fromWorkbench.reducer
};

export const getCoreState = createFeatureSelector<CoreState>('coreState');

/**
 * Every reducer module exports selector functions, however child reducers
 * have no knowledge of the overall state tree. To make them usable, we
 * need to make new selectors that wrap them.
 *
 * The createSelector function creates very efficient selectors that are memoized and
 * only recompute when arguments change. The created selectors can also be composed
 * together to select different pieces of state.
 */
export const getWorkbenchState = createSelector(
  getCoreState,
  state => state.workbenchState
);

export const getSelectedDataFileId = createSelector(
  getWorkbenchState,
  fromWorkbench.getSelectedId
);

export const {
  selectIds: getDataFileIds,
  selectEntities: getWorkbenchFileStateEntities,
  selectAll: getAllWorkbenchFileStates,
  selectTotal: getTotalWorkbenchFileStates,
} = fromWorkbench.adapter.getSelectors(getWorkbenchState);

export const getSelectedDataFile = createSelector(
  fromDataFiles.getDataFileEntities,
  getSelectedDataFileId,
  (entities, selectedId) => {
    return selectedId && entities[selectedId];
  }
);

export const getSelectedImageFile = createSelector(
  getSelectedDataFile,
  (dataFile) => {
    return dataFile && dataFile.type == DataFileType.IMAGE && dataFile as ImageFile;
  }
);


export interface SelectedFileWorkbenchState {
  file: ImageFile
  workbenchState: fromWorkbench.State,
  fileState: WorkbenchFileState,
}

export const getSelectedFileWorkbenchState = createSelector(
  getWorkbenchState,
  getSelectedImageFile,
  (workbenchState, selectedImageFile) => {
    if(!selectedImageFile || !(selectedImageFile.id in workbenchState.entities)) return;
    let result : SelectedFileWorkbenchState = {
      file: selectedImageFile,
      workbenchState: workbenchState,
      fileState: workbenchState.entities[selectedImageFile.id]
    }

    return result;
  }
)





