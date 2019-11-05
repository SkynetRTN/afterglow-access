import { Injectable, InjectionToken, Optional, Inject } from "@angular/core";
import { Effect, Actions, ofType } from "@ngrx/effects";
import { Action } from "@ngrx/store";
import { Store } from "@ngrx/store";
import { Observable, interval, of } from "rxjs";
import {
  switchMap,
  map,
  filter,
  catchError,
  flatMap,
  take,
  takeUntil
} from "rxjs/operators";

import * as fromJob from "../reducers";
import * as jobActions from "../actions/job";
import { JobService } from "../services/jobs";
import { Job } from "../models/job";
import { JobResult } from "../models/job-result";

@Injectable()
export class JobEffects {
  @Effect()
  createJob$: Observable<Action> = this.actions$.pipe(
    ofType<jobActions.CreateJob>(jobActions.CREATE_JOB),
    switchMap(action => {
      return this.jobService.createJob(action.payload.job).pipe(
        map((job: Job) => new jobActions.CreateJobSuccess({ job: job }, action.correlationId)),
        catchError(err =>
          of(
            new jobActions.CreateJobFail({
              job: action.payload.job,
              error: err
            }, action.correlationId)
          )
        )
      );
    })
  );

  @Effect()
  createJobSuccess$: Observable<Action> = this.actions$.pipe(
    ofType<jobActions.CreateJobSuccess>(jobActions.CREATE_JOB_SUCCESS),
    flatMap(action => {
      let stop$ = this.actions$.pipe(
        ofType<jobActions.UpdateJobSuccess>(jobActions.UPDATE_JOB_SUCCESS),
        filter(
          a =>
            a.payload.job.state.status == "canceled" ||
            a.payload.job.state.status == "completed"
        ),
        take(1)
      );

      return interval(2000).pipe(
        takeUntil(stop$),
        map(v => new jobActions.UpdateJob({ job: action.payload.job }, action.correlationId))
      );
    })
  );

  @Effect()
  updateJob$: Observable<Action> = this.actions$.pipe(
    ofType<jobActions.UpdateJob>(jobActions.UPDATE_JOB),
    switchMap(action => {
      return this.jobService.getJob(action.payload.job.id).pipe(
        map((job: Job) => new jobActions.UpdateJobSuccess({ job: job }, action.correlationId)),
        catchError(err =>
          of(
            new jobActions.UpdateJobFail({
              job: action.payload.job,
              error: err
            }, action.correlationId)
          )
        )
      );
    })
  );

  @Effect()
  jobCompleted$: Observable<Action> = this.actions$.pipe(
    ofType<jobActions.UpdateJobSuccess>(jobActions.UPDATE_JOB_SUCCESS),
    filter(action => action.payload.job.state.status == "completed"),
    map(action => new jobActions.UpdateJobResult({ job: action.payload.job }, action.correlationId))
  );

  @Effect()
  getJobResult$: Observable<Action> = this.actions$.pipe(
    ofType<jobActions.UpdateJobResult>(jobActions.UPDATE_JOB_RESULT),
    switchMap(action => {
      return this.jobService.getJobResult(action.payload.job).pipe(
        map(
          (result: JobResult) =>
            new jobActions.UpdateJobResultSuccess({
              job: action.payload.job,
              result: result
            }, action.correlationId)
        ),
        catchError(err =>
          of(
            new jobActions.UpdateJobResultFail({
              job: action.payload.job,
              error: err
            }, action.correlationId)
          )
        )
      );
    })
  );

  constructor(
    private actions$: Actions,
    private jobService: JobService,
    private store: Store<fromJob.State> // @Optional() // @Inject(SEARCH_DEBOUNCE) // private debounce: number,
  ) // /**
  //    * You inject an optional Scheduler that will be undefined
  //    * in normal application usage, but its injected here so that you can mock out
  //    * during testing using the RxJS TestScheduler for simulating passages of time.
  //    */
  // @Optional()
  // @Inject(SEARCH_SCHEDULER)
  // private scheduler: Scheduler
  {}
}
