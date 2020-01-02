import { State, Action, Actions, Selector, StateContext, ofActionDispatched } from '@ngxs/store';
import { ImmutableSelector, ImmutableContext } from '@ngxs-labs/immer-adapter';
import { tap, catchError, finalize, filter, take, takeUntil, map, flatMap } from 'rxjs/operators';
import { of, merge, interval, Observable } from "rxjs";

import { Job } from './models/job';
import { JobResult } from './models/job-result';
import { CreateJob, CreateJobSuccess, CreateJobFail, UpdateJob, UpdateJobSuccess, UpdateJobFail, StopAutoJobUpdate, UpdateJobResult, UpdateJobResultSuccess, UpdateJobResultFail } from './jobs.actions';
import { JobService } from './services/jobs';

export interface JobEntity {
  job: Job,
  result: JobResult
}

export interface JobsStateModel {
  ids: string[];
  entities: { [id: string]: JobEntity };
}

@State<JobsStateModel>({
  name: 'jobs',
  defaults: {
    ids: [],
    entities: {}
  }
})
export class JobsState {

  constructor(private jobService: JobService, private actions$: Actions) { }

  @Selector()
  @ImmutableSelector()
  public static getState(state: JobsStateModel) {
    return state;
  }

  @Selector()
  public static getEntities(state: JobsStateModel) {
    return state.entities;
  }

  @Selector()
  @ImmutableSelector()
  public static getJobs(state: JobsStateModel) {
    return Object.values(state.entities);
  }

  @Action(CreateJob)
  @ImmutableContext()
  public createJob({ setState, dispatch }: StateContext<JobsStateModel>, { job, autoUpdateInterval, correlationId }: CreateJob) {
    return this.jobService.createJob(job).pipe(
      tap(result => {
        setState((state: JobsStateModel) => {
          state.entities[result.id] = { job: result, result: null };
          if (!state.ids.includes(result.id)) {
            state.ids.push(result.id);
          }
          return state;
        });
      }),
      flatMap(result => {
        let rtn = [dispatch(new CreateJobSuccess(result, correlationId))];

        if (autoUpdateInterval) {
          let stop$ = merge(
            this.actions$.pipe(
              ofActionDispatched(UpdateJobSuccess),
              filter<UpdateJobSuccess>(a => {
                return a.job.state.status == "canceled" ||
                  a.job.state.status == "completed";
              })
            ),
            this.actions$.pipe(
              ofActionDispatched(StopAutoJobUpdate),
              filter<StopAutoJobUpdate>(a => a.jobId == result.id)),
            this.actions$.pipe(
              ofActionDispatched(UpdateJobFail),
              filter<UpdateJobFail>(a => a.job.id == result.id))
          ).pipe(
            take(1)
          )

          let updater$ = interval(autoUpdateInterval).pipe(
            takeUntil(stop$),
            flatMap(v => dispatch(new UpdateJob(result)))
          );
          rtn.push(updater$);
        }
        return merge(...rtn);

      }),
      catchError(err => {
        return dispatch(new CreateJobFail(job, err, correlationId));
      })
    );
  }

  @Action(UpdateJob)
  @ImmutableContext()
  public updateJob({ setState, dispatch }: StateContext<JobsStateModel>, { job, correlationId }: UpdateJob) {
    return this.jobService.getJob(job.id).pipe(
      tap(value => {
        setState((state: JobsStateModel) => {
          state.entities[job.id].job = value;
          return state;
        });
      }),
      flatMap(value => {
        let rtn = [dispatch(new UpdateJobSuccess(value, correlationId))];
        if (value.state.status == 'completed') rtn.push(dispatch(new UpdateJobResult(value, correlationId)));
        return merge(...rtn);

      }),
      catchError(err => {
        return dispatch(new UpdateJobFail(job, err, correlationId));
      })
    );
  }


  @Action(UpdateJob)
  @ImmutableContext()
  public updateJobResult({ setState, dispatch }: StateContext<JobsStateModel>, { job, correlationId }: UpdateJobResult) {
    return this.jobService.getJobResult(job).pipe(
      map(value => {
        setState((state: JobsStateModel) => {
          state.entities[job.id].result = value;
          return state;
        });

        return dispatch(new UpdateJobResultSuccess(job, value, correlationId))

      }),
      catchError(err => {
        return dispatch(new UpdateJobResultFail(job, err, correlationId));
      })
    );
  }


}
