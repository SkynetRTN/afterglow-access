import { TypeGuard } from 'src/app/utils/guard-type.pipe';
import { Job } from './job';
import { JobBase, JobResultBase } from './job-base';
import { JobResult } from './job-result';
import { JobType } from './job-types';

export interface PixelOpsJobResult extends JobResultBase {
  readonly type: JobType.PixelOps;
  fileIds: string[];
  data: Array<number>;
}

export interface PixelOpsJob extends JobBase {
  readonly type: JobType.PixelOps;
  fileIds: string[];
  auxFileIds: string[];
  op: string;
  inplace: boolean;
  result?: PixelOpsJobResult
}

export const isPixelOpsJob: TypeGuard<Job, PixelOpsJob> = (
  job: Job
): job is PixelOpsJob => job.type === JobType.PixelOps;

export const isPixelOpsJobResult: TypeGuard<JobResult, PixelOpsJobResult> = (
  result: JobResult
): result is PixelOpsJobResult => result.type === JobType.PixelOps;
