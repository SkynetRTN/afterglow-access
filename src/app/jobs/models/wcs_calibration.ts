import { TypeGuard } from 'src/app/utils/guard-type.pipe';
import { Job } from './job';
import { JobBase, JobResultBase } from './job-base';
import { JobResult } from './job-result';
import { JobType } from './job-types';
import { SourceExtractionJobSettings } from './source-extraction';

export interface WcsCalibrationJobSettings {
  raHours?: number;
  decDegs?: number;
  radius?: number;
  minScale?: number;
  maxScale?: number;
  maxSources?: number;
}

export interface WcsCalibrationJobResult extends JobResultBase {
  readonly type: JobType.WcsCalibration;
  fileIds: string[];
}

export interface WcsCalibrationJob extends JobBase {
  readonly type: JobType.WcsCalibration;
  fileIds: string[];
  settings?: WcsCalibrationJobSettings;
  sourceExtractionSettings: SourceExtractionJobSettings;
  inplace: boolean;
  result?: WcsCalibrationJobResult;
}

export const isWcsCalibrationJob: TypeGuard<Job, WcsCalibrationJob> = (
  job: Job
): job is WcsCalibrationJob => job.type === JobType.WcsCalibration;

export const isWcsCalibrationJobResult: TypeGuard<JobResult, WcsCalibrationJobResult> = (
  result: JobResult
): result is WcsCalibrationJobResult => result.type === JobType.WcsCalibration;
