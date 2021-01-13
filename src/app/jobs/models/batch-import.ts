import { JobType } from "./job-types";
import { JobBase, JobResultBase } from "./job-base";

export interface BatchImportSettings {
  provider_id?: number;
  path?: string;
  duplicates?: "ignore";
  recurse?: boolean;
}

export interface BatchImportJobResult extends JobResultBase {
  readonly type: JobType.BatchImport;
  file_ids: number[];
}

export interface BatchImportJob extends JobBase {
  readonly type: JobType.BatchImport;
  settings: Array<BatchImportSettings>;
  result: BatchImportJobResult;
}


