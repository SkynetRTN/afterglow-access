import { createSelector, createFeatureSelector } from '@ngrx/store';
import * as fromDataFiles from './data-files';
import * as fromRoot from '../../reducers';

export interface State extends fromRoot.State {
  dataFiles: fromDataFiles.State;
}

export const reducers = fromDataFiles.reducer;

export const getDataFilesState = createFeatureSelector<fromDataFiles.State>('dataFiles');


export const {
  selectIds: getDataFileIds,
  selectEntities: getDataFiles,
  selectAll: getAllDataFiles,
  selectTotal: getTotalDataFiles,
} = fromDataFiles.adapter.getSelectors(getDataFilesState);


