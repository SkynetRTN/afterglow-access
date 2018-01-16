import { createSelector, createFeatureSelector } from '@ngrx/store';
import * as fromDataProviders from './data-providers';
import * as fromRoot from '../../reducers';

export interface State extends fromRoot.State {
  'dataProviders': fromDataProviders.State;
}

export const reducers = fromDataProviders.reducer;

export const getDataProvidersState = createFeatureSelector<fromDataProviders.State>('dataProviders');
