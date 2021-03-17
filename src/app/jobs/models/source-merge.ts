import { Astrometry } from './astrometry';
import { JobResultBase, JobBase } from './job-base';
import { JobType } from './job-types';
import { SourceExtractionData } from './source-extraction';

export interface SourceMergeSettings {
  posType: 'sky' | 'pixel' | 'auto';
}

export interface SourceMergeJobResult extends JobResultBase {
  readonly type: JobType.SourceMerge;
  data: SourceExtractionData[];
}

export interface SourceMergeJob extends JobBase {
  readonly type: JobType.SourceMerge;
  sources: Astrometry[];
  settings: SourceMergeSettings;
  result: SourceMergeJobResult;
}
