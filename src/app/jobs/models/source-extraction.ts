import { JobBase, JobResultBase } from "./job-base";
import { SourceMergeSettings } from "./source-merge";
import { SourceMeta } from "./source-meta";
import { Astrometry } from "./astrometry";
import { SourceId } from "./source-id";
import { JobType } from "./job-types";

export interface SourceExtractionJobSettings {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  threshold?: number;
  bk_size?: number;
  bk_filter_size?: number;
  fwhm?: number;
  ratio?: number;
  theta?: number;
  min_pixels?: number;
  deblend?: boolean;
  deblend_levels?: number;
  deblend_contrast?: number;
  gain?: number;
  clean?: number;
  centroid?: boolean;
  limit?: number;
}

export interface SourceExtractionJob extends JobBase {
  readonly type: JobType.SourceExtraction;
  file_ids: number[];
  source_extraction_settings?: SourceExtractionJobSettings;
  merge_sources: boolean;
  source_merge_settings?: SourceMergeSettings;
}

export interface SourceExtractionData extends SourceMeta, Astrometry, SourceId {}

export interface SourceExtractionJobResult extends JobResultBase {
  readonly type: JobType.SourceExtraction;
  data: SourceExtractionData[];
}
