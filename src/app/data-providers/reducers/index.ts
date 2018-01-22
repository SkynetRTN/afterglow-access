import { createSelector, createFeatureSelector } from '@ngrx/store';
import * as fromDataProviders from './data-providers';
import * as fromRoot from '../../reducers';

export interface State extends fromRoot.State {
  'dataProviders': fromDataProviders.State;
}

export const reducers = fromDataProviders.reducer;

export const getDataProvidersState = createFeatureSelector<fromDataProviders.State>('dataProviders');

export const getDataProvidersLoaded = createSelector(getDataProvidersState, state => state.dataProvidersLoaded);
export const getDataProviders = createSelector(getDataProvidersState, state => state.dataProviders);
export const getLoadingAssets = createSelector(getDataProvidersState, state => state.loadingAssets);
export const getCurrentProvider = createSelector(getDataProvidersState, state => state.currentProvider);
export const getCurrentPath = createSelector(getDataProvidersState, state => state.currentPath);
export const getCurrentPathBreadcrumbs = createSelector(getDataProvidersState, state => state.currentPathBreadcrumbs);
export const getCurrentAssets = createSelector(getDataProvidersState, state => state.currentAssets);
export const getSelectedAssets = createSelector(getDataProvidersState, state => state.selectedAssets);
export const getCurrentSortField = createSelector(getDataProvidersState, state => state.currentSortField);
export const getCurrentSortOrder = createSelector(getDataProvidersState, state => state.currentSortOrder);
export const getImporting = createSelector(getDataProvidersState, state => state.importing);
export const getPendingImports = createSelector(getDataProvidersState, state => state.pendingImports);
export const getCompletedImports = createSelector(getDataProvidersState, state => state.completedImports);
export const getImportErrors = createSelector(getDataProvidersState, state => state.importErrors);
export const getImportProgress = createSelector(getDataProvidersState, state => state.importProgress);