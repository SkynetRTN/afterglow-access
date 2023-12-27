import { JobBase, JobResultBase } from './job-base';
import { SourceMergeSettings } from './source-merge';
import { SourceMeta } from './source-meta';
import { Astrometry } from './astrometry';
import { SourceId } from './source-id';
import { JobType } from './job-types';
import { TypeGuard } from 'src/app/utils/guard-type.pipe';
import { Job } from './job';
import { JobResult } from './job-result';

export interface SourceExtractionJobSettings {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  threshold?: number;
  bkSize?: number;
  bkFilterSize?: number;
  fwhm?: number;
  minFwhm?: number;
  maxFwhm?: number;
  maxEllipticity?: number;
  ratio?: number;
  theta?: number;
  minPixels?: number;
  deblend?: boolean;
  deblendLevels?: number;
  deblendContrast?: number;
  gain?: number;
  clean?: number;
  centroid?: boolean;
  satLevel?: number;
  discardSaturated?: boolean;
  limit?: number;
  maxSources?: number;
  downsample?: number;
  clipLo?: number;
  clipHi?: number;
}

export interface SourceExtractionData extends SourceMeta, Astrometry, SourceId { }

export interface SourceExtractionJobResult extends JobResultBase {
  readonly type: JobType.SourceExtraction;
  data: SourceExtractionData[];
}

export interface SourceExtractionJob extends JobBase {
  readonly type: JobType.SourceExtraction;
  fileIds: string[];
  sourceExtractionSettings?: SourceExtractionJobSettings;
  mergeSources: boolean;
  sourceMergeSettings?: SourceMergeSettings;
  result?: SourceExtractionJobResult;
}



export const isSourceExtractionJob: TypeGuard<Job, SourceExtractionJob> = (
  job: Job
): job is SourceExtractionJob => job.type === JobType.SourceExtraction;

export const isSourceExtractionJobResult: TypeGuard<JobResult, SourceExtractionJobResult> = (
  result: JobResult
): result is SourceExtractionJobResult => result.type === JobType.SourceExtraction;
