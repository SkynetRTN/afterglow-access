import { JobBase, JobResultBase } from './job-base';
import { JobType } from './job-types';
import { SourceExtractionData } from './source-extraction';

export interface AlignmentSettings {
    ref_image: 'first' | 'central' | 'last' | number;
    wcs_grid_points: number;
}

export interface AlignmentJob extends JobBase {
    readonly type: JobType.Alignment;
    file_ids: number[];
    settings?: AlignmentSettings;
    sources?: SourceExtractionData[];
    inplace: boolean;
  }

  export interface AlignmentJobResult extends JobResultBase {
    readonly type: JobType.Alignment;
    file_ids: number[];
  }