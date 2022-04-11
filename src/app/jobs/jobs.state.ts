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
  CreateJob,
  CreateJobSuccess,
  CreateJobFail,
  UpdateJob,
  UpdateJobSuccess,
  UpdateJobFail,
  StopAutoJobUpdate,
  UpdateJobResult,
  UpdateJobResultSuccess,
  UpdateJobResultFail,
  LoadJobs,
  SelectJob,
} from './jobs.actions';
import { JobService } from './services/jobs';
import { ResetState } from '../auth/auth.actions';
import { Injectable } from '@angular/core';
import { JobType } from './models/job-types';
import { FieldCalibrationJobResult } from './models/field-calibration';
import { SourceExtractionJobResult } from './models/source-extraction';

export interface JobsStateModel {
  version: string;
  ids: string[];
  jobs: { [id: string]: Job };
  jobResults: { [id: string]: JobResult };
  selectedJobId: string;
  loading: boolean;
}

const jobsDefaultState: JobsStateModel = {
  version: 'f24d45d4-5194-4406-be15-511911c5aaf5',
  ids: [],
  jobs: {},
  jobResults: {},
  selectedJobId: null,
  loading: false
};

@State<JobsStateModel>({
  name: 'jobs',
  defaults: jobsDefaultState,
})
@Injectable()
export class JobsState {
  constructor(private jobService: JobService, private actions$: Actions) { }

  @Selector()
  public static getState(state: JobsStateModel) {
    return state;
  }

  @Selector()
  public static getJobResultEntities(state: JobsStateModel) {
    return state.jobResults;
  }


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

  @Selector()
  public static getSelectedJobResult(state: JobsStateModel) {
    return state.jobResults[state.selectedJobId] || null
  }

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

  static getJobResultById(id: string) {
    return createSelector(
      [JobsState.getJobResultEntities],
      (
        jobResultEntities: { [id: string]: JobResult }
      ) => {
        return jobResultEntities[id] || null;
      }
    );
  }

  @Action(ResetState)
  @ImmutableContext()
  public resetState({ getState, setState, dispatch }: StateContext<JobsStateModel>, { }: ResetState) {
    setState((state: JobsStateModel) => {
      return jobsDefaultState;
    });
  }

  @Action(CreateJob)
  @ImmutableContext()
  public createJob({ setState, getState, dispatch }: StateContext<JobsStateModel>, createJobAction: CreateJob) {
    return this.jobService.createJob(createJobAction.job).pipe(
      flatMap((resp) => {
        let job = resp.data
        createJobAction.job.id = job.id;
        setState((state: JobsStateModel) => {
          state.jobs[job.id] = {
            ...job,
          };
          if (!state.ids.includes(job.id)) {
            state.ids.push(job.id);
          }
          return state;
        });

        dispatch(new CreateJobSuccess(job, createJobAction.correlationId));
        if (!createJobAction.autoUpdateInterval) createJobAction.autoUpdateInterval = 2500;

        let jobCompleted$ = this.actions$.pipe(
          ofActionSuccessful(UpdateJob),
          filter<UpdateJob>((a) => {
            return a.job.id == job.id && ['canceled', 'completed'].includes(getState().jobs[a.job.id].state.status);
          })
        );

        let stop$ = merge(
          jobCompleted$,
          this.actions$.pipe(
            ofActionDispatched(StopAutoJobUpdate),
            filter<StopAutoJobUpdate>((a) => a.jobId == job.id)
          ),
          this.actions$.pipe(
            ofActionErrored(UpdateJob),
            filter<UpdateJobFail>((a) => a.job.id == job.id),
            skip(5)
          )
        ).pipe(take(1));

        interval(createJobAction.autoUpdateInterval)
          .pipe(
            takeUntil(stop$),
            tap((v) => dispatch(new UpdateJob(job, createJobAction.correlationId)))
          )
          .subscribe();

        return jobCompleted$.pipe(
          take(1),
          flatMap((a) => {
            if (getState().jobs[a.job.id].state.status != 'completed') return of();
            return dispatch(new UpdateJobResult(job, createJobAction.correlationId));

            //   return this.jobService.getJobResult(job).pipe(
            //     tap((value) => {
            //       setState((state: JobsStateModel) => {

            //         // if (state.entities[job.id].type == JobType.FieldCalibration) {
            //         //   let result = value as FieldCalibrationJobResult;
            //         //   result.errors = []
            //         //   result.warnings = []
            //         //   result.zeroPoint = 10.123456789
            //         //   result.zeroPointError = 0.123456789
            //         //   value = result;
            //         // }
            //         // else if (state.entities[job.id].type == JobType.SourceExtraction) {
            //         //   let result = value as SourceExtractionJobResult;
            //         //   result.errors = [{ id: '1', detail: 'Test error for debugging', status: '', meta: {} }]
            //         //   result.warnings = ['This is a test warning']
            //         //   value = result;
            //         // }
            //         state.jobs[job.id].result = value;
            //         return state;
            //       });
            //     })
            //   );
          })
        );
      }),
      catchError((err) => dispatch(new CreateJobFail(createJobAction.job, err, createJobAction.correlationId)))
    );
  }

  @Action(SelectJob)
  @ImmutableContext()
  public selectJob({ setState, dispatch }: StateContext<JobsStateModel>, { jobId }: SelectJob) {
    setState((state: JobsStateModel) => {
      state.selectedJobId = jobId
      return state;
    })
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
            state.jobs[job.id] = {
              ...job,
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

  @Action(UpdateJob)
  @ImmutableContext()
  public updateJob({ setState, dispatch }: StateContext<JobsStateModel>, { job, correlationId }: UpdateJob) {
    return this.jobService.getJobState(job.id).pipe(
      tap((value) => {
        setState((state: JobsStateModel) => {
          state.jobs[job.id].state = value.data;

          return state;
        });
      })
    );
  }

  @Action(UpdateJobResult)
  @ImmutableContext()
  public updateJobResult(
    { setState, dispatch }: StateContext<JobsStateModel>,
    { job, correlationId }: UpdateJobResult
  ) {
    return this.jobService.getJobResult(job).pipe(
      map((resp) => {
        setState((state: JobsStateModel) => {
          // state.jobs[job.id].result = resp;
          state.jobResults[job.id] = resp;
          return state;
        });

        return dispatch(new UpdateJobResultSuccess(job, resp, correlationId));
      }),
      catchError((err) => {
        return dispatch(new UpdateJobResultFail(job, err, correlationId));
      })
    );
  }
}
