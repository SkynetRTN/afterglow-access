import { createSelector, createFeatureSelector } from '@ngrx/store';
import * as fromJobs from './jobs';
import * as fromRoot from '../../reducers';

export interface State extends fromRoot.State {
  jobs: fromJobs.State;
}

export const reducers = fromJobs.reducer;

export const getJobsState = createFeatureSelector<fromJobs.State>('jobs');


export const {
  selectIds: getJobIds,
  selectEntities: getJobs,
  selectAll: getAllJobs,
  selectTotal: getTotalJobs,
} = fromJobs.adapter.getSelectors(getJobsState);


