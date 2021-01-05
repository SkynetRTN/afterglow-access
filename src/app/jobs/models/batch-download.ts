import { JobType } from "./job-types";
import { JobBase, JobResultBase } from "./job-base";


export interface BatchDownloadJob extends JobBase {
  readonly type: JobType.BatchDownload;
  file_ids?: number[];
  group_ids?: string[];
}
