import {
  State,
  Action,
  Actions,
  Selector,
  StateContext,
  ofActionDispatched,
  ofActionCompleted,
  ofActionSuccessful,
  ofActionErrored,
  createSelector,
} from '@ngxs/store';
import { ImmutableSelector, ImmutableContext } from '@ngxs-labs/immer-adapter';
import { tap, catchError, finalize, filter, take, takeUntil, map, flatMap, skip, delay } from 'rxjs/operators';
import { of, merge, interval, Observable } from 'rxjs';

import { Job } from './models/job';
import { JobResult } from './models/job-result';
import {
  LoadJobs,
  SelectJob,
  LoadJob,
  AddJob,
  UpdateJobState,
  UpdateJobResult,
  LoadJobResult,
} from './jobs.actions';
import { JobApiService } from './services/job-api.service';
import { ResetState } from '../auth/auth.actions';
import { Injectable } from '@angular/core';

export interface JobsStateModel {
  version: string;
  ids: string[];
  jobs: { [id: string]: Job };
  selectedJobId: string;
  loading: boolean;
}

const jobsDefaultState: JobsStateModel = {
  version: 'f24d45d4-5194-4406-be15-511911c5aaf5',
  ids: [],
  jobs: {},
  selectedJobId: null,
  loading: false
};

@State<JobsStateModel>({
  name: 'jobs',
  defaults: jobsDefaultState,
})
@Injectable()
export class JobsState {
  constructor(private jobService: JobApiService, private actions$: Actions) { }

  @Selector()
  public static getState(state: JobsStateModel) {
    return state;
  }

  // @Selector()
  // public static getJobResultEntities(state: JobsStateModel) {
  //   return state.jobResults;
  // }


  @Selector()
  public static getJobEntities(state: JobsStateModel) {
    return state.jobs;
  }

  @Selector()
  public static getLoading(state: JobsStateModel) {
    return state.loading;
  }

  @Selector()
  public static getJobs(state: JobsStateModel) {
    return Object.values(state.jobs);
  }

  @Selector()
  public static getSelectedJobId(state: JobsStateModel) {
    return state.selectedJobId
  }

  @Selector()
  public static getSelectedJob(state: JobsStateModel) {
    return state.jobs[state.selectedJobId] || null
  }

  // @Selector()
  // public static getSelectedJobResult(state: JobsStateModel) {
  //   return state.jobResults[state.selectedJobId] || null
  // }

  static getJobById(id: string) {
    return createSelector(
      [JobsState.getJobEntities],
      (
        jobEntities: { [id: string]: Job }
      ) => {
        return jobEntities[id] || null;
      }
    );
  }

  // static getJobResultById(id: string) {
  //   return createSelector(
  //     [JobsState.getJobResultEntities],
  //     (
  //       jobResultEntities: { [id: string]: JobResult }
  //     ) => {
  //       return jobResultEntities[id] || null;
  //     }
  //   );
  // }

  @Action(ResetState)
  @ImmutableContext()
  public resetState({ getState, setState, dispatch }: StateContext<JobsStateModel>, { }: ResetState) {
    setState((state: JobsStateModel) => {
      return jobsDefaultState;
    });
  }

  @Action(AddJob)
  @ImmutableContext()
  public addJob({ setState, getState, dispatch }: StateContext<JobsStateModel>, { job }: AddJob) {
    setState((state: JobsStateModel) => {
      state.jobs[job.id] = job;
      return state;
    })
  }

  @Action(UpdateJobState)
  @ImmutableContext()
  public updateJobState({ setState, getState, dispatch }: StateContext<JobsStateModel>, { id, state: jobState }: UpdateJobState) {
    setState((state: JobsStateModel) => {
      state.jobs[id].state = jobState;
      return state;
    })
  }

  @Action(UpdateJobResult)
  @ImmutableContext()
  public updateJobResult({ setState, getState, dispatch }: StateContext<JobsStateModel>, { id, result }: UpdateJobResult) {
    setState((state: JobsStateModel) => {
      state.jobs[id].result = result;
      return state;
    })
  }

  @Action(SelectJob)
  @ImmutableContext()
  public selectJob({ setState, dispatch }: StateContext<JobsStateModel>, { jobId }: SelectJob) {
    setState((state: JobsStateModel) => {
      state.selectedJobId = jobId
      return state;
    })
  }

  @Action(LoadJob)
  @ImmutableContext()
  public loadJob({ setState, dispatch }: StateContext<JobsStateModel>, { id }: LoadJob) {
    return this.jobService.getJob(id).pipe(
      tap((resp) => {
        setState((state: JobsStateModel) => {
          let job = resp.data;
          if (!(job.id in state.jobs)) state.ids.push(job.id);
          state.jobs[job.id] = {
            ...job,
          }
          return state;
        });
      }),
      catchError(e => {
        return of()
      }),
      finalize(() => {

      })
    );
  }

  @Action(LoadJobResult)
  @ImmutableContext()
  public loadJobResult({ getState, setState, dispatch }: StateContext<JobsStateModel>, { id }: LoadJobResult) {
    return this.jobService.getJobResult(id).pipe(
      tap((result) => {
        if (!(id in getState().jobs)) return;
        setState((state: JobsStateModel) => {
          state.jobs[id].result = result
          return state;
        });
      }),
      catchError(e => {
        return of()
      }),
      finalize(() => {

      })
    );
  }

  @Action(LoadJobs)
  @ImmutableContext()
  public loadJobs({ setState, dispatch }: StateContext<JobsStateModel>, { }: LoadJobs) {

    setState((state: JobsStateModel) => {
      state.loading = true;
      return state;
    })
    return this.jobService.getJobs().pipe(
      tap((resp) => {
        setState((state: JobsStateModel) => {
          resp.data.forEach(job => {
            if (!(job.id in state.jobs)) state.ids.push(job.id);

            //the core sends an empty result object if the job for this endpoint
            //prevent the empty result object from overwriting previously obtained results
            delete job['result']

            if (state.jobs[job.id]) {
              Object.assign(state.jobs[job.id], job);
            }
            else {
              state.jobs[job.id] = job
            }


          })
          return state;
        });
      }),
      catchError(e => {
        return of()
      }),
      finalize(() => {
        setState((state: JobsStateModel) => {
          state.loading = false;
          return state;
        })
      })
    );
  }

}
