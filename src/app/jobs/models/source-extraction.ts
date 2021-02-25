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
  bkSize?: number;
  bkFilterSize?: number;
  fwhm?: number;
  ratio?: number;
  theta?: number;
  minPixels?: number;
  deblend?: boolean;
  deblendLevels?: number;
  deblendContrast?: number;
  gain?: number;
  clean?: number;
  centroid?: boolean;
  limit?: number;
}

export interface SourceExtractionData extends SourceMeta, Astrometry, SourceId {}

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
  result: SourceExtractionJobResult;
}


