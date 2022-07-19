import { Job } from './models/job';
import { JobResultBase, JobStateBase } from './models/job-base';
import { JobResult } from './models/job-result';

export class AddJob {
  public static readonly type = '[Job] Add Job';
  constructor(public job: Job) { }
}

export class UpdateJobState {
  public static readonly type = '[Job] Update Job State';
  constructor(public id: string, public state: JobStateBase) { }
}

export class UpdateJobResult {
  public static readonly type = '[Job] Update Job Result';
  constructor(public id: string, public result: JobResultBase) { }
}

export class StopAutoJobUpdate {
  public static readonly type = '[Job] Stop Auto Job Update';

  constructor(public jobId: string) { }
}

export class CancelJob {
  public static readonly type = '[Job] Cancel Job';

  constructor(public job: Job, public correlationId?: string) { }
}

export class CancelJobSuccess {
  public static readonly type = '[Job] Cancel Job Success';

  constructor(public job: Job, public correlationId?: string) { }
}

export class CancelJobFail {
  public static readonly type = '[Job] Cancel Job Fail';

  constructor(public job: Job, error: any, correlationId?: string) { }
}

export class SelectJob {
  public static readonly type = '[Job] Select Job';

  constructor(public jobId: string) { }
}

export class LoadJobs {
  public static readonly type = '[Job] Load Jobs';

  constructor() { }
}

export class LoadJob {
  public static readonly type = '[Job] Load Job';

  constructor(public id: string) { }
}

export class LoadJobResult {
  public static readonly type = '[Job] Load Job Result';

  constructor(public id: string) { }
}

export class JobCompleted {
  public static readonly type = '[Job] Job Completed';

  constructor(public id: string, public result: JobResult, public correlationId?: string) { }
}

export class JobFailed {
  public static readonly type = '[Job] Job Failed';

  constructor(public id: string, public error: any, public correlationId?: string) { }
}
