import { JobType } from "./job-types";
import { JobBase, JobResultBase } from "./job-base";

export interface BatchAssetDownloadJob extends JobBase {
  readonly type: JobType.BatchAssetDownload;
  providerId: string;
  paths: string[];
}
