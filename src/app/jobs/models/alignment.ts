import { TypeGuard } from 'src/app/utils/guard-type.pipe';
import { Job } from './job';
import { JobBase, JobResultBase } from './job-base';
import { JobResult } from './job-result';
import { JobType } from './job-types';
import { SourceExtractionData } from './source-extraction';

export interface AlignmentSettings {
  refImage: 'first' | 'central' | 'last' | number;
  wcsGridPoints: number;
  prefilter: boolean;
}

export interface AlignmentJobResult extends JobResultBase {
  readonly type: JobType.Alignment;
  fileIds: string[];
}

export interface AlignmentJob extends JobBase {
  readonly type: JobType.Alignment;
  fileIds: string[];
  settings?: AlignmentSettings;
  sources?: SourceExtractionData[];
  inplace: boolean;
  crop: boolean;
  result?: AlignmentJobResult;
}


export const isAlignmentJob: TypeGuard<Job, AlignmentJob> = (
  job: Job
): job is AlignmentJob => job.type === JobType.Alignment;

export const isAlignmentJobResult: TypeGuard<JobResult, AlignmentJobResult> = (
  result: JobResult
): result is AlignmentJobResult => result.type === JobType.Alignment;
