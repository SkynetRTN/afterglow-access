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
} from "@ngxs/store";
import { ImmutableSelector, ImmutableContext } from "@ngxs-labs/immer-adapter";
import { tap, catchError, finalize, filter, take, takeUntil, map, flatMap, skip } from "rxjs/operators";
import { of, merge, interval, Observable } from "rxjs";

import { Job } from "./models/job";
import { JobResult } from "./models/job-result";
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
} from "./jobs.actions";
import { JobService } from "./services/jobs";
import { ResetState } from "../auth/auth.actions";

export interface JobEntity {
  job: Job;
  result: JobResult;
}

export interface JobsStateModel {
  ids: string[];
  entities: { [id: string]: JobEntity };
}

const jobsDefaultState: JobsStateModel = {
  ids: [],
  entities: {},
};

@State<JobsStateModel>({
  name: "jobs",
  defaults: jobsDefaultState,
})
export class JobsState {
  constructor(private jobService: JobService, private actions$: Actions) {}

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

  @Action(ResetState)
  @ImmutableContext()
  public resetState({ getState, setState, dispatch }: StateContext<JobsStateModel>, {}: ResetState) {
    setState((state: JobsStateModel) => {
      return jobsDefaultState;
    });
  }

  @Action(CreateJob)
  @ImmutableContext()
  public createJob({ setState, getState, dispatch }: StateContext<JobsStateModel>, createJobAction: CreateJob) {
    return this.jobService.createJob(createJobAction.job).pipe(
      tap((job) => {
        createJobAction.job.id = job.id;
        setState((state: JobsStateModel) => {
          state.entities[job.id] = { job: job, result: null };
          if (!state.ids.includes(job.id)) {
            state.ids.push(job.id);
          }
          return state;
        });
      }),
      flatMap((job) => {
        //dispatch(new CreateJobSuccess(job, createJobAction.correlationId));
        if (!createJobAction.autoUpdateInterval) createJobAction.autoUpdateInterval = 2500;

        let jobCompleted$ = this.actions$.pipe(
          ofActionSuccessful(UpdateJob),
          filter<UpdateJob>((a) => {
            return a.job.id == job.id && ["canceled", "completed"].includes(getState().entities[a.job.id].job.state.status);
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
            if (getState().entities[a.job.id].job.state.status != "completed") return of();

            return this.jobService.getJobResult(job).pipe(
              tap((value) => {
                setState((state: JobsStateModel) => {
                  state.entities[job.id].result = value;
                  return state;
                });
              })
            );
          })
        );
      })
    );
  }

  @Action(UpdateJob)
  @ImmutableContext()
  public updateJob({ setState, dispatch }: StateContext<JobsStateModel>, { job, correlationId }: UpdateJob) {
    return this.jobService.getJobState(job.id).pipe(
      tap((value) => {
        setState((state: JobsStateModel) => {
          state.entities[job.id].job.state = value;
          return state;
        });
      })
    );
  }

  @Action(UpdateJobResult)
  @ImmutableContext()
  public updateJobResult({ setState, dispatch }: StateContext<JobsStateModel>, { job, correlationId }: UpdateJobResult) {
    return this.jobService.getJobResult(job).pipe(
      map((value) => {
        setState((state: JobsStateModel) => {
          state.entities[job.id].result = value;
          return state;
        });

        return dispatch(new UpdateJobResultSuccess(job, value, correlationId));
      }),
      catchError((err) => {
        return dispatch(new UpdateJobResultFail(job, err, correlationId));
      })
    );
  }
}
