import { Injectable, InjectionToken, Optional, Inject } from '@angular/core';
import { Effect, Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { Scheduler } from 'rxjs/Scheduler';
import { async } from 'rxjs/scheduler/async';
import { empty } from 'rxjs/observable/empty';
import { of } from 'rxjs/observable/of';
import { Store } from '@ngrx/store';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/skip';
import 'rxjs/add/operator/takeUntil';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/withLatestFrom';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/observable/from';


import * as fromJob from '../reducers';
import * as jobActions from '../actions/job';
import { JobService } from '../services/jobs';
import { Job } from '../models/job';
import { JobResult } from '../models/job-result';


@Injectable()
export class JobEffects {


  @Effect()
  createJob$: Observable<Action> = this.actions$
    .ofType<jobActions.CreateJob>(jobActions.CREATE_JOB)
    .switchMap(action => {
      return this.jobService
        .createJob(action.payload.job)
        .map((job: Job) => new jobActions.CreateJobSuccess({ job: job }))
        .catch(err => of(new jobActions.CreateJobFail({ job: action.payload.job, error: err })));
    });

  @Effect()
  createJobSuccess$: Observable<Action> = this.actions$
    .ofType<jobActions.CreateJobSuccess>(jobActions.CREATE_JOB_SUCCESS)
    .flatMap(action => {
      let stop$ = this.actions$.ofType<jobActions.UpdateJobSuccess>(jobActions.UPDATE_JOB_SUCCESS)
        .filter(a => (a.payload.job.state.status == 'canceled' || a.payload.job.state.status == 'completed'))
        .take(1);

      return Observable.interval(2000)
        .takeUntil(stop$)
        .map(v => new jobActions.UpdateJob({ job: action.payload.job }))
    });

  @Effect()
  updateJob$: Observable<Action> = this.actions$
    .ofType<jobActions.UpdateJob>(jobActions.UPDATE_JOB)
    .switchMap(action => {
      return this.jobService
        .getJob(action.payload.job.id)
        .map((job: Job) => new jobActions.UpdateJobSuccess({ job: job }))
        .catch(err => of(new jobActions.UpdateJobFail({ job: action.payload.job, error: err })));
    });

  @Effect()
  jobCompleted$: Observable<Action> = this.actions$
    .ofType<jobActions.UpdateJobSuccess>(jobActions.UPDATE_JOB_SUCCESS)
    .filter(action => action.payload.job.state.status == 'completed')
    .map(action => new jobActions.UpdateJobResult({ job: action.payload.job }));


  @Effect()
  getJobResult$: Observable<Action> = this.actions$
    .ofType<jobActions.UpdateJobResult>(jobActions.UPDATE_JOB_RESULT)
    .switchMap(action => {
      return this.jobService
        .getJobResult(action.payload.job)
        .map((result: JobResult) => new jobActions.UpdateJobResultSuccess({ job: action.payload.job, result: result }))
        .catch(err => of(new jobActions.UpdateJobResultFail({ job: action.payload.job, error: err })));
    });

  constructor(
    private actions$: Actions,
    private jobService: JobService,
    private store: Store<fromJob.State>
    // @Optional()
    // @Inject(SEARCH_DEBOUNCE)
    // private debounce: number,
    // /**
    //    * You inject an optional Scheduler that will be undefined
    //    * in normal application usage, but its injected here so that you can mock out
    //    * during testing using the RxJS TestScheduler for simulating passages of time.
    //    */
    // @Optional()
    // @Inject(SEARCH_SCHEDULER)
    // private scheduler: Scheduler
  ) { }
}