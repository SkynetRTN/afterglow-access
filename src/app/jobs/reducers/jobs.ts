import { createSelector } from '@ngrx/store';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';

import * as jobActions from '../actions/job';
import { Job } from '../models/job';
import { JobResult } from '../models/job-result';

let MARKER_ID = 0;

/**
 * @ngrx/entity provides a predefined interface for handling
 * a structured dictionary of records. This interface
 * includes an array of ids, and a dictionary of the provided
 * model type by id. This interface is extended to include
 * any additional interface properties.
 */
export interface State extends EntityState<{job: Job, result: JobResult}> {
}

/**
 * createEntityAdapter creates many an object of helper
 * functions for single or multiple operations
 * against the dictionary of records. The configuration
 * object takes a record id selector function and
 * a sortComparer option which is set to a compare
 * function if the records are to be sorted.
 */
export const adapter: EntityAdapter<{job: Job, result: JobResult}> = createEntityAdapter<{job: Job, result: JobResult}>({
  selectId: (row: {job: Job, result: JobResult}) => row.job.id,
  sortComparer: false,
});

/** getInitialState returns the default initial state
 * for the generated entity state. Initial state
 * additional properties can also be defined.
*/
export const initialState: State = adapter.getInitialState({
});

export function reducer(
  state = initialState,
  action: jobActions.Actions
): State {
  switch (action.type) {
    case jobActions.CREATE_JOB_SUCCESS: {
      return adapter.addOne({job: action.payload.job, result: null}, state)
    }
    case jobActions.UPDATE_JOB_SUCCESS: {
      let row = state.entities[action.payload.job.id]
      return adapter.updateOne({
        id: action.payload.job.id,
        changes: {
          job: {...action.payload.job}
        }
      }, state);
    }

    case jobActions.UPDATE_JOB_RESULT_SUCCESS: {
      let row = state.entities[action.payload.job.id]
      return adapter.updateOne({
        id: action.payload.job.id,
        changes: {
          result: {...action.payload.result}
        }
      }, state);
    }
    
    default: {
      return state;
    }
  }
}
