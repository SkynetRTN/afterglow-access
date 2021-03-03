import { JobType } from "./job-types";
import { JobBase, JobResultBase } from "./job-base";

export interface BatchDownloadJob extends JobBase {
  readonly type: JobType.BatchDownload;
  fileIds?: string[];
  groupNames?: string[];
}
