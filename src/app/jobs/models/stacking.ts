import { JobBase, JobResultBase } from './job-base';
import { JobType } from './job-types';
import { SourceExtractionData } from './source-extraction';

export interface StackSettings {
    selectedImageFileIds: string[];
    mode: 'average' | 'percentile' | 'mode' | 'sum';
    scaling: null | 'average' | 'median' | 'mode';
    rejection: null | 'chauvenet' | 'iraf' | 'minmax' | 'sigclip';
    percentile?: number;
    low?: number;
    high?: number;
}

export interface StackingJob extends JobBase {
    readonly type: JobType.Stacking;
    file_ids: number[];
    stacking_settings?: StackSettings;
  }

  export interface StackingJobResult extends JobResultBase {
    readonly type: JobType.Stacking;
    file_id: number;
  }