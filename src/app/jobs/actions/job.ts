import { Action } from '@ngrx/store';
import { Job } from '../models/job';
import { JobResult } from '../models/job-result';

export const CREATE_JOB = '[Job] Create Job';
export const CREATE_JOB_SUCCESS = '[Job] Create Job Success';
export const CREATE_JOB_FAIL = '[Job] Create Job Fail';

export const CANCEL_JOB = '[Job] Cancel Job';
export const CANCEL_JOB_SUCCESS = '[Job] Cancel Job Success';
export const CANCEL_JOB_FAIL = '[Job] Cancel Job Fail';

export const LOAD_JOBS = '[Job] Load Jobs';
export const LOAD_JOBS_SUCCESS = '[Job] Load Jobs Success';
export const LOAD_JOBS_FAIL = '[Job] Load Jobs Fail';

export const UPDATE_JOB = '[Job] Update Job State';
export const UPDATE_JOB_SUCCESS = '[Job] Update Job State Success';
export const UPDATE_JOB_FAIL = '[Job] Update Job State Fail';

export const UPDATE_JOB_RESULT = '[Job] Update Job Result';
export const UPDATE_JOB_RESULT_SUCCESS = '[Job] Update Job Result Success';
export const UPDATE_JOB_RESULT_FAIL = '[Job] Update Job Result Fail';



export class CreateJob implements Action {
  readonly type = CREATE_JOB;

  constructor(public payload: { job: Job, autoUpdateInterval?: number }, public correlationId?: string) { }
}

export class CreateJobSuccess implements Action {
  readonly type = CREATE_JOB_SUCCESS;

  constructor(public payload: { job: Job }, public correlationId?: string) { }
}

export class CreateJobFail implements Action {
  readonly type = CREATE_JOB_FAIL;

  constructor(public payload: { job: Job, error: any }, public correlationId?: string) { }
}

export class CancelJob implements Action {
  readonly type = CANCEL_JOB;

  constructor(public payload: { job: Job }, public correlationId?: string) { }
}

export class CancelJobSuccess implements Action {
  readonly type = CANCEL_JOB_SUCCESS;

  constructor(public payload: { job: Job }, public correlationId?: string) { }
}

export class CancelJobFail implements Action {
  readonly type = CANCEL_JOB_FAIL;

  constructor(public payload: { job: Job, error: any }, public correlationId?: string) { }
}

export class UpdateJob implements Action {
  readonly type = UPDATE_JOB;

  constructor(public payload: { job: Job }, public correlationId?: string) { }
}

export class UpdateJobSuccess implements Action {
  readonly type = UPDATE_JOB_SUCCESS;

  constructor(public payload: { job: Job }, public correlationId?: string) { }
}

export class UpdateJobFail implements Action {
  readonly type = UPDATE_JOB_FAIL;

  constructor(public payload: { job: Job, error: any }, public correlationId?: string) { }
}

export class UpdateJobResult implements Action {
  readonly type = UPDATE_JOB_RESULT;

  constructor(public payload: { job: Job }, public correlationId?: string) { }
}

export class UpdateJobResultSuccess implements Action {
  readonly type = UPDATE_JOB_RESULT_SUCCESS;

  constructor(public payload: { job: Job, result: JobResult }, public correlationId?: string) { }
}

export class UpdateJobResultFail implements Action {
  readonly type = UPDATE_JOB_RESULT_FAIL;

  constructor(public payload: { job: Job, error: any }, public correlationId?: string) { }
}


export type Actions =
  | CreateJob
  | CreateJobSuccess
  | CreateJobFail
  | CancelJob
  | CancelJobSuccess
  | CancelJobFail
  | UpdateJob
  | UpdateJobSuccess
  | UpdateJobFail
  | UpdateJobResult
  | UpdateJobResultSuccess
  | UpdateJobResultFail;

