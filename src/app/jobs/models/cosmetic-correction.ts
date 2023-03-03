import { JobBase, JobResultBase } from './job-base';
import { SourceMergeSettings } from './source-merge';
import { SourceMeta } from './source-meta';
import { Astrometry } from './astrometry';
import { SourceId } from './source-id';
import { JobType } from './job-types';
import { TypeGuard } from 'src/app/utils/guard-type.pipe';
import { Job } from './job';
import { JobResult } from './job-result';

export interface CosmeticCorrectionJobSettings {
  mCol: number;
  nuCol: number;
  mPixel: number;
  nuPixel: number;
  mCorrCol: number;
  mCorrPixel: number;
  groupByInstrument: boolean;
  groupByFilter: boolean;
  groupByExpLength: boolean;
  maxGroupLen: number;
  maxGroupSpanHours: number;
  minGroupSepHours: number;
}


export interface CosmeticCorrectionJobResult extends JobResultBase {
  readonly type: JobType.CosmeticCorrection;
  fileIds: string[];
}

export interface CosmeticCorrectionJob extends JobBase {
  readonly type: JobType.CosmeticCorrection;
  fileIds: string[];
  settings?: CosmeticCorrectionJobSettings;
  result?: CosmeticCorrectionJobResult;
  inplace: boolean;
}



export const isCosmeticCorrectionJob: TypeGuard<Job, CosmeticCorrectionJob> = (
  job: Job
): job is CosmeticCorrectionJob => job.type === JobType.CosmeticCorrection;

export const isCosmeticCorrectionJobResult: TypeGuard<JobResult, CosmeticCorrectionJobResult> = (
  result: JobResult
): result is CosmeticCorrectionJobResult => result.type === JobType.CosmeticCorrection;
