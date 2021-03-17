import { JobBase, JobResultBase } from './job-base';
import { JobType } from './job-types';
import { SourceExtractionData } from './source-extraction';

export interface StackSettings {
  mode: 'average' | 'percentile' | 'mode' | 'sum';
  scaling: null | 'average' | 'median' | 'mode';
  rejection: null | 'chauvenet' | 'iraf' | 'minmax' | 'sigclip';
  percentile?: number;
  lo?: number;
  hi?: number;
}

export interface StackingJobResult extends JobResultBase {
  readonly type: JobType.Stacking;
  fileId: string;
}

export interface StackingJob extends JobBase {
  readonly type: JobType.Stacking;
  fileIds: string[];
  stackingSettings?: StackSettings;
  result: StackingJobResult | null;
}
