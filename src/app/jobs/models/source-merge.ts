import { Astrometry } from "./astrometry";
import { JobResultBase, JobBase } from "./job-base";
import { JobType } from "./job-types";
import { SourceExtractionData } from "./source-extraction";

export interface SourceMergeSettings {
  pos_type: "sky" | "pixel" | "auto";
}

export interface SourceMergeJob extends JobBase {
  readonly type: JobType.SourceMerge;
  sources: Astrometry[];
  settings: SourceMergeSettings;
}

export interface SourceMergeJobResult extends JobResultBase {
  readonly type: JobType.SourceMerge;
  data: SourceExtractionData[];
}
