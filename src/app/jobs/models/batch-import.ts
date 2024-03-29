import { JobType } from './job-types';
import { JobBase, JobResultBase } from './job-base';
import { TypeGuard } from 'src/app/utils/guard-type.pipe';
import { Job } from './job';

export interface BatchImportSettings {
  providerId?: string;
  path?: string;
  duplicates?: 'ignore';
  recurse?: boolean;
}

export interface BatchImportJobResult extends JobResultBase {
  readonly type: JobType.BatchImport;
  fileIds: string[];
}

export interface BatchImportJob extends JobBase {
  readonly type: JobType.BatchImport;
  settings: Array<BatchImportSettings>;
  result: BatchImportJobResult | null;
}

export const isBatchImportJob: TypeGuard<Job, BatchImportJob> = (
  job: Job
): job is BatchImportJob => job.type === JobType.BatchImport;
