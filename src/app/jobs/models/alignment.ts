import { JobBase, JobResultBase } from "./job-base";
import { JobType } from "./job-types";
import { SourceExtractionData } from "./source-extraction";

export interface AlignmentSettings {
  refImage: "first" | "central" | "last" | number;
  wcsGridPoints: number;
  prefilter: boolean;
}

export interface AlignmentJobResult extends JobResultBase {
  readonly type: JobType.Alignment;
  fileIds: string[];
}

export interface AlignmentJob extends JobBase {
  readonly type: JobType.Alignment;
  fileIds: string[];
  settings?: AlignmentSettings;
  sources?: SourceExtractionData[];
  inplace: boolean;
  crop: boolean;
  result: AlignmentJobResult;
}


